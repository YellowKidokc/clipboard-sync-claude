import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "../middleware/auth";

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/register", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const [user] = await db.insert(users).values({ email, hashedPassword }).returning();
  const token = signToken(user.id);
  res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
  return res.json({ user: { id: user.id, email: user.email }, token });
});

router.post("/login", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const ok = await bcrypt.compare(password, user.hashedPassword);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signToken(user.id);
  res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
  return res.json({ token });
});

export default router;
