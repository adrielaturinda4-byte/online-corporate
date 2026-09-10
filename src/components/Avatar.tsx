import React, { useState, useMemo } from 'react';
import { User as UserIcon } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'rounded' | 'rounded-2xl';
  alt?: string;
}

export function Avatar({
  src,
  name,
  className = '',
  size = 'md',
  shape = 'circle',
  alt = ''
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Compute clean initials
  const initials = useMemo(() => {
    if (!name || typeof name !== 'string') return '';
    const clean = name.trim();
    if (!clean) return '';

    // If it's an email, strip domain or take first 2 chars
    if (clean.includes('@')) {
      const userPart = clean.split('@')[0].replace(/[._-]/g, ' ').trim();
      const parts = userPart.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return userPart.slice(0, 2).toUpperCase();
    }

    // If it has underscores or hyphens like community_feed
    const words = clean.replace(/[_-]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }, [name]);

  // Determine refined theme gradient based on string hash for visual consistency
  const colorScheme = useMemo(() => {
    const key = (name || src || 'user').toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const palettes = [
      'bg-oc-navy-mid text-oc-gold border border-oc-gold/25',
      'bg-slate-800 text-amber-300 border border-amber-500/20',
      'bg-stone-800 text-stone-200 border border-stone-600/30',
      'bg-zinc-900 text-oc-gold-light border border-oc-gold/30',
      'bg-neutral-800 text-amber-200 border border-amber-400/20',
    ];
    return palettes[Math.abs(hash) % palettes.length];
  }, [name, src]);

  // Size mapping
  const sizeClasses: Record<string, string> = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base font-bold',
    '2xl': 'w-24 h-24 text-xl font-bold font-serif'
  };

  const shapeClass = 
    shape === 'rounded' ? 'rounded-xl' : 
    shape === 'rounded-2xl' ? 'rounded-2xl' : 
    'rounded-full';

  const isInvalidUrl = !src || 
    typeof src !== 'string' || 
    src.trim() === '' || 
    src.includes('via.placeholder.com') ||
    src.includes('placeholder.com');

  const finalSizeClass = className.includes('w-') && className.includes('h-') 
    ? '' 
    : sizeClasses[size] || sizeClasses.md;

  if (isInvalidUrl || hasError) {
    return (
      <div 
        className={`shrink-0 flex items-center justify-center font-bold tracking-tight select-none shadow-sm transition-transform ${finalSizeClass} ${shapeClass} ${colorScheme} ${className}`}
        aria-label={name || 'Avatar'}
        title={name || undefined}
      >
        {initials ? (
          <span>{initials}</span>
        ) : (
          <UserIcon className="w-1/2 h-1/2 opacity-75" />
        )}
      </div>
    );
  }

  return (
    <div className={`shrink-0 relative overflow-hidden bg-oc-cream-dark dark:bg-oc-navy-mid ${finalSizeClass} ${shapeClass} ${className}`}>
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
export default Avatar;
