import Navbar from '@/components/Navbar';
import PageBackground from '@/components/PageBackground';
import Footer from '@/components/Footer';
import EarlyMintSection from '@/components/EarlyMintSection';

export default function EarlyPage() {
  return (
    <main style={{ position: 'relative' }}>
      <PageBackground opacity={0.4} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <div style={{ paddingTop: 64 }}>
          <EarlyMintSection />
        </div>
        <Footer />
      </div>
    </main>
  );
}
