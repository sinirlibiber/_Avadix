'use client';

import { Twitter, Github, MessageCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(124,58,237,0.15)',
      padding: '56px 24px 36px', marginTop: 40, position: 'relative',
    }}>
      {/* Gradient top line */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '70%', height: 1,
        background: 'linear-gradient(90deg, transparent, #7C3AED, #3B82F6, #06B6D4, transparent)',
        animation: 'navLine 5s linear infinite',
        backgroundSize: '200% 100%',
      }} />

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 44, marginBottom: 56 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, overflow: 'hidden',
                background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
                padding: 2, boxShadow: '0 0 20px rgba(124,58,237,0.4)',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Avadix"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8, background: '#0C0C1A' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#EEF0FF', letterSpacing: '-0.04em' }}>
                AVA<span style={{ background: 'linear-gradient(90deg,#A78BFA,#60A5FA,#67E8F9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>DIX</span>
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#55557A', lineHeight: 1.7, maxWidth: 240, fontFamily: 'var(--font-body)' }}>
              Decentralized prediction markets on Avalanche Fuji. Predict. Trade. Earn.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
              background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: 8, padding: '4px 10px',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#67E8F9', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#67E8F9', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
                  width: 36, height: 36, background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.18)', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#55557A', textDecoration: 'none', transition: 'all 0.25s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(59,130,246,0.5)';
                  el.style.color = '#93C5FD';
                  el.style.background = 'rgba(59,130,246,0.12)';
                  el.style.boxShadow = '0 0 15px rgba(59,130,246,0.2)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(124,58,237,0.18)';
                  el.style.color = '#55557A';
                  el.style.background = 'rgba(124,58,237,0.08)';
                  el.style.boxShadow = 'none';
                }}>
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {[
            { title: 'Platform', links: ['Markets', 'Portfolio', 'Leaderboard', 'Analytics'] },
            { title: 'Protocol', links: ['DAO Governance', 'Staking', 'Token', 'Documentation'] },
            { title: 'Community', links: ['Discord', 'Twitter', 'Blog', 'GitHub'] },
          ].map(group => (
            <div key={group.title}>
              <h4 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 11,
                color: '#55557A', marginBottom: 18, letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{group.title}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.links.map(link => (
                  <li key={link}>
                    <a href="#" style={{ color: '#9999CC', textDecoration: 'none', fontSize: 14, fontFamily: 'var(--font-body)', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#A78BFA')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#9999CC')}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          borderTop: '1px solid rgba(124,58,237,0.1)', paddingTop: 28,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <p style={{ fontSize: 12, color: '#55557A', fontFamily: 'var(--font-mono)' }}>
            © 2026 Avadix Labs. Built on Avalanche.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy', 'Terms', 'Risk Disclosure'].map(item => (
              <a key={item} href="#" style={{ fontSize: 12, color: '#55557A', textDecoration: 'none', fontFamily: 'var(--font-mono)', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#A78BFA')}
                onMouseLeave={e => (e.currentTarget.style.color = '#55557A')}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes navLine { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </footer>
  );
}
