import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
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
];

function parseNdjson(payload: string): ChatEvent[] {
  return payload
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as ChatEvent);
}

describe("HTTP API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const embedder = new HashingEmbedder();
    const vectors = await embedder.embed(rawChunks.map((c) => `${c.title}\n${c.text}`));
    const indexed: IndexedChunk[] = rawChunks.map((chunk, i) => ({ ...chunk, embedding: vectors[i] }));
    const retriever = new HybridRetriever(indexed, embedder);
    const pipeline = new RagPipeline(retriever, new FakeLlmClient(), {
      chunkSize: 700,
      chunkOverlap: 100,
      candidatesPerRetriever: 5,
      topK: 2,
    });
    app = buildApp({ pipeline, chunkCount: indexed.length });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports health with the chunk count", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", chunks: 1 });
  });

  it("streams NDJSON chat events for a valid question", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: { message: "how much protein should I eat?" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/x-ndjson");

    const events = parseNdjson(res.payload);
    expect(events[0].type).toBe("sources");
    expect(events.at(-1)?.type).toBe("done");
    expect(events.some((e) => e.type === "token")).toBe(true);
  });

  it("rejects an empty message with a validation error", async () => {
    const res = await app.inject({ method: "POST", url: "/api/chat", payload: { message: "" } });
    expect(res.statusCode).toBe(400);
  });
});
