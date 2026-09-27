import React from 'react';

export const PageLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 w-full gap-3 min-h-[200px]">
      <div className="w-9 h-9 border-3 border-red-100 border-t-red-800 rounded-full animate-spin"></div>
      <p className="text-xs font-bold text-slate-455">Fetching clinical registry data...</p>
    </div>
  );
};

export default PageLoader;
