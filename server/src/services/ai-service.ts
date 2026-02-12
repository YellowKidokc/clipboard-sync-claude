import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

const client = apiKey ? new OpenAI({ apiKey }) : null;

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function ensureClient() {
  if (!client) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return client;
}

export async function chat(messages: AIMessage[], model = defaultModel) {
  if (!client) {
    return "AI is not configured. Set OPENAI_API_KEY to enable.";
  }
  const response = await ensureClient().chat.completions.create({
    model,
    messages,
    temperature: 0.3,
  });
  return response.choices[0]?.message?.content?.trim() || "";
}

export async function summarize(text: string) {
  return chat([
    { role: "system", content: "You summarize clipboard content into concise bullet points." },
    { role: "user", content: text },
  ]);
}

export async function improve(text: string) {
  return chat([
    { role: "system", content: "You improve writing clarity while preserving meaning." },
    { role: "user", content: text },
  ]);
}

export async function classify(text: string) {
  return chat([
    { role: "system", content: "You suggest short tags for clipboard content. Return a comma-separated list." },
    { role: "user", content: text },
  ]);
}

export async function runWorkflow(workflow: string, text: string) {
  const promptMap: Record<string, string> = {
    summarize: "Summarize the content concisely.",
    improve: "Improve the writing quality without changing the meaning.",
    tags: "Suggest relevant tags as a comma-separated list.",
    code: "Review this code for bugs, security issues, and improvements.",
    email: "Draft a professional email based on this content.",
    ideas: "Generate 5 ideas related to this content.",
  };
  const prompt = promptMap[workflow] || "Help with the following content.";
  return chat([
    { role: "system", content: prompt },
    { role: "user", content: text },
  ]);
}

export async function predictNext(context: Record<string, unknown>) {
  const messages: AIMessage[] = [
    {
      role: "system",
      content:
        "You are a clipboard prediction engine. Based on recent clipboard context, predict what the user will copy next. Return JSON: {\"prediction\": string, \"confidence\": number, \"reasoning\": string }",
    },
    { role: "user", content: JSON.stringify(context) },
  ];
  const raw = await chat(messages, defaultModel);
  try {
    const parsed = JSON.parse(raw);
    return {
      prediction: String(parsed.prediction ?? ""),
      confidence: Number(parsed.confidence ?? 0),
      reasoning: String(parsed.reasoning ?? ""),
      raw,
    };
  } catch {
    return { prediction: raw, confidence: 0.2, reasoning: "fallback", raw };
  }
}
