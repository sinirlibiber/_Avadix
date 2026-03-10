'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Wallet, Activity, Award, Target, Users, Clock, CheckCircle, Heart } from 'lucide-react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';
import DAO_ABI from '@/lib/contracts/AvadixDAO.json';
import DONATIONS_ABI from '@/lib/contracts/AvadixDonations.json';

// ─── Position card per market ─────────────────────────────────────────────────
function PositionRow({ marketId, contracts }: { marketId: number; contracts: any }) {
  const { address } = useAccount();

  const { data: market } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getMarket',
    args: [BigInt(marketId)],
  }) as { data: any };

  const { data: position } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getPosition',
    args: [BigInt(marketId), address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  }) as { data: any };

  const { data: probability } = useReadContract({
    address: contracts.PredictionMarket,
    abi: MARKET_ABI,
    functionName: 'getYesProbability',
    args: [BigInt(marketId)],
  }) as { data: bigint | undefined };

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (!market?.exists || !position) return null;
  if (position.yesShares === 0n && position.noShares === 0n) return null;

  const yesShares = parseFloat(formatEther(position.yesShares));
  const noShares  = parseFloat(formatEther(position.noShares));
  const yesPct    = Number(probability ?? 50n);
  const type      = yesShares > 0 ? 'YES' : 'NO';
  const shares    = yesShares > 0 ? yesShares : noShares;
  const currentPct = yesShares > 0 ? yesPct : 100 - yesPct;
  const estimatedValue = shares * (currentPct / 100);
  const canClaim = market.resolved && !position.claimed &&
    ((market.outcome === 1 && position.yesShares > 0n) || (market.outcome === 2 && position.noShares > 0n));

  return (
    <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,65,66,0.25)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#E2E2F0', marginBottom: 6 }}>{market.question}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 8px', borderRadius: 4, background: type === 'YES' ? 'rgba(34,197,94,0.15)' : 'rgba(232,65,66,0.15)', color: type === 'YES' ? '#22c55e' : '#E84142', fontWeight: 600 }}>{type}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{shares.toFixed(3)} shares</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>Current: {currentPct}¢</span>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', marginBottom: 4 }}>Est. Value</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#E2E2F0', fontWeight: 600 }}>{estimatedValue.toFixed(3)} AVAX</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginBottom: 4 }}>Status</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: market.resolved ? '#22c55e' : '#F59E0B' }}>{market.resolved ? 'Resolved' : 'Active'}</div>
      </div>

      {canClaim && (
        <button onClick={() => writeContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'claimReward', args: [BigInt(marketId)] })} disabled={isPending} style={{ padding: '8px 16px', background: '#22c55e', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}>
          🎉 Claim
        </button>
      )}
    </div>
  );
}

// ─── DAO vote row ─────────────────────────────────────────────────────────────
function VoteRow({ proposalId, contracts }: { proposalId: number; contracts: any }) {
  const { address } = useAccount();

  const { data: proposal } = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'getProposal', args: [BigInt(proposalId)] }) as { data: any };
  const { data: voteStatus } = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'getVoteStatus', args: [BigInt(proposalId), address ?? '0x0000000000000000000000000000000000000000'], query: { enabled: !!address } }) as { data: [boolean, boolean] | undefined };

  if (!proposal?.exists || !voteStatus?.[0]) return null;

  const STATUS_MAP: Record<number, { label: string; color: string }> = {
    0: { label: 'Active', color: '#3B82F6' },
    1: { label: 'Passed', color: '#22c55e' },
    2: { label: 'Rejected', color: '#E84142' },
    3: { label: 'Pending', color: '#F59E0B' },
  };
  const st = STATUS_MAP[proposal.status] ?? STATUS_MAP[0];

  return (
    <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#E2E2F0', marginBottom: 4 }}>{proposal.title}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{proposal.category}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${st.color}20`, color: st.color }}>{st.label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '3px 10px', borderRadius: 8, background: voteStatus[1] ? 'rgba(34,197,94,0.15)' : 'rgba(232,65,66,0.15)', color: voteStatus[1] ? '#22c55e' : '#E84142' }}>
        Voted {voteStatus[1] ? 'YES' : 'NO'}
      </span>
    </div>
  );
}

