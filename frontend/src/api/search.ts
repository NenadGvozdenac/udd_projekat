import api from './client';
import type { SearchResult, BasicSearchParams, BooleanSearchParams } from '../types';

export async function basicSearch(params: BasicSearchParams): Promise<SearchResult> {
  const { data } = await api.get('/search/basic', { params });
  return data;
}

export async function fulltextSearch(q: string, page = 1, size = 10): Promise<SearchResult> {
  const { data } = await api.get('/search/fulltext', { params: { q, page, size } });
  return data;
}

export async function knnSearch(queryVector: number[], k = 10): Promise<SearchResult> {
  const { data } = await api.post('/search/knn', { queryVector, k });
  return data;
}

export async function booleanSearch(params: BooleanSearchParams): Promise<SearchResult> {
  const { data } = await api.post('/search/boolean', params);
  return data;
}

export async function geoSearch(city: string, distance: string, page = 1, size = 10): Promise<SearchResult> {
  const { data } = await api.get('/search/geo', { params: { city, distance, page, size } });
  return data;
}
