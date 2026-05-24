'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  className?: string;
  children: ReactNode;
  hoverEffect?: boolean;
}

export const GlassCard = ({
  className,
  children,
  hoverEffect = false,
  ...props
}: GlassCardProps) => {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -5, scale: 1.01 } : undefined}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-surface-border bg-background-card p-6 backdrop-blur-md',
        'shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]',
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-500 hover:opacity-100" />
      {children}
    </motion.div>
  );
};
