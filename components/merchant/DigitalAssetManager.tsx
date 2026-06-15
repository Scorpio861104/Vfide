'use client';

/**
 * DigitalAssetManager (Commerce Operations Phase 1B — merchant authoring UI)
 *
 * The merchant-facing screen for a digital product's delivery: register the file (URL/type/size), set the
 * download limit, expiry window, and whether a license key is required, and paste a license-key pool. Calls
 * the existing /api/merchant/digital route (GET assets, POST register). Closes the Phase 1B Grandmother gate —
 * a non-technical software seller can set up automated delivery from a screen.
 *
 * (Per-delivery revoke/reissue and pool top-ups are driven by /api/merchant/digital/manage; this component
 * covers asset setup, the piece a seller needs before any sale.)
 */

import { useCallback, useEffect, useState } from 'react';
import { X, Plus, Loader2, FileDown, KeyRound } from 'lucide-react';

interface DigitalAsset {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size_bytes: number | null;
  download_limit: number | null;
  expires_hours: number | null;
  requires_license: boolean;
  license_key_pool: string[] | null;
}

export function DigitalAssetManager({ productId, onClose }: { productId: number; onClose: () => void }) {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const [downloadLimit, setDownloadLimit] = useState('');
  const [expiresHours, setExpiresHours] = useState('');
  const [requiresLicense, setRequiresLicense] = useState(false);
  const [licenseKeys, setLicenseKeys] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/merchant/digital?asset_id=${productId}`);
      if (!res.ok) throw new Error('Failed to load digital assets');
      const data = await res.json();
      setAssets(Array.isArray(data.assets) ? data.assets : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  const register = async () => {
    if (!fileName.trim() || !fileUrl.trim()) { setError('File name and file URL are required'); return; }
    setBusy(true); setError(null);
    try {
      const keyPool = licenseKeys.split('\n').map((k) => k.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        product_id: productId,
        file_name: fileName.trim(),
        file_url: fileUrl.trim(),
      };
      if (fileType.trim()) body.file_type = fileType.trim();
      if (downloadLimit.trim() !== '') body.download_limit = Number(downloadLimit);
      if (expiresHours.trim() !== '') body.expires_hours = Number(expiresHours);
      if (keyPool.length > 0) body.license_key_pool = keyPool;
      // requires_license is sent only when keys are present (a required product needs a pool to draw from).
      if (requiresLicense) body.requires_license = true;

      const res = await fetch('/api/merchant/digital', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to register asset');
      setFileName(''); setFileUrl(''); setFileType(''); setDownloadLimit(''); setExpiresHours('');
      setRequiresLicense(false); setLicenseKeys('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to register asset');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-zinc-950">
          <div className="flex items-center gap-2"><FileDown size={18} className="text-accent" /><h2 className="font-semibold">Digital Delivery</h2></div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-500">
            Register the file buyers receive. On a confirmed payment, VFIDE issues each buyer a unique download
            link automatically. Leave download limit / expiry blank for unlimited / never. If you sell license
            keys, paste one per line and tick &ldquo;requires a license key&rdquo; so a sale is never fulfilled
            without one.
          </p>

          {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</div>}

          {/* Existing assets */}
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
          ) : assets.length === 0 ? (
            <div className="text-sm text-zinc-500">No digital file registered yet. Add one below.</div>
          ) : (
            <div className="space-y-2">
              {assets.map((a) => (
                <div key={a.id} className="bg-white/3 border border-white/5 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{a.file_name}</span>
                    <span className="text-xs text-zinc-500">{a.file_type ?? 'file'}</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 space-x-3">
                    <span>{a.download_limit !== null ? `${a.download_limit} downloads` : 'unlimited downloads'}</span>
                    <span>{a.expires_hours !== null ? `expires ${a.expires_hours}h` : 'never expires'}</span>
                    {a.requires_license && (
                      <span className="inline-flex items-center gap-1 text-accent"><KeyRound size={11} /> {(a.license_key_pool?.length ?? 0)} keys left</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Register new asset */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="text-xs font-semibold text-zinc-400">Register a file</div>
            <div className="grid grid-cols-2 gap-3">
              <input value={fileName} onChange={(e) => setFileName(e.target.value)} className={input} placeholder="File name (e.g. App-v2.zip)" />
              <input value={fileType} onChange={(e) => setFileType(e.target.value)} className={input} placeholder="Type (e.g. application/zip)" />
            </div>
            <input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className={input} placeholder="File URL / storage path (signed URL recommended)" />
            <div className="grid grid-cols-2 gap-3">
              <input value={downloadLimit} type="number" min={1} onChange={(e) => setDownloadLimit(e.target.value)} className={input} placeholder="Download limit (blank = unlimited)" />
              <input value={expiresHours} type="number" min={1} onChange={(e) => setExpiresHours(e.target.value)} className={input} placeholder="Expires in hours (blank = never)" />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={requiresLicense} onChange={(e) => setRequiresLicense(e.target.checked)} className="accent-current" />
              <KeyRound size={14} className="text-accent" /> This product requires a license key
            </label>
            <textarea value={licenseKeys} onChange={(e) => setLicenseKeys(e.target.value)} rows={3} className={`${input} font-mono`} placeholder="License keys — one per line (optional)" />
            <button disabled={busy} onClick={register} className="w-full px-4 py-2.5 bg-gradient-to-r from-accent to-blue-500 rounded-lg font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Register file
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
