import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import matter from "gray-matter";
import type { KnowledgeDoc } from "../types.js";

/**
 * Load every Markdown document in a directory into structured knowledge docs.
 *
 * Each file may carry YAML front matter with `title`, `source` and `tags`.
 * Anything missing falls back to a value derived from the file name, so the
 * loader is forgiving of hand-written notes.
 */
export async function loadKnowledgeBase(dir: string): Promise<KnowledgeDoc[]> {
  const entries = await readdir(dir);
  const markdown = entries.filter((name) => name.endsWith(".md")).sort();

  const docs: KnowledgeDoc[] = [];
  for (const name of markdown) {
    const raw = await readFile(join(dir, name), "utf8");
    const { data, content } = matter(raw);
    const id = basename(name, ".md");
    const body = content.trim();
    if (body.length === 0) continue;

    docs.push({
      id,
      title: typeof data.title === "string" ? data.title : titleFromId(id),
      source: typeof data.source === "string" ? data.source : "Curated fitness knowledge base",
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      content: body,
    });
  }
  return docs;
}

function titleFromId(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
