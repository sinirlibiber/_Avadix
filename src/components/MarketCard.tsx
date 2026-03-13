'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Clock, ArrowRight, Zap, WifiOff, ImageOff } from 'lucide-react';
import Link from 'next/link';
import { useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';

const CATEGORY_COLORS: Record<string, string> = {
  crypto: '#F59E0B', avax: '#FAFAFA', politics: '#8B5CF6',
  sports: '#10B981', tech: '#888888', business: '#666666',
  nba: '#F97316', esports: '#EC4899', culture: '#FAFAFA',
};

const TOKEN_PAIR_META: Record<number, { symbol: string; color: string; coingeckoId: string }> = {
  0: { symbol: 'AVAX', color: '#FAFAFA', coingeckoId: 'avalanche-2' },
  1: { symbol: 'BTC',  color: '#F59E0B', coingeckoId: 'bitcoin' },
  2: { symbol: 'ETH',  color: '#6366F1', coingeckoId: 'ethereum' },
  3: { symbol: 'LINK', color: '#888888', coingeckoId: 'chainlink' },
};

function useCoinGeckoPrice(coingeckoId: string, enabled: boolean) {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const go = async () => {
      try {
        const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
        const json = await res.json();
        if (!cancelled) setPrice(json[coingeckoId]?.usd ?? null);
      } catch { if (!cancelled) setPrice(null); }
    };
    go();
    const t = setInterval(go, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [coingeckoId, enabled]);
  return price;
}

interface Props {
  marketId: number;
  filterCategory?: string;
  filterSearch?: string;
  sortBy?: 'volume' | 'recent' | 'hot';
  onVolumeReady?: (id: number, vol: number, createdAt: number) => void;
}

function LivePriceChip({ tokenPair, targetPrice, targetAbove }: { tokenPair: number; targetPrice: bigint; targetAbove: boolean }) {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);
  const meta      = TOKEN_PAIR_META[tokenPair];

  const { data: chainlinkData, isError } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getCurrentPrice',
    args: [tokenPair],
    query: { refetchInterval: 30_000, retry: 1 },
  }) as { data: [bigint, number] | undefined; isError: boolean };

  const geckoPrice = useCoinGeckoPrice(meta?.coingeckoId ?? '', (!chainlinkData || isError) && !!meta);

  if (!meta) return null;

  let currentPrice: number | null = null;
  let source: 'chainlink' | 'coingecko' | null = null;

  if (chainlinkData && !isError) {
    const [raw, dec] = chainlinkData;
    currentPrice = Number(raw) / 10 ** dec;
    source = 'chainlink';
  } else if (geckoPrice !== null) {
    currentPrice = geckoPrice;
    source = 'coingecko';
  }

  const target  = Number(targetPrice) / 1e8;
  const winning = currentPrice !== null && (targetAbove ? currentPrice >= target : currentPrice <= target);

  if (currentPrice === null) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(85,85,112,0.1)', border: '1px solid #1C1C1C', borderRadius: 10, padding: '8px 12px' }}>
      <WifiOff size={11} color="#555555" />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555555' }}>Price unavailable</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: winning ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.07)', border: `1px solid ${winning ? 'rgba(34,197,94,0.2)' : '#222222'}`, borderRadius: 10, padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: meta.color + '22', border: `1px solid ${meta.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: meta.color, fontWeight: 700 }}>
          {meta.symbol[0]}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555555' }}>{meta.symbol}/USD</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 5px', borderRadius: 4, background: source === 'chainlink' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', color: source === 'chainlink' ? '#888888' : '#F59E0B' }}>
              {source === 'chainlink' ? '⚡ CL' : '🦎 CG'}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#FAFAFA', fontWeight: 700, lineHeight: 1.2 }}>
            ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: currentPrice > 1000 ? 0 : 2 })}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555555' }}>Target: ${target.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: winning ? '#22c55e' : '#FAFAFA' }}>
          {winning ? '✓ YES zone' : `${Math.abs(((currentPrice - target) / target) * 100).toFixed(1)}% away`}
        </div>
      </div>
    </div>
  );
}

export default function MarketCard({ marketId, filterCategory, filterSearch, sortBy, onVolumeReady }: Props) {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);
  const [imgError, setImgError] = useState(false);

  const { data: core } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMarketCore',
    args: [BigInt(marketId)],
  }) as { data: any };

  const { data: meta } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMarketMeta',
    args: [BigInt(marketId)],
  }) as { data: any };

  // core + meta'yı tek objeye birleştir
  const market = (core && meta) ? {
    ...core, ...meta,
    exists: meta.exists,
  } : undefined;

  const { data: probability } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getYesProbability',
    args: [BigInt(marketId)],
  }) as { data: bigint | undefined };

  // Volume & hot sıralama için parent'a bildir
  useEffect(() => {
    if (market?.exists && onVolumeReady) {
      const yesPool  = parseFloat(formatEther(market.yesPool ?? 0n));
      const noPool   = parseFloat(formatEther(market.noPool  ?? 0n));
      const totalVol = yesPool + noPool;
      onVolumeReady(marketId, totalVol, Number(market.endTime ?? 0));
    }
  }, [market?.yesPool?.toString(), market?.noPool?.toString()]);

  if (!market?.exists) return null;

  // Filtreler
  const cat      = market.category?.toLowerCase() ?? '';
  const question = market.question?.toLowerCase()  ?? '';
  if (filterCategory && filterCategory !== 'all' && cat !== filterCategory.toLowerCase()) return null;
  if (filterSearch && filterSearch.trim() && !question.includes(filterSearch.toLowerCase())) return null;

  const isOracle   = market.marketType === 1;
  const yesPercent = Number(probability ?? BigInt(50));
  const noPercent  = 100 - yesPercent;
  const catColor   = CATEGORY_COLORS[cat] || '#FAFAFA';
  const endDate    = new Date(Number(market.endTime) * 1000);
  const daysLeft   = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const totalPool  = (market.yesPool ?? 0n) + (market.noPool ?? 0n);
  const totalPoolF = parseFloat(formatEther(totalPool)).toFixed(3);

  // imageURI: base64 veya boş
  const imageURI: string = market.imageURI ?? '';
  const hasImage = imageURI.length > 0 && !imgError;

  return (
    <Link href={`/markets/${marketId}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#111111', border: '1px solid #1C1C1C',
          borderRadius: 20, overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column', cursor: 'pointer', height: '100%',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = 'rgba(255,255,255,0.12)';
          el.style.transform = 'translateY(-4px)';
          el.style.boxShadow = '0 16px 40px rgba(0,0,0,0.4), 0 0 30px #1C1C1C';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = '#1C1C1C';
          el.style.transform = 'none';
          el.style.boxShadow = 'none';
        }}
      >
        {/* ── Görsel alanı ── */}
        <div style={{ width: '100%', height: 120, position: 'relative', overflow: 'hidden', background: '#0F0F20', flexShrink: 0 }}>
          {hasImage ? (
            <img
              src={imageURI}
              alt=""
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${catColor}15, rgba(59,130,246,0.08))` }}>
              <div style={{ fontSize: 36, opacity: 0.4 }}>
                {cat === 'crypto' ? '🔮' : cat === 'sports' ? '⚽' : cat === 'politics' ? '🗳️' : cat === 'tech' ? '💻' : cat === 'nba' ? '🏀' : cat === 'esports' ? '🎮' : '📊'}
              </div>
            </div>
          )}
          {/* Category overlay badge */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
            padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase',
            background: `${catColor}CC`, color: 'white',
            backdropFilter: 'blur(8px)',
          }}>{cat}</div>
          {/* Oracle badge */}
          {isOracle && (
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(59,130,246,0.85)', borderRadius: 20, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3, backdropFilter: 'blur(8px)' }}>
              <Zap size={9} color="white" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'white' }}>Oracle</span>
            </div>
          )}
          {/* Resolved badge */}
          {market.resolved && (
            <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(34,197,94,0.85)', borderRadius: 20, padding: '3px 10px', backdropFilter: 'blur(8px)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'white' }}>
                {market.outcome === 1 ? '✓ YES' : '✓ NO'}
              </span>
            </div>
          )}
        </div>

        {/* ── İçerik ── */}
        <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {/* Market ID */}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#333333' }}>#{marketId}</span>

          {/* Soru */}
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#FAFAFA', lineHeight: 1.45, flex: 1, margin: 0 }}>
            {market.question}
          </h3>

          {/* Oracle fiyat chip */}
          {isOracle && !market.resolved && (
            <LivePriceChip tokenPair={Number(market.tokenPair)} targetPrice={market.targetPrice} targetAbove={market.targetAbove} />
          )}

          {/* Probability bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#22c55e', fontWeight: 700 }}>{yesPercent}¢ YES</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#FAFAFA', fontWeight: 700 }}>{noPercent}¢ NO</span>
            </div>
            <div style={{ background: '#1C1C1C', borderRadius: 6, height: 6, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${yesPercent}%`, background: 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: '6px 0 0 6px', transition: 'width 0.6s ease' }} />
              <div style={{ flex: 1, background: 'linear-gradient(90deg, #6D28D9, #7C3AED)', borderRadius: '0 6px 6px 0' }} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={11} color="#555555" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888888' }}>{totalPoolF} AVAX</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} color="#555555" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888888' }}>
                {market.resolved ? 'Resolved' : `${daysLeft}d left`}
              </span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              Trade <ArrowRight size={11} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
