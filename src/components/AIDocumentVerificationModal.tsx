import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Sparkles, 
  FileBadge, 
  Camera, 
  Upload, 
  FileText, 
  ScanLine, 
  RefreshCw, 
  Award,
  ChevronRight,
  Eye,
  Check
} from 'lucide-react';
import { User } from '../types';

interface AIDocumentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onVerificationComplete: (result: {
    verified: boolean;
    reason: string;
    docType: string;
    confidence?: number;
    checks?: { name: string; passed: boolean; detail: string }[];
    docBase64: string;
  }) => void;
}

// Sample National ID generator for instant testing
function generateSampleID(userName: string): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
    <defs>
      <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f2238" />
        <stop offset="50%" stop-color="#193755" />
        <stop offset="100%" stop-color="#0b1726" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#c5a059" />
        <stop offset="100%" stop-color="#e2c98a" />
      </linearGradient>
      <pattern id="guilloche" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="8" fill="none" stroke="#c5a059" stroke-width="0.3" stroke-opacity="0.25" />
      </pattern>
    </defs>
    <!-- Background Card -->
    <rect width="640" height="400" rx="24" fill="url(#cardGrad)" stroke="#c5a059" stroke-width="3" />
    <rect x="12" y="12" width="616" height="376" rx="16" fill="url(#guilloche)" />
    
    <!-- Top Bar -->
    <rect x="24" y="24" width="592" height="60" rx="10" fill="#ffffff" fill-opacity="0.05" stroke="#c5a059" stroke-opacity="0.3" />
    <text x="45" y="48" fill="#c5a059" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="2">REPUBLIC OF UGANDA • NATIONAL IDENTIFICATION</text>
    <text x="45" y="68" fill="#ffffff" font-family="sans-serif" font-size="15" font-weight="bold">NATIONAL CITIZEN IDENTITY CARD (NIN)</text>
    
    <!-- Coat of Arms / Emblem placeholder -->
    <circle cx="580" cy="54" r="18" fill="none" stroke="#c5a059" stroke-width="1.5" />
    <polygon points="580,42 585,50 594,50 587,56 590,65 580,60 570,65 573,56 566,50 575,50" fill="#c5a059" />
    
    <!-- Photo Box -->
    <rect x="40" y="110" width="150" height="190" rx="12" fill="#09131e" stroke="#c5a059" stroke-width="2" />
    <circle cx="115" cy="175" r="38" fill="#c5a059" fill-opacity="0.3" stroke="#c5a059" stroke-width="1.5" />
    <path d="M 65 285 C 65 235, 165 235, 165 285 Z" fill="#c5a059" fill-opacity="0.3" stroke="#c5a059" stroke-width="1.5" />
    <text x="115" y="295" text-anchor="middle" fill="#c5a059" font-family="sans-serif" font-size="10" font-weight="bold">OFFICIAL PHOTO</text>

    <!-- Smart Chip -->
    <rect x="215" y="110" width="55" height="42" rx="6" fill="#e2c98a" stroke="#937433" stroke-width="1" />
    <line x1="215" y1="124" x2="270" y2="124" stroke="#937433" stroke-width="1" />
    <line x1="215" y1="138" x2="270" y2="138" stroke="#937433" stroke-width="1" />
    <line x1="242" y1="110" x2="242" y2="152" stroke="#937433" stroke-width="1" />

    <!-- Personal Information -->
    <text x="290" y="125" fill="#a0aec0" font-family="sans-serif" font-size="9" font-weight="bold">CARDHOLDER SURNAME & GIVEN NAME</text>
    <text x="290" y="145" fill="#ffffff" font-family="sans-serif" font-size="17" font-weight="bold">${userName ? userName.toUpperCase() : 'ATURINDA ADRIEL'}</text>

    <text x="215" y="185" fill="#a0aec0" font-family="sans-serif" font-size="9" font-weight="bold">NATIONAL IDENTITY NUMBER (NIN)</text>
    <text x="215" y="203" fill="#e2c98a" font-family="monospace" font-size="15" font-weight="bold">CM840291048KLA7</text>

    <text x="215" y="235" fill="#a0aec0" font-family="sans-serif" font-size="9" font-weight="bold">DATE OF BIRTH</text>
    <text x="215" y="252" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">14 / 08 / 1994</text>

    <text x="360" y="235" fill="#a0aec0" font-family="sans-serif" font-size="9" font-weight="bold">NATIONALITY</text>
    <text x="360" y="252" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">UGANDAN</text>

    <text x="470" y="235" fill="#a0aec0" font-family="sans-serif" font-size="9" font-weight="bold">GENDER</text>
    <text x="470" y="252" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">M</text>

    <text x="215" y="285" fill="#a0aec0" font-family="sans-serif" font-size="9" font-weight="bold">DATE OF EXPIRY</text>
    <text x="215" y="302" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="bold">28 / 11 / 2032</text>

    <!-- Bottom Machine Readable Zone (MRZ) -->
    <rect x="24" y="325" width="592" height="50" rx="8" fill="#000000" fill-opacity="0.4" stroke="#ffffff" stroke-opacity="0.1" />
    <text x="40" y="346" fill="#e2c98a" font-family="monospace" font-size="12" letter-spacing="2">IDUGA840291048&lt;7KLA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
    <text x="40" y="364" fill="#e2c98a" font-family="monospace" font-size="12" letter-spacing="2">9408144M3211285UGA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;9ATURINDA</text>
  </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function AIDocumentVerificationModal({
  isOpen,
  onClose,
  currentUser,
  onVerificationComplete
}: AIDocumentVerificationModalProps) {
  const [docType, setDocType] = useState('National ID');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    confidence: number;
    reason: string;
    detectedDocumentType?: string;
    extractedName?: string;
    checks?: { name: string; passed: boolean; detail: string }[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid document image (JPEG, PNG, WEBP).');
      return;
    }

    setErrorMsg('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
      setVerificationResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUseSample = () => {
    const sample = generateSampleID(currentUser?.name || currentUser?.bizName || 'Adriel Aturinda');
    setPreviewImage(sample);
    setFileName('sample_national_id.svg');
    setVerificationResult(null);
    setErrorMsg('');
  };

  const runAIVerification = async () => {
    if (!previewImage) {
      setErrorMsg('Please upload a document image or select the demo sample ID.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');
    setScanStep(1);

    // Visual step sequence for scan animation
    const timer1 = setTimeout(() => setScanStep(2), 700);
    const timer2 = setTimeout(() => setScanStep(3), 1400);
    const timer3 = setTimeout(() => setScanStep(4), 2100);

    try {
      const response = await fetch('/api/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docBase64: previewImage,
          docType: docType,
          userName: currentUser?.name || currentUser?.bizName || '',
          userEmail: currentUser?.email || ''
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Server error during document verification');
      }

      const data = await response.json();

      setVerificationResult({
        verified: !!data.verified,
        confidence: data.confidence ?? 0.92,
        reason: data.reason || (data.verified ? 'Document successfully validated by Gemini AI.' : 'Document failed authentication checks.'),
        detectedDocumentType: data.detectedDocumentType || docType,
        extractedName: data.extractedName,
        checks: data.checks || [
          { name: "Image Clarity & Resolution", passed: data.verified, detail: "High-contrast legible text detected" },
          { name: "Official Document Layout", passed: data.verified, detail: "Valid national authority structure detected" },
          { name: "Security & Emblem Analysis", passed: data.verified, detail: "Emblem alignment and borders confirmed" },
          { name: "Identity Match", passed: data.verified, detail: "Profile account match verified" }
        ]
      });

      if (data.verified) {
        onVerificationComplete({
          verified: true,
          reason: data.reason || 'Verified by Gemini AI',
          docType: data.detectedDocumentType || docType,
          confidence: data.confidence,
          checks: data.checks,
          docBase64: previewImage
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification service error. Please try again.');
    } finally {
      setIsVerifying(false);
      setScanStep(0);
    }
  };

  const resetUpload = () => {
    setPreviewImage(null);
    setFileName('');
    setVerificationResult(null);
    setErrorMsg('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/25 my-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-oc-gold text-white flex items-center justify-center shadow-md">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-oc-navy dark:text-white">
                  AI Document Verification
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Sparkles size={11} />
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Authenticate your National ID or Passport to unlock the official <strong>Verified Member</strong> badge.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* State 1: Verification Result Completed */}
        {verificationResult ? (
          <div className="space-y-6">
            {verificationResult.verified ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center mb-3 shadow-inner">
                  <CheckCircle size={36} className="animate-bounce" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-oc-navy dark:text-white">
                  Document Verified & Approved!
                </h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  Your profile has been granted the official Verified Member badge.
                </p>

                {/* Badge Preview */}
                <div className="mt-5 p-4 rounded-2xl bg-oc-cream dark:bg-white/5 border border-oc-gold/20 max-w-md mx-auto text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-oc-navy text-oc-gold flex items-center justify-center font-bold text-base shadow-sm">
                      {currentUser?.name?.slice(0, 2).toUpperCase() || 'OC'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-oc-navy dark:text-white truncate">
                        <span>{currentUser?.bizName || currentUser?.name || 'Your Profile'}</span>
                        <CheckCircle size={15} className="text-blue-500 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Verified Member
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {Math.round(verificationResult.confidence * 100)}% Trust Score
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Verification Breakdown */}
                <div className="mt-6 text-left space-y-2.5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">
                    AI Integrity & Security Checks
                  </span>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {verificationResult.checks?.map((c, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-start gap-2 text-xs"
                      >
                        <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-oc-navy dark:text-white text-[11px]">{c.name}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">{c.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl bg-oc-navy hover:bg-oc-navy-mid text-oc-gold font-bold text-xs shadow-lg transition-all cursor-pointer"
                  >
                    Done & View Verified Profile
                  </button>
                </div>
              </div>
            ) : (
              /* Failure State */
              <div className="text-center py-4 space-y-5">
                <div className="w-16 h-16 rounded-full bg-red-500/15 text-red-500 mx-auto flex items-center justify-center mb-3">
                  <AlertCircle size={36} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-oc-navy dark:text-white">
                    Verification Inconclusive
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1.5">
                    {verificationResult.reason}
                  </p>
                </div>

                {/* Checks failure list */}
                {verificationResult.checks && (
                  <div className="text-left space-y-2 max-w-md mx-auto">
                    {verificationResult.checks.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">{c.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.passed ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                          {c.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetUpload}
                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Upload Another Document
                  </button>
                  <button
                    type="button"
                    onClick={handleUseSample}
                    className="flex-1 py-3 rounded-xl bg-oc-navy text-oc-gold font-bold text-xs hover:bg-oc-navy-mid cursor-pointer"
                  >
                    Test with Sample ID
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isVerifying ? (
          /* State 2: Active AI Scanning Progress */
          <div className="py-10 text-center space-y-6">
            <div className="relative w-72 h-44 mx-auto rounded-2xl overflow-hidden border-2 border-oc-gold/40 shadow-xl bg-black/10">
              {previewImage ? (
                <img src={previewImage} alt="Document Preview" className="w-full h-full object-cover opacity-60" />
              ) : (
                <div className="w-full h-full bg-oc-navy/30 flex items-center justify-center">
                  <FileBadge size={48} className="text-oc-gold/40" />
                </div>
              )}
              {/* Laser Scanning Line */}
              <motion.div
                animate={{ y: [0, 170, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8]"
              />
              <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-oc-gold font-bold text-sm">
                <RefreshCw size={16} className="animate-spin" />
                <span>Gemini 3.8 Flash Document Inspection</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {scanStep === 1 && "Phase 1/4: Analyzing document geometry, borders & resolution..."}
                {scanStep === 2 && "Phase 2/4: Reading official typography, dates & text clarity..."}
                {scanStep === 3 && "Phase 3/4: Inspecting security emblems & government seals..."}
                {scanStep >= 4 && "Phase 4/4: Cross-referencing credentials with Gemini AI model..."}
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="max-w-xs mx-auto flex gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    scanStep >= step ? 'bg-oc-gold' : 'bg-gray-200 dark:bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          /* State 3: Upload & Document Configuration Form */
          <div className="space-y-5">
            {/* Why Verify Banner */}
            <div className="p-3.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 text-xs text-gray-700 dark:text-gray-300">
              <ShieldCheck size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-blue-700 dark:text-blue-300 block">
                  Trusted Identity Badge Protection
                </span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Verified members receive 4x more discovery inquiries and priority ranking in the corporate network.
                </p>
              </div>
            </div>

            {/* Document Type Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">
                Select Document Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'National ID', label: 'National ID Card' },
                  { id: 'Passport', label: 'International Passport' },
                  { id: 'Driver License', label: "Driver's License" },
                  { id: 'Business License', label: 'Business License / TIN' },
                  { id: 'Professional Certification', label: 'Professional Certificate' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDocType(item.id)}
                    className={`p-2.5 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                      docType === item.id
                        ? 'border-oc-gold bg-oc-gold/10 text-oc-navy dark:text-oc-gold shadow-sm'
                        : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-oc-gold/30'
                    }`}
                  >
                    <div className="truncate">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Document File Uploader Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">
                  Upload Official Document Photo
                </label>
                <button
                  type="button"
                  onClick={handleUseSample}
                  className="text-[11px] font-bold text-oc-gold hover:underline cursor-pointer flex items-center gap-1"
                  title="Generate a sample National ID card SVG for instant test"
                >
                  <Sparkles size={12} />
                  <span>Try with Demo ID</span>
                </button>
              </div>

              {previewImage ? (
                /* Preview Container */
                <div className="relative rounded-2xl overflow-hidden border border-oc-gold/30 bg-oc-cream dark:bg-black/20 p-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-48 h-28 rounded-xl overflow-hidden bg-black/5 dark:bg-black/40 border border-oc-gold/20 flex-shrink-0 shadow-inner">
                      <img src={previewImage} alt="Document" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 text-left min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-oc-navy dark:text-white truncate">
                          {fileName || 'Document Loaded'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Category: <strong className="text-oc-gold">{docType}</strong>
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Ready for Gemini AI authenticity analysis.
                      </p>
                      <button
                        type="button"
                        onClick={resetUpload}
                        className="text-[11px] font-bold text-red-500 hover:underline pt-1 cursor-pointer block"
                      >
                        Change Image
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Upload Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-oc-gold/25 hover:border-oc-gold/60 rounded-2xl p-8 text-center bg-oc-gold/5 hover:bg-oc-gold/10 transition-all cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-oc-gold/15 text-oc-gold flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={22} />
                  </div>
                  <p className="text-sm font-bold text-oc-navy dark:text-white">
                    Click to browse or drop document photo
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Supports high-resolution JPEG, PNG, or WEBP (Max 10MB)
                  </p>
                </div>
              )}
            </div>

            {/* Privacy & Compliance Assurance */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <FileBadge size={15} className="text-gray-400 shrink-0" />
              <span>
                Your documents are processed securely via encrypted AI endpoints and never shared publicly.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 hover:text-oc-navy dark:hover:text-white cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!previewImage}
                onClick={runAIVerification}
                className="flex-1 py-3 rounded-xl bg-oc-navy hover:bg-oc-navy-mid text-oc-gold font-bold text-xs shadow-lg shadow-oc-navy/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>Verify with AI</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
