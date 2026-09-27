import { describe, expect, it } from "vitest";
import { chunkDocument } from "../src/rag/chunk.js";
import type { KnowledgeDoc } from "../src/types.js";

function makeDoc(content: string): KnowledgeDoc {
  return { id: "doc", title: "Doc", source: "test", tags: [], content };
}

describe("chunkDocument", () => {
  it("keeps a short document as a single chunk", () => {
    const chunks = chunkDocument(makeDoc("One short paragraph."), {
      chunkSize: 700,
      chunkOverlap: 100,
    });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("One short paragraph.");
    expect(chunks[0].docId).toBe("doc");
  });

  it("splits long content into multiple chunks", () => {
    const paragraph = "word ".repeat(40).trim();
    const content = Array.from({ length: 6 }, () => paragraph).join("\n\n");
    const chunks = chunkDocument(makeDoc(content), { chunkSize: 300, chunkOverlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeGreaterThan(0);
    }
  });

  it("does not emit a final chunk made only of overlap", () => {
    // Two paragraphs that force one split; the overlap tail must not become a
    // third, near-duplicate chunk.
    const p1 = "alpha ".repeat(30).trim();
    const p2 = "beta ".repeat(30).trim();
    const chunks = chunkDocument(makeDoc(`${p1}\n\n${p2}`), { chunkSize: 200, chunkOverlap: 60 });
    const texts = chunks.map((c) => c.text);
    expect(new Set(texts).size).toBe(texts.length);
    // Every chunk must contain genuine new content, not only carried overlap.
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeGreaterThan(60);
    }
  });

  it("assigns sequential ordinals and stable ids", () => {
    const paragraph = "content ".repeat(40).trim();
    const content = Array.from({ length: 4 }, () => paragraph).join("\n\n");
    const chunks = chunkDocument(makeDoc(content), { chunkSize: 250, chunkOverlap: 40 });
    chunks.forEach((chunk, index) => {
      expect(chunk.ordinal).toBe(index);
      expect(chunk.id).toBe(`doc#${index}`);
    });
  });
});
