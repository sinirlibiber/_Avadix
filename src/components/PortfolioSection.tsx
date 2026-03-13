'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Wallet, Activity, Award, Target, Users, Clock, CheckCircle, Heart, X, ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import MARKET_ABI from '@/lib/contracts/AvadixPredictionMarket.json';
import DAO_ABI from '@/lib/contracts/AvadixDAO.json';
import DONATIONS_ABI from '@/lib/contracts/AvadixDonations.json';

// ─── Emoji field parse (format: "💎|||base64data" veya sadece "💎") ───────────
const IMG_SEP = '|||';
function parseEmojiField(raw: string): { emoji: string; imageData: string | null } {
  if (!raw) return { emoji: '💎', imageData: null };
  const idx = raw.indexOf(IMG_SEP);
  if (idx === -1) return { emoji: raw, imageData: null };
  return { emoji: raw.slice(0, idx), imageData: raw.slice(idx + IMG_SEP.length) || null };
}

// ─── Fuji Snowtrace explorer link ─────────────────────────────────────────────
const EXPLORER = 'https://testnet.snowtrace.io';

// ─── Market Position Detail Modal ────────────────────────────────────────────
function PositionDetailModal({ marketId, contracts, onClose }: { marketId: number; contracts: any; onClose: () => void }) {
  const { address } = useAccount();

  const { data: market } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getMarket', args: [BigInt(marketId)],
  }) as { data: any };

  const { data: position } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getPosition', args: [BigInt(marketId), address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  }) as { data: any };

  const { data: probability } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getYesProbability', args: [BigInt(marketId)],
  }) as { data: bigint | undefined };

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (!market?.exists || !position) return null;

  const yesShares = parseFloat(formatEther(position.yesShares));
  const noShares = parseFloat(formatEther(position.noShares));
  const yesPct = Number(probability ?? 50n);
  const type = yesShares > 0 ? 'YES' : 'NO';
  const shares = yesShares > 0 ? yesShares : noShares;
  const currentPct = yesShares > 0 ? yesPct : 100 - yesPct;
  const estimatedValue = shares * (currentPct / 100);
  const yesPool = parseFloat(formatEther(market.yesPool ?? 0n));
  const noPool = parseFloat(formatEther(market.noPool ?? 0n));
  const totalPool = yesPool + noPool;
  const endDate = new Date(Number(market.endTime) * 1000);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const canClaim = market.resolved && !position.claimed &&
    ((market.outcome === 1 && position.yesShares > 0n) || (market.outcome === 2 && position.noShares > 0n));

  const OUTCOME_LABELS: Record<number, string> = { 0: 'Unresolved', 1: '✅ YES Won', 2: '❌ NO Won' };
  const CATEGORY_COLORS: Record<string, string> = {
    crypto: '#F59E0B', avax: '#7C3AED', politics: '#8B5CF6', sports: '#10B981', tech: '#3B82F6',
  };
  const catColor = CATEGORY_COLORS[market.category?.toLowerCase()] ?? '#7C3AED';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: 24 }}>
      <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 32, width: '100%', maxWidth: 560, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, padding: '6px 10px', color: '#7C3AED', cursor: 'pointer' }}><X size={16} /></button>
        
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 12, background: `${catColor}20`, color: catColor, border: `1px solid ${catColor}40` }}>{market.category?.toUpperCase()}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>Market #{marketId}</span>
            {market.resolved && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{OUTCOME_LABELS[market.outcome] ?? 'Resolved'}</span>}
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#E2E2F0', lineHeight: 1.4 }}>{market.question}</h3>
        </div>

        {/* My Position */}
        <div style={{ background: type === 'YES' ? 'rgba(34,197,94,0.06)' : 'rgba(124,58,237,0.06)', border: `1px solid ${type === 'YES' ? 'rgba(34,197,94,0.2)' : 'rgba(124,58,237,0.2)'}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.06em' }}>My Position</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[
              { label: 'Side', value: type, color: type === 'YES' ? '#22c55e' : '#7C3AED' },
              { label: 'Shares', value: shares.toFixed(4) },
              { label: 'Current Prob.', value: `${currentPct}%` },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginBottom: 4 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: color ?? '#E2E2F0' }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginBottom: 4 }}>Estimated Value</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0' }}>{estimatedValue.toFixed(4)} <span style={{ fontSize: 14, color: '#8888AA' }}>AVAX</span></div>
          </div>
        </div>

        {/* Market Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'YES Pool', value: `${yesPool.toFixed(3)} AVAX`, color: '#22c55e' },
            { label: 'NO Pool', value: `${noPool.toFixed(3)} AVAX`, color: '#7C3AED' },
            { label: 'Total Volume', value: `${totalPool.toFixed(3)} AVAX` },
            { label: market.resolved ? 'Ended' : 'Time Left', value: market.resolved ? endDate.toLocaleDateString() : `${daysLeft} days` },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: color ?? '#E2E2F0' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Probability bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e' }}>YES {yesPct}%</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7C3AED' }}>NO {100 - yesPct}%</span>
          </div>
          <div style={{ background: '#1E1E2E', borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${yesPct}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 6 }} />
          </div>
        </div>

        {/* Claim button */}
        {canClaim && (
          <button onClick={() => writeContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'claimReward', args: [BigInt(marketId)] })} disabled={isPending} style={{ width: '100%', padding: '13px', background: '#22c55e', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, cursor: isPending ? 'wait' : 'pointer', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
            {isPending ? '⏳ Claiming...' : isSuccess ? '✅ Claimed!' : '🎉 Claim Reward'}
          </button>
        )}

        {!canClaim && position.claimed && (
          <div style={{ padding: '12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            ✅ Reward already claimed
          </div>
        )}

        {!market.resolved && (
          <a href={`/markets/${marketId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, color: '#7C3AED', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, textDecoration: 'none', marginTop: 8 }}>
            View Market <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── DAO Vote Detail Modal ─────────────────────────────────────────────────────
function VoteDetailModal({ proposalId, contracts, onClose }: { proposalId: number; contracts: any; onClose: () => void }) {
  const { address } = useAccount();

  const { data: proposal } = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'getProposal', args: [BigInt(proposalId)] }) as { data: any };
  const { data: voteStatus } = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'getVoteStatus', args: [BigInt(proposalId), address ?? '0x0000000000000000000000000000000000000000'], query: { enabled: !!address } }) as { data: [boolean, boolean] | undefined };
  const { data: yesPercentage } = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'getYesPercentage', args: [BigInt(proposalId)] }) as { data: bigint | undefined };
  const { data: votingOpen } = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'isVotingOpen', args: [BigInt(proposalId)] }) as { data: boolean | undefined };

  if (!proposal?.exists) return null;

  const STATUS_MAP: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: 'Active', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    1: { label: 'Passed', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    2: { label: 'Rejected', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
    3: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  };
  const st = STATUS_MAP[proposal.status] ?? STATUS_MAP[0];
  const yesPct = Number(yesPercentage ?? 0n);
  const endDate = new Date(Number(proposal.endTime) * 1000);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const yesVotesDisplay = (Number(proposal.yesVotes) / 1000).toFixed(0);
  const noVotesDisplay = (Number(proposal.noVotes) / 1000).toFixed(0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: 24 }}>
      <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 32, width: '100%', maxWidth: 560, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, padding: '6px 10px', color: '#7C3AED', cursor: 'pointer' }}><X size={16} /></button>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}>{proposal.category}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 12, background: st.bg, color: st.color }}>{st.label}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', borderRadius: 12, background: voteStatus?.[0] ? (voteStatus[1] ? 'rgba(34,197,94,0.1)' : 'rgba(124,58,237,0.1)') : 'rgba(136,136,170,0.1)', color: voteStatus?.[0] ? (voteStatus[1] ? '#22c55e' : '#7C3AED') : '#8888AA' }}>
            {voteStatus?.[0] ? `Voted ${voteStatus[1] ? 'YES' : 'NO'}` : 'Not voted'}
          </span>
        </div>

        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#E2E2F0', marginBottom: 8, lineHeight: 1.4 }}>{proposal.title}</h3>
        <p style={{ fontSize: 14, color: '#8888AA', lineHeight: 1.7, marginBottom: 20 }}>{proposal.description}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Proposed by', value: shortAddr(proposal.proposer) },
            { label: 'Status', value: st.label, color: st.color },
            { label: votingOpen ? 'Days Left' : 'Ended', value: votingOpen ? `${daysLeft} days` : endDate.toLocaleDateString() },
            { label: 'Proposal #', value: `#${proposalId}` },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: color ?? '#E2E2F0' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Vote results */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e' }}>YES {yesPct}% — {yesVotesDisplay}K votes</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7C3AED' }}>NO {100 - yesPct}% — {noVotesDisplay}K votes</span>
          </div>
          <div style={{ background: '#1E1E2E', borderRadius: 6, height: 10, overflow: 'hidden' }}>
            <div style={{ width: `${yesPct}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 6 }} />
          </div>
        </div>

        {voteStatus?.[0] && (
          <div style={{ padding: '12px 16px', background: voteStatus[1] ? 'rgba(34,197,94,0.08)' : 'rgba(124,58,237,0.08)', border: `1px solid ${voteStatus[1] ? 'rgba(34,197,94,0.2)' : 'rgba(124,58,237,0.2)'}`, borderRadius: 10, textAlign: 'center', color: voteStatus[1] ? '#22c55e' : '#7C3AED', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>
            {voteStatus[1] ? '✓ You voted YES on this proposal' : '✗ You voted NO on this proposal'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Donation Detail Modal ────────────────────────────────────────────────────
function DonationDetailModal({ campaignId, contracts, onClose }: { campaignId: number; contracts: any; onClose: () => void }) {
  const { address } = useAccount();

  const { data: campaign } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'getCampaign', args: [BigInt(campaignId)] }) as { data: any };
  const { data: myTotal } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'donorTotals', args: [BigInt(campaignId), address ?? '0x0000000000000000000000000000000000000000'], query: { enabled: !!address } }) as { data: bigint | undefined };
  const { data: donationCount } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'getDonationCount', args: [BigInt(campaignId)] }) as { data: bigint | undefined };
  const { data: donations } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'getDonations', args: [BigInt(campaignId)] }) as { data: any[] | undefined };
  const { data: progress } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'getProgress', args: [BigInt(campaignId)] }) as { data: bigint | undefined };

  if (!campaign?.exists) return null;

  const raised = parseFloat(formatEther(campaign.raised));
  const goal = parseFloat(formatEther(campaign.goal));
  const pct = Number(progress ?? 0n);
  const myAmt = parseFloat(formatEther(myTotal ?? 0n));
  const donors = Number(donationCount ?? 0n);
  const deadline = new Date(Number(campaign.deadline) * 1000);
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
  const isComplete = pct >= 100 || !campaign.active;
  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: 24 }}>
      <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 32, width: '100%', maxWidth: 560, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, padding: '6px 10px', color: '#7C3AED', cursor: 'pointer' }}><X size={16} /></button>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
          {/* Campaign büyük image veya emoji */}
          {(() => {
            const { emoji, imageData } = parseEmojiField(campaign.emoji ?? '💎');
            return imageData
              ? <img src={imageData} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
              : <span style={{ fontSize: 40 }}>{emoji}</span>;
          })()}
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#E2E2F0', marginBottom: 4 }}>{campaign.name}</h3>
            <p style={{ fontSize: 13, color: '#8888AA', lineHeight: 1.5 }}>{campaign.description}</p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginTop: 6 }}>by {shortAddr(campaign.creator)}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: isComplete ? '#22c55e' : '#7C3AED', fontWeight: 600 }}>{pct}% funded</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>{raised.toFixed(3)} / {goal.toFixed(3)} AVAX</span>
          </div>
          <div style={{ background: '#1E1E2E', borderRadius: 6, height: 10, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: isComplete ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #7C3AED, #ff6b6b)', borderRadius: 6, transition: 'width 0.8s ease' }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Donors', value: donors.toString() },
            { label: campaign.active ? 'Days Left' : 'Status', value: campaign.active ? `${daysLeft}d` : 'Closed' },
            { label: 'My Total', value: `${myAmt.toFixed(3)} AVAX`, color: '#7C3AED' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: color ?? '#E2E2F0' }}>{value}</div>
            </div>
          ))}
        </div>

        {isComplete && (
          <div style={{ padding: '14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
            🎯 Donation goal reached — Campaign complete!
          </div>
        )}

        {/* My donations history */}
        {donations && donations.filter(d => d.donor?.toLowerCase() === address?.toLowerCase()).length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>My Donations</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
              {donations
                .filter(d => d.donor?.toLowerCase() === address?.toLowerCase())
                .reverse()
                .map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#0A0A0F', borderRadius: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>+{parseFloat(formatEther(d.amount)).toFixed(3)} AVAX</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>{new Date(Number(d.timestamp) * 1000).toLocaleDateString()}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Position Row (clickable) ─────────────────────────────────────────────────
function PositionRow({ marketId, contracts, onClick }: { marketId: number; contracts: any; onClick: () => void }) {
  const { address } = useAccount();

  const { data: market } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getMarket', args: [BigInt(marketId)],
  }) as { data: any };

  const { data: position } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getPosition', args: [BigInt(marketId), address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  }) as { data: any };

  const { data: probability } = useReadContract({
    address: contracts.PredictionMarket, abi: MARKET_ABI,
    functionName: 'getYesProbability', args: [BigInt(marketId)],
  }) as { data: bigint | undefined };

  if (!market?.exists || !position) return null;
  if (position.yesShares === 0n && position.noShares === 0n) return null;

  const yesShares = parseFloat(formatEther(position.yesShares));
  const noShares = parseFloat(formatEther(position.noShares));
  const yesPct = Number(probability ?? 50n);
  const type = yesShares > 0 ? 'YES' : 'NO';
  const shares = yesShares > 0 ? yesShares : noShares;
  const currentPct = yesShares > 0 ? yesPct : 100 - yesPct;
  const estimatedValue = shares * (currentPct / 100);
  const canClaim = market.resolved && !position.claimed &&
    ((market.outcome === 1 && position.yesShares > 0n) || (market.outcome === 2 && position.noShares > 0n));

  return (
    <div onClick={onClick} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'all 0.2s', cursor: 'pointer' }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.background = '#14141E'; }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.borderColor = '#1E1E2E'; e.currentTarget.style.background = '#12121A'; }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#E2E2F0', marginBottom: 6 }}>{market.question}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 8px', borderRadius: 4, background: type === 'YES' ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.15)', color: type === 'YES' ? '#22c55e' : '#7C3AED', fontWeight: 600 }}>{type}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{shares.toFixed(3)} shares</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>Prob: {currentPct}%</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', marginBottom: 2 }}>Est. Value</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: '#E2E2F0', fontWeight: 600 }}>{estimatedValue.toFixed(3)} AVAX</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {canClaim && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>🎉 Claim</span>}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: market.resolved ? '#22c55e' : '#F59E0B' }}>{market.resolved ? 'Resolved' : 'Active'}</span>
        <ArrowUpRight size={14} color="#555570" />
      </div>
    </div>
  );
}

// ─── DAO Vote Row (clickable) ─────────────────────────────────────────────────
function VoteRow({ proposalId, contracts, onClick }: { proposalId: number; contracts: any; onClick: () => void }) {
  const { address } = useAccount();

  const { data: proposal } = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'getProposal', args: [BigInt(proposalId)] }) as { data: any };
  const { data: voteStatus } = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'getVoteStatus', args: [BigInt(proposalId), address ?? '0x0000000000000000000000000000000000000000'], query: { enabled: !!address } }) as { data: [boolean, boolean] | undefined };

  if (!proposal?.exists || !voteStatus?.[0]) return null;

  const STATUS_MAP: Record<number, { label: string; color: string }> = {
    0: { label: 'Active', color: '#3B82F6' }, 1: { label: 'Passed', color: '#22c55e' },
    2: { label: 'Rejected', color: '#7C3AED' }, 3: { label: 'Pending', color: '#F59E0B' },
  };
  const st = STATUS_MAP[proposal.status] ?? STATUS_MAP[0];

  return (
    <div onClick={onClick} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.background = '#14141E'; }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.borderColor = '#1E1E2E'; e.currentTarget.style.background = '#12121A'; }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#E2E2F0', marginBottom: 4 }}>{proposal.title}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{proposal.category}</div>
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${st.color}20`, color: st.color }}>{st.label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '3px 10px', borderRadius: 8, background: voteStatus[1] ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.15)', color: voteStatus[1] ? '#22c55e' : '#7C3AED' }}>
        {voteStatus[1] ? '✓ YES' : '✗ NO'}
      </span>
      <ArrowUpRight size={14} color="#555570" />
    </div>
  );
}

