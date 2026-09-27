import "dotenv/config";

/**
 * Runtime configuration, resolved once from environment variables.
 *
 * Every value has a sensible default that works fully offline against a local
 * Ollama server, so the app runs with no API keys. Hosted providers (Groq,
 * Gemini, OpenAI, ...) are opt-in purely through these variables.
 */
export interface Config {
  host: string;
  port: number;
  /** Directory of Markdown knowledge-base documents. */
  knowledgeBaseDir: string;
  /** Where the built embedding index is written and read from. */
  indexPath: string;
  /** Directory Vite builds the frontend into. */
  webDistDir: string;
  embeddingModel: string;
  llm: LlmConfig;
  retrieval: RetrievalConfig;
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface RetrievalConfig {
  /** Target chunk size in characters when splitting documents. */
  chunkSize: number;
  chunkOverlap: number;
  /** Candidates pulled from each retriever before fusion. */
  candidatesPerRetriever: number;
  /** Chunks handed to the language model as grounding context. */
  topK: number;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function floatFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(): Config {
  return {
    host: process.env.HOST ?? "127.0.0.1",
    port: intFromEnv("PORT", 8080),
    knowledgeBaseDir: process.env.KNOWLEDGE_BASE_DIR ?? "data/knowledge_base",
    indexPath: process.env.INDEX_PATH ?? "data/index.json",
    webDistDir: process.env.WEB_DIST_DIR ?? "web/dist",
    embeddingModel: process.env.EMBEDDING_MODEL ?? "Xenova/all-MiniLM-L6-v2",
    llm: {
      // Defaults target Ollama's OpenAI-compatible endpoint.
      baseUrl: process.env.LLM_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: process.env.LLM_API_KEY ?? "ollama",
      model: process.env.LLM_MODEL ?? "qwen2.5:1.5b",
      temperature: floatFromEnv("LLM_TEMPERATURE", 0.3),
      maxTokens: intFromEnv("LLM_MAX_TOKENS", 600),
    },
    retrieval: {
      chunkSize: intFromEnv("CHUNK_SIZE", 700),
      chunkOverlap: intFromEnv("CHUNK_OVERLAP", 120),
      candidatesPerRetriever: intFromEnv("RETRIEVAL_CANDIDATES", 8),
      topK: intFromEnv("RETRIEVAL_TOP_K", 4),
    },
  };
}
