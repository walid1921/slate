import Anthropic from "@anthropic-ai/sdk";
import { Priority } from "./store";
import { useSettingsStore } from "./settingsStore";

export interface GeneratedTask {
  text: string;
  description: string;
  priority: Priority;
  due_date: string | null;
  due_time: string | null;
  subtasks: { text: string }[];
}

function getClient(): { client: Anthropic; model: string } {
  const apiKey = useSettingsStore.getState().aiApiKey.trim();
  if (!apiKey) throw new Error("No API key configured. Add one in Settings → Data → AI Assistant.");
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const model = useSettingsStore.getState().aiModel;
  return { client, model };
}

const TASK_SCHEMA = {
  type: "object" as const,
  properties: {
    text: { type: "string", description: "Concise imperative task title (under 80 chars). No filler words." },
    description: {
      type: "string",
      description: "Short context paragraph explaining what the task is about and why. Markdown allowed. 1-3 sentences.",
    },
    priority: {
      type: "string",
      enum: ["none", "low", "medium", "high"],
      description: "Inferred priority. high = blocking/urgent, medium = important, low = nice-to-have, none = neutral.",
    },
    due_date: {
      type: ["string", "null"],
      description: "Deadline as ISO date YYYY-MM-DD if the prompt implies one, otherwise null.",
    },
    due_time: {
      type: ["string", "null"],
      description: "Deadline time HH:MM (24-hour) if the prompt implies one, otherwise null.",
    },
    subtasks: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: { text: { type: "string", description: "Concrete actionable subtask starting with a verb." } },
        required: ["text"],
      },
      description: "3-6 concrete subtasks ordered in a logical execution sequence.",
    },
  },
  required: ["text", "description", "priority", "due_date", "due_time", "subtasks"],
};

const SUBTASKS_SCHEMA = {
  type: "object" as const,
  properties: {
    subtasks: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
  required: ["subtasks"],
};

const DESCRIPTION_SCHEMA = {
  type: "object" as const,
  properties: {
    description: { type: "string", description: "1-3 sentence markdown description for the task." },
  },
  required: ["description"],
};

const DEADLINE_PRIORITY_SCHEMA = {
  type: "object" as const,
  properties: {
    priority: { type: "string", enum: ["none", "low", "medium", "high"] },
    due_date: { type: ["string", "null"] },
    due_time: { type: ["string", "null"] },
    reasoning: { type: "string", description: "One short sentence explaining the choice." },
  },
  required: ["priority", "due_date", "due_time", "reasoning"],
};

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function dateRef(): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const t = new Date();
  const weekday = t.toLocaleDateString("en-US", { weekday: "long" });
  const days: Record<string, Date> = {};
  // next 14 days
  for (let i = 0; i < 14; i++) {
    const d = new Date(t);
    d.setDate(t.getDate() + i);
    const name = d.toLocaleDateString("en-US", { weekday: "long" });
    if (!days[name]) days[name] = d;
  }
  const lines: string[] = [
    `- today: ${toIso(t)} (${weekday})`,
    `- tomorrow: ${toIso(new Date(t.getTime() + 86400000))}`,
  ];
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].forEach(name => {
    if (days[name]) lines.push(`- next ${name}: ${toIso(days[name])}`);
  });
  return lines.join("\n");
}

export async function generateTaskFromPrompt(userPrompt: string, contextCategory: string): Promise<GeneratedTask> {
  const { client, model } = getClient();
  const system = `You generate structured task definitions from user prompts. Produce exactly one task with title, description, priority, deadline, and 3-6 subtasks.

- Title: imperative, concise (under 80 chars), no filler
- Description: 1-3 sentences explaining what and why, markdown allowed
- Priority: infer from urgency cues — high = blocking/critical, medium = important, low = nice-to-have, none = neutral
- Deadline: ACTIVELY extract deadlines from the prompt. Set due_date whenever the user provides ANY temporal cue, including:
    * Explicit dates ("June 30", "by 2026-07-01")
    * Weekdays ("by Friday", "Monday", "next Tuesday") — pick from the reference table below
    * Relative ("today", "tomorrow", "this week", "next week", "end of week")
    * Urgency words ("asap", "urgent", "blocking", "now") → today
  Set due_time when the prompt mentions a time ("5pm" → "17:00", "end of day" → "18:00", "morning" → "09:00").
  Only leave due_date null when there is GENUINELY no time cue at all.
- Subtasks: 3-6 concrete steps. Each starts with a verb. Each is independently doable in under 2 hours.

Current category context: "${contextCategory}".

Date reference (use these exact ISO dates — do not compute your own):
${dateRef()}`;

  const response = await client.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userPrompt }],
    tools: [{ name: "generate_task", description: "Emit the generated task.", input_schema: TASK_SCHEMA }],
    tool_choice: { type: "tool", name: "generate_task" },
  });

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not return a task.");
  return toolUse.input as GeneratedTask;
}

