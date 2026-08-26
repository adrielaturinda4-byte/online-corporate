import React, { useState } from 'react';
import { 
  X, 
  Video, 
  ShoppingBag, 
  Sparkles, 
  Upload, 
  Link as LinkIcon, 
  DollarSign, 
  Tag, 
  Check, 
  MessageSquare, 
  Calendar, 
  ExternalLink,
  Trash2,
  Plus,
  Play
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserAd, AdCategory } from '../types';
import { VideoPlayerEmbed, parseVideoUrl } from './VideoPlayerEmbed';

interface AdCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (ad: Omit<UserAd, 'id' | 'createdAt' | 'userEmail'>) => void;
  onSaveAd?: (ad: Omit<UserAd, 'id' | 'createdAt' | 'userEmail'>) => void;
  editingAd?: UserAd | null;
  initialAd?: UserAd | null;
  userEmail?: string;
}

export const AdCreationModal: React.FC<AdCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAd,
  editingAd,
  initialAd,
  userEmail: _userEmail
}) => {
  const activeAd = editingAd || initialAd || null;
  const [type, setType] = useState<'video' | 'goods' | 'service'>(activeAd?.type || 'goods');
  const [title, setTitle] = useState(activeAd?.title || '');
  const [category, setCategory] = useState<AdCategory>(activeAd?.category || 'Goods & Products');
  const [description, setDescription] = useState(activeAd?.description || '');
  const [videoUrl, setVideoUrl] = useState(activeAd?.videoUrl || '');
  const [videoThumbnail, setVideoThumbnail] = useState(activeAd?.videoThumbnail || '');
  const [images, setImages] = useState<string[]>(activeAd?.images || []);
  const [price, setPrice] = useState(activeAd?.price || '');
  const [originalPrice, setOriginalPrice] = useState(activeAd?.originalPrice || '');
  const [discountTag, setDiscountTag] = useState(activeAd?.discountTag || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(activeAd?.tags || []);
  const [ctaType, setCtaType] = useState<'chat' | 'link' | 'call'>(activeAd?.ctaType || 'chat');
  const [ctaLink, setCtaLink] = useState(activeAd?.ctaLink || '');
  const [ctaText, setCtaText] = useState(activeAd?.ctaText || 'Order / Inquire via Chat');
  const [featured, setFeatured] = useState<boolean>(activeAd?.featured || false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state whenever activeAd or isOpen changes
  React.useEffect(() => {
    if (isOpen) {
      setType(activeAd?.type || 'goods');
      setTitle(activeAd?.title || '');
      setCategory(activeAd?.category || 'Goods & Products');
      setDescription(activeAd?.description || '');
      setVideoUrl(activeAd?.videoUrl || '');
      setVideoThumbnail(activeAd?.videoThumbnail || '');
      setImages(activeAd?.images || []);
      setPrice(activeAd?.price || '');
      setOriginalPrice(activeAd?.originalPrice || '');
      setDiscountTag(activeAd?.discountTag || '');
      setTags(activeAd?.tags || []);
      setCtaType(activeAd?.ctaType || 'chat');
      setCtaLink(activeAd?.ctaLink || '');
      setCtaText(activeAd?.ctaText || 'Order / Inquire via Chat');
      setFeatured(activeAd?.featured || false);
      setErrorMsg('');
    }
  }, [isOpen, activeAd]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [...prev, reader.result as string].slice(0, 6));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (recommend < 30MB for browser memory)
    if (file.size > 35 * 1024 * 1024) {
      setErrorMsg('Video file is too large. Please use YouTube/Vimeo link or a file under 35MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setVideoUrl(reader.result);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tToRemove: string) => {
    setTags(tags.filter(t => t !== tToRemove));
  };

  const applyPreset = (preset: 'self' | 'goods' | 'service' | 'deal') => {
    if (preset === 'self') {
      setType('video');
      setCategory('Self Promotion');
      setTitle('Personal Video Pitch & Professional Bio');
      setDescription('Welcome! Here is a 60-second video overview of my corporate expertise, key achievements, and current client availability.');
      setVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      setCtaType('call');
      setCtaText('Book Discovery Call');
      setTags(['Corporate Bio', 'Available for Hire', 'Verified Expertise']);
    } else if (preset === 'goods') {
      setType('goods');
      setCategory('Goods & Products');
      setTitle('Premium Commercial Merchandise');
      setDescription('High quality goods available for wholesale and retail. In-stock with same-day dispatch and quality guarantee.');
      setPrice('UGX 180,000');
      setOriginalPrice('UGX 240,000');
      setDiscountTag('25% OFF');
      setCtaType('chat');
      setCtaText('Order via Chat');
      setTags(['In Stock', 'Nationwide Delivery', 'Warranty Included']);
    } else if (preset === 'service') {
      setType('service');
      setCategory('Professional Service');
      setTitle('Enterprise Consulting & Advisory Package');
      setDescription('Comprehensive consultation sessions designed to audit, optimize, and scale your business operations.');
      setPrice('UGX 500,000 / Session');
      setCtaType('call');
      setCtaText('Schedule Strategy Session');
      setTags(['Corporate Advisory', 'Scalable Solutions', '1-on-1 Consultation']);
    } else if (preset === 'deal') {
      setType('goods');
      setCategory('Special Offer');
      setTitle('Flash Promotion: Limited Time Deal');
      setDescription('Special promotional discount on select items while supplies last. Contact us directly to claim this limited offer.');
      setPrice('UGX 75,000');
      setOriginalPrice('UGX 120,000');
      setDiscountTag('Special Discount');
      setCtaType('chat');
      setCtaText('Claim Offer Now');
      setTags(['Limited Stock', 'Flash Deal', 'Free Delivery']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter an ad or video title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a description for your advertisement.');
      return;
    }
    if (type === 'video' && !videoUrl.trim()) {
      setErrorMsg('Please provide a video link (YouTube, Vimeo, Loom) or upload a video clip.');
      return;
    }

    const saveHandler = onSave || onSaveAd;
    if (saveHandler) {
      saveHandler({
        title: title.trim(),
        category,
        description: description.trim(),
        type,
        videoUrl: videoUrl.trim() || undefined,
        videoThumbnail: videoThumbnail.trim() || undefined,
        images: images.length > 0 ? images : undefined,
        price: price.trim() || undefined,
        originalPrice: originalPrice.trim() || undefined,
        discountTag: discountTag.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        ctaType,
        ctaLink: ctaLink.trim() || undefined,
        ctaText: ctaText.trim() || (ctaType === 'chat' ? 'Order / Inquire via Chat' : ctaType === 'call' ? 'Book Call' : 'Visit Link'),
        featured,
        views: activeAd?.views || 0
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose} 
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-oc-navy rounded-3xl shadow-2xl border border-oc-gold/20 p-6 sm:p-8"
        id="ad-creation-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-oc-gold/10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-oc-gold">
              Promotion & Marketplace Showcase
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-oc-navy dark:text-white mt-0.5">
              {editingAd ? 'Edit Advertisement / Video Pitch' : 'Create New Ad or Video Showcase'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-oc-navy dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Presets */}
        {!editingAd && (
          <div className="mt-4 p-3 bg-oc-cream/50 dark:bg-white/5 rounded-2xl border border-oc-gold/10">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-oc-gold" />
              Quick Templates
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('goods')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/10 text-oc-navy dark:text-white hover:border-oc-gold border border-transparent transition-all shadow-sm flex items-center gap-1.5"
              >
                <ShoppingBag size={13} className="text-oc-gold" />
                Sell Goods / Products
              </button>
              <button
                type="button"
                onClick={() => applyPreset('self')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/10 text-oc-navy dark:text-white hover:border-oc-gold border border-transparent transition-all shadow-sm flex items-center gap-1.5"
              >
                <Video size={13} className="text-oc-gold" />
                Personal Video Pitch
              </button>
              <button
                type="button"
                onClick={() => applyPreset('service')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/10 text-oc-navy dark:text-white hover:border-oc-gold border border-transparent transition-all shadow-sm flex items-center gap-1.5"
              >
                <Tag size={13} className="text-oc-gold" />
                Service Package
              </button>
              <button
                type="button"
                onClick={() => applyPreset('deal')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-white/10 text-oc-navy dark:text-white hover:border-oc-gold border border-transparent transition-all shadow-sm flex items-center gap-1.5"
              >
                <DollarSign size={13} className="text-amber-500" />
                Special Flash Deal
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Ad Type Selector */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-oc-gold block mb-2">
              Advertisement Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('goods');
                  if (category === 'Self Promotion') setCategory('Goods & Products');
                }}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  type === 'goods'
                    ? 'bg-oc-gold/15 border-oc-gold text-oc-navy dark:text-white shadow-sm font-bold'
                    : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-oc-gold/40'
                }`}
              >
                <ShoppingBag size={20} className={type === 'goods' ? 'text-oc-gold' : 'text-gray-400'} />
                <span className="text-xs">Goods & Products</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('video');
                  setCategory('Self Promotion');
                }}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  type === 'video'
                    ? 'bg-oc-gold/15 border-oc-gold text-oc-navy dark:text-white shadow-sm font-bold'
                    : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-oc-gold/40'
                }`}
              >
                <Video size={20} className={type === 'video' ? 'text-oc-gold' : 'text-gray-400'} />
                <span className="text-xs">Video Pitch / Reel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('service');
                  if (category === 'Self Promotion') setCategory('Professional Service');
                }}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  type === 'service'
                    ? 'bg-oc-gold/15 border-oc-gold text-oc-navy dark:text-white shadow-sm font-bold'
                    : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-oc-gold/40'
                }`}
              >
                <Sparkles size={20} className={type === 'service' ? 'text-oc-gold' : 'text-gray-400'} />
                <span className="text-xs">Service / Offer</span>
              </button>
            </div>
          </div>

          {/* Title & Category */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-oc-gold block mb-1">
                Ad Headline / Product Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={type === 'video' ? 'e.g. Creative Director 60-Sec Intro Pitch' : 'e.g. Handcrafted Leather Office Bags'}
                className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-1 focus:ring-oc-gold dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-oc-gold block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as AdCategory)}
                className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-1 focus:ring-oc-gold dark:text-white"
              >
                <option value="Goods & Products">Goods & Products</option>
                <option value="Self Promotion">Self Promotion / Bio Pitch</option>
                <option value="Professional Service">Professional Service</option>
                <option value="Special Offer">Special Offer / Promotion</option>
                <option value="Portfolio Video">Portfolio Video Demo</option>
              </select>
            </div>
          </div>

          {/* Video URL or Upload Section (for Video Pitch or Optional Media) */}
          {(type === 'video' || type === 'service' || type === 'goods') && (
            <div className="p-4 bg-oc-cream/40 dark:bg-white/5 rounded-2xl border border-oc-gold/15 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold tracking-wider text-oc-gold flex items-center gap-1.5">
                  <Video size={14} />
                  Video Showcase / Pitch Reel {type === 'video' && '*'}
                </label>
                <span className="text-[10px] text-gray-400">YouTube, Vimeo, Loom, or MP4</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <LinkIcon size={14} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or Loom URL"
                    className="w-full bg-white dark:bg-black/20 border border-oc-gold/15 rounded-xl pl-9 pr-4 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-oc-gold dark:text-white"
                  />
                </div>
                
                <label className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-white/10 text-oc-navy dark:text-white border border-dashed border-oc-gold/30 hover:border-oc-gold cursor-pointer flex items-center justify-center gap-1.5 transition-all">
                  <Upload size={14} className="text-oc-gold" />
                  <span>Upload Video Clip</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Video Preview if URL provided */}
              {videoUrl && (
                <div className="mt-3 max-w-sm mx-auto">
                  <div className="text-[9px] uppercase font-bold text-gray-400 mb-1">Preview Player</div>
                  <VideoPlayerEmbed videoUrl={videoUrl} title={title || 'Video Preview'} />
                </div>
              )}
            </div>
          )}

          {/* Product Images (For Goods and Services) */}
          {type !== 'video' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-oc-gold flex items-center gap-1.5">
                  <Upload size={14} />
                  Item Photos / Product Gallery
                </label>
                <span className="text-[10px] text-gray-400">Up to 6 high-res photos</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-oc-gold/20 bg-black/10">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {images.length < 6 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-oc-gold/30 hover:border-oc-gold bg-oc-cream/30 dark:bg-white/5 flex flex-col items-center justify-center text-gray-400 hover:text-oc-gold cursor-pointer transition-all">
                    <Plus size={20} />
                    <span className="text-[9px] font-bold mt-1">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Pricing & Discounts (Mainly for Goods & Services) */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-oc-gold block mb-1">
                Price / Rate
              </label>
              <input
                type="text"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="e.g. UGX 150,000"
                className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-1 focus:ring-oc-gold dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
                Original Price (Optional)
              </label>
              <input
                type="text"
                value={originalPrice}
                onChange={e => setOriginalPrice(e.target.value)}
                placeholder="e.g. UGX 200,000"
                className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-1 focus:ring-oc-gold dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
                Discount / Highlight Badge
              </label>
              <input
                type="text"
                value={discountTag}
                onChange={e => setDiscountTag(e.target.value)}
                placeholder="e.g. 25% OFF / In Stock"
                className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-1 focus:ring-oc-gold dark:text-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-oc-gold block mb-1">
              Description & Value Proposition *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the advertised product, key benefits, features, materials, or what makes your professional pitch unique..."
              className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-oc-gold resize-none dark:text-white"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-oc-gold block mb-1">
              Key Selling Points / Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="e.g. Same-day Delivery, Certified, Warranty"
                className="flex-1 bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-oc-gold dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-oc-navy text-oc-gold dark:bg-white/10 dark:text-white rounded-xl text-xs font-bold hover:bg-oc-gold hover:text-oc-navy transition-all"
              >
                + Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-oc-gold/10 text-oc-gold border border-oc-gold/20"
                >
                  #{t}
                  <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-red-400 ml-1">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Call to Action Customization */}
          <div className="p-4 bg-oc-cream/40 dark:bg-white/5 rounded-2xl border border-oc-gold/15 space-y-3">
            <label className="text-[10px] uppercase font-bold tracking-wider text-oc-gold block">
              Call-To-Action (When Viewers Click Your Ad)
            </label>

            <div className="grid sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCtaType('chat');
                  setCtaText('Order / Inquire via Chat');
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  ctaType === 'chat'
                    ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy border-oc-gold'
                    : 'bg-white dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10'
                }`}
              >
                <MessageSquare size={14} />
                <span>Chat Inquiry</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCtaType('call');
                  setCtaText('Book Discovery Call');
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  ctaType === 'call'
                    ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy border-oc-gold'
                    : 'bg-white dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10'
                }`}
              >
                <Calendar size={14} />
                <span>Book Call</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCtaType('link');
                  setCtaText('Visit Online Store');
                }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  ctaType === 'link'
                    ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy border-oc-gold'
                    : 'bg-white dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10'
                }`}
              >
                <ExternalLink size={14} />
                <span>External Link</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Button Text</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={e => setCtaText(e.target.value)}
                  placeholder="e.g. Order via Chat"
                  className="w-full bg-white dark:bg-black/20 border border-oc-gold/15 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-oc-gold dark:text-white"
                />
              </div>

              {ctaType === 'link' && (
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Destination URL</label>
                  <input
                    type="url"
                    value={ctaLink}
                    onChange={e => setCtaLink(e.target.value)}
                    placeholder="https://myshop.com/product"
                    className="w-full bg-white dark:bg-black/20 border border-oc-gold/15 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-oc-gold dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Feature Pin */}
          <div className="flex items-center justify-between p-3 bg-oc-gold/5 rounded-xl border border-oc-gold/20">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-oc-gold" />
              <div>
                <div className="text-xs font-bold text-oc-navy dark:text-white">Feature at Top of Profile</div>
                <div className="text-[10px] text-gray-500">Highlight this advertisement when viewers open your account card.</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={featured}
              onChange={e => setFeatured(e.target.checked)}
              className="w-5 h-5 accent-oc-gold cursor-pointer"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-oc-gold/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:text-oc-navy dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-oc-gold to-amber-500 text-oc-navy shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Check size={16} />
              <span>{editingAd ? 'Save Ad Updates' : 'Publish Advertisement'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
