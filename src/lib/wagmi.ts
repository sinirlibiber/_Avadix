'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalancheFuji } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Avadix',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '7d3964281a4c775253f30bc4d8fb13cb',
  chains: [avalancheFuji],
  ssr: true,
});

export const AVAX_TESTNET_ID = 43113;
