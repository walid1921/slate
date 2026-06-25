import { getDb } from "./db";
import { callClaude } from "./ai";

interface ReviewData {
  rangeStart: string;
  rangeEnd: string;
  completedTodos: Array<{ text: string; category: string; deadline: string | null; durationMs: number }>;
  inProgressTodos: Array<{ text: string; category: string; deadline: string | null; created_at: string }>;
  overdueTodos: Array<{ text: string; category: string; deadline: string }>;
  totalTimeByCategory: Array<{ category: string; totalMs: number }>;
  ihkEntries: Array<{ date: string; category: number; text: string }>;
  activityDays: number;
}

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

async function gatherData(): Promise<ReviewData> {
  const db = await getDb();
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startStr = start.toISOString();
  const today = ymd(now);

  const [todos, sessions, ihkEntries, activity, categories] = await Promise.all([
    db.select<{ id: number; text: string; status: string; category_id: number; due_date: string | null; created_at: string }[]>(
      "SELECT id, text, status, category_id, due_date, created_at FROM todos WHERE deleted_at IS NULL"
    ),
    db.select<{ task_id: number; started_at: string; ended_at: string | null }[]>(
      "SELECT task_id, started_at, ended_at FROM task_sessions WHERE started_at >= ?",
      [startStr]
    ),
    db.select<{ date: string; category: number; text: string }[]>(
      "SELECT date, category, text FROM ihk_entries WHERE date >= ? ORDER BY date ASC",
      [ymd(start)]
    ),
    db.select<{ date: string }[]>(
      "SELECT DISTINCT date FROM activity WHERE date >= ?",
      [ymd(start)]
    ),
    db.select<{ id: number; name: string }[]>(
      "SELECT id, name FROM task_categories"
    ),
  ]);

  const catName = (id: number) => categories.find(c => c.id === id)?.name ?? "Uncategorized";

  const durationByTask = new Map<number, number>();
  for (const s of sessions) {
    const end = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
    const dur = end - new Date(s.started_at).getTime();
    durationByTask.set(s.task_id, (durationByTask.get(s.task_id) ?? 0) + dur);
  }

  const totalByCategory = new Map<string, number>();
  for (const [taskId, dur] of durationByTask) {
    const t = todos.find(x => x.id === taskId);
    if (!t) continue;
    const name = catName(t.category_id);
    totalByCategory.set(name, (totalByCategory.get(name) ?? 0) + dur);
  }

  const completedTodos = todos
    .filter(t => t.status === "done" && (durationByTask.has(t.id) || t.created_at >= startStr))
    .map(t => ({
      text: t.text,
      category: catName(t.category_id),
      deadline: t.due_date,
      durationMs: durationByTask.get(t.id) ?? 0,
    }));

  const inProgressTodos = todos
    .filter(t => t.status !== "done" && (durationByTask.has(t.id) || t.created_at >= startStr))
    .map(t => ({
      text: t.text,
      category: catName(t.category_id),
      deadline: t.due_date,
      created_at: t.created_at,
    }));

  const overdueTodos = todos
    .filter(t => t.status !== "done" && t.due_date && t.due_date < today)
    .map(t => ({ text: t.text, category: catName(t.category_id), deadline: t.due_date! }));

  return {
    rangeStart: ymd(start),
    rangeEnd: today,
    completedTodos,
    inProgressTodos,
    overdueTodos,
    totalTimeByCategory: [...totalByCategory.entries()]
      .map(([category, totalMs]) => ({ category, totalMs }))
      .sort((a, b) => b.totalMs - a.totalMs),
    ihkEntries: ihkEntries.map(e => ({ date: e.date, category: e.category, text: e.text })),
    activityDays: activity.length,
  };
}

function buildPrompt(d: ReviewData): string {
  const ihkCatLabel = (c: number) => (c === 0 ? "Betrieb" : c === 1 ? "Schulung" : "Berufsschule");
  return `Here is the user's data from ${d.rangeStart} to ${d.rangeEnd} (7 days).

## Active days
${d.activityDays} out of 7 days

## Completed tasks (${d.completedTodos.length})
${d.completedTodos.length === 0 ? "None" : d.completedTodos.map(t =>
  `- [${t.category}] ${t.text}${t.durationMs > 0 ? ` (${fmtDuration(t.durationMs)})` : ""}${t.deadline ? ` — deadline ${t.deadline}` : ""}`
).join("\n")}

## In progress (${d.inProgressTodos.length})
${d.inProgressTodos.length === 0 ? "None" : d.inProgressTodos.map(t =>
  `- [${t.category}] ${t.text}${t.deadline ? ` — deadline ${t.deadline}` : ""}`
).join("\n")}

## Overdue (${d.overdueTodos.length})
${d.overdueTodos.length === 0 ? "None" : d.overdueTodos.map(t =>
  `- [${t.category}] ${t.text} — was due ${t.deadline}`
).join("\n")}

## Time tracked by category
${d.totalTimeByCategory.length === 0 ? "No sessions logged" : d.totalTimeByCategory.map(c =>
  `- ${c.category}: ${fmtDuration(c.totalMs)}`
).join("\n")}

## IHK training entries (${d.ihkEntries.length})
${d.ihkEntries.length === 0 ? "None" : d.ihkEntries.map(e =>
  `- ${e.date} [${ihkCatLabel(e.category)}] ${e.text}`
).join("\n")}

Produce a weekly review in markdown with these sections:
1. **What you shipped** — the concrete wins from the completed tasks list
2. **Where your time went** — patterns from the time-by-category data
3. **What slipped** — overdue tasks and stalled in-progress work that needs attention
4. **Suggestions for next week** — 2-3 specific, actionable recommendations based on the patterns above

Be direct, specific, and concise. Quote task names from the list. No fluff, no generic productivity advice. Under 400 words total.`;
}

export async function runWeeklyReview(): Promise<string> {
  const data = await gatherData();
  const prompt = buildPrompt(data);
  return await callClaude({
    system: "You are a thoughtful productivity coach reviewing the user's week. You write in clear, direct markdown. You quote specifics from the data — task names, hours, categories — rather than speaking in generalities.",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2048,
  });
}
