import { beforeAll, describe, expect, it } from "vitest";
import { FakeLlmClient } from "../src/llm/fake.js";
import { RagPipeline } from "../src/rag/pipeline.js";
import { HybridRetriever } from "../src/rag/retriever.js";
import type { ChatEvent, Chunk, IndexedChunk } from "../src/types.js";
import { HashingEmbedder } from "./helpers.js";

const rawChunks: Chunk[] = [
  {
    id: "protein#0",
    docId: "protein",
    title: "Protein and Muscle Recovery",
    source: "Curated fitness knowledge base",
    text: "Aim for 1.6 to 2.2 grams of protein per kilogram of body weight to support muscle recovery.",
    ordinal: 0,
  },
  {
    id: "strength#0",
    docId: "strength",
    title: "Beginner Strength Training",
    source: "Curated fitness knowledge base",
    text: "A full-body routine two or three times per week suits beginners, covering squat, hinge, push and pull.",
    ordinal: 0,
  },
];

async function collect(gen: AsyncGenerator<ChatEvent>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of gen) events.push(event);
  return events;
}

describe("RagPipeline", () => {
  const retrieval = { chunkSize: 700, chunkOverlap: 100, candidatesPerRetriever: 5, topK: 2 };
  let retriever: HybridRetriever;
  let pipeline: RagPipeline;

  beforeAll(async () => {
    const embedder = new HashingEmbedder();
    const vectors = await embedder.embed(rawChunks.map((c) => `${c.title}\n${c.text}`));
    const indexed: IndexedChunk[] = rawChunks.map((chunk, i) => ({ ...chunk, embedding: vectors[i] }));
    retriever = new HybridRetriever(indexed, embedder);
    pipeline = new RagPipeline(retriever, new FakeLlmClient(), retrieval);
  });

  it("emits sources first, then answer tokens, then done", async () => {
    const events = await collect(pipeline.answer("how much protein should I eat?"));

    expect(events[0].type).toBe("sources");
    expect(events.at(-1)?.type).toBe("done");
    expect(events.some((e) => e.type === "token")).toBe(true);

    const sources = events[0];
    if (sources.type !== "sources") throw new Error("expected sources event");
    expect(sources.citations.length).toBeGreaterThan(0);
    expect(sources.citations[0].marker).toBe(1);
    expect(sources.citations[0].snippet.length).toBeGreaterThan(0);
  });

  it("passes retrieved context to the language model", async () => {
    // The fake client echoes a citation marker only if context reached it.
    const seen: string[] = [];
    const client = new FakeLlmClient((messages) => {
      seen.push(messages.find((m) => m.role === "system")?.content ?? "");
      return "grounded answer [1]";
    });
    const p = new RagPipeline(retriever, client, retrieval);
    await collect(p.answer("protein for recovery"));
    expect(seen[0]).toContain("Sources:");
    expect(seen[0]).toContain("[1]");
  });

  it("errors on an empty question", async () => {
    const events = await collect(pipeline.answer("   "));
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
  });
});
