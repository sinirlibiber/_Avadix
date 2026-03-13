'use client';

import React, { useState as useFAQState } from 'react';
import { TrendingUp, Shield, Zap, BarChart3, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useReadContract, useChainId } from 'wagmi';
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market?.yesPool?.toString(), market?.noPool?.toString(), market?.creator]);
  return null;
}

// Floating orbs that match logo colors
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

export default function Hero() {
  const chainId = useChainId();
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

  // Animated particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number }[] = [];
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
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      // Draw connections
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(q => {
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
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

  const stats = [
    { label: 'Total Volume', value: count === 0 ? '—' : `${formatVolume(totalVolume)} AVAX`, icon: BarChart3, color: '#FAFAFA' },
    { label: 'Markets',      value: count > 0 ? `${count}` : '—', icon: TrendingUp, color: '#60A5FA' },
    { label: 'Traders',      value: traderCount > 0 ? `${traderCount}+` : '—', icon: Shield, color: '#888888' },
    { label: 'Network',      value: 'Fuji', icon: Zap, color: '#C4F135' },
  ];

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '120px 24px 80px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Hidden fetchers */}
      {Array.from({ length: count }, (_, i) => (
        <MarketStatFetcher key={i+1} marketId={i+1} contractAddress={contracts.PredictionMarket} onData={handleMarketData} />
      ))}

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.6 }} />

      {/* Color orbs */}
      <Orb color="#FAFAFA" size={500} top="5%" left="5%" delay={0} duration={10} />
      <Orb color="#888888" size={400} top="50%" left="70%" delay={2} duration={13} />
      <Orb color="#FAFAFA" size={300} top="20%" left="55%" delay={1} duration={15} />

      {/* Grid */}
      <div className="bg-grid" style={{ position: 'absolute', inset: 0, opacity: 0.45, pointerEvents: 'none' }} />

      {/* Logo mark floating — büyük arka planda */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600, opacity: 0.025,
        backgroundImage: 'url(/logo-new.png)', backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        pointerEvents: 'none', filter: 'blur(2px)',
        animation: 'spin-slow 60s linear infinite',
      }} />

      {/* Live badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(6,182,212,0.08))',
        border: '1px solid rgba(255,255,255,0.25)',
        borderRadius: 24, padding: '7px 18px', marginBottom: 40,
        fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888888',
        letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        boxShadow: '0 0 20px rgba(6,182,212,0.1)',
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#888888', display: 'inline-block', animation: 'pulse 2s infinite', boxShadow: '0 0 8px #67E8F9' }} />
        Live on Avalanche Fuji Testnet
      </div>

      {/* Heading */}
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: 'clamp(54px, 9.5vw, 108px)', lineHeight: 0.9,
        letterSpacing: '-0.05em', marginBottom: 30, maxWidth: 960,
        position: 'relative',
      }}>
        <span style={{ color: '#FAFAFA', display: 'block' }}>Predict.</span>
        <span style={{ color: '#FAFAFA', display: 'block' }}>Trade.</span>
        <span className="gradient-text" style={{ display: 'block' }}>Win on Avalanche.</span>
      </h1>

      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 400,
        fontSize: 'clamp(16px, 2vw, 19px)', color: '#888888',
        maxWidth: 540, lineHeight: 1.8, marginBottom: 48, position: 'relative',
      }}>
        The most advanced decentralized prediction market on Avalanche.
        Trade binary outcomes, earn yield, govern the protocol.
      </p>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: 90, position: 'relative' }}>
        <Link href="/markets" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, padding: '14px 36px' }}>
          Explore Markets <ArrowUpRight size={18} />
        </Link>
        <Link href="/donate" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 16, padding: '14px 28px' }}>
          Support Community
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, width: '100%', maxWidth: 740, position: 'relative' }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass card" style={{ padding: '24px 18px', textAlign: 'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1C1C1C'; }}
          >
            <Icon size={18} color={color} style={{ marginBottom: 10, margin: '0 auto 10px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: '#FAFAFA', lineHeight: 1, marginBottom: 7 }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555555', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'What is Avadix?',
    a: 'Avadix is a decentralized prediction market protocol built on Avalanche Fuji. You can trade binary YES/NO outcomes on real-world events — crypto prices, politics, sports and more — and earn AVAX if your prediction is correct.',
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

function FAQItem({ q, a, isLast }: { q: string; a: string; isLast: boolean }) {
  const [open, setOpen] = useFAQState(false);
  return (
    <div style={{
      borderBottom: isLast ? 'none' : '1px solid #1A1A1A',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '22px 0',
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', gap: 24,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 600,
          fontSize: 16, color: '#FAFAFA', letterSpacing: '-0.02em',
          lineHeight: 1.4,
        }}>{q}</span>
        <span style={{
          color: open ? '#FAFAFA' : '#444',
          fontSize: 20, lineHeight: 1, flexShrink: 0,
          transition: 'transform 0.25s, color 0.2s',
          display: 'inline-block',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}>+</span>
      </button>
      <div style={{
        overflow: 'hidden',
        maxHeight: open ? 300 : 0,
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 14,
          color: '#888', lineHeight: 1.8,
          paddingBottom: 22,
        }}>{a}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section style={{
      maxWidth: 760, margin: '0 auto',
      padding: '100px 24px 120px',
      position: 'relative', zIndex: 1,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: '#444', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>FAQ</p>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'clamp(32px, 5vw, 52px)', color: '#FAFAFA',
          letterSpacing: '-0.04em', lineHeight: 1.05,
        }}>
          Common questions
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 15,
          color: '#555', marginTop: 16, lineHeight: 1.7,
        }}>
          Everything you need to know about Avadix.
        </p>
      </div>

      {/* Accordion */}
      <div style={{
        border: '1px solid #1A1A1A',
        borderRadius: 20,
        background: '#0E0E0E',
        padding: '0 28px',
        backdropFilter: 'blur(10px)',
      }}>
        {FAQS.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} isLast={i === FAQS.length - 1} />
        ))}
      </div>

      {/* Bottom CTA */}
      <p style={{
        textAlign: 'center', marginTop: 40,
        fontFamily: 'var(--font-mono)', fontSize: 12, color: '#444',
        letterSpacing: '0.02em',
      }}>
        Still have questions?{' '}
        <a href="https://discord.gg/nG9UyBFhMK" target="_blank" rel="noreferrer"
          style={{ color: '#FAFAFA', textDecoration: 'none', borderBottom: '1px solid #333' }}
          onMouseEnter={e => (e.currentTarget.style.borderBottomColor = '#FAFAFA')}
          onMouseLeave={e => (e.currentTarget.style.borderBottomColor = '#333')}
        >
          Ask in Discord →
        </a>
      </p>
    </section>
  );
}
