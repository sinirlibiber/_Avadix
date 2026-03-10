// ─── Contract Addresses ──────────────────────────────────────────────────────
// Fuji Testnet (43113)
export const FUJI_ADDRESSES = {
  PredictionMarket: '0x64eEB71c16072A83F9260D0C5a17f3D53d7B2da3' as `0x${string}`,
  AvadixDAO:        '0xa70770942ECba3aBCEB0096a824e94b2FB01fA27' as `0x${string}`,
  AvadixDonations:  '0xC7f1D448570f052aA879326ec3BA60C20005Fcd2' as `0x${string}`,
};

// Mainnet (43114)
export const MAINNET_ADDRESSES = {
  PredictionMarket: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  AvadixDAO:        '0x0000000000000000000000000000000000000000' as `0x${string}`,
  AvadixDonations:  '0x0000000000000000000000000000000000000000' as `0x${string}`,
};

export function getAddresses(chainId: number) {
  if (chainId === 43113) return FUJI_ADDRESSES;
  if (chainId === 43114) return MAINNET_ADDRESSES;
  return FUJI_ADDRESSES; // default to fuji
}
