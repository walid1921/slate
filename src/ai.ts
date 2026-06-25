import Anthropic from "@anthropic-ai/sdk";
import { useSettingsStore } from "./settingsStore";

export interface AiCallOptions {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  max_tokens?: number;
}

export function isAiConfigured(): boolean {
  return useSettingsStore.getState().aiApiKey.trim().length > 0;
}

function getClient(): Anthropic {
  const apiKey = useSettingsStore.getState().aiApiKey.trim();
  if (!apiKey) throw new Error("No API key configured. Add one in Settings → Data → AI Assistant.");
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export async function callClaude(opts: AiCallOptions): Promise<string> {
  const client = getClient();
  const model = useSettingsStore.getState().aiModel;
  const response = await client.messages.create({
    model,
    max_tokens: opts.max_tokens ?? 4096,
    system: opts.system,
    messages: opts.messages,
  });
  return response.content
    .filter((b): b is { type: "text"; text: string } & typeof b => b.type === "text")
    .map(b => (b as { text: string }).text)
    .join("");
}
