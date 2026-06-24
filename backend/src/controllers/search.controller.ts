import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { esClient } from '../config/elasticsearch';
import { parseBooleanQuery } from '../services/boolean-query.service';
import { geocodeCity } from '../services/geocoding.service';

const INDEX = 'forensic_reports';
const HIGHLIGHT_FIELDS = {
  forensic_analyst_name: {},
  organization_name: {},
  malware_name: {},
  malware_description: {},
  pdf_content: { number_of_fragments: 3 },
};

export async function basicSearch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { analyst, hash, classification, organization, malware, page = '1', size = '10' } = req.query;

    const must: object[] = [];

    if (analyst) must.push({ match: { forensic_analyst_name: analyst } });
    if (hash) must.push({ term: { sample_hash: hash } });
    if (classification) must.push({ term: { threat_classification: classification } });
    if (organization) must.push({ match: { organization_name: organization } });
    if (malware) must.push({ match: { malware_name: malware } });

    const from = (Number(page) - 1) * Number(size);

    const result = await esClient.search({
      index: INDEX,
      from,
      size: Number(size),
      query: must.length > 0 ? { bool: { must } } : { match_all: {} },
      highlight: { fields: HIGHLIGHT_FIELDS },
    });

    res.json(formatResults(result));
  } catch (err) {
    next(err);
  }
}

export async function fulltextSearch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, page = '1', size = '10' } = req.query;

    if (!q) {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }

    const from = (Number(page) - 1) * Number(size);

    const result = await esClient.search({
      index: INDEX,
      from,
      size: Number(size),
      query: { match: { pdf_content: { query: q as string, analyzer: 'serbian_custom' } } },
      highlight: { fields: { pdf_content: { number_of_fragments: 3 } } },
    });

    res.json(formatResults(result));
  } catch (err) {
    next(err);
  }
}

export async function knnSearch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queryVector, k = 10 } = req.body;

    if (!queryVector || !Array.isArray(queryVector)) {
      res.status(400).json({ error: 'queryVector array is required' });
      return;
    }

    const result = await esClient.search({
      index: INDEX,
      knn: {
        field: 'pdf_content_vector',
        query_vector: queryVector,
        k: Number(k),
        num_candidates: 100,
      },
    });

    res.json(formatResults(result));
  } catch (err) {
    next(err);
  }
}

export async function booleanSearch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query, page = 1, size = 10 } = req.body;

    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    const esQuery = parseBooleanQuery(query as string);
    const from = (Number(page) - 1) * Number(size);

    const result = await esClient.search({
      index: INDEX,
      from,
      size: Number(size),
      query: esQuery,
      highlight: { fields: HIGHLIGHT_FIELDS },
    });

    res.json(formatResults(result));
  } catch (err) {
    next(err);
  }
}

export async function geoSearch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { lat, lon, city, distance = '50km', page = '1', size = '10' } = req.query;

    let geoPoint: { lat: number; lon: number } | null = null;

    if (lat && lon) {
      geoPoint = { lat: Number(lat), lon: Number(lon) };
    } else if (city) {
      geoPoint = await geocodeCity(city as string);
      if (!geoPoint) {
        res.status(400).json({ error: `Could not geocode city: "${city}"` });
        return;
      }
    } else {
      res.status(400).json({ error: 'Provide lat+lon or city' });
      return;
    }

    const from = (Number(page) - 1) * Number(size);

    const result = await esClient.search({
      index: INDEX,
      from,
      size: Number(size),
      query: {
        geo_distance: {
          distance: distance as string,
          location: geoPoint,
        },
      },
      highlight: { fields: HIGHLIGHT_FIELDS },
    });

    res.json({ ...formatResults(result), geoPoint });
  } catch (err) {
    next(err);
  }
}

function formatResults(result: Awaited<ReturnType<typeof esClient.search>>) {
  const hits = result.hits.hits.map((hit) => ({
    id: hit._id,
    score: hit._score,
    source: hit._source,
    highlights: hit.highlight,
  }));

  return {
    total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value,
    hits,
  };
}
