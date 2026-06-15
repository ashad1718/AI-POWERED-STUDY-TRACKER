import React, { useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { ArrowRight, Brain, Zap, BarChart3, Target, Calendar, Sparkles, Star, Award, BookOpen, Clock, Heart, Shield, CheckCircle } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import GlassCard from '../components/GlassCard';
import { useMagnetic } from '../hooks/useMagnetic';

gsap.registerPlugin(ScrollTrigger);

// ─── Floating 3D Vector Objects (Premium CSS + SVG Shading) ───────────────────

const FloatingBrain = () => (
  <div className="relative w-64 h-64 mx-auto flex items-center justify-center floating-element-1">
    {/* Ambient radial glow */}
    <div className="absolute inset-0 bg-[#00D4C7]/15 blur-3xl rounded-full scale-75" />
    <svg className="w-48 h-48 drop-shadow-[0_15px_35px_rgba(0,212,199,0.3)]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00D4C7" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#7B4DFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--color-background)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="neuralPath" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4C7" />
          <stop offset="100%" stopColor="#8D61FF" />
        </linearGradient>
      </defs>
      
      {/* Brain shadow base */}
      <circle cx="100" cy="100" r="80" fill="url(#brainGlow)" />
      
      {/* Shaded Brain Silhouette */}
      <path d="M100 40C70 40 50 60 50 90C50 110 60 120 70 130C75 135 75 145 70 150C85 160 95 155 100 150C105 155 115 160 130 150C125 145 125 135 130 130C140 120 150 110 150 90C150 60 130 40 100 40Z" fill="#7B4DFF" fillOpacity="0.15" stroke="url(#neuralPath)" strokeWidth="2" strokeLinecap="round" />
      
      {/* Internal neural connections */}
      <path d="M80 60Q90 80 70 100T110 130" stroke="#00D4C7" strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M120 60Q110 80 130 100T90 130" stroke="#8D61FF" strokeWidth="1.5" strokeDasharray="4 2" />
      
      {/* Pulsing Synapse Nodes */}
      <circle cx="80" cy="60" r="4" fill="#00D4C7" className="animate-pulse" />
      <circle cx="120" cy="60" r="5" fill="#8D61FF" />
      <circle cx="70" cy="100" r="6" fill="#00D4C7" />
      <circle cx="130" cy="100" r="4" fill="#8D61FF" />
      <circle cx="110" cy="130" r="5" fill="#00D4C7" />
      <circle cx="90" cy="130" r="4.5" fill="#8D61FF" />
    </svg>
  </div>
);

const FloatingBook = () => (
  <div className="relative w-64 h-64 mx-auto flex items-center justify-center floating-element-2 perspective-1000">
    <div className="absolute inset-0 bg-[#5B2EFF]/10 blur-3xl rounded-full scale-75" />
    <div className="w-44 h-48 transform rotate-y-30 rotate-x-12 -rotate-z-6 transform-style-3d transition-transform duration-500">
      
      {/* Book Cover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7B4DFF] to-[#5B2EFF] rounded-r-xl border border-white/10 shadow-[5px_15px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
          <Brain className="w-6 h-6 text-[#00D4C7]" />
          <div className="w-1.5 h-6 bg-white/20 rounded-full" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#00D4C7]">StudyAI Vol. 1</div>
          <div className="text-sm font-bold text-white leading-tight mt-1">Cognitive Calculus</div>
        </div>
      </div>
      
      {/* Book Pages Thickness (3D Edge) */}
      <div className="absolute top-1 bottom-1 right-[-14px] w-[15px] bg-white/90 rounded-r shadow-inner transform rotate-y-90 origin-left flex flex-col justify-around py-2">
        <div className="h-[1px] bg-black/10 w-full" />
        <div className="h-[1px] bg-black/10 w-full" />
        <div className="h-[1px] bg-black/10 w-full" />
        <div className="h-[1px] bg-black/10 w-full" />
        <div className="h-[1px] bg-black/10 w-full" />
      </div>
    </div>
  </div>
);

const FloatingChart = () => (
  <div className="relative w-64 h-64 mx-auto flex items-center justify-center floating-element-3">
    <div className="absolute inset-0 bg-[#8D61FF]/10 blur-3xl rounded-full scale-75" />
    
    {/* Glassmorphic 3D Chart Plate */}
    <div className="w-52 h-44 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex flex-col justify-between transform rotate-x-6 rotate-y-[-10deg]">
      <div className="flex justify-between items-center">
        <div className="text-xs font-semibold text-white/70">Efficiency Calibration</div>
        <div className="px-2 py-0.5 rounded bg-[#00D4C7]/20 text-[#00D4C7] text-[9px] font-bold">+28.4%</div>
      </div>
      
      {/* 3D look bar chart blocks */}
      <div className="flex items-end space-x-3.5 h-24 pt-4">
        <div className="flex-1 bg-gradient-to-t from-[#5B2EFF]/20 to-[#5B2EFF] h-[45%] rounded-t-md relative">
          <div className="absolute -top-1.5 inset-x-0 h-1.5 bg-[#8D61FF] rounded-t-full" />
        </div>
        <div className="flex-1 bg-gradient-to-t from-[#7B4DFF]/20 to-[#7B4DFF] h-[75%] rounded-t-md relative">
          <div className="absolute -top-1.5 inset-x-0 h-1.5 bg-[#8D61FF] rounded-t-full" />
        </div>
        <div className="flex-1 bg-gradient-to-t from-[#00D4C7]/30 to-[#00D4C7] h-[95%] rounded-t-md relative shadow-[0_0_15px_rgba(0,212,199,0.3)]">
          <div className="absolute -top-1.5 inset-x-0 h-1.5 bg-white rounded-t-full" />
        </div>
        <div className="flex-1 bg-gradient-to-t from-[#7B4DFF]/20 to-[#7B4DFF] h-[60%] rounded-t-md relative">
          <div className="absolute -top-1.5 inset-x-0 h-1.5 bg-[#8D61FF] rounded-t-full" />
        </div>
      </div>
    </div>
  </div>
);

const FloatingCard = () => (
  <div className="relative w-64 h-64 mx-auto flex items-center justify-center floating-element-4 perspective-1000">
    <div className="absolute inset-0 bg-[#00D4C7]/10 blur-3xl rounded-full scale-75" />
    
    <div className="w-56 h-36 rounded-2xl bg-gradient-to-br from-white/10 to-white/0 backdrop-blur-lg border border-white/15 p-5 shadow-[5px_20px_35px_rgba(0,0,0,0.4)] flex flex-col justify-between transform rotate-y-15 -rotate-x-12 rotate-z-2">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7B4DFF]/20 flex items-center justify-center border border-[#7B4DFF]/30">
            <Clock className="w-4.5 h-4.5 text-[#00D4C7]" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 uppercase tracking-widest font-mono">Current Sprint</div>
            <div className="text-xs font-bold text-white">Deep Study Block</div>
          </div>
        </div>
        <span className="w-2.5 h-2.5 rounded-full bg-[#00D4C7] animate-pulse" />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] text-white/70">
          <span>Organic Physics</span>
          <span className="font-mono">42m / 60m</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
          <div className="h-full bg-gradient-to-r from-[#7B4DFF] to-[#00D4C7] w-[70%]" />
        </div>
      </div>
    </div>
  </div>
);

