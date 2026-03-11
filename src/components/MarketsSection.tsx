'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Upload, Lightbulb } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';
import MarketCard from './MarketCard';
import { CATEGORIES, Category } from '@/lib/data';

export default function MarketsSection() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const contracts = getAddresses(chainId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<'volume' | 'recent' | 'hot'>('volume');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'crypto',
    durationDays: '7',
    marketType: '0',       // 0=MANUAL, 1=ORACLE
    tokenPair: '0',        // 0=AVAX_USD, 1=BTC_USD, 2=ETH_USD, 3=LINK_USD
    targetPrice: '',
    targetAbove: 'true',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const { data: marketCount, refetch: refetchCount } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'marketCount',
  }) as { data: bigint | undefined; refetch: () => void };

  const count = Number(marketCount ?? 0n);
  const marketIds = Array.from({ length: count }, (_, i) => i + 1);

  const { writeContract, data: txHash, isPending: isCreating } = useWriteContract();
  const { isSuccess: createDone } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (createDone) {
      refetchCount();
      setCreateSuccess(true);
      setForm({ title: '', category: 'crypto', durationDays: '7', marketType: '0', tokenPair: '0', targetPrice: '', targetAbove: 'true' });
      setImagePreview(null);
      setTimeout(() => { setCreateSuccess(false); setShowCreate(false); }, 2500);
    }
  }, [createDone]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSuggest = () => {
    setCreateError('');
    if (!isConnected) { setCreateError('Cüzdanını bağla.'); return; }
    if (!form.title.trim()) { setCreateError('Market sorusu gerekli.'); return; }
    const days = parseInt(form.durationDays);
    if (!days || days < 1) { setCreateError('Süre en az 1 gün olmalı.'); return; }

    const isOracle = form.marketType === '1';
    if (isOracle && !form.targetPrice) { setCreateError('Oracle market için hedef fiyat gerekli.'); return; }

    // suggestMarket(question, category, durationDays, marketType, tokenPair, targetPrice, targetAbove)
    writeContract({
      address: contracts.PredictionMarket,
      abi: MARKET_ABI,
      functionName: 'suggestMarket',
      args: [
        form.title,
        form.category,
        BigInt(days),
        Number(form.marketType),                               // MarketType enum
        Number(form.tokenPair),                                // TokenPair enum
        isOracle ? BigInt(Math.round(parseFloat(form.targetPrice) * 1e8)) : BigInt(0),
        form.targetAbove === 'true',
      ],
    });
  };

  const TOKEN_PAIR_LABELS = ['AVAX/USD', 'BTC/USD', 'ETH/USD', 'LINK/USD'];

  return (
    <section style={{ padding: '40px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Live Markets</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em', lineHeight: 1 }}>Predict the Future</h2>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#E84142', border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, boxShadow: '0 0 20px rgba(232,65,66,0.3)' }}>
          <Lightbulb size={16} /> Suggest Market
        </button>
      </div>

      {/* Suggest Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: 24 }}>
          <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 32, width: '100%', maxWidth: 540, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, padding: '6px 10px', color: '#E84142', cursor: 'pointer' }}><X size={16} /></button>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0', marginBottom: 6 }}>Suggest a Market</h3>
            <p style={{ color: '#8888AA', fontSize: 13, marginBottom: 24, fontFamily: 'var(--font-mono)' }}>Öneriniz admin tarafından incelenerek yayınlanır.</p>

            {createSuccess ? (
              <div style={{ padding: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                ✓ Önerin gönderildi! Admin onayından sonra yayına girecek.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Image upload */}
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Görsel (opsiyonel)</label>
                  <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #1E1E2E', borderRadius: 12, padding: 20, textAlign: 'center', cursor: 'pointer', background: '#0A0A0F' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,65,66,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}>
                    {imagePreview ? (
                      <div style={{ position: 'relative' }}>
                        <img src={imagePreview} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                        <button onClick={e => { e.stopPropagation(); setImagePreview(null); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6, padding: '4px 6px', color: 'white', cursor: 'pointer' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <div>
                        <Upload size={24} color="#555570" style={{ margin: '0 auto 8px' }} />
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570' }}>Görsel yükle</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </div>

                {/* Market question */}
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Market Sorusu</label>
                  <input type="text" placeholder="Örn: Will BTC hit $100k by Dec 2025?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Category + Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Kategori</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }}>
                      {['crypto', 'avax', 'politics', 'sports', 'tech'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Süre (gün)</label>
                    <input type="number" min="1" max="365" placeholder="7" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Market Type */}
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Market Tipi</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ v: '0', label: '👤 Manual', desc: 'Admin resolve eder' }, { v: '1', label: '🔗 Oracle', desc: 'Chainlink otomatik' }].map(opt => (
                      <button key={opt.v} onClick={() => setForm(f => ({ ...f, marketType: opt.v }))} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', background: form.marketType === opt.v ? 'rgba(232,65,66,0.12)' : '#0A0A0F', border: `1px solid ${form.marketType === opt.v ? 'rgba(232,65,66,0.4)' : '#1E1E2E'}`, color: form.marketType === opt.v ? '#E84142' : '#8888AA', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>
                        <div>{opt.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, color: '#555570' }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Oracle fields */}
                {form.marketType === '1' && (
                  <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#3B82F6', margin: 0 }}>🔗 Chainlink fiyat feed'i kullanır — otomatik resolve edilir</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Token Pair</label>
                        <select value={form.tokenPair} onChange={e => setForm(f => ({ ...f, tokenPair: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8, color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none' }}>
                          {TOKEN_PAIR_LABELS.map((l, i) => <option key={i} value={String(i)}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Hedef Fiyat ($)</label>
                        <input type="number" placeholder="Örn: 100000" value={form.targetPrice} onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 8, color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>YES koşulu</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[{ v: 'true', label: `≥ $${form.targetPrice || '?'} ise YES` }, { v: 'false', label: `≤ $${form.targetPrice || '?'} ise YES` }].map(opt => (
                          <button key={opt.v} onClick={() => setForm(f => ({ ...f, targetAbove: opt.v }))} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: form.targetAbove === opt.v ? 'rgba(34,197,94,0.12)' : '#0A0A0F', border: `1px solid ${form.targetAbove === opt.v ? 'rgba(34,197,94,0.3)' : '#1E1E2E'}`, color: form.targetAbove === opt.v ? '#22c55e' : '#555570', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {createError && <div style={{ padding: '10px 14px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.3)', borderRadius: 8, color: '#E84142', fontSize: 13, fontFamily: 'var(--font-mono)' }}>⚠ {createError}</div>}

                <button onClick={handleSuggest} disabled={isCreating} style={{ width: '100%', padding: '13px 0', background: '#E84142', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, cursor: isCreating ? 'wait' : 'pointer', opacity: isCreating ? 0.7 : 1, boxShadow: '0 0 20px rgba(232,65,66,0.3)' }}>
                  {isCreating ? '⏳ Cüzdan onayı bekleniyor...' : !isConnected ? '⚠ Cüzdan Bağla' : '💡 Öneriyi Gönder'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 10, padding: '10px 16px', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={15} color="#8888AA" />
          <input type="text" placeholder="Market ara..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'none', border: 'none', outline: 'none', color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, textTransform: 'capitalize', background: category === cat ? '#E84142' : '#12121A', color: category === cat ? 'white' : '#8888AA', transition: 'all 0.2s' }}>{cat}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['volume', 'hot', 'recent'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${sortBy === s ? 'rgba(232,65,66,0.4)' : '#1E1E2E'}`, fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'capitalize', background: sortBy === s ? 'rgba(232,65,66,0.1)' : 'transparent', color: sortBy === s ? '#E84142' : '#8888AA' }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {marketIds.map(id => <MarketCard key={id} marketId={id} />)}
      </div>
      {count === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#8888AA' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>Henüz market yok.</p>
          <p style={{ fontSize: 14 }}>İlk öneriyi gönder!</p>
        </div>
      )}
    </section>
  );
}
