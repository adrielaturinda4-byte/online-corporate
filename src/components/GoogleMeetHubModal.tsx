import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Calendar, 
  Clock, 
  Users, 
  Sparkles, 
  Send, 
  ShieldCheck, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { createGoogleMeetSpace, MeetSpaceResponse } from '../googleMeet';
import { User, Appointment, JobApplication, ProfessionalEvent } from '../types';

interface GoogleMeetHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: Record<string, User>;
  appointments: Appointment[];
  applications: JobApplication[];
  events: ProfessionalEvent[];
  onSendMessage: (toEmail: string, text: string) => void;
  onOpenChat: (email: string) => void;
}

export const GoogleMeetHubModal: React.FC<GoogleMeetHubModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  appointments,
  applications,
  events,
  onSendMessage,
  onOpenChat,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'upcoming'>('create');
  const [meetingTopic, setMeetingTopic] = useState('Online Corporate Video Conference');
  const [isCreating, setIsCreating] = useState(false);
  const [createdMeet, setCreatedMeet] = useState<MeetSpaceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [shareRecipient, setShareRecipient] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showConfirmationStep, setShowConfirmationStep] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, isCode: boolean) => {
    navigator.clipboard.writeText(text);
    if (isCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleStartCreate = () => {
    setError(null);
    setShowConfirmationStep(true);
  };

  const handleConfirmCreateSpace = async () => {
    setShowConfirmationStep(false);
    setIsCreating(true);
    setError(null);
    try {
      const space = await createGoogleMeetSpace();
      setCreatedMeet(space);
    } catch (err: any) {
      setError(err?.message || 'Failed to create Google Meet room.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleShareToChat = (recipientEmail: string) => {
    if (!createdMeet || !recipientEmail) return;
    const shareText = `📹 [Google Meet Invitation: ${meetingTopic}]\nJoin Video Call: ${createdMeet.meetingUri}\nMeeting Code: ${createdMeet.meetingCode}\nHost: ${currentUser.bizName || currentUser.name || currentUser.email}`;
    onSendMessage(recipientEmail, shareText);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  // Collect all upcoming Google Meet sessions
  const myMeetAppointments = appointments.filter(
    a => (a.hostEmail === currentUser.email || a.bookerEmail === currentUser.email) && 
         a.status === 'Scheduled' && 
         Boolean(a.meetUri)
  );

  const myMeetInterviews = applications.filter(
    a => (a.candidateEmail === currentUser.email || a.employerEmail === currentUser.email) &&
         a.status === 'Interviewing' &&
         Boolean(a.meetUri)
  );

  const myMeetEvents = events.filter(
    e => (e.hostEmail === currentUser.email || e.attendees.includes(currentUser.email)) &&
         Boolean(e.meetUri)
  );

  const totalUpcomingMeets = myMeetAppointments.length + myMeetInterviews.length + myMeetEvents.length;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-black/70 backdrop-blur-md" 
        onClick={onClose} 
      />

      <motion.div 
        initial={{ scale: 0.92, opacity: 0, y: 15 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="relative w-full max-w-2xl bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/20 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-oc-gold/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Video size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                  Google Meet Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  Live Integration
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Launch instant video meetings, schedule interviews &amp; join calls
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-oc-cream/60 dark:bg-white/5 p-1 rounded-xl mb-6 border border-oc-gold/10">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'create'
                ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-sm'
                : 'text-gray-500 hover:text-oc-navy dark:hover:text-white'
            }`}
          >
            <Plus size={15} />
            <span>Instant Video Room</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'upcoming'
                ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-sm'
                : 'text-gray-500 hover:text-oc-navy dark:hover:text-white'
            }`}
          >
            <Calendar size={15} />
            <span>Scheduled Meet Sessions</span>
            {totalUpcomingMeets > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-oc-gold text-oc-navy text-[10px] font-black">
                {totalUpcomingMeets}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: CREATE / GENERATE INSTANT MEET */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {!createdMeet ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-widest text-oc-gold mb-2">
                    Meeting Topic / Description
                  </label>
                  <input
                    type="text"
                    value={meetingTopic}
                    onChange={(e) => setMeetingTopic(e.target.value)}
                    placeholder="e.g. Discovery Call, Project Review, Interview"
                    className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl p-3.5 text-xs outline-none focus:ring-2 focus:ring-oc-gold text-oc-navy dark:text-white"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                    <ShieldCheck size={16} />
                    <span>Official Google Workspace Meet Integration</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                    Creates a dedicated Google Meet room linked to your authenticated Google account (<span className="font-semibold text-oc-navy dark:text-white">{currentUser.email}</span>).
                  </p>
                </div>

                {error && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Meeting Creation Notice:</strong>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isCreating}
                  onClick={handleStartCreate}
                  className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl hover:scale-[1.01] active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Provisioning Google Meet Room...</span>
                    </>
                  ) : (
                    <>
                      <Video size={16} />
                      <span>Generate Google Meet Room</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="p-6 bg-gradient-to-br from-blue-500/10 via-emerald-500/10 to-transparent rounded-3xl border border-emerald-500/30 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                      <Check size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-oc-navy dark:text-white">
                        Google Meet Ready!
                      </h3>
                      <p className="text-xs text-gray-500">{meetingTopic}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-oc-navy/80 p-4 rounded-2xl border border-oc-gold/15 space-y-3">
                    <div>
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Meeting Link</span>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <a 
                          href={createdMeet.meetingUri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          {createdMeet.meetingUri}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(createdMeet.meetingUri, false)}
                          className="px-3 py-1.5 bg-oc-gold/10 hover:bg-oc-gold/20 text-oc-gold rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all"
                        >
                          {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {createdMeet.meetingCode && (
                      <div className="pt-2 border-t border-oc-gold/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Meeting Code</span>
                          <span className="font-mono font-bold text-xs text-oc-navy dark:text-white">{createdMeet.meetingCode}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(createdMeet.meetingCode, true)}
                          className="text-xs text-gray-400 hover:text-oc-gold"
                        >
                          {copiedCode ? 'Copied' : 'Copy Code'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <a
                      href={createdMeet.meetingUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-black py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs hover:scale-[1.02] transition-all"
                    >
                      <Video size={16} />
                      <span>Join Video Call Now</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {/* Share to Chat section */}
                <div className="p-4 bg-oc-cream/40 dark:bg-white/5 rounded-2xl border border-oc-gold/10 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-oc-navy dark:text-oc-gold">
                    <Send size={14} />
                    <span>Send Meeting Invite to Contact via Chat</span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={shareRecipient}
                      onChange={(e) => setShareRecipient(e.target.value)}
                      className="flex-1 bg-white dark:bg-oc-navy border border-oc-gold/15 rounded-xl px-3 py-2 text-xs text-oc-navy dark:text-white outline-none"
                    >
                      <option value="">Select a contact...</option>
                      {(Object.values(users) as User[])
                        .filter(u => u.email !== currentUser.email)
                        .map(u => (
                          <option key={u.email} value={u.email}>
                            {u.bizName || u.name || u.email} ({u.email})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!shareRecipient}
                      onClick={() => handleShareToChat(shareRecipient)}
                      className="px-4 py-2 bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy rounded-xl text-xs font-bold disabled:opacity-40 hover:scale-105 transition-all flex items-center gap-1.5"
                    >
                      <Send size={13} />
                      <span>Send</span>
                    </button>
                  </div>
                  {shareSuccess && (
                    <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                      <Check size={12} /> Invite delivered to chat thread!
                    </p>
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedMeet(null);
                      setMeetingTopic('Online Corporate Video Conference');
                    }}
                    className="text-xs font-bold text-gray-500 hover:text-oc-navy dark:hover:text-white"
                  >
                    + Create Another Meeting Space
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 bg-oc-cream dark:bg-white/10 rounded-xl text-xs font-bold text-gray-700 dark:text-white hover:bg-oc-gold/20"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* TAB 2: SCHEDULED MEET SESSIONS */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {totalUpcomingMeets > 0 ? (
              <div className="space-y-4">
                {/* Discovery Calls */}
                {myMeetAppointments.map(appt => {
                  const isHost = appt.hostEmail === currentUser.email;
                  const otherParty = isHost ? appt.bookerName : appt.hostName;
                  return (
                    <div 
                      key={appt.id}
                      className="p-4 rounded-2xl bg-oc-cream/40 dark:bg-white/5 border border-oc-gold/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                            Discovery Call
                          </span>
                          <span className="text-xs font-bold text-oc-navy dark:text-white">{appt.topic}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-3">
                          <span className="flex items-center gap-1"><Users size={12} className="text-oc-gold" /> {otherParty}</span>
                          <span className="flex items-center gap-1"><Calendar size={12} className="text-oc-gold" /> {appt.date}</span>
                          <span className="flex items-center gap-1"><Clock size={12} className="text-oc-gold" /> {appt.timeSlot}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {appt.meetUri && (
                          <a
                            href={appt.meetUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl text-xs font-bold hover:scale-105 transition-all flex items-center gap-1.5"
                          >
                            <Video size={14} />
                            <span>Join Meet</span>
                          </a>
                        )}
                        <button
                          onClick={() => onOpenChat(isHost ? appt.bookerEmail : appt.hostEmail)}
                          className="p-2 bg-oc-gold/10 text-oc-gold hover:bg-oc-gold/20 rounded-xl"
                          title="Chat with participant"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Interviews */}
                {myMeetInterviews.map(app => {
                  const isEmployer = app.employerEmail === currentUser.email;
                  const otherParty = isEmployer ? app.candidateName : app.jobTitle;
                  return (
                    <div 
                      key={app.id}
                      className="p-4 rounded-2xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold">
                            Job Interview
                          </span>
                          <span className="text-xs font-bold text-oc-navy dark:text-white">{app.jobTitle}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-3">
                          <span className="flex items-center gap-1"><Users size={12} className="text-oc-gold" /> {otherParty}</span>
                          {app.interviewDate && (
                            <span className="flex items-center gap-1"><Calendar size={12} className="text-oc-gold" /> {app.interviewDate}</span>
                          )}
                          {app.interviewTime && (
                            <span className="flex items-center gap-1"><Clock size={12} className="text-oc-gold" /> {app.interviewTime}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {app.meetUri && (
                          <a
                            href={app.meetUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl text-xs font-bold hover:scale-105 transition-all flex items-center gap-1.5"
                          >
                            <Video size={14} />
                            <span>Join Interview</span>
                          </a>
                        )}
                        <button
                          onClick={() => onOpenChat(isEmployer ? app.candidateEmail : app.employerEmail)}
                          className="p-2 bg-oc-gold/10 text-oc-gold hover:bg-oc-gold/20 rounded-xl"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Events / Webinars */}
                {myMeetEvents.map(event => (
                  <div 
                    key={event.id}
                    className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                          {event.type}
                        </span>
                        <span className="text-xs font-bold text-oc-navy dark:text-white">{event.title}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Calendar size={12} className="text-oc-gold" /> {event.date}</span>
                        <span className="flex items-center gap-1"><Users size={12} className="text-oc-gold" /> {event.attendees.length} Attendees</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {event.meetUri && (
                        <a
                          href={event.meetUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl text-xs font-bold hover:scale-105 transition-all flex items-center gap-1.5"
                        >
                          <Video size={14} />
                          <span>Join Webinar</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-oc-cream/20 dark:bg-white/5 rounded-2xl border border-dashed border-oc-gold/15 space-y-2">
                <Video size={40} className="mx-auto text-oc-gold/30" />
                <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300">No Scheduled Google Meet Calls</h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  When you book discovery calls, schedule candidate interviews, or host webinars, they will show up here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal as required by workspace-integration skill */}
        <AnimatePresence>
          {showConfirmationStep && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/75 backdrop-blur-sm" 
                onClick={() => setShowConfirmationStep(false)} 
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md bg-white dark:bg-oc-navy rounded-3xl p-6 shadow-2xl border border-oc-gold/20 space-y-4 z-10"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <Video size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                    Confirm Google Meet Space Creation
                  </h3>
                  <p className="text-xs text-gray-500">
                    You are about to create a live Google Meet space for:
                  </p>
                  <p className="text-xs font-bold text-oc-navy dark:text-white bg-oc-cream dark:bg-white/5 py-2 px-3 rounded-xl mt-2 border border-oc-gold/10">
                    "{meetingTopic}"
                  </p>
                </div>

                <div className="text-[11px] text-gray-500 space-y-1 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                  <div><strong>Account:</strong> {currentUser.email}</div>
                  <div><strong>Access Type:</strong> Open / Direct Conference</div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmationStep(false)}
                    className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCreateSpace}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold py-3 rounded-xl text-xs shadow-lg hover:scale-105 transition-all"
                  >
                    Create Space
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
