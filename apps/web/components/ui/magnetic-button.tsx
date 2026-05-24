'use client';

import { useRef, useState, MouseEvent } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MagneticButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  magneticStrength?: number;
  glowColor?: string;
}

export const MagneticButton = ({
  children,
  className,
  magneticStrength = 0.2,
  glowColor = 'rgba(6, 182, 212, 0.5)',
  ...props
}: MagneticButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const { clientX, clientY } = e;
    const { width, height, left, top } = buttonRef.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * magneticStrength;
    const y = (clientY - (top + height / 2)) * magneticStrength;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium transition-all',
        className
      )}
      {...props}
    >
      <motion.div
        className="absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
          opacity: isHovered ? 0.8 : 0,
          transform: `translate(${position.x * 2}px, ${position.y * 2}px)`,
        }}
      />
      <div className="relative z-10 flex items-center gap-2">{children}</div>
    </motion.button>
  );
};
