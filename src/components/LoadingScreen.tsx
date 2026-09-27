import React from 'react';
import { HeartPulse } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-50 antialiased">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: [0.9, 1.05, 1], opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-red-805 flex items-center justify-center text-white shadow-xl shadow-red-900/15">
          <HeartPulse className="w-8 h-8 animate-pulse text-white" />
        </div>
        <div className="space-y-1.5 text-center">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">DCIP Platform Secure Portal</h2>
          <p className="text-xs text-slate-455 font-bold uppercase tracking-wider">Syncing Clinical Registry...</p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
