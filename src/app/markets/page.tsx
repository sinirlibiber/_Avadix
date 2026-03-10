import Navbar from '@/components/Navbar';
import MarketsSection from '@/components/MarketsSection';
import Footer from '@/components/Footer';

export const metadata = { title: 'Markets — Avadix' };

export default function MarketsPage() {
  return (
    <main style={{ paddingTop: 64 }}>
      <Navbar />
      <MarketsSection />
      <Footer />
    </main>
  );
}
