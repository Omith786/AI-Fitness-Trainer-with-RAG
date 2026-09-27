import type { IndexedChunk, RetrievedChunk } from "../types.js";
import { Bm25 } from "./bm25.js";
import { cosineSimilarity, type Embedder } from "./embedder.js";

export interface RetrieveOptions {
  candidatesPerRetriever: number;
  topK: number;
}

/** Reciprocal rank fusion constant; 60 is the value from the original paper. */
const RRF_K = 60;

/**
 * Hybrid retriever combining dense (semantic) and BM25 (lexical) search.
 *
 * Each retriever ranks the chunks independently, then reciprocal rank fusion
 * merges the two rankings. RRF only needs the rank position, so it sidesteps
 * the problem of cosine scores and BM25 scores living on different scales.
 */
export class HybridRetriever {
  private readonly chunks: IndexedChunk[];
  private readonly embedder: Embedder;
  private readonly bm25: Bm25;

  constructor(chunks: IndexedChunk[], embedder: Embedder) {
    this.chunks = chunks;
    this.embedder = embedder;
    this.bm25 = new Bm25(chunks.map((chunk) => `${chunk.title}\n${chunk.text}`));
  }

  get size(): number {
    return this.chunks.length;
  }

  async retrieve(query: string, options: RetrieveOptions): Promise<RetrievedChunk[]> {
    if (this.chunks.length === 0) return [];
    const { candidatesPerRetriever, topK } = options;

    const [queryEmbedding] = await this.embedder.embed([query]);
    const dense = this.chunks
      .map((chunk, index) => ({ index, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, candidatesPerRetriever);

    const lexical = this.bm25.search(query, candidatesPerRetriever);

    // Fuse the two ranked lists by reciprocal rank.
    const fused = new Map<number, number>();
    const addRanking = (ranked: { index: number }[]) => {
      ranked.forEach((hit, rank) => {
        fused.set(hit.index, (fused.get(hit.index) ?? 0) + 1 / (RRF_K + rank + 1));
      });
    };
    addRanking(dense);
    addRanking(lexical);

    return [...fused.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([index, score]) => ({ chunk: this.chunks[index], score }));
  }
}
