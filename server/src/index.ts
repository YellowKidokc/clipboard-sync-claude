import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth";
import clipsRoutes from "./routes/clips";
import rulesRoutes from "./routes/rules";
import foldersRoutes from "./routes/folders";
import aiRoutes from "./routes/ai";
import predictionsRoutes from "./routes/predictions";
import { requireAuth } from "./middleware/auth";
import { db } from "./db";
import { devices } from "./db/schema";
import { eq } from "drizzle-orm";
import { getStoragePath } from "./services/blob-storage";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);

app.use("/api", requireAuth);

app.get("/api/me", async (req, res) => {
  const userId = (req as any).userId as string;
  const user = (req as any).user;
  const deviceList = await db.select().from(devices).where(eq(devices.userId, userId));
  res.json({ user: { id: user.id, email: user.email }, devices: deviceList });
});

app.use("/api/clips", clipsRoutes);
app.use("/api/rules", rulesRoutes);
app.use("/api/folders", foldersRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/predictions", predictionsRoutes);

app.use("/blobs", express.static(getStoragePath()));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistCandidates = [
  path.resolve(__dirname, "..", "..", "client", "dist"),
  path.resolve(process.cwd(), "client", "dist"),
  path.resolve(process.cwd(), "dist", "public"),
];
const clientDist = clientDistCandidates.find((candidate) => {
  try {
    return candidate && fs.existsSync(candidate);
  } catch {
    return false;
  }
});

if (process.env.NODE_ENV === "production" && clientDist) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});

app.listen(port, () => {
  console.log(`ClipSync server running on ${port}`);
});
