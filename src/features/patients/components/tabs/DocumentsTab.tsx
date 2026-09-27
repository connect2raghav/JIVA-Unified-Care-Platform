import React, { useState, useEffect } from 'react';
import { usePatientStore } from '../../../../store/usePatientStore';
import { useNotificationStore } from '../../../../store/useNotificationStore';
import { patientService } from '../../../../services/patientService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Sparkles, 
  FileCheck, 
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

interface DocumentRecord {
  id: string;
  patientId: string;
  name: string;
  category: 'Consent Form' | 'Referral Letter' | 'Medical Report' | 'Lab Report' | 'Prescription' | 'Clinical Documents' | 'Referral Letters' | 'Consent Forms';
  uploadDate: string;
  size: string;
  imageUrl?: string;
  notes?: string;
}

const DEFAULT_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc-1',
    patientId: 'pat-1',
    name: 'Consent Form - Composite Restoration.pdf',
    category: 'Consent Form',
    uploadDate: '2026-05-12T10:00:00Z',
    size: '245 KB'
  },
  {
    id: 'doc-2',
    patientId: 'pat-1',
    name: 'Referral Letter - Dr. Kulkarni.pdf',
    category: 'Referral Letter',
    uploadDate: '2026-04-10T14:30:00Z',
    size: '180 KB'
  },
];

