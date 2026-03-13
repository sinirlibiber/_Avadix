import Navbar from '@/components/Navbar';
import PageBackground from '@/components/PageBackground';
import DonationSection from '@/components/DonationSection';
import Footer from '@/components/Footer';

export const metadata = { title: 'Donate — Avadix' };

export default function DonatePage() {
  return (
    <main style={{ paddingTop: 64, position: 'relative', minHeight: '100vh' }}>
      <PageBackground opacity={0.4} />
      <Navbar />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <DonationSection />
      </div>
      <Footer />
    </main>
  );
}
