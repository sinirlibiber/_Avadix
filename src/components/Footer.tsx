'use client';

import { Zap, Twitter, Github, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #1E1E2E',
      padding: '48px 24px 32px',
      marginTop: 40,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 40, marginBottom: 48,
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32,
                background: 'linear-gradient(135deg, #E84142, #ff6b6b)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={16} color="white" fill="white" />
              </div>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#E2E2F0',
              }}>AVA<span style={{ color: '#E84142' }}>DIX</span></span>
            </div>
            <p style={{ fontSize: 14, color: '#8888AA', lineHeight: 1.6, maxWidth: 240 }}>
              Decentralized prediction markets on Avalanche. Trade. Earn. Govern.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {[
                { icon: Twitter, href: 'https://x.com/AvadixLabs' },
                { icon: Github, href: '#' },
                { icon: MessageCircle, href: 'https://discord.gg/nG9UyBFhMK' },
              ].map(({ icon: Icon, href }, i) => (
                <a key={i} href={href} style={{
                  width: 36, height: 36,
                  background: '#12121A', border: '1px solid #1E1E2E',
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#8888AA', textDecoration: 'none', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,65,66,0.4)';
                  (e.currentTarget as HTMLElement).style.color = '#E84142';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#1E1E2E';
                  (e.currentTarget as HTMLElement).style.color = '#8888AA';
                }}>
                  <Icon size={16} />
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
                fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
                color: '#E2E2F0', marginBottom: 16, letterSpacing: '-0.01em',
              }}>{group.title}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.links.map(link => (
                  <li key={link}>
                    <a href="#" style={{
                      color: '#8888AA', textDecoration: 'none', fontSize: 14,
                      fontFamily: 'var(--font-body)', transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#E84142')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#8888AA')}>
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
          borderTop: '1px solid #1E1E2E', paddingTop: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <p style={{ fontSize: 13, color: '#8888AA', fontFamily: 'var(--font-mono)' }}>
            © 2026 Avadix. Built on Avalanche.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy', 'Terms', 'Risk Disclosure'].map(item => (
              <a key={item} href="#" style={{
                fontSize: 13, color: '#8888AA', textDecoration: 'none',
                fontFamily: 'var(--font-mono)', transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E84142')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8888AA')}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
