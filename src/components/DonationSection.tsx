'use client';

import React from 'react';

import { useState, useEffect, useRef } from 'react';
import { Heart, Sparkles, ChevronLeft, ChevronRight, Plus, X, Upload, Clock, Users } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getAddresses } from '@/lib/contracts/addresses';
import DONATIONS_ABI from '@/lib/contracts/AvadixDonations.json';
import { DONATION_QUOTES } from '@/lib/data';

const EMOJIS = ['💎', '🚀', '🌱', '🔺', '📚', '🏆', '💡', '🤝'];
const MIN_AMOUNT = 0.001;
// Fotoğrafı emoji field'ına gömmek için ayraç
const IMG_SEPARATOR = '|||';

// ─── Resmi canvas ile küçült → base64 thumbnail ───────────────────────────────
function resizeImageToBase64(file: File, maxPx = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxPx / img.width, maxPx / img.height);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// emoji field'ından emoji ve resmi ayır
function parseEmojiField(raw: string): { emoji: string; imageData: string | null } {
  if (!raw) return { emoji: '💎', imageData: null };
  const idx = raw.indexOf(IMG_SEPARATOR);
  if (idx === -1) return { emoji: raw, imageData: null };
  return {
    emoji: raw.slice(0, idx),
    imageData: raw.slice(idx + IMG_SEPARATOR.length) || null,
  };
}

