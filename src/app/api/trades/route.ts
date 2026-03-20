import { NextRequest, NextResponse } from 'next/server';

const CONTRACT = '0x8c2436412BF7f42b1AbC906e0b5F880773B9C69F';
const TOPIC0   = '0x4c767d565621c8286048e7a308a6f13ff38ac2cf7908e2d5035b353a60789cc3';

export async function GET(req: NextRequest) {
  const marketId = req.nextUrl.searchParams.get('marketId');
  if (!marketId) return NextResponse.json({ error: 'missing marketId' }, { status: 400 });

  const topic1 = '0x' + parseInt(marketId).toString(16).padStart(64, '0');

  try {
    const url = `https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api` +
      `?module=logs&action=getLogs` +
      `&address=${CONTRACT}` +
      `&topic0=${TOPIC0}` +
      `&topic0_1_opr=and&topic1=${topic1}` +
      `&fromBlock=0&toBlock=99999999&apikey=free`;

    const res  = await fetch(url, { cache: 'no-store' });
    const json = await res.json();

    if (!Array.isArray(json.result)) {
      return NextResponse.json({ trades: [] });
    }

    const trades = json.result.map((log: any) => {
      try {
        const trader = '0x' + log.topics[2].slice(26);
        const data   = log.data.replace('0x', '');
        // data: isYes(bool 32b) + amount(uint256 32b) + shares(uint256 32b)
        const isYes   = data.slice(62, 64) === '01';
        const amount  = Number(BigInt('0x' + data.slice(64, 128)))  / 1e18;
        const shares  = Number(BigInt('0x' + data.slice(128, 192))) / 1e18;
        const rawProb = shares > 0
          ? Math.min(99, Math.max(1, Math.round((amount / shares) * 100)))
          : 50;
        return {
          hash:        log.transactionHash,
          trader,
          isYes,
          amount,
          shares,
          blockNumber: parseInt(log.blockNumber, 16),
          timestamp:   parseInt(log.timeStamp, 16),
          yesProb:     isYes ? rawProb : 100 - rawProb,
        };
      } catch { return null; }
    }).filter(Boolean).sort((a: any, b: any) => b.blockNumber - a.blockNumber);

    return NextResponse.json({ trades });
  } catch (e) {
    return NextResponse.json({ trades: [], error: String(e) });
  }
}
