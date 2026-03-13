// src/components/Hero.tsx

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

  // ... (Particle canvas useEffect içeriği aynı kalacak)

  const handleMarketData = (id: number, yesPool: bigint, noPool: bigint, creator: string) => {
    const vol = parseFloat(formatEther(yesPool)) + parseFloat(formatEther(noPool));
    setVolumeMap(prev  => ({ ...prev, [id]: vol }));
    setCreatorMap(prev => ({ ...prev, [id]: creator.toLowerCase() }));
  };

  const totalVolume = Object.values(volumeMap).reduce((a, b) => a + b, 0);
  const traderCount = new Set(Object.values(creatorMap).filter(Boolean)).size;

  // İkonlar senin isteğin üzerine kaldırıldı (icon: null)
  const stats = [
    { label: 'Total Volume', value: count === 0 ? '—' : `${formatVolume(totalVolume)} AVAX`, icon: BarChart3, color: '#FAFAFA' },
    { label: 'Active Markets', value: count > 0 ? `${count}` : '—', icon: null, color: '#60A5FA' },
    { label: 'Traders',      value: traderCount > 0 ? `${traderCount}+` : '—', icon: null, color: '#888888' },
    { label: 'Network',      value: 'Fuji', icon: null, color: '#C4F135' },
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

      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.6 }} />

      {/* Grid ve Orb'lar aynı kalabilir, arka plan derinliği için iyidir */}
      <div className="bg-grid" style={{ position: 'absolute', inset: 0, opacity: 0.45, pointerEvents: 'none' }} />

      {/* Live badge - Renkleri daha sade bir hale getirdik */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: '7px 18px', marginBottom: 40,
        fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888888',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        backdropFilter: 'blur(10px)',
        position: 'relative', zIndex: 10
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4F135', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        Live on Avalanche Fuji • 0% Fees
      </div>

      {/* Heading - Predict. Govern. Donate. Metni Eklendi */}
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 1,
        letterSpacing: '-0.05em', marginBottom: 30, maxWidth: 1000,
        position: 'relative', zIndex: 10
      }}>
        <span style={{ color: '#FAFAFA', display: 'block' }}>Predict. Govern. Donate.</span>
        <span style={{ color: '#666', display: 'block' }}>All with 0% Fees.</span>
      </h1>

      {/* Description Metni Güncellendi */}
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 400,
        fontSize: 'clamp(16px, 1.8vw, 20px)', color: '#888',
        maxWidth: 640, lineHeight: 1.6, marginBottom: 48, position: 'relative', zIndex: 10
      }}>
        A decentralized evolution on Avalanche. Your trades are fee-free, 
        your voice matters in the DAO, and your support reaches others directly.
      </p>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 90, position: 'relative', zIndex: 10 }}>
        <Link href="/markets" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 16, padding: '16px 40px', borderRadius: '12px' }}>
          Explore Markets <ArrowUpRight size={18} />
        </Link>
        <Link href="/donate" className="btn-ghost" style={{ textDecoration: 'none', fontSize: 16, padding: '16px 32px', borderRadius: '12px', border: '1px solid #333' }}>
          Support Community
        </Link>
      </div>

      {/* Stats - İkon Kontrollü Render */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, width: '100%', maxWidth: 800, position: 'relative', zIndex: 10 }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass card" style={{ padding: '30px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid #1A1A1A' }}>
            {/* Sadece Icon varsa render et (Total Volume için kalabilir, diğerleri için null gelecek) */}
            {Icon && <Icon size={20} color={color} style={{ marginBottom: 12, margin: '0 auto 12px' }} />}
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, color: '#FAFAFA', lineHeight: 1, marginBottom: 8 }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
