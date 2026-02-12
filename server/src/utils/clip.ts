import type { Clip } from "../db/schema";
import { deriveTitleFromText, normalizeTags } from "./tags";

export function serializeClip(clip: Clip) {
  const meta = normalizeTags(clip.tags);
  return {
    id: clip.id,
    user_id: clip.userId,
    device_id: clip.deviceId,
    content_type: clip.contentType,
    text_content: clip.textContent,
    blob_url: clip.blobUrl,
    tags: meta.labels,
    folder_id: clip.folderId,
    is_pinned: clip.isPinned,
    is_starred: clip.isStarred,
    is_deleted: clip.isDeleted,
    hotkey_slot: clip.hotkeySlot,
    source: clip.source,
    created_at: clip.createdAt,
    updated_at: clip.updatedAt,
    title: meta.title ?? deriveTitleFromText(clip.textContent),
    category: meta.category ?? "clipboard",
    structured: meta.structured ?? (meta.fields ? meta.fields.length > 0 : false),
    structured_fields: meta.fields || [],
  };
}