// ─── CampaignCard ─────────────────────────────────────────────────────────────
function CampaignCard({
  campaignId, contractAddr, isSelected, onSelect, filterTab,
}: {
  campaignId: number;
  contractAddr: `0x${string}`;
  isSelected: boolean;
  onSelect: (id: number, data: any) => void;
  filterTab: 'all' | 'active' | 'completed';
}) {
  const { data: campaign } = useReadContract({
    address: contractAddr, abi: DONATIONS_ABI, functionName: 'getCampaign', args: [BigInt(campaignId)],
  }) as { data: any };
  const { data: progress } = useReadContract({
    address: contractAddr, abi: DONATIONS_ABI, functionName: 'getProgress', args: [BigInt(campaignId)],
  }) as { data: bigint | undefined };
  const { data: donationCount } = useReadContract({
    address: contractAddr, abi: DONATIONS_ABI, functionName: 'getDonationCount', args: [BigInt(campaignId)],
  }) as { data: bigint | undefined };

  if (!campaign?.exists) return null;

  const pct      = Number(progress ?? 0n);
  const raised   = parseFloat(formatEther(campaign.raised));
  const goal     = parseFloat(formatEther(campaign.goal));
  const donors   = Number(donationCount ?? 0n);
  const deadline = new Date(Number(campaign.deadline) * 1000);
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const deadlineMs = Number(campaign.deadline) * 1000;
  const isComplete = pct >= 100 || !campaign.active || (deadlineMs > 0 && Date.now() > deadlineMs);

  // Filter tab kontrolü
  if (filterTab === 'active' && isComplete) return null;
  if (filterTab === 'completed' && !isComplete) return null;

  // Fotoğrafı emoji field'ından çek (blockchain'de saklı)
  const { emoji, imageData } = parseEmojiField(campaign.emoji ?? '💎');

  return (
    <div
      onClick={() => onSelect(campaignId, { ...campaign, id: campaignId, progress: pct, _emoji: emoji, _imageData: imageData })}
      style={{
        background: isSelected ? 'rgba(255,255,255,0.06)' : '#111111',
        border: `1px solid ${isSelected ? 'rgba(255,255,255,0.10)' : '#1C1C1C'}`,
        borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {/* Fotoğraf — blockchain'den */}
      {imageData && (
        <div style={{ borderRadius: 10, overflow: 'hidden', height: 110, marginBottom: 12 }}>
          <img src={imageData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Tamamlandı banner */}
      {isComplete && (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, padding: '7px 12px', marginBottom: 10, textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: '#22c55e' }}>
            Donation goal reached — No more donations accepted
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#FAFAFA' }}>{campaign.name}</div>
          <div style={{ fontSize: 12, color: '#8888AA', marginTop: 2, lineHeight: 1.4 }}>{campaign.description}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', marginTop: 4 }}>by {shortAddr(campaign.creator)}</div>
        </div>
      </div>

      <div style={{ background: '#1C1C1C', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          width: `${Math.min(100, pct)}%`, height: '100%',
          background: isComplete ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#7C3AED,#ff6b6b)',
          borderRadius: 4, transition: 'width 0.8s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isComplete ? '#22c55e' : '#FAFAFA', fontWeight: 600 }}>{pct}%</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>{donors} donors</span>
          {!isComplete && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>{daysLeft}d left</span>}
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{raised.toFixed(3)}/{goal.toFixed(3)} AVAX</span>
      </div>
    </div>
  );
}

// ─── Donation history ─────────────────────────────────────────────────────────
function DonationHistory({ campaignId, contractAddr }: { campaignId: number; contractAddr: `0x${string}` }) {
  const { data: donations } = useReadContract({
    address: contractAddr, abi: DONATIONS_ABI, functionName: 'getDonations', args: [BigInt(campaignId)],
  }) as { data: any[] | undefined };

  if (!donations || donations.length === 0)
    return <div style={{ textAlign: 'center', padding: '20px 0', color: '#555570', fontFamily: 'var(--font-mono)', fontSize: 12 }}>No donations yet</div>;

  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Donation History ({donations.length})</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
        {[...donations].reverse().map((d: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0A0A0A', borderRadius: 8, gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>{shortAddr(d.donor)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FAFAFA', fontWeight: 600 }}>{parseFloat(formatEther(d.amount)).toFixed(3)} AVAX</span>
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

  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [selectedData, setSelectedData] = useState<any>(null);
  const [amount, setAmount] = useState('0.001');
  const [showHistory, setShowHistory] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', goal: '', emoji: '💎', durationDays: '30' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [donateError, setDonateError] = useState('');

  useEffect(() => {
    const t = setInterval(() => setQuoteIdx((i: number) => (i + 1) % DONATION_QUOTES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const quote = DONATION_QUOTES[quoteIdx];

  const { data: campaignCount, refetch: refetchCount } = useReadContract({
    address: contracts.AvadixDonations, abi: DONATIONS_ABI, functionName: 'campaignCount',
  }) as { data: bigint | undefined; refetch: () => void };

  const count = Number(campaignCount ?? 0n);
  const campaignIds = Array.from({ length: count }, (_, i) => i + 1);

  // ─── Seçili kampanyanın live verisi ───────────────────────────────────────
  const { data: selectedCampaignLive, refetch: refetchSelected } = useReadContract({
    address: contracts.AvadixDonations, abi: DONATIONS_ABI,
    functionName: 'getCampaign', args: [BigInt(selectedId)],
    query: { enabled: selectedId > 0 },
  }) as { data: any; refetch: () => void };

  const { data: selectedProgressLive } = useReadContract({
    address: contracts.AvadixDonations, abi: DONATIONS_ABI,
    functionName: 'getProgress', args: [BigInt(selectedId)],
    query: { enabled: selectedId > 0 },
  }) as { data: bigint | undefined };

  // Live hesaplamalar
  const liveGoal   = selectedCampaignLive ? parseFloat(formatEther(selectedCampaignLive.goal)) : 0;
  const liveRaised = selectedCampaignLive ? parseFloat(formatEther(selectedCampaignLive.raised)) : 0;
  const liveRemaining = Math.max(0, liveGoal - liveRaised);
  const livePct    = Number(selectedProgressLive ?? 0n);
  const liveActive = selectedCampaignLive?.active ?? true;
  const liveDeadlineMs = selectedCampaignLive ? Number(selectedCampaignLive.deadline) * 1000 : 0;
  const isComplete = livePct >= 100 || !liveActive || (liveDeadlineMs > 0 && Date.now() > liveDeadlineMs);

  // ─── Amount clamp: max = kalan miktar ────────────────────────────────────
  const maxDonation = liveRemaining > 0 ? Math.floor(liveRemaining * 1000) / 1000 : 0;

  const SUGGESTED = (() => {
    const base = [0.001, 0.01, 0.1, 1];
    if (maxDonation <= 0) return base.map(String);
    return base.filter(v => v <= maxDonation + 0.0001).map(String);
  })();

  // ─── Donate ──────────────────────────────────────────────────────────────
  const { writeContract: writeDonate, data: donateTxHash, isPending: isDonating } = useWriteContract();
  const { isLoading: isDonateConfirming, isSuccess: donateSuccess } = useWaitForTransactionReceipt({ hash: donateTxHash });

  useEffect(() => {
    if (donateSuccess) {
      setAmount('0.001');
      setDonateError('');
      refetchSelected();
    }
  }, [donateSuccess]);

  const handleAmountChange = (val: string) => {
    setDonateError('');
    if (val === '') { setAmount(''); return; }
    const num = parseFloat(val);
    if (isNaN(num)) { setAmount(val); return; }
    // Kalan miktarı aşarsa uyar ama girişi engelleme
    setAmount(val);
  };

  const handleAmountBlur = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < MIN_AMOUNT) { setAmount(MIN_AMOUNT.toFixed(3)); return; }
    // Kalan miktarı aşıyorsa otomatik kap
    if (maxDonation > 0 && num > maxDonation) {
      setAmount(maxDonation.toFixed(3));
    }
  };

  const handleDonate = () => {
    setDonateError('');
    if (!isConnected) { setDonateError('Connect your wallet first!'); return; }

    const num = parseFloat(amount);
    if (isNaN(num) || num < MIN_AMOUNT) { setDonateError(`Minimum donation is ${MIN_AMOUNT} AVAX`); return; }

    const bal = parseFloat(balance?.formatted || '0');
    if (num > bal) { setDonateError(`Insufficient balance. You have ${bal.toFixed(3)} AVAX`); return; }

    // Kampanya tamamlandı mı?
    if (isComplete) { setDonateError('This campaign is complete. No more donations accepted.'); return; }

    // Kalan miktardan fazla mı?
    if (maxDonation > 0 && num > maxDonation + 0.0001) {
      setDonateError(`Maximum donation is ${maxDonation.toFixed(3)} AVAX (remaining to goal)`);
      setAmount(maxDonation.toFixed(3));
      return;
    }

    // Deadline geçmiş mi?
    if (selectedCampaignLive?.deadline) {
      const deadline = Number(selectedCampaignLive.deadline) * 1000;
      if (Date.now() > deadline) { setDonateError('This campaign has ended.'); return; }
    }

    writeDonate({
      address: contracts.AvadixDonations, abi: DONATIONS_ABI,
      functionName: 'donate', args: [BigInt(selectedId)],
      value: parseEther(amount),
    });
  };

  // ─── Create campaign ──────────────────────────────────────────────────────
  const { writeContract: writeCreate, data: createTxHash, isPending: isCreating } = useWriteContract();
  const { isSuccess: createDone } = useWaitForTransactionReceipt({ hash: createTxHash });

  useEffect(() => {
    if (createDone) {
      refetchCount();
      setCreateSuccess(true);
      setForm({ name: '', description: '', goal: '', emoji: '💎', durationDays: '30' });
      setImagePreview(null);
      setImageFile(null);
      setTimeout(() => { setCreateSuccess(false); setShowCreate(false); }, 2500);
    }
  }, [createDone]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    try {
      const thumb = await resizeImageToBase64(file, 160);
      setImagePreview(thumb);
    } catch {
      // Fallback: full base64
      const reader = new FileReader();
      reader.onload = ev => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    setCreateError('');
    if (!isConnected) { setCreateError('Connect wallet to create a campaign.'); return; }
    if (!form.name.trim()) { setCreateError('Campaign name required.'); return; }
    if (!form.description.trim()) { setCreateError('Description required.'); return; }
    const goalNum = parseFloat(form.goal);
    if (!goalNum || goalNum < MIN_AMOUNT) { setCreateError(`Minimum goal is ${MIN_AMOUNT} AVAX.`); return; }
    const days = parseInt(form.durationDays);
    if (!days || days < 1) { setCreateError('Duration must be at least 1 day.'); return; }

    // emoji field'ına resmi göm: "💎|||data:image/jpeg;base64,..."
    let emojiField = form.emoji;
    if (imagePreview) {
      emojiField = `${form.emoji}${IMG_SEPARATOR}${imagePreview}`;
    }

    writeCreate({
      address: contracts.AvadixDonations, abi: DONATIONS_ABI,
      functionName: 'createCampaign',
      args: [form.name, form.description, emojiField, parseEther(form.goal), BigInt(days * 86400)],
    });
  };

  const txPending = isDonating || isDonateConfirming;
  const selectedName = selectedData?.name ?? (selectedCampaignLive?.name ?? `Campaign #${selectedId}`);

  return (
    <section style={{ padding: '40px 24px 80px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#FAFAFA', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>// Community</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(32px,5vw,52px)', color: '#FAFAFA', letterSpacing: '-0.03em', lineHeight: 1 }}>Give Back</h2>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: '#FAFAFA', border: 'none', borderRadius: 10, color: '#0A0A0A', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, boxShadow: 'none' }}>
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {/* Quote carousel */}
      <div style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(18,18,26,0.8))', border: '1px solid #222222', borderRadius: 20, padding: '28px 36px', marginBottom: 40, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, left: -10, fontSize: 100, color: 'rgba(255,255,255,0.06)', fontFamily: 'Georgia,serif', lineHeight: 1, userSelect: 'none' }}>"</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(16px,2vw,20px)', fontWeight: 500, color: '#FAFAFA', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 10, position: 'relative', zIndex: 1 }}>"{quote.text}"</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#FAFAFA', position: 'relative', zIndex: 1 }}>— {quote.author}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <button onClick={() => setQuoteIdx((i: number) => (i - 1 + DONATION_QUOTES.length) % DONATION_QUOTES.length)} style={{ background: '#1C1C1C', border: '1px solid #222222', borderRadius: 6, padding: '4px 8px', color: '#FAFAFA', cursor: 'pointer' }}><ChevronLeft size={14} /></button>
          {DONATION_QUOTES.map((_: any, i: number) => <div key={i} onClick={() => setQuoteIdx(i)} style={{ width: i === quoteIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === quoteIdx ? '#FAFAFA' : '#1C1C1C', cursor: 'pointer', transition: 'all 0.3s' }} />)}
          <button onClick={() => setQuoteIdx((i: number) => (i + 1) % DONATION_QUOTES.length)} style={{ background: '#1C1C1C', border: '1px solid #222222', borderRadius: 6, padding: '4px 8px', color: '#FAFAFA', cursor: 'pointer' }}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,420px)', gap: 28, alignItems: 'start' }}>
        {/* Campaign list */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#FAFAFA', margin: 0 }}>Campaigns ({count})</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'active', 'completed'] as const).map(f => (
                <button key={f} onClick={() => setCampaignFilter(f)} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12, textTransform: 'capitalize',
                  background: campaignFilter === f ? '#FAFAFA' : '#111111',
                  color: campaignFilter === f ? '#0A0A0A' : '#666', transition: 'all 0.2s',
                }}>{f === 'completed' ? '✅ Completed' : f === 'active' ? '🟢 Active' : 'All'}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {count === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: '#8888AA', fontSize: 14 }}>No campaigns yet. Create the first one!</div>}
            {campaignIds.map(id => (
              // @ts-ignore
              <CampaignCard
                key={id} campaignId={id} contractAddr={contracts.AvadixDonations}
                isSelected={selectedId === id}
                filterTab={campaignFilter as "all" | "active" | "completed"}
                onSelect={(id, data) => { setSelectedId(id); setSelectedData(data); setShowHistory(false); setDonateError(''); }}
              />
            ))}
          </div>
        </div>

        {/* Donate panel */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ background: '#111111', border: '1px solid #1C1C1C', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Heart size={20} color="#FAFAFA" fill="#FAFAFA" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: '#FAFAFA' }}>Donate to {selectedName}</h3>
            </div>

            {/* Kalan miktar göstergesi */}
            {selectedId > 0 && liveGoal > 0 && (
              <div style={{ background: '#0A0A0A', border: '1px solid #1C1C1C', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA' }}>Campaign Progress</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isComplete ? '#22c55e' : '#FAFAFA', fontWeight: 600 }}>{livePct}%</span>
                </div>
                <div style={{ background: '#1C1C1C', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ width: `${Math.min(100, livePct)}%`, height: '100%', background: isComplete ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#7C3AED,#ff6b6b)', borderRadius: 4, transition: 'width 0.8s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>Raised: {liveRaised.toFixed(3)} AVAX</span>
                  {!isComplete && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#FAFAFA', fontWeight: 600 }}>Remaining: {liveRemaining.toFixed(3)} AVAX</span>}
                </div>
              </div>
            )}

            {/* Amount */}
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Amount (AVAX){maxDonation > 0 && !isComplete ? ` — max ${maxDonation.toFixed(3)}` : ` — min ${MIN_AMOUNT}`}
              </label>

              {/* Quick amount buttons — sadece kalan miktara kadar göster */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {SUGGESTED.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setDonateError(''); }} style={{
                    flex: 1, minWidth: 52, padding: '7px 0',
                    background: amount === a ? '#1C1C1C' : '#0A0A0A',
                    border: `1px solid ${amount === a ? 'rgba(255,255,255,0.12)' : '#1C1C1C'}`,
                    borderRadius: 8, color: amount === a ? '#FAFAFA' : '#8888AA',
                    fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
                  }}>{a}</button>
                ))}
                {/* MAX butonu */}
                {maxDonation > 0 && !isComplete && (
                  <button onClick={() => { setAmount(maxDonation.toFixed(3)); setDonateError(''); }} style={{
                    padding: '7px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid #222222',
                    borderRadius: 8, color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                  }}>MAX</button>
                )}
              </div>

              <div style={{ background: '#0A0A0A', border: `1px solid ${donateError ? 'rgba(255,255,255,0.15)' : '#1C1C1C'}`, borderRadius: 10, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', marginRight: 6 }}>AVAX</span>
                <input
                  type="number" step="0.001" min={MIN_AMOUNT}
                  max={maxDonation > 0 ? maxDonation : undefined}
                  placeholder="0.001" value={amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAmountChange(e.target.value)}
                  onBlur={handleAmountBlur}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 14, padding: '10px 0' }}
                />
              </div>
              {balance && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8888AA', textAlign: 'right', marginTop: 4 }}>Balance: {parseFloat(balance.formatted).toFixed(3)} AVAX</div>}
            </div>

            {/* Hata mesajı */}
            {donateError && (
              <div style={{ padding: '10px 14px', background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#FAFAFA', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                ⚠ {donateError}
              </div>
            )}

            {txPending && (
              <div style={{ padding: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, color: '#F59E0B', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                ⏳ {isDonating ? 'Awaiting wallet...' : 'Confirming on-chain...'}
              </div>
            )}

            {/* Tamamlandı banner */}
            {isComplete && (
              <div style={{ padding: '14px 16px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, textAlign: 'center' }}>
                <div style={{ color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Donation goal reached!</div>
                <div style={{ color: '#8888AA', fontFamily: 'var(--font-mono)', fontSize: 12 }}>This campaign is complete — no more donations accepted.</div>
              </div>
            )}

            {donateSuccess ? (
              <div style={{ padding: 14, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Donation confirmed on-chain!
              </div>
            ) : (
              <button
                onClick={handleDonate}
                disabled={txPending || isComplete}
                style={{
                  width: '100%', padding: '14px',
                  background: isComplete ? '#1C1C1C' : (isConnected ? '#FAFAFA' : '#1C1C1C'),
                  border: 'none', borderRadius: 10, color: '#0A0A0A',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15,
                  cursor: (txPending || isComplete) ? 'not-allowed' : 'pointer',
                  opacity: (txPending || isComplete) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: isConnected && !isComplete ? '0 0 20px #222222' : 'none',
                }}
              >
                <Heart size={16} fill="white" />
                {isDonating ? 'Awaiting wallet...'
                  : isDonateConfirming ? 'Confirming...'
                  : !isConnected ? 'Connect Wallet to Donate'
                  : isComplete ? 'Campaign Complete'
                  : `Donate ${amount} AVAX`}
                {isConnected && !txPending && !isComplete && <Sparkles size={14} />}
              </button>
            )}

            <button onClick={() => setShowHistory((h: boolean) => !h)} style={{ background: 'none', border: '1px solid #1C1C1C', borderRadius: 8, padding: '8px 0', color: '#8888AA', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', width: '100%' }}>
              {showHistory ? '▲ Hide' : '▼ Show'} donation history
            </button>

            {showHistory && selectedId && <DonationHistory campaignId={selectedId} contractAddr={contracts.AvadixDonations} />}

            <p style={{ textAlign: 'center', fontSize: 11, color: '#555570', fontFamily: 'var(--font-body)' }}>On-chain donations · Avalanche network · Min {MIN_AMOUNT} AVAX</p>
          </div>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', padding: 24 }}>
          <div style={{ background: '#111111', border: '1px solid #1C1C1C', borderRadius: 20, padding: 32, width: '100%', maxWidth: 500, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: 16, right: 16, background: '#1C1C1C', border: '1px solid #222222', borderRadius: 8, padding: '6px 10px', color: '#FAFAFA', cursor: 'pointer' }}><X size={16} /></button>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: '#FAFAFA', marginBottom: 6 }}>Create Campaign</h3>
            <p style={{ color: '#8888AA', fontSize: 14, marginBottom: 24 }}>Launch a fundraising campaign on Avadix.</p>

            {createSuccess ? (
              <div style={{ padding: 20, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, textAlign: 'center', color: '#22c55e', fontFamily: 'var(--font-display)', fontWeight: 600 }}>✓ Campaign created on-chain!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Image upload */}
                <div>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Campaign Image (optional)
                    <span style={{ color: '#555570', fontWeight: 400, marginLeft: 6 }}>— stored on-chain, visible to everyone</span>
                  </label>
                  <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #1C1C1C', borderRadius: 12, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#0A0A0A' }}
                    onMouseEnter={(e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                    onMouseLeave={(e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.borderColor = '#1C1C1C')}>
                    {imagePreview ? (
                      <div style={{ position: 'relative' }}>
                        <img src={imagePreview} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                        <button onClick={e => { e.stopPropagation(); setImagePreview(null); setImageFile(null); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 6, padding: '4px 6px', color: 'white', cursor: 'pointer' }}><X size={12} /></button>
                        <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#555570' }}>Compressed to 160px thumbnail for on-chain storage</div>
                      </div>
                    ) : (
                      <div>
                        <Upload size={20} color="#555570" style={{ margin: '0 auto 6px' }} />
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#555570' }}>Click to upload</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </div>



                {[
                  { label: 'Campaign Name', key: 'name', placeholder: 'What are you raising for?', type: 'text' },
                  { label: 'Description', key: 'description', placeholder: 'Why should people support this?', type: 'textarea' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
                    {type === 'textarea' ? (
                      <textarea placeholder={placeholder} value={(form as any)[key]} onChange={(e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, [key]: e.target.value }))} rows={3} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0A', border: '1px solid #1C1C1C', borderRadius: 10, color: '#FAFAFA', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    ) : (
                      <input type="text" placeholder={placeholder} value={(form as any)[key]} onChange={(e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0A', border: '1px solid #1C1C1C', borderRadius: 10, color: '#FAFAFA', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Goal (AVAX)</label>
                    <input type="number" step="0.001" min={MIN_AMOUNT} placeholder="e.g. 1" value={form.goal} onChange={(e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, goal: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0A', border: '1px solid #1C1C1C', borderRadius: 10, color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8888AA', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Duration (days)</label>
                    <input type="number" min="1" max="365" placeholder="30" value={form.durationDays} onChange={(e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, durationDays: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0A0A0A', border: '1px solid #1C1C1C', borderRadius: 10, color: '#FAFAFA', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {createError && <div style={{ padding: '10px', background: '#1C1C1C', border: '1px solid #222222', borderRadius: 8, color: '#FAFAFA', fontSize: 13, fontFamily: 'var(--font-mono)' }}>⚠ {createError}</div>}
                <button onClick={handleCreate} disabled={isCreating} style={{ width: '100%', padding: '13px', background: '#FAFAFA', border: 'none', borderRadius: 10, color: '#0A0A0A', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, cursor: isCreating ? 'wait' : 'pointer', opacity: isCreating ? 0.7 : 1, boxShadow: 'none' }}>
                  {isCreating ? 'Awaiting wallet...' : !isConnected ? 'Connect Wallet First' : 'Launch Campaign On-Chain'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