// ─── Donation row ─────────────────────────────────────────────────────────────
function DonationRow({ campaignId, contracts }: { campaignId: number; contracts: any }) {
  const { address } = useAccount();

  const { data: campaign } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'getCampaign', args: [BigInt(campaignId)] }) as { data: any };
  const { data: myTotal } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'donorTotals', args: [BigInt(campaignId), address ?? '0x0000000000000000000000000000000000000000'], query: { enabled: !!address } }) as { data: bigint | undefined };

  if (!campaign?.exists || !myTotal || myTotal === 0n) return null;

  const raised = parseFloat(formatEther(campaign.raised));
  const goal   = parseFloat(formatEther(campaign.goal));
  const pct    = Math.min(100, Math.round((raised / goal) * 100));
  const myAmt  = parseFloat(formatEther(myTotal));

  return (
    <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 24 }}>{campaign.emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#E2E2F0', marginBottom: 4 }}>{campaign.name}</div>
        <div style={{ background: '#1E1E2E', borderRadius: 4, height: 4, overflow: 'hidden', maxWidth: 200 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #E84142, #ff6b6b)' }} />
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>My donation</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#E84142', fontWeight: 600 }}>{myAmt.toFixed(3)} AVAX</div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: campaign.active ? 'rgba(34,197,94,0.1)' : 'rgba(136,136,170,0.1)', color: campaign.active ? '#22c55e' : '#8888AA' }}>{campaign.active ? 'Active' : 'Closed'}</span>
    </div>
  );
}

// ─── Main Portfolio ───────────────────────────────────────────────────────────
export default function PortfolioSection() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const contracts = getAddresses(chainId);

  const [tab, setTab] = useState<'markets' | 'dao' | 'donations' | 'stats'>('markets');

  const { data: marketCount  } = useReadContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'marketCount' }) as { data: bigint | undefined };
  const { data: proposalCount} = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'proposalCount' }) as { data: bigint | undefined };
  const { data: campaignCount} = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'campaignCount' }) as { data: bigint | undefined };

  const mCount = Number(marketCount ?? 0n);
  const pCount = Number(proposalCount ?? 0n);
  const cCount = Number(campaignCount ?? 0n);

  const marketIds   = Array.from({ length: mCount }, (_, i) => i + 1);
  const proposalIds = Array.from({ length: pCount }, (_, i) => i + 1);
  const campaignIds = Array.from({ length: cCount }, (_, i) => i + 1);

  if (!isConnected) {
    return (
      <section style={{ padding: '40px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Portfolio</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em' }}>Your Dashboard</h2>
        </div>
        <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: '80px 24px', textAlign: 'center' }}>
          <Wallet size={56} color="#2A2A3E" style={{ marginBottom: 20, margin: '0 auto 20px' }} />
          <p style={{ color: '#8888AA', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 20, marginBottom: 8 }}>Connect your wallet</p>
          <p style={{ color: '#555570', fontSize: 14, marginBottom: 32 }}>View your positions, DAO votes, donations and stats</p>
          <ConnectButton />
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: '40px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Portfolio</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em' }}>Your Dashboard</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570', marginTop: 8 }}>
          {address?.slice(0,10)}...{address?.slice(-6)}
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 36 }}>
        {[
          { label: 'Wallet Balance', value: `${parseFloat(balance?.formatted || '0').toFixed(3)} AVAX`, icon: Wallet, color: '#3B82F6' },
          { label: 'Active Markets', value: mCount.toString(), icon: BarChart3, color: '#F59E0B' },
          { label: 'DAO Votes', value: pCount.toString(), icon: CheckCircle, color: '#8B5CF6' },
          { label: 'Campaigns', value: cCount.toString(), icon: Heart, color: '#E84142' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon size={16} color={color} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 12, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {([
          { key: 'markets', label: '📈 Market Positions' },
          { key: 'dao', label: '🏛 DAO Votes' },
          { key: 'donations', label: '💚 Donations' },
          { key: 'stats', label: '📊 Stats' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13,
            background: tab === t.key ? '#E84142' : 'transparent',
            color: tab === t.key ? 'white' : '#8888AA', transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Market Positions */}
      {tab === 'markets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570', marginBottom: 8 }}>Markets you have open positions in:</p>
          {marketIds.map(id => <PositionRow key={id} marketId={id} contracts={contracts} />)}
          {mCount === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#8888AA' }}>No market positions yet. <a href="/markets" style={{ color: '#E84142' }}>Explore Markets →</a></div>}
        </div>
      )}

      {/* DAO Votes */}
      {tab === 'dao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570', marginBottom: 8 }}>Proposals you have voted on:</p>
          {proposalIds.map(id => <VoteRow key={id} proposalId={id} contracts={contracts} />)}
          {pCount === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#8888AA' }}>No votes yet. <a href="/dao" style={{ color: '#E84142' }}>Go to DAO →</a></div>}
        </div>
      )}

      {/* Donations */}
      {tab === 'donations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570', marginBottom: 8 }}>Campaigns you have donated to:</p>
          {campaignIds.map(id => <DonationRow key={id} campaignId={id} contracts={contracts} />)}
          {cCount === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#8888AA' }}>No donations yet. <a href="/donate" style={{ color: '#E84142' }}>Donate →</a></div>}
        </div>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {[
            { label: 'Total Markets', value: mCount.toString(), icon: BarChart3 },
            { label: 'DAO Proposals', value: pCount.toString(), icon: CheckCircle },
            { label: 'Campaigns', value: cCount.toString(), icon: Heart },
            { label: 'Network', value: chainId === 43113 ? 'Fuji Testnet' : 'Mainnet', icon: Activity },
            { label: 'Wallet', value: `${address?.slice(0,6)}...${address?.slice(-4)}`, icon: Wallet },
            { label: 'Balance', value: `${parseFloat(balance?.formatted || '0').toFixed(3)} AVAX`, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '20px 24px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <Icon size={14} color="#E84142" />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0' }}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
