/**
 * EmbedCodeGenerator — Merchants get embed code for their website
 * 
 * Usage on merchant dashboard:
 *   <EmbedCodeGenerator slug="kofi-fabrics" merchantName="Kofi's Fabrics" />
 */
'use client';

import { useState } from 'react';
import { Copy, Check, Code, Monitor, Smartphone } from 'lucide-react';

interface EmbedCodeGeneratorProps {
  slug: string;
  merchantName: string;
}

export function EmbedCodeGenerator({ slug, merchantName }: EmbedCodeGeneratorProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [columns, setColumns] = useState(2);
  const [maxProducts, setMaxProducts] = useState(8);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vfide.io';
  const embedUrl = `${baseUrl}/embed/${slug}?theme=${theme}&cols=${columns}&max=${maxProducts}`;

  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border-radius: 12px; border: 1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'};" title="${merchantName} — VFIDE Store"></iframe>`;

  const scriptCode = `<div id="vfide-store" data-slug="${slug}" data-theme="${theme}" data-cols="${columns}" data-max="${maxProducts}"></div>\n<script src="${baseUrl}/embed/widget.js" async></script>`;

  const [codeType, setCodeType] = useState<'iframe' | 'script'>('iframe');
  const displayCode = codeType === 'iframe' ? iframeCode : scriptCode;

  const copyCode = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Embed Your Store</h3>
        <p className="text-gray-400 text-sm">Add your VFIDE store to any website. Customers can browse and buy without leaving the page.</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Theme</label>
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            <button onClick={() => setTheme('dark')} className={`flex-1 py-2 text-xs font-bold ${theme === 'dark' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>Dark</button>
            <button onClick={() => setTheme('light')} className={`flex-1 py-2 text-xs font-bold ${theme === 'light' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>Light</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Columns</label>
          <select value={columns} onChange={e => setColumns(parseInt(e.target.value))}
            className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Max Products</label>
          <select value={maxProducts} onChange={e => setMaxProducts(parseInt(e.target.value))}
            className="w-full py-2 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
            <option value={4}>4</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={20}>20</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Embed Type</label>
          <div className="flex border border-white/10 rounded-lg overflow-hidden">
            <button onClick={() => setCodeType('iframe')} className={`flex-1 py-2 text-xs font-bold ${codeType === 'iframe' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>iframe</button>
            <button onClick={() => setCodeType('script')} className={`flex-1 py-2 text-xs font-bold ${codeType === 'script' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>Script</button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="text-xs text-gray-500 block mb-2">Preview</label>
        <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-200 bg-white'}`}
          style={{ height: '300px' }}>
          <iframe src={embedUrl} width="100%" height="100%" frameBorder="0" title="Preview" />
        </div>
      </div>

      {/* Code */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-500">Embed Code</label>
          <button onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-bold hover:bg-cyan-500/30 transition-colors">
            {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
        <pre className="p-4 bg-black/50 border border-white/10 rounded-xl text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all font-mono">
          {displayCode}
        </pre>
      </div>
    </div>
  );
}
