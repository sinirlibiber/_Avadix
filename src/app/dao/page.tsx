import Navbar from '@/components/Navbar';
import DAOSection from '@/components/DAOSection';
import Footer from '@/components/Footer';

export const metadata = { title: 'DAO — Avadix' };

export default function DAOPage() {
  return (
    <main style={{ paddingTop: 64 }}>
      <Navbar />
      <DAOSection />
      <Footer />
    </main>
  );
}
