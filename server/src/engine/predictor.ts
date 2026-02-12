import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { clips, predictionStats, predictions } from "../db/schema";
import { predictNext } from "../services/ai-service";
import { getTagLabels } from "../utils/tags";

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a: string, b: string) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / Math.max(a.length, b.length, 1);
}

export async function generatePrediction(userId: string) {
  const recentClips = await db
    .select()
    .from(clips)
    .where(and(eq(clips.userId, userId), eq(clips.isDeleted, false)))
    .orderBy(desc(clips.createdAt))
    .limit(10);

  const context = {
    recent: recentClips.map((clip) => ({
      text: clip.textContent,
      content_type: clip.contentType,
      created_at: clip.createdAt,
      tags: getTagLabels(clip.tags),
      folder_id: clip.folderId,
      source: clip.source,
    })),
    time: {
      hour: new Date().getHours(),
      weekday: new Date().getDay(),
    },
  };

  const result = await predictNext(context);
  const [prediction] = await db
    .insert(predictions)
    .values({
      userId,
      predictedContent: result.prediction,
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      context,
    })
    .returning();

  return { prediction, reasoning: result.reasoning };
}

export async function resolveLatestPrediction(userId: string, actualContent: string) {
  const [latest] = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.userId, userId), isNull(predictions.wasCorrect)))
    .orderBy(desc(predictions.createdAt))
    .limit(1);

  if (!latest) return null;

  const score = similarity(latest.predictedContent, actualContent);
  const wasCorrect = score >= 0.8;

  const [updated] = await db
    .update(predictions)
    .set({
      actualContent,
      wasCorrect,
    })
    .where(eq(predictions.id, latest.id))
    .returning();

  await updateStats(userId);

  return { updated, score };
}

export async function updateStats(userId: string, windowSize = 100) {
  const recent = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.userId, userId), sql`"was_correct" is not null`))
    .orderBy(desc(predictions.createdAt))
    .limit(windowSize);

  const total = recent.length;
  const correct = recent.filter((p) => p.wasCorrect).length;
  const accuracy = total ? correct / total : 0;

  const [existing] = await db
    .select()
    .from(predictionStats)
    .where(eq(predictionStats.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(predictionStats)
      .set({
        windowSize,
        accuracy,
        totalPredictions: total,
        correctPredictions: correct,
        updatedAt: new Date(),
      })
      .where(eq(predictionStats.id, existing.id));
  } else {
    await db.insert(predictionStats).values({
      userId,
      windowSize,
      accuracy,
      totalPredictions: total,
      correctPredictions: correct,
    });
  }

  return { accuracy, total, correct };
}

export async function getStats(userId: string) {
  const stats = await updateStats(userId);
  const recent = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, userId))
    .orderBy(desc(predictions.createdAt))
    .limit(20);

  let streak = 0;
  for (const pred of recent) {
    if (pred.wasCorrect) streak += 1;
    else if (pred.wasCorrect === false) break;
  }

  return { ...stats, recentPredictions: recent, streak };
}
