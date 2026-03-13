'use client';

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
    const colors = ['#7C3AED', '#3B82F6', '#06B6D4', '#A78BFA', '#93C5FD'];

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
            ctx.strokeStyle = `rgba(124,58,237,${0.12 * (1 - dist / 100)})`;
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
    { label: 'Total Volume', value: count === 0 ? '—' : `${formatVolume(totalVolume)} AVAX`, icon: BarChart3, color: '#A78BFA' },
    { label: 'Markets',      value: count > 0 ? `${count}` : '—', icon: TrendingUp, color: '#60A5FA' },
    { label: 'Traders',      value: traderCount > 0 ? `${traderCount}+` : '—', icon: Shield, color: '#67E8F9' },
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
      <Orb color="#7C3AED" size={500} top="5%" left="5%" delay={0} duration={10} />
      <Orb color="#3B82F6" size={400} top="50%" left="70%" delay={2} duration={13} />
      <Orb color="#06B6D4" size={350} top="75%" left="15%" delay={4} duration={11} />
      <Orb color="#A78BFA" size={300} top="20%" left="55%" delay={1} duration={15} />

      {/* Grid */}
      <div className="bg-grid" style={{ position: 'absolute', inset: 0, opacity: 0.45, pointerEvents: 'none' }} />

      {/* Logo mark floating — büyük arka planda */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600, opacity: 0.025,
        backgroundImage: 'url(/logo.png)', backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        pointerEvents: 'none', filter: 'blur(2px)',
        animation: 'spin-slow 60s linear infinite',
      }} />

      {/* Live badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08))',
        border: '1px solid rgba(124,58,237,0.25)',
        borderRadius: 24, padding: '7px 18px', marginBottom: 40,
        fontFamily: 'var(--font-mono)', fontSize: 11, color: '#67E8F9',
        letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        boxShadow: '0 0 20px rgba(6,182,212,0.1)',
        backdropFilter: 'blur(10px)',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#67E8F9', display: 'inline-block', animation: 'pulse 2s infinite', boxShadow: '0 0 8px #67E8F9' }} />
        Live on Avalanche Fuji Testnet
      </div>

      {/* Heading */}
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: 'clamp(54px, 9.5vw, 108px)', lineHeight: 0.9,
        letterSpacing: '-0.05em', marginBottom: 30, maxWidth: 960,
        position: 'relative',
      }}>
        <span style={{ color: '#EEF0FF', display: 'block' }}>Predict.</span>
        <span style={{ color: '#EEF0FF', display: 'block' }}>Trade.</span>
        <span className="gradient-text" style={{ display: 'block' }}>Win on Avalanche.</span>
      </h1>

      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 400,
        fontSize: 'clamp(16px, 2vw, 19px)', color: '#9999CC',
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
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
          >
            <Icon size={18} color={color} style={{ marginBottom: 10, margin: '0 auto 10px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: '#EEF0FF', lineHeight: 1, marginBottom: 7 }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#55557A', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
