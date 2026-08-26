import React, { useState } from 'react';
import { Play, Maximize2, ExternalLink, Video as VideoIcon } from 'lucide-react';

interface VideoPlayerEmbedProps {
  videoUrl?: string;
  thumbnail?: string;
  title?: string;
  aspectRatio?: string;
  className?: string;
  autoPlayOnClick?: boolean;
}

export function parseVideoUrl(url?: string): { type: 'youtube' | 'vimeo' | 'loom' | 'direct' | 'invalid'; embedUrl?: string; videoId?: string } {
  if (!url) return { type: 'invalid' };
  const trimmed = url.trim();

  // Direct video file or base64 data
  if (trimmed.startsWith('data:video') || trimmed.startsWith('blob:') || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) {
    return { type: 'direct', embedUrl: trimmed };
  }

  // YouTube formats
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      videoId: ytMatch[1],
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`
    };
  }

  // Vimeo formats
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'vimeo',
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`
    };
  }

  // Loom formats
  const loomMatch = trimmed.match(/(?:loom\.com\/share\/)([a-zA-Z0-9]+)/i);
  if (loomMatch && loomMatch[1]) {
    return {
      type: 'loom',
      videoId: loomMatch[1],
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}?autoplay=1`
    };
  }

  // Default fallback if it looks like a web link
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return { type: 'direct', embedUrl: trimmed };
  }

  return { type: 'invalid' };
}

export const VideoPlayerEmbed: React.FC<VideoPlayerEmbedProps> = ({
  videoUrl,
  thumbnail,
  title,
  aspectRatio = 'aspect-video',
  className = '',
  autoPlayOnClick = true
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const parsed = parseVideoUrl(videoUrl);

  if (!videoUrl || parsed.type === 'invalid') {
    return (
      <div className={`w-full ${aspectRatio} rounded-2xl bg-oc-navy/10 dark:bg-white/5 flex flex-col items-center justify-center text-gray-400 p-4 border border-dashed border-oc-gold/20 ${className}`}>
        <VideoIcon size={32} className="text-oc-gold/40 mb-2" />
        <span className="text-xs font-semibold">No valid video source provided</span>
      </div>
    );
  }

  if (isPlaying) {
    if (parsed.type === 'direct') {
      return (
        <div className={`relative w-full ${aspectRatio} rounded-2xl overflow-hidden bg-black shadow-lg border border-oc-gold/20 ${className}`}>
          <video
            src={parsed.embedUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    return (
      <div className={`relative w-full ${aspectRatio} rounded-2xl overflow-hidden bg-black shadow-lg border border-oc-gold/20 ${className}`}>
        <iframe
          src={parsed.embedUrl}
          title={title || 'Video Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  // Cover / Poster Preview State
  const defaultPoster = thumbnail || (parsed.videoId && parsed.type === 'youtube'
    ? `https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg`
    : undefined);

  return (
    <div
      onClick={() => {
        if (autoPlayOnClick) setIsPlaying(true);
      }}
      className={`group relative w-full ${aspectRatio} rounded-2xl overflow-hidden bg-oc-navy border border-oc-gold/20 cursor-pointer shadow-md transition-all hover:border-oc-gold/60 ${className}`}
      id={`video-preview-${title ? title.replace(/\s+/g, '-').toLowerCase() : 'clip'}`}
    >
      {defaultPoster ? (
        <img
          src={defaultPoster}
          alt={title || 'Video thumbnail'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-oc-navy-mid via-oc-navy to-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-oc-gold/10 border border-oc-gold/30 flex items-center justify-center text-oc-gold mb-2">
            <VideoIcon size={28} />
          </div>
          {title && <h4 className="text-xs font-bold text-white max-w-[80%] truncate">{title}</h4>}
        </div>
      )}

      {/* Backdrop overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity group-hover:from-black/90" />

      {/* Center Play Button */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-oc-gold text-oc-navy shadow-2xl flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-oc-gold/40">
          <Play size={24} className="ml-1 fill-oc-navy" />
        </div>
      </div>

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-oc-gold border border-oc-gold/20">
          {parsed.type === 'youtube' ? 'YouTube HD' : parsed.type === 'vimeo' ? 'Vimeo' : 'Video Reel'}
        </span>
        <span className="px-2 py-1 rounded-md text-[9px] font-bold bg-oc-navy/80 text-white backdrop-blur-sm border border-white/10 flex items-center gap-1">
          <Maximize2 size={10} /> Watch
        </span>
      </div>

      {/* Bottom Title Bar */}
      {title && (
        <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
          <p className="text-xs font-bold text-white line-clamp-1 drop-shadow-md">
            {title}
          </p>
        </div>
      )}
    </div>
  );
};
