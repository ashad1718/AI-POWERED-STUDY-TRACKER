import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const BlobBackground = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const xPercent = (clientX / window.innerWidth - 0.5) * 45; 
      const yPercent = (clientY / window.innerHeight - 0.5) * 45; 

      gsap.to('.parallax-blob-1', {
        x: xPercent * 0.9,
        y: yPercent * 0.9,
        duration: 2.5,
        ease: 'power2.out',
        overwrite: 'auto'
      });

      gsap.to('.parallax-blob-2', {
        x: -xPercent * 0.7,
        y: -yPercent * 0.7,
        duration: 2.8,
        ease: 'power2.out',
        overwrite: 'auto'
      });

      gsap.to('.parallax-blob-3', {
        x: xPercent * 0.6,
        y: -yPercent * 0.6,
        duration: 3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 -z-50 overflow-hidden bg-[#11072F] w-full h-full">
      {/* Background grid pattern overlay with subtle opacity */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Premium organic fluid gradient mesh circles */}
      <div className="absolute inset-0 opacity-20 mix-blend-screen pointer-events-none filter blur-[120px] md:blur-[180px]">
        {/* Blob 1: Moving Purple Mesh */}
        <div 
          className="parallax-blob-1 absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-[#5B2EFF] to-[#11072F] opacity-40"
          style={{ animation: 'floatSlow 20s infinite ease-in-out' }}
        />

        {/* Blob 2: Moving Accent Teal Mesh */}
        <div 
          className="parallax-blob-2 absolute bottom-[-10%] right-[-10%] w-[48vw] h-[48vw] rounded-full bg-gradient-to-bl from-[#00D4C7] to-[#11072F] opacity-30"
          style={{ animation: 'floatSlow 26s infinite ease-in-out' }}
        />

        {/* Blob 3: Shifting Purple Highlight */}
        <div 
          className="parallax-blob-3 absolute top-[25%] right-[15%] w-[38vw] h-[38vw] rounded-full bg-gradient-to-br from-[#7B4DFF] to-[#11072F] opacity-25"
          style={{ animation: 'floatSlow 32s infinite ease-in-out' }}
        />

        {/* Blob 4: Soft Indigo Base */}
        <div 
          className="absolute bottom-[20%] left-[10%] w-[42vw] h-[42vw] rounded-full bg-gradient-to-r from-[#11072F] to-[#8D61FF] opacity-20"
          style={{ animation: 'floatSlow 38s infinite ease-in-out' }}
        />
      </div>

      {/* Organic noise overlay for high-end digital texture */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Ambient Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#11072F] via-transparent to-[#11072F] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#11072F]/60 via-transparent to-[#11072F]/60 pointer-events-none" />
    </div>
  );
};

export default BlobBackground;
