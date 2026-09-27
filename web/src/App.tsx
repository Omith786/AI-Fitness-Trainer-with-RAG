import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchHealth, streamChat } from "./api";
import { Composer } from "./components/Composer";
import { Message } from "./components/Message";
import { BookIcon, DumbbellIcon, SparkIcon } from "./components/icons";
import type { ChatMessage, Turn } from "./types";

const SUGGESTIONS = [
  "How should a beginner structure a strength routine?",
  "How much protein do I need to build muscle?",
  "What is progressive overload and how do I apply it?",
  "How many rest days should I take each week?",
];

let turnCounter = 0;
const nextId = () => `turn-${turnCounter++}`;

export function App() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHealth()
      .then((health) => setChunkCount(health.chunks))
      .catch(() => setChunkCount(null));
  }, []);

  // Keep the newest message in view as answers stream in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const history = useMemo<ChatMessage[]>(
    () => turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content })),
    [turns],
  );

  const send = useCallback(
    async (message: string) => {
      if (isStreaming) return;

      const userTurn: Turn = { id: nextId(), role: "user", content: message };
      const assistantId = nextId();
      const assistantTurn: Turn = { id: assistantId, role: "assistant", content: "", streaming: true };
      const priorHistory = history;
      setTurns((prev) => [...prev, userTurn, assistantTurn]);
      setIsStreaming(true);

      const patch = (update: Partial<Turn>) =>
        setTurns((prev) => prev.map((t) => (t.id === assistantId ? { ...t, ...update } : t)));

      try {
        for await (const event of streamChat(message, priorHistory)) {
          if (event.type === "sources") {
            patch({ citations: event.citations });
          } else if (event.type === "token") {
            setTurns((prev) =>
              prev.map((t) => (t.id === assistantId ? { ...t, content: t.content + event.text } : t)),
            );
          } else if (event.type === "error") {
            patch({ content: event.message, error: true, streaming: false });
          }
        }
      } catch {
        patch({
          content:
            "Sorry, I could not reach the model. Check that the language model server (Ollama by default) is running, then try again.",
          error: true,
          streaming: false,
        });
      } finally {
        patch({ streaming: false });
        setIsStreaming(false);
      }
    },
    [history, isStreaming],
  );

  const hasConversation = turns.length > 0;

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <DumbbellIcon width={22} height={22} />
          </span>
          <div>
            <h1>AI Fitness Trainer</h1>
            <p className="brand-sub">Retrieval-augmented coaching</p>
          </div>
        </div>

        <div className="sidebar-card">
          <h2>
            <SparkIcon width={16} height={16} /> How it works
          </h2>
          <p>
            Every answer is grounded in a curated fitness knowledge base. The trainer retrieves the
            most relevant passages, then writes a response and cites the sources it used.
          </p>
        </div>

        <div className="sidebar-card">
          <h2>
            <BookIcon width={16} height={16} /> Knowledge base
          </h2>
          <p>
            {chunkCount === null
              ? "Connecting to the retriever..."
              : `${chunkCount} indexed passages on strength, cardio, nutrition and recovery.`}
          </p>
        </div>

        <p className="disclaimer">
          General information only, not medical advice. Consult a qualified professional for
          injuries, medical conditions or personalised programmes.
        </p>
      </aside>

      <main className="chat">
        <div className="messages" ref={scrollRef}>
          {!hasConversation ? (
            <div className="welcome">
              <span className="welcome-mark">
                <DumbbellIcon width={30} height={30} />
              </span>
              <h2>What would you like to work on?</h2>
              <p>Ask about training, nutrition or recovery and get grounded, cited guidance.</p>
              <div className="suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} className="suggestion" onClick={() => send(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="thread">
              {turns.map((turn) => (
                <Message key={turn.id} turn={turn} />
              ))}
            </div>
          )}
        </div>

        <div className="composer-area">
          <Composer disabled={isStreaming} onSend={send} />
          <p className="composer-hint">
            Grounded in a curated knowledge base. Not a substitute for professional medical advice.
          </p>
        </div>
      </main>
    </div>
  );
}
