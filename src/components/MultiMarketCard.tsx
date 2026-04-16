'use client';

import { useState } from 'react';
import { TrendingUp, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';

const CATEGORY_COLORS: Record<string, string> = {
  crypto: '#F59E0B', avax: '#FAFAFA', politics: '#8B5CF6',
  sports: '#10B981', tech: '#888888', business: '#666666',
  nba: '#F97316', esports: '#EC4899', culture: '#FAFAFA',
};

interface Props {
  multiId: number;
  filterCategory?: string;
  filterSearch?: string;
  filterStatus?: 'active' | 'resolved' | 'all';
}

export default function MultiMarketCard({ multiId, filterCategory, filterSearch, filterStatus = 'active' }: Props) {
  const chainId   = useChainId();
  const contracts = getAddresses(chainId);
  const [imgError, setImgError] = useState(false);

  const { data: raw } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMultiMarket',
    args: [BigInt(multiId)],
    query: { refetchInterval: 15_000 },
  }) as { data: any };

  const { data: probsRaw } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMultiProbabilities',
    args: [BigInt(multiId)],
  }) as { data: bigint[] | undefined };

  if (!raw) return null;

  // getMultiMarket returns tuple: (creator, question, category, imageURI, endTime, resolved, winnerIndex, optionCount, options, pools, totShares)
  const [creator, question, category, imageURI, endTime, resolved, winnerIndex, optionCount, options, pools] = raw as [
    string, string, string, string, bigint, boolean, number, number, string[], bigint[], bigint[]
  ];

  if (!question) return null;

  // Filters
  const cat = category?.toLowerCase() ?? '';
  const q   = question?.toLowerCase() ?? '';
  if (filterCategory && filterCategory !== 'all' && cat !== filterCategory.toLowerCase()) return null;
  if (filterSearch && filterSearch.trim() && !q.includes(filterSearch.toLowerCase())) return null;
  if (filterStatus === 'active'   && resolved)  return null;
  if (filterStatus === 'resolved' && !resolved) return null;

  const catColor  = CATEGORY_COLORS[cat] || '#FAFAFA';
  const endDate   = new Date(Number(endTime) * 1000);
  const daysLeft  = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const hasImage  = imageURI?.length > 0 && !imgError;
  const probs     = probsRaw ? probsRaw.map(p => Number(p)) : Array(optionCount).fill(Math.floor(100 / optionCount));

  // total pool
  const totalPool = pools ? pools.reduce((acc, p) => acc + p, 0n) : 0n;
  const totalPoolF = parseFloat(formatEther(totalPool)).toFixed(3);

  const winnerIdx = resolved && winnerIndex > 0 ? winnerIndex - 1 : null; // 0-indexed

  return (
    <div
      style={{
        background: '#111111', border: '1px solid #1C1C1C',
        borderRadius: 14, overflow: 'hidden', transition: 'all 0.25s',
        display: 'flex', flexDirection: 'column', cursor: 'pointer', height: '100%',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(59,130,246,0.25)';
        el.style.background  = '#141414';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = '#1C1C1C';
        el.style.background  = '#111111';
      }}
    >
      {/* Header */}
      <Link href={`/markets/multi-${multiId}`} style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', gap: 12, padding: '14px 14px 0' }}>
          {/* Image */}
          <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#0A0A0A', border: '1px solid #1C1C1C' }}>
            {hasImage ? (
              <img src={imageURI} alt="" onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${catColor}15, rgba(59,130,246,0.08))` }}>
                <span style={{ fontSize: 20, opacity: 0.5 }}>
                  {cat === 'sports' ? '⚽' : cat === 'politics' ? '🗳️' : cat === 'crypto' ? '🔮' : '📊'}
                </span>
              </div>
            )}
          </div>

          {/* Question + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#FAFAFA', lineHeight: 1.4, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
              {question}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 6px', borderRadius: 8, textTransform: 'uppercase', background: `${catColor}20`, color: catColor }}>{cat}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 5px', borderRadius: 8, background: 'rgba(59,130,246,0.15)', color: '#93C5FD' }}>
                🎯 {optionCount} options
              </span>
              {resolved && winnerIdx !== null && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, padding: '1px 6px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                  ✓ {options[winnerIdx]}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Options probability bars */}
      <div style={{ padding: '10px 14px 0' }}>
        {options?.slice(0, 4).map((opt, i) => {
          const pct       = probs[i] ?? 0;
          const isWinner  = resolved && winnerIdx === i;
          const barColor  = isWinner ? '#22c55e' : i === 0 ? '#3B82F6' : i === 1 ? '#8B5CF6' : i === 2 ? '#F59E0B' : '#EC4899';
          return (
            <div key={i} style={{ marginBottom: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isWinner ? '#22c55e' : '#AAAAAA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                  {isWinner ? '✓ ' : ''}{opt}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: isWinner ? '#22c55e' : '#555555', flexShrink: 0 }}>
                  {pct}%
                </span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          );
        })}
        {options?.length > 4 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#444', marginTop: 2 }}>
            +{options.length - 4} more options
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px 14px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444' }}>
              <TrendingUp size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />{totalPoolF} AVAX
            </span>
            {!resolved && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#444' }}>
                <Clock size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />{daysLeft}d
              </span>
            )}
          </div>
          <Link href={`/markets/multi-${multiId}`} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3B82F6' }}>
              View <ArrowRight size={10} />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
