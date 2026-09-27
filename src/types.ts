/** A source document loaded from the knowledge base. */
export interface KnowledgeDoc {
  id: string;
  title: string;
  /** Human-readable provenance, shown in citations. */
  source: string;
  tags: string[];
  content: string;
}

/** A contiguous slice of a document, the unit that gets embedded and retrieved. */
export interface Chunk {
  id: string;
  docId: string;
  title: string;
  source: string;
  text: string;
  /** Position of the chunk within its parent document, from zero. */
  ordinal: number;
}

/** A chunk plus its stored embedding, as persisted in the index file. */
export interface IndexedChunk extends Chunk {
  embedding: number[];
}

/** The on-disk index format produced by `build:index`. */
export interface IndexFile {
  embeddingModel: string;
  dimension: number;
  createdAt: string;
  chunks: IndexedChunk[];
}

/** A retrieval hit with its fused relevance score. */
export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
}

/** A citation surfaced to the user alongside an answer. */
export interface Citation {
  /** One-based marker matching the [n] references in the answer text. */
  marker: number;
  title: string;
  source: string;
  snippet: string;
  score: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Streaming events emitted by the RAG pipeline over the chat endpoint. */
export type ChatEvent =
  | { type: "sources"; citations: Citation[] }
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };
