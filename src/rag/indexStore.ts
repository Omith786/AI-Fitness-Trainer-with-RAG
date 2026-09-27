import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { IndexFile } from "../types.js";

/** Persist a built index as pretty-printed JSON, creating parent dirs as needed. */
export async function writeIndex(path: string, index: IndexFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(index, null, 2), "utf8");
}

/** Load and lightly validate an index file from disk. */
export async function readIndex(path: string): Promise<IndexFile> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(
      `No index found at "${path}". Run "npm run build:index" to build the knowledge base first.`,
    );
  }
  const parsed = JSON.parse(raw) as IndexFile;
  if (!Array.isArray(parsed.chunks) || typeof parsed.dimension !== "number") {
    throw new Error(`Index at "${path}" is malformed. Rebuild it with "npm run build:index".`);
  }
  return parsed;
}
