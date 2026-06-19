import { getDb } from "./db";

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function logActivity(): Promise<void> {
  try {
    const db = await getDb();
    await db.execute("INSERT INTO activity (date) VALUES (?)", [today()]);
  } catch {}
}

export async function loadActivity(weeks = 16): Promise<Record<string, number>> {
  try {
    const db = await getDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeks * 7);
    const pad = (n: number) => String(n).padStart(2, "0");
    const cutoffStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
    const rows = await db.select<{ date: string; count: number }[]>(
      "SELECT date, COUNT(*) as count FROM activity WHERE date >= ? GROUP BY date",
      [cutoffStr]
    );
    const map: Record<string, number> = {};
    for (const r of rows) map[r.date] = r.count;
    return map;
  } catch {
    return {};
  }
}
