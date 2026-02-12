import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { clips, folders } from "../db/schema";
import { serializeClip } from "../utils/clip";

const router = Router();

const folderSchema = z.object({
  name: z.string().min(1),
  path_template: z.string().optional().nullable(),
});

router.get("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const items = await db.select().from(folders).where(eq(folders.userId, userId));
  return res.json({ items });
});

router.post("/", async (req, res) => {
  const parsed = folderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;
  const body = parsed.data;
  const [created] = await db
    .insert(folders)
    .values({ userId, name: body.name, pathTemplate: body.path_template ?? null })
    .returning();
  return res.json(created);
});

router.put("/:id", async (req, res) => {
  const parsed = folderSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;
  const body = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.path_template !== undefined) updateData.pathTemplate = body.path_template;

  const [updated] = await db
    .update(folders)
    .set(updateData)
    .where(and(eq(folders.userId, userId), eq(folders.id, req.params.id)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).userId as string;
  await db
    .update(clips)
    .set({ folderId: null })
    .where(and(eq(clips.userId, userId), eq(clips.folderId, req.params.id)));

  const [deleted] = await db
    .delete(folders)
    .where(and(eq(folders.userId, userId), eq(folders.id, req.params.id)))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Not found" });
  return res.json({ ok: true });
});

router.get("/:id/clips", async (req, res) => {
  const userId = (req as any).userId as string;
  const items = await db
    .select()
    .from(clips)
    .where(and(eq(clips.userId, userId), eq(clips.folderId, req.params.id)));
  return res.json({ items: items.map(serializeClip) });
});

export default router;
