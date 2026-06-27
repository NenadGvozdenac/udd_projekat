import { useState } from 'react';
import type { SearchHit } from '../../types';

const BADGE_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export default function SearchResultCard({ hit }: { hit: SearchHit }) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  const s = hit.source as unknown as Record<string, string>;
  const classification = s['threat_classification'] || '';
  const badgeClass = BADGE_COLORS[classification] || 'bg-gray-100 text-gray-800';
  const minioObjectKey = s['minio_object_key'];
  const malwareName = s['malware_name'] || 'document';

  const handleDownload = async () => {
    if (!minioObjectKey) return;
    
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/documents/download/${encodeURIComponent(minioObjectKey)}`);
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${malwareName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative min-h-24"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{malwareName === 'Unknown Malware' ? malwareName : malwareName}</p>
          <p className="text-sm text-gray-500">{s['organization_name']} — {s['forensic_analyst_name']}</p>
        </div>
        {classification && (
          <span className={`text-xs px-2 py-1 rounded font-medium ${badgeClass} ml-2`}>
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

      {minioObjectKey && (
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="absolute bottom-4 right-4 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm rounded transition-colors flex items-center gap-1"
          title="Download PDF"
        >
          {isDownloading ? 'Downloading' : 'Download'}
        </button>
      )}
    </div>
  );
}
