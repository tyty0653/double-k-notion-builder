import { Client } from "@notionhq/client";

export const NOTION_API_VERSION = "2026-03-11";

export function createNotionClient({ token, ClientClass = Client } = {}) {
  if (!token) throw new Error("NOTION_TOKEN is required for live Notion commands");
  return new ClientClass({
    auth: token,
    notionVersion: NOTION_API_VERSION,
    retry: {
      maxRetries: 3,
      initialRetryDelayMs: 500,
      maxRetryDelayMs: 10000,
    },
  });
}
