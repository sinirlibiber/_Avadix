import Navbar from '@/components/Navbar';
import MarketDetail from '@/components/MarketDetail';
import MultiMarketDetail from '@/components/MultiMarketDetail';
import Footer from '@/components/Footer';

export default function MarketDetailPage({ params }: { params: { id: string } }) {
  const isMulti = params.id.startsWith('multi-');
  const multiId  = isMulti ? Number(params.id.replace('multi-', '')) : null;
  const binaryId = isMulti ? null : Number(params.id);

  return (
    <main style={{ paddingTop: 64 }}>
      <Navbar />
      {isMulti && multiId !== null && !isNaN(multiId)
        ? <MultiMarketDetail multiId={multiId} />
        : binaryId !== null && !isNaN(binaryId)
          ? <MarketDetail marketId={binaryId} />
          : (
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
              <p style={{ color: '#888', fontFamily: 'var(--font-display)', fontSize: 18 }}>Market not found.</p>
            </div>
          )
      }
      <Footer />
    </main>
  );
}
