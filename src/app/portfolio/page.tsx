import Navbar from '@/components/Navbar';
import PortfolioSection from '@/components/PortfolioSection';
import Footer from '@/components/Footer';

export const metadata = { title: 'Portfolio — Avadix' };

export default function PortfolioPage() {
  return (
    <main style={{ paddingTop: 64 }}>
      <Navbar />
      <PortfolioSection />
      <Footer />
    </main>
  );
}
