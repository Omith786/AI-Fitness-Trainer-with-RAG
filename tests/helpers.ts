import type { Embedder } from "../src/rag/embedder.js";
import { tokenize } from "../src/rag/bm25.js";

/**
 * Deterministic, offline embedder for tests. It hashes tokens into a
 * fixed-dimension bag-of-words vector and normalises it, so texts that share
 * vocabulary end up with higher cosine similarity. This is enough to exercise
 * the retrieval and pipeline logic without downloading a real model.
 */
export class HashingEmbedder implements Embedder {
  readonly model = "test-hashing-embedder";
  private readonly dim: number;

  constructor(dim = 64) {
    this.dim = dim;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedOne(text));
  }

  private embedOne(text: string): number[] {
    const vector = new Array<number>(this.dim).fill(0);
    for (const token of tokenize(text)) {
      vector[this.hash(token) % this.dim] += 1;
    }
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return norm === 0 ? vector : vector.map((v) => v / norm);
  }

  private hash(token: string): number {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
}
