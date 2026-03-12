'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Clock, ArrowRight, Zap, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';

const CATEGORY_COLORS: Record<string, string> = {
  crypto: '#F59E0B', avax: '#E84142', politics: '#8B5CF6',
  sports: '#10B981', tech: '#3B82F6',
};

const TOKEN_PAIR_META: Record<number, { symbol: string; color: string; coingeckoId: string }> = {
  0: { symbol: 'AVAX', color: '#E84142', coingeckoId: 'avalanche-2' },
  1: { symbol: 'BTC',  color: '#F59E0B', coingeckoId: 'bitcoin' },
  2: { symbol: 'ETH',  color: '#6366F1', coingeckoId: 'ethereum' },
  3: { symbol: 'LINK', color: '#3B82F6', coingeckoId: 'chainlink' },
};

// ─── CoinGecko fallback hook ──────────────────────────────────────────────────
function useCoinGeckoPrice(coingeckoId: string, enabled: boolean) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
        );
        const json = await res.json();
        if (!cancelled) setPrice(json[coingeckoId]?.usd ?? null);
      } catch {
        if (!cancelled) setPrice(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch_();
    const interval = setInterval(fetch_, 60_000); // refresh every 60s
    return () => { cancelled = true; clearInterval(interval); };
  }, [coingeckoId, enabled]);

  return { price, loading };
}

interface Props {
  marketId: number;
  filterCategory?: string;
  filterSearch?: string;
  sortBy?: string;
}

