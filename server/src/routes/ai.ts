import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { aiConversations, clips } from "../db/schema";
import { chat, classify, improve, summarize } from "../services/ai-service";
import { runWorkflowForClip, storeUserMessage } from "../services/ai-workflows";
import { mergeTagLabels } from "../utils/tags";
import { serializeClip } from "../utils/clip";

const router = Router();

router.post("/chat", async (req, res) => {
  const schema = z.object({
    message: z.string().min(1),
    clip_id: z.string().uuid().optional().nullable(),
    conversation_id: z.string().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { message, clip_id } = parsed.data;
  const userId = (req as any).userId as string;

  await storeUserMessage({ userId, clipId: clip_id, content: message });

  let context = "";
  if (clip_id) {
    const [clip] = await db
      .select()
      .from(clips)
      .where(and(eq(clips.userId, userId), eq(clips.id, clip_id)));
    if (clip?.textContent) {
      context = `\n\nClip Context:\n${clip.textContent}`;
    }
  }

  const response = await chat([
    { role: "system", content: "You are ClipSync's AI assistant. Be concise and helpful." },
    { role: "user", content: message + context },
  ]);

  await db.insert(aiConversations).values({
    userId,
    clipId: clip_id || null,
    role: "assistant",
    content: response,
  });

  return res.json({ response });
});

router.post("/summarize", async (req, res) => {
  const schema = z.object({ clip_id: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;
  const [clip] = await db
    .select()
    .from(clips)
    .where(and(eq(clips.userId, userId), eq(clips.id, parsed.data.clip_id)));
  if (!clip?.textContent) return res.status(404).json({ error: "Clip not found" });

  const summary = await summarize(clip.textContent);
  const [created] = await db
    .insert(clips)
    .values({
      userId,
      contentType: "text/plain",
      textContent: summary,
      tags: mergeTagLabels({}, ["summary"]),
      source: "ai_generated",
    })
    .returning();

  return res.json({ summary, clip: serializeClip(created) });
});

router.post("/classify", async (req, res) => {
  const schema = z.object({ clip_id: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;
  const [clip] = await db
    .select()
    .from(clips)
    .where(and(eq(clips.userId, userId), eq(clips.id, parsed.data.clip_id)));
  if (!clip?.textContent) return res.status(404).json({ error: "Clip not found" });

  const tagsRaw = await classify(clip.textContent);
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const merged = mergeTagLabels(clip.tags, tags);
  const [updated] = await db
    .update(clips)
    .set({ tags: merged, updatedAt: new Date() })
    .where(eq(clips.id, clip.id))
    .returning();

  return res.json({ tags, clip: serializeClip(updated) });
});

router.post("/improve", async (req, res) => {
  const schema = z.object({ clip_id: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;
  const [clip] = await db
    .select()
    .from(clips)
    .where(and(eq(clips.userId, userId), eq(clips.id, parsed.data.clip_id)));
  if (!clip?.textContent) return res.status(404).json({ error: "Clip not found" });

  const improved = await improve(clip.textContent);
  return res.json({ improved });
});

router.post("/workflow", async (req, res) => {
  const schema = z.object({
    clip_id: z.string().uuid(),
    workflow: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;
  const [clip] = await db
    .select()
    .from(clips)
    .where(and(eq(clips.userId, userId), eq(clips.id, parsed.data.clip_id)));
  if (!clip?.textContent) return res.status(404).json({ error: "Clip not found" });

  const output = await runWorkflowForClip({
    userId,
    clipId: clip.id,
    workflow: parsed.data.workflow,
    text: clip.textContent,
  });

  return res.json({ output });
});

export default router;
