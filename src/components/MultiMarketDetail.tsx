'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getAddresses } from '@/lib/contracts/addresses';
import { AVAX_MAINNET_ID } from '@/lib/wagmi';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';

const ADMIN_WALLET = '0xBDe92Af0753d0d3b4bE1c7E1fdfe6C046aC3B8f9'.toLowerCase();

const OPTION_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#EF4444', '#06B6D4', '#F97316'];

const MIN_BET = 0.001;

export default function MultiMarketDetail({ multiId }: { multiId: number }) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId   = useChainId();
  const isMainnet = chainId === AVAX_MAINNET_ID;
  const contracts = getAddresses(chainId);
  const isAdmin   = isConnected && address?.toLowerCase() === ADMIN_WALLET;

  const [selectedOption, setSelectedOption] = useState<number>(0);
  const [amount, setAmount]                 = useState('0.01');
  const [now, setNow]                       = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // ── Contract reads ────────────────────────────────────────────────────────
  const { data: raw, refetch: refetchMarket } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMultiMarket',
    args: [BigInt(multiId)],
    query: { refetchInterval: 10_000 },
  }) as { data: any; refetch: () => void };

  const { data: probsRaw, refetch: refetchProbs } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMultiProbabilities',
    args: [BigInt(multiId)],
    query: { refetchInterval: 10_000 },
  }) as { data: bigint[] | undefined; refetch: () => void };

  const { data: positionRaw, refetch: refetchPos } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMultiPosition',
    args: [BigInt(multiId), address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address, refetchInterval: 10_000 },
  }) as { data: any; refetch: () => void };

  const { data: creationFee } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'MARKET_CREATION_FEE',
  }) as { data: bigint | undefined };

  // ── Tx ───────────────────────────────────────────────────────────────────
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const txPending = isPending || isConfirming;

  useEffect(() => {
    if (isSuccess) {
      refetchMarket();
      refetchProbs();
      refetchPos?.();
    }
  }, [isSuccess]);

  // ── Parse market data ─────────────────────────────────────────────────────
  if (!raw) return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <p style={{ color: '#888', fontFamily: 'var(--font-display)', fontSize: 18 }}>Loading...</p>
    </div>
  );

  const [, question, category, imageURI, endTime, resolved, winnerIndex, optionCount, options, pools, totalShares] = raw as [
    string, string, string, string, bigint, boolean, number, number, string[], bigint[], bigint[]
  ];

  if (!question) return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <p style={{ color: '#888', fontFamily: 'var(--font-display)', fontSize: 18 }}>Market not found.</p>
      <Link href="/markets" style={{ color: '#FAFAFA', marginTop: 12, display: 'inline-block' }}>← Back</Link>
    </div>
  );

  const probs      = probsRaw ? probsRaw.map(p => Number(p)) : Array(optionCount).fill(Math.floor(100 / optionCount));
  const totalPool  = pools ? pools.reduce((a, p) => a + p, 0n) : 0n;
  const totalPoolF = parseFloat(formatEther(totalPool)).toFixed(3);
  const winnerIdx  = resolved && winnerIndex > 0 ? winnerIndex - 1 : null;

  const msLeft    = Math.max(0, Number(endTime) * 1000 - now);
  const cdDays    = Math.floor(msLeft / 86400000);
  const cdHours   = Math.floor((msLeft % 86400000) / 3600000);
  const cdMins    = Math.floor((msLeft % 3600000) / 60000);
  const cdSecs    = Math.floor((msLeft % 60000) / 1000);
  const countdown = msLeft === 0 ? 'Ended' : cdDays > 0 ? `${cdDays}d ${cdHours}h ${cdMins}m` : `${cdHours}h ${cdMins}m ${cdSecs}s`;

  // User position
  const myShares: bigint[] = positionRaw?.shares ?? [];
  const claimed: boolean   = positionRaw?.claimed ?? false;
  const mySharesF          = myShares.map(s => parseFloat(formatEther(s ?? 0n)));
  const hasPosition        = mySharesF.some(s => s > 0);
  const canClaim           = resolved && !claimed && winnerIdx !== null && (myShares[winnerIdx] ?? 0n) > 0n;

  // Buy handler
  const handleBuy = () => {
    if (!isConnected) return;
    const amt = Math.max(MIN_BET, parseFloat(amount) || MIN_BET);
    writeContract({
      address: contracts.PredictionMarket,
      abi: MARKET_ABI,
      functionName: 'buyMultiOption',
      args: [BigInt(multiId), selectedOption, BigInt(0)],
      value: parseEther(amt.toFixed(6)),
    });
  };

  // Claim handler
  const handleClaim = () => {
    writeContract({
      address: contracts.PredictionMarket,
      abi: MARKET_ABI,
      functionName: 'claimMultiReward',
      args: [BigInt(multiId)],
    });
  };

  // Resolve handler (admin)
  const handleResolve = (winIdx: number) => {
    writeContract({
      address: contracts.PredictionMarket,
      abi: MARKET_ABI,
      functionName: 'resolveMultiMarket',
      args: [BigInt(multiId), winIdx],
    });
  };

  const inputStyle = {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '10px 0',
  } as React.CSSProperties;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px 80px' }}>

      {/* ── Top nav ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/markets" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#555570', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 12px', background: '#111', border: '1px solid #1C1C1C', borderRadius: 8 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FAFAFA'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555570'}>
          <ArrowLeft size={13} /> Markets
        </Link>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#333' }}>/</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', textTransform: 'uppercase' }}>{category}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', color: '#93C5FD' }}>🎯 Multi-Option</span>
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 20, alignItems: 'start' }}>

        {/* ══ LEFT ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Header card */}
          <div style={{ background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {/* Image */}
              <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#1C1C1C', border: '1px solid #222' }}>
                {imageURI ? (
                  <img src={imageURI} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, opacity: 0.4 }}>🎯</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#FAFAFA', lineHeight: 1.3, margin: '0 0 8px' }}>{question}</h1>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#888' }}>
                    <TrendingUp size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                    Vol. {totalPoolF} AVAX
                  </span>
                  <span style={{ color: '#333' }}>·</span>
                  {resolved ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                      ✓ Resolved — {winnerIdx !== null ? options[winnerIdx] : '?'} Won
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                      <Clock size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                      {countdown}
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#1C1C1C', color: '#888', textTransform: 'uppercase' }}>{category}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Options probability card */}
          <div style={{ background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 16, padding: '20px 24px' }}>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, margin: '0 0 16px' }}>
              Probabilities · {optionCount} Options
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {options?.map((opt, i) => {
                const pct      = probs[i] ?? 0;
                const color    = OPTION_COLORS[i % OPTION_COLORS.length];
                const isWinner = resolved && winnerIdx === i;
                const poolF    = pools ? parseFloat(formatEther(pools[i] ?? 0n)).toFixed(3) : '0.000';
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: isWinner ? '#22c55e' : color, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: isWinner ? '#22c55e' : '#FAFAFA' }}>
                          {isWinner ? '✓ ' : ''}{opt}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444' }}>{poolF} AVAX</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: isWinner ? '#22c55e' : color, minWidth: 42, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: isWinner ? '#22c55e' : color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin resolve panel */}
          {isAdmin && !resolved && msLeft === 0 && (
            <div style={{ background: '#0D0D0D', border: '1px solid #333', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: '#FAFAFA', marginBottom: 12 }}>
                Admin · Resolve Market
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {options?.map((opt, i) => (
                  <button key={i} onClick={() => handleResolve(i)} disabled={txPending}
                    style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${OPTION_COLORS[i % OPTION_COLORS.length]}44`, background: `${OPTION_COLORS[i % OPTION_COLORS.length]}11`, color: OPTION_COLORS[i % OPTION_COLORS.length], fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, cursor: txPending ? 'not-allowed' : 'pointer', opacity: txPending ? 0.5 : 1, transition: 'all 0.2s' }}>
                    ✓ {opt} Won
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ RIGHT: Trade panel ══ */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Position card */}
          {hasPosition && (
            <div style={{ background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 14, padding: '14px 18px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Your Position</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mySharesF.map((s, i) => s > 0 ? (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: OPTION_COLORS[i % OPTION_COLORS.length] }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#AAAAAA' }}>{options[i]}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: OPTION_COLORS[i % OPTION_COLORS.length] }}>
                      {s.toFixed(4)} shares
                    </span>
                  </div>
                ) : null)}
              </div>
              {canClaim && (
                <button onClick={handleClaim} disabled={txPending}
                  style={{ width: '100%', marginTop: 12, padding: '11px', background: '#22c55e', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, cursor: txPending ? 'wait' : 'pointer', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
                  {txPending ? 'Claiming...' : 'Claim Winnings'}
                </button>
              )}
              {resolved && claimed && (
                <div style={{ marginTop: 10, padding: '8px', background: 'rgba(34,197,94,0.06)', borderRadius: 8, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#22c55e' }}>✓ Reward claimed</div>
              )}
            </div>
          )}

          {/* Buy panel */}
          <div style={{ background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1C1C1C' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#FAFAFA' }}>Buy Shares</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444', marginTop: 2 }}>Pick an outcome to trade</div>
            </div>

            <div style={{ padding: '16px' }}>
              {/* Option selector */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Select Option</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {options?.map((opt, i) => {
                    const color    = OPTION_COLORS[i % OPTION_COLORS.length];
                    const isWinner = resolved && winnerIdx === i;
                    return (
                      <button key={i} onClick={() => setSelectedOption(i)} disabled={resolved}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, cursor: resolved ? 'default' : 'pointer', background: selectedOption === i ? `${color}18` : 'rgba(255,255,255,0.02)', border: `1.5px solid ${selectedOption === i ? color + '66' : '#222'}`, transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isWinner ? '#22c55e' : color }} />
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: isWinner ? '#22c55e' : '#FAFAFA' }}>
                            {isWinner ? '✓ ' : ''}{opt}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: isWinner ? '#22c55e' : color, fontWeight: 700 }}>
                          {probs[i] ?? 0}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              {!resolved && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555', textTransform: 'uppercase' }}>Amount</span>
                      {balance && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444' }}>Bal: {parseFloat(balance.formatted).toFixed(3)} AVAX</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                      {['0.001', '0.01', '0.1', '1'].map(a => (
                        <button key={a} onClick={() => setAmount(a)} style={{ flex: 1, padding: '5px 0', background: amount === a ? '#1C1C1C' : '#111', border: `1px solid ${amount === a ? '#333' : '#1A1A1A'}`, borderRadius: 6, color: amount === a ? '#FAFAFA' : '#444', fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', transition: 'all 0.2s' }}>{a}</button>
                      ))}
                    </div>
                    <div style={{ background: '#111', border: `1px solid ${OPTION_COLORS[selectedOption % OPTION_COLORS.length]}44`, borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444', marginRight: 6 }}>AVAX</span>
                      <input type="number" step="0.001" min={MIN_BET} value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} />
                      {balance && (
                        <button onClick={() => setAmount((Math.floor(parseFloat(balance.formatted) * 1000) / 1000).toFixed(3))} style={{ background: 'none', border: 'none', color: OPTION_COLORS[selectedOption % OPTION_COLORS.length], fontFamily: 'var(--font-mono)', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>MAX</button>
                      )}
                    </div>
                  </div>

                  {/* Tx status */}
                  {txPending && (
                    <div style={{ padding: '9px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, color: '#F59E0B', fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'center', marginBottom: 10 }}>
                      {isPending ? 'Awaiting wallet...' : 'Confirming on Avalanche...'}
                    </div>
                  )}
                  {isSuccess && (
                    <div style={{ padding: '9px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, color: '#22c55e', fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'center', marginBottom: 10 }}>
                      Trade confirmed! ✓
                    </div>
                  )}

                  {/* Buy button */}
                  {!isConnected ? (
                    <div style={{ textAlign: 'center' }}><ConnectButton /></div>
                  ) : (
                    <button onClick={handleBuy} disabled={txPending}
                      style={{ width: '100%', padding: '14px', border: 'none', borderRadius: 12, background: OPTION_COLORS[selectedOption % OPTION_COLORS.length], color: 'white', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, cursor: txPending ? 'wait' : 'pointer', opacity: txPending ? 0.7 : 1, transition: 'all 0.2s' }}>
                      {isPending ? 'Awaiting wallet...' : isConfirming ? 'Confirming...' : `Buy "${options?.[selectedOption]}" — ${amount} AVAX`}
                    </button>
                  )}
                </>
              )}

              {resolved && (
                <div style={{ padding: '12px', background: '#111', borderRadius: 10, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#444' }}>
                  Market resolved — trading closed
                </div>
              )}
            </div>
          </div>

          {/* Snowtrace link */}
          <a href={`https://${isMainnet ? '' : 'testnet.'}snowtrace.io/address/${contracts.PredictionMarket}`} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#0D0D0D', border: '1px solid #1C1C1C', borderRadius: 10, color: '#444', textDecoration: 'none', fontFamily: 'var(--font-mono)', fontSize: 10, transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FAFAFA'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#444'}>
            <ExternalLink size={11} /> View contract on Snowtrace
          </a>
        </div>
      </div>
    </div>
  );
}
