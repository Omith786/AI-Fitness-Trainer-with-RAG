import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { buildPipeline } from "./factory.js";

/** Start the HTTP server: load the index, wire the pipeline, serve the app. */
async function main(): Promise<void> {
  const config = loadConfig();
  const { pipeline, chunkCount } = await buildPipeline(config);
  const app = buildApp({ pipeline, chunkCount, webDistDir: config.webDistDir });

  await app.listen({ host: config.host, port: config.port });
  console.log(`AI Fitness Trainer running at http://${config.host}:${config.port}`);
  console.log(`Knowledge base: ${chunkCount} chunks. LLM: ${config.llm.model} via ${config.llm.baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