export async function generateTaskDescription(
  text: string,
  existingSubtasks: { text: string; done: boolean }[] = [],
): Promise<string> {
  const { client, model } = getClient();
  const system = `You write short task descriptions in markdown.
- 1-3 sentences total
- Explain WHAT the task is and WHY it matters
- Concrete and specific — no generic productivity advice or filler
- Markdown allowed (bold, lists, inline code) but keep it minimal
- Do not restate the title verbatim — add context the title doesn't already convey`;

  const parts: string[] = [`Task title: ${text}`];
  if (existingSubtasks.length > 0) {
    parts.push("Existing subtasks (for context, do not enumerate):");
    for (const s of existingSubtasks) parts.push(`- ${s.text}`);
  }
  parts.push("Write a short markdown description for this task.");

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    system,
    messages: [{ role: "user", content: parts.join("\n\n") }],
    tools: [{ name: "emit_description", description: "Emit the description.", input_schema: DESCRIPTION_SCHEMA }],
    tool_choice: { type: "tool", name: "emit_description" },
  });

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not return a description.");
  return (toolUse.input as { description: string }).description;
}

export async function breakDownTask(
  text: string,
  description: string,
  existingSubtasks: { text: string; done: boolean }[] = [],
  instruction?: string,
): Promise<{ text: string }[]> {
  const { client, model } = getClient();
  const system = `You produce 3-6 concrete subtasks for a task. Each subtask:
- Starts with a verb (Write, Test, Review, Setup, Deploy, etc.)
- Is independently completable in under 2 hours
- Is ordered in logical execution sequence
- Avoids vague language ("understand X", "think about Y")

When the user provides existing subtasks:
- Subtasks marked [done] are completed work — KEEP them verbatim in your output unless they are clearly redundant.
- Subtasks marked [todo] can be kept, refined for clarity, merged, split, or removed if no longer relevant.
- Add new subtasks when needed.
- When a user instruction is provided, follow it strictly — it overrides everything else.`;

  const parts: string[] = [`Task: ${text}`];
  if (description.trim()) parts.push(`Description:\n${description.trim()}`);
  if (existingSubtasks.length > 0) {
    parts.push("Existing subtasks:");
    for (const s of existingSubtasks) parts.push(`- [${s.done ? "done" : "todo"}] ${s.text}`);
  }
  if (instruction && instruction.trim()) {
    parts.push(`User instruction: ${instruction.trim()}`);
  } else if (existingSubtasks.length > 0) {
    parts.push("Refine and complete the breakdown — keep done items, improve or extend todo items as needed.");
  } else {
    parts.push("Break this down into 3-6 actionable subtasks.");
  }

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: parts.join("\n\n") }],
    tools: [{ name: "emit_subtasks", description: "Emit the subtasks.", input_schema: SUBTASKS_SCHEMA }],
    tool_choice: { type: "tool", name: "emit_subtasks" },
  });

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not return subtasks.");
  return (toolUse.input as { subtasks: { text: string }[] }).subtasks;
}

export interface SuggestedDeadlinePriority {
  priority: Priority;
  due_date: string | null;
  due_time: string | null;
  reasoning: string;
}

export async function suggestDeadlineAndPriority(text: string, description: string): Promise<SuggestedDeadlinePriority> {
  const { client, model } = getClient();
  const system = `You infer priority and deadline from task text.
- Priority: high = blocking/urgent/production-impacting, medium = important, low = nice-to-have, none = neutral or unclear
- Deadline: extract from urgency cues ("today", "tomorrow", "this week", "asap" → today). Use null when no deadline is implied. Relative to today (${today()}).
- Provide a one-sentence reasoning.`;

  const userMessage = description.trim()
    ? `Task: ${text}\n\nContext:\n${description}`
    : `Task: ${text}`;

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    system,
    messages: [{ role: "user", content: userMessage }],
    tools: [{ name: "suggest", description: "Emit the suggestion.", input_schema: DEADLINE_PRIORITY_SCHEMA }],
    tool_choice: { type: "tool", name: "suggest" },
  });

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not return a suggestion.");
  return toolUse.input as SuggestedDeadlinePriority;
}
