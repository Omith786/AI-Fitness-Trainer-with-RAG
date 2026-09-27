/**
 * Text embedding behind a small interface so the pipeline can be unit-tested
 * with a deterministic fake, while production uses a real sentence-transformer.
 */
export interface Embedder {
  readonly model: string;
  /** Embed a batch of texts into unit-normalised vectors. */
  embed(texts: string[]): Promise<number[][]>;
}

type FeatureExtractionPipeline = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

/**
 * Embedder backed by Transformers.js. The model (ONNX) is downloaded once and
 * cached locally, then runs on CPU in-process, so no Python or GPU is required.
 */
export class TransformersEmbedder implements Embedder {
  readonly model: string;
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

  constructor(model = "Xenova/all-MiniLM-L6-v2") {
    this.model = model;
  }

  private async getPipeline(): Promise<FeatureExtractionPipeline> {
    if (this.pipelinePromise === null) {
      // Imported lazily: this pulls in the heavy runtime only when embeddings
      // are actually needed, keeping start-up and tests light.
      this.pipelinePromise = import("@huggingface/transformers").then(({ pipeline }) =>
        pipeline("feature-extraction", this.model),
      ) as Promise<FeatureExtractionPipeline>;
    }
    return this.pipelinePromise;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extractor = await this.getPipeline();
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    return output.tolist();
  }
}

/** Cosine similarity of two equal-length vectors (unit vectors reduce to a dot product). */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
