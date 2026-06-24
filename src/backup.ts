import { writeTextFile, mkdir, readFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { getDb } from "./db";
import { useSettingsStore } from "./settingsStore";
import { bytesToBase64 } from "./images";
import { getEnvDir } from "./env";

export async function getBackupDir(): Promise<string> {
  return join(await getEnvDir(), "backups");
}

export async function buildExportPayload(): Promise<string> {
  const db = await getDb();
  const [todos, reminders, notes, taskSessions, taskCategories, deletedCategories,
         ihkEntries, ihkModules, ihkWeeks, activity, devItems, devCategories, devSections,
         rawImages] =
    await Promise.all([
      db.select("SELECT * FROM todos"),
      db.select("SELECT * FROM reminders"),
      db.select("SELECT * FROM notes"),
      db.select("SELECT * FROM task_sessions"),
      db.select("SELECT * FROM task_categories"),
      db.select("SELECT * FROM deleted_categories"),
      db.select("SELECT * FROM ihk_entries"),
      db.select("SELECT * FROM ihk_modules"),
      db.select("SELECT * FROM ihk_weeks"),
      db.select("SELECT * FROM activity"),
      db.select("SELECT * FROM dev_items"),
      db.select("SELECT * FROM dev_categories"),
      db.select("SELECT * FROM dev_sections"),
      db.select<{ id: number; task_id: number; filename: string; path: string; data: string; created_at: string }[]>(
        "SELECT id, task_id, filename, path, data, created_at FROM task_images"
      ),
    ]);

  const taskImages = await Promise.all(rawImages.map(async img => {
    let data = img.data;
    if (img.path && !data) {
      try {
        data = bytesToBase64(await readFile(img.path));
      } catch {}
    }
    return { id: img.id, task_id: img.task_id, filename: img.filename, data, created_at: img.created_at };
  }));

  return JSON.stringify(
    { version: 3, exportedAt: new Date().toISOString(), todos, reminders, notes, taskSessions,
      taskCategories, deletedCategories, ihkEntries, ihkModules, ihkWeeks, activity,
      devItems, devCategories, devSections, taskImages },
    null, 2
  );
}

function dateStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function runAutoBackup(_silent = false): Promise<boolean> {
  const store = useSettingsStore.getState();
  if (!store.autoBackupEnabled) return false;
  const today = dateStr();
  if (store.lastAutoBackup === today) return false;
  try {
    const backupDir = await getBackupDir();
    await mkdir(backupDir, { recursive: true });
    const payload = await buildExportPayload();
    await writeTextFile(await join(backupDir, `slate-${today}.json`), payload);
    store.set("lastAutoBackup", today);
    return true;
  } catch (e) {
    console.error("Auto-backup failed:", e);
    return false;
  }
}
