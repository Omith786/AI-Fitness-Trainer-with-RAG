import { Citations } from "./Citations";
import { MessageContent } from "./MessageContent";
import { DumbbellIcon } from "./icons";
import type { Turn } from "../types";

/** A single chat turn: the user's question or the trainer's grounded answer. */
export function Message({ turn }: { turn: Turn }) {
  const isUser = turn.role === "user";

  return (
    <div
      className={`message ${isUser ? "message-user" : "message-assistant"}`}
      data-streaming={turn.streaming ? "true" : undefined}
    >
      <div className="message-avatar" aria-hidden>
        {isUser ? "You" : <DumbbellIcon width={18} height={18} />}
      </div>
      <div className="message-content">
        <div className={`bubble ${turn.error ? "bubble-error" : ""}`}>
          {isUser ? (
            <p>{turn.content}</p>
          ) : turn.content.length === 0 && turn.streaming ? (
            <span className="typing" aria-label="Trainer is thinking">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <MessageContent text={turn.content} />
          )}
        </div>
        {!isUser && turn.citations && turn.citations.length > 0 && (
          <Citations citations={turn.citations} />
        )}
      </div>
    </div>
  );
}