// ─── Donation Row (clickable) ─────────────────────────────────────────────────
function DonationRow({ campaignId, contracts, onClick }: { campaignId: number; contracts: any; onClick: () => void }) {
  const { address } = useAccount();

  const { data: campaign } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'getCampaign', args: [BigInt(campaignId)] }) as { data: any };
  const { data: myTotal } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'donorTotals', args: [BigInt(campaignId), address ?? '0x0000000000000000000000000000000000000000'], query: { enabled: !!address } }) as { data: bigint | undefined };
  const { data: progress } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'getProgress', args: [BigInt(campaignId)] }) as { data: bigint | undefined };

  if (!campaign?.exists || !myTotal || myTotal === 0n) return null;

  const raised = parseFloat(formatEther(campaign.raised));
  const goal = parseFloat(formatEther(campaign.goal));
  const pct = Number(progress ?? 0n);
  const myAmt = parseFloat(formatEther(myTotal));
  const isComplete = pct >= 100 || !campaign.active;

  return (
    <div onClick={onClick} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '14px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; e.currentTarget.style.background = '#14141E'; }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.borderColor = '#1E1E2E'; e.currentTarget.style.background = '#12121A'; }}>
      {/* Campaign image veya emoji */}
      {(() => {
        const { emoji, imageData } = parseEmojiField(campaign.emoji ?? '💎');
        return imageData
          ? <img src={imageData} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          : <span style={{ fontSize: 24, flexShrink: 0 }}>{emoji}</span>;
      })()}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#E2E2F0', marginBottom: 4 }}>{campaign.name}</div>
        <div style={{ background: '#1E1E2E', borderRadius: 4, height: 4, overflow: 'hidden', maxWidth: 200 }}>
          <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: isComplete ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #7C3AED, #ff6b6b)' }} />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginTop: 4 }}>{pct}% — {raised.toFixed(3)}/{goal.toFixed(3)} AVAX</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>My donation</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#7C3AED', fontWeight: 600 }}>{myAmt.toFixed(3)} AVAX</div>
      </div>
      {isComplete ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>✅ Complete</span>
      ) : (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Active</span>
      )}
      <ArrowUpRight size={14} color="#555570" />
    </div>
  );
}