// ─── Live price chip ──────────────────────────────────────────────────────────
function LivePriceChip({
  tokenPair,
  targetPrice,
  targetAbove,
}: {
  tokenPair: number;
  targetPrice: bigint;
  targetAbove: boolean;
}) {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);
  const meta      = TOKEN_PAIR_META[tokenPair];

  // 1️⃣ Try Chainlink onchain first
  const { data: chainlinkData, isError: chainlinkError } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getCurrentPrice',
    args: [tokenPair],
    query: { refetchInterval: 30_000, retry: 1 },
  }) as { data: [bigint, number] | undefined; isError: boolean };

  // 2️⃣ CoinGecko fallback — only kicks in if Chainlink fails
  const needsFallback = !chainlinkData || chainlinkError;
  const { price: geckoPrice, loading: geckoLoading } = useCoinGeckoPrice(
    meta?.coingeckoId ?? '',
    needsFallback && !!meta
  );

  if (!meta) return null;

  // Resolve final price + source label
  let currentPrice: number | null = null;
  let source: 'chainlink' | 'coingecko' | null = null;

  if (chainlinkData && !chainlinkError) {
    const [rawPrice, decimals] = chainlinkData;
    currentPrice = Number(rawPrice) / 10 ** decimals;
    source = 'chainlink';
  } else if (geckoPrice !== null) {
    currentPrice = geckoPrice;
    source = 'coingecko';
  }

  const target = Number(targetPrice) / 1e8;

  // Loading state
  if (currentPrice === null) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(85,85,112,0.1)', border: '1px solid #1E1E2E',
        borderRadius: 10, padding: '8px 12px',
      }}>
        <WifiOff size={11} color="#555570" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>
          {geckoLoading ? 'Fetching price...' : 'Price unavailable'}
        </span>
      </div>
    );
  }

  const diff    = ((currentPrice - target) / target) * 100;
  const winning = targetAbove ? currentPrice >= target : currentPrice <= target;
  const diffAbs = Math.abs(diff).toFixed(1);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: winning ? 'rgba(34,197,94,0.07)' : 'rgba(232,65,66,0.07)',
      border: `1px solid ${winning ? 'rgba(34,197,94,0.2)' : 'rgba(232,65,66,0.2)'}`,
      borderRadius: 10, padding: '8px 12px', marginTop: 2,
    }}>
      {/* Left: symbol + price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: meta.color + '22', border: `1px solid ${meta.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 9, color: meta.color, fontWeight: 700,
        }}>
          {meta.symbol[0]}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', lineHeight: 1 }}>
              {meta.symbol}/USD
            </span>
            {/* Source badge */}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 5px',
              borderRadius: 4, lineHeight: 1.4,
              background: source === 'chainlink' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)',
              color: source === 'chainlink' ? '#3B82F6' : '#F59E0B',
            }}>
              {source === 'chainlink' ? '⚡ CL' : '🦎 CG'}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E2E2F0', fontWeight: 700, lineHeight: 1.2 }}>
            ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: currentPrice > 1000 ? 0 : 2 })}
          </div>
        </div>
      </div>

      {/* Right: target + status */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', lineHeight: 1 }}>
          Target: ${target.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, lineHeight: 1.2,
          color: winning ? '#22c55e' : '#E84142',
        }}>
          {winning ? '✓ In YES zone' : `${diffAbs}% away`}
        </div>
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
export default function MarketCard({ marketId, filterCategory, filterSearch, sortBy }: Props) {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);

  const { data: market } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
  }) as { data: any };

  const { data: probability } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getYesProbability',
    args: [BigInt(marketId)],
  }) as { data: bigint | undefined };

  if (!market?.exists) return null;

  // Filtre kontrolü
  const cat = market.category?.toLowerCase() ?? '';
  const question = market.question?.toLowerCase() ?? '';
  if (filterCategory && filterCategory !== 'all' && cat !== filterCategory.toLowerCase()) return null;
  if (filterSearch && filterSearch.trim() && !question.includes(filterSearch.toLowerCase())) return null;

  const isOracle   = market.marketType === 1;
  const yesPercent = Number(probability ?? BigInt(50));
  const noPercent  = 100 - yesPercent;
  const category   = market.category?.toLowerCase() ?? 'crypto';
  const catColor   = CATEGORY_COLORS[category] || '#E84142';
  const endDate    = new Date(Number(market.endTime) * 1000);
  const daysLeft   = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const yesPool    = market.yesPool ?? BigInt(0);
  const noPool     = market.noPool ?? BigInt(0);
  const totalPool  = yesPool + noPool;
  const totalPoolF = parseFloat(formatEther(totalPool)).toFixed(3);

  return (
    <Link href={`/markets/${marketId}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#12121A', border: '1px solid #1E1E2E',
          borderRadius: 16, padding: 20, transition: 'all 0.25s ease',
          display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer', height: '100%',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,65,66,0.3)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = '#1E1E2E';
          (e.currentTarget as HTMLElement).style.transform = 'none';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
            padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase',
            background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30`,
          }}>{category}</span>

          {isOracle && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 8px',
              borderRadius: 20, background: 'rgba(59,130,246,0.1)', color: '#3B82F6',
              border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Zap size={9} /> Oracle
            </span>
          )}

          {market.resolved && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px',
              borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22c55e',
            }}>
              {market.outcome === 1 ? '✓ YES' : '✓ NO'}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#555570', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
            #{marketId}
          </span>
        </div>

        {/* Question */}
        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
          color: '#E2E2F0', lineHeight: 1.4, flex: 1, margin: 0,
        }}>
          {market.question}
        </h3>

        {/* 🔴 LIVE PRICE — oracle markets only */}
        {isOracle && !market.resolved && (
          <LivePriceChip
            tokenPair={Number(market.tokenPair)}
            targetPrice={market.targetPrice}
            targetAbove={market.targetAbove}
          />
        )}

        {/* Probability bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#22c55e', fontWeight: 700 }}>
              {yesPercent}¢ YES
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E84142', fontWeight: 700 }}>
              {noPercent}¢ NO
            </span>
          </div>
          <div style={{ background: '#1E1E2E', borderRadius: 6, height: 6, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${yesPercent}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '6px 0 0 6px' }} />
            <div style={{ flex: 1, background: 'linear-gradient(90deg, #dc2626, #E84142)', borderRadius: '0 6px 6px 0' }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', borderTop: '1px solid #1E1E2E', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={11} color="#555570" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{totalPoolF} AVAX</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} color="#555570" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>
              {market.resolved ? 'Resolved' : `${daysLeft}d`}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#E84142', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            Trade <ArrowRight size={11} />
          </div>
        </div>
      </div>
    </Link>
  );
}
