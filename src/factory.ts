import type { Config } from "./config.js";
import { OpenAICompatibleClient, type LlmClient } from "./llm/client.js";
import { TransformersEmbedder } from "./rag/embedder.js";
import { readIndex } from "./rag/indexStore.js";
import { RagPipeline } from "./rag/pipeline.js";
import { HybridRetriever } from "./rag/retriever.js";

export interface BuiltPipeline {
  pipeline: RagPipeline;
  chunkCount: number;
}

/**
 * Wire a production RAG pipeline from config: load the persisted index, build a
 * hybrid retriever over it, and connect the configured language model. The LLM
 * client can be overridden (used nowhere in production, handy for local demos).
 */
export async function buildPipeline(config: Config, llm?: LlmClient): Promise<BuiltPipeline> {
  const index = await readIndex(config.indexPath);
  const embedder = new TransformersEmbedder(index.embeddingModel);
  const retriever = new HybridRetriever(index.chunks, embedder);
  const client = llm ?? new OpenAICompatibleClient(config.llm);
  const pipeline = new RagPipeline(retriever, client, config.retrieval);
  return { pipeline, chunkCount: index.chunks.length };
}
