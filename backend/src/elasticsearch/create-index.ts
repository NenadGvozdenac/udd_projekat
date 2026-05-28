import { esClient } from '../config/elasticsearch';
import { logger } from '../utils/logger';

const INDEX = 'forensic_reports';

const indexConfig = {
  settings: {
    analysis: {
      analyzer: {
        serbian_custom: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'serbian_stop'],
        },
      },
      filter: {
        serbian_stop: {
          type: 'stop',
          stopwords: [
            'и', 'у', 'је', 'да', 'не', 'на', 'се', 'са', 'за', 'су',
            'али', 'или', 'би', 'па', 'те', 'ni', 'the', 'a', 'an',
            'овај', 'тај', 'овде', 'где', 'које', 'који', 'која',
          ],
        },
      },
    },
  },
  mappings: {
    properties: {
      forensic_analyst_name: {
        type: 'text',
        analyzer: 'serbian_custom',
        fields: { keyword: { type: 'keyword' } },
      },
      organization_name: {
        type: 'text',
        analyzer: 'serbian_custom',
        fields: { keyword: { type: 'keyword' } },
      },
      malware_name: {
        type: 'text',
        analyzer: 'serbian_custom',
        fields: { keyword: { type: 'keyword' } },
      },
      malware_description: { type: 'text', analyzer: 'serbian_custom' },
      threat_classification: { type: 'keyword' },
      sample_hash: { type: 'keyword' },
      pdf_content: { type: 'text', analyzer: 'serbian_custom' },
      pdf_content_vector: {
        type: 'dense_vector',
        dims: 384,
        index: true,
        similarity: 'cosine',
      },
      location: { type: 'geo_point' },
      city: { type: 'keyword' },
      minio_object_key: { type: 'keyword' },
      indexed_at: { type: 'date' },
    },
  },
};

export async function createIndex() {
  const exists = await esClient.indices.exists({ index: INDEX });

  if (exists) {
    logger.info(`Index "${INDEX}" already exists — skipping creation.`);
    return;
  }

  await esClient.indices.create({
    index: INDEX,
    ...indexConfig,
  });

  logger.info(`Index "${INDEX}" created successfully.`);
}

// Allow running directly: ts-node src/elasticsearch/create-index.ts
if (require.main === module) {
  createIndex().catch((err) => {
    logger.error('Failed to create index', { error: err.message });
    process.exit(1);
  });
}
