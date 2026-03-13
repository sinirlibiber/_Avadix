'use client';

import React from 'react';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Upload, ImageIcon } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';
import MarketCard from './MarketCard';
import { CATEGORIES, Category } from '@/lib/data';

// ─── Resmi canvas ile küçült → base64 ────────────────────────────────────────
function resizeImageToBase64(file: File, maxPx = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale  = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ─── MarketGrid — sıralama burada ────────────────────────────────────────────
function MarketGrid({ marketIds, search, category, sortBy }: {
  marketIds: number[];
  search: string;
  category: Category;
  sortBy: 'volume' | 'recent' | 'hot';
}) {
  // sortBy'a göre marketId listesini sırala
  // recent → en yüksek ID önce, volume & hot → MarketCard içinde pool bilgisi var
  // Bu yüzden sıralamayı MarketCard'dan gelen data ile yapmak yerine
  // basit yaklaşım: recent=ID desc, diğerleri ID asc (MarketCard kendi içinde filtreler)
  const sorted = [...marketIds].sort((a, b) => {
    if (sortBy === 'recent') return b - a;
    return a - b;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
      {sorted.map(id => (
        // @ts-ignore
        <MarketCard
          key={id}
          marketId={id}
          filterCategory={category}
          filterSearch={search}
          sortBy={sortBy}
        />
      ))}
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
export default function MarketsSection() {
  const { isConnected } = useAccount();
  const chainId         = useChainId();
  const contracts       = getAddresses(chainId);
  const fileRef         = useRef<HTMLInputElement>(null);

  const [search,       setSearch]       = useState('');
  const [category,     setCategory]     = useState<Category>('all');
  const [sortBy,       setSortBy]       = useState<'volume' | 'recent' | 'hot'>('recent');
  const [showCreate,   setShowCreate]   = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [createError,  setCreateError]  = useState('');
  const [createSuccess,setCreateSuccess]= useState(false);

  const [form, setForm] = useState({
    title:        '',
    category:     'crypto',
    durationDays: '7',
    marketType:   '0',
    tokenPair:    '0',
    targetPrice:  '',
    targetAbove:  'true',
  });

  const { data: marketCount, refetch: refetchCount } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'marketCount',
  }) as { data: bigint | undefined; refetch: () => void };

  const count     = Number(marketCount ?? 0n);
  const marketIds = Array.from({ length: count }, (_, i) => i + 1);

  const { writeContract, data: txHash, isPending: isCreating } = useWriteContract();
  const { isSuccess: createDone } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (createDone) {
      refetchCount();
      setCreateSuccess(true);
      setForm({ title: '', category: 'crypto', durationDays: '7', marketType: '0', tokenPair: '0', targetPrice: '', targetAbove: 'true' });
      setImagePreview(null);
      setTimeout(() => { setCreateSuccess(false); setShowCreate(false); }, 2800);
    }
  }, [createDone, refetchCount]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const thumb = await resizeImageToBase64(file, 200);
      setImagePreview(thumb);
    } catch {
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    setCreateError('');
    if (!isConnected)        { setCreateError('Connect your wallet first.'); return; }
    if (!form.title.trim())  { setCreateError('Market question is required.'); return; }
    const days = parseInt(form.durationDays);
    if (!days || days < 1 || days > 90) { setCreateError('Duration must be between 1-90 days.'); return; }
    const isOracle = form.marketType === '1';
    if (isOracle && !form.targetPrice) { setCreateError('Target price is required for Oracle markets.'); return; }

    const durationSecs = BigInt(days * 86400);
    const imageURI     = imagePreview ?? '';

    writeContract({
      address: contracts.PredictionMarket,
      abi: MARKET_ABI,
      functionName: 'createMarket',
      args: [
        form.title,
        form.category,
        imageURI,
        durationSecs,
        Number(form.marketType),
        Number(form.tokenPair),
        isOracle ? BigInt(Math.round(parseFloat(form.targetPrice) * 1e8)) : BigInt(0),
        form.targetAbove === 'true',
      ],
    });
  };

  const TOKEN_PAIR_LABELS = ['AVAX/USD', 'BTC/USD', 'ETH/USD', 'LINK/USD'];
  const SORT_OPTIONS: { key: 'volume' | 'recent' | 'hot'; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'volume', label: 'Volume' },
    { key: 'hot',    label: 'Hot' },
  ];

  const catList = CATEGORIES as readonly string[];

  return (
    <section style={{ padding: '100px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 36, color: '#EEF0FF', letterSpacing: '-0.04em', marginBottom: 6 }}>
            Prediction Markets
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#9999CC' }}>
            {count > 0 ? `${count} active market${count !== 1 ? 's' : ''}` : 'No markets yet — create the first one!'}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
            color: 'white', border: 'none', borderRadius: 14,
            padding: '12px 24px', fontFamily: 'var(--font-display)',
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
            transition: 'all 0.25s',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(124,58,237,0.5)'; }}
          onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(124,58,237,0.35)'; }}
        >
          <Plus size={18} /> Create Market
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#55557A' }} />
          <input
            value={search}
            onChange={(e: React.ChangeEvent<any>) => setSearch(e.target.value)}
            placeholder="Search markets..."
            style={{
              width: '100%', background: 'rgba(12,12,26,0.8)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
              padding: '10px 12px 10px 34px', color: '#EEF0FF',
              fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
            }}
          />
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', gap: 4 }}>
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setSortBy(opt.key)} style={{
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
              background: sortBy === opt.key ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.04)',
              color: sortBy === opt.key ? '#A78BFA' : '#9999CC',
              border: sortBy === opt.key ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}>{opt.label}</button>
          ))}
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28 }}>
        {(['all', ...catList] as string[]).map(cat => (
          <button key={cat} onClick={() => setCategory(cat as Category)} style={{
            padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 11,
            textTransform: 'uppercase', letterSpacing: '0.05em',
            background: category === cat
              ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.25))'
              : 'rgba(255,255,255,0.04)',
            color:  category === cat ? '#A78BFA' : '#9999CC',
            border: category === cat ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.06)',
            transition: 'all 0.2s',
          }}>{cat}</button>
        ))}
      </div>

      {/* ── Market grid ── */}
      {count === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#55557A' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔮</div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>No markets yet. Be the first to create one!</p>
        </div>
      ) : (
        <MarketGrid marketIds={marketIds} search={search} category={category} sortBy={sortBy} />
      )}

      {/* ── Create Market Modal ── */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div style={{
            background: '#0C0C1A', border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 24, padding: 32, width: '100%', maxWidth: 520,
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124,58,237,0.1)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#EEF0FF', letterSpacing: '-0.03em' }}>
                  Create Market
                </h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#55557A', marginTop: 2 }}>
                  Your prediction will be submitted on-chain
                </p>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 10, padding: '8px 10px', color: '#9999CC', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {createSuccess ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#A78BFA' }}>
                  Market submitted successfully!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Image upload */}
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9999CC', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    Market Image (optional)
                  </label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(124,58,237,0.3)', borderRadius: 16,
                      cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s',
                      minHeight: 100, position: 'relative',
                      background: imagePreview ? 'transparent' : 'rgba(124,58,237,0.04)',
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLElement>) => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.6)'}
                    onMouseLeave={(e: React.MouseEvent<HTMLElement>) => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.3)'}
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                        <button
                          onClick={e => { e.stopPropagation(); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 8, padding: '4px 8px', color: 'white', cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                        <div style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#55557A' }}>
                          ✓ Image compressed (200px) — ready to submit
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: 24, textAlign: 'center' }}>
                        <ImageIcon size={28} color="#55557A" style={{ margin: '0 auto 8px' }} />
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#55557A' }}>
                          Click or drag to upload
                        </p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#33334A', marginTop: 4 }}>
                          JPG, PNG, GIF — auto-resized to 200px
                        </p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </div>

                {/* Question */}
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9999CC', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                    Market Question *
                  </label>
                  <textarea
                    value={form.title}
                    onChange={(e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Will BTC exceed $200,000 in 2026?"
                    rows={3}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
                      padding: '12px 14px', color: '#EEF0FF',
                      fontFamily: 'var(--font-body)', fontSize: 14,
                      outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>

                {/* Category + Duration row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9999CC', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Category</label>
                    <select
                      value={form.category}
                      onChange={(e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, category: e.target.value }))}
                      style={{ width: '100%', background: '#0F0F20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#EEF0FF', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }}
                    >
                      {catList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9999CC', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Duration (days)</label>
                    <input
                      type="number" min={1} max={90}
                      value={form.durationDays}
                      onChange={(e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, durationDays: e.target.value }))}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#EEF0FF', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }}
                    />
                  </div>
                </div>



                {/* Error */}
                {createError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FCA5A5' }}>
                    {createError}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  style={{
                    width: '100%', background: isCreating ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                    color: 'white', border: 'none', borderRadius: 14,
                    padding: '14px', fontFamily: 'var(--font-display)',
                    fontWeight: 700, fontSize: 16, cursor: isCreating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.25s',
                    boxShadow: isCreating ? 'none' : '0 4px 20px rgba(124,58,237,0.4)',
                  }}
                >
                  {isCreating ? '⏳ Submitting...' : '🚀 Create Market'}
                </button>

                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#33334A', textAlign: 'center' }}>
                  
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
