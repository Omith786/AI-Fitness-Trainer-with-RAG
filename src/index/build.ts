import { loadConfig } from "../config.js";
import { chunkDocuments } from "../rag/chunk.js";
import { loadKnowledgeBase } from "../rag/documents.js";
import { TransformersEmbedder } from "../rag/embedder.js";
import { writeIndex } from "../rag/indexStore.js";
import type { IndexedChunk } from "../types.js";

/**
 * Build the embedding index from the Markdown knowledge base.
 *
 * Run with `npm run build:index`. Embeddings are computed in batches and the
 * whole index is written to a single JSON file that the server loads at start.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  console.log(`Loading knowledge base from ${config.knowledgeBaseDir} ...`);
  const docs = await loadKnowledgeBase(config.knowledgeBaseDir);
  if (docs.length === 0) {
    throw new Error(`No Markdown documents found in ${config.knowledgeBaseDir}.`);
  }

  const chunks = chunkDocuments(docs, {
    chunkSize: config.retrieval.chunkSize,
    chunkOverlap: config.retrieval.chunkOverlap,
  });
  console.log(`Loaded ${docs.length} documents, ${chunks.length} chunks. Embedding ...`);

  const embedder = new TransformersEmbedder(config.embeddingModel);
  const batchSize = 16;
  const embedded: IndexedChunk[] = [];
  for (let start = 0; start < chunks.length; start += batchSize) {
    const batch = chunks.slice(start, start + batchSize);
    const vectors = await embedder.embed(batch.map((chunk) => `${chunk.title}\n${chunk.text}`));
    batch.forEach((chunk, i) => embedded.push({ ...chunk, embedding: vectors[i] }));
    console.log(`  embedded ${Math.min(start + batchSize, chunks.length)}/${chunks.length}`);
  }

  const dimension = embedded[0]?.embedding.length ?? 0;
  await writeIndex(config.indexPath, {
    embeddingModel: config.embeddingModel,
    dimension,
    createdAt: new Date().toISOString(),
    chunks: embedded,
  });
  console.log(`Wrote index with ${embedded.length} chunks (dim ${dimension}) to ${config.indexPath}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
