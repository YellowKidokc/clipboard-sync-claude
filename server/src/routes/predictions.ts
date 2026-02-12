import { Router } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { predictions } from "../db/schema";
import { generatePrediction, getStats, resolveLatestPrediction } from "../engine/predictor";

const router = Router();

router.get("/current", async (req, res) => {
  const userId = (req as any).userId as string;
  const [latest] = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, userId))
    .orderBy(desc(predictions.createdAt))
    .limit(1);

  if (!latest) {
    const created = await generatePrediction(userId);
    return res.json({
      prediction: created.prediction.predictedContent,
      confidence: created.prediction.confidence,
      context_used: created.prediction.context,
    });
  }

  return res.json({
    prediction: latest.predictedContent,
    confidence: latest.confidence,
    context_used: latest.context,
  });
});

router.post("/resolve", async (req, res) => {
  const schema = z.object({ actual_content: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const userId = (req as any).userId as string;
  const result = await resolveLatestPrediction(userId, parsed.data.actual_content);
  if (!result) return res.status(404).json({ error: "No prediction to resolve" });
  return res.json({ prediction: result.updated, score: result.score });
});

router.get("/stats", async (req, res) => {
  const userId = (req as any).userId as string;
  const stats = await getStats(userId);
  return res.json({
    accuracy: stats.accuracy,
    total: stats.total,
    correct: stats.correct,
    recent_predictions: stats.recentPredictions,
    streak: stats.streak,
  });
});

router.post("/feedback", async (req, res) => {
  const schema = z.object({
    prediction_id: z.string().uuid(),
    was_helpful: z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  return res.json({ ok: true });
});

export default router;
