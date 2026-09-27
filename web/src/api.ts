import type { ChatEvent, ChatMessage } from "./types";

/**
 * Stream a chat answer from the backend, yielding parsed NDJSON events as they
 * arrive. Each line of the response body is one JSON-encoded {@link ChatEvent}.
 */
export async function* streamChat(
  message: string,
  history: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, history }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Emit every complete line, keeping any partial trailing line buffered.
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line.length > 0) yield JSON.parse(line) as ChatEvent;
      newline = buffer.indexOf("\n");
    }
  }

  const tail = buffer.trim();
  if (tail.length > 0) yield JSON.parse(tail) as ChatEvent;
}

export async function fetchHealth(): Promise<{ status: string; chunks: number }> {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error("Health check failed");
  return response.json();
}
