'use client';

import { useState } from 'react';
import { TrendingUp, Clock, Droplets, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';

const CATEGORY_COLORS: Record<string, string> = {
  crypto: '#F59E0B', avax: '#E84142', politics: '#8B5CF6',
  sports: '#10B981', tech: '#3B82F6',
};

interface Props { marketId: number; }

export default function MarketCard({ marketId }: Props) {
  const chainId = useChainId();
  const contracts = getAddresses(chainId);

  const { data: market } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getMarket', args: [BigInt(marketId)],
  }) as { data: any };

  const { data: probability } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getYesProbability', args: [BigInt(marketId)],
  }) as { data: bigint | undefined };

  if (!market?.exists) return null;

  const yesPercent = Number(probability ?? BigInt(50));
  const noPercent  = 100 - yesPercent;
  const category   = market.category?.toLowerCase() ?? 'crypto';
  const catColor   = CATEGORY_COLORS[category] || '#E84142';
  const endDate    = new Date(Number(market.endTime) * 1000);
  const daysLeft   = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const yesPool    = market.yesPool ?? BigInt(0);
  const noPool     = market.noPool ?? BigInt(0);
  const totalPool  = yesPool + noPool;
  const totalPoolF = parseFloat(formatEther(totalPool)).toFixed(3);
  const isUp = yesPercent >= 50;

  return (
    <Link href={`/markets/${marketId}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#12121A', border: '1px solid #1E1E2E',
        borderRadius: 16, padding: 20, transition: 'all 0.25s ease',
        display: 'flex', flexDirection: 'column', gap: 14, cursor: 'pointer', height: '100%',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,65,66,0.3)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1E1E2E'; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30` }}>{category}</span>
          {market.resolved && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
              {market.outcome === 1 ? '✓ YES' : '✓ NO'}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#555570', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>#{marketId}</span>
        </div>

        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, color: '#E2E2F0', lineHeight: 1.4, flex: 1 }}>{market.question}</h3>

        {/* Mini probability bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#22c55e', fontWeight: 700 }}>{yesPercent}¢ YES</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E84142', fontWeight: 700 }}>{noPercent}¢ NO</span>
          </div>
          <div style={{ background: '#1E1E2E', borderRadius: 6, height: 6, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${yesPercent}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '6px 0 0 6px' }} />
            <div style={{ flex: 1, background: 'linear-gradient(90deg, #dc2626, #E84142)', borderRadius: '0 6px 6px 0' }} />
          </div>
        </div>

        {/* Footer stats */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', borderTop: '1px solid #1E1E2E', paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={11} color="#555570" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{totalPoolF} AVAX</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} color="#555570" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{market.resolved ? 'Resolved' : `${daysLeft}d`}</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#E84142', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            Trade <ArrowRight size={11} />
          </div>
        </div>
      </div>
    </Link>
  );
}
