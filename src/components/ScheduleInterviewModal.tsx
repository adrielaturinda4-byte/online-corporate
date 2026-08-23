import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  X, 
  Calendar, 
  Clock, 
  Check, 
  AlertCircle, 
  Briefcase, 
  UserCircle 
} from 'lucide-react';
import { JobApplication, User } from '../types';
import { createGoogleMeetSpace } from '../googleMeet';

interface ScheduleInterviewModalProps {
  application: JobApplication | null;
  onClose: () => void;
  onScheduleComplete: (appId: string, interviewDate: string, interviewTime: string, meetUri?: string, meetCode?: string) => void;
  currentUser: User;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  application,
  onClose,
  onScheduleComplete,
  currentUser,
}) => {
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 10:45 AM');
  const [includeGoogleMeet, setIncludeGoogleMeet] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!application) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowConfirmDialog(true);
  };

  const handleConfirmSchedule = async () => {
    setShowConfirmDialog(false);
    setIsProcessing(true);
    setError(null);

    let meetUri: string | undefined;
    let meetCode: string | undefined;

    if (includeGoogleMeet) {
      try {
        const space = await createGoogleMeetSpace();
        meetUri = space.meetingUri;
        meetCode = space.meetingCode;
      } catch (err: any) {
        setError(`Failed to create Google Meet space: ${err?.message || 'Authorization error'}. You can still schedule without Meet if needed.`);
        setIsProcessing(false);
        return;
      }
    }

    onScheduleComplete(application.id, date, timeSlot, meetUri, meetCode);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-black/70 backdrop-blur-md" 
        onClick={() => !isProcessing && onClose()} 
      />

      <motion.div 
        initial={{ scale: 0.92, opacity: 0, y: 15 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="relative w-full max-w-lg bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/20 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-oc-gold/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                Schedule Candidate Interview
              </h2>
              <p className="text-xs text-gray-500">
                {application.jobTitle} • Candidate: {application.candidateName}
              </p>
            </div>
          </div>
          <button 
            disabled={isProcessing}
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Candidate overview banner */}
          <div className="p-3.5 bg-oc-cream/50 dark:bg-white/5 rounded-2xl border border-oc-gold/10 flex items-center gap-3">
            <img 
              src={application.candidatePhoto || 'https://via.placeholder.com/40'} 
              alt="" 
              className="w-10 h-10 rounded-xl object-cover border border-oc-gold/20"
            />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs text-oc-navy dark:text-white truncate">
                {application.candidateName}
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {application.candidateEmail}
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-oc-gold mb-2">
              Interview Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl p-3 text-xs outline-none text-oc-navy dark:text-white"
            />
            <div className="flex gap-2 mt-2">
              {[
                { label: 'Tomorrow', days: 1 },
                { label: 'In 2 Days', days: 2 },
                { label: 'In 3 Days', days: 3 },
              ].map(item => {
                const d = new Date();
                d.setDate(d.getDate() + item.days);
                const dStr = d.toISOString().split('T')[0];
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setDate(dStr)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      date === dStr ? 'bg-oc-gold text-oc-navy' : 'bg-oc-gold/10 text-oc-gold hover:bg-oc-gold/20'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Picker */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-widest text-oc-gold mb-2">
              Time Slot
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                '09:00 AM - 09:45 AM',
                '10:00 AM - 10:45 AM',
                '11:30 AM - 12:15 PM',
                '02:00 PM - 02:45 PM',
                '03:30 PM - 04:15 PM',
                '05:00 PM - 05:45 PM',
              ].map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeSlot(slot)}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                    timeSlot === slot
                      ? 'bg-oc-gold text-oc-navy border-oc-gold font-extrabold shadow-sm'
                      : 'bg-oc-cream/40 dark:bg-white/5 border-oc-gold/10 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Clock size={11} className="inline mr-1 opacity-70" />
                  {slot.split(' - ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Google Meet Toggle */}
          <div 
            onClick={() => setIncludeGoogleMeet(!includeGoogleMeet)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
              includeGoogleMeet 
                ? 'bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border-emerald-500/30' 
                : 'bg-oc-cream/30 dark:bg-white/5 border-oc-gold/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                includeGoogleMeet ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-400'
              }`}>
                <Video size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-oc-navy dark:text-white flex items-center gap-1.5">
                  <span>Generate Google Meet Video Link</span>
                  {includeGoogleMeet && <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-extrabold">Active</span>}
                </div>
                <div className="text-[10px] text-gray-500">
                  Automatically creates a video space &amp; dispatches join links
                </div>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={includeGoogleMeet} 
              onChange={() => {}} 
              className="accent-emerald-600 w-4 h-4 cursor-pointer"
            />
          </div>

          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-[2] bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg text-xs flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scheduling &amp; Creating Space...</span>
                </>
              ) : (
                <>
                  <Calendar size={15} />
                  <span>Confirm &amp; Dispatch Invite</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirmDialog && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/75 backdrop-blur-sm" 
                onClick={() => setShowConfirmDialog(false)} 
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md bg-white dark:bg-oc-navy rounded-3xl p-6 shadow-2xl border border-oc-gold/20 space-y-4 z-10"
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
                  <Calendar size={24} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                    Confirm Interview Scheduling
                  </h3>
                  <p className="text-xs text-gray-500">
                    Schedule interview with <strong className="text-oc-navy dark:text-white">{application.candidateName}</strong> for <strong className="text-oc-navy dark:text-white">{application.jobTitle}</strong>?
                  </p>
                </div>

                <div className="bg-oc-cream/80 dark:bg-white/5 p-3.5 rounded-xl border border-oc-gold/15 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Date &amp; Time:</span>
                    <span className="font-bold">{date} @ {timeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Google Meet:</span>
                    <span className="font-bold text-emerald-500">{includeGoogleMeet ? 'Yes (Auto Generated)' : 'No'}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmDialog(false)}
                    className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSchedule}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold py-3 rounded-xl text-xs shadow-lg"
                  >
                    Confirm &amp; Schedule
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
