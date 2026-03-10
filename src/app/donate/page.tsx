import Navbar from '@/components/Navbar';
import DonationSection from '@/components/DonationSection';
import Footer from '@/components/Footer';

export const metadata = { title: 'Donate — Avadix' };

export default function DonatePage() {
  return (
    <main style={{ paddingTop: 64 }}>
      <Navbar />
      <DonationSection />
      <Footer />
    </main>
  );
}
