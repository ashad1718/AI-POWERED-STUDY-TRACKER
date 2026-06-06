import React from 'react';

const BlobBackground = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-[#02040b] w-full h-full">
      {/* Background grid pattern overlay with subtle opacity */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Premium organic fluid gradient mesh circles */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none filter blur-[100px] md:blur-[150px]">
        {/* Blob 1: Moving Purple Mesh */}
        <div 
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#a78bfa] opacity-60 animate-float-blob-1"
          style={{ animationDuration: '22s' }}
        />

        {/* Blob 2: Moving Cyan Mesh */}
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-bl from-[#00E5FF] to-[#34d399] opacity-50 animate-float-blob-2"
          style={{ animationDuration: '28s' }}
        />

        {/* Blob 3: Shifting Magenta Highlight */}
        <div 
          className="absolute top-[30%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-br from-[#d946ef] to-[#6C63FF] opacity-40 animate-float-blob-3"
          style={{ animationDuration: '35s' }}
        />

        {/* Blob 4: Soft Deep Indigo Base */}
        <div 
          className="absolute bottom-[20%] left-[15%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-r from-[#1e1b4b] to-[#6C63FF] opacity-30 animate-float-blob-1"
          style={{ animationDuration: '40s' }}
        />
      </div>

      {/* Subtle organic noise overlay for that high-end print/digital texture */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Vignette / Dark Contrast Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#02040b] via-transparent to-[#02040b] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#02040b]/50 via-transparent to-[#02040b]/50 pointer-events-none" />
    </div>
  );
};

export default BlobBackground;
