import React from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';
import type { ToastMessage } from '@/store/useNotificationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toaster: React.FC = () => {
  const { toasts, removeToast } = useNotificationStore();

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-800" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-800" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-800" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-800" />;
    }
  };

  const getBgColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-100';
      case 'error':
        return 'bg-red-50 border-red-150';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-55 flex flex-col gap-3.5 w-full max-w-sm pointer-events-none select-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`flex items-start gap-3 p-4.5 rounded-2xl border shadow-lg bg-white pointer-events-auto ${getBgColor(
              toast.type
            )}`}
          >
            <div className="shrink-0 pt-0.5">{getIcon(toast.type)}</div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-xs font-black text-slate-900 leading-tight">{toast.title}</h4>
              {toast.message && (
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-655 hover:bg-white/40 transition shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Toaster;
