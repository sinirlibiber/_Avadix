# 🔺 Avadix

> Decentralized Prediction Markets on Avalanche

[![Avalanche](https://img.shields.io/badge/Avalanche-E84142?style=for-the-badge&logo=avalanche&logoColor=white)](https://avax.network)
[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Avadix** is a next-generation decentralized prediction market platform on Avalanche — trade binary outcomes on crypto, politics, sports, and tech events. Includes community donation campaigns and DAO governance.

---

## ✨ Features

- **Prediction Markets** — Binary YES/NO markets with live probability display
- **Multi-network** — Avalanche Mainnet (C-Chain) & Fuji Testnet
- **Wallet Connect** — RainbowKit + WalletConnect v2 integration
- **Donations** — Community funding with on-chain AVAX transfers
- **Beautiful UI** — Dark theme with Avalanche red accent, fully responsive

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/avadix.git
cd avadix

# Install all dependencies
npm run install:all

# Copy environment file
cp .env.example client/.env.local
# Edit client/.env.local and add your WalletConnect Project ID

# Start dev server
npm run dev
```

Visit `http://localhost:3000`

## ⚙️ Environment Variables

Create `client/.env.local`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_CHAIN_ID=43113
```

Get a free WalletConnect Project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com)

## 🌐 Deploy to Vercel

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel Dashboard:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - `NEXT_PUBLIC_CHAIN_ID` = `43113`
4. Deploy ✅

The `vercel.json` in root is pre-configured.

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript |
| Styling | Tailwind CSS, custom CSS |
| Web3 | Wagmi v2, Viem, RainbowKit |
| Blockchain | Avalanche C-Chain (Mainnet + Fuji) |
| Fonts | Syne, DM Sans, JetBrains Mono |

## 📁 Project Structure

```
avadix/
├── client/              # Next.js frontend
│   └── src/
│       ├── app/         # App router pages
│       ├── components/  # UI components
│       ├── lib/         # Wagmi config, data
│       └── styles/      # Global CSS
├── vercel.json          # Vercel deployment config
├── .env.example         # Environment template
└── package.json         # Root scripts
```

## 📜 License

MIT — see [LICENSE](LICENSE)

---

**Built with ❤️ on Avalanche**
