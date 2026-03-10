'use client';

import { useState, useEffect } from 'react';
import { Heart, Sparkles, ChevronLeft, ChevronRight, Plus, X, Users, Target } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import DONATIONS_ABI from '@/lib/contracts/AvadixDonations.json';
import { DONATION_QUOTES } from '@/lib/data';

const SUGGESTED = ['0.1', '0.5', '1', '5'];
const EMOJIS = ['💎', '🚀', '🌱', '🔺', '📚', '🏆', '💡', '🤝'];

// ─── Single Campaign Row ──────────────────────────────────────────────────────
function CampaignItem({
  campaignId, contractAddr, isSelected, onSelect,
}: {
  campaignId: number;
  contractAddr: `0x${string}`;
  isSelected: boolean;
  onSelect: (id: number, data: any) => void;
}) {
  const { data: campaign } = useReadContract({
    address: contractAddr,
    abi: DONATIONS_ABI,
    functionName: 'getCampaign',
    args: [BigInt(campaignId)],
  }) as { data: any };

  const { data: progress } = useReadContract({
    address: contractAddr,
    abi: DONATIONS_ABI,
    functionName: 'getProgress',
    args: [BigInt(campaignId)],
  }) as { data: bigint | undefined };

  if (!campaign?.exists) return null;

  const pct = Number(progress ?? 0n);
  const raised = parseFloat(formatEther(campaign.raised)).toFixed(3);
  const goal   = parseFloat(formatEther(campaign.goal)).toFixed(2);
  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div
      onClick={() => onSelect(campaignId, { ...campaign, id: campaignId, progress: pct })}
      style={{
        background: isSelected ? 'rgba(232,65,66,0.06)' : '#12121A',
        border: `1px solid ${isSelected ? 'rgba(232,65,66,0.35)' : '#1E1E2E'}`,
        borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 28 }}>{campaign.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#E2E2F0' }}>{campaign.name}</div>
          <div style={{ fontSize: 12, color: '#8888AA', marginTop: 2, lineHeight: 1.4 }}>{campaign.description}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginTop: 4 }}>by {shortAddr(campaign.creator)}</div>
        </div>
      </div>
      <div style={{ background: '#1E1E2E', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: 'linear-gradient(90deg, #E84142, #ff6b6b)', borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#E84142' }}>{pct}%</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{raised} / {goal} AVAX</span>
      </div>
    </div>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────
export default function DonationSection() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const contracts = getAddresses(chainId);

  const [quoteIdx, setQuoteIdx]   = useState(0);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [amount, setAmount]   = useState('');
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', goal: '', emoji: '💎', durationDays: '30' });
  const [createError, setCreateError]   = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % DONATION_QUOTES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const quote = DONATION_QUOTES[quoteIdx];

  // Campaign count from chain
  const { data: campaignCount, refetch: refetchCount } = useReadContract({
    address: contracts.AvadixDonations,
    abi: DONATIONS_ABI,
    functionName: 'campaignCount',
  }) as { data: bigint | undefined; refetch: () => void };

  const count = Number(campaignCount ?? 0n);
  const campaignIds = Array.from({ length: count }, (_, i) => i + 1);

  // Donate
  const { writeContract: writeDonate, data: donateTxHash, isPending: isDonating } = useWriteContract();
  const { isLoading: isDonateConfirming, isSuccess: donateSuccess } = useWaitForTransactionReceipt({ hash: donateTxHash });

  const txStatus = isDonating || isDonateConfirming ? 'pending' : donateSuccess ? 'success' : 'idle';

  useEffect(() => {
    if (donateSuccess) {
      setAmount(''); setMessage('');
      setTimeout(() => {}, 4000);
    }
  }, [donateSuccess]);

  const handleDonate = () => {
    if (!isConnected) { alert('Connect your wallet first!'); return; }
    if (!amount || parseFloat(amount) <= 0) { alert('Enter a valid amount.'); return; }
    const bal = parseFloat(balance?.formatted || '0');
    if (parseFloat(amount) > bal) { alert(`Insufficient balance. You have ${bal.toFixed(4)} AVAX`); return; }

    writeDonate({
      address: contracts.AvadixDonations,
      abi: DONATIONS_ABI,
      functionName: 'donate',
      args: [BigInt(selectedId)],
      value: parseEther(amount),
    });
  };

  // Create campaign
  const { writeContract: writeCreate, data: createTxHash, isPending: isCreating } = useWriteContract();
  const { isSuccess: createDone } = useWaitForTransactionReceipt({ hash: createTxHash });

  useEffect(() => {
    if (createDone) {
      refetchCount();
      setCreateSuccess(true);
      setForm({ name: '', description: '', goal: '', emoji: '💎', durationDays: '30' });
      setTimeout(() => { setCreateSuccess(false); setShowCreate(false); }, 2000);
    }
  }, [createDone]);

  const handleCreate = () => {
    setCreateError('');
    if (!isConnected) { setCreateError('Connect wallet to create a campaign.'); return; }
    if (!form.name.trim()) { setCreateError('Campaign name required.'); return; }
    if (!form.description.trim()) { setCreateError('Description required.'); return; }
    if (!form.goal || parseFloat(form.goal) <= 0) { setCreateError('Valid goal (AVAX) required.'); return; }
    const days = parseInt(form.durationDays);
    if (!days || days < 1) { setCreateError('Duration must be at least 1 day.'); return; }

    writeCreate({
      address: contracts.AvadixDonations,
      abi: DONATIONS_ABI,
      functionName: 'createCampaign',
      args: [form.name, form.description, form.emoji, parseEther(form.goal), BigInt(days * 86400)],
    });
  };

  const selectedName = selectedData?.name ?? `Campaign #${selectedId}`;

  return (
    <section id="donate" style={{ padding: '80px 24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Community</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em', lineHeight: 1 }}>Give Back</h2>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px',
          background: '#E84142', border: 'none', borderRadius: 10, color: 'white',
          cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
          boxShadow: '0 0 20px rgba(232,65,66,0.3)', transition: 'all 0.2s',
        }}>
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {/* Quote */}
      <div style={{ background: 'linear-gradient(135deg, rgba(232,65,66,0.08), rgba(18,18,26,0.8))', border: '1px solid rgba(232,65,66,0.18)', borderRadius: 20, padding: '28px 36px', marginBottom: 40, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, left: -10, fontSize: 100, color: 'rgba(232,65,66,0.06)', fontFamily: 'Georgia, serif', lineHeight: 1, userSelect: 'none' }}>"</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,2vw,22px)', fontWeight: 500, color: '#E2E2F0', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 10, position: 'relative', zIndex: 1 }}>"{quote.text}"</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E84142', position: 'relative', zIndex: 1 }}>— {quote.author}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button onClick={() => setQuoteIdx(i => (i - 1 + DONATION_QUOTES.length) % DONATION_QUOTES.length)} style={{ background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 6, padding: '4px 8px', color: '#E84142', cursor: 'pointer' }}><ChevronLeft size={14} /></button>
          {DONATION_QUOTES.map((_, i) => <div key={i} onClick={() => setQuoteIdx(i)} style={{ width: i === quoteIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === quoteIdx ? '#E84142' : '#2A2A3E', cursor: 'pointer', transition: 'all 0.3s' }} />)}
          <button onClick={() => setQuoteIdx(i => (i + 1) % DONATION_QUOTES.length)} style={{ background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 6, padding: '4px 8px', color: '#E84142', cursor: 'pointer' }}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Campaigns list */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#E2E2F0', marginBottom: 14 }}>Campaigns</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {count === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8888AA', fontSize: 14 }}>No campaigns yet. Create the first one!</div>
            )}
            {campaignIds.map(id => (
              <CampaignItem
                key={id}
                campaignId={id}
                contractAddr={contracts.AvadixDonations}
                isSelected={selectedId === id}
                onSelect={(id, data) => { setSelectedId(id); setSelectedData(data); }}
              />
            ))}
          </div>
        </div>

        {/* Donate form */}
        <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Heart size={20} color="#E84142" fill="#E84142" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#E2E2F0' }}>
              Donate to {selectedName}
            </h3>
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Amount (AVAX)</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {SUGGESTED.map(a => (
                <button key={a} onClick={() => setAmount(a)} style={{
                  flex: 1, padding: '8px 0',
                  background: amount === a ? 'rgba(232,65,66,0.15)' : 'rgba(30,30,46,0.8)',
                  border: `1px solid ${amount === a ? 'rgba(232,65,66,0.4)' : '#1E1E2E'}`,
                  borderRadius: 8, color: amount === a ? '#E84142' : '#8888AA',
                  fontFamily: 'var(--font-mono)', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                }}>{a}</button>
              ))}
            </div>
            <div style={{ background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', marginRight: 6 }}>AVAX</span>
              <input type="number" placeholder="Custom amount..." value={amount} onChange={e => setAmount(e.target.value)} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '12px 0' }} />
              {balance && <button onClick={() => setAmount(parseFloat(balance.formatted).toFixed(4))} style={{ background: 'none', border: 'none', color: '#E84142', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>MAX</button>}
            </div>
            {balance && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textAlign: 'right', marginTop: 4 }}>Balance: {parseFloat(balance.formatted).toFixed(4)} AVAX</div>}
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Message (optional)</label>
            <textarea placeholder="Leave a message of support..." value={message} onChange={e => setMessage(e.target.value)} rows={3} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>

          {txStatus === 'pending' && <div style={{ padding: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, color: '#F59E0B', fontSize: 13, fontFamily: 'var(--font-mono)', textAlign: 'center' }}>⏳ {isDonating ? 'Awaiting wallet...' : 'Confirming on-chain...'}</div>}

          {txStatus === 'success' ? (
            <div style={{ padding: 16, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              💚 Thank you! Your donation is on-chain!
            </div>
          ) : (
            <button onClick={handleDonate} disabled={isDonating || isDonateConfirming} style={{
              width: '100%', padding: '14px', background: isConnected ? '#E84142' : '#2A2A3E',
              border: 'none', borderRadius: 10, color: 'white',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
              cursor: (isDonating || isDonateConfirming) ? 'wait' : 'pointer',
              opacity: (isDonating || isDonateConfirming) ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: isConnected ? '0 0 20px rgba(232,65,66,0.2)' : 'none', transition: 'all 0.2s',
            }}>
              <Heart size={16} fill="white" />
              {isDonating ? 'Awaiting wallet...' : isDonateConfirming ? 'Confirming...' : !isConnected ? 'Connect Wallet to Donate' : `Donate ${amount ? amount + ' AVAX' : 'Now'}`}
              {isConnected && !isDonating && !isDonateConfirming && <Sparkles size={14} />}
            </button>
          )}
          <p style={{ textAlign: 'center', fontSize: 12, color: '#555570', fontFamily: 'var(--font-body)' }}>On-chain donations via Avalanche network.</p>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', padding: 24 }}>
          <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, padding: '6px 10px', color: '#E84142', cursor: 'pointer' }}><X size={16} /></button>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0', marginBottom: 6 }}>Create Campaign</h3>
            <p style={{ color: '#8888AA', fontSize: 14, marginBottom: 24 }}>Launch a fundraising campaign on Avadix.</p>

            {createSuccess ? (
              <div style={{ padding: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>✓ Campaign created on-chain!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Emoji</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {EMOJIS.map(e => (
                      <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{ width: 38, height: 38, fontSize: 20, background: form.emoji === e ? 'rgba(232,65,66,0.2)' : '#0A0A0F', border: `1px solid ${form.emoji === e ? 'rgba(232,65,66,0.4)' : '#1E1E2E'}`, borderRadius: 8, cursor: 'pointer' }}>{e}</button>
                    ))}
                  </div>
                </div>
                {[
                  { label: 'Campaign Name', key: 'name', placeholder: 'What are you raising for?', type: 'text' },
                  { label: 'Description',    key: 'description', placeholder: 'Why should people support this?', type: 'textarea' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
                    {type === 'textarea' ? (
                      <textarea placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={3} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    ) : (
                      <input type="text" placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Goal (AVAX)</label>
                    <input type="number" placeholder="e.g. 10" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Duration (days)</label>
                    <input type="number" min="1" max="365" placeholder="30" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                {createError && <div style={{ padding: '10px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, color: '#E84142', fontSize: 13, fontFamily: 'var(--font-mono)' }}>⚠ {createError}</div>}
                <button onClick={handleCreate} disabled={isCreating} style={{ width: '100%', padding: '13px', background: '#E84142', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, cursor: isCreating ? 'wait' : 'pointer', opacity: isCreating ? 0.7 : 1, boxShadow: '0 0 20px rgba(232,65,66,0.3)' }}>
                  {isCreating ? '⏳ Submitting...' : !isConnected ? '⚠ Connect Wallet First' : 'Launch Campaign On-Chain'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
