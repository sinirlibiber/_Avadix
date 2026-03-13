'use client';
import { useEffect, useRef } from 'react';

export default function PageBackground({ opacity = 0.45 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.5 + 0.4,
        alpha: Math.random() * 0.35 + 0.05,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections first
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p = particles[i], q = particles[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <>
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', opacity, zIndex: 0,
        }}
      />
      {/* Subtle grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
      {/* Logo watermark center */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500, height: 500,
        backgroundImage: 'url(/logo-new.png)',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        opacity: 0.018,
        pointerEvents: 'none', zIndex: 0,
        filter: 'blur(1px)',
      }} />
    </>
  );
}
