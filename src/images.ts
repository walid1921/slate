import { mkdir, readFile, writeFile, remove } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { getEnvDir } from "./env";

export async function getImagesDir(): Promise<string> {
  return join(await getEnvDir(), "images");
}

export function extToMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...(bytes.subarray(i, Math.min(i + 8192, bytes.length)) as unknown as number[]));
  return btoa(binary);
}

export async function imageToDataUrl(filePath: string, filename: string): Promise<string> {
  const bytes = await readFile(filePath);
  return `data:${extToMime(filename)};base64,${bytesToBase64(bytes)}`;
}

export async function saveImageToDir(bytes: Uint8Array, filename: string, taskId: number): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const imagesDir = await getImagesDir();
  await mkdir(imagesDir, { recursive: true });
  const destPath = await join(imagesDir, `${taskId}_${Date.now()}_${safeName}`);
  await writeFile(destPath, bytes);
  return destPath;
}

export async function deleteImageFile(filePath: string): Promise<void> {
  await remove(filePath).catch(() => {});
}

export async function migrateImagesToFilesystem(): Promise<void> {
  const { getDb } = await import("./db");
  const db = await getDb();
  const rows = await db.select<{ id: number; task_id: number; filename: string; data: string }[]>(
    "SELECT id, task_id, filename, data FROM task_images WHERE (path = '' OR path IS NULL) AND data != ''"
  );
  if (!rows.length) return;
  const imagesDir = await getImagesDir();
  await mkdir(imagesDir, { recursive: true });
  for (const row of rows) {
    try {
      const safeName = row.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = await join(imagesDir, `${row.id}_${safeName}`);
      const binary = atob(row.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      await writeFile(filePath, bytes);
      await db.execute("UPDATE task_images SET path = ?, data = '' WHERE id = ?", [filePath, row.id]);
    } catch (e) {
      console.error("Failed to migrate image", row.id, e);
    }
  }
}
