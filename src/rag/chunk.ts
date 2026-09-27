import type { Chunk, KnowledgeDoc } from "../types.js";

export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
}

/**
 * Split a document into overlapping, paragraph-aware chunks.
 *
 * Splitting on blank lines keeps related sentences together, which gives the
 * retriever cleaner units than a naive fixed-width slice. Paragraphs are packed
 * up to `chunkSize` characters; a trailing overlap is carried into the next
 * chunk so context that straddles a boundary is not lost.
 */
export function chunkDocument(doc: KnowledgeDoc, options: ChunkOptions): Chunk[] {
  const { chunkSize, chunkOverlap } = options;
  const paragraphs = doc.content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: Chunk[] = [];
  let buffer = "";
  // Tracks whether a paragraph has been added since the last flush, so the
  // final flush does not emit a chunk made only of the carried-over overlap.
  let hasNewContent = false;

  const flush = () => {
    const text = buffer.trim();
    if (text.length === 0 || !hasNewContent) return;
    chunks.push({
      id: `${doc.id}#${chunks.length}`,
      docId: doc.id,
      title: doc.title,
      source: doc.source,
      text,
      ordinal: chunks.length,
    });
    // Carry the tail of the current chunk into the next one for continuity,
    // starting at a word boundary so chunks and their snippets never begin
    // mid-word.
    buffer = "";
    if (chunkOverlap > 0) {
      const tail = text.slice(Math.max(0, text.length - chunkOverlap));
      const firstSpace = tail.indexOf(" ");
      buffer = firstSpace > 0 ? tail.slice(firstSpace + 1) : tail;
    }
    hasNewContent = false;
  };

  for (const paragraph of paragraphs) {
    // A single oversized paragraph is emitted on its own rather than dropped.
    if (paragraph.length >= chunkSize) {
      flush();
      buffer = paragraph;
      hasNewContent = true;
      flush();
      continue;
    }
    if (buffer.length > 0 && buffer.length + paragraph.length + 2 > chunkSize) {
      flush();
    }
    buffer = buffer.length > 0 ? `${buffer}\n\n${paragraph}` : paragraph;
    hasNewContent = true;
  }
  flush();

  return chunks;
}

/** Chunk a whole knowledge base in document order. */
export function chunkDocuments(docs: KnowledgeDoc[], options: ChunkOptions): Chunk[] {
  return docs.flatMap((doc) => chunkDocument(doc, options));
}
