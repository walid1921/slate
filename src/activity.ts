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

export async function loadActivityForYear(year: number): Promise<Record<string, number>> {
  try {
    const db = await getDb();
    const rows = await db.select<{ date: string; count: number }[]>(
      "SELECT date, COUNT(*) as count FROM activity WHERE date >= ? AND date <= ? GROUP BY date",
      [`${year}-01-01`, `${year}-12-31`]
    );
    const map: Record<string, number> = {};
    for (const r of rows) map[r.date] = r.count;
    return map;
  } catch {
    return {};
  }
}

export async function loadAllActivityDates(): Promise<string[]> {
  try {
    const db = await getDb();
    const rows = await db.select<{ date: string }[]>(
      "SELECT DISTINCT date FROM activity ORDER BY date ASC"
    );
    return rows.map(r => r.date);
  } catch {
    return [];
  }
}

export async function loadActivityYears(): Promise<number[]> {
  try {
    const db = await getDb();
    const rows = await db.select<{ year: number }[]>(
      "SELECT DISTINCT CAST(substr(date, 1, 4) AS INTEGER) as year FROM activity ORDER BY year DESC"
    );
    const current = new Date().getFullYear();
    const years = rows.map(r => r.year);
    if (!years.includes(current)) years.unshift(current);
    return years;
  } catch {
    return [new Date().getFullYear()];
  }
}
