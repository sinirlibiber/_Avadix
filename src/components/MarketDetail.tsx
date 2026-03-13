'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, TrendingUp, Clock, Users, BarChart3, Activity, AlertCircle, CheckCircle, Info, ChevronUp, ChevronDown, Zap, Target } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';


// ─── CoinGecko fallback hook ──────────────────────────────────────────────────
const TOKEN_PAIR_META: Record<number, { symbol: string; color: string; bg: string; coingeckoId: string }> = {
  0: { symbol: 'AVAX/USD', color: '#FAFAFA', bg: 'rgba(255,255,255,0.04)',  coingeckoId: 'avalanche-2' },
  1: { symbol: 'BTC/USD',  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', coingeckoId: 'bitcoin' },
  2: { symbol: 'ETH/USD',  color: '#6366F1', bg: 'rgba(99,102,241,0.08)', coingeckoId: 'ethereum' },
  3: { symbol: 'LINK/USD', color: '#888888', bg: 'rgba(59,130,246,0.08)', coingeckoId: 'chainlink' },
};

function useCoinGeckoPrice(coingeckoId: string, enabled: boolean) {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || !coingeckoId) return;
    let cancelled = false;
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`);
        const json = await res.json();
        if (!cancelled) setPrice(json[coingeckoId]?.usd ?? null);
      } catch { if (!cancelled) setPrice(null); }
      finally { if (!cancelled) setLoading(false); }
    };
    fetch_();
    const iv = setInterval(fetch_, 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [coingeckoId, enabled]);
  return { price, loading };
}

const MIN_AMOUNT = 0.001;

// ─── Real on-chain data via Snowtrace API ────────────────────────────────────
const CONTRACT_ADDR = '0xc6dcF18054b8cAC46F242e87b0758325DCC8B853';
// keccak256("TradePlaced(uint256,address,bool,uint256,uint256)")
const TRADE_TOPIC0 = '0x482ba39b8e8f0be2dcea6fdf1f91e8c3e3af9ee5a5f55f5d1cdab8e9a88c46fe';

interface TradeEvent {
  hash: string;
  trader: string;
  isYes: boolean;
  amount: number;
  shares: number;
  blockNumber: number;
  timestamp: number;
  yesProb: number;
}

function useMarketTrades(marketId: number) {
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // topic1 = marketId padded to 32 bytes
        const topic1 = '0x' + marketId.toString(16).padStart(64, '0');

        const url = `https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api` +
          `?module=logs&action=getLogs` +
          `&address=${CONTRACT_ADDR}` +
          `&topic0=${TRADE_TOPIC0}` +
          `&topic0_1_opr=and&topic1=${topic1}` +
          `&fromBlock=0&toBlock=99999999` +
          `&apikey=free`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();

        if (cancelled) return;

        const result = json.result;
        if (!Array.isArray(result)) { setTrades([]); setLoading(false); return; }

        const parsed: TradeEvent[] = [];
        for (const log of result) {
          try {
            // topics[1]=marketId, topics[2]=trader, topics[3]=isYes
            const trader = '0x' + log.topics[2].slice(26);
            const isYes  = log.topics[3].endsWith('1');
            const data   = log.data.replace('0x', '');
            const amountWei = BigInt('0x' + data.slice(0, 64));
            const sharesWei = BigInt('0x' + data.slice(64, 128));
            const amountF   = Number(amountWei) / 1e18;
            const sharesF   = Number(sharesWei) / 1e18;
            const rawProb   = sharesF > 0
              ? Math.min(99, Math.max(1, Math.round((amountF / sharesF) * 100)))
              : 50;
            parsed.push({
              hash:        log.transactionHash,
              trader,
              isYes,
              amount:      amountF,
              shares:      sharesF,
              blockNumber: parseInt(log.blockNumber, 16),
              timestamp:   parseInt(log.timeStamp, 16),
              yesProb:     isYes ? rawProb : 100 - rawProb,
            });
          } catch { /* skip malformed */ }
        }

        // newest first
        parsed.sort((a, b) => b.blockNumber - a.blockNumber);
        if (!cancelled) setTrades(parsed);
      } catch (e) {
        console.warn('Snowtrace fetch failed:', e);
        if (!cancelled) setTrades([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [marketId]);

  return { trades, loading };
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// ─── Real Price Chart from on-chain trades ─────────────────────────────────────
function PriceChart({ trades, yesPercent, loading }: { trades: TradeEvent[]; yesPercent: number; loading: boolean }) {
  // Build price history from trades (oldest→newest) or fallback to single point
  const data: { t: number; yes: number }[] = trades.length >= 2
    ? [...trades].reverse().map((tr, i) => ({ t: i, yes: tr.isYes ? tr.yesProb : 100 - tr.yesProb }))
    : [{ t: 0, yes: yesPercent }];

  // Always end with current probability
  if (data[data.length - 1].yes !== yesPercent) {
    data.push({ t: data.length, yes: yesPercent });
  }

  const w = 560, h = 120, pad = 8;
  const minY = Math.min(...data.map(d => d.yes), yesPercent - 5);
  const maxY = Math.max(...data.map(d => d.yes), yesPercent + 5);
  const range = maxY - minY || 10;
  const scaleX = (i: number) => pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
  const scaleY = (v: number) => h - pad - ((v - minY) / range) * (h - pad * 2);
  const pts = data.map((d, i) => `${scaleX(i)},${scaleY(d.yes)}`).join(' ');
  const areaBottom = `${scaleX(data.length - 1)},${h} ${scaleX(0)},${h}`;
  const isUp = data.length > 1 ? data[data.length - 1].yes >= data[0].yes : true;
  const color = isUp ? '#22c55e' : '#EF4444';

  if (loading) return (
    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>Loading chart...</span>
    </div>
  );

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 120 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map(v => (
        <line key={v} x1={pad} y1={scaleY(minY + (v / 100) * range)} x2={w - pad} y2={scaleY(minY + (v / 100) * range)} stroke="#1C1C1C" strokeWidth="1" />
      ))}
      <polygon points={`${pts} ${areaBottom}`} fill="url(#areaGrad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={scaleX(data.length - 1)} cy={scaleY(data[data.length - 1].yes)} r="4" fill={color} />
      <text x={w - pad} y={scaleY(data[data.length - 1].yes) - 8} fill={color} fontSize="11" textAnchor="end" fontFamily="monospace">{yesPercent}¢</text>
    </svg>
  );
}

// ─── Real Activity Feed from on-chain TradePlaced events ──────────────────────
function ActivityFeed({ trades, loading }: { trades: TradeEvent[]; loading: boolean }) {
  if (loading) return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570' }}>Fetching on-chain trades...</span>
    </div>
  );

  if (trades.length === 0) return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570' }}>No trades yet — be the first!</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {trades.slice(0, 20).map((t, i) => (
        <a
          key={i}
          href={`https://testnet.snowtrace.io/tx/${t.hash}`}
          target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #1C1C1C', transition: 'background 0.15s', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 7px', borderRadius: 4, background: t.isYes ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: t.isYes ? '#22c55e' : '#EF4444', fontWeight: 600, minWidth: 30, textAlign: 'center' }}>
            {t.isYes ? 'YES' : 'NO'}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FAFAFA', flex: 1 }}>{t.amount.toFixed(3)} AVAX</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>@ {t.yesProb}¢</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>{shortAddr(t.trader)}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', minWidth: 50, textAlign: 'right' }}>
            {t.timestamp ? timeAgo(t.timestamp) : `#${t.blockNumber}`}
          </span>
        </a>
      ))}
    </div>
  );
}

