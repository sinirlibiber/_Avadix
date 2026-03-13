'use client';

import '@rainbow-me/rainbowkit/styles.css';
import '../styles/globals.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { useState } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <title>Avadix — Prediction Markets on Avalanche</title>
        <meta name="description" content="Trade on real-world events. Decentralized prediction markets powered by Avalanche." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="talentapp:project_verification" content="033052ef8cbb62276f84f91e24511edefaa860296599fceb14390e5931190e3b268d5c866bbcec8501a65b571376e86d595fa72fb6e6063377162e3f203a6ff7" />
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
      </head>
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              theme={darkTheme({
                accentColor: '#7C3AED',
                accentColorForeground: 'white',
                borderRadius: 'medium',
                fontStack: 'system',
                overlayBlur: 'small',
              })}
            >
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
