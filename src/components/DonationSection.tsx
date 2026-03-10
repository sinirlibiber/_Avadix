'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, Sparkles, ChevronLeft, ChevronRight, Plus, X, Upload, Clock, Users } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import DONATIONS_ABI from '@/lib/contracts/AvadixDonations.json';
import { DONATION_QUOTES } from '@/lib/data';

const SUGGESTED = ['0.001', '0.01', '0.1', '1'];
const EMOJIS = ['💎', '🚀', '🌱', '🔺', '📚', '🏆', '💡', '🤝'];
const MIN_AMOUNT = 0.001;

function CampaignCard({ campaignId, contractAddr, isSelected, onSelect }: {
  campaignId: number; contractAddr: `0x${string}`; isSelected: boolean; onSelect: (id: number, data: any) => void;
}) {
  const { data: campaign } = useReadContract({ address: contractAddr, abi: DONATIONS_ABI, functionName: 'getCampaign', args: [BigInt(campaignId)] }) as { data: any };
  const { data: progress } = useReadContract({ address: contractAddr, abi: DONATIONS_ABI, functionName: 'getProgress', args: [BigInt(campaignId)] }) as { data: bigint | undefined };
  const { data: donationCount } = useReadContract({ address: contractAddr, abi: DONATIONS_ABI, functionName: 'getDonationCount', args: [BigInt(campaignId)] }) as { data: bigint | undefined };

  if (!campaign?.exists) return null;

  const pct    = Number(progress ?? 0n);
  const raised = parseFloat(formatEther(campaign.raised)).toFixed(3);
  const goal   = parseFloat(formatEther(campaign.goal)).toFixed(3);
  const donors = Number(donationCount ?? 0n);
  const deadline = new Date(Number(campaign.deadline) * 1000);
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
  const shortAddr = (a: string) => `${a.slice(0,6)}...${a.slice(-4)}`;

  return (
    <div onClick={() => onSelect(campaignId, { ...campaign, id: campaignId, progress: pct })} style={{
      background: isSelected ? 'rgba(232,65,66,0.06)' : '#12121A',
      border: `1px solid ${isSelected ? 'rgba(232,65,66,0.35)' : '#1E1E2E'}`,
      borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'all 0.2s',
    }}>
      {campaign.imageUrl && (
        <div style={{ borderRadius: 10, overflow: 'hidden', height: 100, marginBottom: 12 }}>
          <img src={campaign.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 28 }}>{campaign.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#E2E2F0' }}>{campaign.name}</div>
          <div style={{ fontSize: 12, color: '#8888AA', marginTop: 2, lineHeight: 1.4 }}>{campaign.description}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginTop: 4 }}>by {shortAddr(campaign.creator)}</div>
        </div>
      </div>
      <div style={{ background: '#1E1E2E', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: 'linear-gradient(90deg, #E84142, #ff6b6b)', borderRadius: 4, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#E84142' }}>{pct}%</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>{donors} donors</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>{daysLeft}d left</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{raised}/{goal} AVAX</span>
      </div>
    </div>
  );
}

// ─── Donation history for a campaign ─────────────────────────────────────────
function DonationHistory({ campaignId, contractAddr }: { campaignId: number; contractAddr: `0x${string}` }) {
  const { data: donations } = useReadContract({
    address: contractAddr, abi: DONATIONS_ABI,
    functionName: 'getDonations', args: [BigInt(campaignId)],
  }) as { data: any[] | undefined };

  if (!donations || donations.length === 0) return (
    <div style={{ textAlign: 'center', padding: '20px 0', color: '#555570', fontFamily: 'var(--font-mono)', fontSize: 12 }}>No donations yet</div>
  );

  const shortAddr = (a: string) => `${a.slice(0,6)}...${a.slice(-4)}`;

  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Donation History ({donations.length})</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
        {[...donations].reverse().map((d, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0A0A0F', borderRadius: 8, gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{shortAddr(d.donor)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', fontWeight: 600 }}>{parseFloat(formatEther(d.amount)).toFixed(3)} AVAX</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570' }}>{new Date(Number(d.timestamp) * 1000).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DonationSection() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const contracts = getAddresses(chainId);
  const fileRef = useRef<HTMLInputElement>(null);

  const [quoteIdx, setQuoteIdx]   = useState(0);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [amount, setAmount]   = useState('0.001');
  const [showHistory, setShowHistory] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', goal: '', emoji: '💎', durationDays: '30' });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [createError, setCreateError]   = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % DONATION_QUOTES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const quote = DONATION_QUOTES[quoteIdx];

  const { data: campaignCount, refetch: refetchCount } = useReadContract({
    address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'campaignCount',
  }) as { data: bigint | undefined; refetch: () => void };

  const count = Number(campaignCount ?? 0n);
  const campaignIds = Array.from({ length: count }, (_, i) => i + 1);

  // Donate
  const { writeContract: writeDonate, data: donateTxHash, isPending: isDonating } = useWriteContract();
  const { isLoading: isDonateConfirming, isSuccess: donateSuccess } = useWaitForTransactionReceipt({ hash: donateTxHash });

  useEffect(() => { if (donateSuccess) { setAmount('0.001'); } }, [donateSuccess]);

  const handleAmountChange = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) { setAmount(''); return; }
    const rounded = Math.round(num * 1000) / 1000;
    setAmount(rounded.toString());
  };

  const handleAmountBlur = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < MIN_AMOUNT) setAmount(MIN_AMOUNT.toFixed(3));
  };

  const handleDonate = () => {
    if (!isConnected) { alert('Connect your wallet first!'); return; }
    const num = parseFloat(amount);
    if (isNaN(num) || num < MIN_AMOUNT) { alert(`Minimum donation is ${MIN_AMOUNT} AVAX`); return; }
    const bal = parseFloat(balance?.formatted || '0');
    if (num > bal) { alert(`Insufficient balance. You have ${bal.toFixed(3)} AVAX`); return; }

    writeDonate({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'donate', args: [BigInt(selectedId)], value: parseEther(amount) });
  };

  // Create campaign
  const { writeContract: writeCreate, data: createTxHash, isPending: isCreating } = useWriteContract();
  const { isSuccess: createDone } = useWaitForTransactionReceipt({ hash: createTxHash });

  useEffect(() => {
    if (createDone) {
      refetchCount();
      setCreateSuccess(true);
      setForm({ name: '', description: '', goal: '', emoji: '💎', durationDays: '30' });
      setImagePreview(null);
      setTimeout(() => { setCreateSuccess(false); setShowCreate(false); }, 2000);
    }
  }, [createDone]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    setCreateError('');
    if (!isConnected) { setCreateError('Connect wallet to create a campaign.'); return; }
    if (!form.name.trim()) { setCreateError('Campaign name required.'); return; }
    if (!form.description.trim()) { setCreateError('Description required.'); return; }
    const goalNum = parseFloat(form.goal);
    if (!goalNum || goalNum < MIN_AMOUNT) { setCreateError(`Minimum goal is ${MIN_AMOUNT} AVAX.`); return; }
    const days = parseInt(form.durationDays);
    if (!days || days < 1) { setCreateError('Duration must be at least 1 day.'); return; }

    writeCreate({ address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'createCampaign', args: [form.name, form.description, form.emoji, parseEther(form.goal), BigInt(days * 86400)] });
  };

  const txPending = isDonating || isDonateConfirming;
  const selectedName = selectedData?.name ?? `Campaign #${selectedId}`;

  return (
    <section style={{ padding: '40px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E84142', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Community</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#E2E2F0', letterSpacing: '-0.03em', lineHeight: 1 }}>Give Back</h2>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#E84142', border: 'none', borderRadius: 10, color: 'white', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, boxShadow: '0 0 20px rgba(232,65,66,0.3)' }}>
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {/* Quote carousel */}
      <div style={{ background: 'linear-gradient(135deg, rgba(232,65,66,0.08), rgba(18,18,26,0.8))', border: '1px solid rgba(232,65,66,0.18)', borderRadius: 20, padding: '28px 36px', marginBottom: 40, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, left: -10, fontSize: 100, color: 'rgba(232,65,66,0.06)', fontFamily: 'Georgia, serif', lineHeight: 1, userSelect: 'none' }}>"</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,2vw,20px)', fontWeight: 500, color: '#E2E2F0', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 10, position: 'relative', zIndex: 1 }}>"{quote.text}"</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E84142', position: 'relative', zIndex: 1 }}>— {quote.author}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <button onClick={() => setQuoteIdx(i => (i - 1 + DONATION_QUOTES.length) % DONATION_QUOTES.length)} style={{ background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 6, padding: '4px 8px', color: '#E84142', cursor: 'pointer' }}><ChevronLeft size={14} /></button>
          {DONATION_QUOTES.map((_, i) => <div key={i} onClick={() => setQuoteIdx(i)} style={{ width: i === quoteIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === quoteIdx ? '#E84142' : '#2A2A3E', cursor: 'pointer', transition: 'all 0.3s' }} />)}
          <button onClick={() => setQuoteIdx(i => (i + 1) % DONATION_QUOTES.length)} style={{ background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 6, padding: '4px 8px', color: '#E84142', cursor: 'pointer' }}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,420px)', gap: 28, alignItems: 'start' }}>
        {/* Campaign list */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#E2E2F0', marginBottom: 14 }}>Campaigns ({count})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {count === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: '#8888AA', fontSize: 14 }}>No campaigns yet. Create the first one!</div>}
            {campaignIds.map(id => (
              <CampaignCard key={id} campaignId={id} contractAddr={contracts.AvadixDonations} isSelected={selectedId === id} onSelect={(id, data) => { setSelectedId(id); setSelectedData(data); setShowHistory(false); }} />
            ))}
          </div>
        </div>

        {/* Donate panel */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Heart size={20} color="#E84142" fill="#E84142" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#E2E2F0' }}>Donate to {selectedName}</h3>
            </div>

            {/* Quick amounts */}
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Amount (AVAX) — min {MIN_AMOUNT}</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {SUGGESTED.map(a => (
                  <button key={a} onClick={() => setAmount(a)} style={{ flex: 1, padding: '7px 0', background: amount === a ? 'rgba(232,65,66,0.15)' : '#0A0A0F', border: `1px solid ${amount === a ? 'rgba(232,65,66,0.4)' : '#1E1E2E'}`, borderRadius: 8, color: amount === a ? '#E84142' : '#8888AA', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}>{a}</button>
                ))}
              </div>
              <div style={{ background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', marginRight: 6 }}>AVAX</span>
                <input type="number" step="0.001" min={MIN_AMOUNT} placeholder="0.001" value={amount} onChange={e => handleAmountChange(e.target.value)} onBlur={handleAmountBlur} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '10px 0' }} />
                {balance && <button onClick={() => { const bal = Math.floor(parseFloat(balance.formatted) * 1000) / 1000; setAmount(bal.toFixed(3)); }} style={{ background: 'none', border: 'none', color: '#E84142', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer' }}>MAX</button>}
              </div>
              {balance && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textAlign: 'right', marginTop: 4 }}>Balance: {parseFloat(balance.formatted).toFixed(3)} AVAX</div>}
            </div>

            {txPending && <div style={{ padding: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, color: '#F59E0B', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center' }}>⏳ {isDonating ? 'Awaiting wallet...' : 'Confirming on-chain...'}</div>}

            {donateSuccess ? (
              <div style={{ padding: 14, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>💚 Donation confirmed on-chain!</div>
            ) : (
              <button onClick={handleDonate} disabled={txPending} style={{ width: '100%', padding: '14px', background: isConnected ? '#E84142' : '#2A2A3E', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, cursor: txPending ? 'wait' : 'pointer', opacity: txPending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: isConnected ? '0 0 20px rgba(232,65,66,0.2)' : 'none' }}>
                <Heart size={16} fill="white" />
                {isDonating ? 'Awaiting wallet...' : isDonateConfirming ? 'Confirming...' : !isConnected ? 'Connect Wallet to Donate' : `Donate ${amount} AVAX`}
                {isConnected && !txPending && <Sparkles size={14} />}
              </button>
            )}

            {/* Donation history toggle */}
            <button onClick={() => setShowHistory(h => !h)} style={{ background: 'none', border: '1px solid #1E1E2E', borderRadius: 8, padding: '8px 0', color: '#8888AA', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', width: '100%', transition: 'all 0.2s' }}>
              {showHistory ? '▲ Hide' : '▼ Show'} donation history
            </button>

            {showHistory && selectedId && (
              <DonationHistory campaignId={selectedId} contractAddr={contracts.AvadixDonations} />
            )}

            <p style={{ textAlign: 'center', fontSize: 11, color: '#555570', fontFamily: 'var(--font-body)' }}>On-chain donations · Avalanche network · Min {MIN_AMOUNT} AVAX</p>
          </div>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: 24 }}>
          <div style={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 20, padding: 32, width: '100%', maxWidth: 500, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, padding: '6px 10px', color: '#E84142', cursor: 'pointer' }}><X size={16} /></button>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#E2E2F0', marginBottom: 6 }}>Create Campaign</h3>
            <p style={{ color: '#8888AA', fontSize: 14, marginBottom: 24 }}>Launch a fundraising campaign on Avadix. Cüzdan onayı gereklidir.</p>

            {createSuccess ? (
              <div style={{ padding: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>✓ Campaign created on-chain!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Image upload */}
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Campaign Image (optional)</label>
                  <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #1E1E2E', borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#0A0A0F' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,65,66,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}>
                    {imagePreview ? (
                      <div style={{ position: 'relative' }}>
                        <img src={imagePreview} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                        <button onClick={e => { e.stopPropagation(); setImagePreview(null); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6, padding: '4px 6px', color: 'white', cursor: 'pointer' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <div><Upload size={20} color="#555570" style={{ margin: '0 auto 6px' }} /><p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>Click to upload</p></div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </div>

                {/* Emoji */}
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Emoji</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {EMOJIS.map(e => <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{ width: 36, height: 36, fontSize: 18, background: form.emoji === e ? 'rgba(232,65,66,0.2)' : '#0A0A0F', border: `1px solid ${form.emoji === e ? 'rgba(232,65,66,0.4)' : '#1E1E2E'}`, borderRadius: 8, cursor: 'pointer' }}>{e}</button>)}
                  </div>
                </div>

                {[
                  { label: 'Campaign Name', key: 'name', placeholder: 'What are you raising for?', type: 'text' },
                  { label: 'Description', key: 'description', placeholder: 'Why should people support this?', type: 'textarea' },
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
                    <input type="number" step="0.001" min={MIN_AMOUNT} placeholder="e.g. 10" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Duration (days)</label>
                    <input type="number" min="1" max="365" placeholder="30" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0F', border: '1px solid #1E1E2E', borderRadius: 10, color: '#E2E2F0', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {createError && <div style={{ padding: '10px', background: 'rgba(232,65,66,0.1)', border: '1px solid rgba(232,65,66,0.2)', borderRadius: 8, color: '#E84142', fontSize: 13, fontFamily: 'var(--font-mono)' }}>⚠ {createError}</div>}
                <button onClick={handleCreate} disabled={isCreating} style={{ width: '100%', padding: '13px', background: '#E84142', border: 'none', borderRadius: 10, color: 'white', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, cursor: isCreating ? 'wait' : 'pointer', opacity: isCreating ? 0.7 : 1, boxShadow: '0 0 20px rgba(232,65,66,0.3)' }}>
                  {isCreating ? '⏳ Cüzdan onayı bekleniyor...' : !isConnected ? '⚠ Connect Wallet First' : 'Launch Campaign On-Chain'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
