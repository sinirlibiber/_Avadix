'use client';

import { Zap, Twitter, Github, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(124,58,237,0.12)',
      padding: '56px 24px 36px',
      marginTop: 40,
      position: 'relative',
    }}>
      {/* Top glow line */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '60%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.5), transparent)',
      }} />

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 44, marginBottom: 56 }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 34, height: 34,
                background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(124,58,237,0.4)',
              }}>
                <Zap size={16} color="white" fill="white" />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, color: '#F0EEFF', letterSpacing: '-0.03em' }}>
                AVA<span style={{ color: '#A78BFA' }}>DIX</span>
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#6B6B8A', lineHeight: 1.7, maxWidth: 240, fontFamily: 'var(--font-body)' }}>
              Decentralized prediction markets on Avalanche Fuji. Predict. Trade. Earn.
            </p>
            {/* Testnet notice */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
              background: 'rgba(196,241,53,0.08)', border: '1px solid rgba(196,241,53,0.2)',
              borderRadius: 8, padding: '4px 10px',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#C4F135', display: 'inline-block' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C4F135', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Fuji Testnet
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              {[
                { icon: Twitter, href: 'https://x.com/AvadixLabs' },
                { icon: Github,  href: '#' },
                { icon: MessageCircle, href: 'https://discord.gg/nG9UyBFhMK' },
              ].map(({ icon: Icon, href }, i) => (
                <a key={i} href={href} style={{
                  width: 36, height: 36,
                  background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6B6B8A', textDecoration: 'none', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.5)';
                  (e.currentTarget as HTMLElement).style.color = '#A78BFA';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.15)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(124,58,237,0.2)';
                  (e.currentTarget as HTMLElement).style.color = '#6B6B8A';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)';
                }}>
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            { title: 'Platform', links: ['Markets', 'Portfolio', 'Leaderboard', 'Analytics'] },
            { title: 'Protocol', links: ['DAO Governance', 'Staking', 'Token', 'Documentation'] },
            { title: 'Community', links: ['Discord', 'Twitter', 'Blog', 'GitHub'] },
          ].map(group => (
            <div key={group.title}>
              <h4 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                color: '#9999BB', marginBottom: 18, letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>{group.title}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.links.map(link => (
                  <li key={link}>
                    <a href="#" style={{
                      color: '#6B6B8A', textDecoration: 'none', fontSize: 14,
                      fontFamily: 'var(--font-body)', transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#A78BFA')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6B6B8A')}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(124,58,237,0.1)', paddingTop: 28,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <p style={{ fontSize: 12, color: '#6B6B8A', fontFamily: 'var(--font-mono)' }}>
            © 2026 Avadix Labs. Built on Avalanche.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy', 'Terms', 'Risk Disclosure'].map(item => (
              <a key={item} href="#" style={{
                fontSize: 12, color: '#6B6B8A', textDecoration: 'none',
                fontFamily: 'var(--font-mono)', transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#A78BFA')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6B6B8A')}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
