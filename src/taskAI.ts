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

export async function generateTaskFromPrompt(userPrompt: string, contextCategory: string): Promise<GeneratedTask> {
  const { client, model } = getClient();
  const system = `You generate structured task definitions from user prompts. Produce exactly one task with title, description, priority, deadline, and 3-6 subtasks.

- Title: imperative, concise (under 80 chars), no filler
- Description: 1-3 sentences explaining what and why, markdown allowed
- Priority: infer from urgency cues — high = blocking/critical, medium = important, low = nice-to-have, none = neutral
- Deadline: parse natural language relative to today (${today()}). Use null when no deadline is implied. If only a date is implied, leave due_time as null.
- Subtasks: 3-6 concrete steps. Each starts with a verb. Each is independently doable in under 2 hours.

Current category context: "${contextCategory}". Today is ${today()}.`;

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

export async function breakDownTask(text: string, description: string): Promise<{ text: string }[]> {
  const { client, model } = getClient();
  const system = `You break down tasks into 3-6 concrete subtasks. Each subtask:
- Starts with a verb (Write, Test, Review, Setup, Deploy, etc.)
- Is independently completable in under 2 hours
- Is ordered in logical execution sequence
- Avoids vague language ("understand X", "think about Y")`;

  const userMessage = description.trim()
    ? `Task: ${text}\n\nContext:\n${description}\n\nBreak this down into 3-6 actionable subtasks.`
    : `Task: ${text}\n\nBreak this down into 3-6 actionable subtasks.`;

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: userMessage }],
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
