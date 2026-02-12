import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const STORAGE_PATH = process.env.BLOB_STORAGE_PATH || path.resolve(process.cwd(), "blob-storage");
const PUBLIC_URL = process.env.BLOB_STORAGE_URL;

const mimeToExt: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
};

export async function ensureStoragePath() {
  await fs.mkdir(STORAGE_PATH, { recursive: true });
}

export function getPublicUrl(filename: string) {
  if (PUBLIC_URL) {
    return `${PUBLIC_URL.replace(/\/$/, "")}/${filename}`;
  }
  return `/blobs/${filename}`;
}

export async function saveDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL");
  }
  const mime = match[1];
  const data = match[2];
  const buffer = Buffer.from(data, "base64");
  const ext = mimeToExt[mime] || "bin";
  const filename = `${randomUUID()}.${ext}`;
  await ensureStoragePath();
  await fs.writeFile(path.join(STORAGE_PATH, filename), buffer);
  return { filename, mime, url: getPublicUrl(filename) };
}

export async function saveBuffer(buffer: Buffer, mime: string) {
  const ext = mimeToExt[mime] || "bin";
  const filename = `${randomUUID()}.${ext}`;
  await ensureStoragePath();
  await fs.writeFile(path.join(STORAGE_PATH, filename), buffer);
  return { filename, mime, url: getPublicUrl(filename) };
}

export function getStoragePath() {
  return STORAGE_PATH;
}
