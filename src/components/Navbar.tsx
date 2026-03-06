'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { Menu, X, Zap } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Markets', href: '#markets' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'DAO', href: '#dao' },
  { label: 'Donate', href: '#donate' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: '1px solid rgba(30,30,46,0.8)',
      backdropFilter: 'blur(20px)',
      backgroundColor: 'rgba(10,10,15,0.85)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #E84142, #ff6b6b)',
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(232,65,66,0.4)',
            }}>
              <Zap size={20} color="white" fill="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: '#E2E2F0', letterSpacing: '-0.02em' }}>
              AVA<span style={{ color: '#E84142' }}>DIX</span>
            </span>
          </a>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} className="nav-desktop">
            {NAV_LINKS.map(link => (
              <a key={link.label} href={link.href} style={{
                color: '#8888AA', textDecoration: 'none',
                fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 14,
                padding: '6px 14px', borderRadius: 8, transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#E2E2F0'; (e.target as HTMLElement).style.background = 'rgba(232,65,66,0.08)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#8888AA'; (e.target as HTMLElement).style.background = 'transparent'; }}>
                {link.label}
              </a>
            ))}
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
              <a key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{
                display: 'block', color: '#8888AA', textDecoration: 'none',
                fontFamily: 'var(--font-display)', fontWeight: 500, padding: '10px 8px', fontSize: 15, borderRadius: 8,
              }}>{link.label}</a>
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
