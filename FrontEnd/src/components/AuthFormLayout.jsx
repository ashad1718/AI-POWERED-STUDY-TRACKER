import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ArrowLeft } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import GlassCard from './GlassCard';

const AuthFormLayout = ({ title, subtitle, backTo = '/', backLabel = 'Back', children }) => {
  const containerRef = useRef(null);
  const cardRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo(
      containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.6, ease: 'power2.out' }
    );
    tl.fromTo(
      cardRef.current,
      { y: 30, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power4.out' },
      '-=0.4'
    );
    tl.fromTo(
      '.anim-item',
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' },
      '-=0.5'
    );
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="w-full px-4 pt-28 md:pt-32 pb-16 flex justify-center relative"
    >
      <div className="absolute top-[10%] left-[8%] w-72 h-72 rounded-full bg-[#6EA8FE]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] right-[8%] w-80 h-80 rounded-full bg-[#5EEAD4]/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10" ref={cardRef}>
        <Link
          to={backTo}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors group mb-6 anim-item"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>{backLabel}</span>
        </Link>

        <div className="flex flex-col items-center mb-8 anim-item">
          <div className="p-3 bg-gradient-to-tr from-[#6EA8FE] to-[#5EEAD4] rounded-xl shadow-sm mb-4">
            <Brain className="w-8 h-8 text-[#070B14]" />
          </div>
          <h2 className="text-3xl font-extrabold text-[#F8FAFC] text-center tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm text-[#94A3B8] mt-2 text-center max-w-sm">{subtitle}</p>
          )}
        </div>

        <GlassCard className="!p-8 shadow-2xl relative border-white/5 bg-[#162033]/40" hoverEffect={false}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#5EEAD4]/5 blur-3xl pointer-events-none rounded-full" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#6EA8FE]/5 blur-3xl pointer-events-none rounded-full" />
          {children}
        </GlassCard>
      </div>
    </div>
  );
};

export default AuthFormLayout;
