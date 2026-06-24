import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { minioClient, MINIO_BUCKET, ensureBucketExists } from '../config/minio';
import { esClient } from '../config/elasticsearch';
import { parsePdf } from '../services/pdf-parser.service';
import { geocodeCity } from '../services/geocoding.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export async function uploadAndParse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file provided' });
      return;
    }

    await ensureBucketExists();

    const objectKey = `${uuidv4()}.pdf`;
    await minioClient.putObject(MINIO_BUCKET, objectKey, req.file.buffer, req.file.size, {
      'Content-Type': 'application/pdf',
    });

    const parsed = await parsePdf(req.file.buffer);

    logger.info(`PDF uploaded and parsed: ${objectKey}`);
    res.json({ objectKey, parsed });
  } catch (err) {
    next(err);
  }
}

export async function indexDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      objectKey,
      forensicAnalystName,
      organizationName,
      malwareName,
      malwareDescription,
      threatClassification,
      sampleHash,
      pdfContent,
      city,
      location,
    } = req.body;

    if (!objectKey) {
      res.status(400).json({ error: 'objectKey is required' });
      return;
    }

    // Geocode city → lat/lon if not already provided
    let resolvedLocation = location ?? null;
    if (!resolvedLocation && city) {
      resolvedLocation = await geocodeCity(city);
      if (resolvedLocation) {
        logger.info(`Geocoded "${city}" → ${resolvedLocation.lat}, ${resolvedLocation.lon}`);
      }
    }

    const doc = {
      forensic_analyst_name: forensicAnalystName,
      organization_name: organizationName,
      malware_name: malwareName,
      malware_description: malwareDescription,
      threat_classification: threatClassification,
      sample_hash: sampleHash,
      pdf_content: pdfContent,
      city: city || null,
      location: resolvedLocation,
      minio_object_key: objectKey,
      indexed_at: new Date().toISOString(),
    };

    const result = await esClient.index({
      index: 'forensic_reports',
      document: doc,
    });

    // Structured audit event — picked up by Logstash → Kibana
    logger.info('document_indexed', {
      event: 'document_indexed',
      document_id: result._id,
      forensic_analyst_name: forensicAnalystName || null,
      organization_name: organizationName || null,
      malware_name: malwareName || null,
      threat_classification: threatClassification || null,
      city: city || null,
    });

    res.status(201).json({ id: result._id });
  } catch (err) {
    next(err);
  }
}

export async function cancelIndexing(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { objectKey } = req.params;

    await minioClient.removeObject(MINIO_BUCKET, decodeURIComponent(objectKey));

    logger.info(`Cancelled indexing, removed object: ${objectKey}`);
    res.json({ message: 'Cancelled' });
  } catch (err) {
    next(err);
  }
}
