import { BookIcon } from "./icons";
import type { Citation } from "../types";

/** Expandable list of the sources an answer was grounded in. */
export function Citations({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <details className="citations">
      <summary>
        <BookIcon className="citations-icon" width={15} height={15} />
        {citations.length} source{citations.length > 1 ? "s" : ""}
      </summary>
      <ol className="citation-list">
        {citations.map((citation) => (
          <li key={citation.marker} className="citation-card">
            <span className="citation-badge">{citation.marker}</span>
            <div className="citation-body">
              <p className="citation-title">{citation.title}</p>
              <p className="citation-snippet">{citation.snippet}</p>
              <span className="citation-source">{citation.source}</span>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
