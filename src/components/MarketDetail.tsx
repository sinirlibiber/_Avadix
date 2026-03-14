'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, TrendingUp, Clock, Users, BarChart3, Activity, AlertCircle, CheckCircle, Info, Zap, Target, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';

const TOKEN_PAIR_META: Record<number, { symbol: string; color: string; coingeckoId: string }> = {
  0: { symbol: 'AVAX/USD', color: '#E84142', coingeckoId: 'avalanche-2' },
  1: { symbol: 'BTC/USD',  color: '#F59E0B', coingeckoId: 'bitcoin' },
  2: { symbol: 'ETH/USD',  color: '#6366F1', coingeckoId: 'ethereum' },
  3: { symbol: 'LINK/USD', color: '#2563EB', coingeckoId: 'chainlink' },
};

function useCoinGeckoPrice(id: string, enabled: boolean) {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled || !id) return;
    let c = false;
    const go = async () => {
      try {
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
        const j = await r.json();
        if (!c) setPrice(j[id]?.usd ?? null);
      } catch { if (!c) setPrice(null); }
    };
    go();
    const iv = setInterval(go, 60_000);
    return () => { c = true; clearInterval(iv); };
  }, [id, enabled]);
  return price;
}

const MIN_AMOUNT = 0.001;
const CONTRACT_ADDR = '0x8c2436412BF7f42b1AbC906e0b5F880773B9C69F';
const TRADE_TOPIC0 = '0x482ba39b8e8f0be2dcea6fdf1f91e8c3e3af9ee5a5f55f5d1cdab8e9a88c46fe';

interface TradeEvent {
  hash: string; trader: string; isYes: boolean;
  amount: number; shares: number;
  blockNumber: number; timestamp: number; yesProb: number;
}

function useMarketTrades(marketId: number) {
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let c = false;
    async function load() {
      setLoading(true);
      try {
        const t1 = '0x' + marketId.toString(16).padStart(64, '0');
        const url = `https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api?module=logs&action=getLogs&address=${CONTRACT_ADDR}&topic0=${TRADE_TOPIC0}&topic0_1_opr=and&topic1=${t1}&fromBlock=0&toBlock=99999999&apikey=free`;
        const res = await fetch(url);
        const json = await res.json();
        if (c || !Array.isArray(json.result)) { if (!c) { setTrades([]); setLoading(false); } return; }
        const parsed: TradeEvent[] = [];
        for (const log of json.result) {
          try {
            const trader = '0x' + log.topics[2].slice(26);
            const isYes = log.topics[3].endsWith('1');
            const data = log.data.replace('0x', '');
            const amountF = Number(BigInt('0x' + data.slice(0, 64))) / 1e18;
            const sharesF = Number(BigInt('0x' + data.slice(64, 128))) / 1e18;
            const rawProb = sharesF > 0 ? Math.min(99, Math.max(1, Math.round((amountF / sharesF) * 100))) : 50;
            parsed.push({ hash: log.transactionHash, trader, isYes, amount: amountF, shares: sharesF, blockNumber: parseInt(log.blockNumber, 16), timestamp: parseInt(log.timeStamp, 16), yesProb: isYes ? rawProb : 100 - rawProb });
          } catch { /**/ }
        }
        parsed.sort((a, b) => b.blockNumber - a.blockNumber);
        if (!c) setTrades(parsed);
      } catch { if (!c) setTrades([]); }
      finally { if (!c) setLoading(false); }
    }
    load();
    return () => { c = true; };
  }, [marketId]);
  return { trades, loading };
}

