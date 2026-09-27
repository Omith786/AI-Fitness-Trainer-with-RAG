import { describe, expect, it } from "vitest";
import { Bm25, tokenize } from "../src/rag/bm25.js";

describe("tokenize", () => {
  it("lowercases and drops punctuation and single characters", () => {
    expect(tokenize("Protein, for MUSCLE-recovery! a")).toEqual(["protein", "for", "muscle", "recovery"]);
  });
});

describe("Bm25", () => {
  const docs = [
    "protein supports muscle recovery after strength training",
    "cardio training improves heart and lung endurance",
    "hydration and water intake matter for performance",
  ];

  it("ranks the most relevant document first", () => {
    const bm25 = new Bm25(docs);
    const hits = bm25.search("how much protein for muscle recovery", 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].index).toBe(0);
  });

  it("returns no hits when no query term matches", () => {
    const bm25 = new Bm25(docs);
    expect(bm25.search("kayaking wallpaper", 3)).toEqual([]);
  });

  it("respects the result limit", () => {
    const bm25 = new Bm25(docs);
    const hits = bm25.search("training", 1);
    expect(hits.length).toBeLessThanOrEqual(1);
  });
});
