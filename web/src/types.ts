export interface Citation {
  marker: number;
  title: string;
  source: string;
  snippet: string;
  score: number;
}

export type ChatEvent =
  | { type: "sources"; citations: Citation[] }
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Turn {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  /** True while the assistant answer is still streaming in. */
  streaming?: boolean;
  error?: boolean;
}
