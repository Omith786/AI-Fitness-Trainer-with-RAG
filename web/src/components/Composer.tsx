import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { SendIcon } from "./icons";

interface ComposerProps {
  disabled: boolean;
  onSend: (message: string) => void;
}

/** The message input: an auto-growing textarea that submits on Enter. */
export function Composer({ disabled, onSend }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0 || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(event);
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        ref={textareaRef}
        className="composer-input"
        placeholder="Ask about training, nutrition, recovery..."
        value={value}
        rows={1}
        onChange={(event) => {
          setValue(event.target.value);
          const el = event.target;
          el.style.height = "auto";
          el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
        }}
        onKeyDown={handleKeyDown}
      />
      <button
        type="submit"
        className="composer-send"
        disabled={disabled || value.trim().length === 0}
        aria-label="Send message"
      >
        <SendIcon width={18} height={18} />
      </button>
    </form>
  );
}
