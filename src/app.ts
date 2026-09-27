import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import type { RagPipeline } from "./rag/pipeline.js";
import type { ChatMessage } from "./types.js";

export interface AppOptions {
  pipeline: RagPipeline;
  /** Number of indexed chunks, surfaced on the health endpoint. */
  chunkCount: number;
  /** Built frontend directory; served as static files when it exists. */
  webDistDir?: string;
}

interface ChatBody {
  message: string;
  history?: ChatMessage[];
}

const chatBodySchema = {
  type: "object",
  required: ["message"],
  properties: {
    message: { type: "string", minLength: 1, maxLength: 2000 },
    history: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        required: ["role", "content"],
        properties: {
          role: { type: "string", enum: ["user", "assistant"] },
          content: { type: "string", maxLength: 4000 },
        },
      },
    },
  },
} as const;

/**
 * Build the Fastify application around an already-constructed RAG pipeline.
 * Keeping construction separate from wiring makes the routes trivial to test
 * with a fake pipeline and no network.
 */
export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get("/api/health", async () => ({
    status: "ok",
    chunks: options.chunkCount,
  }));

  app.post<{ Body: ChatBody }>(
    "/api/chat",
    { schema: { body: chatBodySchema } },
    async (request, reply) => {
      const { message, history = [] } = request.body;

      reply.header("content-type", "application/x-ndjson; charset=utf-8");
      reply.header("cache-control", "no-cache");

      // Serialise each pipeline event as a line of NDJSON. Returning a Readable
      // lets Fastify handle streaming and backpressure for us.
      const events = options.pipeline.answer(message, history);
      const lines = (async function* () {
        for await (const event of events) {
          yield `${JSON.stringify(event)}\n`;
        }
      })();
      return Readable.from(lines);
    },
  );

  // Serve the built frontend when it is present (production / after build:web).
  if (options.webDistDir) {
    const dir = resolve(options.webDistDir);
    if (existsSync(dir)) {
      app.register(fastifyStatic, { root: dir });
    }
  }

  return app;
}
