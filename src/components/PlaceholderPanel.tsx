import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ShieldAlert } from 'lucide-react';

interface PlaceholderPanelProps {
  title: string;
  description: string;
  moduleName?: string;
}

export const PlaceholderPanel: React.FC<PlaceholderPanelProps> = ({ title, description, moduleName = 'Clinical Intelligence Module' }) => {
  return (
    <div className="max-w-4xl mx-auto py-6">
      <Card className="border-none shadow-sm bg-white rounded-2xl p-6 md:p-10 text-center space-y-6">
        <CardHeader className="p-0 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-800 flex items-center justify-center mx-auto border border-red-150">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] text-red-800 bg-red-50 border border-red-100 px-3 py-1 rounded-xl font-black uppercase tracking-wider">
              {moduleName}
            </span>
            <CardTitle className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight mt-2">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 max-w-lg mx-auto space-y-4">
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            {description}
          </p>
          <div className="flex items-center gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-455 font-bold leading-normal text-left">
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0" />
            <span>This screen acts as a foundation skeleton path placeholder. Dynamic database tables and CRUD operations will connect here using Supabase APIs.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