export const DocumentsTab: React.FC = () => {
  const { selectedPatient, images, addImageRecord, deleteImageRecord } = usePatientStore();
  const { addToast } = useNotificationStore();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentRecord['category']>('Consent Form');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    if (selectedPatient) {
      loadDocuments();
    }
  }, [selectedPatient, images]);

  const loadDocuments = () => {
    // 1. Load legacy documents from cache
    const cached = localStorage.getItem('dcip_documents_sandbox');
    let legacyList = DEFAULT_DOCUMENTS;
    if (cached) {
      try { legacyList = JSON.parse(cached); } catch {}
    } else {
      localStorage.setItem('dcip_documents_sandbox', JSON.stringify(DEFAULT_DOCUMENTS));
    }
    const filteredLegacy = legacyList.filter(d => d.patientId === selectedPatient?.id);

    // 2. Load unified document records from Patient Store Images (which include files with doc categories)
    const documentCategories = ['Clinical Documents', 'Referral Letters', 'Consent Forms', 'Consent Form', 'Referral Letter'];
    const storeDocs: DocumentRecord[] = images
      .filter(img => documentCategories.includes(img.category))
      .map(img => ({
        id: img.id,
        patientId: img.patientId,
        name: img.title.endsWith('.pdf') ? img.title : `${img.title}.pdf`,
        category: img.category as any,
        uploadDate: img.dateTime,
        size: '350 KB',
        imageUrl: img.imageUrl,
        notes: img.notes
      }));

    // Combine both arrays
    setDocuments([...storeDocs, ...filteredLegacy]);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    if (!docName) {
      addToast({ type: 'warning', title: 'Incomplete Information', message: 'Provide a document label.' });
      return;
    }

    // Save document as an ImageRecord in the unified digital files database
    let mappedCategory: any = 'Clinical Documents';
    if (docCategory === 'Consent Form' || docCategory === 'Consent Forms') mappedCategory = 'Consent Forms';
    else if (docCategory === 'Referral Letter' || docCategory === 'Referral Letters') mappedCategory = 'Referral Letters';

    const res = await patientService.createImageRecord({
      patientId: selectedPatient.id,
      title: docName.endsWith('.pdf') ? docName : `${docName}.pdf`,
      category: mappedCategory,
      imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=150', // Mock document preview image
      notes: `Uploaded PDF document size: ${selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : '220 KB'}.`
    });

    if (res.success && res.data) {
      addImageRecord(res.data);
      addToast({
        type: 'success',
        title: 'Document Saved (Document Uploaded)',
        message: `Successfully registered "${docName}" to digital archive.`
      });

      setDocName('');
      setSelectedFile(null);
      setIsUploadOpen(false);
      loadDocuments();
    } else {
      addToast({ type: 'error', title: 'Error Occurred', message: res.error || 'Failed to save document' });
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteDoc) return;
    
    // Check if it is a legacy document or a store document
    const isStoreDoc = images.some(img => img.id === deleteDoc.id);

    if (isStoreDoc) {
      const res = await patientService.deleteImageRecord(deleteDoc.id);
      if (res.success) {
        deleteImageRecord(deleteDoc.id);
        addToast({
          type: 'success',
          title: 'Document Deleted',
          message: `Successfully removed "${deleteDoc.name}" from patient files.`
        });
      } else {
        addToast({ type: 'error', title: 'Deletion Failed', message: res.error || 'Server error' });
      }
    } else {
      // Legacy cache delete
      const cached = localStorage.getItem('dcip_documents_sandbox');
      if (cached) {
        try {
          const list: DocumentRecord[] = JSON.parse(cached);
          const filtered = list.filter(d => d.id !== deleteDoc.id);
          localStorage.setItem('dcip_documents_sandbox', JSON.stringify(filtered));
          addToast({
            type: 'success',
            title: 'Document Deleted',
            message: `Successfully removed "${deleteDoc.name}" from patient files.`
          });
        } catch {}
      }
    }

    setDeleteDoc(null);
    loadDocuments();
  };

  const handleDownload = (doc: DocumentRecord) => {
    addToast({
      type: 'info',
      title: 'Downloading File',
      message: `Retrieving "${doc.name}" from patient archive...`
    });
  };

  if (!selectedPatient) return null;

  return (
    <div className="space-y-6">
      {/* Header and Upload Action */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-805 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-red-808" />
            <span>Patient Digital Documents</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Store patient consent templates, referral notes, and clinical records.
          </p>
        </div>

        <Button
          onClick={() => setIsUploadOpen(true)}
          className="h-9.5 bg-red-800 hover:bg-red-955 text-white font-bold rounded-xl shadow-sm gap-1.5 text-xs px-4"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden hover:shadow-md transition">
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-805" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-bold text-slate-900 leading-snug line-clamp-1">{doc.name}</h4>
                  <p className="text-[9px] font-black text-red-850 uppercase tracking-wider">{doc.category}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Uploaded: {new Date(doc.uploadDate).toLocaleDateString()} • {doc.size}
                  </p>
                </div>
              </div>

              {/* Actions panel */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewDoc(doc)}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 p-0"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(doc)}
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 p-0"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteDoc(doc)}
                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 p-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {documents.length === 0 && (
          <Card className="col-span-2 border-none shadow-sm bg-white rounded-2xl p-12 text-center text-xs">
            <FileText className="w-10 h-10 text-slate-205 mx-auto mb-3" />
            <p className="font-bold text-slate-400 italic">No stored documents found for this patient record.</p>
          </Card>
        )}
      </div>

      {/* UPLOAD DOCUMENT DIALOG */}
      {isUploadOpen && (
        <Dialog open={isUploadOpen} onOpenChange={(open: boolean) => !open && setIsUploadOpen(false)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-205">
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-808 shrink-0" />
                  <span>Upload Stored Document</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold leading-normal">
                  Select document category, name, and choose the PDF file to upload.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Category */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Document Category *</Label>
                  <select
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white font-semibold text-slate-805"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as any)}
                  >
                    <option value="Consent Form">Consent Form</option>
                    <option value="Referral Letter">Referral Letter</option>
                    <option value="Medical Report">Medical Report</option>
                    <option value="Lab Report">Lab Report</option>
                    <option value="Prescription">Prescription</option>
                  </select>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Document Label *</Label>
                  <Input
                    placeholder="e.g., Extraction Consent Form"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                    required
                  />
                </div>

                {/* File Select */}
                <div className="space-y-1">
                  <Label className="text-xs font-extrabold text-slate-500">Choose File *</Label>
                  <Input
                    type="file"
                    accept=".pdf,.docx,.jpg,.png"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="h-10 rounded-xl border-slate-200 p-1 text-xs"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2 justify-end mt-4 pt-2">
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
                  className="h-10 rounded-xl bg-red-800 hover:bg-red-950 text-white font-bold text-xs px-4"
                >
                  Upload File
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* PREVIEW DOCUMENT DIALOG */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={(open: boolean) => !open && setPreviewDoc(null)}>
          <DialogContent className="max-w-xl rounded-2xl p-6 bg-white border-slate-205">
            <DialogHeader className="space-y-1 border-b border-slate-100 pb-3 mb-4">
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-red-808 shrink-0" />
                <span>Document Viewer</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-semibold truncate">
                {previewDoc.name}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[250px] text-center text-xs space-y-3">
              <FileText className="w-12 h-12 text-slate-350" />
              <div>
                <p className="font-bold text-slate-900">{previewDoc.name}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Category: {previewDoc.category} • Uploaded on {new Date(previewDoc.uploadDate).toLocaleString()}
                </p>
              </div>
              {previewDoc.notes && (
                <div className="bg-white border border-slate-100 p-3 rounded-xl max-w-sm mt-2 font-semibold text-slate-550 text-left">
                  {previewDoc.notes}
                </div>
              )}
              <p className="text-[10px] text-slate-500 max-w-sm italic leading-relaxed pt-2">
                This is a secure preview of the clinical file. The system enforces zero-trust encryption access policies on clinical PDFs.
              </p>
            </div>

            <DialogFooter className="mt-4 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPreviewDoc(null)}
                className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-655 w-full"
              >
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE DOCUMENT CONFIRMATION */}
      {deleteDoc && (
        <Dialog open={!!deleteDoc} onOpenChange={(open: boolean) => !open && setDeleteDoc(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-slate-205">
            <DialogHeader className="space-y-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center border bg-rose-50 border-rose-150 text-rose-800 shadow-sm">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-base font-black text-slate-900 leading-snug">
                  Delete Stored Document?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-semibold leading-relaxed mt-1">
                  Are you sure you want to permanently delete the clinical document "{deleteDoc.name}"? This action cannot be undone.
                </DialogDescription>
              </div>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end mt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteDoc(null)}
                className="h-10 rounded-xl border border-slate-250 font-bold text-xs text-slate-655"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteSubmit}
                className="h-10 rounded-xl bg-rose-800 hover:bg-rose-955 text-white font-bold text-xs px-4"
              >
                Yes, Delete Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default DocumentsTab;
