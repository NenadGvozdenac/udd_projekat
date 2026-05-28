import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { basicSearch, booleanSearch, fulltextSearch, geoSearch } from '../api/search';
import SearchResultCard from '../components/search/SearchResultCard';
import type { SearchResult, BasicSearchParams } from '../types';

type SearchMode = 'basic' | 'boolean' | 'fulltext' | 'geo';

export default function SearchPage() {
  const [mode, setMode] = useState<SearchMode>('basic');
  const [params, setParams] = useState<BasicSearchParams>({});
  const [boolQuery, setBoolQuery] = useState('');
  const [fulltextQ, setFulltextQ] = useState('');
  const [geoCity, setGeoCity] = useState('');
  const [geoDistance, setGeoDistance] = useState('50km');

  // Snapshot of inputs at the moment Search is clicked
  const [searchKey, setSearchKey] = useState<object | null>(null);

  const { data, isFetching, error } = useQuery<SearchResult>({
    queryKey: ['search', searchKey],
    queryFn: async () => {
      if (mode === 'basic') return basicSearch(params);
      if (mode === 'boolean') return booleanSearch({ query: boolQuery });
      if (mode === 'fulltext') return fulltextSearch(fulltextQ);
      return geoSearch(geoCity, normalizeDistance(geoDistance));
    },
    enabled: searchKey !== null,
  });

  function handleSearch() {
    // Freeze current values as query key so typing doesn't re-trigger
    setSearchKey({ mode, params, boolQuery, fulltextQ, geoCity, geoDistance, ts: Date.now() });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Search Reports</h1>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-4">
        {(['basic', 'boolean', 'fulltext', 'geo'] as SearchMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSearchKey(null); }}
            className={`px-3 py-1 rounded capitalize text-sm ${mode === m ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Forms */}
      {mode === 'basic' && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Analyst', key: 'analyst' as const },
            { label: 'Hash', key: 'hash' as const },
            { label: 'Classification', key: 'classification' as const },
            { label: 'Organization', key: 'organization' as const },
            { label: 'Malware', key: 'malware' as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium">{label}</label>
              <input
                className="border rounded px-2 py-1 w-full"
                onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value || undefined }))}
              />
            </div>
          ))}
        </div>
      )}

      {mode === 'boolean' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Boolean Query (AND, OR, NOT, "phrase")</label>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder='e.g. "ransomware" AND NOT low'
            value={boolQuery}
            onChange={(e) => setBoolQuery(e.target.value)}
          />
        </div>
      )}

      {mode === 'fulltext' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Full-text search</label>
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Search in PDF content..."
            value={fulltextQ}
            onChange={(e) => setFulltextQ(e.target.value)}
          />
        </div>
      )}

      {mode === 'geo' && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium">City / Address</label>
            <input
              className="border rounded px-2 py-1 w-full"
              placeholder="e.g. Novi Sad"
              value={geoCity}
              onChange={(e) => setGeoCity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Radius</label>
            <input
              className="border rounded px-2 py-1 w-full"
              placeholder="e.g. 50km"
              value={geoDistance}
              onChange={(e) => setGeoDistance(e.target.value)}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleSearch}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Search
      </button>

      {/* Results */}
      <div className="mt-6 space-y-4">
        {isFetching && <p className="text-gray-500">Searching…</p>}
        {error && <p className="text-red-500">Error occurred during search</p>}
        {data && (
          <>
            <p className="text-sm text-gray-500">Found {data.total} result(s)</p>
            {data.hits.map((hit) => (
              <SearchResultCard key={hit.id} hit={hit} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** Normalize distance: "50" → "50km", "50k" → "50km", "50km" → "50km" */
function normalizeDistance(input: string): string {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return `${trimmed}km`;
  if (/^\d+k$/i.test(trimmed)) return `${trimmed}m`;
  return trimmed || '50km';
}
