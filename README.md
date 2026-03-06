<div align="center">

# ⚡ AVADIX

### Decentralized Prediction Markets on Avalanche

[![Avalanche](https://img.shields.io/badge/Avalanche-E84142?style=for-the-badge&logo=avalanche&logoColor=white)](https://avax.network)
[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Wagmi](https://img.shields.io/badge/Wagmi_v2-1C1C1E?style=for-the-badge)](https://wagmi.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

**Trade on real-world events. Govern the protocol. Support the community.**  
Built on Avalanche C-Chain — fast, cheap, and fully on-chain.

[Live Demo](https://avadix.vercel.app) · [Report Bug](https://github.com/sinirlibiber/Avadix_/issues) · [Request Feature](https://github.com/sinirlibiber/Avadix_/issues)

</div>

---

## 🌟 What is Avadix?

Avadix is a next-generation decentralized prediction market platform inspired by Polymarket, built natively on Avalanche. Users trade binary YES/NO outcomes on crypto, politics, sports, and technology events — with real-time price discovery, DAO governance, and on-chain community donations.

> *"Don't just watch the future unfold — bet on it."*

---

## ✨ Features

### 📊 Prediction Markets
- Binary YES/NO markets with live AMM pricing (0–100¢ scale)
- Filter by category: **Crypto · AVAX · Politics · Sports · Tech**
- Sort by volume, trending, or recency
- **Create your own market** — write a question, set a date, publish instantly

### 📈 Portfolio Dashboard
- Track all open positions with real-time PnL
- Full trading history and activity log
- Win rate, total trades, and performance stats

### 🏛️ DAO Governance
- Browse and vote on community proposals
- **Submit your own proposal** — any token holder can participate
- On-chain voting with live result tracking

### 💚 Community Donations
- Donate AVAX to active community campaigns
- **Launch your own fundraising campaign** with a custom goal
- Every transaction is transparent and recorded on-chain

### 🔗 Web3 Native
- RainbowKit + WalletConnect v2 integration
- Supports **Avalanche Mainnet** and **Fuji Testnet**
- Live balance display, MAX button, transaction status feedback

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, Custom CSS Variables |
| **Web3** | Wagmi v2, Viem, RainbowKit |
| **Wallet** | WalletConnect v2, MetaMask, Core Wallet |
| **Blockchain** | Avalanche C-Chain (Mainnet + Fuji Testnet) |
| **Fonts** | Syne, DM Sans, JetBrains Mono |

---

## 🚀 Quick Start

### Prerequisites

```
Node.js 18+
npm or yarn
MetaMask or Core Wallet
```

### Installation

```bash
# Clone the repository
git clone https://github.com/sinirlibiber/Avadix_.git
cd Avadix_

# Install dependencies
npm install --legacy-peer-deps

# Set up environment variables
cp .env.example .env.local
# Add your WalletConnect Project ID to .env.local

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root directory:

```env
# WalletConnect — get yours free at https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Avalanche Chain ID
# 43114 = Mainnet | 43113 = Fuji Testnet
NEXT_PUBLIC_CHAIN_ID=43113
```

---

## 📁 Project Structure

```
avadix/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + providers
│   │   └── page.tsx            # Main page
│   ├── components/
│   │   ├── Navbar.tsx          # Navigation + wallet connect
│   │   ├── Hero.tsx            # Landing hero section
│   │   ├── MarketsSection.tsx  # Market list + create market
│   │   ├── MarketCard.tsx      # Individual market card + trading
│   │   ├── PortfolioSection.tsx # Positions, activity, stats
│   │   ├── DAOSection.tsx      # Proposals + voting
│   │   ├── DonationSection.tsx # Campaigns + donate
│   │   └── Footer.tsx
│   ├── lib/
│   │   ├── wagmi.ts            # Wagmi + RainbowKit config
│   │   ├── data.ts             # Types, mock data, helpers
│   │   └── async-storage-mock.js # React Native compat shim
│   └── styles/
│       └── globals.css         # Global styles + CSS variables
├── next.config.js
├── tailwind.config.ts
├── vercel.json
└── package.json
```

---

## 🌐 Network Configuration

### Avalanche Fuji Testnet
```
Chain ID:      43113
RPC URL:       https://api.avax-test.network/ext/bc/C/rpc
Explorer:      https://testnet.snowtrace.io
Currency:      AVAX
```

### Avalanche Mainnet
```
Chain ID:      43114
RPC URL:       https://api.avax.network/ext/bc/C/rpc
Explorer:      https://snowtrace.io
Currency:      AVAX
```

🚰 **Get free testnet AVAX:** [faucet.avax.network](https://faucet.avax.network)

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the project
2. Create your branch → `git checkout -b feature/your-feature`
3. Commit your changes → `git commit -m 'feat: add your feature'`
4. Push to the branch → `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

<div align="center">

**Built with ❤️ on Avalanche · Avadix Labs · 2025**

[![Avalanche](https://img.shields.io/badge/Powered_by-Avalanche-E84142?style=flat-square&logo=avalanche&logoColor=white)](https://avax.network)

</div>
