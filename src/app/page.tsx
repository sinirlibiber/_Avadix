import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import MarketsSection from '@/components/MarketsSection';
import PortfolioSection from '@/components/PortfolioSection';
import DAOSection from '@/components/DAOSection';
import DonationSection from '@/components/DonationSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <MarketsSection />
      <PortfolioSection />
      <DAOSection />
      <DonationSection />
      <Footer />
    </main>
  );
}
