import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Trash2, 
  Save, 
  ArrowUpRight, 
  Square, 
  Type, 
  RotateCcw,
  Undo,
  Tag,
  FileText
} from 'lucide-react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { useNotificationStore } from '../../../../store/useNotificationStore';
import { patientService } from '../../../../services/patientService';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { ImageRecord } from '../../../../types';

// Let's import button from ui instead of card
import { Button as UIButton } from '@/components/ui/button';

interface Annotation {
  id: string;
  type: 'arrow' | 'rect' | 'label';
  points?: number[]; // [x1, y1, x2, y2]
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
}

interface ImageViewerProps {
  image: ImageRecord;
  imageList: ImageRecord[];
  onClose: () => void;
  onSelectImage: (img: ImageRecord) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  image,
  imageList,
  onClose,
  onSelectImage
}) => {
  const { updateImageRecord, deleteImageRecord } = usePatientStore();
  const { addToast } = useNotificationStore();

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Annotation States
  const [activeTool, setActiveTool] = useState<'select' | 'arrow' | 'rect' | 'label'>('select');
  const [activeColor, setActiveColor] = useState('#ef4444'); // Red default
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [newLabelText, setNewLabelText] = useState('');
  const [labelCoords, setLabelCoords] = useState<{ x: number; y: number } | null>(null);
  
  // Drag drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentDraw, setCurrentDraw] = useState<{ x2: number; y2: number } | null>(null);

  // Linkage States
  const [toothNumber, setToothNumber] = useState<number | ''>('');
  const [surface, setSurface] = useState('');
  const [notes, setNotes] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const drawingAreaRef = useRef<SVGSVGElement>(null);

  const currentIndex = imageList.findIndex(img => img.id === image.id);

  // Load annotations and details on image change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setAnnotations([]);
    setLabelCoords(null);
    setNotes(image.notes || '');
    setToothNumber(image.toothNumber || '');
    setSurface(image.surface || '');

    if (image.annotations) {
      try {
        setAnnotations(JSON.parse(image.annotations));
      } catch (e) {
        console.error('Failed to parse annotations', e);
      }
    }
  }, [image]);

  const handleNext = () => {
    if (currentIndex < imageList.length - 1) {
      onSelectImage(imageList[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectImage(imageList[currentIndex - 1]);
    }
  };

  // Zooming
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== 'select') return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && activeTool === 'select') {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Relative SVG drawing coords [0, 1000]
  const getSvgCoords = (clientX: number, clientY: number) => {
    if (!drawingAreaRef.current) return { x: 0, y: 0 };
    const rect = drawingAreaRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 1000;
    const y = ((clientY - rect.top) / rect.height) * 1000;
    return { x: Math.round(x), y: Math.round(y) };
  };

  // Drawing Handlers
  const handleDrawStart = (e: React.MouseEvent) => {
    if (activeTool === 'select') return;
    e.preventDefault();
    const coords = getSvgCoords(e.clientX, e.clientY);
    
    if (activeTool === 'label') {
      setLabelCoords(coords);
      setNewLabelText('');
      return;
    }

    setIsDrawing(true);
    setDrawStart(coords);
    setCurrentDraw({ x2: coords.x, y2: coords.y });
  };

  const handleDrawing = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const coords = getSvgCoords(e.clientX, e.clientY);
    setCurrentDraw({ x2: coords.x, y2: coords.y });
  };

  const handleDrawEnd = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const coords = getSvgCoords(e.clientX, e.clientY);

    let newAnn: Annotation | null = null;
    const id = `ann-${Date.now()}`;

    if (activeTool === 'arrow') {
      newAnn = {
        id,
        type: 'arrow',
        points: [drawStart.x, drawStart.y, coords.x, coords.y],
        color: activeColor
      };
    } else if (activeTool === 'rect') {
      const x = Math.min(drawStart.x, coords.x);
      const y = Math.min(drawStart.y, coords.y);
      const width = Math.abs(drawStart.x - coords.x);
      const height = Math.abs(drawStart.y - coords.y);
      newAnn = {
        id,
        type: 'rect',
        x,
        y,
        width,
        height,
        color: activeColor
      };
    }

    if (newAnn) {
      setAnnotations(prev => [...prev, newAnn!]);
    }
    setCurrentDraw(null);
  };

  const handleAddLabel = () => {
    if (!newLabelText || !labelCoords) return;
    const newAnn: Annotation = {
      id: `ann-${Date.now()}`,
      type: 'label',
      x: labelCoords.x,
      y: labelCoords.y,
      text: newLabelText,
      color: activeColor
    };
    setAnnotations(prev => [...prev, newAnn]);
    setLabelCoords(null);
    setNewLabelText('');
  };

  const handleUndo = () => {
    setAnnotations(prev => prev.slice(0, -1));
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  const handleSave = async () => {
    const res = await patientService.updateImageRecord(image.id, {
      notes,
      toothNumber: toothNumber === '' ? undefined : Number(toothNumber),
      surface: surface || undefined,
      annotations: JSON.stringify(annotations)
    });

    if (res.success && res.data) {
      updateImageRecord(image.id, res.data);
      addToast({
        type: 'success',
        title: 'Annotations Saved',
        message: 'Annotations and details saved successfully.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Failed to Save',
        message: res.error || 'Server error'
      });
    }
  };

  const handleDeleteImage = async () => {
    if (confirm('Are you sure you want to delete this image permanently?')) {
      const res = await patientService.deleteImageRecord(image.id);
      if (res.success) {
        deleteImageRecord(image.id);
        addToast({
          type: 'success',
          title: 'Image Deleted',
          message: 'Image deleted from database charts.'
        });
        onClose();
      } else {
        addToast({ type: 'error', title: 'Error', message: res.error || 'Failed to delete' });
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.imageUrl;
    link.download = image.title || 'dental-record.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}>
      
      {/* Lightbox Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 select-none">
        <div className="space-y-0.5 max-w-[65%]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
              {image.category}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
              Acquisition: {new Date(image.dateTime).toLocaleString()}
            </span>
          </div>
          <h3 className="font-extrabold text-xs md:text-sm text-slate-100 truncate">{image.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          <UIButton
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-8.5 w-8.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 p-0"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </UIButton>
          <UIButton
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            className="h-8.5 w-8.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 p-0"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </UIButton>
          <UIButton
            size="sm"
            variant="ghost"
            onClick={handleDeleteImage}
            className="h-8.5 w-8.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-955 p-0"
            title="Delete Image"
          >
            <Trash2 className="w-4 h-4" />
          </UIButton>
          <UIButton
            size="sm"
            onClick={onClose}
            className="h-8.5 w-8.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg p-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </UIButton>
        </div>
      </div>

      {/* Main workspace splits */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden min-h-0">
        
        {/* Left Side: Viewer Workspace */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden group">
          
          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`absolute left-4 z-10 p-2 rounded-full bg-black/60 text-slate-300 hover:text-white hover:bg-black/90 transition select-none disabled:opacity-30 disabled:pointer-events-none`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === imageList.length - 1}
            className={`absolute right-4 z-10 p-2 rounded-full bg-black/60 text-slate-300 hover:text-white hover:bg-black/90 transition select-none disabled:opacity-30 disabled:pointer-events-none`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Canvas Wrapper */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full flex items-center justify-center cursor-default select-none relative overflow-hidden"
          >
            <div 
              className="relative max-w-full max-h-full transition-transform duration-100 ease-out flex items-center justify-center"
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
                aspectRatio: 'auto'
              }}
            >
              <img
                src={image.imageUrl}
                alt={image.title}
                draggable={false}
                className="max-w-[70vw] max-h-[60vh] object-contain pointer-events-none select-none opacity-95 rounded-lg border border-slate-700"
              />
              
              {/* SVG drawing interaction overlay */}
              <svg
                ref={drawingAreaRef}
                viewBox="0 0 1000 1000"
                className={`absolute inset-0 w-full h-full pointer-events-auto ${activeTool !== 'select' ? 'cursor-crosshair' : 'cursor-grab'}`}
                onMouseDown={handleDrawStart}
                onMouseMove={handleDrawing}
                onMouseUp={handleDrawEnd}
              >
                {/* Saved Annotations */}
                {annotations.map((ann) => {
                  if (ann.type === 'arrow' && ann.points) {
                    return (
                      <g key={ann.id}>
                        <defs>
                          <marker
                            id={`arrowhead-${ann.id}`}
                            markerWidth="10"
                            markerHeight="7"
                            refX="8"
                            refY="3.5"
                            orient="auto"
                          >
                            <polygon points="0 0, 10 3.5, 0 7" fill={ann.color} />
                          </marker>
                        </defs>
                        <line
                          x1={ann.points[0]}
                          y1={ann.points[1]}
                          x2={ann.points[2]}
                          y2={ann.points[3]}
                          stroke={ann.color}
                          strokeWidth="8"
                          markerEnd={`url(#arrowhead-${ann.id})`}
                        />
                      </g>
                    );
                  }
                  if (ann.type === 'rect') {
                    return (
                      <rect
                        key={ann.id}
                        x={ann.x}
                        y={ann.y}
                        width={ann.width}
                        height={ann.height}
                        fill="transparent"
                        stroke={ann.color}
                        strokeWidth="8"
                      />
                    );
                  }
                  if (ann.type === 'label') {
                    return (
                      <g key={ann.id}>
                        <rect
                          x={ann.x! - 5}
                          y={ann.y! - 22}
                          width={(ann.text?.length || 0) * 15 + 10}
                          height="30"
                          fill="black"
                          opacity="0.75"
                          rx="4"
                        />
                        <text
                          x={ann.x}
                          y={ann.y}
                          fill={ann.color}
                          fontSize="22"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {ann.text}
                        </text>
                      </g>
                    );
                  }
                  return null;
                })}

                {/* Current Active Draw Preview */}
                {isDrawing && currentDraw && activeTool === 'arrow' && (
                  <line
                    x1={drawStart.x}
                    y1={drawStart.y}
                    x2={currentDraw.x2}
                    y2={currentDraw.y2}
                    stroke={activeColor}
                    strokeWidth="8"
                    strokeDasharray="10, 10"
                  />
                )}
                {isDrawing && currentDraw && activeTool === 'rect' && (
                  <rect
                    x={Math.min(drawStart.x, currentDraw.x2)}
                    y={Math.min(drawStart.y, currentDraw.y2)}
                    width={Math.abs(drawStart.x - currentDraw.x2)}
                    height={Math.abs(drawStart.y - currentDraw.y2)}
                    fill="transparent"
                    stroke={activeColor}
                    strokeWidth="8"
                    strokeDasharray="10, 10"
                  />
                )}
              </svg>
            </div>
          </div>

          {/* Floating Workspace Controls Overlay */}
          <div className="absolute bottom-4 flex flex-wrap items-center justify-center gap-2 px-4 py-2 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl max-w-[90%] select-none z-20">
            {/* View Controls */}
            <div className="flex items-center gap-1 border-r border-slate-800 pr-2">
              <UIButton size="sm" variant="ghost" onClick={handleZoomOut} className="h-8 w-8 text-slate-300 p-0" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </UIButton>
              <span className="text-[10px] font-bold text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <UIButton size="sm" variant="ghost" onClick={handleZoomIn} className="h-8 w-8 text-slate-300 p-0" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </UIButton>
              <UIButton size="sm" variant="ghost" onClick={handleRotate} className="h-8 w-8 text-slate-300 p-0" title="Rotate">
                <RotateCw className="w-4 h-4" />
              </UIButton>
              <UIButton size="sm" variant="ghost" onClick={handleReset} className="h-8 w-8 text-slate-300 p-0" title="Reset View">
                <RotateCcw className="w-4 h-4" />
              </UIButton>
            </div>

            {/* Drawing Tools */}
            <div className="flex items-center gap-1 border-r border-slate-800 pr-2 pl-1">
              <button
                onClick={() => setActiveTool('select')}
                className={`h-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTool === 'select' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-900'}`}
              >
                <span>Move</span>
              </button>
              
              <button
                onClick={() => setActiveTool('arrow')}
                className={`h-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTool === 'arrow' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-900'}`}
                title="Draw Arrow Indicator"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Arrow</span>
              </button>

              <button
                onClick={() => setActiveTool('rect')}
                className={`h-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTool === 'rect' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-900'}`}
                title="Highlight Region"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Highlight</span>
              </button>

              <button
                onClick={() => setActiveTool('label')}
                className={`h-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTool === 'label' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-900'}`}
                title="Insert Text Label"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Label</span>
              </button>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1 border-r border-slate-800 pr-2 pl-1">
              {['#ef4444', '#3b82f6', '#22c55e', '#eab308'].map(color => (
                <button
                  key={color}
                  onClick={() => setActiveColor(color)}
                  className={`w-5 h-5 rounded-full border border-white/20 relative transition flex items-center justify-center`}
                  style={{ backgroundColor: color }}
                >
                  {activeColor === color && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              ))}
            </div>

            {/* Undo */}
            <UIButton size="sm" variant="ghost" onClick={handleUndo} disabled={annotations.length === 0} className="h-8 w-8 text-slate-300 p-0 disabled:opacity-30" title="Undo Last Drawing">
              <Undo className="w-4 h-4" />
            </UIButton>
          </div>

          {/* Popup input for labels */}
          {labelCoords && (
            <div 
              className="absolute z-30 p-3 bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl flex flex-col gap-2 max-w-[260px]"
              style={{
                left: `${(labelCoords.x / 1000) * (containerRef.current?.getBoundingClientRect().width || 0)}px`,
                top: `${(labelCoords.y / 1000) * (containerRef.current?.getBoundingClientRect().height || 0)}px`,
              }}
            >
              <span className="text-[10px] font-bold text-slate-400">Enter Text Label:</span>
              <Input
                placeholder="e.g. Tooth ache, abscess..."
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                className="h-8 text-xs bg-slate-900 border-slate-700 text-white rounded-lg"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
              />
              <div className="flex justify-end gap-1.5 mt-1">
                <UIButton size="sm" variant="ghost" onClick={() => setLabelCoords(null)} className="h-6.5 text-[10px] font-semibold text-slate-400 hover:text-white">
                  Cancel
                </UIButton>
                <UIButton size="sm" onClick={handleAddLabel} className="h-6.5 text-[10px] font-bold bg-red-600 text-white hover:bg-red-700 px-3 rounded">
                  Place
                </UIButton>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Clinical Metadata & Comments Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between overflow-y-auto">
          
          <div className="space-y-5">
            {/* Header info */}
            <div>
              <h4 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-red-500" />
                <span>Link tooth details</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Link radiograph parameters to patient's clinical markers.</p>
            </div>

            {/* Link inputs */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">Tooth #</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 26, 16"
                    value={toothNumber}
                    onChange={(e) => setToothNumber(e.target.value ? Number(e.target.value) : '')}
                    className="h-9.5 text-xs bg-slate-955 border-slate-800 text-white rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">Surface</Label>
                  <select
                    className="w-full h-9.5 rounded-xl border border-slate-800 px-3 bg-slate-950 font-semibold text-slate-300 text-xs outline-none focus:border-red-600"
                    value={surface}
                    onChange={(e) => setSurface(e.target.value)}
                  >
                    <option value="">None</option>
                    <option value="O">Occlusal (O)</option>
                    <option value="B">Buccal (B)</option>
                    <option value="L">Lingual (L)</option>
                    <option value="M">Mesial (M)</option>
                    <option value="D">Distal (D)</option>
                    <option value="O,D">Occlusal-Distal</option>
                    <option value="M,O,D">Mesial-Occlusal-Distal</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Clinical Findings/Notes</span>
                </Label>
                <textarea
                  placeholder="Describe decay, bone density, pathology..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[100px] p-3 rounded-xl border border-slate-800 bg-slate-950 outline-none text-xs font-semibold focus:border-red-600 text-slate-300 resize-none"
                />
              </div>
            </div>

            {/* List of active annotations */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Canvas Marks ({annotations.length})
              </span>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {annotations.map((ann, index) => (
                  <div 
                    key={ann.id} 
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ann.color }} />
                      <span className="capitalize">{ann.type} Annotation {index + 1}</span>
                      {ann.text && <span className="text-slate-455 truncate max-w-[100px]">({ann.text})</span>}
                    </div>
                    <UIButton 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteAnnotation(ann.id)}
                      className="h-6 w-6 rounded hover:bg-slate-900 text-slate-400 hover:text-rose-400 p-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </UIButton>
                  </div>
                ))}
                {annotations.length === 0 && (
                  <div className="p-3 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 font-semibold italic text-[10px]">
                    No drawing tags added to viewer canvas yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
            <UIButton
              onClick={handleSave}
              className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </UIButton>
            <p className="text-[9px] text-slate-500 font-semibold text-center leading-normal">
              Clicking save syncs annotations, notes, and tooth link tags to the patient registry.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
