'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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
      borderBottom: '1px solid rgba(30,30,46,0.8)',
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(10,10,15,0.85)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', boxShadow: '0 0 20px rgba(232,65,66,0.4)', flexShrink: 0 }}>
              <Image src="/logo.jpg" alt="Avadix" width={36} height={36} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#E2E2F0', letterSpacing: '-0.02em' }}>
              AVA<span style={{ color: '#E84142' }}>DIX</span>
            </span>
          </Link>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} className="nav-desktop">
            {NAV_LINKS.map(link => {
              const active = pathname === link.href;
              return (
                <Link key={link.label} href={link.href} style={{
                  color: active ? '#E2E2F0' : '#8888AA', textDecoration: 'none',
                  fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14,
                  padding: '6px 14px', borderRadius: 8, transition: 'all 0.2s',
                  background: active ? 'rgba(232,65,66,0.12)' : 'transparent',
                  borderBottom: active ? '2px solid #E84142' : '2px solid transparent',
                }}>{link.label}</Link>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="nav-mobile-btn" style={{ background: 'none', border: 'none', color: '#8888AA', cursor: 'pointer', padding: 4, display: 'none' }}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div style={{ borderTop: '1px solid rgba(30,30,46,0.8)', padding: '12px 0 16px' }}>
            {NAV_LINKS.map(link => (
              <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{
                display: 'block', color: pathname === link.href ? '#E84142' : '#8888AA',
                textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 500,
                padding: '10px 8px', fontSize: 15, borderRadius: 8,
              }}>{link.label}</Link>
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
