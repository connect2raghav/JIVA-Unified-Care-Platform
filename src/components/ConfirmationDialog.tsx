import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm action',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-205">
        <DialogHeader className="space-y-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm ${
            isDestructive 
              ? 'bg-red-50 border-red-150 text-red-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-base font-black text-slate-900 leading-snug">{title}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
          <Button
            type="button"
            variant="ghost"
            disabled={isLoading}
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-600 hover:bg-slate-50"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`h-10 rounded-xl font-bold text-xs text-white ${
              isDestructive 
                ? 'bg-red-850 hover:bg-red-950 shadow-md shadow-red-900/10' 
                : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
