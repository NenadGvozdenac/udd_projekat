import api from './client';
import type { ParsedReport } from '../types';

export async function uploadPdf(file: File): Promise<{ objectKey: string; parsed: ParsedReport }> {
  const formData = new FormData();
  formData.append('pdf', file);
  const { data } = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function indexDocument(payload: ParsedReport & { objectKey: string }) {
  const { data } = await api.post('/documents/index', payload);
  return data;
}

export async function cancelIndexing(objectKey: string) {
  await api.delete(`/documents/cancel/${encodeURIComponent(objectKey)}`);
}
