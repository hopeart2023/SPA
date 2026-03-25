import React from 'react';
import { motion } from 'framer-motion';

export const GlassEffect: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`backdrop-blur-md bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-black/20 rounded-3xl ${className}`}>
    {children}
  </div>
);

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <motion.div 
    whileHover={{ scale: 1.02, opacity: 0.95 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={`backdrop-blur-lg bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-slate-700/60 shadow-xl dark:shadow-black/30 rounded-3xl overflow-hidden ${className} ${onClick ? 'cursor-pointer' : ''}`}
  >
    {children}
  </motion.div>
);

export const GlassButton: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean }> = ({ children, onClick, className = '', disabled }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.02, opacity: 0.95 } : {}}
    whileTap={!disabled ? { scale: 0.97 } : {}}
    onClick={onClick}
    disabled={disabled}
    className={`backdrop-blur-md bg-white/70 dark:bg-slate-700/70 border border-white/80 dark:border-slate-600/80 shadow-md dark:shadow-black/20 rounded-full font-bold transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
  >
    {children}
  </motion.button>
);
