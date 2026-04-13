'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { Menu, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChainId, useSwitchChain } from 'wagmi';
import { avalanche, avalancheFuji } from 'wagmi/chains';
import { AVAX_MAINNET_ID, AVAX_TESTNET_ID } from '@/lib/wagmi';

const NAV_LINKS = [
  { label: 'Markets',   href: '/markets' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'DAO',       href: '/dao' },
  { label: 'Donate',    href: '/donate' },
];

function NetworkToggle() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const isMainnet = chainId === AVAX_MAINNET_ID;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: '#111', border: '1px solid #222',
      borderRadius: 10, padding: 3, gap: 2,
    }}>
      {/* Testnet */}
      <button
        onClick={() => switchChain({ chainId: avalancheFuji.id })}
        disabled={isPending}
        style={{
          background: !isMainnet ? '#1C1C1C' : 'transparent',
          border: !isMainnet ? '1px solid #333' : '1px solid transparent',
          borderRadius: 7, padding: '4px 10px',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: !isMainnet ? '#FAFAFA' : '#444',
          cursor: isPending ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        Testnet
      </button>

      {/* Mainnet */}
      <button
        onClick={() => switchChain({ chainId: avalanche.id })}
        disabled={isPending}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: isMainnet ? 'linear-gradient(135deg, #C4F135 0%, #a8d42a 100%)' : 'transparent',
          border: isMainnet ? '1px solid #C4F135' : '1px solid transparent',
          borderRadius: 7, padding: '4px 10px',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: isMainnet ? '#0a0a0a' : '#444',
          cursor: isPending ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        {isMainnet && (
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#0a0a0a', display: 'inline-block',
            animation: 'pulse 2s infinite',
          }} />
        )}
        Mainnet
      </button>
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const chainId = useChainId();
  const isMainnet = chainId === AVAX_MAINNET_ID;
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: `1px solid ${scrolled ? '#1C1C1C' : 'transparent'}`,
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
      backgroundColor: scrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-new.png"
              alt="Avadix"
              style={{ width: 28, height: 28, objectFit: 'contain' }}
            />
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 18, color: '#FAFAFA', letterSpacing: '-0.03em',
            }}>
              AVADIX
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
              color: isMainnet ? '#0a0a0a' : '#555',
              background: isMainnet ? '#C4F135' : '#161616',
              border: `1px solid ${isMainnet ? '#C4F135' : '#222'}`,
              borderRadius: 5, padding: '2px 7px', letterSpacing: '0.08em',
              textTransform: 'uppercase',
              transition: 'all 0.3s ease',
            }}>
              {isMainnet ? 'Mainnet' : 'Testnet'}
            </span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', gap: 0, alignItems: 'center' }} className="nav-desktop">
            {NAV_LINKS.map(link => {
              const active = pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link key={link.label} href={link.href} style={{
                  color: active ? '#FAFAFA' : '#666',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14,
                  padding: '6px 14px', borderRadius: 8, transition: 'color 0.2s',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#AAAAAA'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#666'; }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NetworkToggle />
            <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="nav-mobile-btn"
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4, display: 'none' }}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div style={{ borderTop: '1px solid #1C1C1C', padding: '10px 0 14px' }}>
            {NAV_LINKS.map(link => (
              <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{
                display: 'block',
                color: pathname === link.href ? '#FAFAFA' : '#666',
                textDecoration: 'none', fontFamily: 'var(--font-display)',
                fontWeight: 500, padding: '10px 4px', fontSize: 14, borderRadius: 8,
              }}>
                {link.label}
              </Link>
            ))}
            <div style={{ paddingTop: 10 }}>
              <NetworkToggle />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) { .nav-desktop { display: flex !important; } .nav-mobile-btn { display: none !important; } }
        @media (max-width: 767px) { .nav-desktop { display: none !important; } .nav-mobile-btn { display: flex !important; } }
      `}</style>
    </nav>
  );
}
