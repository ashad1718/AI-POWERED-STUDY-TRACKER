import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export const useMagnetic = (active = true) => {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !active) return;

    const handleMouseMove = (e) => {
      const bound = element.getBoundingClientRect();
      const x = e.clientX - (bound.left + bound.width / 2);
      const y = e.clientY - (bound.top + bound.height / 2);

      gsap.to(element, {
        x: x * 0.35,
        y: y * 0.35,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.3)',
        overwrite: 'auto'
      });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [active]);

  return ref;
};
