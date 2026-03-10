'use client';

import { TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';
import { useEffect, useState } from 'react';

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatVolume(avax: number): string {
  if (avax === 0) return '0';
  if (avax >= 1_000_000) return `${(avax / 1_000_000).toFixed(1)}M+`;
  if (avax >= 1_000)     return `${(avax / 1_000).toFixed(1)}K+`;
  return `${avax.toFixed(3)}`;
}

// ─── Single market fetcher — her market için ayrı component ──────────────────
// React hook kuralı: döngü içinde hook çağrılamaz.
// Çözüm: her market ID'si için ayrı bir component render ediyoruz.
function MarketStatFetcher({
  marketId,
  contractAddress,
  onData,
}: {
  marketId: number;
  contractAddress: `0x${string}`;
  onData: (id: number, yesPool: bigint, noPool: bigint, creator: string) => void;
}) {
  const { data: market } = useReadContract({
    address: contractAddress,
    abi: MARKET_ABI,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
  }) as { data: any };

  useEffect(() => {
    if (market?.exists) {
      onData(
        marketId,
        market.yesPool ?? 0n,
        market.noPool  ?? 0n,
        market.creator ?? '',
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market?.yesPool?.toString(), market?.noPool?.toString(), market?.creator]);

  return null;
}

// ─── Main Hero ────────────────────────────────────────────────────────────────
export default function Hero() {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);

  // Kontrat'tan toplam market sayısını çek
  const { data: marketCountRaw } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'marketCount',
  }) as { data: bigint | undefined };

  const count = Number(marketCountRaw ?? 0n);

  // Her market'ten gelen pool ve creator verisi burada birikiyor
  const [volumeMap,  setVolumeMap]  = useState<Record<number, number>>({});
  const [creatorMap, setCreatorMap] = useState<Record<number, string>>({});

  const handleMarketData = (
    id: number,
    yesPool: bigint,
    noPool: bigint,
    creator: string,
  ) => {
    const vol = parseFloat(formatEther(yesPool)) + parseFloat(formatEther(noPool));
    setVolumeMap(prev  => ({ ...prev, [id]: vol }));
    setCreatorMap(prev => ({ ...prev, [id]: creator.toLowerCase() }));
  };

  const totalVolume = Object.values(volumeMap).reduce((a, b) => a + b, 0);
  const traderCount = new Set(Object.values(creatorMap).filter(Boolean)).size;

  const stats = [
    {
      label: 'Total Volume',
      value: count === 0 ? '—' : `${formatVolume(totalVolume)} AVAX`,
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

      {/* Görünmez fetcher'lar — her market için bir tane, hook kuralını ihlal etmez */}
      {Array.from({ length: count }, (_, i) => (
        <MarketStatFetcher
          key={i + 1}
          marketId={i + 1}
          contractAddress={contracts.PredictionMarket}
          onData={handleMarketData}
        />
      ))}

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
