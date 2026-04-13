'use client';

import React, { useState as useFAQState } from 'react';
import { TrendingUp, Shield, Zap, BarChart3, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useReadContract, useChainId } from 'wagmi';
import { AVAX_MAINNET_ID } from '@/lib/wagmi';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';
import { useEffect, useState, useRef } from 'react';

function formatVolume(avax: number): string {
  if (avax === 0) return '0';
  if (avax >= 1_000_000) return `${(avax / 1_000_000).toFixed(1)}M+`;
  if (avax >= 1_000)     return `${(avax / 1_000).toFixed(1)}K+`;
  return `${avax.toFixed(3)}`;
}

function MarketStatFetcher({ marketId, contractAddress, onData }: {
  marketId: number; contractAddress: `0x${string}`;
  onData: (id: number, yesPool: bigint, noPool: bigint, creator: string) => void;
}) {
  const { data: core } = useReadContract({
    address: contractAddress, abi: MARKET_ABI, functionName: 'getMarketCore',
    args: [BigInt(marketId)],
  }) as { data: any };
  const { data: meta } = useReadContract({
    address: contractAddress, abi: MARKET_ABI, functionName: 'getMarketMeta',
    args: [BigInt(marketId)],
  }) as { data: any };
  const market = (core && meta) ? { ...core, ...meta, exists: meta.exists } : undefined;
  useEffect(() => {
    if (market?.exists) onData(marketId, market.yesPool ?? 0n, market.noPool ?? 0n, market.creator ?? '');
  }, [market?.yesPool?.toString(), market?.noPool?.toString(), market?.creator]);
  return null;
}

