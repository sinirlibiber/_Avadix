'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// ─── Paste your deployed contract address here after Remix deployment ──────────
const EARLY_NFT_ADDRESS = '0x02D2cC6149130656Ff27c34CB652E7e799F85732' as `0x${string}`;
// ─────────────────────────────────────────────────────────────────────────────

const AVAX_MAINNET_ID = 43114;

const EARLY_NFT_ABI = [
  { name: 'totalSupply',  type: 'function', stateMutability: 'view',       inputs: [],                          outputs: [{ type: 'uint256' }] },
  { name: 'MAX_SUPPLY',   type: 'function', stateMutability: 'view',       inputs: [],                          outputs: [{ type: 'uint256' }] },
  { name: 'mintingOpen',  type: 'function', stateMutability: 'view',       inputs: [],                          outputs: [{ type: 'bool'    }] },
  { name: 'hasMinted',    type: 'function', stateMutability: 'view',       inputs: [{ type: 'address' }],       outputs: [{ type: 'bool'    }] },
  { name: 'mint',         type: 'function', stateMutability: 'nonpayable', inputs: [],                          outputs: []                      },
] as const;

export default function EarlyMintSection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isMainnet = chainId === AVAX_MAINNET_ID;

  const { data: totalSupply } = useReadContract({
    address: EARLY_NFT_ADDRESS,
    abi: EARLY_NFT_ABI,
    functionName: 'totalSupply',
  });

  const { data: mintingOpen } = useReadContract({
    address: EARLY_NFT_ADDRESS,
    abi: EARLY_NFT_ABI,
    functionName: 'mintingOpen',
  });

  const { data: userHasMinted } = useReadContract({
    address: EARLY_NFT_ADDRESS,
    abi: EARLY_NFT_ABI,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();

  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const minted = Number(totalSupply ?? 0);
  const remaining = 1000 - minted;
  const progress = (minted / 1000) * 100;

  const handleMint = () => {
    writeContract({
      address: EARLY_NFT_ADDRESS,
      abi: EARLY_NFT_ABI,
      functionName: 'mint',
    });
  };

  const getMintButtonText = () => {
    if (!isConnected)       return 'Connect Wallet';
    if (!isMainnet)         return 'Switch to Avalanche Mainnet';
    if (userHasMinted)      return '✓ Already Minted';
    if (!mintingOpen)       return 'Minting Paused';
    if (remaining === 0)    return 'Sold Out';
    if (isPending)          return 'Confirm in Wallet…';
    if (isTxLoading)        return 'Minting…';
    if (isTxSuccess)        return '✓ Minted!';
    return 'Claim Free NFT';
  };

  const canMint =
    isConnected &&
    isMainnet &&
    !userHasMinted &&
    mintingOpen &&
    remaining > 0 &&
    !isPending &&
    !isTxLoading &&
    !isTxSuccess;

  return (
    <section className="relative py-20 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-900/10 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 rounded-full border border-blue-500/40 text-blue-400 text-xs font-mono tracking-widest mb-4">
            ✦ EARLY SUPPORTERS ✦
          </span>
          <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Claim Your Early User NFT
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            The first <span className="text-blue-400 font-semibold">1,000 supporters</span> of Avadix
            receive a permanent on-chain badge. Completely free — you only pay gas.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* NFT Preview Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="relative bg-[#070d2a] border border-blue-900/60 rounded-2xl overflow-hidden">
              {/* SVG Preview (mirrored from on-chain) */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="w-full">
                <defs>
                  <radialGradient id="bg2" cx="50%" cy="50%" r="70%">
                    <stop offset="0%" stopColor="#0a1040"/>
                    <stop offset="100%" stopColor="#050514"/>
                  </radialGradient>
                  <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1e90ff" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#1e90ff" stopOpacity="0"/>
                  </radialGradient>
                </defs>
                <rect width="500" height="500" fill="url(#bg2)"/>
                <rect width="500" height="500" fill="url(#glow2)"/>
                <g stroke="#1a3280" strokeWidth="0.5" opacity="0.4">
                  <line x1="0" y1="100" x2="500" y2="100"/>
                  <line x1="0" y1="200" x2="500" y2="200"/>
                  <line x1="0" y1="300" x2="500" y2="300"/>
                  <line x1="0" y1="400" x2="500" y2="400"/>
                  <line x1="100" y1="0" x2="100" y2="500"/>
                  <line x1="200" y1="0" x2="200" y2="500"/>
                  <line x1="300" y1="0" x2="300" y2="500"/>
                  <line x1="400" y1="0" x2="400" y2="500"/>
                </g>
                <polygon points="250,60 433,160 433,340 250,440 67,340 67,160" fill="none" stroke="#1e60e0" strokeWidth="1.5"/>
                <polygon points="250,110 385,185 385,315 250,390 115,315 115,185" fill="none" stroke="#2878ff" strokeWidth="1.5"/>
                <polygon points="250,165 340,215 340,285 250,335 160,285 160,215" fill="#0a1d60" stroke="#3da0ff" strokeWidth="2"/>
                <polygon points="250,195 290,250 250,305 210,250" fill="#e62828" stroke="#ff7070" strokeWidth="1.5"/>
                <polygon points="250,210 270,280 230,280" fill="none" stroke="white" strokeWidth="2.5"/>
                <line x1="237" y1="260" x2="263" y2="260" stroke="white" strokeWidth="2.5"/>
                <g stroke="#3da0ff" strokeWidth="2" fill="none">
                  <polyline points="20,40 20,20 40,20"/>
                  <polyline points="460,20 480,20 480,40"/>
                  <polyline points="20,460 20,480 40,480"/>
                  <polyline points="460,480 480,480 480,460"/>
                </g>
                <rect x="145" y="15" width="210" height="30" rx="4" fill="#0a1d60" stroke="#3da0ff" strokeWidth="1"/>
                <text x="250" y="35" textAnchor="middle" fill="#3dc8ff" fontFamily="monospace" fontSize="12" fontWeight="bold">✦ EARLY USER ✦</text>
                <text x="250" y="415" textAnchor="middle" fill="white" fontFamily="monospace" fontSize="22" fontWeight="bold" letterSpacing="4">AVADIX</text>
                <text x="250" y="438" textAnchor="middle" fill="#5aafff" fontFamily="monospace" fontSize="11">Early Supporter NFT</text>
                <rect x="25" y="455" width="450" height="30" rx="3" fill="#080f2e" stroke="#2050b0" strokeWidth="1"/>
                <text x="120" y="474" textAnchor="middle" fill="#5aafff" fontFamily="monospace" fontSize="10">AVAX MAINNET</text>
                <text x="250" y="474" textAnchor="middle" fill="#cccccc" fontFamily="monospace" fontSize="10">? / 1000</text>
                <text x="390" y="474" textAnchor="middle" fill="#3ddc84" fontFamily="monospace" fontSize="10">FREE MINT</text>
              </svg>
            </div>
          </div>

          {/* Mint Panel */}
          <div className="space-y-6">
            {/* Supply progress */}
            <div className="bg-[#070d2a] border border-blue-900/50 rounded-xl p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400 font-mono">Minted</span>
                <span className="text-white font-mono font-bold">
                  {minted} <span className="text-gray-500">/ 1,000</span>
                </span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-cyan-400 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2 text-gray-500 font-mono">
                <span>{remaining} remaining</span>
                <span>{progress.toFixed(1)}% claimed</span>
              </div>
            </div>

            {/* Perks */}
            <div className="bg-[#070d2a] border border-blue-900/50 rounded-xl p-5 space-y-3">
              {[
                { icon: '🆓', label: 'Completely Free',     sub: 'No AVAX cost — gas fee only' },
                { icon: '🔗', label: 'On-Chain Metadata',   sub: 'SVG fully stored on Avalanche' },
                { icon: '🏅', label: 'Permanent Badge',     sub: 'Proof of early belief in Avadix' },
                { icon: '🔒', label: '1 per Wallet',        sub: 'Fair distribution guaranteed' },
              ].map(({ icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="text-white text-sm font-semibold">{label}</p>
                    <p className="text-gray-500 text-xs">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mint button */}
            <button
              onClick={canMint ? handleMint : undefined}
              disabled={!canMint}
              className={`w-full py-4 rounded-xl font-bold text-lg font-mono tracking-wide transition-all duration-200
                ${canMint
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400 hover:shadow-lg hover:shadow-blue-500/25 cursor-pointer'
                  : isTxSuccess
                    ? 'bg-green-900/40 text-green-400 border border-green-700 cursor-default'
                    : 'bg-gray-900/60 text-gray-500 border border-gray-800 cursor-not-allowed'
                }`}
            >
              {getMintButtonText()}
            </button>

            {isTxSuccess && txHash && (
              <a
                href={`https://snowtrace.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-blue-400 hover:text-blue-300 underline font-mono"
              >
                View on Snowtrace ↗
              </a>
            )}

            {!isMainnet && isConnected && (
              <p className="text-center text-xs text-yellow-500 font-mono">
                ⚠ Please switch to Avalanche Mainnet (Chain ID: 43114)
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
