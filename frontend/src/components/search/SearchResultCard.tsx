import type { SearchHit } from '../../types';

const BADGE_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export default function SearchResultCard({ hit }: { hit: SearchHit }) {
  const s = hit.source as unknown as Record<string, string>;
  const classification = s['threat_classification'] || '';
  const badgeClass = BADGE_COLORS[classification] || 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-900">{s['malware_name'] || 'Unknown Malware'}</p>
          <p className="text-sm text-gray-500">{s['organization_name']} — {s['forensic_analyst_name']}</p>
        </div>
        {classification && (
          <span className={`text-xs px-2 py-1 rounded font-medium ${badgeClass}`}>
            {classification}
          </span>
        )}
      </div>

      {hit.highlights && Object.entries(hit.highlights).map(([field, fragments]) => (
        <div key={field} className="mt-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{field.replace(/_/g, ' ')}</p>
          {fragments.map((frag, i) => (
            <p
              key={i}
              className="text-sm text-gray-700 bg-yellow-50 rounded px-2 py-1"
              dangerouslySetInnerHTML={{ __html: frag }}
            />
          ))}
        </div>
      ))}

      {s['sample_hash'] && (
        <p className="text-xs text-gray-400 mt-2 font-mono truncate">Hash: {s['sample_hash']}</p>
      )}
    </div>
  );
}
