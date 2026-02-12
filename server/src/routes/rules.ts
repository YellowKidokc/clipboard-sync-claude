import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { rules } from "../db/schema";
import { testRule } from "../engine/rule-engine";

const router = Router();

const ruleSchema = z.object({
  name: z.string().min(1),
  match_type: z.string().min(1),
  pattern: z.string().min(1),
  action: z.string().min(1),
  params: z.record(z.any()).optional().nullable(),
  priority: z.number().int().optional().default(0),
  enabled: z.boolean().optional().default(true),
});

router.get("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const items = await db
    .select()
    .from(rules)
    .where(eq(rules.userId, userId))
    .orderBy(rules.priority);
  return res.json({ items });
});

router.post("/", async (req, res) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;
  const body = parsed.data;
  const [created] = await db
    .insert(rules)
    .values({
      userId,
      name: body.name,
      matchType: body.match_type,
      pattern: body.pattern,
      action: body.action,
      params: body.params ?? {},
      priority: body.priority ?? 0,
      enabled: body.enabled ?? true,
    })
    .returning();
  return res.json(created);
});

router.put("/:id", async (req, res) => {
  const parsed = ruleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;
  const body = parsed.data;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.match_type !== undefined) updateData.matchType = body.match_type;
  if (body.pattern !== undefined) updateData.pattern = body.pattern;
  if (body.action !== undefined) updateData.action = body.action;
  if (body.params !== undefined) updateData.params = body.params;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.enabled !== undefined) updateData.enabled = body.enabled;

  const [updated] = await db
    .update(rules)
    .set(updateData)
    .where(and(eq(rules.userId, userId), eq(rules.id, req.params.id)))
    .returning();
  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const userId = (req as any).userId as string;
  const [deleted] = await db
    .delete(rules)
    .where(and(eq(rules.userId, userId), eq(rules.id, req.params.id)))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Not found" });
  return res.json({ ok: true });
});

router.post("/test", async (req, res) => {
  const schema = z.object({
    rule: ruleSchema,
    test_content: z.string(),
    content_type: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { rule, test_content, content_type } = parsed.data;

  const result = testRule(
    {
      id: "temp",
      name: rule.name,
      matchType: rule.match_type,
      pattern: rule.pattern,
      action: rule.action,
      params: (rule.params || {}) as Record<string, unknown>,
      priority: rule.priority ?? 0,
      enabled: rule.enabled ?? true,
    },
    test_content,
    content_type || "text/plain",
  );

  return res.json({ matched: result.matched, result: result.matched ? "matched" : "no match" });
});

export default router;
