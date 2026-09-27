import React, { useState } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Link, 
  Link2Off,
  Calendar,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImageRecord } from '../../../../types';

interface ImageCompareProps {
  primaryImage: ImageRecord;
  imageList: ImageRecord[];
  onClose: () => void;
}

export const ImageCompare: React.FC<ImageCompareProps> = ({
  primaryImage,
  imageList,
  onClose
}) => {
  const [img1, setImg1] = useState<ImageRecord>(primaryImage);
  // Default second image is the next in the list, or the first one if only one
  const [img2, setImg2] = useState<ImageRecord>(() => {
    const idx = imageList.findIndex(i => i.id === primaryImage.id);
    if (idx !== -1 && imageList.length > 1) {
      return imageList[idx === 0 ? 1 : idx - 1];
    }
    return primaryImage;
  });

  const [syncTransforms, setSyncTransforms] = useState(true);

  // Viewport 1 state
  const [zoom1, setZoom1] = useState(1);
  const [pan1, setPan1] = useState({ x: 0, y: 0 });
  const [rotation1, setRotation1] = useState(0);

  // Viewport 2 state
  const [zoom2, setZoom2] = useState(1);
  const [pan2, setPan2] = useState({ x: 0, y: 0 });
  const [rotation2, setRotation2] = useState(0);

  // Drag states
  const [isPanning1, setIsPanning1] = useState(false);
  const [isPanning2, setIsPanning2] = useState(false);
  const [panStart1, setPanStart1] = useState({ x: 0, y: 0 });
  const [panStart2, setPanStart2] = useState({ x: 0, y: 0 });

  // Sync zoom/pan when sync mode is toggled on or if synced actions occur
  const handleZoomIn = () => {
    if (syncTransforms) {
      setZoom1(z => Math.min(z + 0.25, 4));
      setZoom2(z => Math.min(z + 0.25, 4));
    } else {
      setZoom1(z => Math.min(z + 0.25, 4));
    }
  };

  const handleZoomOut = () => {
    if (syncTransforms) {
      setZoom1(z => Math.max(z - 0.25, 0.5));
      setZoom2(z => Math.max(z - 0.25, 0.5));
    } else {
      setZoom1(z => Math.max(z - 0.25, 0.5));
    }
  };

  const handleZoomIn2 = () => {
    if (syncTransforms) {
      setZoom1(z => Math.min(z + 0.25, 4));
      setZoom2(z => Math.min(z + 0.25, 4));
    } else {
      setZoom2(z => Math.min(z + 0.25, 4));
    }
  };

  const handleZoomOut2 = () => {
    if (syncTransforms) {
      setZoom1(z => Math.max(z - 0.25, 0.5));
      setZoom2(z => Math.max(z - 0.25, 0.5));
    } else {
      setZoom2(z => Math.max(z - 0.25, 0.5));
    }
  };

  const handleRotate1 = () => {
    setRotation1(r => (r + 90) % 360);
    if (syncTransforms) setRotation2(r => (r + 90) % 360);
  };

  const handleRotate2 = () => {
    setRotation2(r => (r + 90) % 360);
    if (syncTransforms) setRotation1(r => (r + 90) % 360);
  };

  const handleReset = () => {
    setZoom1(1);
    setPan1({ x: 0, y: 0 });
    setRotation1(0);
    setZoom2(1);
    setPan2({ x: 0, y: 0 });
    setRotation2(0);
  };

  // Drag pan handlers
  const handleMouseDown1 = (e: React.MouseEvent) => {
    setIsPanning1(true);
    setPanStart1({ x: e.clientX - pan1.x, y: e.clientY - pan1.y });
  };

  const handleMouseDown2 = (e: React.MouseEvent) => {
    setIsPanning2(true);
    setPanStart2({ x: e.clientX - pan2.x, y: e.clientY - pan2.y });
  };

  const handleMouseMove1 = (e: React.MouseEvent) => {
    if (!isPanning1) return;
    const newPan = {
      x: e.clientX - panStart1.x,
      y: e.clientY - panStart1.y
    };
    setPan1(newPan);
    if (syncTransforms) {
      setPan2(newPan);
    }
  };

  const handleMouseMove2 = (e: React.MouseEvent) => {
    if (!isPanning2) return;
    const newPan = {
      x: e.clientX - panStart2.x,
      y: e.clientY - panStart2.y
    };
    setPan2(newPan);
    if (syncTransforms) {
      setPan1(newPan);
    }
  };

  const stopPanning = () => {
    setIsPanning1(false);
    setIsPanning2(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 p-4 md:p-6 select-none">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
            <span>Side-by-Side Comparison Workspace</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Compare progression, before vs after restoratives or OPG updates.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => setSyncTransforms(!syncTransforms)}
            className={`h-8.5 text-xs font-bold rounded-xl flex items-center gap-1.5 px-3 border ${
              syncTransforms 
                ? 'bg-red-900 border-red-800 text-white' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Sync Zoom & Pan Coordinates"
          >
            {syncTransforms ? <Link className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
            <span>{syncTransforms ? 'Synced Zoom' : 'Independent'}</span>
          </Button>

          <Button size="sm" variant="ghost" onClick={handleReset} className="h-8.5 text-xs text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:bg-slate-900">
            Reset Zoom
          </Button>

          <Button
            size="sm"
            onClick={onClose}
            className="h-8.5 w-8.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg p-0"
          >
            <X className="w-4.5 h-4.5" />
          </Button>
        </div>
      </div>

      {/* Selectors and Viewports */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        
        {/* Top Dropdowns selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Image 1:</span>
            <select
              value={img1.id}
              onChange={(e) => setImg1(imageList.find(i => i.id === e.target.value) || img1)}
              className="h-9 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-200 outline-none w-full px-3"
            >
              {imageList.map(i => (
                <option key={i.id} value={i.id}>{i.title} ({new Date(i.dateTime).toLocaleDateString()})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Image 2:</span>
            <select
              value={img2.id}
              onChange={(e) => setImg2(imageList.find(i => i.id === e.target.value) || img2)}
              className="h-9 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-200 outline-none w-full px-3"
            >
              {imageList.map(i => (
                <option key={i.id} value={i.id}>{i.title} ({new Date(i.dateTime).toLocaleDateString()})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Viewport Panels */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          
          {/* Viewport 1 */}
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between">
            <div 
              onMouseDown={handleMouseDown1}
              onMouseMove={handleMouseMove1}
              onMouseUp={stopPanning}
              onMouseLeave={stopPanning}
              className="flex-1 flex items-center justify-center cursor-grab overflow-hidden relative"
            >
              <div
                className="transition-transform duration-100 ease-out"
                style={{
                  transform: `scale(${zoom1}) translate(${pan1.x}px, ${pan1.y}px) rotate(${rotation1}deg)`
                }}
              >
                <img 
                  src={img1.imageUrl} 
                  alt={img1.title} 
                  draggable={false}
                  className="max-w-[38vw] max-h-[50vh] object-contain rounded-lg shadow-md border border-slate-800 pointer-events-none select-none"
                />
              </div>
            </div>

            {/* Controls slot 1 */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur border border-slate-800/80 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase text-slate-300">
              {img1.category}
            </div>

            <div className="p-4 bg-slate-950/40 border-t border-slate-900 flex justify-between items-center text-xs">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-200 truncate max-w-[240px]">{img1.title}</p>
                <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Acquisition: {new Date(img1.dateTime).toLocaleDateString()}</span>
                  {img1.toothNumber && (
                    <span className="ml-2 flex items-center gap-0.5">
                      <Tag className="w-3 h-3 text-red-500" />
                      <span>Tooth #{img1.toothNumber}</span>
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={handleZoomOut} className="h-7 w-7 text-slate-400 p-0 hover:text-white">
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleZoomIn} className="h-7 w-7 text-slate-400 p-0 hover:text-white">
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleRotate1} className="h-7 w-7 text-slate-400 p-0 hover:text-white">
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Viewport 2 */}
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between">
            <div 
              onMouseDown={handleMouseDown2}
              onMouseMove={handleMouseMove2}
              onMouseUp={stopPanning}
              onMouseLeave={stopPanning}
              className="flex-1 flex items-center justify-center cursor-grab overflow-hidden relative"
            >
              <div
                className="transition-transform duration-100 ease-out"
                style={{
                  transform: `scale(${zoom2}) translate(${pan2.x}px, ${pan2.y}px) rotate(${rotation2}deg)`
                }}
              >
                <img 
                  src={img2.imageUrl} 
                  alt={img2.title} 
                  draggable={false}
                  className="max-w-[38vw] max-h-[50vh] object-contain rounded-lg shadow-md border border-slate-800 pointer-events-none select-none"
                />
              </div>
            </div>

            {/* Controls slot 2 */}
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur border border-slate-800/80 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase text-slate-300">
              {img2.category}
            </div>

            <div className="p-4 bg-slate-950/40 border-t border-slate-900 flex justify-between items-center text-xs">
              <div className="space-y-0.5">
                <p className="font-bold text-slate-200 truncate max-w-[240px]">{img2.title}</p>
                <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Acquisition: {new Date(img2.dateTime).toLocaleDateString()}</span>
                  {img2.toothNumber && (
                    <span className="ml-2 flex items-center gap-0.5">
                      <Tag className="w-3 h-3 text-red-500" />
                      <span>Tooth #{img2.toothNumber}</span>
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={handleZoomOut2} className="h-7 w-7 text-slate-400 p-0 hover:text-white">
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleZoomIn2} className="h-7 w-7 text-slate-400 p-0 hover:text-white">
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleRotate2} className="h-7 w-7 text-slate-400 p-0 hover:text-white">
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
