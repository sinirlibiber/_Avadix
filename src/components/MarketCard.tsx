'use client';

import { useState } from 'react';
import { TrendingUp, Clock, Droplets } from 'lucide-react';
import { Market, formatVolume } from '@/lib/data';
import { useAccount, useSendTransaction, useBalance } from 'wagmi';
import { parseEther } from 'viem';

const CATEGORY_COLORS: Record<string, string> = {
  crypto: '#F59E0B',
  avax: '#E84142',
  politics: '#8B5CF6',
  sports: '#10B981',
  tech: '#3B82F6',
};

interface Props {
  market: Market;
}

export default function MarketCard({ market }: Props) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { sendTransaction, isPending } = useSendTransaction();

  const [tradeType, setTradeType] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [showTrade, setShowTrade] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = 100 - yesPercent;
  const catColor = CATEGORY_COLORS[market.category] || '#E84142';
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ));

  const handleTrade = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first!');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    const bal = parseFloat(balance?.formatted || '0');
    if (parseFloat(amount) > bal) {
      alert(`Insufficient balance. You have ${bal.toFixed(4)} AVAX`);
      return;
    }
    try {
      sendTransaction({
        to: address, // demo: sends to self
        value: parseEther(amount),
      }, {
        onSuccess: () => {
          setTxStatus('success');
          setAmount('');
          setTimeout(() => { setTxStatus('idle'); setShowTrade(false); }, 3000);
        },
        onError: () => setTxStatus('error'),
      });
    } catch (e) {
      setTxStatus('error');
    }
  };

  return (
    <div style={{
      background: '#12121A',
      border: '1px solid #1E1E2E',
      borderRadius: 16, padding: 20,
      transition: 'all 0.25s ease',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,65,66,0.3)';
      (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
      (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)';
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.borderColor = '#1E1E2E';
      (e.currentTarget as HTMLElement).style.transform = 'none';
      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
    }}>
      {/* Category + trending */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 500,
          padding: '3px 10px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase',
          background: `${catColor}18`, color: catColor, border: `1px solid ${catColor}30`,
        }}>{market.category}</span>
        {market.trending && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px',
            borderRadius: 20, background: 'rgba(232,65,66,0.12)', color: '#E84142',
            border: '1px solid rgba(232,65,66,0.2)',
          }}>🔥 Hot</span>
        )}
        {market.creator && (
          <span style={{ fontSize: 11, color: '#8888AA', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
            by {market.creator}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
        color: '#E2E2F0', lineHeight: 1.4,
      }}>{market.title}</h3>

      {/* Probability bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#22c55e', fontWeight: 600 }}>
            YES {yesPercent}¢
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E84142', fontWeight: 600 }}>
            NO {noPercent}¢
          </span>
        </div>
        <div style={{ background: '#1E1E2E', borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <div style={{
            width: `${yesPercent}%`, height: '100%',
            background: 'linear-gradient(90deg, #22c55e, #16a34a)',
            borderRadius: 6, transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          }} />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={12} color="#8888AA" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>
            {formatVolume(market.volume)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Droplets size={12} color="#8888AA" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>
            {formatVolume(market.liquidity)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Clock size={12} color="#8888AA" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>
            {daysLeft}d left
          </span>
        </div>
      </div>

      {/* Trade UI */}
      {txStatus === 'success' ? (
        <div style={{
          padding: 14, background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10,
          textAlign: 'center', color: '#22c55e',
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
        }}>
          ✓ Trade placed successfully!
        </div>
      ) : !showTrade ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setTradeType('yes'); setShowTrade(true); }} style={{
            flex: 1, padding: '9px 0',
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 8, color: '#22c55e',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.22)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.12)')}>
            Buy YES
          </button>
          <button onClick={() => { setTradeType('no'); setShowTrade(true); }} style={{
            flex: 1, padding: '9px 0',
            background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)',
            borderRadius: 8, color: '#E84142',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,65,66,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(232,65,66,0.1)')}>
            Buy NO
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['yes', 'no'].map(t => (
              <button key={t} onClick={() => setTradeType(t as 'yes' | 'no')} style={{
                flex: 1, padding: '7px 0', borderRadius: 7, cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
                background: tradeType === t
                  ? (t === 'yes' ? 'rgba(34,197,94,0.2)' : 'rgba(232,65,66,0.2)')
                  : 'transparent',
                border: `1px solid ${tradeType === t
                  ? (t === 'yes' ? 'rgba(34,197,94,0.5)' : 'rgba(232,65,66,0.5)')
                  : '#2A2A3E'}`,
                color: t === 'yes' ? '#22c55e' : '#E84142',
                transition: 'all 0.2s',
              }}>
                {t.toUpperCase()} {t === 'yes' ? yesPercent : noPercent}¢
              </button>
            ))}
            <button onClick={() => { setShowTrade(false); setTxStatus('idle'); }} style={{
              padding: '7px 12px', background: 'transparent',
              border: '1px solid #2A2A3E', borderRadius: 7,
              color: '#8888AA', cursor: 'pointer', fontSize: 13,
            }}>✕</button>
          </div>
          <div style={{
            background: '#0A0A0F',
            border: `1px solid ${tradeType === 'yes' ? 'rgba(34,197,94,0.4)' : 'rgba(232,65,66,0.4)'}`,
            borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', marginRight: 6 }}>AVAX</span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '10px 0',
              }}
            />
            {balance && (
              <button onClick={() => setAmount(balance.formatted.slice(0, 6))} style={{
                background: 'none', border: 'none', color: '#E84142',
                fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
              }}>MAX</button>
            )}
          </div>
          {balance && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textAlign: 'right' }}>
              Balance: {parseFloat(balance.formatted).toFixed(4)} AVAX
            </div>
          )}
          {!isConnected && (
            <div style={{ fontSize: 12, color: '#F59E0B', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              ⚠ Connect wallet to trade
            </div>
          )}
          {txStatus === 'error' && (
            <div style={{ fontSize: 12, color: '#E84142', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              Transaction failed. Try again.
            </div>
          )}
          <button
            onClick={handleTrade}
            disabled={isPending || !amount}
            style={{
              width: '100%', padding: '11px 0',
              background: !isConnected ? '#2A2A3E' : tradeType === 'yes' ? '#22c55e' : '#E84142',
              border: 'none', borderRadius: 8, color: 'white',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
              cursor: isPending ? 'wait' : 'pointer',
              opacity: (!amount || isPending) ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {isPending ? 'Confirming...' : !isConnected ? 'Connect Wallet' : `Buy ${tradeType.toUpperCase()} — ${amount || '0'} AVAX`}
          </button>
        </div>
      )}
    </div>
  );
}
