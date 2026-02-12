export interface StructuredField {
  id: string;
  label: string;
  value: string;
  type: "text" | "password" | "url" | "email" | "phone" | "date" | "api_key";
  icon?: string;
}

export interface ClipTagsMeta {
  labels: string[];
  title?: string;
  category?: string;
  structured?: boolean;
  fields?: StructuredField[];
}

export type TagsInput = ClipTagsMeta | string[] | null | undefined;

export function normalizeTags(input: TagsInput): ClipTagsMeta {
  if (!input) return { labels: [] };
  if (Array.isArray(input)) return { labels: input };
  if (typeof input === "object") {
    const obj = input as Partial<ClipTagsMeta> & { tags?: string[] };
    const labels = Array.isArray(obj.labels)
      ? obj.labels
      : Array.isArray(obj.tags)
        ? obj.tags
        : [];
    return { ...obj, labels } as ClipTagsMeta;
  }
  return { labels: [] };
}

export function mergeTagLabels(current: TagsInput, next: string[]) {
  const meta = normalizeTags(current);
  const labels = Array.from(new Set([...(meta.labels || []), ...next]));
  return { ...meta, labels } satisfies ClipTagsMeta;
}

export function updateTagMeta(current: TagsInput, patch: Partial<ClipTagsMeta>) {
  const meta = normalizeTags(current);
  const next: ClipTagsMeta = { ...meta };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  if (patch.labels) next.labels = patch.labels;
  return next satisfies ClipTagsMeta;
}

export function getTagLabels(input: TagsInput) {
  return normalizeTags(input).labels || [];
}

export function deriveTitleFromText(text?: string | null) {
  if (!text) return "Untitled";
  const firstLine = text.split("\n").find((line) => line.trim().length > 0);
  if (!firstLine) return "Untitled";
  return firstLine.slice(0, 80);
}
