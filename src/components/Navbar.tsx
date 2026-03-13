'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
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
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: scrolled ? '1px solid rgba(124,58,237,0.18)' : '1px solid transparent',
      backdropFilter: scrolled ? 'blur(28px)' : 'blur(0px)',
      WebkitBackdropFilter: scrolled ? 'blur(28px)' : 'blur(0px)',
      backgroundColor: scrolled ? 'rgba(6,6,14,0.88)' : 'transparent',
      transition: 'all 0.4s ease',
    }}>
      {/* Animated top border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, #7C3AED, #3B82F6, #06B6D4, transparent)',
        backgroundSize: '200% 100%',
        animation: 'navLine 4s linear infinite',
        opacity: scrolled ? 1 : 0,
        transition: 'opacity 0.4s',
      }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
              background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
              padding: 2,
              boxShadow: '0 0 20px rgba(124,58,237,0.5), 0 0 40px rgba(59,130,246,0.2)',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Avadix"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10, background: '#0C0C1A' }} />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 22, color: '#EEF0FF', letterSpacing: '-0.04em',
            }}>
              AVA<span style={{
                background: 'linear-gradient(90deg, #A78BFA, #60A5FA, #67E8F9)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>DIX</span>
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
              color: '#67E8F9', background: 'rgba(6,182,212,0.1)',
              border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: 6, padding: '2px 7px', letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}>Testnet</span>
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }} className="nav-desktop">
            {NAV_LINKS.map(link => {
              const active = pathname === link.href;
              return (
                <Link key={link.label} href={link.href} style={{
                  color: active ? '#EEF0FF' : '#9999CC',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                  padding: '7px 16px', borderRadius: 12, transition: 'all 0.25s',
                  background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
                  border: active ? '1px solid rgba(124,58,237,0.35)' : '1px solid transparent',
                  boxShadow: active ? '0 0 20px rgba(124,58,237,0.15)' : 'none',
                }}>
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="nav-mobile-btn"
              style={{ background: 'none', border: 'none', color: '#9999CC', cursor: 'pointer', padding: 4, display: 'none' }}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div style={{ borderTop: '1px solid rgba(124,58,237,0.15)', padding: '12px 0 16px' }}>
            {NAV_LINKS.map(link => (
              <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} style={{
                display: 'block',
                color: pathname === link.href ? '#A78BFA' : '#9999CC',
                textDecoration: 'none', fontFamily: 'var(--font-display)',
                fontWeight: 600, padding: '10px 8px', fontSize: 15, borderRadius: 10,
              }}>
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes navLine {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (min-width: 768px) { .nav-desktop { display: flex !important; } .nav-mobile-btn { display: none !important; } }
        @media (max-width: 767px) { .nav-desktop { display: none !important; } .nav-mobile-btn { display: flex !important; } }
      `}</style>
    </nav>
  );
}
