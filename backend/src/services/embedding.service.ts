import { env } from 'process';

// Lazy load transformers to avoid blocking startup
let pipeline: any = null;
let initPromise: Promise<any> | null = null;

/**
 * Generate embedding vector from text using sentence-transformers via transformers.js
 * Returns a 384-dimensional dense vector normalized with cosine similarity
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Initialize pipeline on first use (singleton pattern)
    if (!pipeline && !initPromise) {
      initPromise = initPipeline();
    }
    
    if (initPromise) {
      pipeline = await initPromise;
    }

    if (!pipeline) {
      throw new Error('Failed to initialize embedding pipeline');
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
    console.error('Embedding generation error:', err);
    // Return a small random vector instead of zeros to avoid ES cosine similarity error
    // This is a fallback to prevent indexing failures
    return generateRandomVector(384);
  }
}

async function initPipeline() {
  try {
    console.log('Initializing embedding model...');
    
    // Set environment variables for transformers.js
    process.env.TRANSFORMERS_CACHE = '/tmp/transformers-cache';
    
    const { pipeline: transformersPipeline } = await import('@xenova/transformers');
    
    const pipe = await transformersPipeline('feature-extraction', {
      model: 'Xenova/all-MiniLM-L6-v2', // 384-dim model matching index config
      quantized: true, // Use quantized version for speed
      progress_callback: (data: any) => {
        if (data.status === 'progress') {
          console.log(`Model loading: ${Math.round(data.progress * 100)}%`);
        }
      },
    });
    
    console.log('Embedding model initialized successfully');
    return pipe;
  } catch (err) {
    console.error('Failed to initialize embedding pipeline:', err);
    throw err;
  }
}

/**
 * Generate a small random vector to avoid Elasticsearch cosine similarity errors
 * with zero vectors. This is a fallback only - real embeddings should be used.
 */
function generateRandomVector(dim: number): number[] {
  const vector = new Array(dim);
  for (let i = 0; i < dim; i++) {
    // Small random values to ensure non-zero magnitude
    vector[i] = (Math.random() - 0.5) * 0.01;
  }
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  for (let i = 0; i < dim; i++) {
    vector[i] = vector[i] / (magnitude || 1);
  }
  
  return vector;
}
