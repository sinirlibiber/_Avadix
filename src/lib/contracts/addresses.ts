// src/lib/contracts/addresses.ts
// Contract addresses — Avalanche Mainnet (43114) & Fuji Testnet (43113)

import PredictionMarketABI from './AvadixPredictionMarket.json'
import DAOABI from './AvadixDAO.json'
import DonationsABI from './AvadixDonations.json'

export const MAINNET_ADDRESSES = {
  PredictionMarket: '0xB344abF2e0993B75Afb0428479ff995C6D839CDe' as `0x${string}`,
  AvadixDAO:        '0xCf603cd9873894D6c1d85CC6548F077690759a30' as `0x${string}`,
  AvadixDonations:  '0xA6619F9F9F1ca5F4D03Dd7588f07622BE3A5b340' as `0x${string}`,
}

export const FUJI_ADDRESSES = {
  PredictionMarket: '0x8c2436412BF7f42b1AbC906e0b5F880773B9C69F' as `0x${string}`,
  AvadixDAO:        '0xa70770942ECba3aBCEB0096a824e94b2FB01fA27' as `0x${string}`,
  AvadixDonations:  '0xC7f1D448570f052aA879326ec3BA60C20005Fcd2' as `0x${string}`,
}

export function getAddresses(chainId?: number) {
  // ChainId 43114 (Avalanche Mainnet) ise ana ağ adreslerini döndür
  if (chainId === 43114) {
    return MAINNET_ADDRESSES
  }
  // Varsayılan olarak veya chainId 43113 ise Fuji adreslerini döndür
  return FUJI_ADDRESSES
}

export const ABIS = {
  PredictionMarket: PredictionMarketABI,
  AvadixDAO:        DAOABI,
  AvadixDonations:  DonationsABI,
} as const
