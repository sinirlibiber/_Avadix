import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import { FAQ } from '@/components/Hero';
import PageBackground from '@/components/PageBackground';
import Footer from '@/components/Footer';
// 1. Yeni bileşeni buraya import ediyoruz
import EarlyMintSection from '@/components/EarlyMintSection';

export default function Home() {
  return (
    <main style={{ position: 'relative' }}>
      <PageBackground opacity={0.4} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <Hero />
        
        {/* 2. NFT Mint bölümünü buraya ekledik */}
        <EarlyMintSection />
        
        <FAQ />
        <Footer />
      </div>
    </main>
  );
}
