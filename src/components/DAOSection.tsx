'use client';

import { useState } from 'react';
import { Vote, Plus, X, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { DAO_PROPOSALS, DAOProposal } from '@/lib/data';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', label: 'Active' },
  passed:   { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e', label: 'Passed' },
  rejected: { bg: 'rgba(232,65,66,0.15)', color: '#E84142', label: 'Rejected' },
  pending:  { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'Pending' },
};

export default function DAOSection() {
  const { isConnected, address } = useAccount();
  const [proposals, setProposals] = useState<DAOProposal[]>(DAO_PROPOSALS);
  const [voted, setVoted] = useState<Record<number, 'yes' | 'no'>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Governance', endDate: '' });
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'passed' | 'rejected'>('all');

  const handleVote = (id: number, vote: 'yes' | 'no') => {
    if (!isConnected) { alert('Connect your wallet to vote!'); return; }
    if (voted[id]) return;
    setVoted(v => ({ ...v, [id]: vote }));
    setProposals(ps => ps.map(p => p.id === id ? {
      ...p,
      yesVotes: vote === 'yes' ? p.yesVotes + 1000 : p.yesVotes,
      noVotes: vote === 'no' ? p.noVotes + 1000 : p.noVotes,
    } : p));
  };

  const handleCreate = () => {
    setCreateError('');
    if (!isConnected) { setCreateError('Connect your wallet to submit a proposal.'); return; }
    if (!form.title.trim()) { setCreateError('Title is required.'); return; }
    if (!form.description.trim()) { setCreateError('Description is required.'); return; }
    if (!form.endDate) { setCreateError('End date is required.'); return; }
    if (new Date(form.endDate) <= new Date()) { setCreateError('End date must be in the future.'); return; }
    const newProp: DAOProposal = {
      id: Date.now(),
      title: form.title,
      description: form.description,
      proposer: `${address?.slice(0,6)}...${address?.slice(-4)}`,
      yesVotes: 0,
      noVotes: 0,
      status: 'active',
      endDate: form.endDate,
      category: form.category,
    };
    setProposals(ps => [newProp, ...ps]);
    setCreateSuccess(true);
    setForm({ title: '', description: '', category: 'Governance', endDate: '' });
    setTimeout(() => { setCreateSuccess(false); setShowCreate(false); }, 2000);
  };

  const filtered = proposals.filter(p => filter === 'all' || p.status === filter);

  return (
    <section id="dao" style={{ padding: '80px 24px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Governance</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em', lineHeight: 1 }}>DAO Proposals</h2>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px',
          background: '#E84142', border: 'none', borderRadius: 10, color: 'white',
          cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
          boxShadow: '0 0 20px rgba(232,65,66,0.3)', transition: 'all 0.2s',
        }}>
          <Plus size={16} /> New Proposal
        </button>
      </div>

      {/* DAO Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Total Proposals', value: proposals.length.toString(), icon: Vote },
          { label: 'Active', value: proposals.filter(p => p.status === 'active').length.toString(), icon: Clock },
          { label: 'Passed', value: proposals.filter(p => p.status === 'passed').length.toString(), icon: CheckCircle },
          { label: 'Token Holders', value: '3,240', icon: Users },
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
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13, textTransform: 'capitalize',
            background: filter === f ? '#E84142' : '#12121A',
            color: filter === f ? 'white' : '#8888AA', transition: 'all 0.2s',
          }}>{f}</button>
        ))}
      </div>

      {/* Proposals list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(prop => {
          const total = prop.yesVotes + prop.noVotes || 1;
          const yesPct = Math.round((prop.yesVotes / total) * 100);
          const st = STATUS_STYLES[prop.status];
          const hasVoted = voted[prop.id];
          const daysLeft = Math.max(0, Math.ceil((new Date(prop.endDate).getTime() - Date.now()) / 86400000));

          return (
            <div key={prop.id} style={{
              background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 16, padding: '22px 24px',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,65,66,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(232,65,66,0.1)', color: '#E84142', border: '1px solid rgba(232,65,66,0.2)' }}>{prop.category}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>by {prop.proposer}</span>
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: '#E2E2F0', marginBottom: 8 }}>{prop.title}</h3>
                  <p style={{ fontSize: 14, color: '#8888AA', lineHeight: 1.6, maxWidth: 700 }}>{prop.description}</p>
                </div>
              </div>

              {/* Vote bar */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e' }}>
                    YES {yesPct}% — {(prop.yesVotes / 1000).toFixed(0)}K votes
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142' }}>
                    NO {100 - yesPct}% — {(prop.noVotes / 1000).toFixed(0)}K votes
                  </span>
                </div>
                <div style={{ background: '#1E1E2E', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${yesPct}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 6, transition: 'width 0.8s ease' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#555570' }}>
                  {prop.status === 'active' ? `${daysLeft}d remaining` : `Ended ${prop.endDate}`}
                </span>
                {prop.status === 'active' && (
                  hasVoted ? (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e' }}>
                      ✓ Voted {hasVoted.toUpperCase()}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!isConnected && <ConnectButton accountStatus="avatar" showBalance={false} />}
                      <button onClick={() => handleVote(prop.id, 'yes')} style={{
                        padding: '8px 20px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: 8, color: '#22c55e', cursor: 'pointer',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                      }}>✓ Vote Yes</button>
                      <button onClick={() => handleVote(prop.id, 'no')} style={{
                        padding: '8px 20px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)',
                        borderRadius: 8, color: '#E84142', cursor: 'pointer',
                        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                      }}>✗ Vote No</button>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Proposal Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', padding: 24 }}>
          <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, padding: '6px 10px', color: '#E84142', cursor: 'pointer' }}><X size={16} /></button>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0', marginBottom: 6 }}>New Proposal</h3>
            <p style={{ color: '#8888AA', fontSize: 14, marginBottom: 24 }}>Submit a proposal for community governance vote.</p>

            {createSuccess ? (
              <div style={{ padding: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                ✓ Proposal submitted!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Proposal Title', key: 'title', placeholder: 'Short, clear title for your proposal', type: 'text' },
                  { label: 'Full Description', key: 'description', placeholder: 'Describe your proposal in detail, including rationale and expected impact...', type: 'textarea' },
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
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Voting End</label>
                    <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', colorScheme: 'dark' }} />
                  </div>
                </div>
                {createError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, color: '#E84142', fontSize: 13, fontFamily: 'var(--font-mono)' }}>⚠ {createError}</div>
                )}
                <button onClick={handleCreate} style={{
                  width: '100%', padding: '13px 0', background: '#E84142', border: 'none',
                  borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
                  cursor: 'pointer', boxShadow: '0 0 20px rgba(232,65,66,0.3)',
                }}>
                  {!isConnected ? '⚠ Connect Wallet First' : 'Submit Proposal'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
