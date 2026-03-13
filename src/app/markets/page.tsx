import Navbar from '@/components/Navbar';
import PageBackground from '@/components/PageBackground';
import MarketsSection from '@/components/MarketsSection';
import Footer from '@/components/Footer';

export const metadata = { title: 'Markets — Avadix' };

export default function MarketsPage() {
  return (
    <main style={{ paddingTop: 64, position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageBackground opacity={0.4} />
      <Navbar />
      <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        <MarketsSection />
      </div>
      <Footer />
    </main>
  );
}
