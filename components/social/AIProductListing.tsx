/**
 * AIProductListing — Point camera at product, get instant listing
 *
 * Take a photo of your product. AI generates:
 *   - Product name
 *   - Description
 *   - Suggested price (based on similar items)
 *   - Category
 *   - Tags for discovery
 *
 * The merchant reviews, edits, and publishes. Zero typing required.
 * Uses Anthropic API for vision analysis.
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Sparkles, Check, Edit3, RefreshCw, ShoppingCart, Tag, X } from 'lucide-react';

interface GeneratedListing {
  name: string;
  description: string;
  suggestedPrice: number;
  currency: string;
  category: string;
  tags: string[];
}

interface AIProductListingProps {
  onPublish: (listing: GeneratedListing & { imageBlob: Blob }) => void;
  onClose?: () => void;
}

export function AIProductListing({ onPublish, onClose }: AIProductListingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [listing, setListing] = useState<GeneratedListing | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {}
  }, []);

  const capture = useCallback(async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.85));
    setImageBlob(blob);
    setImageUrl(URL.createObjectURL(blob));
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
    generateListing(blob);
  }, []);

  const generateListing = async (blob: Blob) => {
    setGenerating(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(((reader.result as string | null) ?? '').split(',')[1] ?? '');
        reader.readAsDataURL(blob);
      });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
              { type: 'text', text: 'You are a product listing assistant for a marketplace serving market sellers in West Africa. Analyze this product photo and return ONLY a JSON object with: name (string), description (1-2 sentences), suggestedPrice (number in USD), currency (string, "$"), category (string), tags (array of 3-5 discovery tags). No markdown, no backticks, just JSON.' }
            ]
          }],
        }),
      });

      const data = await response.json();
      const text = data.content?.find((c: any) => c.type === 'text')?.text || '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      setListing(parsed);
    } catch {
      setListing({ name: 'Product', description: 'A great product from the market', suggestedPrice: 10, currency: '$', category: 'General', tags: ['market', 'handmade'] });
    } finally { setGenerating(false); }
  };

  const retake = () => {
    setImageBlob(null); setImageUrl(null); setListing(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h2 className="text-white font-bold text-sm flex items-center gap-2"><Sparkles size={16} className="text-amber-400" />AI Product Listing</h2>
        {onClose && <button onClick={onClose} className="text-gray-500"><X size={18} /></button>}
      </div>

      {!imageUrl ? (
        /* Camera */
        <div className="flex-1 relative">
          {cameraActive ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <button onClick={capture} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white" />
                </button>
              </div>
              <p className="absolute top-4 left-0 right-0 text-center text-white text-sm">Point at your product</p>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full">
              <button onClick={startCamera} className="flex flex-col items-center gap-3 p-8">
                <div className="w-20 h-20 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center"><Camera size={32} className="text-cyan-400" /></div>
                <span className="text-white font-bold">Take Product Photo</span>
                <span className="text-gray-500 text-xs">AI will generate the listing for you</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Review & edit */
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <Image src={imageUrl} alt="Product" className="w-full aspect-square rounded-xl object-cover"  width={48} height={48} />

            {generating ? (
              <div className="flex items-center justify-center gap-3 py-8">
                <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                <span className="text-cyan-400 text-sm">AI is analyzing your product...</span>
              </div>
            ) : listing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Product Name</label>
                  {editing ? (
                    <input value={listing.name} onChange={e =>  setListing({ ...listing, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm mt-1 focus:outline-none focus:border-cyan-500/50" />
                  ) : <p className="text-white font-bold">{listing.name}</p>}
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Description</label>
                  {editing ? (
                    <textarea value={listing.description} onChange={e =>  setListing({ ...listing, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm mt-1 h-16 resize-none focus:outline-none focus:border-cyan-500/50" />
                  ) : <p className="text-gray-300 text-sm">{listing.description}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">Price</label>
                    {editing ? (
                      <input value={listing.suggestedPrice} onChange={e =>  setListing({ ...listing, suggestedPrice: parseFloat(e.target.value) || 0 })} type="number"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm mt-1 focus:outline-none focus:border-cyan-500/50" />
                    ) : <p className="text-cyan-400 font-mono font-bold">{listing.currency}{listing.suggestedPrice}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">Category</label>
                    <p className="text-white text-sm">{listing.category}</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Tags</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {listing.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-gray-400 text-xs flex items-center gap-0.5"><Tag size={8} />{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={retake} className="flex-1 py-3 flex items-center justify-center gap-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm font-bold"><RefreshCw size={14} />Retake</button>
                  <button onClick={() => setEditing(!editing)} className="py-3 px-4 flex items-center justify-center gap-1.5 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-sm font-bold"><Edit3 size={14} />{editing ? 'Done' : 'Edit'}</button>
                  <button onClick={() => { if (imageBlob && listing) onPublish({ ...listing, imageBlob }); }}
                    className="flex-1 py-3 flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl text-sm font-bold"><Check size={14} />Publish</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