// ─── Transaction History ─────────────────────────────────────────────────────
function TransactionHistory({ address, chainId }: { address: string; chainId: number }) {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const EXPLORER_BASE = 'https://testnet.snowtrace.io';
  const API_BASE = 'https://api-testnet.snowtrace.io/api';

  // Categorize tx based on input data / to address
  const KNOWN: Record<string, string> = {
    '0x9be459308edcd5ba01941f781d20c1e5f12aacf2': 'Prediction Market',
    '0xa70770942ecba3abceb0096a824e94b2fb01fa27': 'DAO',
    '0xc7f1d448570f052aa879326ec3ba60c20005fcd2': 'Donations',
  };

  const getLabel = (tx: any) => {
    const to = (tx.to ?? '').toLowerCase();
    if (KNOWN[to]) return KNOWN[to];
    if (tx.value && tx.value !== '0' && (!tx.input || tx.input === '0x')) return 'Transfer';
    return 'Contract Call';
  };

  const getTxType = (tx: any): { label: string; color: string; bg: string } => {
    const cat = getLabel(tx);
    if (cat === 'Prediction Market') return { label: '📈 Market', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' };
    if (cat === 'DAO')               return { label: '🏛 DAO', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
    if (cat === 'Donations')         return { label: '💚 Donate', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
    if (cat === 'Transfer')          return { label: '↗ Transfer', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
    return { label: '⚡ Call', color: '#8888AA', bg: 'rgba(136,136,170,0.1)' };
  };

  const isIncoming = (tx: any) => (tx.to ?? '').toLowerCase() === address.toLowerCase() && (tx.from ?? '').toLowerCase() !== address.toLowerCase();

  // Import useState, useEffect already in scope from parent file
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!address || hasFetched) return;
    setHasFetched(true);
    setLoading(true);

    const url = `${API_BASE}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=YourApiKeyToken`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.status === '1' && Array.isArray(data.result)) {
          setTxs(data.result);
        } else {
          // Fallback: internal txs yoksa boş göster
          setTxs([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load transactions. Check your connection.');
        setLoading(false);
      });
  }, [address]);

  const paginated = txs.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(txs.length / PER_PAGE);

  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const formatDate = (ts: string) => {
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const formatAVAX = (wei: string) => {
    const n = parseFloat(wei) / 1e18;
    return n > 0 ? `${n.toFixed(4)} AVAX` : '';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', opacity: 0.5 }}>
            <div style={{ width: 80, height: 22, background: '#1E1E2E', borderRadius: 6 }} />
            <div style={{ flex: 1, height: 14, background: '#1E1E2E', borderRadius: 4 }} />
            <div style={{ width: 100, height: 14, background: '#1E1E2E', borderRadius: 4 }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: '#E84142', fontFamily: 'var(--font-mono)', fontSize: 13 }}>⚠ {error}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570', marginBottom: 2 }}>
            {txs.length} transactions found
          </p>
        </div>
        <a href={`${EXPLORER_BASE}/address/${address}`} target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7C3AED', textDecoration: 'none' }}>
          View on Snowtrace <ExternalLink size={12} />
        </a>
      </div>

      {txs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#8888AA' }}>No transactions found for this wallet.</div>
      ) : (
        <>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 120px 130px 80px', gap: 12, padding: '8px 20px', marginBottom: 4 }}>
            {['Tx Hash', 'Type / Interaction', 'Block', 'Date', 'Value'].map(h => (
              <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {paginated.map((tx: any, i: number) => {
              const { label, color, bg } = getTxType(tx);
              const incoming = isIncoming(tx);
              const avaxVal = formatAVAX(tx.value);
              const isSuccess = tx.isError === '0';

              return (
                <a
                  key={tx.hash}
                  href={`${EXPLORER_BASE}/tx/${tx.hash}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    display: 'grid', gridTemplateColumns: '130px 1fr 120px 130px 80px',
                    gap: 12, padding: '14px 20px',
                    background: '#12121A',
                    border: `1px solid ${isSuccess ? '#1E1E2E' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius: 12, textDecoration: 'none', alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'; (e.currentTarget as HTMLElement).style.background = '#14141E'; }}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { (e.currentTarget as HTMLElement).style.borderColor = isSuccess ? '#1E1E2E' : 'rgba(239,68,68,0.2)'; (e.currentTarget as HTMLElement).style.background = '#12121A'; }}
                >
                  {/* Hash */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!isSuccess && <span style={{ fontSize: 10, color: '#EF4444' }}>✗</span>}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7C3AED' }}>
                      {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                    </span>
                  </div>

                  {/* Type + from/to */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontFamily: 'var(--font-mono)', fontSize: 11, color, background: bg, whiteSpace: 'nowrap' }}>
                      {label}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {incoming ? `From ${shortAddr(tx.from)}` : `To ${shortAddr(tx.to || '')}`}
                    </span>
                  </div>

                  {/* Block */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>
                    #{parseInt(tx.blockNumber).toLocaleString()}
                  </span>

                  {/* Date */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>
                    {formatDate(tx.timeStamp)}
                  </span>

                  {/* Value */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: incoming ? '#22c55e' : '#E2E2F0', fontWeight: avaxVal ? 600 : 400 }}>
                    {avaxVal || '—'}
                  </span>
                </a>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20, alignItems: 'center' }}>
              <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 14px', background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 8, color: page === 1 ? '#555570' : '#E2E2F0', cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                ← Prev
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA' }}>
                Page {page} / {totalPages}
              </span>
              <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '8px 14px', background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 8, color: page === totalPages ? '#555570' : '#E2E2F0', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Portfolio ───────────────────────────────────────────────────────────
export default function PortfolioSection() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const contracts = getAddresses(chainId);

  const [tab, setTab] = useState<'markets' | 'dao' | 'donations' | 'history' | 'stats'>('markets');
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);

  const { data: marketCount } = useReadContract({ address: contracts.PredictionMarket, abi: MARKET_ABI, functionName: 'marketCount' }) as { data: bigint | undefined };
  const { data: proposalCount } = useReadContract({ address: contracts.AvadixDAO, abi: DAO_ABI, functionName: 'proposalCount' }) as { data: bigint | undefined };
  const { data: campaignCount } = useReadContract({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'campaignCount' }) as { data: bigint | undefined };

  const mCount = Number(marketCount ?? 0n);
  const pCount = Number(proposalCount ?? 0n);
  const cCount = Number(campaignCount ?? 0n);

  const marketIds = Array.from({ length: mCount }, (_, i) => i + 1);
  const proposalIds = Array.from({ length: pCount }, (_, i) => i + 1);
  const campaignIds = Array.from({ length: cCount }, (_, i) => i + 1);

  if (!isConnected) {
    return (
      <section style={{ padding: '40px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Portfolio</p>
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
      {/* Detail Modals */}
      {selectedMarket !== null && (
        <PositionDetailModal marketId={selectedMarket} contracts={contracts} onClose={() => setSelectedMarket(null)} />
      )}
      {selectedProposal !== null && (
        <VoteDetailModal proposalId={selectedProposal} contracts={contracts} onClose={() => setSelectedProposal(null)} />
      )}
      {selectedCampaign !== null && (
        <DonationDetailModal campaignId={selectedCampaign} contracts={contracts} onClose={() => setSelectedCampaign(null)} />
      )}

      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Portfolio</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em' }}>Your Dashboard</h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570', marginTop: 8 }}>
          {address?.slice(0, 10)}...{address?.slice(-6)}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 36 }}>
        {[
          { label: 'Wallet Balance', value: `${parseFloat(balance?.formatted || '0').toFixed(3)} AVAX`, icon: Wallet, color: '#3B82F6' },
          { label: 'Active Markets', value: mCount.toString(), icon: BarChart3, color: '#F59E0B' },
          { label: 'DAO Votes', value: pCount.toString(), icon: CheckCircle, color: '#8B5CF6' },
          { label: 'Campaigns', value: cCount.toString(), icon: Heart, color: '#7C3AED' },
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
          { key: 'history', label: '🔍 Tx History' },
          { key: 'stats', label: '📊 Stats' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13,
            background: tab === t.key ? '#7C3AED' : 'transparent',
            color: tab === t.key ? 'white' : '#8888AA', transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'markets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570', marginBottom: 8 }}>Click a position to see full details:</p>
          {marketIds.map(id => /* @ts-ignore */ <PositionRow key={id} marketId={id} contracts={contracts} onClick={() => { setSelectedMarket(id); }} />)}
          {mCount === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#8888AA' }}>No market positions yet. <a href="/markets" style={{ color: '#7C3AED' }}>Explore Markets →</a></div>}
        </div>
      )}

      {tab === 'dao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570', marginBottom: 8 }}>Click a proposal to see full details:</p>
          {proposalIds.map(id => /* @ts-ignore */ <VoteRow key={id} proposalId={id} contracts={contracts} onClick={() => { setSelectedProposal(id); }} />)}
          {pCount === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#8888AA' }}>No votes yet. <a href="/dao" style={{ color: '#7C3AED' }}>Go to DAO →</a></div>}
        </div>
      )}

      {tab === 'donations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570', marginBottom: 8 }}>Click a campaign to see full details:</p>
          {campaignIds.map(id => /* @ts-ignore */ <DonationRow key={id} campaignId={id} contracts={contracts} onClick={() => { setSelectedCampaign(id); }} />)}
          {cCount === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: '#8888AA' }}>No donations yet. <a href="/donate" style={{ color: '#7C3AED' }}>Donate →</a></div>}
        </div>
      )}

      {tab === 'history' && (
        <TransactionHistory address={address!} chainId={chainId} />
      )}

      {tab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {[
            { label: 'Total Markets', value: mCount.toString(), icon: BarChart3 },
            { label: 'DAO Proposals', value: pCount.toString(), icon: CheckCircle },
            { label: 'Campaigns', value: cCount.toString(), icon: Heart },
            { label: 'Network', value: chainId === 43113 ? 'Fuji Testnet' : 'Mainnet', icon: Activity },
            { label: 'Wallet', value: `${address?.slice(0, 6)}...${address?.slice(-4)}`, icon: Wallet },
            { label: 'Balance', value: `${parseFloat(balance?.formatted || '0').toFixed(3)} AVAX`, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 14, padding: '20px 24px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <Icon size={14} color="#7C3AED" />
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
