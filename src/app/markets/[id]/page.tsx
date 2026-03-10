import Navbar from '@/components/Navbar';
import MarketDetail from '@/components/MarketDetail';
import Footer from '@/components/Footer';

export default function MarketDetailPage({ params }: { params: { id: string } }) {
  return (
    <main style={{ paddingTop: 64 }}>
      <Navbar />
      <MarketDetail marketId={Number(params.id)} />
      <Footer />
    </main>
  );
}
