import { db } from "../db";
import { aiConversations, clips } from "../db/schema";
import { classify, improve, runWorkflow, summarize } from "./ai-service";
import { mergeTagLabels } from "../utils/tags";

export async function runWorkflowForClip({
  userId,
  clipId,
  workflow,
  text,
}: {
  userId: string;
  clipId?: string | null;
  workflow: string;
  text: string;
}) {
  let output = "";
  if (workflow === "summarize") {
    output = await summarize(text);
    const tags = mergeTagLabels({}, ["summary"]);
    await db.insert(clips).values({
      userId,
      contentType: "text/plain",
      textContent: output,
      tags,
      source: "ai_generated",
    });
  } else if (workflow === "improve") {
    output = await improve(text);
  } else if (workflow === "tags" || workflow === "classify") {
    output = await classify(text);
  } else {
    output = await runWorkflow(workflow, text);
  }

  await db.insert(aiConversations).values({
    userId,
    clipId: clipId || null,
    role: "assistant",
    content: output,
    workflow,
  });

  return output;
}

export async function storeUserMessage({
  userId,
  clipId,
  content,
  workflow,
}: {
  userId: string;
  clipId?: string | null;
  content: string;
  workflow?: string | null;
}) {
  await db.insert(aiConversations).values({
    userId,
    clipId: clipId || null,
    role: "user",
    content,
    workflow: workflow || null,
  });
}