const FloatingBadge = () => (
  <div className="relative w-64 h-64 mx-auto flex items-center justify-center floating-element-1">
    <div className="absolute inset-0 bg-[#7B4DFF]/15 blur-3xl rounded-full scale-75" />
    
    {/* Gold Achievement Medal */}
    <div className="relative w-40 h-40 flex items-center justify-center drop-shadow-[0_20px_30px_rgba(123,77,255,0.4)]">
      <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFE259" />
            <stop offset="50%" stopColor="#FFA751" />
            <stop offset="100%" stopColor="#FF512F" />
          </linearGradient>
          <linearGradient id="medalRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B4DFF" />
            <stop offset="100%" stopColor="#5B2EFF" />
          </linearGradient>
        </defs>
        
        {/* Ribbon */}
        <path d="M35 50L25 90L50 80L75 90L65 50" fill="url(#medalRibbon)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        
        {/* Outer Ring */}
        <circle cx="50" cy="45" r="30" fill="var(--color-background)" stroke="url(#goldGrad)" strokeWidth="4" />
        <circle cx="50" cy="45" r="26" fill="url(#goldGrad)" fillOpacity="0.1" />
        
        {/* Star Icon */}
        <path d="M50 25L54.7 34.6L65.3 36.1L57.7 43.6L59.5 54.1L50 49.2L40.5 54.1L42.3 43.6L34.7 36.1L45.3 34.6L50 25Z" fill="url(#goldGrad)" />
      </svg>
      <div className="absolute bottom-6 bg-[#00D4C7] text-background text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-md border border-white/20">
        14D STREAK
      </div>
    </div>
  </div>
);