function timeAgo(ts: number) {
  const d = Math.floor(Date.now() / 1000) - ts;
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
function shortAddr(a: string) { return a.slice(0, 6) + '...' + a.slice(-4); }

// ─── SVG Price Chart ──────────────────────────────────────────────────────────
function PriceChart({ trades, yesPercent, loading, range }: { trades: TradeEvent[]; yesPercent: number; loading: boolean; range: string }) {
  const now2 = Date.now() / 1000;
  const rangeMap: Record<string, number> = { '1D': 86400, '1W': 604800, '1M': 2592000, 'ALL': Infinity };
  const filtered = range === 'ALL' ? trades : trades.filter(t => t.timestamp && (now2 - t.timestamp) <= rangeMap[range]);

  const data = filtered.length >= 2
    ? [...filtered].reverse().map((tr, i) => ({ t: i, yes: tr.yesProb }))
    : [{ t: 0, yes: yesPercent }];
  if (data[data.length - 1].yes !== yesPercent) data.push({ t: data.length, yes: yesPercent });

  const w = 600, h = 140, pad = { top: 12, right: 16, bottom: 24, left: 36 };
  const minY = Math.max(0, Math.min(...data.map(d => d.yes)) - 5);
  const maxY = Math.min(100, Math.max(...data.map(d => d.yes)) + 5);
  const range2 = maxY - minY || 10;
  const sx = (i: number) => pad.left + (i / Math.max(1, data.length - 1)) * (w - pad.left - pad.right);
  const sy = (v: number) => pad.top + (1 - (v - minY) / range2) * (h - pad.top - pad.bottom);
  const pts = data.map((d, i) => `${sx(i)},${sy(d.yes)}`).join(' ');
  const areaBottom = `${sx(data.length - 1)},${h - pad.bottom} ${sx(0)},${h - pad.bottom}`;
  const isUp = data.length > 1 ? data[data.length - 1].yes >= data[0].yes : true;
  const color = isUp ? '#22c55e' : '#EF4444';
  const gridVals = [0, 25, 50, 75, 100].filter(v => v >= minY - 2 && v <= maxY + 2);

  if (loading) return <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>Loading chart data...</span></div>;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 140 }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridVals.map(v => (
        <g key={v}>
          <line x1={pad.left} y1={sy(v)} x2={w - pad.right} y2={sy(v)} stroke="#1C1C1C" strokeWidth="1" strokeDasharray="3,3" />
          <text x={pad.left - 4} y={sy(v) + 4} fill="#555570" fontSize="9" textAnchor="end" fontFamily="monospace">{v}%</text>
        </g>
      ))}
      <polygon points={`${pts} ${areaBottom}`} fill="url(#cg)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.length > 1 && (
        <>
          <circle cx={sx(data.length - 1)} cy={sy(data[data.length - 1].yes)} r="4" fill={color} />
          <text x={sx(data.length - 1) + 6} y={sy(data[data.length - 1].yes) + 4} fill={color} fontSize="10" fontFamily="monospace" fontWeight="bold">{yesPercent}%</text>
        </>
      )}
    </svg>
  );
}

