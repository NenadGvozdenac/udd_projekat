import { env } from 'process';

// Lazy load transformers to avoid blocking startup
let pipeline: any = null;

/**
 * Generate embedding vector from text using sentence-transformers
 * Returns a 384-dimensional dense vector normalized with cosine similarity
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Lazy initialization on first use
    if (!pipeline) {
      const { pipeline: transformersPipeline } = await import('@xenova/transformers');
      pipeline = await transformersPipeline('feature-extraction', {
        model: 'Xenova/all-MiniLM-L6-v2', // 384-dim model matching index config
        quantized: true, // Use quantized version for speed
      });
    }

    // Truncate text to avoid memory issues (max 512 tokens ~2000 chars)
    const truncated = text.substring(0, 2000);

    // Generate embedding
    const result = await pipeline(truncated, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert to regular array and ensure correct dimensions
    const vector = Array.from(result.data as Float32Array);
    
    if (vector.length !== 384) {
      throw new Error(`Expected 384-dimensional vector, got ${vector.length}`);
    }

    return vector;
  } catch (err) {
    // If embedding fails, return zero vector as fallback
    console.warn('Embedding generation failed:', err);
    return new Array(384).fill(0);
  }
}
