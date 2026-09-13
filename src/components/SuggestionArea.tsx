import React, { useState } from 'react';
import { 
  Lightbulb, 
  Send, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  Filter, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Trash2, 
  Search,
  Check,
  Shield,
  HelpCircle
} from 'lucide-react';
import { 
  User, 
  Suggestion, 
  SuggestionCategory, 
  SuggestionStatus, 
  SuggestionUrgency 
} from '../types';

interface SuggestionAreaProps {
  currentUser: User | null;
  users: Record<string, User>;
  suggestions: Suggestion[];
  onSubmitSuggestion: (data: {
    category: SuggestionCategory;
    subject: string;
    content: string;
    urgency?: SuggestionUrgency;
    targetAdminEmail?: string;
  }) => { success: boolean; targetAdmin: string; suggestion: Suggestion } | null;
  onUpdateSuggestionStatus: (id: string, status: SuggestionStatus, adminResponse?: string) => void;
  onDeleteSuggestion: (id: string) => void;
  onOpenChat: (adminEmail: string) => void;
  isAdmin: boolean;
}

const CATEGORIES: { id: SuggestionCategory; label: string; icon: string; desc: string }[] = [
  { 
    id: 'Feature Request', 
    label: 'Feature Request', 
    icon: '🚀', 
    desc: 'New tools, workflows, AI features, or integrations' 
  },
  { 
    id: 'Platform Improvement', 
    label: 'Platform Improvement', 
    icon: '⚡', 
    desc: 'Speed, UI/UX polish, usability, and design refinements' 
  },
  { 
    id: 'Corporate Tool', 
    label: 'Corporate Tool', 
    icon: '💼', 
    desc: 'Hiring pipelines, business registration, or verified badges' 
  },
  { 
    id: 'Bug Report', 
    label: 'Bug Report', 
    icon: '🐛', 
    desc: 'Report broken flows, glitching UI, or unexpected behavior' 
  },
  { 
    id: 'Policy & Compliance', 
    label: 'Policy & Compliance', 
    icon: '⚖️', 
    desc: 'Safety, privacy, verified standards, or community rules' 
  },
  { 
    id: 'General Feedback', 
    label: 'General Feedback', 
    icon: '💬', 
    desc: 'General thoughts, praise, or suggestions for leadership' 
  }
];

