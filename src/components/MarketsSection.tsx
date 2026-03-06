'use client';

import { useState } from 'react';
import { Search, Plus, X, ChevronDown } from 'lucide-react';
import { MARKETS, CATEGORIES, Category, Market } from '@/lib/data';
import MarketCard from './MarketCard';
import { useAccount } from 'wagmi';

const EMPTY_MARKET: Omit<Market, 'id' | 'resolved' | 'volume' | 'liquidity'> = {
  title: '',
  description: '',
  category: 'crypto',
  yesPrice: 0.5,
  noPrice: 0.5,
  endDate: '',
};

export default function MarketsSection() {
  const { isConnected, address } = useAccount();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<'volume' | 'recent' | 'hot'>('volume');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_MARKET });
  const [userMarkets, setUserMarkets] = useState<Market[]>([]);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const allMarkets = [...MARKETS, ...userMarkets];

  const filtered = allMarkets
    .filter(m => {
      const matchCat = category === 'all' || m.category === category;
      const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'volume') return b.volume - a.volume;
      if (sortBy === 'hot') return (b.trending ? 1 : 0) - (a.trending ? 1 : 0);
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });

  const handleCreate = () => {
    setCreateError('');
    if (!isConnected) { setCreateError('Connect your wallet to create a market.'); return; }
    if (!form.title.trim()) { setCreateError('Market title is required.'); return; }
    if (!form.description.trim()) { setCreateError('Description is required.'); return; }
    if (!form.endDate) { setCreateError('End date is required.'); return; }
    if (new Date(form.endDate) <= new Date()) { setCreateError('End date must be in the future.'); return; }

    const newMarket: Market = {
      ...form,
      id: `user-${Date.now()}`,
      volume: 0,
      liquidity: 0,
      resolved: false,
      trending: false,
      creator: `${address?.slice(0, 6)}...${address?.slice(-4)}`,
    };
    setUserMarkets(prev => [newMarket, ...prev]);
    setCreateSuccess(true);
    setForm({ ...EMPTY_MARKET });
    setTimeout(() => { setCreateSuccess(false); setShowCreate(false); }, 2000);
  };

  return (
    <section id="markets" style={{ padding: '80px 24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Live Markets</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Predict the Future
          </h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 22px', background: '#E84142', border: 'none',
            borderRadius: 10, color: 'white', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
            boxShadow: '0 0 20px rgba(232,65,66,0.3)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 30px rgba(232,65,66,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(232,65,66,0.3)')}
        >
          <Plus size={16} /> Create Market
        </button>
      </div>

      {/* Create Market Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)', padding: 24,
        }}>
          <div style={{
            background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20,
            padding: 32, width: '100%', maxWidth: 520, position: 'relative',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <button onClick={() => setShowCreate(false)} style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)',
              borderRadius: 8, padding: '6px 10px', color: '#E84142', cursor: 'pointer',
            }}><X size={16} /></button>

            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0', marginBottom: 6 }}>
              Create Market
            </h3>
            <p style={{ color: '#8888AA', fontSize: 14, marginBottom: 24 }}>
              Define a binary YES/NO prediction market for any real-world event.
            </p>

            {createSuccess ? (
              <div style={{ padding: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                ✓ Market created successfully!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Market Question', key: 'title', placeholder: 'e.g. Will BTC hit $100k by Dec 2025?', type: 'text' },
                  { label: 'Description', key: 'description', placeholder: 'Describe the resolution criteria...', type: 'textarea' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{label}</label>
                    {type === 'textarea' ? (
                      <textarea placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={3} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    ) : (
                      <input type="text" placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }}>
                      {['crypto', 'avax', 'politics', 'sports', 'tech'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>End Date</label>
                    <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', colorScheme: 'dark' }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Starting YES Probability: {Math.round(form.yesPrice * 100)}%</label>
                  <input type="range" min="10" max="90" value={Math.round(form.yesPrice * 100)} onChange={e => { const v = parseInt(e.target.value) / 100; setForm(f => ({ ...f, yesPrice: v, noPrice: 1 - v })); }} style={{ width: '100%', accentColor: '#E84142' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e' }}>YES {Math.round(form.yesPrice * 100)}¢</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142' }}>NO {Math.round(form.noPrice * 100)}¢</span>
                  </div>
                </div>

                {createError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.3)', borderRadius: 8, color: '#E84142', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                    ⚠ {createError}
                  </div>
                )}

                <button onClick={handleCreate} style={{
                  width: '100%', padding: '13px 0', background: '#E84142',
                  border: 'none', borderRadius: 10, color: 'white',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
                  cursor: 'pointer', boxShadow: '0 0 20px rgba(232,65,66,0.3)', transition: 'all 0.2s',
                }}>
                  {!isConnected ? '⚠ Connect Wallet to Create' : '+ Publish Market'}
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
          <input type="text" placeholder="Search markets..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'none', border: 'none', outline: 'none', color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, textTransform: 'capitalize',
              background: category === cat ? '#E84142' : '#12121A', color: category === cat ? 'white' : '#8888AA',
              boxShadow: category === cat ? '0 0 15px rgba(232,65,66,0.35)' : 'none', transition: 'all 0.2s',
            }}>{cat}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['volume', 'hot', 'recent'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{
              padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${sortBy === s ? 'rgba(232,65,66,0.4)' : '#1E1E2E'}`,
              fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'capitalize',
              background: sortBy === s ? 'rgba(232,65,66,0.1)' : 'transparent',
              color: sortBy === s ? '#E84142' : '#8888AA', transition: 'all 0.2s',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map(market => <MarketCard key={market.id} market={market} />)}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8888AA' }}>No markets found.</div>
      )}
    </section>
  );
}
