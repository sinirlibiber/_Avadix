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
  filterStatus?: 'active' | 'resolved' | 'all';
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

export default function MarketCard({ marketId, filterCategory, filterSearch, filterStatus = 'active', sortBy, onVolumeReady }: Props) {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);
  const [imgError, setImgError] = useState(false);

  const { data: core } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMarketCore',
    args: [BigInt(marketId)],
    query: { refetchInterval: 15_000 },
  }) as { data: any };

  const { data: meta } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMarketMeta',
    args: [BigInt(marketId)],
    query: { refetchInterval: 15_000 },
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
  if (filterStatus === 'active' && market.resolved) return null;
  if (filterStatus === 'resolved' && !market.resolved) return null;

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
    <div
      style={{
        background: '#111111', border: '1px solid #1C1C1C',
        borderRadius: 14, overflow: 'hidden', transition: 'all 0.25s',
        display: 'flex', flexDirection: 'column', cursor: 'pointer', height: '100%',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(255,255,255,0.1)';
        el.style.background = '#141414';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#1C1C1C';
        el.style.background = '#111111';
      }}
    >
      {/* ── Üst kısım: Görsel + Badges (tıklanabilir → market detay) ── */}
      <Link href={`/markets/${marketId}`} style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', gap: 12, padding: '14px 14px 0' }}>
          {/* Kare görsel */}
          <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#0A0A0A', border: '1px solid #1C1C1C' }}>
            {hasImage ? (
              <img src={imageURI} alt="" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${catColor}15, rgba(59,130,246,0.08))` }}>
                <span style={{ fontSize: 20, opacity: 0.5 }}>
                  {cat === 'crypto' ? '🔮' : cat === 'sports' ? '⚽' : cat === 'politics' ? '🗳️' : cat === 'tech' ? '💻' : '📊'}
                </span>
              </div>
            )}
          </div>

          {/* Soru + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#FAFAFA', lineHeight: 1.4, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
              {market.question}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 6px', borderRadius: 8, textTransform: 'uppercase', background: `${catColor}20`, color: catColor }}>{cat}</span>
              {isOracle && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 5px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>⚡Oracle</span>}
              {market.resolved && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 6px', borderRadius: 8, background: market.outcome === 1 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: market.outcome === 1 ? '#22c55e' : '#ef4444' }}>{market.outcome === 1 ? '✓YES' : '✓NO'}</span>}
            </div>
          </div>
        </div>
      </Link>

      {/* ── Alt kısım: YES/NO butonları + volume ── */}
      <div style={{ padding: '10px 14px 14px', marginTop: 'auto' }}>
        {/* Volume + Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444' }}>
            <TrendingUp size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />{totalPoolF} AVAX
          </span>
          {!market.resolved && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444' }}>
              <Clock size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />{daysLeft}d
            </span>
          )}
        </div>

        {/* YES / NO butonları */}
        <div style={{ display: 'flex', gap: 6 }}>
          <Link href={`/markets/${marketId}`} style={{ flex: 1, textDecoration: 'none' }}>
            <div style={{
              padding: '8px 0', borderRadius: 8, textAlign: 'center',
              background: market.resolved && market.outcome === 1 ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.06)',
              border: `1px solid ${market.resolved && market.outcome === 1 ? 'rgba(34,197,94,0.4)' : 'rgba(34,197,94,0.12)'}`,
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = market.resolved && market.outcome === 1 ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.06)'; }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#22c55e' }}>{yesPercent}¢</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#22c55e', opacity: 0.6, marginLeft: 4 }}>YES</span>
            </div>
          </Link>
          <Link href={`/markets/${marketId}`} style={{ flex: 1, textDecoration: 'none' }}>
            <div style={{
              padding: '8px 0', borderRadius: 8, textAlign: 'center',
              background: market.resolved && market.outcome === 2 ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${market.resolved && market.outcome === 2 ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.12)'}`,
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = market.resolved && market.outcome === 2 ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.06)'; }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#ef4444' }}>{noPercent}¢</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#ef4444', opacity: 0.6, marginLeft: 4 }}>NO</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
