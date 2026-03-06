'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Wallet, Activity, Award } from 'lucide-react';
import { useAccount, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MARKETS } from '@/lib/data';

const MOCK_POSITIONS = [
  { marketId: '1', marketTitle: 'AVAX above $100 by end of Q2 2025?', type: 'yes' as const, amount: 2.5, price: 0.60, shares: 4.16, currentPrice: 0.67, pnl: 0.29, pnlPercent: 11.6 },
  { marketId: '3', marketTitle: 'Bitcoin ETF net inflows positive in June 2025?', type: 'yes' as const, amount: 1.0, price: 0.68, shares: 1.47, currentPrice: 0.74, pnl: 0.088, pnlPercent: 8.8 },
  { marketId: '5', marketTitle: 'Will AI legislation pass in the US in 2025?', type: 'no' as const, amount: 0.5, price: 0.65, shares: 0.77, currentPrice: 0.69, pnl: 0.031, pnlPercent: 6.2 },
  { marketId: '6', marketTitle: 'Will GPT-5 be released before July 2025?', type: 'no' as const, amount: 1.5, price: 0.50, shares: 3.0, currentPrice: 0.55, pnl: 0.15, pnlPercent: 10.0 },
];

const ACTIVITY = [
  { type: 'buy', market: 'AVAX above $100?', side: 'YES', amount: '2.5 AVAX', price: '60¢', time: '2h ago' },
  { type: 'buy', market: 'Bitcoin ETF inflows?', side: 'YES', amount: '1.0 AVAX', price: '68¢', time: '1d ago' },
  { type: 'sell', market: 'ETH ETF staking?', side: 'YES', amount: '0.8 AVAX', price: '55¢', time: '3d ago' },
  { type: 'buy', market: 'AI legislation 2025?', side: 'NO', amount: '0.5 AVAX', price: '65¢', time: '5d ago' },
  { type: 'buy', market: 'GPT-5 before July?', side: 'NO', amount: '1.5 AVAX', price: '50¢', time: '1w ago' },
];

export default function PortfolioSection() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const [tab, setTab] = useState<'positions' | 'activity' | 'stats'>('positions');

  const totalInvested = MOCK_POSITIONS.reduce((s, p) => s + p.amount, 0);
  const totalPnl = MOCK_POSITIONS.reduce((s, p) => s + p.pnl, 0);
  const totalPnlPct = (totalPnl / totalInvested) * 100;
  const winRate = 80;

  if (!isConnected) {
    return (
      <section id="portfolio" style={{ padding: '80px 24px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Portfolio</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em' }}>Your Positions</h2>
        </div>
        <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: '60px 24px', textAlign: 'center' }}>
          <Wallet size={48} color="#2A2A3E" style={{ marginBottom: 16 }} />
          <p style={{ color: '#8888AA', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 18, marginBottom: 8 }}>Connect your wallet</p>
          <p style={{ color: '#555570', fontSize: 14, marginBottom: 28 }}>View your positions, PnL, and trading history</p>
          <ConnectButton />
        </div>
      </section>
    );
  }

  return (
    <section id="portfolio" style={{ padding: '80px 24px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Portfolio</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em' }}>Your Positions</h2>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 32 }}>
        {[
          { label: 'Wallet Balance', value: `${parseFloat(balance?.formatted || '0').toFixed(4)} AVAX`, icon: Wallet, color: '#3B82F6' },
          { label: 'Total Invested', value: `${totalInvested.toFixed(2)} AVAX`, icon: BarChart3, color: '#F59E0B' },
          { label: 'Total PnL', value: `+${totalPnl.toFixed(3)} AVAX`, icon: TrendingUp, color: '#22c55e', sub: `+${totalPnlPct.toFixed(1)}%` },
          { label: 'Win Rate', value: `${winRate}%`, icon: Award, color: '#E84142' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon size={16} color={color} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#E2E2F0' }}>{value}</div>
            {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e', marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {(['positions', 'activity', 'stats'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, textTransform: 'capitalize',
            background: tab === t ? '#E84142' : 'transparent',
            color: tab === t ? 'white' : '#8888AA', transition: 'all 0.2s',
          }}>{t}</button>
        ))}
      </div>

      {/* Positions tab */}
      {tab === 'positions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_POSITIONS.map(pos => (
            <div key={pos.marketId} style={{
              background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,65,66,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#E2E2F0', marginBottom: 4 }}>
                  {pos.marketTitle}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 8px', borderRadius: 4,
                    background: pos.type === 'yes' ? 'rgba(34,197,94,0.15)' : 'rgba(232,65,66,0.15)',
                    color: pos.type === 'yes' ? '#22c55e' : '#E84142', fontWeight: 600,
                  }}>{pos.type.toUpperCase()}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>
                    {pos.shares.toFixed(2)} shares @ {Math.round(pos.price * 100)}¢
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E2E2F0', marginBottom: 2 }}>
                  {pos.amount} AVAX
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e' }}>
                  +{pos.pnl.toFixed(3)} (+{pos.pnlPercent.toFixed(1)}%)
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', marginBottom: 4 }}>Current</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#E2E2F0', fontWeight: 600 }}>
                  {Math.round(pos.currentPrice * 100)}¢
                </div>
              </div>
              <button style={{
                padding: '8px 16px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)',
                borderRadius: 8, color: '#E84142', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
              }}>Sell</button>
            </div>
          ))}
        </div>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 16, overflow: 'hidden' }}>
          {ACTIVITY.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
              borderBottom: i < ACTIVITY.length - 1 ? '1px solid #1E1E2E' : 'none',
              flexWrap: 'wrap',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: a.type === 'buy' ? 'rgba(34,197,94,0.1)' : 'rgba(232,65,66,0.1)',
              }}>
                {a.type === 'buy' ? <TrendingUp size={14} color="#22c55e" /> : <TrendingDown size={14} color="#E84142" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14, color: '#E2E2F0' }}>{a.market}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', marginTop: 2 }}>{a.time}</div>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 8px', borderRadius: 4,
                background: a.side === 'YES' ? 'rgba(34,197,94,0.15)' : 'rgba(232,65,66,0.15)',
                color: a.side === 'YES' ? '#22c55e' : '#E84142',
              }}>{a.side}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E2E2F0' }}>{a.amount}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>@ {a.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats tab */}
      {tab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {[
            { label: 'Total Trades', value: '24' },
            { label: 'Profitable Trades', value: '19' },
            { label: 'Win Rate', value: '79.2%' },
            { label: 'Avg Trade Size', value: '1.4 AVAX' },
            { label: 'Best Trade', value: '+0.8 AVAX' },
            { label: 'Markets Traded', value: '11' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '20px 24px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: '#E2E2F0' }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