const FloatingRecommendations = () => (
  <div className="relative w-64 h-64 mx-auto flex items-center justify-center floating-element-3">
    <div className="absolute inset-0 bg-[#00D4C7]/10 blur-3xl rounded-full scale-75" />
    
    <div className="w-56 rounded-2xl bg-white/5 border border-white/10 p-5 shadow-[0_25px_45px_rgba(0,0,0,0.45)] space-y-4 transform -rotate-z-3 rotate-y-12">
      <div className="flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-[#00D4C7] animate-pulse" />
        <span className="text-[10px] font-bold text-[#00D4C7] uppercase tracking-wider font-mono">AI Calibration</span>
      </div>
      <p className="text-[11px] text-white/80 leading-relaxed italic">
        "Your focus capacity peaks between 9:00 AM and 11:30 AM. Schedule your Quantum Mechanics block tomorrow morning for 24% faster retention."
      </p>
      <div className="h-[1px] bg-white/10" />
      <div className="flex justify-between items-center">
        <span className="text-[9px] text-white/50">Schedule Adjusted</span>
        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
          <CheckCircle className="w-2.5 h-2.5" /> Applied
        </span>
      </div>
    </div>
  </div>
);

// ─── MAIN LANDING PAGE COMPONENT ──────────────────────────────────────────────

