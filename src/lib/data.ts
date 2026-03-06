export interface Market {
  id: string;
  title: string;
  description: string;
  category: 'crypto' | 'politics' | 'sports' | 'tech' | 'avax';
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  resolved: boolean;
  outcome?: 'yes' | 'no';
  trending?: boolean;
  creator?: string;
}

export interface Position {
  marketId: string;
  marketTitle: string;
  type: 'yes' | 'no';
  amount: number;
  price: number;
  shares: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface DonationCampaign {
  id: number;
  name: string;
  description: string;
  raised: number;
  goal: number;
  donors: number;
  emoji: string;
  creator?: string;
}

export interface DAOProposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  yesVotes: number;
  noVotes: number;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  endDate: string;
  category: string;
}

export const MARKETS: Market[] = [
  {
    id: '1',
    title: 'AVAX above $100 by end of Q2 2025?',
    description: 'Will Avalanche (AVAX) trade above $100 USD at any point before June 30, 2025?',
    category: 'crypto',
    yesPrice: 0.67,
    noPrice: 0.33,
    volume: 284500,
    liquidity: 45000,
    endDate: '2025-06-30',
    resolved: false,
    trending: true,
  },
  {
    id: '2',
    title: 'Will Avalanche9000 upgrade go live?',
    description: 'Will the Avalanche9000 upgrade be fully deployed on mainnet by mid 2025?',
    category: 'avax',
    yesPrice: 0.82,
    noPrice: 0.18,
    volume: 189200,
    liquidity: 32000,
    endDate: '2025-06-30',
    resolved: false,
    trending: true,
  },
  {
    id: '3',
    title: 'Bitcoin ETF net inflows positive in June 2025?',
    description: 'Will spot Bitcoin ETFs collectively record positive net inflows in June 2025?',
    category: 'crypto',
    yesPrice: 0.74,
    noPrice: 0.26,
    volume: 512000,
    liquidity: 88000,
    endDate: '2025-06-30',
    resolved: false,
  },
  {
    id: '4',
    title: 'Will Ethereum ETF staking be approved in 2025?',
    description: 'Will the SEC approve staking for spot Ethereum ETFs before December 31, 2025?',
    category: 'crypto',
    yesPrice: 0.58,
    noPrice: 0.42,
    volume: 341000,
    liquidity: 56000,
    endDate: '2025-12-31',
    resolved: false,
  },
  {
    id: '5',
    title: 'Will AI legislation pass in the US in 2025?',
    description: 'Will the US Congress pass any comprehensive federal AI regulation bill in 2025?',
    category: 'politics',
    yesPrice: 0.31,
    noPrice: 0.69,
    volume: 205000,
    liquidity: 38000,
    endDate: '2025-12-31',
    resolved: false,
  },
  {
    id: '6',
    title: 'Will GPT-5 be released before July 2025?',
    description: 'Will OpenAI publicly release GPT-5 to the public before July 1, 2025?',
    category: 'tech',
    yesPrice: 0.45,
    noPrice: 0.55,
    volume: 478000,
    liquidity: 72000,
    endDate: '2025-07-01',
    resolved: false,
    trending: true,
  },
  {
    id: '7',
    title: 'Champions League winner from Premier League?',
    description: 'Will a Premier League club win the UEFA Champions League 2024/25?',
    category: 'sports',
    yesPrice: 0.52,
    noPrice: 0.48,
    volume: 392000,
    liquidity: 61000,
    endDate: '2025-06-01',
    resolved: false,
  },
  {
    id: '8',
    title: 'Will Solana flip Ethereum by market cap in 2025?',
    description: 'Will Solana (SOL) surpass Ethereum (ETH) in total market capitalization in 2025?',
    category: 'crypto',
    yesPrice: 0.22,
    noPrice: 0.78,
    volume: 167000,
    liquidity: 28000,
    endDate: '2025-12-31',
    resolved: false,
  },
];

export const DONATION_CAMPAIGNS: DonationCampaign[] = [
  {
    id: 1,
    name: 'Avalanche Builders Fund',
    description: 'Support open-source developers building the future of Avalanche.',
    raised: 4280,
    goal: 10000,
    donors: 89,
    emoji: '🔺',
  },
  {
    id: 2,
    name: 'DeFi Education',
    description: 'Free educational resources for crypto newcomers worldwide.',
    raised: 2150,
    goal: 5000,
    donors: 134,
    emoji: '📚',
  },
  {
    id: 3,
    name: 'Protocol Grants',
    description: 'Seed funding for promising prediction market protocols.',
    raised: 7800,
    goal: 15000,
    donors: 56,
    emoji: '🌱',
  },
];

export const DAO_PROPOSALS: DAOProposal[] = [
  {
    id: 1,
    title: 'Reduce trading fees from 2% to 1.5%',
    description: 'Proposal to reduce the platform trading fee to attract more volume and compete with centralized alternatives. Revenue impact analysis shows break-even at 25% higher volume.',
    proposer: '0x1a2b...3c4d',
    yesVotes: 142500,
    noVotes: 38200,
    status: 'active',
    endDate: '2025-04-15',
    category: 'Fee Structure',
  },
  {
    id: 2,
    title: 'Add Avalanche L1 subnet markets',
    description: 'Enable prediction markets for Avalanche L1 subnet performance metrics, TVL milestones, and ecosystem growth targets.',
    proposer: '0x5e6f...7g8h',
    yesVotes: 98700,
    noVotes: 12400,
    status: 'active',
    endDate: '2025-04-20',
    category: 'New Markets',
  },
  {
    id: 3,
    title: 'Increase liquidity mining rewards by 20%',
    description: 'Boost liquidity provider incentives to deepen market liquidity, reduce slippage, and improve the trading experience for all users.',
    proposer: '0x9i0j...1k2l',
    yesVotes: 210000,
    noVotes: 45000,
    status: 'passed',
    endDate: '2025-03-10',
    category: 'Tokenomics',
  },
  {
    id: 4,
    title: 'Launch mobile app with WalletConnect',
    description: 'Fund development of a native mobile app for iOS and Android with full trading capabilities and push notifications for market events.',
    proposer: '0x3m4n...5o6p',
    yesVotes: 67000,
    noVotes: 89000,
    status: 'rejected',
    endDate: '2025-02-28',
    category: 'Product',
  },
];

export const DONATION_QUOTES = [
  { text: "The best way to find yourself is to lose yourself in the service of others.", author: "Mahatma Gandhi" },
  { text: "No one has ever become poor by giving.", author: "Anne Frank" },
  { text: "We make a living by what we get. We make a life by what we give.", author: "Winston Churchill" },
  { text: "Giving is not just about making a donation. It is about making a difference.", author: "Kathy Calvin" },
  { text: "The meaning of life is to find your gift. The purpose of life is to give it away.", author: "Pablo Picasso" },
  { text: "A kind gesture can reach a wound that only compassion can heal.", author: "Steve Maraboli" },
  { text: "We rise by lifting others.", author: "Robert Ingersoll" },
  { text: "Small acts, when multiplied by millions of people, can transform the world.", author: "Howard Zinn" },
];

export const CATEGORIES = ['all', 'crypto', 'avax', 'politics', 'sports', 'tech'] as const;
export type Category = typeof CATEGORIES[number];

export function formatVolume(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function formatPrice(p: number): string {
  return `${Math.round(p * 100)}¢`;
}

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
