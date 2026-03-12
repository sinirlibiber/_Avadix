'use client';

import { useState, useEffect } from 'react';
import { Vote, Plus, X, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { getAddresses } from '@/lib/contracts/addresses';
import DAO_ABI from '@/lib/contracts/AvadixDAO.json';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', label: 'Active' },
  passed:   { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e', label: 'Passed' },
  rejected: { bg: 'rgba(232,65,66,0.15)', color: '#E84142', label: 'Rejected' },
  pending:  { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'Pending' },
};

const STATUS_MAP: Record<number, string> = { 0: 'active', 1: 'passed', 2: 'rejected', 3: 'pending' };

// ─── Single Proposal Row ──────────────────────────────────────────────────────
function ProposalRow({
  proposalId, daoAddress, hidden, onStatus,
}: {
  proposalId: number;
  daoAddress: `0x${string}`;
  hidden?: boolean;
  onStatus?: (id: number, status: string) => void;
}) {
  const { address, isConnected } = useAccount();

  const { data: proposal, refetch } = useReadContract({
    address: daoAddress,
    abi: DAO_ABI,
    functionName: 'getProposal',
    args: [BigInt(proposalId)],
  }) as { data: any; refetch: () => void };

  const { data: yesPercentage } = useReadContract({
    address: daoAddress,
    abi: DAO_ABI,
    functionName: 'getYesPercentage',
    args: [BigInt(proposalId)],
  }) as { data: bigint | undefined };

  const { data: votingOpen } = useReadContract({
    address: daoAddress,
    abi: DAO_ABI,
    functionName: 'isVotingOpen',
    args: [BigInt(proposalId)],
  }) as { data: boolean | undefined };

  const { data: voteStatus } = useReadContract({
    address: daoAddress,
    abi: DAO_ABI,
    functionName: 'getVoteStatus',
    args: [BigInt(proposalId), address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  }) as { data: [boolean, boolean] | undefined };

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // ─── TÜM HOOK'LAR BURADA — koşullu return'den önce ───────────────────────
  const statusKey = proposal?.exists ? (STATUS_MAP[proposal.status] ?? 'active') : 'active';

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess]);

  useEffect(() => {
    if (proposal?.exists && onStatus) {
      onStatus(proposalId, statusKey);
    }
  }, [proposal?.exists, statusKey, proposalId]);
  // ─────────────────────────────────────────────────────────────────────────

  // Koşullu return'ler hook'lardan SONRA
  if (!proposal || !proposal.exists) return null;
  if (hidden) return null;

  const yesPct = Number(yesPercentage ?? 0n);
  const st = STATUS_STYLES[statusKey];
  const alreadyVoted = voteStatus?.[0] ?? false;
  const myVote = voteStatus?.[1];
  const endDate = new Date(Number(proposal.endTime) * 1000);
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
  const yesVotesDisplay = (Number(proposal.yesVotes) / 1000).toFixed(0);
  const noVotesDisplay  = (Number(proposal.noVotes)  / 1000).toFixed(0);

  const handleVote = (support: boolean) => {
    writeContract({
      address: daoAddress,
      abi: DAO_ABI,
      functionName: 'vote',
      args: [BigInt(proposalId), support],
    });
  };

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div
      style={{
        background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 16, padding: '22px 24px',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,65,66,0.25)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(232,65,66,0.1)', color: '#E84142', border: '1px solid rgba(232,65,66,0.2)' }}>{proposal.category}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>by {shortAddr(proposal.proposer)}</span>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: '#E2E2F0', marginBottom: 8 }}>{proposal.title}</h3>
          <p style={{ fontSize: 14, color: '#8888AA', lineHeight: 1.6, maxWidth: 700 }}>{proposal.description}</p>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e' }}>YES {yesPct}% — {yesVotesDisplay}K votes</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142' }}>NO {100 - yesPct}% — {noVotesDisplay}K votes</span>
        </div>
        <div style={{ background: '#1E1E2E', borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${yesPct}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 6, transition: 'width 0.8s ease' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570' }}>
          {votingOpen ? `${daysLeft}d remaining` : `Ended ${endDate.toLocaleDateString()}`}
        </span>

        {votingOpen && (
          alreadyVoted ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e' }}>✓ Voted {myVote ? 'YES' : 'NO'}</div>
          ) : isPending ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#F59E0B' }}>⏳ Confirming...</div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {!isConnected && <ConnectButton accountStatus="avatar" showBalance={false} />}
              <button onClick={() => handleVote(true)} style={{ padding: '8px 20px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#22c55e', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>✓ Vote Yes</button>
              <button onClick={() => handleVote(false)} style={{ padding: '8px 20px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, color: '#E84142', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>✗ Vote No</button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function DAOSection() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const contracts = getAddresses(chainId);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Governance', durationDays: '7' });
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'passed' | 'rejected'>('all');
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});

  const handleProposalStatus = (id: number, status: string) => {
    setStatusMap(prev => prev[id] === status ? prev : { ...prev, [id]: status });
  };

  const { data: proposalCount, refetch: refetchCount } = useReadContract({
    address: contracts.AvadixDAO,
    abi: DAO_ABI,
    functionName: 'proposalCount',
  }) as { data: bigint | undefined; refetch: () => void };

  const count = Number(proposalCount ?? 0n);
  const proposalIds = Array.from({ length: count }, (_, i) => i + 1);

  const { writeContract: writeCreate, data: createTxHash, isPending: isCreating } = useWriteContract();
  const { isSuccess: createDone } = useWaitForTransactionReceipt({ hash: createTxHash });

  useEffect(() => {
    if (createDone) {
      refetchCount();
      setCreateSuccess(true);
      setForm({ title: '', description: '', category: 'Governance', durationDays: '7' });
      setTimeout(() => { setCreateSuccess(false); setShowCreate(false); }, 2000);
    }
  }, [createDone]);

  const handleCreate = () => {
    setCreateError('');
    if (!isConnected) { setCreateError('Connect your wallet to submit a proposal.'); return; }
    if (!form.title.trim()) { setCreateError('Title is required.'); return; }
    if (!form.description.trim()) { setCreateError('Description is required.'); return; }
    const days = parseInt(form.durationDays);
    if (!days || days < 1) { setCreateError('Duration must be at least 1 day.'); return; }

    writeCreate({
      address: contracts.AvadixDAO,
      abi: DAO_ABI,
      functionName: 'createProposal',
      args: [form.title, form.description, form.category, BigInt(days * 86400)],
    });
  };

  return (
    <section id="dao" style={{ padding: '80px 24px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Governance</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em', lineHeight: 1 }}>DAO Proposals</h2>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#E84142', border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, boxShadow: '0 0 20px rgba(232,65,66,0.3)', transition: 'all 0.2s' }}>
          <Plus size={16} /> New Proposal
        </button>
      </div>

      {/* DAO Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total Proposals', value: count.toString(), icon: Vote },
          { label: 'On-Chain', value: '✓', icon: Clock },
          { label: 'Network', value: chainId === 43113 ? 'Fuji' : 'Mainnet', icon: CheckCircle },
          { label: 'Contract', value: `${contracts.AvadixDAO.slice(0, 6)}...`, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 12, padding: '16px 18px' }}>
            <Icon size={16} color="#E84142" style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0' }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {(['all', 'active', 'passed', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, textTransform: 'capitalize', background: filter === f ? '#E84142' : '#12121A', color: filter === f ? 'white' : '#8888AA', transition: 'all 0.2s' }}>{f}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {count === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#8888AA' }}>No proposals yet. Be the first to submit one!</div>
        )}
        {proposalIds.map(id => (
          <ProposalRow
            key={id}
            proposalId={id}
            daoAddress={contracts.AvadixDAO}
            onStatus={handleProposalStatus}
            hidden={filter !== 'all' && statusMap[id] !== filter}
          />
        ))}
      </div>

      {/* Create Proposal Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', padding: 24 }}>
          <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, padding: '6px 10px', color: '#E84142', cursor: 'pointer' }}><X size={16} /></button>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0', marginBottom: 6 }}>New Proposal</h3>
            <p style={{ color: '#8888AA', fontSize: 14, marginBottom: 24 }}>Submit a proposal for community governance vote.</p>

            {createSuccess ? (
              <div style={{ padding: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>✓ Proposal submitted on-chain!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Proposal Title', key: 'title', placeholder: 'Short, clear title for your proposal', type: 'text' },
                  { label: 'Full Description', key: 'description', placeholder: 'Describe your proposal in detail...', type: 'textarea' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{label}</label>
                    {type === 'textarea' ? (
                      <textarea placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={4} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    ) : (
                      <input type="text" placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none' }}>
                      {['Governance', 'Fee Structure', 'New Markets', 'Tokenomics', 'Product', 'Treasury'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Duration (days)</label>
                    <input type="number" min="1" max="30" placeholder="7" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                {createError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, color: '#E84142', fontSize: 13, fontFamily: 'var(--font-mono)' }}>⚠ {createError}</div>
                )}
                <button onClick={handleCreate} disabled={isCreating} style={{ width: '100%', padding: '13px 0', background: '#E84142', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, cursor: isCreating ? 'wait' : 'pointer', opacity: isCreating ? 0.7 : 1, boxShadow: '0 0 20px rgba(232,65,66,0.3)' }}>
                  {isCreating ? '⏳ Submitting...' : !isConnected ? '⚠ Connect Wallet First' : 'Submit Proposal On-Chain'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
