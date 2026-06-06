import React, { useEffect, useRef } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { ArrowRight, Brain, Zap, BarChart3, Target, Calendar, Sparkles, ChevronRight, Star } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import GlassCard from '../components/GlassCard';

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
  const containerRef = useRef(null);
  const spotlightRef = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroSubRef = useRef(null);
  const heroCtaRef = useRef(null);
  
  const featuresRef = useRef(null);
  const statsRef = useRef(null);
  const timelineRef = useRef(null);
  const timelineLineRef = useRef(null);
  const previewRef = useRef(null);
  const testimonialsRef = useRef(null);
  const ctaSectionRef = useRef(null);

  // Mouse move handler for general spotlight glow
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!spotlightRef.current) return;
      gsap.to(spotlightRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.6,
        ease: 'power2.out',
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 3D Card tilt mouse handlers
  const handleCardMouseMove = (e, element) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    
    // Calculate 3D rotations based on mouse cursor distance from center
    const rotateY = ((x - xc) / xc) * 12; // Max 12deg
    const rotateX = -((y - yc) / yc) * 12; // Max 12deg

    gsap.to(element, {
      rotateX: rotateX,
      rotateY: rotateY,
      scale: 1.02,
      transformPerspective: 800,
      ease: 'power1.out',
      duration: 0.3
    });
  };

  const handleCardMouseLeave = (element) => {
    if (!element) return;
    gsap.to(element, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      ease: 'power3.out',
      duration: 0.5
    });
  };

  useGSAP(() => {
    // 1. Scroll Progress Bar Indicator
    gsap.fromTo(scrollIndicatorRef.current,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: 'body',
          start: 'top top',
          end: 'bottom bottom',
          scrub: true
        }
      }
    );

    // 2. Cinematic Entrance Typography Reveals (reveal word by word)
    const tl = gsap.timeline();
    
    tl.to('.text-reveal-item', {
      y: '0%',
      duration: 1,
      stagger: 0.08,
      ease: 'power4.out'
    });

    tl.fromTo(heroSubRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
      '-=0.6'
    );

    tl.fromTo(heroCtaRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.2)' },
      '-=0.5'
    );

    // Floating parallax effect for hero blobs
    gsap.to('.hero-floater-1', {
      y: '+=20',
      x: '+=10',
      rotation: 8,
      duration: 5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
    gsap.to('.hero-floater-2', {
      y: '-=25',
      x: '-=15',
      rotation: -10,
      duration: 6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    // 3. Features Stagger Reveal
    gsap.fromTo('.feature-card-item',
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: featuresRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );

    // 4. Scroll triggered count-up statistics
    const statsItems = gsap.utils.toArray('.stat-counter-value');
    statsItems.forEach((stat) => {
      const targetVal = parseInt(stat.getAttribute('data-target'), 10);
      const isPercent = stat.getAttribute('data-percent') === 'true';
      const isDecimal = stat.getAttribute('data-decimal') === 'true';

      const countObj = { value: 0 };
      gsap.to(countObj, {
        value: targetVal,
        duration: 2.5,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: statsRef.current,
          start: 'top 85%',
        },
        onUpdate: () => {
          let currentVal = countObj.value;
          if (isDecimal) {
            stat.innerText = (currentVal / 10).toFixed(1) + (isPercent ? '%' : '');
          } else {
            stat.innerText = Math.floor(currentVal).toLocaleString() + (isPercent ? '%' : '');
          }
        }
      });
    });

    // 5. Growing Scroll Timeline Line
    gsap.fromTo(timelineLineRef.current,
      { height: '0%' },
      {
        height: '100%',
        ease: 'none',
        scrollTrigger: {
          trigger: timelineRef.current,
          start: 'top 60%',
          end: 'bottom 70%',
          scrub: true
        }
      }
    );

    // Timeline item reveals on scroll
    gsap.utils.toArray('.timeline-item-card').forEach((card, idx) => {
      const isLeft = idx % 2 === 0;
      gsap.fromTo(card,
        { x: isLeft ? -80 : 80, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        }
      );
    });

    // 6. Dashboard Preview 3D Perspective Reveal
    gsap.fromTo('.dashboard-mockup-wrap',
      { rotationX: 18, y: 100, opacity: 0, scale: 0.9 },
      {
        rotationX: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: previewRef.current,
          start: 'top 80%',
          end: 'bottom 100%',
          scrub: 1
        }
      }
    );

  }, { scope: containerRef });

  // Text Split helper to render masks
  const renderRevealWords = (text) => {
    return text.split(' ').map((word, idx) => (
      <span key={idx} className="char-mask mr-3 md:mr-4 last:mr-0">
        <span className="inline-block translate-y-[110%] text-reveal-item">{word}</span>
      </span>
    ));
  };

  return (
    <div ref={containerRef} className="w-full relative min-h-screen">
      
      {/* Scroll Progress Bar */}
      <div 
        ref={scrollIndicatorRef}
        className="fixed top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-[#6C63FF] via-[#00E5FF] to-[#6C63FF] origin-left z-50 shadow-[0_0_10px_#00E5FF]" 
      />

      {/* Mouse Following Glow Overlay (spotlight effect) */}
      <div 
        ref={spotlightRef}
        className="spotlight-glow fixed w-[800px] h-[800px] pointer-events-none z-[-10] rounded-full -translate-x-1/2 -translate-y-1/2 left-0 top-0 opacity-0 lg:opacity-100 mix-blend-screen"
      />

      {/* 1. Hero Section */}
      <section 
        id="hero"
        className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden"
      >
        {/* Parallax elements */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute top-[25%] left-[8%] w-[150px] h-[150px] rounded-3xl bg-gradient-to-br from-[#6C63FF]/20 to-[#00E5FF]/10 blur-xl hero-floater-1" />
          <div className="absolute bottom-[20%] right-[8%] w-[180px] h-[180px] rounded-full bg-gradient-to-tr from-[#00E5FF]/15 to-[#6C63FF]/20 blur-2xl hero-floater-2" />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Tagline Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-full bg-white/5 border border-white/10 mb-8 hover:border-[#00E5FF]/40 transition-colors duration-300">
            <span className="flex h-2 w-2 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
            <span className="text-[10px] md:text-xs font-bold text-gray-300 tracking-wider uppercase">Introducing StudyAI 2.0</span>
          </div>

          {/* Heading with split mask reveals */}
          <h1 
            ref={heroTitleRef}
            className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[1.1] sm:leading-[1.05]"
          >
            <span className="block text-gradient-purple-blue">
              {renderRevealWords("Track Smarter.")}
            </span>
            <span className="block text-gradient-cyan-purple">
              {renderRevealWords("Learn Faster.")}
            </span>
          </h1>

          {/* Subheading */}
          <p 
            ref={heroSubRef}
            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Elevate your academic capability. Monitor course syllabus streaks, calculate study breaks, and generate cognitive habits via an elite, Stripe-inspired workspace.
          </p>

          {/* Action CTAs */}
          <div 
            ref={heroCtaRef}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <RouterLink 
              to="/register" 
              className="w-full sm:w-auto px-8 py-4 text-sm md:text-base font-bold text-white bg-gradient-to-r from-[#6C63FF] to-[#00E5FF] rounded-2xl hover:shadow-[0_0_35px_rgba(108,99,255,0.4)] hover:scale-[1.03] transition-all duration-300 flex items-center justify-center gap-2 group cursor-pointer"
            >
              Get Started Free 
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </RouterLink>
            <button 
              onClick={() => {
                const element = document.getElementById('features');
                if (element) element.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 text-sm md:text-base font-bold text-gray-300 border border-white/10 rounded-2xl hover:bg-white/5 hover:text-white hover:border-white/20 transition-all duration-300 cursor-pointer"
            >
              Explore Features
            </button>
          </div>
        </div>

        {/* Floating Mouse Indicators */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 pointer-events-none opacity-60">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">Scroll Down</span>
          <div className="w-5 h-9 border-2 border-gray-600 rounded-full flex justify-center p-1">
            <span className="w-1 h-2 bg-[#00E5FF] rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* 2. Features Section */}
      <section 
        ref={featuresRef}
        id="features" 
        className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-6xl font-black text-white mb-4">
            Engineered for Deep Focus
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            Structured workspace modules configured to streamline study routines, build habits, and map out curriculums.
          </p>
        </div>

        {/* 3D tilt feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div 
            className="feature-card-item transform-style-3d cursor-default"
            onMouseMove={(e) => handleCardMouseMove(e, e.currentTarget)}
            onMouseLeave={(e) => handleCardMouseLeave(e, e.currentTarget)}
          >
            <GlassCard className="flex flex-col items-start text-left h-full" hoverEffect={false}>
              <div className="p-3 bg-[#6C63FF]/20 rounded-xl mb-6 text-[#6C63FF]">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Suggestions</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Calculates syllabus velocity to deliver study alarm alerts, review reminders, and optimize timing splits.
              </p>
            </GlassCard>
          </div>

          {/* Card 2 */}
          <div 
            className="feature-card-item transform-style-3d cursor-default"
            onMouseMove={(e) => handleCardMouseMove(e, e.currentTarget)}
            onMouseLeave={(e) => handleCardMouseLeave(e, e.currentTarget)}
          >
            <GlassCard className="flex flex-col items-start text-left h-full" hoverEffect={false}>
              <div className="p-3 bg-[#00E5FF]/20 rounded-xl mb-6 text-[#00E5FF]">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Progress Analytics</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Aggregates focus session indicators. Visualizes course breakdown metrics with custom-themed interactive charts.
              </p>
            </GlassCard>
          </div>

          {/* Card 3 */}
          <div 
            className="feature-card-item transform-style-3d cursor-default"
            onMouseMove={(e) => handleCardMouseMove(e, e.currentTarget)}
            onMouseLeave={(e) => handleCardMouseLeave(e, e.currentTarget)}
          >
            <GlassCard className="flex flex-col items-start text-left h-full" hoverEffect={false}>
              <div className="p-3 bg-[#6C63FF]/20 rounded-xl mb-6 text-[#6C63FF]">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Goal Tracking</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Set milestones, monitor weekly logs, and claim visual achievement badges to sustain learning momentum.
              </p>
            </GlassCard>
          </div>

        </div>
      </section>

      {/* 3. Statistics Counters */}
      <section 
        ref={statsRef}
        id="stats"
        className="py-24 bg-[#02040b]/40 border-y border-white/5 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            
            <div className="space-y-2">
              <p className="text-gray-500 uppercase text-xs font-bold tracking-widest">Total Study Hours</p>
              <h3 className="text-5xl md:text-7xl font-black text-[#00E5FF] font-mono">
                <span className="stat-counter-value" data-target="2480" data-percent="false">0</span>+
              </h3>
              <p className="text-sm text-gray-400">Hours recorded by deep-focus learners</p>
            </div>

            <div className="space-y-2">
              <p className="text-gray-500 uppercase text-xs font-bold tracking-widest">Subjects Studied</p>
              <h3 className="text-5xl md:text-7xl font-black text-white font-mono">
                <span className="stat-counter-value" data-target="185" data-percent="false">0</span>+
              </h3>
              <p className="text-sm text-gray-400">Academic courses & skills configured</p>
            </div>

            <div className="space-y-2">
              <p className="text-gray-500 uppercase text-xs font-bold tracking-widest">Productivity Increase</p>
              <h3 className="text-5xl md:text-7xl font-black text-[#6C63FF] font-mono">
                <span className="stat-counter-value" data-target="942" data-percent="true" data-decimal="true">0.0</span>
              </h3>
              <p className="text-sm text-gray-400">Average habit consistency acceleration</p>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Dashboard Mockup Preview */}
      <section 
        ref={previewRef}
        className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-6xl font-black text-white mb-4">
            Stripe-inspired Workspace
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            An ultra-premium, interactive dashboard layout constructed to optimize cognitive schedules and study calendars.
          </p>
        </div>

        {/* 3D mockup element with rotation effect */}
        <div className="w-full flex justify-center [perspective:1500px]">
          <div className="dashboard-mockup-wrap transform-style-3d w-full max-w-4xl">
            
            {/* Interactive Mock Dashboard */}
            <div className="rounded-2xl bg-[#060814]/80 border border-white/10 p-6 md:p-8 shadow-[0_40px_100px_rgba(0,0,0,0.8)] backdrop-blur-xl relative">
              {/* Window dot controls */}
              <div className="flex items-center space-x-2 mb-6">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="text-[10px] text-gray-500 ml-4 font-mono">https://app.study.ai/dashboard</span>
              </div>

              {/* Grid content mock */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  {/* Focus session card */}
                  <div className="h-40 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#6C63FF]/5 blur-xl rounded-full" />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Active block</p>
                        <h4 className="text-lg font-bold text-white mt-1">Deep Work: Quantum Physics</h4>
                      </div>
                      <span className="px-2.5 py-1 bg-[#00E5FF]/20 text-[#00E5FF] text-[10px] rounded-full font-bold shadow-md">25:00 LEFT</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-4">
                      <div className="bg-[#6C63FF] h-full w-[45%] shadow-[0_0_10px_#6C63FF]" />
                    </div>
                  </div>

                  {/* Focus hours card */}
                  <div className="h-48 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-300">Weekly Study Volume</span>
                      <span className="text-[10px] text-gray-500 font-mono">JUNE 2026</span>
                    </div>
                    {/* Mock chart columns */}
                    <div className="flex items-end space-x-3 h-28 pt-4">
                      <div className="flex-1 bg-gradient-to-t from-[#6C63FF]/10 to-[#6C63FF]/40 h-[30%] rounded-t-md" />
                      <div className="flex-1 bg-gradient-to-t from-[#6C63FF]/10 to-[#6C63FF]/40 h-[55%] rounded-t-md" />
                      <div className="flex-1 bg-gradient-to-t from-[#6C63FF]/10 to-[#6C63FF]/40 h-[45%] rounded-t-md" />
                      <div className="flex-1 bg-gradient-to-t from-[#6C63FF]/10 to-[#6C63FF]/40 h-[85%] rounded-t-md" />
                      <div className="flex-1 bg-gradient-to-t from-[#00E5FF]/30 to-[#00E5FF] h-[95%] rounded-t-md shadow-[0_0_15px_#00E5FF]" />
                      <div className="flex-1 bg-gradient-to-t from-[#6C63FF]/10 to-[#6C63FF]/40 h-[40%] rounded-t-md" />
                      <div className="flex-1 bg-gradient-to-t from-[#6C63FF]/10 to-[#6C63FF]/40 h-[60%] rounded-t-md" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* recommendation widget */}
                  <div className="rounded-xl bg-white/5 border border-white/5 p-4 space-y-4 relative">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#00E5FF]/5 blur-xl rounded-full" />
                    <span className="text-xs font-bold text-gray-300 block">AI Suggestions</span>
                    <p className="text-xs text-gray-400 leading-relaxed italic">
                      "Cognitive peak identified. Shifting Calculus blocks to mornings could accelerate retention by 22%."
                    </p>
                    <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-[10px] text-[#00E5FF] font-bold rounded-lg border border-white/5 transition-colors">
                      Accept Calibration
                    </button>
                  </div>

                  {/* streak widget */}
                  <div className="rounded-xl bg-white/5 border border-white/5 p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[#00E5FF]/20 text-[#00E5FF] rounded-lg">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Study Streak</span>
                        <span className="text-[9px] text-gray-400">Consistency locked</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-white font-mono">14 Days</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 5. Learning Journey Timeline */}
      <section 
        ref={timelineRef}
        id="timeline"
        className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="text-center mb-24">
          <h2 className="text-3xl md:text-6xl font-black text-white mb-4">
            How it Works
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            Transition seamlessly from chaotic study sessions to structured learning.
          </p>
        </div>

        {/* Timeline body container */}
        <div className="relative">
          {/* Scroll triggered timeline grow line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] h-full bg-white/10 pointer-events-none">
            <div 
              ref={timelineLineRef}
              className="w-full bg-gradient-to-b from-[#6C63FF] via-[#00E5FF] to-[#6C63FF] shadow-[0_0_10px_#00E5FF]"
              style={{ height: '0%' }}
            />
          </div>

          {/* Node 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 relative">
            <div className="md:text-right flex flex-col md:items-end justify-center">
              <div className="timeline-item-card max-w-md">
                <GlassCard className="text-left" hoverEffect={false}>
                  <span className="text-[#6C63FF] text-xs font-bold uppercase tracking-wider block mb-2">01 / Profile setup</span>
                  <h3 className="text-lg font-bold text-white mb-2">Configure Your Syllabus</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Set up your subjects, curriculum goals, and learning outcomes. StudyAI prepares custom targets matching your dates.
                  </p>
                </GlassCard>
              </div>
            </div>
            {/* node center circle */}
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden md:block z-20">
              <div className="w-4 h-4 rounded-full bg-[#02040b] border-2 border-[#6C63FF] shadow-[0_0_8px_#6C63FF]" />
            </div>
            <div className="hidden md:block" />
          </div>

          {/* Node 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 relative">
            <div className="hidden md:block" />
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden md:block z-20">
              <div className="w-4 h-4 rounded-full bg-[#02040b] border-2 border-[#00E5FF] shadow-[0_0_8px_#00E5FF]" />
            </div>
            <div className="flex flex-col items-start justify-center">
              <div className="timeline-item-card max-w-md">
                <GlassCard className="text-left" hoverEffect={false}>
                  <span className="text-[#00E5FF] text-xs font-bold uppercase tracking-wider block mb-2">02 / Study blocks</span>
                  <h3 className="text-lg font-bold text-white mb-2">Record Focus Hours</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Utilize our glassmorphic countdown Pomodoro widget to maintain flow. Log active focus limits with confidence ratings.
                  </p>
                </GlassCard>
              </div>
            </div>
          </div>

          {/* Node 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            <div className="md:text-right flex flex-col md:items-end justify-center">
              <div className="timeline-item-card max-w-md">
                <GlassCard className="text-left" hoverEffect={false}>
                  <span className="text-[#6C63FF] text-xs font-bold uppercase tracking-wider block mb-2">03 / Analytics calibration</span>
                  <h3 className="text-lg font-bold text-white mb-2">Review AI Insights</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Check stats, courses ratios, and streaks. Optimize breaks, review blocks, and schedule habits.
                  </p>
                </GlassCard>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 hidden md:block z-20">
              <div className="w-4 h-4 rounded-full bg-[#02040b] border-2 border-[#6C63FF] shadow-[0_0_8px_#6C63FF]" />
            </div>
            <div className="hidden md:block" />
          </div>

        </div>
      </section>

      {/* 6. Testimonials (Infinite Marquee) */}
      <section 
        ref={testimonialsRef}
        id="testimonials"
        className="py-24 bg-[#02040b]/30 border-y border-white/5 overflow-hidden relative z-10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
          <h2 className="text-3xl md:text-6xl font-black text-white mb-4">
            Endorsed by Top Scholars
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">
            See how students from leading universities are tracking focus scores.
          </p>
        </div>

        {/* Marquee slider */}
        <div className="relative w-full flex overflow-x-hidden">
          <div className="flex space-x-6 animate-marquee hover:[animation-play-state:paused] py-4 pr-6 shrink-0 w-max">
            
            {/* Card 1 */}
            <GlassCard className="w-[300px] md:w-[350px] shrink-0 !p-6 flex flex-col justify-between" hoverEffect={false}>
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "StudyAI changed how I prepare for med school. The analytics highlighted focus valleys, and my consistency rose instantly."
              </p>
              <div className="flex items-center space-x-3 mt-6">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] p-0.5 shadow-md flex items-center justify-center font-bold text-white text-xs">SA</div>
                <div>
                  <h4 className="text-sm font-bold text-white">Sarah Alami</h4>
                  <p className="text-xs text-gray-500 font-mono">YALE UNIVERSITY</p>
                </div>
              </div>
            </GlassCard>

            {/* Card 2 */}
            <GlassCard className="w-[300px] md:w-[350px] shrink-0 !p-6 flex flex-col justify-between" hoverEffect={false}>
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "The weekly Recharts layouts are exceptional. Visualizing my streak makes me want to maintain it. Highly recommended!"
              </p>
              <div className="flex items-center space-x-3 mt-6">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#00E5FF] to-[#6C63FF] p-0.5 shadow-md flex items-center justify-center font-bold text-white text-xs">DK</div>
                <div>
                  <h4 className="text-sm font-bold text-white">David Kim</h4>
                  <p className="text-xs text-gray-500 font-mono">UC BERKELEY</p>
                </div>
              </div>
            </GlassCard>

            {/* Card 3 */}
            <GlassCard className="w-[300px] md:w-[350px] shrink-0 !p-6 flex flex-col justify-between" hoverEffect={false}>
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "The AI breaks suggestions are incredibly precise. Shifting my focus blocks decreased mental exhaustion dramatically."
              </p>
              <div className="flex items-center space-x-3 mt-6">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-xs">EC</div>
                <div>
                  <h4 className="text-sm font-bold text-white">Emily Chen</h4>
                  <p className="text-xs text-gray-500 font-mono">MIT</p>
                </div>
              </div>
            </GlassCard>

            {/* Repeat cards for seamless transition */}
            <GlassCard className="w-[300px] md:w-[350px] shrink-0 !p-6 flex flex-col justify-between" hoverEffect={false}>
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "StudyAI changed how I prepare for med school. The analytics highlighted focus valleys, and my consistency rose instantly."
              </p>
              <div className="flex items-center space-x-3 mt-6">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#6C63FF] to-[#00E5FF] p-0.5 shadow-md flex items-center justify-center font-bold text-white text-xs">SA</div>
                <div>
                  <h4 className="text-sm font-bold text-white">Sarah Alami</h4>
                  <p className="text-xs text-gray-500 font-mono">YALE UNIVERSITY</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="w-[300px] md:w-[350px] shrink-0 !p-6 flex flex-col justify-between" hoverEffect={false}>
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "The weekly Recharts layouts are exceptional. Visualizing my streak makes me want to maintain it. Highly recommended!"
              </p>
              <div className="flex items-center space-x-3 mt-6">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#00E5FF] to-[#6C63FF] p-0.5 shadow-md flex items-center justify-center font-bold text-white text-xs">DK</div>
                <div>
                  <h4 className="text-sm font-bold text-white">David Kim</h4>
                  <p className="text-xs text-gray-500 font-mono">UC BERKELEY</p>
                </div>
              </div>
            </GlassCard>

          </div>
        </div>
      </section>

      {/* 7. CTA Section */}
      <section 
        ref={ctaSectionRef}
        className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="relative rounded-3xl overflow-hidden p-8 md:p-16 border border-[#6C63FF]/30 bg-[#060814]/65 backdrop-blur-2xl text-center shadow-[0_0_60px_rgba(108,99,255,0.2)] flex flex-col items-center justify-center">
          
          <div className="absolute inset-0 -z-10 bg-grid-pattern opacity-10 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#6C63FF]/15 blur-[100px] rounded-full pointer-events-none" />
          
          <h2 className="text-3xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
            Ready to optimize your study velocity?
          </h2>
          <p className="text-gray-300 max-w-lg mb-10 text-sm md:text-base leading-relaxed">
            Record study hours, build streaks, calibrate schedules, and let AI streamline your focus today.
          </p>

          <RouterLink 
            to="/register" 
            className="px-8 py-4 bg-white hover:bg-gray-100 text-[#02040b] font-bold text-sm md:text-base rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.25)] hover:scale-[1.03] transition-all duration-300 flex items-center gap-2 group cursor-pointer"
          >
            Get Started For Free
            <ArrowRight className="w-5 h-5 text-[#02040b] group-hover:translate-x-1 transition-transform duration-200" />
          </RouterLink>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
