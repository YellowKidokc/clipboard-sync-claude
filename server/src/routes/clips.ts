import { Router } from "express";
import { z } from "zod";
import { and, desc, eq, ilike, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { clips } from "../db/schema";
import { runRuleEngine } from "../engine/rule-engine";
import { generatePrediction, resolveLatestPrediction } from "../engine/predictor";
import { runWorkflowForClip } from "../services/ai-workflows";
import { saveDataUrl } from "../services/blob-storage";
import { serializeClip } from "../utils/clip";
import { updateTagMeta } from "../utils/tags";

const router = Router();

const createClipSchema = z.object({
  content_type: z.string().min(1),
  text_content: z.string().optional().nullable(),
  data_url: z.string().optional().nullable(),
  tags: z.any().optional(),
  device_id: z.string().uuid().optional().nullable(),
  hotkey_slot: z.number().int().min(1).max(12).optional().nullable(),
  source: z.string().optional(),
  folder_id: z.string().uuid().optional().nullable(),
  title: z.string().optional(),
  category: z.string().optional(),
  structured_fields: z.any().optional(),
  structured: z.boolean().optional(),
});

const updateClipSchema = z.object({
  text_content: z.string().optional().nullable(),
  tags: z.any().optional(),
  is_pinned: z.boolean().optional(),
  is_starred: z.boolean().optional(),
  is_deleted: z.boolean().optional(),
  folder_id: z.string().uuid().optional().nullable(),
  hotkey_slot: z.number().int().min(1).max(12).optional().nullable(),
  title: z.string().optional(),
  category: z.string().optional(),
  structured_fields: z.any().optional(),
  structured: z.boolean().optional(),
});

router.post("/", async (req, res) => {
  const parsed = createClipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const body = parsed.data;
  const userId = (req as any).userId as string;

  let blobUrl: string | null = null;
  if (body.data_url) {
    const stored = await saveDataUrl(body.data_url);
    blobUrl = stored.url;
  }

  const metaPatch = {
    title: body.title,
    category: body.category,
    fields: body.structured_fields,
    structured: body.structured,
  };
  const tags = updateTagMeta(body.tags, metaPatch);

  const initialClip = {
    userId,
    deviceId: body.device_id || null,
    contentType: body.content_type,
    textContent: body.text_content ?? null,
    blobUrl,
    tags,
    folderId: body.folder_id ?? null,
    hotkeySlot: body.hotkey_slot ?? null,
    source: body.source || "manual",
  };

  const { clip: processed, aiWorkflows } = await runRuleEngine(initialClip);

  const [created] = await db
    .insert(clips)
    .values({
      userId: processed.userId,
      deviceId: processed.deviceId ?? null,
      contentType: processed.contentType,
      textContent: processed.textContent ?? null,
      blobUrl: processed.blobUrl ?? null,
      tags: processed.tags ?? tags,
      folderId: processed.folderId ?? null,
      hotkeySlot: processed.hotkeySlot ?? null,
      source: processed.source || "manual",
    })
    .returning();

  if (created.textContent) {
    resolveLatestPrediction(userId, created.textContent).catch(() => undefined);
  }
  generatePrediction(userId).catch(() => undefined);

  if (aiWorkflows.length > 0 && created.textContent) {
    for (const workflow of aiWorkflows) {
      runWorkflowForClip({
        userId,
        clipId: created.id,
        workflow,
        text: created.textContent,
      }).catch(() => undefined);
    }
  }

  return res.json(serializeClip(created));
});

router.get("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  const folder = req.query.folder ? String(req.query.folder) : null;
  const tag = req.query.tag ? String(req.query.tag) : null;
  const search = req.query.search ? String(req.query.search) : null;
  const type = req.query.type ? String(req.query.type) : null;
  const includeDeleted = req.query.include_deleted === "true";

  const conditions = [eq(clips.userId, userId)];
  if (!includeDeleted) {
    conditions.push(eq(clips.isDeleted, false));
  }
  if (before && !Number.isNaN(before.getTime())) {
    conditions.push(lt(clips.createdAt, before));
  }
  if (folder) {
    conditions.push(eq(clips.folderId, folder));
  }
  if (type) {
    conditions.push(eq(clips.contentType, type));
  }
  if (search) {
    conditions.push(ilike(clips.textContent, `%${search}%`));
  }
  if (tag) {
    conditions.push(
      sql`(
        (jsonb_typeof(${clips.tags}) = 'array' AND ${clips.tags} @> ${JSON.stringify([tag])}::jsonb)
        OR (jsonb_typeof(${clips.tags}) = 'object' AND (${clips.tags}->'labels') @> ${JSON.stringify([tag])}::jsonb)
      )`,
    );
  }

  const results = await db
    .select()
    .from(clips)
    .where(and(...conditions))
    .orderBy(desc(clips.createdAt))
    .limit(limit);

  return res.json({
    items: results.map(serializeClip),
    nextCursor: results.length ? results[results.length - 1].createdAt : null,
  });
});

