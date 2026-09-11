import React from 'react';
import { CheckCircle, ShieldCheck, Sparkles } from 'lucide-react';

interface VerifiedBadgeProps {
  variant?: 'icon' | 'pill' | 'banner' | 'card';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
  onClick?: () => void;
  documentType?: string;
  confidence?: number;
  confidenceScore?: number;
  verifiedAt?: string;
}

export function VerifiedBadge({
  variant = 'icon',
  size = 'sm',
  className = '',
  showTooltip = true,
  onClick,
  documentType,
  confidence,
  confidenceScore,
  verifiedAt
}: VerifiedBadgeProps) {
  const finalConfidence = confidence ?? confidenceScore;
  const tooltipText = finalConfidence 
    ? `AI Verified Identity (${Math.round(finalConfidence * 100)}% confidence)${documentType ? ` • ${documentType}` : ''}`
    : 'Identity & Document Verified by Gemini AI';

  if (variant === 'icon') {
    const iconSizes = {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20
    };
    return (
      <span 
        title={showTooltip ? tooltipText : undefined}
        onClick={onClick}
        className={`inline-flex items-center text-blue-500 hover:text-blue-600 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <CheckCircle 
          size={iconSizes[size]} 
          className="fill-blue-500/15 text-blue-500 shrink-0" 
        />
      </span>
    );
  }

  if (variant === 'pill') {
    return (
      <span 
        title={showTooltip ? tooltipText : undefined}
        onClick={onClick}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs ${onClick ? 'cursor-pointer hover:bg-blue-500/15' : ''} ${className}`}
      >
        <CheckCircle size={11} className="text-blue-500 shrink-0" />
        <span>Verified Member</span>
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div 
        onClick={onClick}
        className={`flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-oc-gold/10 to-blue-500/5 border border-blue-500/20 text-xs ${onClick ? 'cursor-pointer hover:border-blue-500/30' : ''} ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-oc-navy dark:text-white">
              <span>Verified Corporate Member</span>
              <CheckCircle size={13} className="text-blue-500" />
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {documentType ? `Verified via ${documentType}` : 'Official National Document Authenticated with Gemini AI'}
              {verifiedAt && ` • ${new Date(verifiedAt).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        {finalConfidence && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold">
            {Math.round(finalConfidence * 100)}% Trust
          </span>
        )}
      </div>
    );
  }

  // Card variant
  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-2xl bg-white dark:bg-oc-navy border border-blue-500/25 shadow-sm relative overflow-hidden ${onClick ? 'cursor-pointer hover:border-blue-500/40' : ''} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
          <ShieldCheck size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-sm text-oc-navy dark:text-white">
            <span>Verified Identity Badge</span>
            <Sparkles size={14} className="text-oc-gold" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Your profile displays the official verified badge across search, messaging, and listings.
          </p>
          <div className="mt-2 text-[11px] font-medium text-blue-600 dark:text-blue-400 flex flex-wrap items-center gap-3">
            {documentType && (
              <span className="flex items-center gap-1">
                <CheckCircle size={12} />
                <span>Document on file: {documentType}</span>
              </span>
            )}
            {verifiedAt && (
              <span className="text-gray-400">
                Verified on {new Date(verifiedAt).toLocaleDateString()}
              </span>
            )}
            {finalConfidence && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10">
                {Math.round(finalConfidence * 100)}% Trust Score
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
