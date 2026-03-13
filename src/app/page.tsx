import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import { FAQ } from '@/components/Hero';
import PageBackground from '@/components/PageBackground';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main style={{ position: 'relative' }}>
      <PageBackground opacity={0.4} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />
        <Hero />
        <FAQ />
        <Footer />
      </div>
    </main>
  );
}