router.get("/hotkeys", async (req, res) => {
  const userId = (req as any).userId as string;
  const results = await db
    .select()
    .from(clips)
    .where(and(eq(clips.userId, userId), sql`"hotkey_slot" is not null`, eq(clips.isDeleted, false)));

  const slots: Record<string, unknown> = {};
  for (const clip of results) {
    if (clip.hotkeySlot) {
      slots[String(clip.hotkeySlot)] = serializeClip(clip);
    }
  }

  return res.json({ slots });
});

router.post("/hotkeys", async (req, res) => {
  const schema = z.object({
    clip_id: z.string().uuid(),
    slot: z.number().int().min(1).max(12),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const userId = (req as any).userId as string;
  const { clip_id, slot } = parsed.data;

  await db
    .update(clips)
    .set({ hotkeySlot: null })
    .where(and(eq(clips.userId, userId), eq(clips.hotkeySlot, slot)));

  const [updated] = await db
    .update(clips)
    .set({ hotkeySlot: slot })
    .where(and(eq(clips.userId, userId), eq(clips.id, clip_id)))
    .returning();

  return res.json(serializeClip(updated));
});

router.get("/:id", async (req, res) => {
  const userId = (req as any).userId as string;
  const [clip] = await db
    .select()
    .from(clips)
    .where(and(eq(clips.userId, userId), eq(clips.id, req.params.id)));
  if (!clip) return res.status(404).json({ error: "Not found" });
  return res.json(serializeClip(clip));
});

router.put("/:id", async (req, res) => {
  const parsed = updateClipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const body = parsed.data;
  const userId = (req as any).userId as string;

  const metaPatch = {
    title: body.title,
    category: body.category,
    fields: body.structured_fields,
    structured: body.structured,
  };

  const tags = body.tags !== undefined ? updateTagMeta(body.tags, metaPatch) : undefined;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.text_content !== undefined) updateData.textContent = body.text_content;
  if (tags !== undefined) updateData.tags = tags;
  if (body.is_pinned !== undefined) updateData.isPinned = body.is_pinned;
  if (body.is_starred !== undefined) updateData.isStarred = body.is_starred;
  if (body.is_deleted !== undefined) updateData.isDeleted = body.is_deleted;
  if (body.folder_id !== undefined) updateData.folderId = body.folder_id;
  if (body.hotkey_slot !== undefined) updateData.hotkeySlot = body.hotkey_slot;

  const [updated] = await db
    .update(clips)
    .set(updateData)
    .where(and(eq(clips.userId, userId), eq(clips.id, req.params.id)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json(serializeClip(updated));
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).userId as string;
  const [updated] = await db
    .update(clips)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(clips.userId, userId), eq(clips.id, req.params.id)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(serializeClip(updated));
});

router.post("/:id/copy", async (req, res) => {
  return res.json({ ok: true });
});

export default router;
