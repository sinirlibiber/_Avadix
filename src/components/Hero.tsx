'use client';

import { TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';
import { useEffect, useState } from 'react';

function formatVolume(avax: number): string {
  if (avax === 0) return '0';
  if (avax >= 1_000_000) return `${(avax / 1_000_000).toFixed(1)}M+`;
  if (avax >= 1_000)     return `${(avax / 1_000).toFixed(1)}K+`;
  return `${avax.toFixed(3)}`;
}

function MarketStatFetcher({ marketId, contractAddress, onData }: {
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
      onData(marketId, market.yesPool ?? 0n, market.noPool ?? 0n, market.creator ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market?.yesPool?.toString(), market?.noPool?.toString(), market?.creator]);

  return null;
}

export default function Hero() {
  const chainId = useChainId();
  const contracts = getAddresses(chainId);

  const { data: marketCountRaw } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'marketCount',
  }) as { data: bigint | undefined };

  const count = Number(marketCountRaw ?? 0n);
  const [volumeMap,  setVolumeMap]  = useState<Record<number, number>>({});
  const [creatorMap, setCreatorMap] = useState<Record<number, string>>({});

  const handleMarketData = (id: number, yesPool: bigint, noPool: bigint, creator: string) => {
    const vol = parseFloat(formatEther(yesPool)) + parseFloat(formatEther(noPool));
    setVolumeMap(prev  => ({ ...prev, [id]: vol }));
    setCreatorMap(prev => ({ ...prev, [id]: creator.toLowerCase() }));
  };

  const totalVolume = Object.values(volumeMap).reduce((a, b) => a + b, 0);
  const traderCount = new Set(Object.values(creatorMap).filter(Boolean)).size;

  const stats = [
    { label: 'Total Volume', value: count === 0 ? '—' : `${formatVolume(totalVolume)} AVAX`, icon: BarChart3 },
    { label: 'Markets',      value: count > 0 ? `${count}` : '—', icon: TrendingUp },
    { label: 'Traders',      value: traderCount > 0 ? `${traderCount}+` : '—', icon: Shield },
    { label: 'Network',      value: 'Fuji', icon: Zap },
  ];

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '120px 24px 80px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Hidden market fetchers */}
      {Array.from({ length: count }, (_, i) => (
        <MarketStatFetcher key={i + 1} marketId={i + 1}
          contractAddress={contracts.PredictionMarket} onData={handleMarketData} />
      ))}

      {/* Background glows */}
      <div style={{ position: 'absolute', top: '15%', left: '5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none', animation: 'float 9s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: 380, height: 380, background: 'radial-gradient(circle, rgba(196,241,53,0.09) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none', animation: 'float 12s ease-in-out infinite reverse' }} />
      <div className="bg-grid" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }} />

      {/* Live badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(196,241,53,0.08)', border: '1px solid rgba(196,241,53,0.22)',
        borderRadius: 20, padding: '6px 16px', marginBottom: 36,
        fontFamily: 'var(--font-mono)', fontSize: 11, color: '#C4F135',
        letterSpacing: '0.08em', textTransform: 'uppercase' as const,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4F135', display: 'inline-block', animation: 'pulse 2s infinite', boxShadow: '0 0 8px #C4F135' }} />
        Live on Avalanche Fuji Testnet
      </div>

      {/* Main heading */}
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 900,
        fontSize: 'clamp(52px, 9vw, 104px)', lineHeight: 0.92,
        letterSpacing: '-0.05em', marginBottom: 28, maxWidth: 950,
      }}>
        <span style={{ color: '#F0EEFF', display: 'block' }}>Predict.</span>
        <span style={{ color: '#F0EEFF', display: 'block' }}>Trade.</span>
        <span className="gradient-text" style={{ display: 'block' }}>Win on Avalanche.</span>
      </h1>

      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 400,
        fontSize: 'clamp(16px, 2vw, 19px)', color: '#6B6B8A',
        maxWidth: 520, lineHeight: 1.75, marginBottom: 44,
      }}>
        The most advanced decentralized prediction market on Avalanche.
        Trade binary outcomes, earn yield, govern the protocol.
      </p>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: 88 }}>
        <Link href="/markets" className="btn-lime" style={{ textDecoration: 'none', fontSize: 16, padding: '14px 36px' }}>
          Explore Markets
        </Link>
        <Link href="/donate" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 16, padding: '14px 28px' }}>
          Support Community
        </Link>
      </div>

      {/* Live Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 14, width: '100%', maxWidth: 720 }}>
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass card"
            style={{ padding: '22px 18px', textAlign: 'center' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'}
          >
            <Icon size={18} color="#A78BFA" style={{ marginBottom: 10, margin: '0 auto 10px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#F0EEFF', lineHeight: 1, marginBottom: 6 }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6B6B8A', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-24px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </section>
  );
}
