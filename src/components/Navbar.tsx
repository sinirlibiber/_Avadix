'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { label: 'Markets',   href: '/markets' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'DAO',       href: '/dao' },
  { label: 'Donate',    href: '/donate' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: '1px solid rgba(124,58,237,0.12)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      backgroundColor: 'rgba(7,7,15,0.80)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 66 }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, overflow: 'hidden',
              boxShadow: '0 0 20px rgba(124,58,237,0.5)', flexShrink: 0,
              backgroundColor: '#12121A',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Avadix" width={36} height={36}
                style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: 22, color: '#F0EEFF', letterSpacing: '-0.03em',
            }}>
              AVA<span style={{ color: '#A78BFA' }}>DIX</span>
            </span>
            {/* Testnet badge */}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
              color: '#C4F135', background: 'rgba(196,241,53,0.1)',
              border: '1px solid rgba(196,241,53,0.25)',
              borderRadius: 6, padding: '2px 7px', letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>Testnet</span>
          </Link>

          {/* Desktop Navigation */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }} className="nav-desktop">
            {NAV_LINKS.map(link => {
              const active = pathname === link.href;
              return (
                <Link key={link.label} href={link.href} style={{
                  color: active ? '#F0EEFF' : '#6B6B8A',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                  padding: '7px 16px', borderRadius: 10, transition: 'all 0.2s',
                  background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
                  border: active ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                }}>
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet + Mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="nav-mobile-btn"
              style={{ background: 'none', border: 'none', color: '#6B6B8A', cursor: 'pointer', padding: 4, display: 'none' }}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div style={{ borderTop: '1px solid rgba(124,58,237,0.12)', padding: '12px 0 16px' }}>
            {NAV_LINKS.map(link => (
              <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{
                display: 'block', color: pathname === link.href ? '#A78BFA' : '#6B6B8A',
                textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 600,
                padding: '10px 8px', fontSize: 15, borderRadius: 8,
              }}>
                {link.label}
              </Link>
            ))}
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
