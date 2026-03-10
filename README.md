<div align="center">

# ⚡ AVADIX

### Decentralized Prediction Markets on Avalanche

[![Avalanche](https://img.shields.io/badge/Avalanche-E84142?style=for-the-badge&logo=avalanche&logoColor=white)](https://avax.network)
[![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Wagmi](https://img.shields.io/badge/Wagmi_v2-1C1C1E?style=for-the-badge)](https://wagmi.sh)
[![Fuji](https://img.shields.io/badge/Fuji_Testnet-Live-22c55e?style=for-the-badge)](https://testnet.snowtrace.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

**Trade on real-world events. Govern the protocol. Support the community.**  
Built natively on Avalanche C-Chain — fast, cheap, and fully on-chain.

[ Live App](https://avadix.xyz) · [ Report Bug](https://github.com/sinirlibiber/Avadix_/issues) · [Request Feature](https://github.com/sinirlibiber/Avadix_/issues) · [ Twitter](https://x.com/AvadixLabs) · [Discord](https://discord.gg/nG9UyBFhMK)

</div>

---

##  Deployed Smart Contracts

All three Avadix contracts are **live on Avalanche Fuji Testnet** — fully verified and operational.

| Contract | Address | Explorer |
|---|---|---|
| **AvadixPredictionMarket** | `0x64eEB71c16072A83F9260D0C5a17f3D53d7B2da3` | [View](https://testnet.snowtrace.io/address/0x64eEB71c16072A83F9260D0C5a17f3D53d7B2da3) |
| **AvadixDAO** | `0xa70770942ECba3aBCEB0096a824e94b2FB01fA27` | [View](https://testnet.snowtrace.io/address/0xa70770942ECba3aBCEB0096a824e94b2FB01fA27) |
| **AvadixDonations** | `0xC7f1D448570f052aA879326ec3BA60C20005Fcd2` | [View](https://testnet.snowtrace.io/address/0xC7f1D448570f052aA879326ec3BA60C20005Fcd2) |

> **Network:** Avalanche Fuji Testnet (Chain ID: 43113)  


---

##  What is Avadix?

Avadix is a fully decentralized prediction market and community governance platform built natively on Avalanche C-Chain. Users trade binary YES/NO outcomes on real-world events across crypto, politics, sports, and technology — powered by an AMM pricing model, on-chain DAO governance, and transparent community donations.

> *"Don't just watch the future unfold — bet on it."*

Three smart contracts handle all core platform logic without any centralized intermediary:
- **AvadixPredictionMarket** — AMM-based YES/NO trading and reward distribution
- **AvadixDAO** — On-chain governance, proposal creation and community voting
- **AvadixDonations** — AVAX fundraising campaigns with transparent on-chain tracking

---

##  Features

###  Prediction Markets
- Binary YES/NO markets with live AMM pricing
- Filter by category: **Crypto · AVAX · Politics · Sports · Tech**
- Sort by volume, trending, or recency
- Real-time price discovery via constant-product AMM (x × y = k)
- Market suggestion flow — community proposes, team publishes on-chain
- Claim rewards after market resolution

###  Portfolio Dashboard
- Track all open positions sourced from on-chain contract state
- Real-time PnL, win rate, and total trade stats
- Full trading history and activity log

###  DAO Governance
- Browse and vote on proposals from **AvadixDAO** contract
- Submit your own governance proposal on-chain
- Filter by All / Active / Passed / Rejected
- Live YES% bar with on-chain vote counts

### Community Donations
- Browse campaigns from **AvadixDonations** contract
- Donate AVAX directly on-chain (min 0.001 AVAX)
- Launch your own fundraising campaign
- Automatic goal enforcement — donations blocked when campaign is complete
- Full donation history per campaign

###  Web3 Native
- RainbowKit + WalletConnect v2 integration
- Supports **MetaMask**, **Core Wallet**, WalletConnect v2
- Avalanche Mainnet + Fuji Testnet support
- Live balance display, MAX button, transaction status feedback

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, Custom CSS Variables |
| **Web3** | Wagmi v2, Viem, RainbowKit |
| **Wallets** | MetaMask, Core Wallet, WalletConnect v2 |
| **Blockchain** | Avalanche C-Chain (Mainnet + Fuji Testnet) |
| **State** | TanStack Query |
| **Fonts** | Syne, DM Sans, JetBrains Mono |

---

## Quick Start

### Prerequisites

```
Node.js 18+
npm or yarn
MetaMask or Core Wallet browser extension
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

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

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
│   │   ├── layout.tsx              # Root layout + providers
│   │   └── page.tsx                # Main page
│   ├── components/
│   │   ├── Navbar.tsx              # Navigation + wallet connect
│   │   ├── Hero.tsx                # Landing hero + live on-chain stats
│   │   ├── MarketsSection.tsx      # Market list + suggest market
│   │   ├── MarketCard.tsx          # Individual market card + trading
│   │   ├── PortfolioSection.tsx    # Positions, activity, stats
│   │   ├── DAOSection.tsx          # Proposals + on-chain voting
│   │   ├── DonationSection.tsx     # Campaigns + donate
│   │   └── Footer.tsx
│   └── lib/
│       ├── wagmi.ts                # Wagmi + RainbowKit config
│       ├── data.ts                 # Types + helpers
│       └── contracts/
│           ├── addresses.ts        # Contract addresses (Fuji + Mainnet)
│           ├── AvadixPredictionMarket.json
│           ├── AvadixDAO.json
│           └── AvadixDonations.json
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Network Configuration

### Avalanche Fuji Testnet
```
Chain ID:   43113
RPC URL:    https://api.avax-test.network/ext/bc/C/rpc
Explorer:   https://testnet.snowtrace.io
Currency:   AVAX
```

### Avalanche Mainnet
```
Chain ID:   43114
RPC URL:    https://api.avax.network/ext/bc/C/rpc
Explorer:   https://snowtrace.io
Currency:   AVAX
```

🚰 **Get free testnet AVAX:** [faucet.avax.network](https://faucet.avax.network)

---

##  Roadmap

| Period | Milestone |
|---|---|
| **Q1-2 2026 ✅** | Deploy 3 smart contracts on Fuji Testnet, launch avadix.xyz, Build Games |
| **Q3 2026** | Security audit, Chainlink oracle integration, community beta |
| **Q4 2026** | Avalanche Mainnet deployment, AVMKT governance token launch |
| **Q1 2026** | Leaderboard, DAO treasury, liquidity mining rewards |

---

## Revenue Model

Avadix's protocol fee starts at **0%** during the launch phase to maximize early adoption. As trading volume scales, a fee will be activated through a **DAO governance vote** — keeping the economic model fully community-governed.

Target fee structure (subject to DAO approval):
- **70%** → Protocol treasury (development, audits, ecosystem)
- **30%** → Liquidity providers

Donation campaigns are permanently **fee-free**.

---

## Contributing

Contributions are welcome! We are especially looking for help with smart contract development, Chainlink oracle integration, and UI improvements.

1. Fork the project
2. Create your branch → `git checkout -b feature/your-feature`
3. Commit your changes → `git commit -m 'feat: add your feature'`
4. Push to the branch → `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

<div align="center">

**⚡ Built with ❤️ on Avalanche · Avadix Labs · 2026**

[![Avalanche](https://img.shields.io/badge/Powered_by-Avalanche-E84142?style=flat-square&logo=avalanche&logoColor=white)](https://avax.network)
[![Twitter](https://img.shields.io/badge/Twitter-x.com/AvadixLabs-1DA1F2?style=flat-square&logo=twitter&logoColor=white)](https://x.com/AvadixLabs)
[![Discord](https://img.shields.io/badge/Discord-Join_Us-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/nG9UyBFhMK)

</div>
