import { useState, useRef, FormEvent } from 'react';
import { uploadPdf, indexDocument, cancelIndexing } from '../api/documents';
import type { ParsedReport } from '../types';

type Step = 'upload' | 'review' | 'done';

const CLASSIFICATION_OPTIONS = ['low', 'medium', 'high', 'critical'];

export default function UploadPage() {
  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [objectKey, setObjectKey] = useState('');
  const [fields, setFields] = useState<ParsedReport>({
    forensicAnalystName: '',
    organizationName: '',
    malwareName: '',
    malwareDescription: '',
    threatClassification: '',
    sampleHash: '',
    pdfContent: '',
  });
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    try {
      const result = await uploadPdf(file);
      setObjectKey(result.objectKey);
      setFields(result.parsed);
      setStep('review');
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    setError('');
    try {
      await indexDocument({ ...fields, objectKey });
      setStep('done');
    } catch {
      setError('Indexing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    try {
      await cancelIndexing(objectKey);
    } finally {
      setStep('upload');
      setObjectKey('');
    }
  }

  if (step === 'done') {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <p className="text-green-600 text-lg font-semibold">Document indexed successfully.</p>
        <button className="mt-4 text-blue-600 underline" onClick={() => setStep('upload')}>
          Upload another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload Report</h1>

      {step === 'upload' && (
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">PDF File</label>
            <input ref={fileRef} type="file" accept="application/pdf" required className="mt-1" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Uploading…' : 'Upload & Parse'}
          </button>
        </form>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Review and correct the parsed fields before indexing.</p>

          {([
            { label: 'Forensic Analyst Name', key: 'forensicAnalystName' as const },
            { label: 'Organization (CERT/CSIRT)', key: 'organizationName' as const },
            { label: 'Malware / Threat Name', key: 'malwareName' as const },
            { label: 'Sample Hash (MD5/SHA256)', key: 'sampleHash' as const },
            { label: 'City', key: 'city' as const },
          ] as Array<{ label: string; key: keyof ParsedReport }>).map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium">{label}</label>
              <input
                className="border rounded px-3 py-2 w-full"
                value={(fields[key] as string) || ''}
                onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium">Threat Classification</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={fields.threatClassification}
              onChange={(e) => setFields((f) => ({ ...f, threatClassification: e.target.value }))}
            >
              <option value="">-- select --</option>
              {CLASSIFICATION_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Malware Description</label>
            <textarea
              rows={4}
              className="border rounded px-3 py-2 w-full"
              value={fields.malwareDescription}
              onChange={(e) => setFields((f) => ({ ...f, malwareDescription: e.target.value }))}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Indexing…' : 'Confirm & Index'}
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 text-gray-800 px-6 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
