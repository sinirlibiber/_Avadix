import Navbar from '@/components/Navbar';
import PageBackground from '@/components/PageBackground';
import PortfolioSection from '@/components/PortfolioSection';
import Footer from '@/components/Footer';

export const metadata = { title: 'Portfolio — Avadix' };

export default function PortfolioPage() {
  return (
    <main style={{ paddingTop: 64, position: 'relative', minHeight: '100vh' }}>
      <PageBackground opacity={0.4} />
      <Navbar />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <PortfolioSection />
      </div>
      <Footer />
    </main>
  );
}
