import React, { useState } from 'react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { useNotificationStore } from '../../../../store/useNotificationStore';
import { useAuthStore } from '../../../../store/useAuthStore';
import { patientService } from '../../../../services/patientService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Image as ImageIcon, 
  ZoomIn, 
  Calendar, 
  PlusCircle, 
  Sparkles, 
  Upload,
  Search,
  Filter,
  Check,
  Layers,
  Loader2,
  Tag
} from 'lucide-react';
import type { ImageRecord, ImageCategory } from '../../../../types';
import { ImageViewer } from './ImageViewer';
import { ImageCompare } from './ImageCompare';

export const ImagesTab: React.FC = () => {
  const { selectedPatient, images, addImageRecord, visits, treatmentPlans } = usePatientStore();
  const { addToast } = useNotificationStore();
  const { user } = useAuthStore();

  // Dialog configurations
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedToothFilter, setSelectedToothFilter] = useState<string>('All');

  // Compare mode states
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  // Upload Form States
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ImageCategory>('IOPA');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [linkedTooth, setLinkedTooth] = useState<number | ''>('');
  const [linkedSurface, setLinkedSurface] = useState('');
  const [linkedVisitId, setLinkedVisitId] = useState('');
  const [linkedTreatmentId, setLinkedTreatmentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drag-and-drop state
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  if (!selectedPatient) return null;

  // Extract linked list options
  const flatProcedures = treatmentPlans.flatMap(p => 
    (p.items || []).map(item => ({
      id: item.id,
      label: `${item.description} (Tooth: ${item.teeth?.join(',') || 'General'})`
    }))
  );

  const visitOptions = visits.map(v => ({
    id: v.id,
    label: `${new Date(v.dateTime).toLocaleDateString()} - ${v.chiefComplaint}`
  }));

  // File size validation and compression simulation
  const validateAndProcessFile = (file: File) => {
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validFormats.includes(file.type)) {
      addToast({ type: 'error', title: 'Invalid File Format', message: 'Supported formats are JPG, JPEG, PNG, or PDF.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'warning', title: 'Large File', message: 'Image size exceeds 5MB. Optimization recommended.' });
    }

    setUploadedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ""));

    const simulateUpload = async () => {
      for (let i = 0; i <= 100; i += 25) {
        setUploadProgress(i);
        if (i < 100) await new Promise(r => setTimeout(r, 150));
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
         setImageUrl(reader.result as string);
         setUploadProgress(null);
         addToast({
            type: 'success',
            title: 'Image Compressed',
            message: 'Quality optimized for fast storage rendering.'
         });
      };
      reader.readAsDataURL(file);
    };
    simulateUpload();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) {
      addToast({ type: 'warning', title: 'Incomplete Info', message: 'Provide a title and drop a file or URL.' });
      return;
    }

    setIsSubmitting(true);
    const validDoctorId = user?.id && !user.id.startsWith('10000000') ? user.id : undefined;

    const res = await patientService.createImageRecord({
      patientId: selectedPatient.id,
      title,
      category,
      imageUrl,
      notes,
      visitId: linkedVisitId || undefined,
      toothNumber: linkedTooth !== '' ? Number(linkedTooth) : undefined,
      surface: linkedSurface || undefined,
      treatmentId: linkedTreatmentId || undefined,
      doctorId: validDoctorId,
      doctorName: user?.name || 'Dr. Prasad Patil'
    });

    setIsSubmitting(false);
    if (res.success && res.data) {
      addImageRecord(res.data);
      addToast({
        type: 'success',
        title: 'Scan Saved',
        message: 'Successfully registered radiological study to digital files.'
      });
      
      // Reset state
      setTitle('');
      setImageUrl('');
      setNotes('');
      setLinkedTooth('');
      setLinkedSurface('');
      setLinkedVisitId('');
      setLinkedTreatmentId('');
      setUploadedFile(null);
      setIsUploadOpen(false);
    } else {
      addToast({ type: 'error', title: 'Failed to Save', message: res.error || 'Server error' });
    }
  };

  // Compare selection management
  const handleToggleCompare = (id: string) => {
    if (compareSelection.includes(id)) {
      setCompareSelection(compareSelection.filter(item => item !== id));
    } else {
      if (compareSelection.length >= 2) {
        addToast({ type: 'warning', title: 'Limit Reached', message: 'Maximum 2 images can be compared side-by-side.' });
        return;
      }
      setCompareSelection([...compareSelection, id]);
    }
  };

  // Filter application
  const filteredImages = images.filter((img) => {
    const matchesSearch = 
      img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (img.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (img.doctorName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = selectedCategory === 'All' || img.category === selectedCategory;
    const matchesTooth = selectedToothFilter === 'All' || img.toothNumber === Number(selectedToothFilter);

    return matchesSearch && matchesCategory && matchesTooth;
  });

  // Extract unique teeth for filters
  const uniqueTeeth = Array.from(
    new Set(images.map(i => i.toothNumber).filter((t): t is number => typeof t === 'number'))
  ).sort();

  return (
    <div className="space-y-6">
      
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-red-808" />
            <span>Imaging & Scans</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Manage panoramic OPGs, intraoral IOPAs, smile photos, and clinical documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {compareSelection.length === 2 && (
            <Button
              onClick={() => setIsCompareOpen(true)}
              className="h-9.5 bg-slate-900 hover:bg-slate-955 text-white font-bold rounded-xl shadow-sm gap-1.5 text-xs px-4"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Compare 2 Scans ({compareSelection.length})</span>
            </Button>
          )}

          <Button
            onClick={() => setIsUploadOpen(true)}
            className="h-9.5 bg-red-800 hover:bg-red-955 text-white font-bold rounded-xl shadow-sm gap-1.5 text-xs px-4"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Record</span>
          </Button>
        </div>
      </div>

      {/* Advanced Search & Filter Dashboard */}
      <Card className="border-none shadow-sm bg-white rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Text Search */}
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search title, doctor, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl text-xs bg-slate-50 border-slate-100 focus:bg-white"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="All">All Categories</option>
              <option value="IOPA">IOPA (Intraoral)</option>
              <option value="OPG">OPG (Panoramic)</option>
              <option value="CBCT">CBCT (CT Scan)</option>
              <option value="Intraoral Photos">Intraoral Photo</option>
              <option value="Extraoral Photos">Extraoral Photo</option>
              <option value="Smile Photographs">Smile Photo</option>
              <option value="Before Treatment">Before Treatment</option>
              <option value="After Treatment">After Treatment</option>
              <option value="Clinical Documents">Clinical Document</option>
              <option value="Referral Letters">Referral Letter</option>
              <option value="Consent Forms">Consent Form</option>
            </select>
          </div>

          {/* Tooth filter */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedToothFilter}
              onChange={(e) => setSelectedToothFilter(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-100 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="All">All Teeth</option>
              {uniqueTeeth.map(t => (
                <option key={t} value={t}>Tooth #{t}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Grid gallery */}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredImages.map((img) => {
            const isChecked = compareSelection.includes(img.id);
            return (
              <Card 
                key={img.id} 
                className={`border-none shadow-sm bg-white rounded-2xl overflow-hidden group hover:shadow-md transition-all duration-200 ${
                  isChecked ? 'ring-2 ring-red-808' : ''
                }`}
              >
                {/* Preview Container */}
                <div className="h-44 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  <img 
                    src={img.imageUrl} 
                    alt={img.title} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedImage(img)}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 pointer-events-none">
                    <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                  
                  {/* Category Badge */}
                  <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wide bg-slate-950/80 text-white border border-white/10 select-none">
                    {img.category}
                  </span>

                  {/* Checkbox selector for Compare mode */}
                  <button
                    onClick={() => handleToggleCompare(img.id)}
                    className={`absolute top-3 left-3 w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                      isChecked 
                        ? 'bg-red-808 border-red-900 text-white' 
                        : 'bg-black/60 border-white/30 text-transparent hover:border-white opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>

                {/* Card Content */}
                <CardContent className="p-4 space-y-2.5">
                  <div className="space-y-1">
                    <h4 
                      onClick={() => setSelectedImage(img)}
                      className="text-xs font-black text-slate-805 leading-snug cursor-pointer hover:text-red-808 line-clamp-1 transition"
                    >
                      {img.title}
                    </h4>
                    
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-slate-400 font-extrabold select-none">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-350" />
                        {new Date(img.dateTime).toLocaleDateString()}
                      </span>
                      {img.toothNumber && (
                        <span className="flex items-center gap-0.5 text-red-850">
                          <Tag className="w-2.5 h-2.5 text-red-500" />
                          Tooth #{img.toothNumber} {img.surface && `(${img.surface})`}
                        </span>
                      )}
                    </div>
                  </div>

                  {img.notes && (
                    <p className="text-[10px] text-slate-500 font-semibold line-clamp-2 leading-normal bg-slate-50/70 p-2 rounded-xl border border-slate-100/50">
                      {img.notes}
                    </p>
                  )}

                  {/* Small info footer */}
                  <div className="text-[9px] text-slate-400 border-t border-slate-100 pt-2 flex justify-between items-center select-none font-bold">
                    <span>Doctor: {img.doctorName || 'Dr. Prasad Patil'}</span>
                    {img.annotations && (
                      <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-black">
                        Tags ({JSON.parse(img.annotations).length})
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-12 text-center text-xs">
            <ImageIcon className="w-12 h-12 text-slate-205 mx-auto mb-3" />
            <p className="font-bold text-slate-400 italic">No radiographs, scans, or smile records found.</p>
          </CardContent>
        </Card>
      )}

      {/* -------------------------------------------------------------
          IMAGE VIEW-ANNOTATIONS DIALOG LIGHTBOX
      ------------------------------------------------------------- */}
      {selectedImage && (
        <ImageViewer
          image={selectedImage}
          imageList={filteredImages}
          onClose={() => setSelectedImage(null)}
          onSelectImage={setSelectedImage}
        />
      )}

      {/* -------------------------------------------------------------
          SIDE-BY-SIDE COMPARE DIALOG
      ------------------------------------------------------------- */}
      {isCompareOpen && compareSelection.length === 2 && (
        <ImageCompare
          primaryImage={images.find(i => i.id === compareSelection[0])!}
          imageList={images}
          onClose={() => {
            setIsCompareOpen(false);
            setCompareSelection([]);
          }}
        />
      )}

      {/* -------------------------------------------------------------
          UPLOAD SCAN / PHOTO DIALOG
      ------------------------------------------------------------- */}
      {isUploadOpen && (
        <Dialog open={isUploadOpen} onOpenChange={(open: boolean) => !open && setIsUploadOpen(false)}>
          <DialogContent className="max-w-xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-white border-slate-205">
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2 select-none">
                  <Sparkles className="w-5 h-5 text-red-808 shrink-0" />
                  <span>Catalogue Diagnostic Image</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold leading-normal select-none">
                  Drag and drop files, select category tags and link indicators to clinical charts.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Left Side: Drag & Drop Zone */}
                <div className="space-y-3">
                  <Label className="text-xs font-extrabold text-slate-500 select-none">Upload File *</Label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-browse')?.click()}
                    className={`h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition select-none ${
                      dragActive 
                        ? 'border-red-800 bg-red-50/50' 
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/50 hover:border-slate-350'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    {uploadedFile ? (
                      <div className="space-y-1 text-slate-800">
                        <p className="font-extrabold truncate max-w-[180px]">{uploadedFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-700">Drag file or browse</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-1">Supports JPG, PNG, PDF up to 5MB</p>
                      </div>
                    )}
                    <input 
                      id="file-browse"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>

                  {uploadProgress !== null && (
                    <div className="space-y-1 select-none">
                      <div className="flex justify-between text-[10px] text-slate-400 font-extrabold">
                        <span>Compressing image...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-808 h-full transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Fallback Image Source Input */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400">Or Image Link</Label>
                    <Input
                      placeholder="e.g. https://images.unsplash.com/..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="h-9 rounded-xl border-slate-200"
                    />
                  </div>
                </div>

                {/* Right Side: Metadata Parameters Linkages */}
                <div className="space-y-3.5">
                  {/* Title */}
                  <div className="space-y-1">
                    <Label className="text-xs font-extrabold text-slate-500">Study Title *</Label>
                    <Input
                      placeholder="e.g. Left bitewing scan"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-9.5 rounded-xl border-slate-200"
                      required
                    />
                  </div>

                  {/* Category & Tooth Link */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-extrabold text-slate-500">Category *</Label>
                      <select
                        className="w-full h-9.5 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-700 text-xs"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                      >
                        <option value="IOPA">IOPA (Periapical)</option>
                        <option value="OPG">OPG (Panoramic)</option>
                        <option value="CBCT">CBCT (CT Scan)</option>
                        <option value="Intraoral Photos">Intraoral Photo</option>
                        <option value="Extraoral Photos">Extraoral Photo</option>
                        <option value="Smile Photographs">Smile Photo</option>
                        <option value="Before Treatment">Before Treatment</option>
                        <option value="After Treatment">After Treatment</option>
                        <option value="Clinical Documents">Clinical Document</option>
                        <option value="Referral Letters">Referral Letter</option>
                        <option value="Consent Forms">Consent Form</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-extrabold text-slate-500">Tooth #</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 26, 16"
                        value={linkedTooth}
                        onChange={(e) => setLinkedTooth(e.target.value ? Number(e.target.value) : '')}
                        className="h-9.5 rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  {/* Linked Visit & Treatment Procedure */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400">Link to Clinical Visit</Label>
                      <select
                        className="w-full h-9.5 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-700 text-xs outline-none"
                        value={linkedVisitId}
                        onChange={(e) => setLinkedVisitId(e.target.value)}
                      >
                        <option value="">Choose Visit...</option>
                        {visitOptions.map(v => (
                          <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400">Link to Procedure</Label>
                      <select
                        className="w-full h-9.5 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-700 text-xs outline-none"
                        value={linkedTreatmentId}
                        onChange={(e) => setLinkedTreatmentId(e.target.value)}
                      >
                        <option value="">Choose Procedure...</option>
                        {flatProcedures.map(proc => (
                          <option key={proc.id} value={proc.id}>{proc.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <Label className="text-xs font-extrabold text-slate-500">Findings Notes</Label>
                    <textarea
                      placeholder="e.g. Incipient caries or pathology findings..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full min-h-[60px] p-2.5 rounded-xl border border-slate-200 outline-none text-xs font-semibold"
                    />
                  </div>
                </div>

              </div>

              <DialogFooter className="flex gap-2 justify-end mt-4 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsUploadOpen(false)}
                  className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-655"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || uploadProgress !== null}
                  className="h-10 rounded-xl bg-red-800 hover:bg-red-955 text-white font-bold text-xs px-4"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : 'Save Study'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