export const SuggestionArea: React.FC<SuggestionAreaProps> = ({
  currentUser,
  users,
  suggestions,
  onSubmitSuggestion,
  onUpdateSuggestionStatus,
  onDeleteSuggestion,
  onOpenChat,
  isAdmin
}) => {
  // Tabs: 'submit' | 'history' | 'admin'
  const [activeTab, setActiveTab] = useState<'submit' | 'history' | 'admin'>('submit');

  // Form states
  const [category, setCategory] = useState<SuggestionCategory>('Feature Request');
  const [urgency, setUrgency] = useState<SuggestionUrgency>('Normal');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedAdminEmail, setSelectedAdminEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastDispatched, setLastDispatched] = useState<{ targetAdmin: string; suggestion: Suggestion } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Filter & Search states for lists
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [adminReplyText, setAdminReplyText] = useState<Record<string, string>>({});
  const [adminReplyStatus, setAdminReplyStatus] = useState<Record<string, SuggestionStatus>>({});

  // Resolve available administrators
  const adminList = (Object.values(users) as User[]).filter(
    u => (Boolean(u.isAdmin) || (u.role as string) === 'Admin') && 
         u.email.trim().toLowerCase() !== currentUser?.email.trim().toLowerCase()
  );

  const defaultAdminEmail = adminList.length > 0 ? adminList[0].email : 'adrielaturinda4@gmail.com';
  const effectiveTargetAdminEmail = selectedAdminEmail || defaultAdminEmail;
  const targetAdminUser = users[effectiveTargetAdminEmail] || null;

  // Filter user's suggestions
  const mySuggestions = suggestions.filter(
    s => s.senderEmail.toLowerCase() === currentUser?.email.trim().toLowerCase()
  );

  // Admin suggestions with filters
  const filteredAdminSuggestions = suggestions.filter(s => {
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchesQuery = 
      s.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setSubmitError('Please sign in or select your profile before submitting a suggestion.');
      return;
    }
    if (!subject.trim()) {
      setSubmitError('Please enter a brief subject line for your suggestion.');
      return;
    }
    if (!content.trim() || content.trim().length < 15) {
      setSubmitError('Please provide a meaningful description (at least 15 characters).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = onSubmitSuggestion({
        category,
        subject: subject.trim(),
        content: content.trim(),
        urgency,
        targetAdminEmail: effectiveTargetAdminEmail
      });

      if (result && result.success) {
        setLastDispatched({
          targetAdmin: result.targetAdmin,
          suggestion: result.suggestion
        });
        setSubject('');
        setContent('');
        setUrgency('Normal');
      } else {
        setSubmitError('Failed to submit suggestion. Please check your connection and try again.');
      }
    } catch {
      setSubmitError('An unexpected error occurred while sending your suggestion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: SuggestionStatus) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1"><Clock size={12} /> Pending Review</span>;
      case 'Under Review':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1"><Search size={12} /> Under Review</span>;
      case 'Planned':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1"><Sparkles size={12} /> Planned for Release</span>;
      case 'Completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 size={12} /> Implemented</span>;
      case 'Declined':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20">Archived</span>;
      default:
        return null;
    }
  };

  const getUrgencyBadge = (urg: SuggestionUrgency) => {
    switch (urg) {
      case 'Urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1"><AlertTriangle size={10} /> Urgent</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">High Priority</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400">Normal</span>;
    }
  };

  return (
    <div id="suggestion-portal" className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-oc-navy via-slate-900 to-oc-navy text-white overflow-hidden shadow-2xl border border-oc-gold/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-oc-gold/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-oc-gold/20 border border-oc-gold/30 text-oc-gold text-xs font-semibold uppercase tracking-wider">
              <Sparkles size={13} />
              Direct Administrator Channel
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              Suggestion & Feedback Area
            </h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Have an idea to elevate Online Corporate, a feature request, or an issue to report?
              Your suggestion <strong className="text-oc-gold">directly dispatches a real-time message to the admin inbox</strong>, opening an active two-way conversation.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4 min-w-[240px]">
            <div className="w-12 h-12 rounded-xl bg-oc-gold/20 text-oc-gold flex items-center justify-center font-bold text-lg">
              <Lightbulb size={24} />
            </div>
            <div>
              <div className="text-xs text-gray-300">Target Admin Inbox</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                {targetAdminUser?.name || 'Online Corporate Administration'}
                <ShieldCheck size={14} className="text-oc-gold" />
              </div>
              <div className="text-[11px] text-green-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live Messaging Connected
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-2">
          <button
            id="tab-submit-suggestion"
            onClick={() => setActiveTab('submit')}
            className={`px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-oc-gold text-oc-navy font-bold shadow-md shadow-oc-gold/20'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            <Lightbulb size={16} />
            Submit Suggestion
          </button>

          <button
            id="tab-my-suggestions"
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-oc-gold text-oc-navy font-bold shadow-md shadow-oc-gold/20'
                : 'bg-white/5 hover:bg-white/10 text-gray-300'
            }`}
          >
            <Clock size={16} />
            My Suggestions
            {mySuggestions.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'history' ? 'bg-oc-navy text-oc-gold' : 'bg-white/20 text-white'
              }`}>
                {mySuggestions.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              id="tab-admin-suggestions"
              onClick={() => setActiveTab('admin')}
              className={`px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                  : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30'
              }`}
            >
              <Shield size={16} />
              Admin Moderation Center
              {suggestions.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-purple-700">
                  {suggestions.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* SUCCESS DISPATCH BANNER */}
      {lastDispatched && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-oc-navy dark:text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-scaleUp">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Check size={20} />
            </div>
            <div>
              <div className="font-bold text-sm">
                Suggestion Dispatched Directly to Admin!
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                A real-time direct chat message was sent to <strong className="text-oc-navy dark:text-oc-gold">{lastDispatched.targetAdmin}</strong>.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-open-chat-from-suggestion"
              onClick={() => onOpenChat(lastDispatched.targetAdmin)}
              className="w-full sm:w-auto px-4 py-2 bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy text-xs font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare size={15} />
              Open Live Chat With Admin
            </button>
            <button
              onClick={() => setLastDispatched(null)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: SUBMIT SUGGESTION */}
      {activeTab === 'submit' && (
        <div className="bg-white dark:bg-oc-navy p-6 sm:p-8 rounded-3xl border border-oc-gold/15 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-oc-navy dark:text-white">
                Submit a Direct Suggestion
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Select category and urgency below. This generates an official suggestion record and initiates an instant message thread.
              </p>
            </div>
          </div>

          {submitError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Category Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-3">
                1. Select Suggestion Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {CATEGORIES.map(cat => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-oc-gold bg-oc-gold/10 text-oc-navy dark:text-white shadow-sm ring-1 ring-oc-gold'
                          : 'border-gray-200 dark:border-white/10 hover:border-oc-gold/50 bg-gray-50/50 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span className="text-xl">{cat.icon}</span>
                        {isSelected && <Check size={15} className="text-oc-gold font-bold" />}
                      </div>
                      <div className="font-bold text-xs">{cat.label}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                        {cat.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Urgency & Target Admin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
                  2. Priority / Urgency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Normal', 'High', 'Urgent'] as SuggestionUrgency[]).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        urgency === u
                          ? u === 'Urgent'
                            ? 'bg-red-500 text-white border-red-500 shadow-sm'
                            : u === 'High'
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : 'bg-oc-gold text-oc-navy border-oc-gold shadow-sm'
                          : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
                  Recipient Admin
                </label>
                {adminList.length > 1 ? (
                  <select
                    value={effectiveTargetAdminEmail}
                    onChange={e => setSelectedAdminEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-oc-navy dark:text-white outline-none focus:ring-1 focus:ring-oc-gold"
                  >
                    {adminList.map(adm => (
                      <option key={adm.email} value={adm.email}>
                        {adm.name || adm.bizName || adm.email} (Admin)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-700 dark:text-gray-300">
                    <ShieldCheck size={16} className="text-oc-gold" />
                    <span>
                      {targetAdminUser?.name || 'Online Corporate Administration'} ({effectiveTargetAdminEmail})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Subject & Description */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    3. Subject / Suggestion Title
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {subject.length}/100
                  </span>
                </div>
                <input
                  id="suggestion-subject-input"
                  type="text"
                  required
                  maxLength={100}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Add WhatsApp interview reminder alerts for candidates"
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-oc-navy dark:text-white outline-none focus:ring-1 focus:ring-oc-gold"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                    4. Detailed Suggestion & Value
                  </label>
                  <span className="text-[11px] text-gray-400">
                    {content.length} characters
                  </span>
                </div>
                <textarea
                  id="suggestion-content-input"
                  required
                  rows={5}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Describe your suggestion thoroughly: What problem does it solve? How should it behave? How would this improve the experience for professionals or businesses on Online Corporate?"
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm text-oc-navy dark:text-white outline-none focus:ring-1 focus:ring-oc-gold resize-y leading-relaxed"
                />
              </div>
            </div>

            {/* User Info & Submit Action */}
            <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <HelpCircle size={14} className="text-oc-gold shrink-0" />
                <span>
                  Sending as: <strong className="text-oc-navy dark:text-white">{currentUser?.name || currentUser?.email || 'Anonymous'}</strong>
                </span>
              </div>

              <button
                id="btn-submit-suggestion"
                type="submit"
                disabled={isSubmitting || !subject.trim() || !content.trim()}
                className="w-full sm:w-auto px-7 py-3 bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold rounded-xl text-sm hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Sending to Admin...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Directly to Admin
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MY SUBMITTED SUGGESTIONS */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-oc-navy dark:text-white">
              My Submitted Suggestions ({mySuggestions.length})
            </h2>
            <button
              onClick={() => setActiveTab('submit')}
              className="text-xs text-oc-gold font-bold hover:underline flex items-center gap-1"
            >
              <Lightbulb size={14} /> Submit New
            </button>
          </div>

          {mySuggestions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-oc-navy rounded-3xl border border-oc-gold/10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-oc-gold/10 text-oc-gold flex items-center justify-center mx-auto">
                <Lightbulb size={32} />
              </div>
              <h3 className="font-serif font-bold text-base text-oc-navy dark:text-white">
                No Suggestions Submitted Yet
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Got thoughts on how to make Online Corporate better? Submit your first idea to message our admin team directly.
              </p>
              <button
                onClick={() => setActiveTab('submit')}
                className="px-6 py-2.5 bg-oc-gold text-oc-navy font-bold rounded-xl text-xs hover:scale-105 transition-all shadow"
              >
                Submit a Suggestion Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {mySuggestions.map(s => (
                <div
                  key={s.id}
                  className="bg-white dark:bg-oc-navy p-5 sm:p-6 rounded-2xl border border-oc-gold/10 shadow-sm space-y-4 hover:border-oc-gold/30 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-oc-cream dark:bg-white/5 text-oc-navy dark:text-oc-gold-light border border-oc-gold/10">
                        {s.category}
                      </span>
                      {getUrgencyBadge(s.urgency)}
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(s.status)}
                      <span className="text-[11px] text-gray-400">
                        {new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-oc-navy dark:text-white">
                      {s.subject}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-wrap">
                      {s.content}
                    </p>
                  </div>

                  {s.adminResponse && (
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
                      <div className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <ShieldCheck size={14} />
                        Administrator Response
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {s.adminResponse}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-gray-400 text-[11px]">
                      Targeted to Admin: <span className="font-semibold text-gray-600 dark:text-gray-300">{s.targetAdminEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenChat(s.targetAdminEmail)}
                        className="px-3.5 py-2 rounded-xl bg-oc-cream dark:bg-white/5 hover:bg-oc-gold/10 text-oc-navy dark:text-oc-gold border border-oc-gold/15 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <MessageSquare size={14} />
                        Chat with Admin
                      </button>
                      <button
                        onClick={() => onDeleteSuggestion(s.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                        title="Delete suggestion"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADMIN MODERATION CENTER (Only for Admins) */}
      {isAdmin && activeTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-oc-navy p-5 sm:p-6 rounded-2xl border border-purple-500/20 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-oc-navy dark:text-white flex items-center gap-2">
                <ShieldCheck size={20} className="text-purple-500" />
                All Platform Suggestions ({suggestions.length})
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Review member suggestions, update implementation status, or send direct chat replies back to members.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs">
                <Filter size={14} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent text-oc-navy dark:text-white outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Planned">Planned</option>
                  <option value="Completed">Completed</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>

              <div className="relative flex-1 md:w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-oc-navy dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {filteredAdminSuggestions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-oc-navy rounded-2xl border border-gray-200 dark:border-white/10">
              <p className="text-xs text-gray-500">No suggestions match the selected criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAdminSuggestions.map(s => {
                const currentReply = adminReplyText[s.id] || '';
                const selectedStatus = adminReplyStatus[s.id] || s.status;

                return (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-oc-navy p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm space-y-4 hover:border-purple-500/40 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-oc-gold/20 text-oc-gold font-bold flex items-center justify-center text-xs overflow-hidden shrink-0">
                          {s.senderPhoto ? (
                            <img src={s.senderPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            s.senderName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-oc-navy dark:text-white flex items-center gap-1.5">
                            {s.senderName}
                            <span className="px-2 py-0.2 rounded text-[10px] font-normal bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400">
                              {s.senderRole || 'Member'}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400">{s.senderEmail}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300">
                          {s.category}
                        </span>
                        {getUrgencyBadge(s.urgency)}
                        {getStatusBadge(s.status)}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-oc-navy dark:text-white">
                        {s.subject}
                      </h3>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 leading-relaxed whitespace-pre-wrap">
                        {s.content}
                      </p>
                    </div>

                    {s.adminResponse && (
                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                        <span className="font-bold text-purple-700 dark:text-purple-300">Current Response:</span>{' '}
                        <span className="text-gray-600 dark:text-gray-300">{s.adminResponse}</span>
                      </div>
                    )}

                    {/* Admin Action Bar */}
                    <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400">Update Status:</span>
                          <select
                            value={selectedStatus}
                            onChange={e => {
                              const newStatus = e.target.value as SuggestionStatus;
                              setAdminReplyStatus(prev => ({ ...prev, [s.id]: newStatus }));
                              onUpdateSuggestionStatus(s.id, newStatus);
                            }}
                            className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-oc-navy dark:text-white outline-none cursor-pointer"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Planned">Planned</option>
                            <option value="Completed">Completed</option>
                            <option value="Declined">Declined</option>
                          </select>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => onOpenChat(s.senderEmail)}
                            className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <MessageSquare size={13} />
                            Open Chat with Member
                          </button>
                          <button
                            onClick={() => onDeleteSuggestion(s.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Reply directly and notify */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type official admin reply (sends message directly to user's chat)..."
                          value={currentReply}
                          onChange={e => setAdminReplyText(prev => ({ ...prev, [s.id]: e.target.value }))}
                          className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs text-oc-navy dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <button
                          disabled={!currentReply.trim()}
                          onClick={() => {
                            if (!currentReply.trim()) return;
                            onUpdateSuggestionStatus(s.id, selectedStatus, currentReply.trim());
                            setAdminReplyText(prev => ({ ...prev, [s.id]: '' }));
                          }}
                          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Send size={13} />
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
