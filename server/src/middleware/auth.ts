import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "";

export interface AuthPayload {
  userId: string;
}

export function signToken(userId: string) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.sign({ userId } satisfies AuthPayload, JWT_SECRET, { expiresIn: "30d" });
}

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) return {} as Record<string, string>;
  const entries = cookieHeader.split(";").map((c) => c.trim().split("="));
  return Object.fromEntries(entries.map(([k, v]) => [k, decodeURIComponent(v || "")]));
}

async function getUserFromToken(token: string) {
  if (!JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    return user ?? null;
  } catch {
    return null;
  }
}

async function getUserFromApiKey(apiKey: string) {
  const [user] = await db.select().from(users).where(eq(users.apiKey, apiKey));
  return user ?? null;
}

async function getOrCreateDevUser() {
  const email = process.env.DEV_AUTO_USER_EMAIL || "local@clipsync";
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) return existing;
  const hashed = await bcrypt.hash("dev-password", 10);
  const [user] = await db
    .insert(users)
    .values({
      email,
      hashedPassword: hashed,
    })
    .returning();
  return user;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const apiKey = req.headers["x-api-key"] as string | undefined;
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies["token"];

  const user =
    (apiKey ? await getUserFromApiKey(apiKey) : null) ||
    (token ? await getUserFromToken(token) : null) ||
    (cookieToken ? await getUserFromToken(cookieToken) : null);

  if (user) {
    (req as Request & { userId: string }).userId = user.id;
    (req as Request & { user: typeof user }).user = user;
    return next();
  }

  const allowDev = process.env.NODE_ENV !== "production" && process.env.DEV_AUTO_USER !== "false";
  if (allowDev) {
    const devUser = await getOrCreateDevUser();
    (req as Request & { userId: string }).userId = devUser.id;
    (req as Request & { user: typeof devUser }).user = devUser;
    return next();
  }

  res.status(401).json({ error: "Unauthorized" });
}
