'use client';

import { TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';
import { useEffect, useState } from 'react';

// ─── Hook: fetch live stats from contract ─────────────────────────────────────
function useLiveStats() {
  const chainId = useChainId();
  const contracts = getAddresses(chainId);

  // Total market count
  const { data: marketCount } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'marketCount',
  }) as { data: bigint | undefined };

  const count = Number(marketCount ?? 0n);
  const marketIds = Array.from({ length: count }, (_, i) => i + 1);

  // Fetch all markets to calculate total volume and unique traders
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [traderSet, setTraderSet] = useState<Set<string>>(new Set());

  // Read each market's pool data
  const marketResults = marketIds.map(id => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data } = useReadContract({
      address: contracts.PredictionMarket,
      abi: MARKET_ABI,
      functionName: 'getMarket',
      args: [BigInt(id)],
    }) as { data: any };
    return data;
  });

  useEffect(() => {
    let vol = 0;
    const traders = new Set<string>();

    marketResults.forEach((market) => {
      if (!market?.exists) return;
      const yesPool = parseFloat(formatEther(market.yesPool ?? 0n));
      const noPool  = parseFloat(formatEther(market.noPool  ?? 0n));
      vol += yesPool + noPool;
      if (market.creator) traders.add(market.creator.toLowerCase());
    });

    setTotalVolume(vol);
    setTraderSet(traders);
  }, [JSON.stringify(marketResults.map(m => m?.yesPool?.toString() + m?.noPool?.toString()))]);

  return { count, totalVolume, traderCount: traderSet.size };
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatVolume(avax: number): string {
  if (avax === 0) return '0';
  if (avax >= 1_000_000) return `${(avax / 1_000_000).toFixed(1)}M+`;
  if (avax >= 1_000)     return `${(avax / 1_000).toFixed(1)}K+`;
  return `${avax.toFixed(2)}`;
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: string; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState('...');

  useEffect(() => {
    if (value === '...') return;
    setDisplay(prefix + value + suffix);
  }, [value, prefix, suffix]);

  return <span>{display}</span>;
}

// ─── Main Hero ────────────────────────────────────────────────────────────────
export default function Hero() {
  const { count, totalVolume, traderCount } = useLiveStats();

  const stats = [
    {
      label: 'Total Volume',
      value: totalVolume > 0 ? formatVolume(totalVolume) + ' AVAX' : '—',
      icon: BarChart3,
    },
    {
      label: 'Markets',
      value: count > 0 ? `${count}` : '—',
      icon: TrendingUp,
    },
    {
      label: 'Traders',
      value: traderCount > 0 ? `${traderCount}+` : '—',
      icon: Shield,
    },
    {
      label: 'On Avalanche',
      value: 'C-Chain',
      icon: Zap,
    },
  ];

  return (
    <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(232,65,66,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none', animation: 'float 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(232,65,66,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none', animation: 'float 10s ease-in-out infinite reverse' }} />
      <div className="bg-grid" style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none' }} />

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.25)', borderRadius: 20, padding: '6px 16px', marginBottom: 32, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E84142', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        Live on Avalanche Fuji Testnet
      </div>

      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.95, letterSpacing: '-0.04em', marginBottom: 24, maxWidth: 900 }}>
        <span style={{ color: '#E2E2F0' }}>Predict.</span>{' '}
        <span style={{ color: '#E2E2F0' }}>Trade.</span>{' '}
        <br />
        <span className="gradient-text">Win on Avalanche.</span>
      </h1>

      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 'clamp(16px, 2vw, 20px)', color: '#8888AA', maxWidth: 580, lineHeight: 1.7, marginBottom: 40 }}>
        The most advanced decentralized prediction market on Avalanche. Trade binary outcomes, earn yield, govern the protocol.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: 80 }}>
        <Link href="/markets" className="btn-primary" style={{ textDecoration: 'none', fontSize: 16, padding: '14px 32px' }}>Explore Markets</Link>
        <Link href="/donate" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 16, padding: '14px 28px' }}>Support Community</Link>
      </div>

      {/* Live Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, width: '100%', maxWidth: 700 }}>
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            style={{ background: 'rgba(18,18,26,0.8)', border: '1px solid rgba(30,30,46,0.8)', borderRadius: 16, padding: '20px 16px', backdropFilter: 'blur(10px)', transition: 'all 0.25s ease' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,65,66,0.3)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(30,30,46,0.8)'}
          >
            <Icon size={18} color="#E84142" style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: '#E2E2F0', lineHeight: 1, marginBottom: 4 }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </section>
  );
}
