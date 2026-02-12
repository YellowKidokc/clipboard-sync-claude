import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { folders, rules as rulesTable } from "../db/schema";
import { mergeTagLabels } from "../utils/tags";

export interface ClipInput {
  userId: string;
  deviceId?: string | null;
  contentType: string;
  textContent?: string | null;
  blobUrl?: string | null;
  tags?: unknown;
  folderId?: string | null;
  hotkeySlot?: number | null;
  source?: string;
}

export interface RuleInput {
  id: string;
  name: string;
  matchType: string;
  pattern: string;
  action: string;
  params: Record<string, unknown> | null;
  priority: number;
  enabled: boolean;
}

export interface RuleEngineResult {
  clip: ClipInput;
  aiWorkflows: string[];
}

function matchesRule(rule: RuleInput, clip: ClipInput) {
  const text = clip.textContent || "";
  switch (rule.matchType) {
    case "regex":
      try {
        return new RegExp(rule.pattern).test(text);
      } catch {
        return false;
      }
    case "mime":
      if (rule.pattern.includes("*")) {
        const [type, sub] = rule.pattern.split("/");
        if (sub === "*") {
          return clip.contentType.startsWith(`${type}/`);
        }
        if (type === "*") {
          return clip.contentType.endsWith(`/${sub}`);
        }
      }
      return clip.contentType === rule.pattern;
    case "contains":
      return text.includes(rule.pattern);
    case "starts_with":
      return text.startsWith(rule.pattern);
    default:
      return false;
  }
}

async function resolveFolderId(userId: string, template: string, device?: string | null) {
  const now = new Date();
  const rendered = template
    .replace("{YYYY}", now.getFullYear().toString())
    .replace("{MM}", String(now.getMonth() + 1).padStart(2, "0"))
    .replace("{DD}", String(now.getDate()).padStart(2, "0"))
    .replace("{device}", device || "unknown");

  const [existing] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.name, rendered)));
  if (existing) return existing.id;

  const [created] = await db
    .insert(folders)
    .values({
      userId,
      name: rendered,
      pathTemplate: template,
    })
    .returning();
  return created.id;
}

function applyReplace(text: string, find: string, replacement: string, regex?: boolean) {
  if (!find) return text;
  if (regex) {
    try {
      return text.replace(new RegExp(find, "g"), replacement);
    } catch {
      return text;
    }
  }
  return text.split(find).join(replacement);
}

export async function runRuleEngine(clip: ClipInput): Promise<RuleEngineResult> {
  const rules = await db
    .select()
    .from(rulesTable)
    .where(and(eq(rulesTable.userId, clip.userId), eq(rulesTable.enabled, true)))
    .orderBy(rulesTable.priority);

  const updated: ClipInput = { ...clip };
  const aiWorkflows: string[] = [];

  for (const rule of rules) {
    const ruleInput: RuleInput = {
      id: rule.id,
      name: rule.name,
      matchType: rule.matchType,
      pattern: rule.pattern,
      action: rule.action,
      params: (rule.params || {}) as Record<string, unknown>,
      priority: rule.priority ?? 0,
      enabled: rule.enabled ?? true,
    };

    if (!matchesRule(ruleInput, updated)) continue;

    switch (rule.action) {
      case "replace": {
        const params = ruleInput.params || {};
        const find = String((params as any).find || "");
        const replacement = String((params as any).replacement || "");
        const regex = Boolean((params as any).regex);
        updated.textContent = applyReplace(updated.textContent || "", find, replacement, regex);
        break;
      }
      case "route_folder": {
        const params = ruleInput.params || {};
        const template = String((params as any).template || "");
        if (template) {
          updated.folderId = await resolveFolderId(updated.userId, template, updated.deviceId || undefined);
        }
        break;
      }
      case "tag": {
        const params = ruleInput.params || {};
        const nextTags = Array.isArray((params as any).tags) ? (params as any).tags : [];
        updated.tags = mergeTagLabels(updated.tags, nextTags);
        break;
      }
      case "webhook": {
        const params = ruleInput.params || {};
        const url = String((params as any).url || "");
        if (url) {
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clip: updated, rule: ruleInput }),
          }).catch(() => undefined);
        }
        break;
      }
      case "ai_call": {
        const params = ruleInput.params || {};
        const workflow = String((params as any).workflow || "");
        if (workflow) aiWorkflows.push(workflow);
        break;
      }
      default:
        break;
    }
  }

  return { clip: updated, aiWorkflows };
}

export function testRule(rule: RuleInput, content: string, contentType = "text/plain") {
  const clip: ClipInput = {
    userId: "test",
    contentType,
    textContent: content,
  };
  const matched = matchesRule(rule, clip);
  return { matched };
}