// ─── Top Holders ──────────────────────────────────────────────────────────────
function TopHolders({ trades, yesPercent }: { trades: TradeEvent[]; yesPercent: number }) {
  const holderMap: Record<string, { yes: number; no: number }> = {};
  for (const t of trades) {
    if (!holderMap[t.trader]) holderMap[t.trader] = { yes: 0, no: 0 };
    if (t.isYes) holderMap[t.trader].yes += t.shares;
    else holderMap[t.trader].no += t.shares;
  }
  const holders = Object.entries(holderMap)
    .map(([addr, pos]) => ({ addr, value: pos.yes * (yesPercent / 100) + pos.no * ((100 - yesPercent) / 100), yes: pos.yes, no: pos.no }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (holders.length === 0) return (
    <div style={{ textAlign: 'center', padding: '24px 0', color: '#555570', fontFamily: 'var(--font-mono)', fontSize: 12 }}>No traders yet</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {holders.map((h, i) => (
        <div key={h.addr} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: i < holders.length - 1 ? '1px solid #111' : 'none' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444', minWidth: 18 }}>{i + 1}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', flex: 1 }}>{shortAddr(h.addr)}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {h.yes > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>YES {h.yes.toFixed(2)}</span>}
            {h.no > 0  && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>NO {h.no.toFixed(2)}</span>}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#FAFAFA', minWidth: 52, textAlign: 'right' }}>{h.value.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Market Depth ─────────────────────────────────────────────────────────────
function MarketDepth({ yesPool, noPool }: { yesPool: bigint; noPool: bigint }) {
  const ye = parseFloat(formatEther(yesPool));
  const no = parseFloat(formatEther(noPool));
  const total = ye + no || 1;
  const genDepth = (pool: number, counter: number, isYes: boolean) =>
    [0.001, 0.01, 0.05, 0.1, 0.5].map(size => {
      const out = counter - (pool * counter) / (pool + size);
      const eff = out > 0 ? Math.min(99, Math.max(1, Math.round((size / out) * 100))) : 50;
      return { price: isYes ? eff : 100 - eff, size: size.toFixed(3) };
    });
  const yesBids = genDepth(ye, no, true);
  const noAsks = genDepth(no, ye, false);
  const maxSize = Math.max(...[...yesBids, ...noAsks].map(d => parseFloat(d.size)));
  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1 }}>
        <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #111' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#555570', textTransform: 'uppercase' }}>Price (YES)</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#555570', textAlign: 'right', textTransform: 'uppercase' }}>Size</span>
        </div>
        {yesBids.map((b, i) => (
          <div key={i} style={{ position: 'relative', padding: '6px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(34,197,94,0.07)', width: `${(parseFloat(b.size) / maxSize) * 100}%` }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e', position: 'relative', zIndex: 1 }}>{b.price}¢</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textAlign: 'right', position: 'relative', zIndex: 1 }}>{b.size}</span>
          </div>
        ))}
      </div>
      <div style={{ width: 1, background: '#1C1C1C' }} />
      <div style={{ flex: 1 }}>
        <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #111' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#555570', textTransform: 'uppercase' }}>Price (NO)</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#555570', textAlign: 'right', textTransform: 'uppercase' }}>Size</span>
        </div>
        {noAsks.map((a, i) => (
          <div key={i} style={{ position: 'relative', padding: '6px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: 'rgba(239,68,68,0.07)', width: `${(parseFloat(a.size) / maxSize) * 100}%` }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#EF4444', position: 'relative', zIndex: 1 }}>{a.price}¢</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textAlign: 'right', position: 'relative', zIndex: 1 }}>{a.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MarketDetail({ marketId }: { marketId: number }) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const contracts = getAddresses(chainId);

  const [tab, setTab]             = useState<'chart' | 'depth' | 'activity' | 'holders'>('chart');
  const [tradeTab, setTradeTab]   = useState<'buy' | 'sell'>('buy');
  const [side, setSide]           = useState<'yes' | 'no'>('yes');
  const [amount, setAmount]       = useState('0.01');
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('ALL');
  const [now, setNow]             = useState(Date.now());

  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);

  const { data: core, refetch: refetchCore } = useReadContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'getMarketCore', args: [BigInt(marketId)] }) as { data: any; refetch: () => void };
  const { data: meta, refetch: refetchMeta } = useReadContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'getMarketMeta', args: [BigInt(marketId)] }) as { data: any; refetch: () => void };
  const market = (core && meta) ? { ...core, ...meta, exists: meta.exists } : undefined;
  const refetch = () => { refetchCore(); refetchMeta(); };

  const { data: probability } = useReadContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'getYesProbability', args: [BigInt(marketId)] }) as { data: bigint | undefined };
  const { data: position }    = useReadContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'getPosition', args: [BigInt(marketId), address ?? '0x0000000000000000000000000000000000000000'], query: { enabled: !!address } }) as { data: any };

  const isOracle = market?.marketType === 1;
  const { data: oraclePrice, isError: clError } = useReadContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'getCurrentPrice', args: [market?.tokenPair ?? 0], query: { enabled: !!market && isOracle, refetchInterval: 30_000, retry: 1 } }) as { data: [bigint, number] | undefined; isError: boolean };
  const pairMeta = TOKEN_PAIR_META[Number(market?.tokenPair ?? 0)];
  const geckoPrice = useCoinGeckoPrice(pairMeta?.coingeckoId ?? '', isOracle && (!oraclePrice || clError));
  let livePrice: number | null = null;
  if (oraclePrice && !clError) livePrice = Number(oraclePrice[0]) / 10 ** oraclePrice[1];
  else if (geckoPrice !== null) livePrice = geckoPrice;

  const { trades, loading: tradesLoading } = useMarketTrades(marketId);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if (isSuccess) refetch(); }, [isSuccess]);

  if (!market?.exists) return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <p style={{ color: '#8888AA', fontFamily: 'var(--font-display)', fontSize: 18 }}>Market not found.</p>
      <Link href="/markets" style={{ color: '#FAFAFA', marginTop: 12, display: 'inline-block' }}>← Back</Link>
    </div>
  );

  const yesPercent = Number(probability ?? BigInt(50));
  const noPercent  = 100 - yesPercent;
  const endDate    = new Date(Number(market.endTime) * 1000);
  const msLeft     = Math.max(0, endDate.getTime() - now);
  const cdDays     = Math.floor(msLeft / 86400000);
  const cdHours    = Math.floor((msLeft % 86400000) / 3600000);
  const cdMins     = Math.floor((msLeft % 3600000) / 60000);
  const cdSecs     = Math.floor((msLeft % 60000) / 1000);
  const countdown  = msLeft === 0 ? 'Ended' : cdDays > 0 ? `${cdDays}d ${cdHours}h ${cdMins}m` : `${cdHours}h ${cdMins}m ${cdSecs}s`;
  const yesPool    = market.yesPool ?? BigInt(0);
  const noPool     = market.noPool  ?? BigInt(0);
  const totalPoolF = parseFloat(formatEther(yesPool + noPool));
  const yesPoolF   = parseFloat(formatEther(yesPool));
  const noPoolF    = parseFloat(formatEther(noPool));
  const txPending  = isPending || isConfirming;

  // CPMM preview
  const amt     = Math.max(MIN_AMOUNT, parseFloat(amount) || MIN_AMOUNT);
  const pIn     = side === 'yes' ? yesPoolF + 0.1 : noPoolF + 0.1;
  const pOut    = side === 'yes' ? noPoolF  + 0.1 : yesPoolF + 0.1;
  const sharesOut     = Math.max(0, pOut - (pIn * pOut) / (pIn + amt));
  const effectivePrice = amt / (sharesOut || 0.001);
  const spotPrice      = side === 'yes' ? yesPercent / 100 : noPercent / 100;
  const priceImpact    = Math.abs(effectivePrice - spotPrice) / spotPrice * 100;
  const potentialProfit = sharesOut - amt;
  const roi            = amt > 0 ? ((potentialProfit / amt) * 100).toFixed(1) : '0';

  const yesShares = position?.yesShares ?? BigInt(0);
  const noShares  = position?.noShares  ?? BigInt(0);
  const hasYes = yesShares > BigInt(0);
  const hasNo  = noShares  > BigInt(0);
  const myYesF = parseFloat(formatEther(yesShares));
  const myNoF  = parseFloat(formatEther(noShares));
  const canClaim = market.resolved && !position?.claimed && ((market.outcome === 1 && hasYes) || (market.outcome === 2 && hasNo));

  const handleBuy = () => {
    if (!isConnected) return;
    writeContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: side === 'yes' ? 'buyYes' : 'buyNo', args: [BigInt(marketId), BigInt(0)], value: parseEther(Math.max(MIN_AMOUNT, amt).toFixed(6)) });
  };
  const handleSell = (isYes: boolean, sharesAmt: number) => {
    if (!isConnected || sharesAmt <= 0) return;
    // position'dan doğrudan BigInt olarak al — float hatası yok
    const sharesWei = isYes ? yesShares : noShares;
    writeContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'sellShares', args: [BigInt(marketId), isYes, sharesWei, BigInt(0)] });
  };
  const handleClaim = () => {
    writeContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'claimReward', args: [BigInt(marketId)] });
  };

  // 24h stats
  const nowSec = Math.floor(Date.now() / 1000);
  const last24h = trades.filter(t => t.timestamp && (nowSec - t.timestamp) < 86400);
  const vol24 = last24h.reduce((s, t) => s + t.amount, 0);
  const probs24 = last24h.map(t => t.yesProb);
  const high24 = probs24.length ? Math.max(...probs24) : yesPercent;
  const low24  = probs24.length ? Math.min(...probs24) : yesPercent;

  const { imageData } = (() => {
    const raw = market.imageURI ?? '';
    const idx = raw.indexOf('|||');
    return idx >= 0 ? { imageData: raw.slice(idx + 3) || null } : { imageData: raw.startsWith('data:') ? raw : null };
  })();

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px 80px' }}>

      {/* ── TOP NAV ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/markets" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#555570', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 12px', background: '#111', border: '1px solid #1C1C1C', borderRadius: 8 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FAFAFA'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555570'}>
          <ArrowLeft size={13} /> Markets
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#333' }}>/</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', textTransform: 'uppercase' }}>{market.category}</span>
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 20, alignItems: 'start' }}>

        {/* ════ LEFT COLUMN ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Market Header Card ── */}
          <div style={{ background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 16, overflow: 'hidden' }}>
            {/* Cover image */}
            {imageData && (
              <div style={{ height: 160, overflow: 'hidden', position: 'relative' }}>
                <img src={imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #0D0D0D)' }} />
              </div>
            )}
            <div style={{ padding: '20px 24px 20px' }}>
              {/* Badges row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: '#1C1C1C', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{market.category}</span>
                {market.resolved ? (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>✓ Resolved — {market.outcome === 1 ? 'YES' : 'NO'} Won</span>
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>● Active · {countdown}</span>
                )}
                {isOracle && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>⚡ Oracle</span>}
              </div>

              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px,2.5vw,26px)', color: '#FAFAFA', lineHeight: 1.3, marginBottom: 20 }}>{market.question}</h1>

              {/* YES / NO big numbers + stats */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>YES</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 44, color: '#22c55e', lineHeight: 1 }}>{yesPercent}<span style={{ fontSize: 22 }}>¢</span></div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', marginTop: 3 }}>probability</div>
                </div>
                <div style={{ width: 1, background: '#1C1C1C', alignSelf: 'stretch', margin: '0 20px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>NO</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 44, color: '#EF4444', lineHeight: 1 }}>{noPercent}<span style={{ fontSize: 22 }}>¢</span></div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', marginTop: 3 }}>probability</div>
                </div>
                <div style={{ width: 1, background: '#1C1C1C', alignSelf: 'stretch', margin: '0 20px' }} />
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px' }}>
                  {[
                    { label: 'Volume', value: `${totalPoolF.toFixed(3)} AVAX` },
                    { label: '24h Vol', value: `${vol24.toFixed(3)} AVAX` },
                    { label: '24h High', value: `${high24}¢` },
                    { label: '24h Low', value: `${low24}¢` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FAFAFA', fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pool bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#22c55e' }}>YES {yesPoolF.toFixed(3)} AVAX</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#EF4444' }}>NO {noPoolF.toFixed(3)} AVAX</span>
                </div>
                <div style={{ background: '#1C1C1C', borderRadius: 6, height: 8, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${yesPercent}%`, background: 'linear-gradient(90deg,#22c55e,#16a34a)', transition: 'width 0.6s ease' }} />
                  <div style={{ flex: 1, background: 'linear-gradient(90deg,#dc2626,#991b1b)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Oracle Live Price ── */}
          {isOracle && !market.resolved && livePrice !== null && (() => {
            const target = Number(market.targetPrice) / 1e8;
            const winning = market.targetAbove ? livePrice! >= target : livePrice! <= target;
            const diff = ((livePrice! - target) / target) * 100;
            return (
              <div style={{ background: winning ? 'rgba(34,197,94,0.05)' : '#0D0D0D', border: `1px solid ${winning ? 'rgba(34,197,94,0.2)' : '#1C1C1C'}`, borderRadius: 14, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Zap size={12} color={pairMeta.color} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: pairMeta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{pairMeta.symbol} · Live Price</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 6, background: winning ? 'rgba(34,197,94,0.15)' : '#1C1C1C', color: winning ? '#22c55e' : '#EF4444', fontWeight: 700 }}>
                    {winning ? '✓ YES zone' : '✗ NO zone'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Current', value: `$${livePrice!.toLocaleString('en-US', { maximumFractionDigits: livePrice! > 1000 ? 0 : 2 })}`, color: pairMeta.color },
                    { label: 'Target', value: `$${target.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: '#FAFAFA' },
                    { label: 'Distance', value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, color: winning ? '#22c55e' : '#EF4444' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, background: '#111', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, (livePrice! / target) * 100))}%`, height: '100%', background: winning ? 'linear-gradient(90deg,#16a34a,#22c55e)' : `linear-gradient(90deg,${pairMeta.color}88,${pairMeta.color})`, transition: 'width 0.8s' }} />
                </div>
              </div>
            );
          })()}

          {/* ── Chart / Depth / Activity / Holders tabs ── */}
          <div style={{ background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 16, overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1C1C1C' }}>
              {(['chart', 'depth', 'activity', 'holders'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '13px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12,
                  color: tab === t ? '#FAFAFA' : '#444',
                  borderBottom: tab === t ? '2px solid #FAFAFA' : '2px solid transparent',
                  textTransform: 'capitalize', transition: 'color 0.2s',
                }}>{t === 'holders' ? 'Top Holders' : t === 'depth' ? 'Depth' : t === 'chart' ? 'Price Chart' : 'Activity'}</button>
              ))}
            </div>

            {/* Chart */}
            {tab === 'chart' && <div style={{ padding: '16px 20px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.06em' }}>YES probability</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['1D', '1W', '1M', 'ALL'] as const).map(p => (
                    <button key={p} onClick={() => setChartRange(p)} style={{ background: chartRange === p ? '#1C1C1C' : 'none', border: chartRange === p ? '1px solid #333' : '1px solid transparent', color: chartRange === p ? '#FAFAFA' : '#444', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', padding: '3px 8px', borderRadius: 4, transition: 'all 0.2s' }}>{p}</button>
                  ))}
                </div>
              </div>
              <PriceChart trades={trades} yesPercent={yesPercent} loading={tradesLoading} range={chartRange} />
            </div>}

            {/* Depth */}
            {tab === 'depth' && <div style={{ paddingTop: 4 }}>
              <div style={{ padding: '10px 16px 6px', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Info size={11} color="#444" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444' }}>CPMM pool depth</span>
              </div>
              <MarketDepth yesPool={yesPool} noPool={noPool} />
            </div>

            {/* Activity */}
            {tab === 'activity' && <div>
              <div style={{ padding: '10px 16px 6px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid #111' }}>
                <Activity size={11} color="#444" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444' }}>Recent trades · {trades.length} total</span>
              </div>
              {tradesLoading ? (
                <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444' }}>Fetching on-chain data...</div>
              ) : trades.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444' }}>No trades yet — be the first!</div>
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {trades.slice(0, 30).map((t, i) => (
                    <a key={i} href={`https://testnet.snowtrace.io/tx/${t.hash}`} target="_blank" rel="noreferrer"
                      style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 70px 60px', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #0A0A0A', textDecoration: 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: t.isYes ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: t.isYes ? '#22c55e' : '#EF4444', fontWeight: 700, textAlign: 'center' }}>{t.isYes ? 'YES' : 'NO'}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888' }}>{shortAddr(t.trader)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#FAFAFA', textAlign: 'right' }}>{t.amount.toFixed(3)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555', textAlign: 'right' }}>@ {t.yesProb}¢</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444', textAlign: 'right' }}>{t.timestamp ? timeAgo(t.timestamp) : `#${t.blockNumber}`}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>}

            {/* Top Holders */}
            {tab === 'holders' && <div>
              <div style={{ padding: '10px 16px 6px', display: 'grid', gridTemplateColumns: '18px 1fr auto 60px', gap: 10, borderBottom: '1px solid #111' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', textTransform: 'uppercase' }}>#</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', textTransform: 'uppercase' }}>Address</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', textTransform: 'uppercase' }}>Position</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', textTransform: 'uppercase', textAlign: 'right' }}>Value</span>
              </div>
              <TopHolders trades={trades} yesPercent={yesPercent} />
            </div>}
          </div>

          {/* ── Resolve banner ── */}
          {!market.resolved && Date.now() / 1000 > Number(market.endTime) && (
            <div style={{ background: '#0D0D0D', border: '1px solid #333', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#FAFAFA', marginBottom: 3 }}>Market ended — resolve required</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555' }}>{market.marketType === 1 ? 'Oracle market — Chainlink auto-resolution' : 'Manual market — admin resolves via Snowtrace'}</div>
              </div>
              {market.marketType === 1 && (
                <button onClick={() => writeContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'resolveWithOracle', args: [BigInt(marketId)] })} disabled={txPending} style={{ padding: '9px 20px', background: txPending ? '#1C1C1C' : '#FAFAFA', color: txPending ? '#555' : '#0A0A0A', border: 'none', borderRadius: 8, cursor: txPending ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' as const }}>
                  {txPending ? 'Resolving...' : 'Resolve with Oracle'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN — Trade Panel ════ */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Position card */}
          {(hasYes || hasNo) && (
            <div style={{ background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Your Position</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                {hasYes && <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#22c55e', marginBottom: 2 }}>YES Shares</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#22c55e' }}>{myYesF.toFixed(3)}</div></div>}
                {hasNo  && <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#EF4444', marginBottom: 2 }}>NO Shares</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#EF4444' }}>{myNoF.toFixed(3)}</div></div>}
                <div style={{ marginLeft: 'auto' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555', marginBottom: 2 }}>Est. Value</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#FAFAFA' }}>{(myYesF * (yesPercent / 100) + myNoF * (noPercent / 100)).toFixed(3)} <span style={{ fontSize: 10, color: '#555' }}>AVAX</span></div>
                </div>
              </div>
              {canClaim && (
                <button onClick={handleClaim} style={{ width: '100%', padding: '11px', background: '#22c55e', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
                  Claim Winnings
                </button>
              )}
            </div>
          )}

          {/* Trade Panel */}
          <div style={{ background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 16, overflow: 'hidden' }}>
            {/* Buy / Sell tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1C1C1C' }}>
              {[{ key: 'buy', label: 'Buy' }, { key: 'sell', label: 'Sell' }].map(t => (
                <button key={t.key} onClick={() => setTradeTab(t.key as 'buy' | 'sell')} style={{
                  flex: 1, padding: '13px 0', background: tradeTab === t.key ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                  color: tradeTab === t.key ? '#FAFAFA' : '#444',
                  borderBottom: tradeTab === t.key ? '2px solid #FAFAFA' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ padding: '16px' }}>
              {tradeTab === 'sell' ? (
                /* ── Sell Panel ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!hasYes && !hasNo ? (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: '#444', fontFamily: 'var(--font-mono)', fontSize: 12 }}>No position to sell</div>
                  ) : (
                    <>
                      {hasYes && (
                        <div style={{ background: '#111', borderRadius: 12, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#22c55e' }}>YES · {myYesF.toFixed(4)} shares</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555' }}>~{(myYesF * (yesPercent / 100)).toFixed(4)} AVAX</span>
                          </div>
                          <button onClick={() => handleSell(true, myYesF)} disabled={txPending} style={{ width: '100%', padding: '9px', background: txPending ? '#1C1C1C' : 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, cursor: txPending ? 'not-allowed' : 'pointer' }}>
                            {txPending ? 'Processing...' : 'Sell YES shares'}
                          </button>
                        </div>
                      )}
                      {hasNo && (
                        <div style={{ background: '#111', borderRadius: 12, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#EF4444' }}>NO · {myNoF.toFixed(4)} shares</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555' }}>~{(myNoF * (noPercent / 100)).toFixed(4)} AVAX</span>
                          </div>
                          <button onClick={() => handleSell(false, myNoF)} disabled={txPending} style={{ width: '100%', padding: '9px', background: txPending ? '#1C1C1C' : 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#EF4444', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, cursor: txPending ? 'not-allowed' : 'pointer' }}>
                            {txPending ? 'Processing...' : 'Sell NO shares'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#333', textAlign: 'center' }}>CPMM slippage applies</p>
                </div>
              ) : (
                /* ── Buy Panel ── */
                <>
                  {/* YES / NO buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    <button onClick={() => setSide('yes')} style={{ padding: '12px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, background: side === 'yes' ? 'rgba(34,197,94,0.15)' : '#111', border: `1.5px solid ${side === 'yes' ? 'rgba(34,197,94,0.4)' : '#1C1C1C'}`, color: '#22c55e', transition: 'all 0.2s' }}>
                      YES <span style={{ fontSize: 12, fontWeight: 500 }}>{yesPercent}¢</span>
                    </button>
                    <button onClick={() => setSide('no')} style={{ padding: '12px 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, background: side === 'no' ? 'rgba(239,68,68,0.15)' : '#111', border: `1.5px solid ${side === 'no' ? 'rgba(239,68,68,0.4)' : '#1C1C1C'}`, color: '#EF4444', transition: 'all 0.2s' }}>
                      NO <span style={{ fontSize: 12, fontWeight: 500 }}>{noPercent}¢</span>
                    </button>
                  </div>

                  {/* Amount */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555', textTransform: 'uppercase' }}>Amount</span>
                      {balance && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444' }}>Bal: {parseFloat(balance.formatted).toFixed(3)} AVAX</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                      {['0.001', '0.01', '0.1', '1'].map(a => (
                        <button key={a} onClick={() => setAmount(a)} style={{ flex: 1, padding: '5px 0', background: amount === a ? '#1C1C1C' : '#111', border: `1px solid ${amount === a ? '#333' : '#1A1A1A'}`, borderRadius: 6, color: amount === a ? '#FAFAFA' : '#444', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', transition: 'all 0.2s' }}>{a}</button>
                      ))}
                    </div>
                    <div style={{ background: '#111', border: `1px solid ${side === 'yes' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444', marginRight: 6 }}>AVAX</span>
                      <input type="number" step="0.001" min={MIN_AMOUNT} value={amount} onChange={e => setAmount(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '10px 0' }} />
                      {balance && <button onClick={() => setAmount((Math.floor(parseFloat(balance.formatted) * 1000) / 1000).toFixed(3))} style={{ background: 'none', border: 'none', color: side === 'yes' ? '#22c55e' : '#EF4444', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>MAX</button>}
                    </div>
                  </div>

                  {/* Order summary */}
                  <div style={{ background: '#111', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Order Summary</div>
                    {[
                      { label: 'Avg price', value: `${(effectivePrice * 100).toFixed(1)}¢` },
                      { label: 'Shares', value: `${sharesOut.toFixed(4)} ${side.toUpperCase()}`, color: side === 'yes' ? '#22c55e' : '#EF4444' },
                      { label: 'Price impact', value: `${priceImpact.toFixed(1)}%`, color: priceImpact > 5 ? '#F59E0B' : '#555' },
                      { label: 'Max payout', value: `${sharesOut.toFixed(4)} AVAX`, color: '#FAFAFA' },
                      { label: 'Potential profit', value: `${potentialProfit > 0 ? '+' : ''}${potentialProfit.toFixed(4)} AVAX`, color: potentialProfit > 0 ? '#22c55e' : '#EF4444' },
                      { label: 'ROI if win', value: `${roi}%`, color: parseFloat(roi) > 0 ? '#22c55e' : '#EF4444' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444' }}>{label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: color ?? '#888', fontWeight: 600 }}>{value}</span>
                      </div>
                    ))}
                    {priceImpact > 5 && (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '5px 8px', background: 'rgba(245,158,11,0.06)', borderRadius: 6, marginTop: 4 }}>
                        <AlertCircle size={10} color="#F59E0B" />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#F59E0B' }}>High price impact — try smaller amount</span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  {txPending && <div style={{ padding: '9px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, color: '#F59E0B', fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'center', marginBottom: 10 }}>{isPending ? 'Awaiting wallet...' : 'Confirming on Avalanche...'}</div>}
                  {isSuccess && <div style={{ padding: '9px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, color: '#22c55e', fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'center', marginBottom: 10 }}>Trade confirmed!</div>}

                  {/* Buy button */}
                  {!isConnected ? (
                    <div style={{ textAlign: 'center' }}><ConnectButton /></div>
                  ) : market.resolved ? (
                    <div style={{ padding: '12px', background: '#111', borderRadius: 10, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444' }}>Market resolved — trading closed</div>
                  ) : (
                    <button onClick={handleBuy} disabled={txPending} style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 12, background: side === 'yes' ? '#22c55e' : '#EF4444', color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, cursor: txPending ? 'wait' : 'pointer', opacity: txPending ? 0.7 : 1, transition: 'all 0.2s' }}>
                      {isPending ? 'Awaiting wallet...' : isConfirming ? 'Confirming...' : `Buy ${side.toUpperCase()} — ${amount} AVAX`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Snowtrace link */}
          <a href={`https://testnet.snowtrace.io/address/${contracts.PredictionMarket}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 10, color: '#444', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: 10, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FAFAFA'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#444'}>
            <ExternalLink size={11} /> View contract on Snowtrace
          </a>
        </div>
      </div>
    </div>
  );
}
