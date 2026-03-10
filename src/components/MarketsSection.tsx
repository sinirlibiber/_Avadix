'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Upload, Lightbulb } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';
import MarketCard from './MarketCard';
import { CATEGORIES, Category } from '@/lib/data';

// ─── Token pair config ────────────────────────────────────────────────────────
const TOKEN_PAIRS = [
  { label: 'AVAX / USD', value: 0, symbol: 'AVAX', placeholder: '30' },
  { label: 'BTC / USD',  value: 1, symbol: 'BTC',  placeholder: '100000' },
  { label: 'ETH / USD',  value: 2, symbol: 'ETH',  placeholder: '4000' },
  { label: 'LINK / USD', value: 3, symbol: 'LINK', placeholder: '20' },
];

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: '#0A0A0F', border: '1px solid #1E1E2E',
  borderRadius: 10, color: '#E2E2F0',
  fontFamily: 'var(--font-body)', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
};
const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 12,
  color: '#8888AA', textTransform: 'uppercase',
  display: 'block', marginBottom: 8,
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MarketsSection() {
  const { isConnected } = useAccount();
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);
  const fileRef   = useRef<HTMLInputElement>(null);

  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sortBy,   setSortBy]   = useState<'volume' | 'recent' | 'hot'>('volume');
  const [showSuggest, setShowSuggest] = useState(false);

  // Form state
  const [marketType,   setMarketType]   = useState<'MANUAL' | 'ORACLE'>('MANUAL');
  const [question,     setQuestion]     = useState('');
  const [cat,          setCat]          = useState('crypto');
  const [durationDays, setDurationDays] = useState('7');
  const [tokenPair,    setTokenPair]    = useState(0);   // 0=AVAX, 1=BTC, 2=ETH, 3=LINK
  const [targetPrice,  setTargetPrice]  = useState('');
  const [targetAbove,  setTargetAbove]  = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError,    setFormError]    = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Contract reads
  const { data: marketCount, refetch: refetchCount } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'marketCount',
  }) as { data: bigint | undefined; refetch: () => void };

  const count     = Number(marketCount ?? 0n);
  const marketIds = Array.from({ length: count }, (_, i) => i + 1);

  // suggestMarket write
  const { writeContract, data: txHash, isPending: isSending } = useWriteContract();
  const { isSuccess: txDone } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txDone) {
      setSubmitSuccess(true);
      resetForm();
      setTimeout(() => { setSubmitSuccess(false); setShowSuggest(false); }, 3000);
    }
  }, [txDone]);

  const resetForm = () => {
    setQuestion(''); setCat('crypto'); setDurationDays('7');
    setTokenPair(0); setTargetPrice(''); setTargetAbove(true);
    setImagePreview(null); setFormError('');
    setMarketType('MANUAL');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSuggest = () => {
    setFormError('');
    if (!isConnected) { setFormError('Connect your wallet to submit a suggestion.'); return; }
    if (!question.trim()) { setFormError('Market question is required.'); return; }
    const days = parseInt(durationDays);
    if (!days || days < 1 || days > 365) { setFormError('Duration must be between 1 and 365 days.'); return; }

    // Oracle-specific validation
    if (marketType === 'ORACLE') {
      const price = parseFloat(targetPrice);
      if (!price || price <= 0) { setFormError('Enter a valid target price.'); return; }
    }

    // targetPrice → int256 with 8 decimals (Chainlink format)
    const targetPriceScaled = marketType === 'ORACLE'
      ? BigInt(Math.round(parseFloat(targetPrice) * 1e8))
      : 0n;

    writeContract({
      address: contracts.PredictionMarket,
      abi: MARKET_ABI,
      functionName: 'suggestMarket',
      args: [
        question,
        cat,
        BigInt(days),
        marketType === 'ORACLE' ? 1 : 0,   // MarketType enum
        tokenPair,                           // TokenPair enum
        targetPriceScaled,
        targetAbove,
      ],
    });
  };

  return (
    <section style={{ padding: '40px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Live Markets</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em', lineHeight: 1 }}>Predict the Future</h2>
        </div>
        {/* Suggest Market button */}
        <button
          onClick={() => setShowSuggest(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#E84142', border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, boxShadow: '0 0 20px rgba(232,65,66,0.3)' }}>
          <Lightbulb size={16} /> Suggest Market
        </button>
      </div>

      {/* ── Suggest Market Modal ─────────────────────────────────────────────── */}
      {showSuggest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: 24 }}>
          <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 32, width: '100%', maxWidth: 540, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>

            <button onClick={() => { setShowSuggest(false); resetForm(); }} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, padding: '6px 10px', color: '#E84142', cursor: 'pointer' }}>
              <X size={16} />
            </button>

            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0', marginBottom: 4 }}>
              💡 Suggest a Market
            </h3>
            <p style={{ color: '#8888AA', fontSize: 13, marginBottom: 24, fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
              Submit your market idea. The Avadix team reviews all suggestions and publishes approved markets on-chain.
            </p>

            {submitSuccess ? (
              <div style={{ padding: 24, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                ✓ Suggestion submitted on-chain!<br />
                <span style={{ fontSize: 13, fontWeight: 400, color: '#16a34a', marginTop: 6, display: 'block' }}>The team will review your suggestion shortly.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Market Type Toggle */}
                <div>
                  <label style={LABEL_STYLE}>Market Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { value: 'MANUAL', label: '✍️ Manual', desc: 'Resolved by admin' },
                      { value: 'ORACLE', label: '⛓️ Oracle', desc: 'Auto-resolved by Chainlink' },
                    ].map(({ value, label, desc }) => (
                      <button key={value} onClick={() => setMarketType(value as any)} style={{
                        padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                        border: `2px solid ${marketType === value ? '#E84142' : '#1E1E2E'}`,
                        background: marketType === value ? 'rgba(232,65,66,0.08)' : '#0A0A0F',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: marketType === value ? '#E84142' : '#E2E2F0' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginTop: 3 }}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image upload */}
                <div>
                  <label style={LABEL_STYLE}>Market Image (optional)</label>
                  <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #1E1E2E', borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#0A0A0F', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,65,66,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}>
                    {imagePreview ? (
                      <div style={{ position: 'relative' }}>
                        <img src={imagePreview} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                        <button onClick={e => { e.stopPropagation(); setImagePreview(null); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6, padding: '4px 6px', color: 'white', cursor: 'pointer' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <div>
                        <Upload size={20} color="#555570" style={{ margin: '0 auto 6px' }} />
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570' }}>Click to upload</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </div>

                {/* Question */}
                <div>
                  <label style={LABEL_STYLE}>Market Question</label>
                  <input
                    type="text"
                    placeholder={marketType === 'ORACLE' ? 'e.g. Will AVAX reach $50 by June 2026?' : 'e.g. Will Ethereum ETF launch in Q3 2026?'}
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    style={INPUT_STYLE}
                  />
                </div>

                {/* Category + Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={LABEL_STYLE}>Category</label>
                    <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...INPUT_STYLE }}>
                      {['crypto', 'avax', 'politics', 'sports', 'tech'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LABEL_STYLE}>Duration (days)</label>
                    <input type="number" min="1" max="365" placeholder="7" value={durationDays} onChange={e => setDurationDays(e.target.value)} style={INPUT_STYLE} />
                  </div>
                </div>

                {/* Oracle fields */}
                {marketType === 'ORACLE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: 'rgba(232,65,66,0.04)', border: '1px solid rgba(232,65,66,0.15)', borderRadius: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#E84142', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      ⛓️ Chainlink Oracle Settings
                    </div>

                    {/* Token Pair */}
                    <div>
                      <label style={LABEL_STYLE}>Token Pair</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {TOKEN_PAIRS.map(tp => (
                          <button key={tp.value} onClick={() => setTokenPair(tp.value)} style={{
                            padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                            border: `1px solid ${tokenPair === tp.value ? '#E84142' : '#1E1E2E'}`,
                            background: tokenPair === tp.value ? 'rgba(232,65,66,0.1)' : '#0A0A0F',
                            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                            color: tokenPair === tp.value ? '#E84142' : '#8888AA',
                            transition: 'all 0.2s',
                          }}>
                            {tp.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Target price */}
                    <div>
                      <label style={LABEL_STYLE}>Target Price (USD)</label>
                      <input
                        type="number"
                        placeholder={`e.g. ${TOKEN_PAIRS[tokenPair].placeholder}`}
                        value={targetPrice}
                        onChange={e => setTargetPrice(e.target.value)}
                        style={INPUT_STYLE}
                      />
                    </div>

                    {/* Above / Below */}
                    <div>
                      <label style={LABEL_STYLE}>Condition</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { value: true,  label: '📈 YES if price ≥ target' },
                          { value: false, label: '📉 YES if price ≤ target' },
                        ].map(({ value, label }) => (
                          <button key={String(value)} onClick={() => setTargetAbove(value)} style={{
                            padding: '10px', borderRadius: 8, cursor: 'pointer',
                            border: `1px solid ${targetAbove === value ? '#E84142' : '#1E1E2E'}`,
                            background: targetAbove === value ? 'rgba(232,65,66,0.08)' : '#0A0A0F',
                            fontFamily: 'var(--font-mono)', fontSize: 12,
                            color: targetAbove === value ? '#E84142' : '#8888AA',
                            transition: 'all 0.2s',
                          }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    {targetPrice && (
                      <div style={{ padding: '10px 14px', background: '#0A0A0F', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e' }}>
                        ✓ Market auto-resolves: YES if {TOKEN_PAIRS[tokenPair].symbol} {targetAbove ? '≥' : '≤'} ${parseFloat(targetPrice).toLocaleString()} at deadline
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {formError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.3)', borderRadius: 8, color: '#E84142', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                    ⚠ {formError}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSuggest}
                  disabled={isSending}
                  style={{ width: '100%', padding: '13px 0', background: '#E84142', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, cursor: isSending ? 'wait' : 'pointer', opacity: isSending ? 0.7 : 1, boxShadow: '0 0 20px rgba(232,65,66,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {isSending ? '⏳ Awaiting wallet approval...' : !isConnected ? '⚠ Connect Wallet to Submit' : '💡 Submit Suggestion On-Chain'}
                </button>

                <p style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>
                  Suggestions are reviewed by the Avadix team before going live
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 10, padding: '10px 16px', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={15} color="#8888AA" />
          <input type="text" placeholder="Search markets..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'none', border: 'none', outline: 'none', color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, textTransform: 'capitalize', background: category === c ? '#E84142' : '#12121A', color: category === c ? 'white' : '#8888AA', transition: 'all 0.2s' }}>{c}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['volume', 'hot', 'recent'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${sortBy === s ? 'rgba(232,65,66,0.4)' : '#1E1E2E'}`, fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'capitalize', background: sortBy === s ? 'rgba(232,65,66,0.1)' : 'transparent', color: sortBy === s ? '#E84142' : '#8888AA' }}>{s}</button>
          ))}
        </div>
      </div>

      {/* ── Market Grid ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {marketIds.map(id => <MarketCard key={id} marketId={id} />)}
      </div>

      {count === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#8888AA' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No markets yet.</p>
          <p style={{ fontSize: 14 }}>Be the first to suggest one!</p>
        </div>
      )}
    </section>
  );
}
