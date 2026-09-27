import { describe, expect, it } from "vitest";
import { loadKnowledgeBase } from "../src/rag/documents.js";

describe("loadKnowledgeBase", () => {
  it("loads the bundled knowledge base with parsed front matter", async () => {
    const docs = await loadKnowledgeBase("data/knowledge_base");
    expect(docs.length).toBeGreaterThan(5);

    for (const doc of docs) {
      expect(doc.id.length).toBeGreaterThan(0);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.source.length).toBeGreaterThan(0);
      expect(doc.content.length).toBeGreaterThan(0);
    }

    const protein = docs.find((d) => d.id === "protein-and-muscle-recovery");
    expect(protein?.title).toBe("Protein and Muscle Recovery");
    expect(protein?.tags).toContain("protein");
  });
});
