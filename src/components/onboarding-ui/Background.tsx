import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  gradientPosition?: number;
}

export const Background: React.FC<Props> = ({ children, gradientPosition = 0 }) => {
  const positions = [
    ['100%_0%', '0%_100%'],
    ['100%_100%', '0%_0%'],
    ['0%_100%', '100%_0%'],
    ['50%_100%', '50%_0%'],
    ['100%_50%', '0%_50%'],
    ['0%_0%', '100%_100%']
  ];

  const currentPosition = positions[gradientPosition % positions.length];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="absolute inset-0 pointer-events-none"
      >
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className={`absolute inset-0 bg-[radial-gradient(circle_at_${currentPosition[0]},_#60a5fa_0%,_transparent_50%)] opacity-30`}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`absolute inset-0 bg-[radial-gradient(circle_at_${currentPosition[1]},_#93c5fd_0%,_transparent_50%)] opacity-30`}
        />
      </motion.div>
      {children}
    </div>
  );
};
