/**
 * A compact BM25 ranking function over a fixed corpus.
 *
 * BM25 is a strong lexical baseline that complements dense embeddings: it
 * excels at exact-term matches (specific exercises, nutrients, numbers) that a
 * semantic model can smooth over. The hybrid retriever fuses the two.
 */
const K1 = 1.5;
const B = 0.75;

export interface Bm25Hit {
  index: number;
  score: number;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

export class Bm25 {
  private readonly docTokens: string[][];
  private readonly docLengths: number[];
  private readonly avgDocLength: number;
  /** term -> number of documents containing it. */
  private readonly documentFrequency: Map<string, number>;
  private readonly corpusSize: number;

  constructor(documents: string[]) {
    this.docTokens = documents.map(tokenize);
    this.docLengths = this.docTokens.map((tokens) => tokens.length);
    this.corpusSize = documents.length;
    const totalLength = this.docLengths.reduce((sum, len) => sum + len, 0);
    this.avgDocLength = this.corpusSize > 0 ? totalLength / this.corpusSize : 0;

    this.documentFrequency = new Map();
    for (const tokens of this.docTokens) {
      for (const term of new Set(tokens)) {
        this.documentFrequency.set(term, (this.documentFrequency.get(term) ?? 0) + 1);
      }
    }
  }

  private idf(term: string): number {
    const df = this.documentFrequency.get(term) ?? 0;
    // Standard BM25 idf with a +1 shift to keep scores non-negative.
    return Math.log(1 + (this.corpusSize - df + 0.5) / (df + 0.5));
  }

  /** Score every document against the query and return the top `limit` hits. */
  search(query: string, limit: number): Bm25Hit[] {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0 || this.corpusSize === 0) return [];

    const hits: Bm25Hit[] = [];
    for (let i = 0; i < this.corpusSize; i++) {
      const tokens = this.docTokens[i];
      const docLength = this.docLengths[i];
      const termCounts = new Map<string, number>();
      for (const token of tokens) {
        termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
      }

      let score = 0;
      for (const term of queryTerms) {
        const frequency = termCounts.get(term);
        if (frequency === undefined) continue;
        const numerator = frequency * (K1 + 1);
        const denominator =
          frequency + K1 * (1 - B + (B * docLength) / (this.avgDocLength || 1));
        score += this.idf(term) * (numerator / denominator);
      }
      if (score > 0) hits.push({ index: i, score });
    }

    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }
}
