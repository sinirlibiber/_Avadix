'use client';

// X (Twitter) SVG icon
const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// Discord SVG icon
const DiscordIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

// GitHub SVG icon
const GitHubIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const SOCIAL = [
  { icon: XIcon,       href: 'https://x.com/AvadixLabs',           label: 'X / Twitter' },
  { icon: DiscordIcon, href: 'https://discord.gg/nG9UyBFhMK',      label: 'Discord' },
  { icon: GitHubIcon,  href: '#',                                    label: 'GitHub' },
];

const LINKS = [
  { title: 'Platform',  items: [{ label: 'Markets', href: '/markets' }, { label: 'Portfolio', href: '/portfolio' }, { label: 'Leaderboard', href: '#' }, { label: 'Analytics', href: '#' }] },
  { title: 'Protocol',  items: [{ label: 'DAO Governance', href: '/dao' }, { label: 'Documentation', href: '#' }, { label: 'Token', href: '#' }, { label: 'Contracts', href: 'https://testnet.snowtrace.io' }] },
  { title: 'Community', items: [{ label: 'Discord', href: 'https://discord.gg/nG9UyBFhMK' }, { label: 'Twitter', href: 'https://x.com/AvadixLabs' }, { label: 'Blog', href: '#' }, { label: 'GitHub', href: '#' }] },
];

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #1C1C1C',
      padding: '52px 28px 36px',
      marginTop: 60,
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '220px repeat(3, 1fr)',
          gap: 48,
          marginBottom: 48,
        }} className="footer-grid">

          {/* Brand col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-new.png" alt="Avadix" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 16, color: '#FAFAFA', letterSpacing: '-0.03em',
              }}>AVADIX</span>
            </div>

            <p style={{
              fontSize: 13, color: '#555', lineHeight: 1.75,
              fontFamily: 'var(--font-body)', maxWidth: 200,
            }}>
              Decentralized prediction markets on Avalanche Fuji. Predict. Trade. Earn.
            </p>

            {/* Testnet badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
              background: '#111', border: '1px solid #222',
              borderRadius: 6, padding: '4px 10px',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#22C55E', display: 'inline-block',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>Fuji Testnet</span>
            </div>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  style={{
                    width: 34, height: 34,
                    background: '#111', border: '1px solid #222',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#555', textDecoration: 'none',
                    transition: 'color 0.2s, border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = '#FAFAFA';
                    el.style.borderColor = '#333';
                    el.style.background = '#1A1A1A';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.color = '#555';
                    el.style.borderColor = '#222';
                    el.style.background = '#111';
                  }}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {LINKS.map(group => (
            <div key={group.title}>
              <h4 style={{
                fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 10,
                color: '#444', marginBottom: 20,
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>{group.title}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.items.map(item => (
                  <li key={item.label}>
                    <a href={item.href} style={{
                      color: '#666', textDecoration: 'none',
                      fontSize: 14, fontFamily: 'var(--font-body)',
                      letterSpacing: '-0.01em',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FAFAFA')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#666')}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid #1C1C1C', paddingTop: 24,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 12,
        }}>
          <p style={{ fontSize: 12, color: '#333', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>
            © 2026 Avadix Labs. Built on Avalanche.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy', 'Terms', 'Risk Disclosure'].map(item => (
              <a key={item} href="#" style={{
                fontSize: 12, color: '#333', textDecoration: 'none',
                fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#888')}
              onMouseLeave={e => (e.currentTarget.style.color = '#333')}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @media (max-width: 900px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