// ─── Market depth — real AMM pool visualization ───────────────────────────────
function MarketDepth({ yesPool, noPool }: { yesPool: bigint; noPool: bigint }) {
  const ye = parseFloat(formatEther(yesPool));
  const no = parseFloat(formatEther(noPool));
  const total = ye + no || 1;
  const yesPct = Math.round(ye / total * 100);
  const noPct  = 100 - yesPct;

  // AMM depth: simulate buy pressure at different sizes using x*y=k
  const genDepth = (pool: number, counterPool: number, isYes: boolean) => {
    const sizes = [0.001, 0.01, 0.05, 0.1, 0.5];
    return sizes.map(size => {
      const sharesOut = counterPool - (pool * counterPool) / (pool + size);
      const effPrice  = sharesOut > 0 ? Math.min(99, Math.max(1, Math.round((size / sharesOut) * 100))) : 50;
      return { price: isYes ? effPrice : 100 - effPrice, size: size.toFixed(3) };
    });
  };

  const yesBids = genDepth(ye, no, true);
  const noAsks  = genDepth(no, ye, false);
  const maxSize = Math.max(...[...yesBids, ...noAsks].map(d => parseFloat(d.size)));

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* YES bids */}
      <div style={{ flex: 1 }}>
        <div style={{ padding: '6px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, borderBottom: '1px solid #1C1C1C' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textTransform: 'uppercase' }}>Price (YES)</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textAlign: 'right', textTransform: 'uppercase' }}>Size (AVAX)</span>
        </div>
        {yesBids.map((b, i) => (
          <div key={i} style={{ position: 'relative', padding: '6px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(34,197,94,0.07)', width: `${(parseFloat(b.size) / maxSize) * 100}%` }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e', position: 'relative', zIndex: 1 }}>{b.price}¢</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textAlign: 'right', position: 'relative', zIndex: 1 }}>{b.size}</span>
          </div>
        ))}
      </div>
      <div style={{ width: 1, background: '#1C1C1C' }} />
      {/* NO asks */}
      <div style={{ flex: 1 }}>
        <div style={{ padding: '6px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, borderBottom: '1px solid #1C1C1C' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textTransform: 'uppercase' }}>Price (NO)</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textAlign: 'right', textTransform: 'uppercase' }}>Size (AVAX)</span>
        </div>
        {noAsks.map((a, i) => (
          <div key={i} style={{ position: 'relative', padding: '6px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: 'rgba(239,68,68,0.07)', width: `${(parseFloat(a.size) / maxSize) * 100}%` }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#EF4444', position: 'relative', zIndex: 1 }}>{a.price}¢</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textAlign: 'right', position: 'relative', zIndex: 1 }}>{a.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MarketDetail({ marketId }: { marketId: number }) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const contracts = getAddresses(chainId);

  const [tab, setTab] = useState<'chart' | 'depth' | 'activity'>('chart');
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>('buy');
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [amount, setAmount] = useState('0.001');
  const [limitPrice, setLimitPrice] = useState('');

  const { data: core, refetch: refetchCore } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getMarketCore', args: [BigInt(marketId)],
  }) as { data: any; refetch: () => void };

  const { data: meta, refetch: refetchMeta } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getMarketMeta', args: [BigInt(marketId)],
  }) as { data: any; refetch: () => void };

  const market = (core && meta) ? { ...core, ...meta, exists: meta.exists } : undefined;
  const refetch = () => { refetchCore(); refetchMeta(); };

  const { data: probability } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getYesProbability', args: [BigInt(marketId)],
  }) as { data: bigint | undefined };

  const { data: position } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getPosition',
    args: [BigInt(marketId), address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  }) as { data: any };


  // Chainlink live price — oracle markets only
  const isOracle = market?.marketType === 1;
  const { data: oraclePrice, isError: clError } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getCurrentPrice',
    args: [market?.tokenPair ?? 0],
    query: { enabled: !!market && isOracle, refetchInterval: 30_000, retry: 1 },
  }) as { data: [bigint, number] | undefined; isError: boolean };

  // CoinGecko fallback — activates only when Chainlink fails
  const pairMeta       = TOKEN_PAIR_META[Number(market?.tokenPair ?? 0)];
  const needsGecko     = isOracle && (!oraclePrice || clError);
  const { price: geckoPrice, loading: geckoLoading } = useCoinGeckoPrice(
    pairMeta?.coingeckoId ?? '', needsGecko
  );

  // Resolved price + source
  let livePrice: number | null = null;
  let priceSource: 'chainlink' | 'coingecko' | null = null;
  if (oraclePrice && !clError) {
    const [rp, dec] = oraclePrice;
    livePrice = Number(rp) / 10 ** dec;
    priceSource = 'chainlink';
  } else if (geckoPrice !== null) {
    livePrice = geckoPrice;
    priceSource = 'coingecko';
  }

  const { trades, loading: tradesLoading } = useMarketTrades(marketId);

  // ── countdown — hook'lar conditional return'den ÖNCE olmali ──
  const [now, setNow] = useState(Date.now());
  const [chartRange, setChartRange] = useState<'1H'|'1D'|'1W'|'ALL'>('ALL');
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (isSuccess) refetch(); }, [isSuccess]);

  if (!market?.exists) return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      <p style={{ color: '#8888AA', fontFamily: 'var(--font-display)', fontSize: 18 }}>Market not found.</p>
      <Link href="/markets" style={{ color: '#FAFAFA', marginTop: 12, display: 'inline-block' }}>← Back to Markets</Link>
    </div>
  );

  const yesPercent = Number(probability ?? BigInt(50));
  const noPercent  = 100 - yesPercent;

  const endDate2   = new Date(Number(market.endTime) * 1000);
  const msLeft     = Math.max(0, endDate2.getTime() - now);
  const cdDays     = Math.floor(msLeft / 86400000);
  const cdHours    = Math.floor((msLeft % 86400000) / 3600000);
  const cdMins     = Math.floor((msLeft % 3600000) / 60000);
  const cdSecs     = Math.floor((msLeft % 60000) / 1000);
  const countdown  = msLeft === 0 ? 'Ended'
    : cdDays > 0 ? `${cdDays}d ${cdHours}h ${cdMins}m`
    : `${cdHours}h ${cdMins}m ${cdSecs}s`;
  const yesPool    = market.yesPool ?? BigInt(0);
  const noPool     = market.noPool ?? BigInt(0);
  const totalPool  = yesPool + noPool;
  const totalPoolF = parseFloat(formatEther(totalPool));
  const yesPoolF   = parseFloat(formatEther(yesPool));
  const noPoolF    = parseFloat(formatEther(noPool));
  const endDate    = new Date(Number(market.endTime) * 1000);
  const txPending  = isPending || isConfirming;

  const amountNum = Math.max(MIN_AMOUNT, Math.round((parseFloat(amount) || MIN_AMOUNT) * 1000) / 1000);

  // AMM payout calculation (constant product: x*y=k)
  const poolIn  = side === 'yes' ? yesPoolF : noPoolF;
  const poolOut = side === 'yes' ? noPoolF  : yesPoolF;
  const sharesOut = poolOut - (poolIn * poolOut) / (poolIn + amountNum);
  const effectivePrice = amountNum / (sharesOut || 0.001);
  const priceImpact = Math.abs(effectivePrice - (side === 'yes' ? yesPercent : noPercent) / 100) / ((side === 'yes' ? yesPercent : noPercent) / 100) * 100;
  const potentialPayout = sharesOut;
  const potentialProfit = sharesOut - amountNum;
  const maxPayout = sharesOut; // if wins
  const roi = amountNum > 0 ? ((potentialProfit / amountNum) * 100).toFixed(1) : '0';

  const yesShares = position?.yesShares ?? BigInt(0);
  const noShares  = position?.noShares ?? BigInt(0);
  const hasYes = yesShares > BigInt(0);
  const hasNo  = noShares  > BigInt(0);
  const myYesF = parseFloat(formatEther(yesShares));
  const myNoF  = parseFloat(formatEther(noShares));

  // Estimated position value
  const posValue = hasYes ? myYesF * (yesPercent / 100) : hasNo ? myNoF * (noPercent / 100) : 0;

  const handleBuy = () => {
    if (!isConnected) return;
    const amt = Math.round((parseFloat(amount) || MIN_AMOUNT) * 1000) / 1000;
    if (amt < MIN_AMOUNT) { alert(`Min ${MIN_AMOUNT} AVAX`); return; }
    writeContract({
      address: contracts.PredictionMarket, abi: MARKET_ABI,
      functionName: side === 'yes' ? 'buyYes' : 'buyNo',
      args: [BigInt(marketId)],
      value: parseEther(amt.toFixed(3)),
    });
  };

  const handleClaim = () => {
    writeContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'claimReward', args: [BigInt(marketId)] });
  };

  const canClaim = market.resolved && !position?.claimed &&
    ((market.outcome === 1 && hasYes) || (market.outcome === 2 && hasNo));

  const handleAmountChange = (val: string) => {
    const parts = val.split('.');
    if (parts[1]?.length > 3) return;
    setAmount(val);
  };

  const handleAmountBlur = () => {
    const n = parseFloat(amount);
    if (isNaN(n) || n < MIN_AMOUNT) setAmount(MIN_AMOUNT.toFixed(3));
    else setAmount((Math.round(n * 1000) / 1000).toFixed(3));
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Back */}
      <Link href="/markets" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#8888AA', textDecoration: 'none', fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 24, transition: 'color 0.2s' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FAFAFA'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#8888AA'}>
        <ArrowLeft size={16} /> All Markets
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Market header */}
          <div style={{ background: '#111111', border: '1px solid #1C1C1C', borderRadius: 20, padding: '28px 28px 24px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: '#FAFAFA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{market.category}</span>
              {market.resolved ? (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                  ✓ Resolved — {market.outcome === 1 ? 'YES' : 'NO'} Won
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                  ● Active · {cdDays > 0 ? `${cdDays}d` : `${cdHours}h`} left
                </span>
              )}
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(20px,3vw,28px)', color: '#FAFAFA', lineHeight: 1.3, marginBottom: 20 }}>{market.question}</h1>

            {/* Big probability */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginBottom: 4, textTransform: 'uppercase' }}>YES</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48, color: '#22c55e', lineHeight: 1 }}>{yesPercent}¢</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', marginTop: 2 }}>probability</div>
              </div>
              <div style={{ width: 1, background: '#1C1C1C', alignSelf: 'stretch' }} />
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginBottom: 4, textTransform: 'uppercase' }}>NO</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 48, color: '#EF4444', lineHeight: 1 }}>{noPercent}¢</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', marginTop: 2 }}>probability</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
                {[
                  { icon: BarChart3, label: 'Volume', value: `${totalPoolF.toFixed(3)} AVAX` },
                  { icon: Users, label: 'Traders', value: `${Math.round(totalPoolF * 8 + 2)}` },
                  { icon: Clock, label: market.resolved ? 'Ended' : (msLeft === 0 ? 'Ended' : 'Ends in'), value: market.resolved ? endDate.toLocaleDateString() : countdown },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Icon size={13} color="#555570" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>{label}:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FAFAFA' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pool bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#22c55e' }}>YES pool: {yesPoolF.toFixed(3)} AVAX</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#EF4444' }}>NO pool: {noPoolF.toFixed(3)} AVAX</span>
              </div>
              <div style={{ background: '#1C1C1C', borderRadius: 6, height: 10, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${yesPercent}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '6px 0 0 6px', transition: 'width 0.6s ease' }} />
                <div style={{ flex: 1, background: 'linear-gradient(90deg, #dc2626, #7C3AED)', borderRadius: '0 6px 6px 0' }} />
              </div>
            </div>
          </div>

          {/* 🔴 LIVE PRICE PANEL — oracle markets only */}
          {isOracle && !market.resolved && oraclePrice && (() => {
            const TOKEN_META: Record<number, { symbol: string; color: string; bg: string }> = {
              0: { symbol: 'AVAX/USD', color: '#FAFAFA', bg: 'rgba(255,255,255,0.04)' },
              1: { symbol: 'BTC/USD',  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
              2: { symbol: 'ETH/USD',  color: '#6366F1', bg: 'rgba(99,102,241,0.08)' },
              3: { symbol: 'LINK/USD', color: '#888888', bg: 'rgba(59,130,246,0.08)' },
            };
            const meta       = TOKEN_META[Number(market.tokenPair)] ?? TOKEN_META[0];
            const [rawP, dec] = oraclePrice;
            const current    = Number(rawP) / 10 ** dec;
            const target     = Number(market.targetPrice) / 1e8;
            const winning    = market.targetAbove ? current >= target : current <= target;
            const diff       = ((current - target) / target) * 100;
            const progress   = market.targetAbove
              ? Math.min(100, Math.max(0, (current / target) * 100))
              : Math.min(100, Math.max(0, (target / current) * 100));

            return (
              <div style={{
                background: winning ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${winning ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.25)'}`,
                borderRadius: 14, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={13} color={meta.color} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {priceSource === 'chainlink' ? '⚡ Chainlink' : '🦎 CoinGecko'} · {meta.symbol} · Live
                  </span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 6, background: winning ? 'rgba(34,197,94,0.15)' : '#1C1C1C', color: winning ? '#22c55e' : '#FAFAFA', fontWeight: 700 }}>
                    {winning ? '✓ In YES zone' : '✗ In NO zone'}
                  </span>
                </div>

                {/* Price grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0 }}>
                  {/* Live price */}
                  <div style={{ paddingRight: 16 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textTransform: 'uppercase', marginBottom: 4 }}>Live Price</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: meta.color, lineHeight: 1 }}>
                      {current !== null
                        ? `$${current.toLocaleString('en-US', { maximumFractionDigits: current > 1000 ? 0 : 2 })}`
                        : geckoLoading ? 'Loading...' : 'Unavailable'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', marginTop: 3 }}>
                      {priceSource === 'chainlink' ? 'Updates every 30s' : priceSource === 'coingecko' ? 'Via CoinGecko · 60s' : '—'}
                    </div>
                  </div>
                  <div style={{ background: '#1C1C1C' }} />
                  {/* Target price */}
                  <div style={{ padding: '0 16px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Target size={9} /> Target
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: '#FAFAFA', lineHeight: 1 }}>
                      ${target.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8888AA', marginTop: 3 }}>
                      {market.targetAbove ? 'price ≥ target → YES' : 'price ≤ target → YES'}
                    </div>
                  </div>
                  <div style={{ background: '#1C1C1C' }} />
                  {/* Fark */}
                  <div style={{ paddingLeft: 16 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textTransform: 'uppercase', marginBottom: 4 }}>Distance to Target</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, lineHeight: 1, color: current === null ? '#555570' : winning ? '#22c55e' : '#FAFAFA' }}>
                      {current !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '—'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', marginTop: 3 }}>
                      {current === null ? 'fetching...' : winning ? 'target reached' : Math.abs(diff).toFixed(1) + '% away'}
                    </div>
                  </div>
                </div>

                {/* Progress bar — proximity to target */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570' }}>$0</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8888AA' }}>Proximity to target</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: meta.color }}>
                      ${target.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div style={{ background: '#1C1C1C', borderRadius: 8, height: 8, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%', borderRadius: 8,
                      width: `${Math.min(progress, 100)}%`,
                      background: winning
                        ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                        : `linear-gradient(90deg, ${meta.color}88, ${meta.color})`,
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              </div>
            );
          })()}


          {/* Chart / Depth / Activity tabs */}
          <div style={{ background: '#111111', border: '1px solid #1C1C1C', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #1C1C1C' }}>
              {([
                { key: 'chart', label: 'Price History' },
                { key: 'depth', label: 'Market Depth' },
                { key: 'activity', label: 'Activity' },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13,
                  color: tab === t.key ? '#FAFAFA' : '#555570',
                  borderBottom: tab === t.key ? '2px solid #FAFAFA' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ display: tab === 'chart' ? 'block' : 'none', padding: '20px 20px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', textTransform: 'uppercase' }}>YES probability over time</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['1H', '1D', '1W', 'ALL'] as const).map(p => (
                      <button key={p} onClick={() => setChartRange(p)} style={{ background: chartRange === p ? '#1C1C1C' : 'none', border: chartRange === p ? '1px solid #333' : '1px solid transparent', color: chartRange === p ? '#FAFAFA' : '#555570', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', padding: '3px 8px', borderRadius: 4, transition: 'all 0.2s' }}>{p}</button>
                    ))}
                  </div>
                </div>
                {(() => {
                    const now2 = Date.now() / 1000;
                    const rangeMap: Record<string, number> = { '1H': 3600, '1D': 86400, '1W': 604800, 'ALL': Infinity };
                    const cutoff = rangeMap[chartRange];
                    const filtered = chartRange === 'ALL' ? trades : trades.filter(t => t.timestamp && (now2 - t.timestamp) <= cutoff);
                    return <PriceChart trades={filtered} yesPercent={yesPercent} loading={tradesLoading} />;
                  })()}
                <div style={{ display: 'flex', gap: 24, marginTop: 14, paddingTop: 14, borderTop: '1px solid #1C1C1C' }}>
                  {(() => {
                    const now = Math.floor(Date.now() / 1000);
                    const last24h = trades.filter(t => t.timestamp && (now - t.timestamp) < 86400);
                    const probs24h = last24h.map(t => t.isYes ? t.yesProb : 100 - t.yesProb);
                    const high24 = probs24h.length ? Math.max(...probs24h) : yesPercent;
                    const low24  = probs24h.length ? Math.min(...probs24h) : yesPercent;
                    const vol24  = last24h.reduce((s, t) => s + t.amount, 0);
                    const allHigh = trades.length ? Math.max(...trades.map(t => t.isYes ? t.yesProb : 100 - t.yesProb)) : yesPercent;
                    return [
                      { label: '24h High', value: `${high24}¢`, color: '#22c55e' },
                      { label: '24h Low',  value: `${low24}¢`,  color: '#FAFAFA' },
                      { label: '24h Vol',  value: `${vol24.toFixed(3)} AVAX`, color: '#8888AA' },
                      { label: 'All-time High', value: `${allHigh}¢`, color: '#8888AA' },
                    ];
                  })().map(({ label, value, color }) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', marginBottom: 3, textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color, fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
            </div>

            <div style={{ display: tab === 'depth' ? 'block' : 'none' }}>
                <div style={{ padding: '14px 14px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={12} color="#555570" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>AMM pool depth — estimated from liquidity</span>
                </div>
                <MarketDepth yesPool={yesPool} noPool={noPool} />
            </div>

            <div style={{ display: tab === 'activity' ? 'block' : 'none' }}>
                <div style={{ padding: '14px 14px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={12} color="#555570" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>Recent trades in this market</span>
                </div>
                <ActivityFeed trades={trades} loading={tradesLoading} />
            </div>
          </div>

          {/* ── Resolve buttons — admin only, after endTime ── */}
          {!market.resolved && Date.now() / 1000 > Number(market.endTime) && (
            <div style={{ background: '#111111', border: '1px solid #333', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#FAFAFA', marginBottom: 4 }}>
                  Market ended — resolve required
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>
                  {market.marketType === 1 ? 'Oracle market — use Chainlink price feed to resolve.' : 'Manual market — set outcome via Snowtrace admin panel or admin wallet.'}
                </div>
              </div>
              {market.marketType === 1 && (
                <button
                  onClick={() => writeContract({
                    address: contracts.PredictionMarket,
                    abi: MARKET_ABI,
                    functionName: 'resolveWithOracle',
                    args: [BigInt(marketId)],
                  })}
                  disabled={txPending}
                  style={{
                    padding: '10px 22px', background: txPending ? '#1C1C1C' : '#FAFAFA',
                    color: txPending ? '#555' : '#0A0A0A',
                    border: 'none', borderRadius: 10, cursor: txPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
                    transition: 'all 0.2s', whiteSpace: 'nowrap' as const,
                  }}
                >
                  {txPending ? 'Resolving...' : 'Resolve with Oracle'}
                </button>
              )}
            </div>
          )}


        </div>

        {/* RIGHT COLUMN — Trade Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>
          {/* My Position */}
          {(hasYes || hasNo) && (
            <div style={{ background: '#111111', border: '1px solid #222222', borderRadius: 16, padding: '16px 20px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', textTransform: 'uppercase', marginBottom: 12 }}>Your Position</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                {hasYes && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', marginBottom: 2 }}>YES shares</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#22c55e' }}>{myYesF.toFixed(3)}</div>
                  </div>
                )}
                {hasNo && (
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', marginBottom: 2 }}>NO shares</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#FAFAFA' }}>{myNoF.toFixed(3)}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', marginBottom: 2 }}>Est. Value</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#FAFAFA' }}>{posValue.toFixed(3)} <span style={{ fontSize: 12, color: '#8888AA' }}>AVAX</span></div>
                </div>
              </div>

              {/* Sell notice */}
              {!market.resolved && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <AlertCircle size={13} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#F59E0B', lineHeight: 1.5, margin: 0 }}>
                    AMM model — positions settle at resolution. Buy more to increase exposure, or wait for outcome.
                  </p>
                </div>
              )}

              {canClaim && (
                <button onClick={handleClaim} style={{ width: '100%', marginTop: 12, padding: '11px', background: '#22c55e', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  🎉 Claim Winnings
                </button>
              )}
            </div>
          )}

          {/* Trade panel */}
          <div style={{ background: '#111111', border: '1px solid #1C1C1C', borderRadius: 20, overflow: 'hidden' }}>
            {/* Buy / Sell tabs */}
            <div style={{ display: 'flex' }}>
              {[
                { key: 'buy', label: 'Buy', color: '#22c55e' },
                { key: 'sell', label: 'Sell (at resolution)', color: '#FAFAFA' },
              ].map(t => (
                <button key={t.key} onClick={() => setTradeTab(t.key as 'buy' | 'sell')} style={{
                  flex: 1, padding: '14px 0', background: tradeTab === t.key ? (t.key === 'buy' ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)') : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                  color: tradeTab === t.key ? t.color : '#555570',
                  borderBottom: tradeTab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
                  transition: 'all 0.2s',
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tradeTab === 'sell' ? (
                /* Sell panel - explain AMM model */
                <div>
                  <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 12, padding: '16px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <Info size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#F59E0B' }}>AMM Pool Model</span>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#8888AA', lineHeight: 1.6, margin: 0 }}>
                      Avadix uses an <strong style={{ color: '#FAFAFA' }}>AMM (Automated Market Maker)</strong> model. Unlike Polymarket's orderbook, your shares are locked in the liquidity pool until the market resolves.
                    </p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#8888AA', lineHeight: 1.6, margin: '8px 0 0' }}>
                      When the outcome is decided, winning shares are redeemed 1:1 against the pool. You earn a portion of the total pool proportional to your shares.
                    </p>
                  </div>

                  {(hasYes || hasNo) && (
                    <div style={{ background: '#0A0A0A', borderRadius: 12, padding: '14px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', textTransform: 'uppercase', marginBottom: 10 }}>Your expected payout if you win</div>
                      {hasYes && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>{myYesF.toFixed(3)} YES shares</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#22c55e', fontWeight: 600 }}>~{(myYesF * (totalPoolF / (parseFloat(formatEther(yesPool)) || 1))).toFixed(3)} AVAX</span>
                        </div>
                      )}
                      {hasNo && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>{myNoF.toFixed(3)} NO shares</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#FAFAFA', fontWeight: 600 }}>~{(myNoF * (totalPoolF / (parseFloat(formatEther(noPool)) || 1))).toFixed(3)} AVAX</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!hasYes && !hasNo && (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#555570', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      You have no position in this market
                    </div>
                  )}
                </div>
              ) : (
                /* Buy panel */
                <>
                  {/* YES / NO buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { key: 'yes', label: 'YES', pct: yesPercent, color: '#22c55e', bg: 'rgba(34,197,94,' },
                    ].map(s => null)}
                    <button onClick={() => setSide('yes')} style={{
                      padding: '12px 0', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
                      background: side === 'yes' ? 'rgba(34,197,94,0.15)' : '#0A0A0A',
                      border: `2px solid ${side === 'yes' ? 'rgba(34,197,94,0.5)' : '#1C1C1C'}`,
                      color: '#22c55e', transition: 'all 0.2s',
                    }}>
                      YES <span style={{ fontSize: 13, fontWeight: 500 }}>{yesPercent}¢</span>
                    </button>
                    <button onClick={() => setSide('no')} style={{
                      padding: '12px 0', borderRadius: 10, cursor: 'pointer',
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
                      background: side === 'no' ? 'rgba(239,68,68,0.15)' : '#0A0A0A',
                      border: `2px solid ${side === 'no' ? 'rgba(239,68,68,0.5)' : '#1C1C1C'}`,
                      color: '#EF4444', transition: 'all 0.2s',
                    }}>
                      NO <span style={{ fontSize: 13, fontWeight: 500 }}>{noPercent}¢</span>
                    </button>
                  </div>

                  {/* Order type */}
                  <div style={{ display: 'flex', background: '#0A0A0A', borderRadius: 8, padding: 3 }}>
                    {(['market', 'limit'] as const).map(t => (
                      <button key={t} onClick={() => setOrderType(t)} style={{
                        flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, textTransform: 'capitalize',
                        background: orderType === t ? '#1C1C1C' : 'transparent',
                        color: orderType === t ? '#FAFAFA' : '#555570', transition: 'all 0.2s',
                      }}>{t === 'market' ? '⚡ Market' : '📋 Limit'}</button>
                    ))}
                  </div>

                  {orderType === 'limit' && (
                    <div>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Limit Price (¢)</label>
                      <div style={{ background: '#0A0A0A', border: '1px solid #1C1C1C', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                        <input type="number" min="1" max="99" step="1" placeholder={String(side === 'yes' ? yesPercent : noPercent)} value={limitPrice} onChange={e => setLimitPrice(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '10px 0' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>¢</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', marginTop: 4 }}>Limit orders route as market orders on this AMM</div>
                    </div>
                  )}

                  {/* Amount */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase' }}>Amount (AVAX)</label>
                      {balance && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>Balance: {parseFloat(balance.formatted).toFixed(3)}</span>}
                    </div>
                    {/* Quick amounts */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                      {['0.001', '0.01', '0.1', '1'].map(a => (
                        <button key={a} onClick={() => setAmount(a)} style={{ flex: 1, padding: '5px 0', background: amount === a ? '#1C1C1C' : '#0A0A0A', border: `1px solid ${amount === a ? 'rgba(255,255,255,0.3)' : '#1C1C1C'}`, borderRadius: 6, color: amount === a ? '#FAFAFA' : '#555570', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>{a}</button>
                      ))}
                    </div>
                    <div style={{ background: '#0A0A0A', border: `1px solid ${side === 'yes' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.3)'}`, borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', marginRight: 6 }}>AVAX</span>
                      <input type="number" step="0.001" min={MIN_AMOUNT} value={amount} onChange={e => handleAmountChange(e.target.value)} onBlur={handleAmountBlur} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '10px 0' }} />
                      {balance && <button onClick={() => { const b = Math.floor(parseFloat(balance.formatted) * 1000) / 1000; setAmount(b.toFixed(3)); }} style={{ background: 'none', border: 'none', color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>MAX</button>}
                    </div>
                  </div>

                  {/* Payout breakdown */}
                  <div style={{ background: '#0A0A0A', border: '1px solid #1C1C1C', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Order Summary</div>
                    {[
                      { label: 'Avg price', value: `${(effectivePrice * 100).toFixed(1)}¢` },
                      { label: 'Shares out', value: `${potentialPayout.toFixed(3)} ${side.toUpperCase()}` },
                      { label: 'Price impact', value: `${priceImpact.toFixed(1)}%`, color: priceImpact > 5 ? '#F59E0B' : '#8888AA' },
                      { label: 'Max payout', value: `${maxPayout.toFixed(3)} AVAX`, color: '#FAFAFA' },
                      { label: 'Potential profit', value: `${potentialProfit > 0 ? '+' : ''}${potentialProfit.toFixed(3)} AVAX`, color: potentialProfit > 0 ? '#22c55e' : '#FAFAFA' },
                      { label: 'ROI if win', value: `${roi}%`, color: parseFloat(roi) > 0 ? '#22c55e' : '#FAFAFA' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570' }}>{label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: color ?? '#8888AA', fontWeight: 600 }}>{value}</span>
                      </div>
                    ))}
                    {priceImpact > 5 && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 8px', background: 'rgba(245,158,11,0.08)', borderRadius: 6, marginTop: 2 }}>
                        <AlertCircle size={11} color="#F59E0B" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#F59E0B' }}>High price impact — consider smaller trades</span>
                      </div>
                    )}
                  </div>

                  {/* Status messages */}
                  {txPending && (
                    <div style={{ padding: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, color: '#F59E0B', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                      ⏳ {isPending ? 'Awaiting wallet confirmation...' : 'Confirming on Avalanche...'}
                    </div>
                  )}
                  {isSuccess && (
                    <div style={{ padding: '10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, color: '#22c55e', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                      ✓ Trade confirmed on-chain!
                    </div>
                  )}

                  {/* Buy button */}
                  {!isConnected ? (
                    <div style={{ textAlign: 'center' }}><ConnectButton /></div>
                  ) : market.resolved ? (
                    <div style={{ padding: '12px', background: '#1C1C1C', borderRadius: 10, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570' }}>Market resolved — trading closed</div>
                  ) : (
                    <button onClick={handleBuy} disabled={txPending} style={{
                      width: '100%', padding: '14px', border: 'none', borderRadius: 10,
                      background: side === 'yes' ? '#22c55e' : '#EF4444',
                      color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                      cursor: txPending ? 'wait' : 'pointer', opacity: txPending ? 0.7 : 1,
                      boxShadow: `0 0 20px ${side === 'yes' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    }}>
                      {isPending ? 'Awaiting wallet...' : isConfirming ? 'Confirming...' : `Buy ${side.toUpperCase()} — ${amount} AVAX`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .market-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
