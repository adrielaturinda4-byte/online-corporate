import React, { useState } from 'react';
import { 
  Video, 
  ShoppingBag, 
  Sparkles, 
  Plus, 
  MessageSquare, 
  Calendar, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Tag, 
  CheckCircle2, 
  Eye, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  X,
  Flame,
  BadgePercent
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserAd, AdCategory } from '../types';
import { VideoPlayerEmbed } from './VideoPlayerEmbed';

interface UserAdsSectionProps {
  user: User;
  currentUser: User | null;
  onInquireInChat: (targetUser: User, ad: UserAd) => void;
  onBookCallForAd: (targetUser: User, ad: UserAd) => void;
  onOpenCreateAdModal?: () => void;
  onEditAd?: (ad: UserAd) => void;
  onDeleteAd?: (adId: string) => void;
  onToggleFeatureAd?: (adId: string) => void;
  isOwner?: boolean;
  compact?: boolean;
}

export const UserAdsSection: React.FC<UserAdsSectionProps> = ({
  user,
  currentUser,
  onInquireInChat,
  onBookCallForAd,
  onOpenCreateAdModal,
  onEditAd,
  onDeleteAd,
  onToggleFeatureAd,
  isOwner = false,
  compact = false
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'video' | 'goods' | 'service'>('all');
  const [activeImageIndexes, setActiveImageIndexes] = useState<Record<string, number>>({});
  const [lightboxMedia, setLightboxMedia] = useState<{ type: 'image' | 'video'; url: string; title: string } | null>(null);

  const ads = user.ads || [];
  const videoPitch = user.videoPitch;

  // Filtered ads
  const filteredAds = ads.filter(ad => {
    if (selectedFilter === 'all') return true;
    return ad.type === selectedFilter;
  });

  const videoAdsCount = ads.filter(a => a.type === 'video' || a.videoUrl).length + (videoPitch?.videoUrl ? 1 : 0);
  const goodsCount = ads.filter(a => a.type === 'goods').length;
  const serviceCount = ads.filter(a => a.type === 'service').length;

  const handleNextImage = (adId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndexes(prev => ({
      ...prev,
      [adId]: ((prev[adId] || 0) + 1) % totalImages
    }));
  };

  const handlePrevImage = (adId: string, totalImages: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndexes(prev => ({
      ...prev,
      [adId]: ((prev[adId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  return (
    <div className="space-y-6" id={`user-ads-section-${user.email.replace(/[^a-zA-Z0-9]/g, '_')}`}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-oc-gold/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-oc-gold/10 text-oc-gold">
              <ShoppingBag size={18} />
            </span>
            <h3 className="text-base sm:text-lg font-serif font-bold text-oc-navy dark:text-white flex items-center gap-2">
              <span>Video Pitch & Advertised Goods</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-oc-gold/10 text-oc-gold font-sans font-bold">
                {ads.length + (videoPitch?.videoUrl ? 1 : 0)}
              </span>
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isOwner
              ? 'Promote yourself, showcase personal video reels, or list goods and services for other corporate members.'
              : `Explore advertised goods, commercial products, and video pitches from ${user.bizName || user.name || 'this member'}.`}
          </p>
        </div>

        {isOwner && onOpenCreateAdModal && (
          <button
            onClick={onOpenCreateAdModal}
            className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-oc-gold to-amber-500 text-oc-navy shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
            id="btn-create-new-ad"
          >
            <Plus size={15} />
            <span>+ Post Ad / Video</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      {(ads.length > 0 || videoPitch?.videoUrl) && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedFilter === 'all'
                ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-sm'
                : 'bg-oc-cream dark:bg-white/5 text-gray-500 hover:text-oc-navy dark:hover:text-white border border-oc-gold/10'
            }`}
          >
            <span>All Items</span>
            <span className="text-[10px] opacity-75 font-mono">({ads.length + (videoPitch?.videoUrl ? 1 : 0)})</span>
          </button>

          <button
            onClick={() => setSelectedFilter('video')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedFilter === 'video'
                ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-sm'
                : 'bg-oc-cream dark:bg-white/5 text-gray-500 hover:text-oc-navy dark:hover:text-white border border-oc-gold/10'
            }`}
          >
            <Video size={13} className={selectedFilter === 'video' ? 'text-oc-gold dark:text-oc-navy' : 'text-oc-gold'} />
            <span>Video Ads & Pitches</span>
            <span className="text-[10px] opacity-75 font-mono">({videoAdsCount})</span>
          </button>

          <button
            onClick={() => setSelectedFilter('goods')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedFilter === 'goods'
                ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-sm'
                : 'bg-oc-cream dark:bg-white/5 text-gray-500 hover:text-oc-navy dark:hover:text-white border border-oc-gold/10'
            }`}
          >
            <ShoppingBag size={13} className={selectedFilter === 'goods' ? 'text-oc-gold dark:text-oc-navy' : 'text-oc-gold'} />
            <span>Goods & Products</span>
            <span className="text-[10px] opacity-75 font-mono">({goodsCount})</span>
          </button>

          <button
            onClick={() => setSelectedFilter('service')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedFilter === 'service'
                ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-sm'
                : 'bg-oc-cream dark:bg-white/5 text-gray-500 hover:text-oc-navy dark:hover:text-white border border-oc-gold/10'
            }`}
          >
            <Sparkles size={13} className={selectedFilter === 'service' ? 'text-oc-gold dark:text-oc-navy' : 'text-oc-gold'} />
            <span>Services & Offers</span>
            <span className="text-[10px] opacity-75 font-mono">({serviceCount})</span>
          </button>
        </div>
      )}

      {/* Featured Video Pitch Banner (if present on user object) */}
      {videoPitch?.videoUrl && (selectedFilter === 'all' || selectedFilter === 'video') && (
        <div className="bg-gradient-to-br from-oc-navy via-slate-900 to-oc-navy-mid text-white rounded-3xl p-5 sm:p-6 border border-oc-gold/30 shadow-xl overflow-hidden relative">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-1/2">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-oc-gold text-oc-navy flex items-center gap-1">
                  <Flame size={12} />
                  Featured Video Pitch
                </span>
                <span className="text-xs text-oc-gold/80 font-semibold">
                  {user.bizName || user.name}
                </span>
              </div>
              <h4 className="text-lg sm:text-xl font-serif font-bold text-white mb-2">
                {videoPitch.title || 'Personal Introduction & Corporate Pitch'}
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed mb-4 line-clamp-3">
                {videoPitch.description || 'Watch our introduction reel to learn about our corporate services, products, and available solutions.'}
              </p>

              <div className="flex flex-wrap gap-2">
                {!isOwner && currentUser && (
                  <button
                    onClick={() => {
                      const dummyAd: UserAd = {
                        id: 'pitch_ad',
                        userEmail: user.email,
                        title: videoPitch.title || 'Personal Introduction & Video Pitch',
                        category: 'Self Promotion',
                        description: videoPitch.description || '',
                        type: 'video',
                        videoUrl: videoPitch.videoUrl,
                        createdAt: Date.now()
                      };
                      onInquireInChat(user, dummyAd);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-oc-gold text-oc-navy hover:scale-105 transition-all shadow-md flex items-center gap-1.5"
                  >
                    <MessageSquare size={14} />
                    Inquire via Chat
                  </button>
                )}
                {!isOwner && currentUser && (
                  <button
                    onClick={() => {
                      const dummyAd: UserAd = {
                        id: 'pitch_ad',
                        userEmail: user.email,
                        title: videoPitch.title || 'Video Pitch Discovery Call',
                        category: 'Self Promotion',
                        description: videoPitch.description || '',
                        type: 'video',
                        createdAt: Date.now()
                      };
                      onBookCallForAd(user, dummyAd);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-all flex items-center gap-1.5"
                  >
                    <Calendar size={14} />
                    Book Discovery Call
                  </button>
                )}
              </div>
            </div>

            <div className="w-full md:w-1/2">
              <VideoPlayerEmbed
                videoUrl={videoPitch.videoUrl}
                thumbnail={videoPitch.thumbnail}
                title={videoPitch.title || 'Featured Pitch Video'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Ads List Grid */}
      {filteredAds.length > 0 ? (
        <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
          {filteredAds.map(ad => {
            const currentImgIdx = activeImageIndexes[ad.id] || 0;
            const hasMultipleImages = ad.images && ad.images.length > 1;
            const currentImage = ad.images?.[currentImgIdx];

            return (
              <div
                key={ad.id}
                className="bg-white dark:bg-white/5 rounded-2xl border border-oc-gold/15 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                id={`ad-card-${ad.id}`}
              >
                <div>
                  {/* Media Header (Video or Product Gallery) */}
                  {ad.type === 'video' || ad.videoUrl ? (
                    <div className="relative">
                      <VideoPlayerEmbed
                        videoUrl={ad.videoUrl}
                        thumbnail={ad.videoThumbnail || (ad.images?.[0])}
                        title={ad.title}
                        aspectRatio="aspect-video"
                      />
                    </div>
                  ) : ad.images && ad.images.length > 0 ? (
                    <div className="relative aspect-video bg-black/10 dark:bg-black/30 overflow-hidden group/img">
                      <img
                        src={currentImage}
                        alt={ad.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Multiple images controls */}
                      {hasMultipleImages && (
                        <>
                          <button
                            onClick={(e) => handlePrevImage(ad.id, ad.images!.length, e)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black"
                            aria-label="Previous photo"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            onClick={(e) => handleNextImage(ad.id, ad.images!.length, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black"
                            aria-label="Next photo"
                          >
                            <ChevronRight size={16} />
                          </button>
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-white text-[9px] font-mono font-bold">
                            {currentImgIdx + 1}/{ad.images.length}
                          </div>
                        </>
                      )}

                      {/* Expand Lightbox Button */}
                      <button
                        onClick={() => setLightboxMedia({ type: 'image', url: currentImage!, title: ad.title })}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black"
                        title="View Fullscreen"
                      >
                        <Maximize2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-[3/1] bg-gradient-to-r from-oc-cream via-oc-gold/10 to-oc-cream dark:from-white/5 dark:via-white/10 dark:to-white/5 flex items-center justify-center p-4 border-b border-oc-gold/10">
                      <div className="text-center">
                        <ShoppingBag size={24} className="text-oc-gold mx-auto mb-1" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">Featured Listing</span>
                      </div>
                    </div>
                  )}

                  {/* Ad Body Content */}
                  <div className="p-4 sm:p-5">
                    {/* Category & Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-oc-gold/10 text-oc-gold border border-oc-gold/20">
                          {ad.category}
                        </span>

                        {ad.featured && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            <Star size={9} fill="currentColor" /> Featured
                          </span>
                        )}

                        {ad.discountTag && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1">
                            <BadgePercent size={10} /> {ad.discountTag}
                          </span>
                        )}
                      </div>

                      {/* Owner controls */}
                      {isOwner && (
                        <div className="flex items-center gap-1">
                          {onToggleFeatureAd && (
                            <button
                              onClick={() => onToggleFeatureAd(ad.id)}
                              className={`p-1.5 rounded-lg text-xs transition-colors ${
                                ad.featured ? 'text-oc-gold hover:bg-oc-gold/10' : 'text-gray-400 hover:text-oc-gold hover:bg-gray-100 dark:hover:bg-white/5'
                              }`}
                              title={ad.featured ? 'Unfeature' : 'Feature at top'}
                            >
                              <Star size={14} fill={ad.featured ? 'currentColor' : 'none'} />
                            </button>
                          )}
                          {onEditAd && (
                            <button
                              onClick={() => onEditAd(ad)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-oc-navy dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                              title="Edit Ad"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                          {onDeleteAd && (
                            <button
                              onClick={() => onDeleteAd(ad.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Delete Ad"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-bold text-oc-navy dark:text-white line-clamp-1 mb-1">
                      {ad.title}
                    </h4>

                    {/* Price Tag if available */}
                    {ad.price && (
                      <div className="flex items-baseline gap-2 my-1.5">
                        <span className="text-base font-black text-oc-navy dark:text-oc-gold-light">
                          {ad.price}
                        </span>
                        {ad.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {ad.originalPrice}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 my-2">
                      {ad.description}
                    </p>

                    {/* Tags */}
                    {ad.tags && ad.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 my-2.5">
                        {ad.tags.map(t => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom CTA Action Button */}
                <div className="p-4 sm:p-5 pt-0 border-t border-oc-gold/10 mt-2">
                  <div className="flex items-center gap-2 pt-3">
                    {/* Primary Button */}
                    {ad.ctaType === 'link' && ad.ctaLink ? (
                      <a
                        href={ad.ctaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-oc-navy text-oc-gold dark:bg-white/10 dark:text-white hover:bg-oc-gold hover:text-oc-navy transition-all text-center flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink size={13} />
                        <span>{ad.ctaText || 'Visit Online Shop'}</span>
                      </a>
                    ) : ad.ctaType === 'call' ? (
                      <button
                        onClick={() => onBookCallForAd(user, ad)}
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-oc-gold to-amber-500 text-oc-navy shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Calendar size={13} />
                        <span>{ad.ctaText || 'Book Consultation'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onInquireInChat(user, ad)}
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy hover:scale-[1.02] active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare size={13} />
                        <span>{ad.ctaText || (ad.type === 'goods' ? 'Order via Chat' : 'Inquire in Chat')}</span>
                      </button>
                    )}

                    {/* Secondary Book Call Button if primary was Chat */}
                    {ad.ctaType === 'chat' && (
                      <button
                        onClick={() => onBookCallForAd(user, ad)}
                        className="p-2.5 rounded-xl text-xs font-bold bg-oc-cream dark:bg-white/5 text-oc-navy dark:text-white hover:bg-oc-gold/20 border border-oc-gold/20 transition-all"
                        title="Book Call"
                      >
                        <Calendar size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-10 px-6 rounded-3xl bg-oc-cream/30 dark:bg-white/5 border border-dashed border-oc-gold/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-oc-gold/10 text-oc-gold flex items-center justify-center mx-auto">
            <ShoppingBag size={22} />
          </div>
          <h4 className="text-sm font-bold text-oc-navy dark:text-white">
            {isOwner ? 'No Advertisements or Video Pitches Posted Yet' : 'No Items Advertised Yet'}
          </h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            {isOwner
              ? 'Stand out to clients and business partners! Upload a video elevator pitch, showcase your goods for sale, or advertise special corporate offers.'
              : `${user.bizName || user.name || 'This member'} has not posted any active advertisements or video pitches at the moment.`}
          </p>

          {isOwner && onOpenCreateAdModal && (
            <button
              onClick={onOpenCreateAdModal}
              className="mt-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-oc-gold to-amber-500 text-oc-navy shadow-md hover:scale-105 transition-all"
            >
              + Create First Ad / Video Pitch
            </button>
          )}
        </div>
      )}

      {/* Lightbox / Media Viewer Modal */}
      <AnimatePresence>
        {lightboxMedia && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setLightboxMedia(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl z-10"
            >
              <button
                onClick={() => setLightboxMedia(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-all z-20"
              >
                <X size={20} />
              </button>
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title}
                className="max-h-[80vh] w-auto object-contain rounded-2xl"
              />
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                <h4 className="text-sm font-bold">{lightboxMedia.title}</h4>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
