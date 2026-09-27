import { beforeAll, describe, expect, it } from "vitest";
import { HybridRetriever } from "../src/rag/retriever.js";
import type { Chunk, IndexedChunk } from "../src/types.js";
import { HashingEmbedder } from "./helpers.js";

const rawChunks: Chunk[] = [
  {
    id: "protein#0",
    docId: "protein",
    title: "Protein and Muscle Recovery",
    source: "test",
    text: "Aim for 1.6 to 2.2 grams of protein per kilogram of body weight to support muscle recovery.",
    ordinal: 0,
  },
  {
    id: "cardio#0",
    docId: "cardio",
    title: "Cardiovascular Training",
    source: "test",
    text: "Cardio such as brisk walking, cycling and running improves heart and lung endurance.",
    ordinal: 0,
  },
  {
    id: "sleep#0",
    docId: "sleep",
    title: "Sleep and Recovery",
    source: "test",
    text: "Most adults recover best with seven to nine hours of quality sleep each night.",
    ordinal: 0,
  },
];

describe("HybridRetriever", () => {
  const embedder = new HashingEmbedder();
  let retriever: HybridRetriever;

  beforeAll(async () => {
    const vectors = await embedder.embed(rawChunks.map((c) => `${c.title}\n${c.text}`));
    const indexed: IndexedChunk[] = rawChunks.map((chunk, i) => ({ ...chunk, embedding: vectors[i] }));
    retriever = new HybridRetriever(indexed, embedder);
  });

  it("reports its size", () => {
    expect(retriever.size).toBe(3);
  });

  it("retrieves the most relevant chunk for a query", async () => {
    const results = await retriever.retrieve("how much protein for muscle recovery", {
      candidatesPerRetriever: 5,
      topK: 2,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].chunk.docId).toBe("protein");
  });

  it("honours topK", async () => {
    const results = await retriever.retrieve("training and recovery", {
      candidatesPerRetriever: 5,
      topK: 2,
    });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("returns nothing for an empty index", async () => {
    const empty = new HybridRetriever([], embedder);
    const results = await empty.retrieve("anything", { candidatesPerRetriever: 5, topK: 3 });
    expect(results).toEqual([]);
  });
});