function Orb({ color, size, top, left, delay, duration }: any) {
  return (
    <div style={{
      position: 'absolute', top, left,
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${color} 0%, transparent 70%)`,
      filter: 'blur(50px)', opacity: 0.5, pointerEvents: 'none',
      animation: `float ${duration}s ease-in-out ${delay}s infinite`,
    }} />
  );
}

export function Hero() {
  const chainId = useChainId();
  const isMainnet = chainId === AVAX_MAINNET_ID;
  const contracts = getAddresses(chainId);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: marketCountRaw } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'marketCount',
  }) as { data: bigint | undefined };

  const count = Number(marketCountRaw ?? 0n);
  const [volumeMap,  setVolumeMap]  = useState<Record<number, number>>({});
  const [creatorMap, setCreatorMap] = useState<Record<number, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const particles: any[] = [];
    const colors = ['#FAFAFA', '#888888', '#666666', '#FAFAFA', '#93C5FD'];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.1,
      });
    }
    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(q => {
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 100) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, [mounted]);

  const handleMarketData = (id: number, yesPool: bigint, noPool: bigint, creator: string) => {
    const vol = parseFloat(formatEther(yesPool)) + parseFloat(formatEther(noPool));
    setVolumeMap(prev  => ({ ...prev, [id]: vol }));
    setCreatorMap(prev => ({ ...prev, [id]: creator.toLowerCase() }));
  };

  const totalVolume = Object.values(volumeMap).reduce((a, b) => a + b, 0);
  const traderCount = new Set(Object.values(creatorMap).filter(Boolean)).size;

  // Tüm ikonlar temizlendi, veriler sadeleştirildi
  const stats = [
    { label: 'Total Volume', value: count === 0 ? '—' : `${formatVolume(totalVolume)} AVAX` },
    { label: 'Active Markets', value: count > 0 ? `${count}` : '—' },
    { label: 'Traders',      value: traderCount > 0 ? `${traderCount}+` : '—' },
    { label: 'Network',      value: isMainnet ? 'Mainnet' : 'Fuji' },
  ];

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '120px 24px 80px', position: 'relative', overflow: 'hidden',
    }}>
      {Array.from({ length: count }, (_, i) => (
        <MarketStatFetcher key={i+1} marketId={i+1} contractAddress={contracts.PredictionMarket} onData={handleMarketData} />
      ))}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.6 }} />
      <div className="bg-grid" style={{ position: 'absolute', inset: 0, opacity: 0.45, pointerEvents: 'none' }} />

      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: '7px 18px', marginBottom: 40,
        fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888888',
        letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        backdropFilter: 'blur(10px)', position: 'relative', zIndex: 10
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4F135', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        {isMainnet ? 'Live on Avalanche Mainnet' : 'Live on Avalanche Fuji Testnet'}
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: 'clamp(54px, 9vw, 96px)', lineHeight: 1.1,
        letterSpacing: '-0.05em', marginBottom: 30, maxWidth: 1000,
        position: 'relative', zIndex: 10
      }}>
        <span style={{ color: '#FAFAFA', display: 'block' }}>Predict Govern Donate</span>

      </h1>

      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 400,
        fontSize: 'clamp(16px, 2vw, 19px)', color: '#888888',
        maxWidth: 580, lineHeight: 1.6, marginBottom: 48, position: 'relative', zIndex: 10
      }}>
        A decentralized evolution on Avalanche. Trade binary outcomes,
        your voice matters in the DAO, and your support reaches others directly.
      </p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: 90, position: 'relative', zIndex: 10 }}>
        <Link href="/markets" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, padding: '16px 36px', borderRadius: '12px' }}>
          Explore Markets <ArrowUpRight size={18} />
        </Link>
        <Link href="/donate" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 16, padding: '16px 28px', borderRadius: '12px', border: '1px solid #222' }}>
          Support Community
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, width: '100%', maxWidth: 760, position: 'relative', zIndex: 10 }}>
        {stats.map(({ label, value }) => (
          <div key={label} className="glass card" style={{ 
            padding: '32px 18px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(255,255,255,0.01)', 
            border: '1px solid #141414',
            minHeight: '120px'
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: '#FAFAFA', lineHeight: 1, marginBottom: 10 }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FAQ() {
  return (
    <section style={{ maxWidth: 760, margin: '0 auto', padding: '100px 24px 120px', position: 'relative', zIndex: 1 }}>
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>FAQ</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px, 5vw, 52px)', color: '#FAFAFA', letterSpacing: '-0.04em', lineHeight: 1.05 }}>
          Common questions
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#555', marginTop: 16, lineHeight: 1.7 }}>
          Everything you need to know about Avadix.
        </p>
      </div>
      <div style={{ border: '1px solid #1A1A1A', borderRadius: 20, background: '#0E0E0E', padding: '0 28px', backdropFilter: 'blur(10px)' }}>
        {FAQS.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} isLast={i === FAQS.length - 1} />
        ))}
      </div>
    </section>
  );
}

function FAQItem({ q, a, isLast }: { q: string; a: string; isLast: boolean }) {
  const [open, setOpen] = useFAQState(false);
  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #1A1A1A' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 24 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, color: '#FAFAFA', letterSpacing: '-0.02em', lineHeight: 1.4 }}>{q}</span>
        <span style={{ color: open ? '#FAFAFA' : '#444', fontSize: 20, transition: 'transform 0.25s', display: 'inline-block', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>
      <div style={{ overflow: 'hidden', maxHeight: open ? 300 : 0, transition: 'max-height 0.35s' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#888', lineHeight: 1.8, paddingBottom: 22 }}>{a}</p>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: 'What is Avadix?',
    a: 'Avadix is a decentralized prediction market protocol built on Avalanche. You can trade binary YES/NO outcomes on real-world events — crypto prices, politics, sports and more — and earn AVAX if your prediction is correct.',
  },
  {
    q: 'How do I make a prediction?',
    a: 'Connect your wallet, browse the Markets page, pick a market you have an opinion on, and buy YES or NO shares with AVAX. The lower the current probability, the cheaper the shares — and the higher your potential payout.',
  },
  {
    q: 'How are markets resolved?',
    a: 'Markets resolve either manually by the admin or automatically via Chainlink price oracles (for crypto price markets). Once resolved, winning share-holders can claim their AVAX reward from the Portfolio page.',
  },
  {
    q: 'What is the DAO?',
    a: 'The Avadix DAO lets any community member create and vote on proposals — from protocol parameter changes to new market categories. Voting is on-chain and transparent. Every wallet can participate.',
  },
  {
    q: 'What is the Donate section?',
    a: 'Community members can launch fundraising campaigns for causes they care about. Other users can donate AVAX directly on-chain. All funds go straight to the campaign creator\'s wallet — no intermediaries.',
  },
  {
    q: 'How do I create a market?',
    a: 'Only the contract owner can create markets directly via the Create Market button. Any user can suggest a market and the community can request it via the DAO. Oracle-based markets (e.g. BTC price targets) resolve automatically.',
  },
];


export default Hero;