const LandingPage = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const spotlightRef = useRef(null);
  const heroRef = useRef(null);
  
  // Dashboard mock layers refs for 3D mouse move parallax
  const dashboardRef = useRef(null);
  const layerBaseRef = useRef(null);
  const layerOverlay1Ref = useRef(null);
  const layerOverlay2Ref = useRef(null);
  const layerOverlay3Ref = useRef(null);

  const primaryCtaRef = useMagnetic();
  const secondaryCtaRef = useMagnetic();

  // Mouse Move Handler for 3D Parallax on Dashboard Preview & Spotlight Glow
  useEffect(() => {
    const handleMouseMove = (e) => {
      // 1. Spotlight glow position
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.8,
          ease: 'power2.out',
        });
      }

      // 2. 3D Dashboard Tilt Parallax
      if (dashboardRef.current) {
        const rect = dashboardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        
        // Tilt calculations
        const rotateY = ((x - xc) / xc) * 12; // Max 12 deg
        const rotateX = -((y - yc) / yc) * 10; // Max 10 deg

        gsap.to(dashboardRef.current, {
          rotateX: rotateX,
          rotateY: rotateY,
          transformPerspective: 1500,
          ease: 'power2.out',
          duration: 0.6
        });

        // Layer parallax shifts
        if (layerOverlay1Ref.current) {
          gsap.to(layerOverlay1Ref.current, {
            x: ((x - xc) / xc) * 20,
            y: ((y - yc) / yc) * 20,
            z: 35,
            duration: 0.6,
            ease: 'power2.out'
          });
        }
        if (layerOverlay2Ref.current) {
          gsap.to(layerOverlay2Ref.current, {
            x: ((x - xc) / xc) * -15,
            y: ((y - yc) / yc) * -15,
            z: 60,
            duration: 0.6,
            ease: 'power2.out'
          });
        }
        if (layerOverlay3Ref.current) {
          gsap.to(layerOverlay3Ref.current, {
            x: ((x - xc) / xc) * 10,
            y: ((y - yc) / yc) * -10,
            z: 85,
            duration: 0.6,
            ease: 'power2.out'
          });
        }
      }
    };

    const handleMouseLeave = () => {
      // Reset dashboard tilt
      if (dashboardRef.current) {
        gsap.to(dashboardRef.current, {
          rotateX: 10,
          rotateY: -8,
          transformPerspective: 1500,
          ease: 'power3.out',
          duration: 1
        });
      }
      // Reset layers
      const layers = [layerOverlay1Ref.current, layerOverlay2Ref.current, layerOverlay3Ref.current];
      layers.forEach((layer, i) => {
        if (layer) {
          gsap.to(layer, {
            x: 0,
            y: 0,
            z: i === 0 ? 30 : i === 1 ? 55 : 80,
            ease: 'power3.out',
            duration: 1
          });
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    if (heroRef.current) {
      heroRef.current.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (heroRef.current) {
        heroRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  // GSAP Cinematic Animations & ScrollTriggers
  useGSAP(() => {
    // ─── 1. Hero Animations ───────────────────────────────────────────────────
    const heroTl = gsap.timeline();
    
    // Animate word reveals
    heroTl.to('.hero-text-item', {
      y: '0%',
      duration: 1.2,
      stagger: 0.1,
      ease: 'power4.out'
    });

    heroTl.fromTo('.hero-sub',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out' },
      '-=0.8'
    );

    heroTl.fromTo('.hero-cta-wrap',
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.2)' },
      '-=0.7'
    );

    // Initial tilt animation for the 3D Dashboard Mockup
    heroTl.fromTo(dashboardRef.current,
      { opacity: 0, rotationX: 25, rotationY: -20, scale: 0.8, z: -200 },
      { opacity: 1, rotationX: 10, rotationY: -8, scale: 1, z: 0, duration: 1.6, ease: 'power4.out' },
      '-=1.2'
    );

    // ─── 2. Feature Sections Pinning & Storytelling ─────────────────────────
    const sections = gsap.utils.toArray('.story-section');
    sections.forEach((section, idx) => {
      const heading = section.querySelector('.section-heading');
      const text = section.querySelector('.section-text');
      const graphic = section.querySelector('.section-graphic');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          end: 'bottom 15%',
          toggleActions: 'play none none reverse',
        }
      });

      tl.fromTo(heading,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power4.out' }
      )
      .fromTo(text,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
        '-=0.7'
      )
      .fromTo(graphic,
        { opacity: 0, scale: 0.8, z: -100, rotateY: idx % 2 === 0 ? 15 : -15 },
        { opacity: 1, scale: 1, z: 0, rotateY: 0, duration: 1.2, ease: 'power3.out' },
        '-=0.8'
      );
    });

    // ─── 3. Scroll Indicator Timeline ────────────────────────────────────────
    gsap.fromTo('.scroll-indicator-bar',
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true
        }
      }
    );

  }, { scope: containerRef });

  // Word wrap reveal utility helper
  const splitRevealText = (text, gradientClass) => {
    return text.split(' ').map((word, idx) => (
      <span key={idx} className="char-mask mr-4 last:mr-0">
        <span className={`inline-block translate-y-[110%] hero-text-item ${gradientClass || ''}`}>
          {word}
        </span>
      </span>
    ));
  };

  return (
    <div ref={containerRef} className="w-full relative min-h-screen bg-background text-text-primary transition-colors duration-300">
      
      {/* Scroll Progress Bar */}
      <div className="scroll-indicator-bar fixed top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#5B2EFF] via-[#00D4C7] to-[#8D61FF] origin-left z-50 scale-x-0" />

      {/* Mouse Following Glow Overlay (spotlight effect) */}
      <div 
        ref={spotlightRef}
        className="spotlight-glow fixed w-[900px] h-[900px] pointer-events-none z-[1] rounded-full -translate-x-1/2 -translate-y-1/2 left-0 top-0 opacity-0 lg:opacity-100 mix-blend-screen"
      />

      {/* ─────────────────── HERO SECTION ─────────────────── */}
      <section 
        ref={heroRef}
        id="hero"
        className="relative min-h-screen flex flex-col justify-center items-center pt-32 pb-20 overflow-hidden px-4 md:px-8 z-10"
      >
        {/* Background glow effects */}
        <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-[#5B2EFF]/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] rounded-full bg-[#00D4C7]/5 blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
          {/* Release Tagline */}
          <div className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full bg-surface/10 border border-border mb-8 hover:border-[#00D4C7]/30 transition-colors duration-300">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#00D4C7] animate-pulse-subtle" />
            <span className="text-xs font-semibold text-text-secondary tracking-widest uppercase font-mono">StudyAI v2.0 Cinematic Overhaul</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tight leading-[1.05] mb-8 font-sans">
            <span className="block">{splitRevealText("Study Smarter.", "text-gradient-primary")}</span>
            <span className="block mt-2">{splitRevealText("Improve Faster.", "text-gradient-accent")}</span>
            <span className="block mt-2">{splitRevealText("Powered by AI.", "text-gradient-gold")}</span>
          </h1>

          {/* Subheading */}
          <p className="hero-sub text-lg sm:text-2xl text-text-secondary max-w-3xl mx-auto mb-10 leading-relaxed font-sans font-light">
            Track your study sessions, get AI-powered insights, and organize your syllabus in one beautiful workspace.
          </p>

          {/* CTA Buttons */}
          <div className="hero-cta-wrap flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto mb-20">
            <RouterLink 
              to="/register" 
              ref={primaryCtaRef}
              className="btn-primary w-full sm:w-auto px-10 py-5 text-base rounded-xl flex items-center justify-center gap-2 group cursor-pointer shadow-premium-glow"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </RouterLink>
            <button 
              ref={secondaryCtaRef}
              onClick={() => {
                const el = document.getElementById('story-1');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary w-full sm:w-auto px-10 py-5 text-base rounded-xl flex items-center justify-center cursor-pointer"
            >
              Explore Features
            </button>
          </div>
        </div>

        {/* 3D layered Dashboard Preview Mockup */}
        <div className="w-full flex justify-center perspective-2000 py-10 px-4">
          <div 
            ref={dashboardRef}
            className="relative transform-style-3d w-full max-w-4xl rounded-2xl border border-border bg-surface/35 shadow-[0_50px_100px_rgba(0,0,0,0.2)] dark:shadow-[0_50px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl p-6 md:p-8"
            style={{
              transform: 'rotateX(10deg) rotateY(-8deg)'
            }}
          >
            {/* Ambient inner card glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#5B2EFF]/10 to-[#00D4C7]/5 pointer-events-none" />

            {/* Simulated window control bar */}
            <div className="flex items-center space-x-2.5 mb-8 border-b border-white/5 pb-4">
              <span className="w-3.5 h-3.5 rounded-full bg-[#EF4444]/60" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#F59E0B]/60" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#10B981]/60" />
              <span className="text-xs text-white/30 font-mono ml-4 bg-black/40 px-3 py-1 rounded-md border border-white/5">
                https://app.study.ai/dashboard
              </span>
            </div>

            {/* Base Mock Layout */}
            <div ref={layerBaseRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-85">
              {/* Sidebar list mock */}
              <div className="space-y-4 hidden md:block">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 rounded-xl bg-white/5 border border-white/5 flex items-center px-3 gap-3">
                    <div className="w-4 h-4 rounded bg-white/10" />
                    <div className={`h-2.5 bg-white/15 rounded ${i === 0 ? 'w-2/3' : 'w-1/2'}`} />
                  </div>
                ))}
              </div>

              {/* Main content area mockup */}
              <div className="md:col-span-2 space-y-6">
                <div className="h-32 rounded-2xl bg-gradient-to-r from-[#5B2EFF]/10 to-[#7B4DFF]/15 border border-white/10 p-5 flex flex-col justify-between">
                  <div className="h-4 bg-white/15 rounded w-1/3" />
                  <div className="h-2 bg-white/10 rounded w-full" />
                  <div className="h-2 bg-white/10 rounded w-4/5" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 rounded-2xl bg-white/5 border border-white/5" />
                  <div className="h-24 rounded-2xl bg-white/5 border border-white/5" />
                </div>
              </div>
            </div>

            {/* Layer 1: Floating Timer Widget (Parallax Layer) */}
            <div 
              ref={layerOverlay1Ref}
              className="absolute -top-12 -left-8 md:-left-16 w-60 p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl transform-style-3d pointer-events-none"
              style={{ transform: 'translateZ(30px)' }}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#00D4C7] font-semibold">Active Session</span>
                <span className="w-2 h-2 rounded-full bg-[#00D4C7] animate-pulse" />
              </div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">24:58</div>
              <div className="text-[10px] text-white/50 mt-1.5">Focus: Quantum Electro-dynamics</div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-3 border border-white/5">
                <div className="bg-[#7B4DFF] h-full w-[65%]" />
              </div>
            </div>

            {/* Layer 2: Floating AI Suggestions Panel (Parallax Layer) */}
            <div 
              ref={layerOverlay2Ref}
              className="absolute -bottom-8 -right-4 md:-right-12 w-64 p-5 rounded-2xl bg-background/90 backdrop-blur-xl border border-[#00D4C7]/20 shadow-premium-glow transform-style-3d pointer-events-none"
              style={{ transform: 'translateZ(55px)' }}
            >
              <div className="flex items-center space-x-2.5 mb-2.5">
                <Sparkles className="w-4.5 h-4.5 text-[#00D4C7]" />
                <span className="text-[10px] font-bold text-[#00D4C7] uppercase tracking-wider font-mono">AI Coach Suggestion</span>
              </div>
              <p className="text-[11px] text-white/80 leading-relaxed">
                "Subject overlap identified. Moving Calculus blocks to mornings improves recall retention score by 18%."
              </p>
            </div>

            {/* Layer 3: Streak Badge Widget (Parallax Layer) */}
            <div 
              ref={layerOverlay3Ref}
              className="absolute top-1/3 -right-8 md:-right-20 w-44 p-4 rounded-xl bg-gradient-to-br from-[#7B4DFF]/90 to-[#5B2EFF]/90 border border-white/20 shadow-2xl transform-style-3d pointer-events-none flex items-center justify-between"
              style={{ transform: 'translateZ(80px)' }}
            >
              <div className="flex items-center space-x-2.5">
                <Award className="w-8 h-8 text-[#00D4C7]" />
                <div>
                  <div className="text-[9px] text-white/60 font-medium font-mono">STREAK STATUS</div>
                  <div className="text-xs font-black text-white">14 Days Active</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="flex flex-col items-center mt-12 space-y-2 pointer-events-none opacity-40">
          <span className="text-[10px] uppercase font-mono tracking-widest text-text-secondary">Scroll to Explore</span>
          <div className="w-6 h-10 border-2 border-border rounded-full flex justify-center p-1">
            <span className="w-1.5 h-2 bg-secondary rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ─────────────────── STORY SECTIONS ─────────────────── */}

      {/* Section 1: AI Study Coach */}
      <section 
        id="story-1"
        className="story-section min-h-[50vh] flex items-center justify-center relative overflow-hidden py-12 border-b border-border/40"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-left">
            <div className="section-heading space-y-4">
              <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
                AI Study Coach
              </h2>
            </div>
            <p className="section-text text-lg text-text-secondary leading-relaxed font-light">
              An AI helper you can chat with. It looks at how you study and creates a personalized schedule, tells you when to take breaks, and gives you tips to learn faster.
            </p>
          </div>
          <div className="section-graphic flex justify-center">
            <FloatingBrain />
          </div>
        </div>
      </section>

      {/* Section 2: Smart Analytics */}
      <section 
        id="story-2"
        className="story-section min-h-[50vh] flex items-center justify-center relative overflow-hidden py-12 border-b border-border/40"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="section-graphic flex justify-center lg:order-last">
            <FloatingChart />
          </div>
          <div className="space-y-8 text-left">
            <div className="section-heading space-y-4">
              <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
                Smart Analytics
              </h2>
            </div>
            <p className="section-text text-lg text-text-secondary leading-relaxed font-light">
              Easy-to-read charts that show your study hours, focus trends, and progress, helping you see how you are doing every day.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Performance Tracking */}
      <section 
        id="story-3"
        className="story-section min-h-[50vh] flex items-center justify-center relative overflow-hidden py-12 border-b border-border/40"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-left">
            <div className="section-heading space-y-4">
              <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
                Performance Tracking
              </h2>
            </div>
            <p className="section-text text-lg text-text-secondary leading-relaxed font-light">
              Set your daily goals, log your study time, and rate how confident you feel in each subject to avoid getting too tired.
            </p>
          </div>
          <div className="section-graphic flex justify-center">
            <FloatingCard />
          </div>
        </div>
      </section>

      {/* Section 4: Progress Timeline */}
      <section 
        id="story-4"
        className="story-section min-h-[50vh] flex items-center justify-center relative overflow-hidden py-12 border-b border-border/40"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="section-graphic flex justify-center lg:order-last">
            <FloatingBook />
          </div>
          <div className="space-y-8 text-left">
            <div className="section-heading space-y-4">
              <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
                Progress Timeline
              </h2>
            </div>
            <p className="section-text text-lg text-text-secondary leading-relaxed font-light">
              A simple timeline that shows the chapters you finished, when to review, and when your tests are coming up.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: Goal Achievement System */}
      <section 
        id="story-5"
        className="story-section min-h-[50vh] flex items-center justify-center relative overflow-hidden py-12 border-b border-border/40"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-left">
            <div className="section-heading space-y-4">
              <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
                Goal Achievement System
              </h2>
            </div>
            <p className="section-text text-lg text-text-secondary leading-relaxed font-light">
              Earn fun digital badges and level up as you complete your weekly goals and keep your daily study streak going.
            </p>
          </div>
          <div className="section-graphic flex justify-center">
            <FloatingBadge />
          </div>
        </div>
      </section>

      {/* Section 6: AI Recommendations */}
      <section 
        id="story-6"
        className="story-section min-h-[50vh] flex items-center justify-center relative overflow-hidden py-12 border-b border-border/40"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="section-graphic flex justify-center lg:order-last">
            <FloatingRecommendations />
          </div>
          <div className="space-y-8 text-left">
            <div className="section-heading space-y-4">
              <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
                AI Recommendations
              </h2>
            </div>
            <p className="section-text text-lg text-text-secondary leading-relaxed font-light">
              Smart study tips powered by Google Gemini that tell you the best times of day to study and which subjects to focus on.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────── FINAL CALL TO ACTION ─────────────────── */}
      <section 
        id="final-cta"
        className="py-32 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="relative rounded-3xl overflow-hidden p-8 md:p-20 border border-white/10 bg-white/5 backdrop-blur-2xl text-center shadow-premium-glow flex flex-col items-center justify-center">
          
          <div className="absolute inset-0 -z-10 bg-grid-pattern opacity-10 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#7B4DFF]/15 blur-[120px] rounded-full pointer-events-none" />
          
          <h2 className="text-4xl md:text-7xl font-black text-text-primary mb-6 tracking-tight leading-tight">
            Optimize Your Study Velocity Today.
          </h2>
          <p className="text-text-secondary max-w-xl mb-12 text-base md:text-lg leading-relaxed font-light">
            Join thousands of elite scholars calibrating their schedules, building habit consistency, and hitting core goals.
          </p>

          <RouterLink 
            to="/register" 
            className="btn-primary px-10 py-5 text-base rounded-xl flex items-center gap-2 group cursor-pointer shadow-premium-glow"
          >
            <span>Get Started For Free</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </RouterLink>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
