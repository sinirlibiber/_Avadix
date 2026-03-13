// src/lib/contracts/addresses.ts
// Contract addresses — Fuji Testnet (43113) only

import PredictionMarketABI from './AvadixPredictionMarket.json'
import DAOABI from './AvadixDAO.json'
import DonationsABI from './AvadixDonations.json'

export const FUJI_ADDRESSES = {
  PredictionMarket: '0xc6dcF18054b8cAC46F242e87b0758325DCC8B853' as `0x${string}`,
  AvadixDAO:        '0xa70770942ECba3aBCEB0096a824e94b2FB01fA27' as `0x${string}`,
  AvadixDonations:  '0xC7f1D448570f052aA879326ec3BA60C20005Fcd2' as `0x${string}`,
}

export function getAddresses(_chainId?: number) {
  return FUJI_ADDRESSES
}

export const ABIS = {
  PredictionMarket: PredictionMarketABI,
  AvadixDAO:        DAOABI,
  AvadixDonations:  DonationsABI,
} as const
