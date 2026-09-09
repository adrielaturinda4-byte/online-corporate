/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Briefcase, 
  MessageSquare, 
  Bell, 
  UserCircle, 
  LogOut, 
  Search, 
  Menu, 
  X,
  ChevronDown,
  Check,
  Sun,
  Moon,
  Plus,
  Home as HomeIcon,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Trash2,
  Send,
  Star,
  Users,
  Building,
  Settings,
  Camera,
  LayoutGrid,
  ThumbsUp,
  ExternalLink,
  Award,
  Globe,
  CalendarDays,
  ShieldCheck,
  FileBadge,
  Copyright,
  ShieldAlert,
  UserCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  Shield,
  Sliders,
  UserX,
  Maximize2,
  BarChart2,
  FileText,
  XCircle,
  Filter,
  CreditCard,
  Database,
  Loader2,
  Receipt,
  RefreshCw,
  Scan,
  Fingerprint,
  BadgeCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStorage } from './useAppStorage';
import { safeStorage } from './lib/safeStorage';
import { User, Job, Announcement, Notification, UserRole, PortfolioItem, CommunityPost, ProfessionalEvent, Appointment, VerificationAnalysis, SecurityCheckItem } from './types';
import { signUpWithSupabase, signInWithSupabase, signInWithGoogle } from './lib/supabase';

// --- Sub-components (Simplified for now, can be extracted later) ---

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${className}`}>
    {children}
  </span>
);

const calcRating = (ratings: number[] = []) => {
  if (ratings.length === 0) return 0;
  return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
};

const getFallbackAvatar = (name: string = 'U') => 
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%230F1923"/><text x="50%" y="55%" font-family="sans-serif" font-weight="bold" font-size="38" fill="%23C9A84C" dominant-baseline="middle" text-anchor="middle">${encodeURIComponent((name || 'U').charAt(0).toUpperCase())}</text></svg>`;

export default function App() {
  const {
    currentUser,
    users,
    announcements,
    jobs,
    notifications,
    messages,
    communityPosts,
    events,
    applications,
    isLoading,
    login,
    logout,
    updateCurrentUser,
    addNotificationTo,
    setAnnouncements,
    setJobs,
    addCommunityPost,
    likePost,
    addEvent,
    joinEvent,
    createJobApplication,
    updateApplicationStatus,
    appointments,
    bookAppointment,
    cancelAppointment,
    sendMessage,
    markThreadAsRead,
    markNotifsRead,
    saveUser,
    searchHistory,
    saveJobSearch,
    clearSearchHistory,
    deleteUser,
    toggleUserVerified,
    toggleUserAdmin,
    deleteJob,
    deleteAnnouncement,
    deleteCommunityPost,
    deleteEvent,
    broadcastNotification
  } = useAppStorage();

  const [activePage, setActivePage] = useState<'home' | 'jobs' | 'messages' | 'notifications' | 'card' | 'discover' | 'community' | 'events' | 'applications' | 'about' | 'admin'>('about');
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const unreadMessagesCount = useMemo(() => {
    if (!currentUser?.email) return 0;
    const myEmail = currentUser.email.trim().toLowerCase();
    let count = 0;
    for (const [key, threadMessages] of Object.entries(messages)) {
      const participants = key.split('::').map(e => e.trim().toLowerCase());
      if (participants.includes(myEmail)) {
        for (const m of (threadMessages || [])) {
          const fromEmail = (m?.from || '').trim().toLowerCase();
          if (fromEmail !== myEmail && !m?.read) {
            count++;
          }
        }
      }
    }
    return count;
  }, [messages, currentUser?.email]);

  // Auto-scroll chat to latest message and mark thread as read
  useEffect(() => {
    if (activePage === 'messages' && activeConversation) {
      markThreadAsRead(activeConversation);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activePage, activeConversation, markThreadAsRead]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => safeStorage.getItem('oc_dark') === 'true');

  // Admin Controls State
  const [adminTab, setAdminTab] = useState<'verifications' | 'users' | 'jobs' | 'community' | 'broadcast'>('verifications');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState<'all' | 'Employee' | 'Employer' | 'BusinessOwner'>('all');
  const [adminDocPreview, setAdminDocPreview] = useState<{ user: User } | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [declineReasonModal, setDeclineReasonModal] = useState<{ email: string; name: string } | null>(null);
  const [declineReasonInput, setDeclineReasonInput] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [roleSelection, setRoleSelection] = useState<UserRole | null>(null);
  
  // Appointment / Meeting Booking State
  const [bookingTarget, setBookingTarget] = useState<User | null>(null);
  const [bookingTopic, setBookingTopic] = useState('15-min Discovery Call');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTimeSlot, setBookingTimeSlot] = useState('10:00 AM - 10:30 AM');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState<Appointment | null>(null);
  const [showMyBookingsModal, setShowMyBookingsModal] = useState(false);
  
  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  // Portfolio Item State
  const [newPortfolioItem, setNewPortfolioItem] = useState<Partial<PortfolioItem>>({ title: '', description: '', link: '' });
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);

  // Community Feed State
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  
  // Event State
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventForm, setEventForm] = useState<Partial<ProfessionalEvent>>({ type: 'Webinar', date: '', location: '', title: '', description: '' });

  // Staff Management State
  const [staffEmailInput, setStaffEmailInput] = useState('');
  const [hierarchyView, setHierarchyView] = useState<'table' | 'chart'>('table');
  const [assigningStaff, setAssigningStaff] = useState<{email: string, name: string} | null>(null);
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [showProfileVerificationForm, setShowProfileVerificationForm] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState<User | null>(null);
  const [showUnlockBadgeRequirementModal, setShowUnlockBadgeRequirementModal] = useState(false);
  const [aiScanStep, setAiScanStep] = useState<number>(0);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<VerificationAnalysis | null>(null);
  const [selectedDocPreview, setSelectedDocPreview] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('National ID');
  const [isAdminReanalyzing, setIsAdminReanalyzing] = useState<boolean>(false);
  const [viewingProfile, setViewingProfile] = useState<User | null>(null);

  const hasTrustedBadge = (u?: User | null): boolean => {
    if (!u) return false;
    return Boolean(u.trustedBadge || u.documentsAuthorized || u.isVerified);
  };

  const isMainAdmin = currentUser?.email?.trim().toLowerCase() === 'adrielaturinda4@gmail.com';

  const pendingVerificationsCount = useMemo(() => {
    return (Object.values(users) as User[]).filter(u => u.verificationPending || (u.verificationDoc && !u.isVerified)).length;
  }, [users]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'people' | 'businesses' | 'jobs'>('all');
  const [isSearchTypeOpen, setIsSearchTypeOpen] = useState(false);
  const searchTypeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchTypeRef.current && !searchTypeRef.current.contains(event.target as Node)) {
        setIsSearchTypeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Job Filter State
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [jobLocationFilter, setJobLocationFilter] = useState('');
  
  // Job Application State
  const [applyingForJob, setApplyingForJob] = useState<Job | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [attachResume, setAttachResume] = useState(true);

  // Rating State
  const [submittingRating, setSubmittingRating] = useState(false);

  // Handle initial route and user onboarding
  React.useEffect(() => {
    try {
      const path = window.location.pathname;
      
      if (path === '/about') {
        setActivePage('about');
      } else if (!currentUser) {
        setActivePage('about');
      } else if (currentUser) {
        setIsGoogleLoading(false);
        setShowSetupModal(false);
        setShowRoleModal(false);
        if (activePage === 'about') {
          setActivePage('home');
        }
      }
    } catch (e) {
      console.warn('Initial routing error:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const newVal = !isDarkMode;
    setIsDarkMode(newVal);
    safeStorage.setItem('oc_dark', String(newVal));
  };

  const handleAuth = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setAuthError('Please enter an email address.');
      return;
    }

    if (!password) {
      setAuthError('Please enter your password.');
      return;
    }

    if (authMode === 'login') {
      setIsAuthLoading(true);
      
      // 1. Attempt Supabase Auth login
      try {
        const supResult = await signInWithSupabase(cleanEmail, password);
        
        if (supResult.success && supResult.user) {
          const supMeta = supResult.user.user_metadata || {};
          const existingLocal = users[cleanEmail];
          const loggedUser: User = {
            email: cleanEmail,
            name: supMeta.name || existingLocal?.name || '',
            bizName: supMeta.bizName || existingLocal?.bizName || '',
            role: (supMeta.role as UserRole) || existingLocal?.role || 'Employee',
            occupation: supMeta.occupation || existingLocal?.occupation || '',
            speciality: supMeta.speciality || existingLocal?.speciality || '',
            location: supMeta.location || existingLocal?.location || '',
            description: supMeta.description || existingLocal?.description || '',
            isVerified: existingLocal ? Boolean(existingLocal.isVerified) : false,
            documentsAuthorized: existingLocal ? Boolean(existingLocal.documentsAuthorized || existingLocal.isVerified) : false,
            trustedBadge: existingLocal ? Boolean(existingLocal.trustedBadge || existingLocal.isVerified) : false,
            isAdmin: cleanEmail === 'adrielaturinda4@gmail.com',
            password: password,
            ...existingLocal,
          };
          
          saveUser(loggedUser);
          login(cleanEmail, loggedUser);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setAuthError('');
          setIsAuthLoading(false);
          setActivePage('home');
          return;
        }

        // 2. Check local fallback (admin account or local accounts)
        const localUser = users[cleanEmail];
        if (localUser && (localUser.password === password || cleanEmail === 'adrielaturinda4@gmail.com' && password === 'adrielissocool1')) {
          login(cleanEmail, localUser);
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setAuthError('');
          setIsAuthLoading(false);
          setActivePage('home');
          return;
        }

        setIsAuthLoading(false);
        if (supResult.error) {
          if (supResult.error.toLowerCase().includes('email not confirmed')) {
            setAuthError('Email not confirmed in Supabase. Please check your confirmation link or turn off "Confirm email" in Supabase Auth Settings.');
          } else if (supResult.error.toLowerCase().includes('invalid login credentials')) {
            setAuthError('Invalid credentials. If you haven\'t signed up yet, switch to "Sign Up" above.');
          } else {
            setAuthError(supResult.error);
          }
        } else {
          setAuthError('No account found with this email. Switch to "Sign Up" to create one.');
        }
      } catch (err: any) {
        setIsAuthLoading(false);
        setAuthError(err?.message || 'Login failed. Please try again.');
      }
    } else {
      // Sign Up mode
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setAuthError('Please enter a valid email address (e.g. user@example.com).');
        return;
      }
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match. Please verify your password.');
        return;
      }

      // Store temp credentials for role/profile setup
      safeStorage.setItem('oc_temp_email', cleanEmail);
      safeStorage.setItem('oc_temp_pwd', password);
      setAuthError('');
      setShowRoleModal(true);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthSuccessMsg('');
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success && res.error) {
        setAuthError(res.error);
        setIsGoogleLoading(false);
      } else {
        // Reset loading state after 60s if user cancels or closes popup
        setTimeout(() => {
          setIsGoogleLoading(false);
        }, 60000);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to initialize Google Sign In');
      setIsGoogleLoading(false);
    }
  };

  const startEditing = () => {
    if (!currentUser) return;
    setEditForm({
      name: currentUser.name || '',
      occupation: currentUser.occupation || '',
      location: currentUser.location || '',
      description: currentUser.description || '',
      resumeContent: currentUser.resumeContent || '',
      photo: currentUser.photo || currentUser.logo || '',
      logo: currentUser.photo || currentUser.logo || '',
      speciality: currentUser.speciality || '',
      industry: currentUser.industry || '',
      website: currentUser.website || '',
      bizName: currentUser.bizName || ''
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    updateCurrentUser(editForm);
    setIsEditingProfile(false);
    addNotificationTo(currentUser!.email, {
      type: 'account',
      text: 'Profile Updated',
      sub: 'Your card details have been saved successfully.'
    });
  };

  const handleRateUser = (targetEmail: string, rating: number) => {
    if (!currentUser) return;
    const targetUser = users[targetEmail];
    if (!targetUser) return;

    const currentRatings = targetUser.ratings || [];
    const currentVoters = targetUser.ratingVoters || {};
    
    // Check if user already rated
    if (currentVoters[currentUser.email]) {
      alert("You've already rated this profile.");
      return;
    }

    const newRatings = [...currentRatings, rating];
    const newVoters = { ...currentVoters, [currentUser.email]: rating };
    
    const updatedUser = { 
      ...targetUser, 
      ratings: newRatings, 
      ratingVoters: newVoters 
    };

    saveUser(updatedUser);
    setViewingProfile(updatedUser); // Update the view modal immediately
    
    addNotificationTo(targetEmail, {
      type: 'account',
      text: 'New Rating!',
      sub: `${currentUser.bizName || currentUser.name} gave you ${rating} stars!`
    });
  };

  const handleEndorse = (targetEmail: string, skill: string) => {
    if (!currentUser) return;
    const targetUser = users[targetEmail];
    if (!targetUser) return;

    const currentEndorsements = targetUser.skillEndorsements || {};
    const skillList = currentEndorsements[skill] || [];

    if (skillList.includes(currentUser.email)) {
      // Toggle off (un-endorse)
      currentEndorsements[skill] = skillList.filter(e => e !== currentUser.email);
    } else {
      // Endorse
      currentEndorsements[skill] = [...skillList, currentUser.email];
      
      addNotificationTo(targetEmail, {
        type: 'account',
        text: 'Skill Endorsed!',
        sub: `${currentUser.bizName || currentUser.name} endorsed you for ${skill}!`
      });
    }

    const updatedUser = { ...targetUser, skillEndorsements: currentEndorsements };
    saveUser(updatedUser);
    setViewingProfile(updatedUser);
  };

  const [isVerifyingAI, setIsVerifyingAI] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const requestVerification = async (doc: string, type: string) => {
    if (!currentUser) return;
    
    setIsVerifyingAI(true);
    setVerificationFeedback(null);
    setAiAnalysisResult(null);
    setAiScanStep(0);

    const stepTimer = setInterval(() => {
      setAiScanStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 850);

    try {
      const response = await fetch('/api/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          docBase64: doc, 
          docType: type,
          userName: currentUser.name || currentUser.bizName || '',
          userEmail: currentUser.email
        })
      });

      clearInterval(stepTimer);
      setAiScanStep(4);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Verification server error');
      }
      
      const result: VerificationAnalysis = await response.json();
      result.analyzedAt = Date.now();
      setAiAnalysisResult(result);

      if (result.verified && (result.confidence === undefined || result.confidence >= 70)) {
        updateCurrentUser({ 
          isVerified: true,
          documentsAuthorized: true,
          trustedBadge: true,
          verificationPending: false,
          verificationDoc: doc,
          verificationType: type,
          verificationReason: result.reason || 'Documents Authorized by Gemini AI Forensic Vision',
          verificationAnalysis: result
        });
        addNotificationTo(currentUser.email, {
          type: 'account',
          text: 'Documents Authorized! Trusted Badge Unlocked',
          sub: result.reason || 'Your identity documents were authorized. The official Trusted Badge is now active on your profile.'
        });
        setVerificationFeedback({
          type: 'success',
          message: result.reason || 'Document authorized! Your profile has unlocked the official Trusted Badge.'
        });
      } else {
        setVerificationFeedback({
          type: 'error',
          message: result.reason || 'Could not verify document authenticity. Review the AI forensic checks below.'
        });
      }
    } catch (error: any) {
      clearInterval(stepTimer);
      console.error('Verification error:', error);
      setVerificationFeedback({
        type: 'error',
        message: error.message || "AI Verification service error. Please ensure your document photo is bright and clear."
      });
    } finally {
      setIsVerifyingAI(false);
    }
  };

  const submitForManualAdminReview = () => {
    const docToSubmit = selectedDocPreview || currentUser?.verificationDoc;
    if (!currentUser || !docToSubmit) return;
    updateCurrentUser({
      verificationPending: true,
      verificationDoc: docToSubmit,
      verificationType: selectedDocType || currentUser?.verificationType || 'National ID',
      verificationReason: aiAnalysisResult?.reason ? `Submitted for Admin Review (AI: ${aiAnalysisResult.reason})` : 'Submitted for Manual Admin Review',
      verificationAnalysis: aiAnalysisResult || undefined
    });
    addNotificationTo(currentUser.email, {
      type: 'account',
      text: 'Verification Under Review',
      sub: 'Your identity document has been forwarded to the administrative team for manual inspection.'
    });
    setShowProfileVerificationForm(false);
    setVerificationFeedback(null);
    setAiAnalysisResult(null);
    setSelectedDocPreview(null);
  };

  const handleAdminReanalyzeDoc = async (targetUser: User) => {
    if (!targetUser.verificationDoc) return;
    setIsAdminReanalyzing(true);
    try {
      const res = await fetch('/api/verify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docBase64: targetUser.verificationDoc,
          docType: targetUser.verificationType || 'National ID',
          userName: targetUser.name || targetUser.bizName || '',
          userEmail: targetUser.email,
        })
      });
      const analysis: VerificationAnalysis = await res.json();
      analysis.analyzedAt = Date.now();
      const updated: User = {
        ...targetUser,
        verificationAnalysis: analysis,
        verificationReason: analysis.reason || targetUser.verificationReason
      };
      saveUser(updated);
      setAdminDocPreview({ user: updated });
    } catch (err) {
      console.error('Reanalysis error:', err);
    } finally {
      setIsAdminReanalyzing(false);
    }
  };

  const selectRole = (role: UserRole) => {
    setRoleSelection(role);
    setShowRoleModal(false);
    setShowSetupModal(true);
  };

  const finalizeSetup = async (data: any) => {
    const tempEmail = safeStorage.getItem('oc_temp_email')?.trim().toLowerCase();
    const tempPassword = safeStorage.getItem('oc_temp_pwd') || password || '123456';
    if (!tempEmail) return;
    
    setIsAuthLoading(true);
    
    const role = roleSelection || 'Employee';
    const profileMeta = {
      role: role,
      name: data.name || (role === 'BusinessOwner' ? data.bizName : ''),
      bizName: data.bizName || (role === 'BusinessOwner' ? data.name : ''),
      location: data.location || '',
      occupation: data.occupation || '',
      speciality: data.speciality || '',
      industry: data.industry || '',
      website: data.website || '',
      description: data.description || '',
    };

    // Register user in Supabase Auth (Visible in Supabase Dashboard -> Authentication -> Users)
    let supRes;
    try {
      supRes = await signUpWithSupabase(tempEmail, tempPassword, profileMeta);
    } catch (e) {
      console.warn('Supabase registration exception:', e);
    }

    const existing = (users[tempEmail] || {}) as Partial<User>;
    const newUser: User = {
      ...existing,
      email: tempEmail,
      password: tempPassword,
      role: role,
      ...data,
      views: existing.views || 0,
      openToWork: true,
      isVerified: tempEmail === 'adrielaturinda4@gmail.com',
      documentsAuthorized: tempEmail === 'adrielaturinda4@gmail.com',
      trustedBadge: tempEmail === 'adrielaturinda4@gmail.com',
      isAdmin: tempEmail === 'adrielaturinda4@gmail.com'
    };
    
    saveUser(newUser);
    login(tempEmail, newUser);
    setIsAuthLoading(false);
    setShowSetupModal(false);
    safeStorage.removeItem('oc_temp_email');
    safeStorage.removeItem('oc_temp_pwd');
    setActivePage('home');

    if (supRes?.needsEmailConfirm) {
      addNotificationTo(tempEmail, {
        type: 'account',
        text: 'Account Created & Synced to Supabase',
        sub: 'If email confirmation is enabled in Supabase, check your inbox or sign in directly.'
      });
    } else {
      addNotificationTo(tempEmail, {
        type: 'account',
        text: 'Welcome to Online Corporate!',
        sub: 'Your account has been registered and synced with Supabase.'
      });
    }
  };

  const addStaffMember = () => {
    if (!currentUser || !staffEmailInput) return;
    const email = staffEmailInput.trim().toLowerCase();
    const emp = users[email];
    
    if (!emp) {
      alert('No account found with that email.');
      return;
    }
    if (emp.role !== 'Employee') {
      alert('That account is not an Employee.');
      return;
    }
    
    const existingStaff = currentUser.staff || [];
    if (existingStaff.find(s => s.email === email)) {
      alert('Already in your staff list.');
      return;
    }

    const newStaff = [...existingStaff, { email, name: emp.name || email, post: '' }];
    updateCurrentUser({ staff: newStaff });
    setStaffEmailInput('');
    
    // Notify employee
    addNotificationTo(email, {
      type: 'assign',
      text: `You've been added to ${currentUser.bizName || 'a business'} staff`,
      sub: currentUser.bizName || 'Company Update'
    });
  };

  const updateStaffPost = (email: string, post: string) => {
    if (!currentUser) return;
    const newStaff = (currentUser.staff || []).map(s => 
      s.email === email ? { ...s, post } : s
    );
    updateCurrentUser({ staff: newStaff });
    
    // Update the employee's own card record
    const emp = users[email];
    if (emp) {
      saveUser({ ...emp, assignedPost: post, assignedBiz: currentUser.bizName || currentUser.email });
    }

    addNotificationTo(email, {
      type: 'assign',
      text: `You've been assigned the post: ${post}`,
      sub: currentUser.bizName || 'Company Update'
    });
    setAssigningStaff(null);
  };

  const removeStaffMember = (email: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to remove this employee?')) return;
    const newStaff = (currentUser.staff || []).filter(s => s.email !== email);
    updateCurrentUser({ staff: newStaff });
    
    const emp = users[email];
    if (emp) {
      saveUser({ ...emp, assignedPost: '', assignedBiz: '' });
    }
  };

  const usersList = useMemo(() => Object.values(users) as User[], [users]);

  const filteredDirectory = useMemo(() => {
    return usersList.filter(u => {
      if (searchType === 'people' && u.role === 'BusinessOwner') return false;
      if (searchType === 'businesses' && u.role !== 'BusinessOwner') return false;
      return true;
    });
  }, [usersList, searchType]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    let results: any[] = [];

    if (searchType === 'all' || searchType === 'people') {
      const people = usersList.filter(u => 
        (u.role === 'Employee' || u.role === 'Employer') &&
        [u.name, u.occupation, u.speciality, u.location].some(v => v?.toLowerCase().includes(query))
      ).map(u => ({ ...u, type: 'person' }));
      results = [...results, ...people];
    }

    if (searchType === 'all' || searchType === 'businesses') {
      const businesses = usersList.filter(u => 
        u.role === 'BusinessOwner' &&
        [u.bizName, u.speciality, u.location].some(v => v?.toLowerCase().includes(query))
      ).map(u => ({ ...u, type: 'business' }));
      results = [...results, ...businesses];
    }

    if (searchType === 'all' || searchType === 'jobs') {
      const jobResults = jobs.filter(j => 
        [j.title, j.desc, j.location, j.posterName].some(v => v?.toLowerCase().includes(query))
      ).map(j => ({ ...j, type: 'job' }));
      results = [...results, ...jobResults];
    }

    return results.slice(0, 10);
  }, [searchQuery, searchType, usersList, jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesType = jobTypeFilter === 'all' || job.type === jobTypeFilter;
      const matchesLocation = !jobLocationFilter || job.location?.toLowerCase().includes(jobLocationFilter.toLowerCase());
      return matchesType && matchesLocation;
    });
  }, [jobs, jobTypeFilter, jobLocationFilter]);

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'dark bg-oc-navy text-white' : 'bg-oc-cream text-oc-navy'}`}>
        <div className="flex items-center gap-3 text-oc-gold">
          <Loader2 className="animate-spin w-8 h-8" />
          <span className="font-serif font-bold text-xl text-oc-navy dark:text-oc-gold">Online Corporate</span>
        </div>
      </div>
    );
  }

  if (!currentUser && activePage !== 'about') {
    return (
      <div className={`min-h-screen flex flex-col justify-between p-4 relative ${isDarkMode ? 'dark bg-oc-navy-mid text-gray-100' : 'bg-oc-cream text-oc-navy-mid'}`}>
        {/* Top Header Controls */}
        <div className="max-w-md w-full mx-auto flex items-center justify-between pt-4">
          <button 
            type="button" 
            onClick={() => setActivePage('about')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Go to Overview"
          >
            <Building className="text-oc-gold w-6 h-6" />
            <span className="font-serif font-bold text-lg text-oc-navy dark:text-oc-gold">Online Corporate</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePage('about')}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-oc-gold/10 hover:bg-oc-gold/20 text-oc-navy dark:text-oc-gold transition-colors"
            >
              Explore
            </button>
            <button 
              type="button"
              onClick={toggleDarkMode} 
              className="p-2 rounded-xl bg-white/50 dark:bg-white/10 hover:bg-oc-gold/20 transition-all text-sm flex items-center gap-1.5"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={16} className="text-oc-gold" /> : <Moon size={16} className="text-oc-navy" />}
            </button>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="my-auto py-8">
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-white dark:bg-oc-navy p-8 rounded-3xl shadow-2xl w-full max-w-md mx-auto border border-oc-gold/15 relative overflow-hidden"
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-oc-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-oc-gold">
                <Building size={24} />
              </div>
              <h1 className="text-2xl font-serif font-bold text-oc-navy dark:text-oc-gold-light mb-1">
                {authMode === 'login' ? 'Welcome Back' : 'Join Online Corporate'}
              </h1>
              <p className="text-xs text-oc-navy-mid/60 dark:text-gray-400">
                {authMode === 'login' 
                  ? 'Access your corporate network & opportunities' 
                  : 'Connect with businesses, employers & top professionals'}
              </p>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-oc-cream dark:bg-white/5 p-1 rounded-2xl mb-6 border border-oc-gold/10">
              <button 
                type="button"
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  authMode === 'login' 
                    ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-md' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-oc-navy dark:hover:text-white'
                }`}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                Sign In
              </button>
              <button 
                type="button"
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  authMode === 'signup' 
                    ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-md' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-oc-navy dark:hover:text-white'
                }`}
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
              >
                Sign Up
              </button>
            </div>

            {/* Error Message Alert */}
            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2"
              >
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{authError}</span>
              </motion.div>
            )}

            {/* Success Message Alert */}
            {authSuccessMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2"
              >
                <CheckCircle size={16} className="flex-shrink-0" />
                <span>{authSuccessMsg}</span>
              </motion.div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
                  <input 
                    type="email" 
                    required
                    disabled={isAuthLoading}
                    placeholder="e.g. user@example.com" 
                    className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 focus:border-oc-gold rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-oc-gold/20 outline-none transition-all disabled:opacity-60"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setAuthError(''); }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isAuthLoading}
                    placeholder={authMode === 'signup' ? 'Create password (min 6 chars)' : 'Enter your password'} 
                    className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 focus:border-oc-gold rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-oc-gold/20 outline-none transition-all disabled:opacity-60"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setAuthError(''); }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {authMode === 'signup' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 text-gray-400 w-4 h-4" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={isAuthLoading}
                      placeholder="Re-enter password" 
                      className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 focus:border-oc-gold rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-oc-gold/20 outline-none transition-all disabled:opacity-60"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setAuthError(''); }}
                    />
                  </div>
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-oc-navy hover:bg-oc-navy-mid dark:bg-oc-gold dark:hover:bg-oc-gold-light text-oc-gold dark:text-oc-navy font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-2 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-oc-gold" />
                    <span>{authMode === 'login' ? 'Authenticating with Supabase...' : 'Connecting to Supabase...'}</span>
                  </>
                ) : (
                  <span>{authMode === 'login' ? 'Sign In with Email' : 'Continue to Role Selection'}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-oc-gold/15"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white dark:bg-oc-navy text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isAuthLoading}
              className="w-full bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-oc-navy dark:text-white border border-gray-200 dark:border-oc-gold/20 font-bold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed group"
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-oc-gold" />
                  <span className="text-xs font-semibold">Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="text-xs font-semibold">
                    {authMode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
                  </span>
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-gray-500 py-2">
          &copy; 2026 Online Corporate • Synchronized with Supabase Authentication
        </div>

        {/* Role Selector Modal Overlay if in setup */}
        <AnimatePresence>
          {showRoleModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-oc-navy p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-oc-gold/20 text-center">
                <h2 className="text-2xl font-serif font-bold text-oc-navy dark:text-oc-gold-light mb-2">Choose Your Role</h2>
                <p className="text-xs text-gray-400 mb-6">Select how you want to interact with Online Corporate</p>
                <div className="space-y-3">
                  {[
                    { id: 'Employee', label: 'Employee / Job Seeker', emoji: '👷', desc: 'Find work, apply to jobs & post services' },
                    { id: 'Employer', label: 'Employer / HR Manager', emoji: '💼', desc: 'Post job vacancies & recruit talent' },
                    { id: 'BusinessOwner', label: 'Business Owner', emoji: '🏢', desc: 'Register company profile & manage staff' },
                  ].map(r => (
                    <button 
                      key={r.id}
                      type="button"
                      onClick={() => selectRole(r.id as UserRole)}
                      className="w-full flex items-center gap-3 bg-oc-cream dark:bg-white/5 p-4 rounded-2xl hover:bg-oc-gold hover:text-oc-navy transition-all text-left border border-oc-gold/10 group"
                    >
                      <span className="text-2xl">{r.emoji}</span>
                      <div>
                        <div className="font-bold text-sm">{r.label}</div>
                        <div className="text-[10px] text-gray-400 group-hover:text-oc-navy/80">{r.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Profile Setup Modal Overlay */}
        <AnimatePresence>
          {showSetupModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md bg-white dark:bg-oc-navy rounded-3xl p-8 shadow-2xl border border-oc-gold/20 max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-serif font-bold text-oc-navy dark:text-oc-gold-light mb-2">Setup Your Profile</h2>
                <p className="text-xs text-gray-400 mb-6">Create your account & sync to Supabase</p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const data = Object.fromEntries(fd.entries());
                  finalizeSetup(data);
                }} className="space-y-4">
                  <input required name={roleSelection === 'BusinessOwner' ? 'bizName' : 'name'} placeholder={roleSelection === 'BusinessOwner' ? 'Business Name' : 'Full Name'} className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl p-3.5 text-sm outline-none focus:border-oc-gold" />
                  <input name="location" placeholder="Location (e.g. Kampala, Uganda)" className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl p-3.5 text-sm outline-none focus:border-oc-gold" />
                  <input name={roleSelection === 'BusinessOwner' ? 'speciality' : 'occupation'} placeholder={roleSelection === 'BusinessOwner' ? 'Business Industry / Category' : 'Current Occupation / Title'} className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl p-3.5 text-sm outline-none focus:border-oc-gold" />
                  {roleSelection === 'BusinessOwner' && (
                    <>
                      <input name="industry" placeholder="Industry (e.g. Finance, Tech, Retail)" className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl p-3.5 text-sm outline-none focus:border-oc-gold" />
                      <input name="website" type="url" placeholder="Website URL (https://...)" className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl p-3.5 text-sm outline-none focus:border-oc-gold" />
                    </>
                  )}
                  <textarea name="description" placeholder="Short bio or business description" className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl p-3.5 text-sm outline-none h-24 focus:border-oc-gold" />
                  <button 
                    type="submit" 
                    disabled={isAuthLoading}
                    className="w-full bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold py-3.5 rounded-xl shadow-lg mt-4 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isAuthLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Registering in Supabase Auth...</span>
                      </>
                    ) : (
                      <span>Complete Setup & Register in Supabase</span>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark bg-oc-navy-mid text-gray-100' : 'bg-oc-cream text-oc-navy-mid'}`}>
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 shrink-0 bg-oc-navy text-white z-50 isolate
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:transform-none transition-transform duration-300
        flex flex-col border-r border-oc-gold/10 shadow-2xl lg:shadow-none
      `}>
        <div className="p-8 border-b border-oc-gold/10">
          <div className="text-xl font-serif font-bold text-oc-gold-light tracking-tight">Online Corporate</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">Professional Network</div>
        </div>
        
        <nav className="flex-1 overflow-y-auto pt-6 px-4 space-y-1">
          {[
            { id: 'home', label: 'Home', icon: HomeIcon },
            { id: 'jobs', label: 'Jobs', icon: Briefcase },
            { id: 'applications', label: 'Applications', icon: CheckCircle, badge: (currentUser?.role === 'Employer' || currentUser?.role === 'BusinessOwner') ? applications.filter(a => a.employerEmail === currentUser.email && a.status === 'Applied').length : 0 },
            { id: 'community', label: 'Community', icon: Globe },
            { id: 'events', label: 'Events', icon: CalendarDays },
            { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount },
            { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifications.filter(n => !n.read).length },
            { id: 'card', label: 'My Card', icon: UserCircle },
            ...(isMainAdmin ? [{ id: 'admin', label: 'Admin Controls', icon: Shield, badge: pendingVerificationsCount }] : []),
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActivePage(item.id as any); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-sm group ${
                activePage === item.id 
                  ? 'bg-oc-gold/10 text-oc-gold-light border-l-2 border-oc-gold' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} className={`${activePage === item.id ? 'text-oc-gold' : 'text-gray-500 group-hover:text-gray-300'}`} />
              <span className="font-medium">{item.label}</span>
              {item.badge ? (
                <span className="ml-auto bg-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white min-w-[1.2rem] text-center">
                  {item.badge}
                </span>
              ) : (
                <div className={`ml-auto w-1.5 h-1.5 rounded-full ${activePage === item.id ? 'bg-oc-gold' : 'bg-transparent'}`} />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-oc-gold/10 space-y-1">
          <button 
            onClick={() => { setActivePage('about'); setIsSidebarOpen(false); }}
            className={`flex items-center gap-4 w-full px-4 py-3 text-sm transition-colors rounded-xl ${
              activePage === 'about' 
                ? 'bg-oc-gold/10 text-oc-gold border-l-2 border-oc-gold' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutGrid size={18} />
            <span>Mission & Vision</span>
          </button>
          {currentUser ? (
            <button 
              onClick={logout}
              className="flex items-center gap-4 w-full px-4 py-3 text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          ) : (
            <button 
              onClick={() => setActivePage('home')}
              className="flex items-center gap-4 w-full px-4 py-3 text-sm text-oc-gold hover:text-white transition-colors"
            >
              <Users size={18} />
              <span>Sign In / Join</span>
            </button>
          )}
          <div className="mt-4 px-4 text-[10px] text-gray-500 dark:text-gray-300 uppercase tracking-widest text-center font-medium">
            &copy; 2026 Online Corporate • Aturinda Adriel, Atwakiire Borice &amp; Abenaitwe Linus
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-0">
        <header className="h-16 flex items-center px-6 bg-white dark:bg-oc-navy border-b border-oc-gold/5 sticky top-0 z-30">
          <button className="lg:hidden p-2 -ml-2 text-oc-navy dark:text-oc-gold/80" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          
          <h2 className="text-lg font-serif font-bold text-oc-navy dark:text-oc-gold-light hidden sm:block ml-4 lg:ml-0">
            {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
          </h2>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {currentUser && (
              <>
                {isMainAdmin && (
                  <button 
                    onClick={() => setActivePage('admin')}
                    className={`relative px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs border ${
                      activePage === 'admin' 
                        ? 'bg-oc-gold text-oc-navy border-oc-gold shadow-md font-extrabold' 
                        : 'bg-oc-gold/10 hover:bg-oc-gold/20 text-oc-navy dark:text-oc-gold border-oc-gold/20'
                    }`}
                    title="Admin Controls"
                  >
                    <Shield size={15} className="text-oc-gold shrink-0" />
                    <span className="hidden sm:inline">Admin Controls</span>
                    {pendingVerificationsCount > 0 && (
                      <span className="bg-red-500 text-white font-black text-[9px] px-1.5 py-0.2 rounded-full animate-pulse">
                        {pendingVerificationsCount}
                      </span>
                    )}
                  </button>
                )}

                <button 
                  onClick={() => setShowMyBookingsModal(true)}
                  className="relative px-3 py-1.5 rounded-xl bg-oc-gold/10 hover:bg-oc-gold/20 text-oc-navy dark:text-oc-gold transition-all flex items-center gap-1.5 font-bold text-xs border border-oc-gold/20"
                  title="My Booked Discovery Calls & Meetings"
                >
                  <CalendarDays size={16} className="text-oc-gold" />
                  <span className="hidden sm:inline">Bookings</span>
                  {appointments.filter(a => (a.hostEmail === currentUser.email || a.bookerEmail === currentUser.email) && a.status === 'Scheduled').length > 0 && (
                    <span className="bg-oc-gold text-oc-navy font-black text-[9px] px-1.5 py-0.2 rounded-full">
                      {appointments.filter(a => (a.hostEmail === currentUser.email || a.bookerEmail === currentUser.email) && a.status === 'Scheduled').length}
                    </span>
                  )}
                </button>
              </>
            )}
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-xl hover:bg-oc-gold/10 text-gray-500 hover:text-oc-navy dark:hover:text-oc-gold transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle dark/light mode"
            >
              {isDarkMode ? <Sun size={20} className="text-oc-gold" /> : <Moon size={20} className="text-oc-navy" />}
            </button>
            <div className="h-8 w-px bg-oc-gold/10 mx-2 hidden sm:block" />
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-oc-navy dark:text-white">
                {currentUser?.bizName || currentUser?.name || currentUser?.email}
              </div>
              <div className="text-[10px] text-oc-gold font-medium uppercase tracking-wider">
                {currentUser?.role}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-28 lg:pb-8 max-w-6xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activePage === 'about' && (
                <div className="max-w-4xl mx-auto space-y-12 py-10">
                  <div className="text-center space-y-4">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-20 h-20 bg-oc-gold/20 rounded-3xl mx-auto flex items-center justify-center text-oc-gold mb-6"
                    >
                      <Globe size={40} />
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-oc-navy dark:text-oc-gold-light tracking-tight">
                      Empowering the Professional Landscape
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-200 max-w-2xl mx-auto font-medium">
                      Online Corporate is the definitive digital ecosystem designed to unify the workspace of tomorrow.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-oc-navy p-10 rounded-[2.5rem] border border-oc-gold/10 shadow-sm space-y-6">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Award size={24} />
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-oc-navy dark:text-white">Our Mission</h3>
                      <p className="text-gray-600 dark:text-gray-200 leading-relaxed font-normal">
                        To bridge the gap between talent and corporate excellence through a seamless, AI-verified professional ecosystem. We provide the tools for businesses to discover growth and for individuals to build undeniable legacies.
                      </p>
                    </div>

                    <div className="bg-white dark:bg-oc-navy p-10 rounded-[2.5rem] border border-oc-gold/10 shadow-sm space-y-6">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <ShieldCheck size={24} />
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-oc-navy dark:text-white">Our Vision</h3>
                      <p className="text-gray-600 dark:text-gray-200 leading-relaxed font-normal">
                        To be the global standard for professional identification and corporate networking. We envision a world where trust is algorithmic, opportunities are meritocratic, and every professional interaction creates measurable value.
                      </p>
                    </div>
                  </div>

                  {/* Creators Section */}
                  <div className="bg-white dark:bg-oc-navy p-8 md:p-10 rounded-[2.5rem] border border-oc-gold/20 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-oc-gold/10 pb-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-oc-gold font-bold text-xs uppercase tracking-widest">
                          <UserCheck size={16} />
                          <span>Leadership & Architecture</span>
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-oc-navy dark:text-white">
                          Platform Creators &amp; Visionaries
                        </h3>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-oc-gold/10 text-oc-gold border border-oc-gold/20 uppercase tracking-wider">
                        Founding Creators
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-200 leading-relaxed font-medium">
                      Online Corporate was conceptualized, designed, and developed by three lead innovators—<strong className="text-oc-navy dark:text-oc-gold-light">Aturinda Adriel</strong>, <strong className="text-oc-navy dark:text-oc-gold-light">Atwakiire Borice</strong>, and <strong className="text-oc-navy dark:text-oc-gold-light">Abenaitwe Linus</strong>—to pioneer an all-in-one digital workspace for career growth, business networking, and verified professional identification.
                    </p>

                    <div className="grid sm:grid-cols-3 gap-6 pt-2">
                      <div className="p-6 rounded-2xl bg-oc-cream/60 dark:bg-oc-navy-mid border border-oc-gold/20 flex flex-col items-center text-center gap-3 hover:border-oc-gold/50 transition-all">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-oc-gold to-amber-300 text-oc-navy font-serif font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                          AA
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-oc-navy dark:text-white">Aturinda Adriel</h4>
                          <p className="text-xs font-semibold text-oc-gold uppercase tracking-wider mt-1">Co-Creator &amp; Product Architect</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Platform Strategy &amp; Product Operations</p>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-oc-cream/60 dark:bg-oc-navy-mid border border-oc-gold/20 flex flex-col items-center text-center gap-3 hover:border-oc-gold/50 transition-all">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-oc-gold to-amber-300 text-oc-navy font-serif font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                          AB
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-oc-navy dark:text-white">Atwakiire Borice</h4>
                          <p className="text-xs font-semibold text-oc-gold uppercase tracking-wider mt-1">Co-Creator &amp; System Strategist</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">System Design &amp; Business Architecture</p>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-oc-cream/60 dark:bg-oc-navy-mid border border-oc-gold/20 flex flex-col items-center text-center gap-3 hover:border-oc-gold/50 transition-all">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-oc-gold to-amber-300 text-oc-navy font-serif font-black text-2xl flex items-center justify-center shadow-md shrink-0">
                          AL
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-oc-navy dark:text-white">Abenaitwe Linus</h4>
                          <p className="text-xs font-semibold text-oc-gold uppercase tracking-wider mt-1">Co-Creator &amp; Lead Engineer</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Core Software &amp; Ecosystem Development</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Copyright & Intellectual Property Protection Notice */}
                  <div className="bg-gradient-to-br from-oc-navy-mid via-oc-navy to-black p-8 md:p-10 rounded-[2.5rem] border-2 border-oc-gold/30 shadow-2xl text-white space-y-6 relative overflow-hidden">
                    <div className="absolute -right-8 -bottom-8 opacity-5 text-oc-gold pointer-events-none">
                      <ShieldAlert size={220} />
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-oc-gold/20 flex items-center justify-center text-oc-gold border border-oc-gold/30 shrink-0">
                          <Copyright size={22} />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-bold text-oc-gold-light">
                            Copyright &amp; Intellectual Property Notice
                          </h3>
                          <p className="text-xs text-gray-300 font-mono">
                            OFFICIAL LEGAL PROTECTION STATEMENT
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-300 border border-red-500/30">
                        All Rights Reserved
                      </span>
                    </div>

                    <div className="space-y-4 text-sm text-gray-200 leading-relaxed relative z-10">
                      <p className="text-base font-semibold text-white">
                        &copy; 2026 Online Corporate. All Rights Reserved. Created by Aturinda Adriel, Atwakiire Borice, and Abenaitwe Linus.
                      </p>
                      <p>
                        All software architecture, source code, visual design, user interfaces, branding assets, graphic design, algorithms, and database systems of <strong className="text-oc-gold">Online Corporate</strong> are the exclusive intellectual property of <strong className="text-white">Aturinda Adriel</strong>, <strong className="text-white">Atwakiire Borice</strong>, and <strong className="text-white">Abenaitwe Linus</strong>.
                      </p>
                      <div className="bg-black/50 p-5 rounded-2xl border border-white/15 text-xs text-gray-200 font-mono leading-relaxed space-y-2 shadow-inner">
                        <p className="text-oc-gold font-bold uppercase tracking-wider">STRICT PROHIBITION &amp; LEGAL NOTICE:</p>
                        <p>
                          Unauthorized copying, reproduction, distribution, reverse engineering, redistribution, modification, hosting, or commercial exploitation of any portion of this software or platform without explicit written consent from the creators (<strong className="text-white">Aturinda Adriel</strong>, <strong className="text-white">Atwakiire Borice</strong> &amp; <strong className="text-white">Abenaitwe Linus</strong>) is strictly prohibited under international copyright laws, trademark protections, and intellectual property rights regulations.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-oc-gold/90 font-mono border-t border-white/10 relative z-10">
                      <span>Ref ID: OC-IP-2026-AAL</span>
                      <span>Platform Creators: Aturinda Adriel, Atwakiire Borice &amp; Abenaitwe Linus</span>
                    </div>
                  </div>

                  <div className="bg-oc-navy dark:bg-oc-gold text-white dark:text-oc-navy p-12 rounded-[3rem] text-center space-y-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <LayoutGrid size={120} />
                    </div>
                    <h3 className="text-3xl font-serif font-bold relative z-10">Ready to join the network?</h3>
                    <p className="text-lg opacity-80 max-w-xl mx-auto font-medium relative z-10">
                      Whether you are an aspiring employee, an established employer, or a visionary business owner, OC Kampala is your stage.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 relative z-10">
                      <button 
                        onClick={() => {
                          if (currentUser) {
                            setActivePage('home');
                          } else {
                            setActivePage('home');
                          }
                        }}
                        className="bg-oc-gold dark:bg-oc-navy text-oc-navy dark:text-oc-gold px-10 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl"
                      >
                        {currentUser ? 'Return to Home' : 'Get Started Now'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activePage === 'home' && (
                <div className="space-y-8">
                  {/* Search bar */}
                  <div className="relative max-w-3xl mx-auto space-y-3">
                    <div className="flex flex-col sm:flex-row items-center bg-white dark:bg-oc-navy-mid border border-oc-gold/20 rounded-3xl sm:rounded-full shadow-lg focus-within:ring-2 focus-within:ring-oc-gold transition-all p-1.5 relative">
                      
                      {/* Custom Filter Selector */}
                      <div className="relative shrink-0 w-full sm:w-auto" ref={searchTypeRef}>
                        <button
                          type="button"
                          onClick={() => setIsSearchTypeOpen(!isSearchTypeOpen)}
                          className="w-full sm:w-auto flex items-center justify-between gap-2.5 bg-oc-cream/80 dark:bg-oc-navy hover:bg-oc-gold/10 dark:hover:bg-oc-gold/10 px-4 py-3 rounded-2xl sm:rounded-l-full sm:rounded-r-none text-xs font-bold text-oc-navy dark:text-oc-gold transition-all border-b sm:border-b-0 sm:border-r border-oc-gold/15"
                        >
                          <div className="flex items-center gap-2">
                            {searchType === 'all' && <Globe size={16} className="text-oc-gold shrink-0" />}
                            {searchType === 'people' && <Users size={16} className="text-oc-gold shrink-0" />}
                            {searchType === 'businesses' && <Building size={16} className="text-oc-gold shrink-0" />}
                            {searchType === 'jobs' && <Briefcase size={16} className="text-oc-gold shrink-0" />}
                            <span className="uppercase tracking-wider font-extrabold">
                              {searchType === 'all' ? 'Everywhere' : searchType === 'people' ? 'People' : searchType === 'businesses' ? 'Businesses' : 'Jobs'}
                            </span>
                          </div>
                          <ChevronDown 
                            size={14} 
                            className={`text-oc-gold transition-transform duration-200 shrink-0 ${isSearchTypeOpen ? 'rotate-180' : ''}`} 
                          />
                        </button>

                        {/* Custom Dropdown Menu */}
                        {isSearchTypeOpen && (
                          <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-oc-navy border border-oc-gold/20 rounded-2xl shadow-2xl p-2 z-50 divide-y divide-oc-gold/5">
                            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Filter Search Category
                            </div>
                            <div className="pt-1.5 space-y-1">
                              {[
                                { id: 'all', label: 'Everywhere', desc: 'Search across people, companies & jobs', icon: Globe, count: usersList.length + jobs.length },
                                { id: 'people', label: 'People', desc: 'Find professionals, employees & members', icon: Users, count: usersList.filter(u => u.role === 'Employee' || u.role === 'Employer').length },
                                { id: 'businesses', label: 'Businesses', desc: 'Discover registered companies & services', icon: Building, count: usersList.filter(u => u.role === 'BusinessOwner').length },
                                { id: 'jobs', label: 'Jobs', desc: 'Browse career & contract opportunities', icon: Briefcase, count: jobs.length },
                              ].map(opt => {
                                const Icon = opt.icon;
                                const isSelected = searchType === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      setSearchType(opt.id as any);
                                      setIsSearchTypeOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${
                                      isSelected 
                                        ? 'bg-oc-gold/15 text-oc-navy dark:text-oc-gold font-bold' 
                                        : 'hover:bg-oc-cream dark:hover:bg-white/5 text-gray-700 dark:text-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected 
                                          ? 'bg-oc-gold text-oc-navy' 
                                          : 'bg-oc-gold/10 text-oc-gold group-hover:bg-oc-gold group-hover:text-oc-navy'
                                      }`}>
                                        <Icon size={16} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold flex items-center gap-1.5">
                                          {opt.label}
                                          <span className="text-[10px] font-normal text-gray-400">({opt.count})</span>
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate font-normal">{opt.desc}</div>
                                      </div>
                                    </div>
                                    {isSelected && <Check size={16} className="text-oc-gold shrink-0 ml-2" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Search Field */}
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-oc-gold/80" size={18} />
                        <input 
                          type="text" 
                          placeholder={
                            searchType === 'people' ? "Search by name, occupation, location..." :
                            searchType === 'businesses' ? "Search by business name, industry..." :
                            searchType === 'jobs' ? "Search by job title, description..." :
                            "Search network for people, businesses, jobs..."
                          }
                          className="w-full bg-transparent border-none py-3.5 pl-12 pr-10 text-sm focus:ring-0 outline-none text-oc-navy dark:text-white placeholder-gray-400"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-oc-gold transition-colors p-1"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Category Filter Chips */}
                    <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                      {[
                        { id: 'all', label: 'Everywhere', icon: Globe },
                        { id: 'people', label: 'People', icon: Users },
                        { id: 'businesses', label: 'Businesses', icon: Building },
                        { id: 'jobs', label: 'Jobs', icon: Briefcase },
                      ].map(chip => {
                        const ChipIcon = chip.icon;
                        const active = searchType === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setSearchType(chip.id as any)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold transition-all text-xs ${
                              active 
                                ? 'bg-oc-gold text-oc-navy font-bold shadow-md scale-105' 
                                : 'bg-white/70 dark:bg-oc-navy-mid/70 text-gray-600 dark:text-gray-300 hover:bg-oc-gold/15 hover:text-oc-gold border border-oc-gold/10'
                            }`}
                          >
                            <ChipIcon size={12} />
                            <span>{chip.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-oc-navy border border-oc-gold/20 rounded-3xl shadow-2xl overflow-hidden z-50">
                        <div className="p-3 border-b border-oc-gold/5 bg-oc-cream/20 flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            Search Results in <span className="text-oc-gold">{searchType}</span>
                          </span>
                          <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-red-400 p-1">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto">
                          {searchResults.length > 0 ? searchResults.map((res: any, idx: number) => (
                            <button 
                              key={res.id || res.email || idx}
                              onClick={() => {
                                if (res.type === 'job') {
                                  setApplyingForJob(res);
                                  setActivePage('jobs');
                                } else {
                                  setViewingProfile(res);
                                }
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-4 p-4 hover:bg-oc-gold/5 text-left border-b last:border-0 border-oc-gold/5 transition-colors group"
                            >
                              <div className="shrink-0">
                                {res.type === 'job' ? (
                                  <div className="w-10 h-10 bg-oc-gold/10 rounded-xl flex items-center justify-center text-oc-gold group-hover:bg-oc-gold group-hover:text-oc-navy transition-colors">
                                    <Briefcase size={20} />
                                  </div>
                                ) : (
                                  <img src={res.photo || res.logo || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-xl object-cover border border-oc-gold/10" alt="" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm flex items-center gap-2 truncate">
                                  {res.type === 'job' ? res.title : (res.bizName || res.name)}
                                  {res.type !== 'job' && (
                                    <span className="flex items-center gap-0.5 text-oc-gold text-[10px]">
                                      <Star size={8} fill="currentColor" />
                                      {calcRating(res.ratings)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                  <Badge className="bg-oc-gold/5 text-[9px] px-1.5 py-0">
                                    {res.type === 'job' ? res.type : res.role}
                                  </Badge>
                                  <span className="truncate">
                                    {res.type === 'job' ? (res.posterName + ' • ' + res.location) : (res.speciality || res.occupation || res.location)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-gray-300 group-hover:text-oc-gold transition-colors">
                                <Search size={14} />
                              </div>
                            </button>
                          )) : (
                            <div className="p-8 text-center">
                              <div className="text-gray-300 mb-2 flex justify-center"><Search size={32} /></div>
                              <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Trending Businesses */}
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-serif font-bold">Trending Businesses</h3>
                      <Badge className="bg-oc-gold/10 text-oc-gold">
                        {usersList.filter(u => u.role === 'BusinessOwner').length}
                      </Badge>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                      {usersList.filter(u => u.role === 'BusinessOwner').map(u => (
                        <motion.div 
                          whileHover={{ y: -4 }}
                          key={u.email}
                          onClick={() => setViewingProfile(u)}
                          className="flex-shrink-0 w-48 bg-oc-navy p-5 rounded-2xl border border-oc-gold/15 cursor-pointer relative overflow-hidden group shadow-lg"
                        >
                          <div className="absolute top-0 right-0 p-3 opacity-10 text-oc-gold-light group-hover:opacity-20 transition-opacity">
                            <Building size={64} />
                          </div>
                          <img src={u.logo || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1 mb-4 border border-white/10" alt="" />
                          <div className="text-white font-bold text-sm mb-1 truncate flex items-center gap-1.5">
                            <span className="truncate">{u.bizName}</span>
                            {hasTrustedBadge(u) && (
                              <span title="Trusted Badge • Documents Authorized">
                                <ShieldCheck size={13} className="text-oc-gold shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-oc-gold-light text-[10px] uppercase font-medium">{u.speciality || 'Professional'}</div>
                            <div className="flex items-center gap-0.5 text-oc-gold font-bold text-[10px]">
                              <Star size={8} fill="currentColor" />
                              {calcRating(u.ratings)}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>

                  {/* Directory / Grid */}
                  <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Simplified Member Feed */}
                    {filteredDirectory.map((u: User) => (
                      <div 
                        key={u.email}
                        onClick={() => setViewingProfile(u)}
                        className="bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/5 hover:border-oc-gold/20 shadow-sm transition-all text-left flex gap-4 cursor-pointer"
                      >
                        <img src={u.photo || u.logo || 'https://via.placeholder.com/60'} className="w-16 h-16 rounded-xl object-cover" alt="" />
                        <div className="min-w-0 flex-1">
                          <Badge className={
                            u.role === 'BusinessOwner' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            u.role === 'Employer' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-oc-gold/10 text-oc-gold'
                          }>
                            {u.role}
                          </Badge>
                          <div className="flex items-center gap-1 text-oc-gold font-bold text-[10px] ml-auto float-right">
                            <Star size={10} fill="currentColor" />
                            <span>{calcRating(u.ratings)}</span>
                          </div>
                          <div className="font-bold text-sm mt-2 truncate text-oc-navy dark:text-white flex items-center gap-1.5">
                            <span className="truncate">{u.bizName || u.name}</span>
                            {hasTrustedBadge(u) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0" title="Trusted Badge • Documents Authorized">
                                <ShieldCheck size={10} /> Trusted
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{u.speciality || u.occupation || u.email}</div>
                          {u.openToWork && u.role === 'Employee' && (
                            <div className="text-[9px] text-green-600 font-bold uppercase mt-1 flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-green-500" />
                              Open to Work
                            </div>
                          )}
                          <div className="mt-2.5 pt-2 border-t border-oc-gold/10 flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-semibold truncate max-w-[90px]">
                              {u.location || 'Kampala'}
                            </span>
                            {currentUser && currentUser.email !== u.email && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBookingTarget(u);
                                  setBookingTopic('15-min Discovery Call');
                                  const tomorrow = new Date();
                                  tomorrow.setDate(tomorrow.getDate() + 1);
                                  setBookingDate(tomorrow.toISOString().split('T')[0]);
                                  setBookingTimeSlot('10:00 AM - 10:30 AM');
                                  setBookingNotes('');
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-oc-gold/10 hover:bg-oc-gold hover:text-oc-navy text-oc-gold rounded-lg text-[10px] font-extrabold transition-all"
                              >
                                <CalendarDays size={12} />
                                <span>Book Call</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </section>
                </div>
              )}

              {activePage === 'jobs' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-serif font-bold">Job Board</h2>
                      <p className="text-xs text-gray-500 mt-1">{filteredJobs.length} positions available</p>
                    </div>
                    {(currentUser?.role === 'BusinessOwner' || currentUser?.role === 'Employer') && (
                      <button 
                        onClick={() => setShowJobModal(true)}
                        className="bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg"
                      >
                        <Plus size={18} />
                        Post a Job
                      </button>
                    )}
                  </div>

                  {/* Filters Toolbar */}
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                      <div className="flex bg-oc-cream dark:bg-white/5 p-1 rounded-xl border border-oc-gold/5 w-full md:w-auto">
                        {['all', 'fulltime', 'parttime', 'remote', 'contract'].map(type => (
                          <button
                            key={type}
                            onClick={() => setJobTypeFilter(type)}
                            className={`flex-1 md:flex-none px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all capitalize ${jobTypeFilter === type ? 'bg-oc-navy text-oc-gold shadow-sm' : 'text-gray-500'}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                      <div className="relative flex-1 w-full">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-oc-gold/40" size={16} />
                        <input 
                          type="text" 
                          placeholder="Filter by location (e.g. Kampala)" 
                          className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-oc-gold transition-all"
                          value={jobLocationFilter}
                          onChange={e => setJobLocationFilter(e.target.value)}
                        />
                        {jobLocationFilter && (
                          <button 
                            onClick={() => setJobLocationFilter('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-oc-navy"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {searchHistory.length > 0 && (
                      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0 ml-1">Recent Searches:</span>
                        {searchHistory.map(h => (
                          <button 
                            key={h.id}
                            onClick={() => { setJobTypeFilter(h.type); setJobLocationFilter(h.location); }}
                            className="flex-shrink-0 px-3 py-1 bg-white dark:bg-white/5 border border-oc-gold/10 rounded-full text-[10px] font-bold text-oc-navy dark:text-oc-gold/70 hover:bg-oc-gold hover:text-white dark:hover:text-oc-navy transition-all"
                          >
                            {h.type === 'all' ? 'Any' : h.type} {h.location && `in ${h.location}`}
                          </button>
                        ))}
                        <button 
                          onClick={clearSearchHistory}
                          className="text-[10px] font-bold text-red-400/60 hover:text-red-500 px-2 uppercase tracking-tighter"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4">
                    {filteredJobs.length > 0 ? filteredJobs.map(job => (
                      <div key={job.id} className="bg-white dark:bg-oc-navy border border-oc-gold/5 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-bold text-oc-navy dark:text-white mb-1">{job.title}</h3>
                            <div className="text-oc-gold font-medium flex items-center gap-2 text-sm">
                              {job.posterName}
                              <Badge className="bg-oc-gold/10 text-oc-gold capitalize">{job.type}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-4 text-xs text-gray-500">
                            {job.location && <div className="flex items-center gap-1"><MapPin size={14} /> {job.location}</div>}
                            {job.salary && <div className="flex items-center gap-1"><DollarSign size={14} /> {job.salary}</div>}
                            <div className="flex items-center gap-1"><Calendar size={14} /> {job.time}</div>
                          </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{job.desc}</p>
                        <div className="mt-6 flex items-center justify-between border-t border-oc-gold/5 pt-4">
                          <button 
                            onClick={() => setApplyingForJob(job)}
                            className="bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-all shadow-md"
                          >
                            Apply Now →
                          </button>
                          {currentUser?.email === job.posterEmail && (
                            <button 
                              onClick={() => setJobs(jobs.filter(j => j.id !== job.id))}
                              className="text-red-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-oc-gold/20">
                        <Briefcase className="mx-auto text-oc-gold/40 mb-3" size={48} />
                        <p className="text-gray-500 font-medium">
                          {jobs.length === 0 ? "No jobs posted yet" : "No jobs match your filters"}
                        </p>
                        {(jobTypeFilter !== 'all' || jobLocationFilter) && (
                          <button 
                            onClick={() => { setJobTypeFilter('all'); setJobLocationFilter(''); }}
                            className="mt-4 text-oc-gold font-bold text-xs hover:underline"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activePage === 'messages' && (
                <div className="bg-white dark:bg-oc-navy border border-oc-gold/10 rounded-2xl h-[calc(100vh-13.5rem)] lg:h-[calc(100vh-9.5rem)] min-h-[460px] flex overflow-hidden shadow-xl relative isolate">
                  {/* Threads */}
                  <div className={`w-full sm:w-80 shrink-0 border-r border-oc-gold/10 flex flex-col bg-white dark:bg-oc-navy ${activeConversation ? 'hidden sm:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-oc-gold/10 bg-oc-cream/20 shrink-0">
                      <h3 className="font-serif font-bold text-lg">Conversations</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {(() => {
                        const myEmail = currentUser?.email?.trim().toLowerCase() || '';
                        const myThreadKeys = Object.keys(messages).filter(k => {
                          if (!myEmail) return false;
                          const parts = k.split('::').map(e => e.trim().toLowerCase());
                          return parts.includes(myEmail);
                        }).sort((a, b) => {
                          const lastA = messages[a]?.[messages[a].length - 1]?.time || 0;
                          const lastB = messages[b]?.[messages[b].length - 1]?.time || 0;
                          return lastB - lastA;
                        });

                        if (myThreadKeys.length === 0) {
                          return (
                            <div className="p-8 text-center text-gray-500">
                              <MessageSquare className="mx-auto mb-3 opacity-20" size={32} />
                              <p className="text-xs">Select a member from the directory to start a conversation</p>
                            </div>
                          );
                        }

                        return myThreadKeys.map(key => {
                          const parts = key.split('::').map(e => e.trim().toLowerCase());
                          const otherEmail = parts.find(e => e !== myEmail) || '';
                          const otherUser = otherEmail ? users[otherEmail] : null;
                          const threadMsgs = messages[key] || [];
                          const lastMsg = threadMsgs[threadMsgs.length - 1];
                          const unreadCount = threadMsgs.filter(m => (m.from || '').trim().toLowerCase() !== myEmail && !m.read).length;

                          return (
                            <button
                              key={key}
                              onClick={() => {
                                setActiveConversation(otherEmail || null);
                                if (otherEmail) markThreadAsRead(otherEmail);
                              }}
                              className={`w-full text-left p-4 border-b border-oc-gold/5 hover:bg-oc-gold/5 transition-all flex gap-3 items-center ${activeConversation?.trim().toLowerCase() === otherEmail ? 'bg-oc-gold/10' : ''}`}
                            >
                              <img 
                                src={otherUser?.photo || otherUser?.logo || getFallbackAvatar(otherUser?.name || otherUser?.bizName || otherEmail)} 
                                className="w-10 h-10 rounded-full object-cover shrink-0 border border-oc-gold/10" 
                                alt="" 
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                  <div className="font-bold text-sm truncate">{otherUser?.name || otherUser?.bizName || otherEmail}</div>
                                  <div className="text-[9px] text-gray-400 whitespace-nowrap ml-2">
                                    {lastMsg ? new Date(lastMsg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 truncate flex justify-between items-center">
                                  <span className={unreadCount > 0 ? 'font-bold text-oc-navy dark:text-white' : ''}>
                                    {lastMsg?.text || 'No messages'}
                                  </span>
                                  {unreadCount > 0 && (
                                    <span className="bg-oc-gold text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-2">
                                      {unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Current Thread */}
                  <div className={`flex-1 min-w-0 flex flex-col bg-oc-cream/10 dark:bg-oc-navy-mid/10 ${!activeConversation ? 'hidden sm:flex' : 'flex'}`}>
                    {activeConversation ? (
                      <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white dark:bg-oc-navy border-b border-oc-gold/5 flex items-center gap-3 shrink-0">
                          <button 
                            className="sm:hidden p-2 -ml-2 text-gray-500" 
                            onClick={() => setActiveConversation(null)}
                          >
                            <X size={20} />
                          </button>
                          <img 
                            src={users[activeConversation]?.photo || users[activeConversation]?.logo || getFallbackAvatar(users[activeConversation]?.name || users[activeConversation]?.bizName || activeConversation)} 
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-oc-gold/10" 
                            alt="" 
                          />
                          <div className="flex-1">
                            <div className="font-bold text-sm">{users[activeConversation]?.name || users[activeConversation]?.bizName || activeConversation}</div>
                            <div className="text-[10px] text-green-500 font-medium">Online</div>
                          </div>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                          {(() => {
                            const myEmail = currentUser?.email?.trim().toLowerCase() || '';
                            const cleanActive = (activeConversation || '').trim().toLowerCase();
                            const threadKey = myEmail && cleanActive ? [myEmail, cleanActive].sort().join('::') : '';
                            const currentThread = threadKey ? (messages[threadKey] || []) : [];

                            return (
                              <>
                                {currentThread.length === 0 && (
                                  <div className="text-center py-12 text-gray-400 space-y-3">
                                    <div className="w-14 h-14 rounded-2xl bg-oc-gold/10 text-oc-gold flex items-center justify-center mx-auto">
                                      <MessageSquare size={24} />
                                    </div>
                                    <h4 className="font-bold text-sm text-oc-navy dark:text-oc-gold-light">
                                      Start chatting with {users[activeConversation]?.name || users[activeConversation]?.bizName || activeConversation}
                                    </h4>
                                    <p className="text-xs text-gray-400 max-w-xs mx-auto">
                                      Messages sent here are synced in real-time across both of your accounts and devices.
                                    </p>
                                  </div>
                                )}

                                {currentThread.map((m: any, idx: number) => {
                                  const isMine = (m.from || '').trim().toLowerCase() === myEmail;
                                  return (
                                    <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm ${
                                        isMine 
                                          ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy rounded-tr-none shadow-sm' 
                                          : 'bg-white dark:bg-oc-navy border border-oc-gold/10 rounded-tl-none shadow-sm text-oc-navy dark:text-white'
                                      }`}>
                                        <div className="leading-relaxed break-words whitespace-pre-wrap">{m.text}</div>
                                        <div className={`text-[9px] mt-1.5 flex items-center justify-end gap-1 opacity-70 ${isMine ? 'text-oc-gold dark:text-oc-navy' : 'text-gray-400'}`}>
                                          <span>{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          {isMine && (
                                            <span title={m.read ? "Read" : "Delivered"}>
                                              {m.read ? "✓✓" : "✓"}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            );
                          })()}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Footer */}
                        <div className="p-4 bg-white dark:bg-oc-navy border-t border-oc-gold/5">
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (messageInput.trim()) {
                                sendMessage(activeConversation, messageInput.trim());
                                setMessageInput('');
                              }
                            }}
                            className="flex gap-2"
                          >
                            <input 
                              type="text" 
                              placeholder="Type your message... (Enter to send)" 
                              className="flex-1 bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-oc-gold outline-none text-oc-navy dark:text-white"
                              value={messageInput}
                              onChange={e => setMessageInput(e.target.value)}
                            />
                            <button 
                              type="submit"
                              disabled={!messageInput.trim()}
                              className="bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy p-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <Send size={20} />
                            </button>
                          </form>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-40 text-center">
                        <MessageSquare size={80} className="mb-4 text-oc-gold" />
                        <div className="text-xl font-serif font-bold">Your Messages</div>
                        <p className="text-sm mt-1">Select a conversation from the sidebar to chat</p>
                        <button 
                          onClick={() => setActivePage('home')}
                          className="mt-6 text-oc-gold font-bold text-sm hover:underline"
                        >
                          Find people to chat with
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activePage === 'community' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Share Box */}
                  <div className="bg-white dark:bg-oc-navy border border-oc-gold/10 rounded-2xl p-6 shadow-sm">
                    <div className="flex gap-4">
                      <img src={currentUser?.photo || currentUser?.logo || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover" alt="" />
                      <div className="flex-1">
                        <textarea 
                          placeholder="Share a professional update or insight..." 
                          className="w-full bg-oc-cream dark:bg-white/5 order-none rounded-xl p-4 text-sm focus:ring-1 focus:ring-oc-gold outline-none h-24 transition-all"
                          value={postContent}
                          onChange={e => setPostContent(e.target.value)}
                        />
                        {postImage && (
                          <div className="mt-4 relative inline-block">
                            <img src={postImage} className="max-h-48 rounded-xl border border-oc-gold/20" alt="Preview" />
                            <button onClick={() => setPostImage(null)} className="absolute -top-2 -right-2 bg-red-400 text-white p-1 rounded-full shadow-lg">
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        <div className="mt-4 flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-oc-gold cursor-pointer transition-all">
                            <Camera size={16} />
                            Add Photo
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => setPostImage(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <button 
                            disabled={!postContent.trim() || isSubmittingPost}
                            onClick={() => {
                              setIsSubmittingPost(true);
                              addCommunityPost(postContent, postImage || undefined);
                              setPostContent('');
                              setPostImage(null);
                              setIsSubmittingPost(false);
                            }}
                            className="bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy px-6 py-2 rounded-xl text-xs font-bold shadow-lg disabled:opacity-50"
                          >
                            Post to Feed
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feed */}
                  <div className="space-y-6">
                    {communityPosts.length > 0 ? communityPosts.map(post => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={post.id} 
                        className="bg-white dark:bg-oc-navy border border-oc-gold/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <img src={post.authorPhoto || 'https://via.placeholder.com/40'} className="w-10 h-10 rounded-full object-cover border border-oc-gold/10" alt="" />
                            <div className="flex-1">
                              <div className="font-bold text-sm">{post.authorName}</div>
                              <div className="text-[10px] text-gray-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">@{post.authorEmail.split('@')[0]} • {new Date(post.timestamp).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
                          {post.image && (
                            <img src={post.image} className="mt-4 w-full rounded-xl object-cover border border-oc-gold/5" alt="Post" />
                          )}
                          <div className="mt-6 pt-4 border-t border-oc-gold/5 flex items-center gap-6">
                            <button 
                              onClick={() => likePost(post.id)}
                              className={`flex items-center gap-2 text-xs font-bold transition-all ${post.likes.includes(currentUser?.email || '') ? 'text-oc-gold' : 'text-gray-400 hover:text-oc-gold'}`}
                            >
                              <ThumbsUp size={16} fill={post.likes.includes(currentUser?.email || '') ? 'currentColor' : 'none'} />
                              {post.likes.length} Likes
                            </button>
                            <button 
                              onClick={() => {
                                if (post.authorEmail === currentUser?.email) return;
                                setActiveConversation(post.authorEmail);
                                setActivePage('messages');
                              }}
                              className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-oc-gold transition-all"
                            >
                              <MessageSquare size={16} />
                              Reply
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-24 bg-white/5 rounded-3xl border border-dashed border-oc-gold/20">
                        <Globe className="mx-auto text-oc-gold/20 mb-4" size={64} />
                        <h3 className="text-lg font-serif font-bold text-oc-gold/60">Community Feed is Quiet</h3>
                        <p className="text-gray-500 text-sm">Be the first to share an update with the network!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activePage === 'events' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-oc-navy dark:text-oc-gold">Professional Events</h2>
                      <p className="text-sm text-gray-500">Workshops, webinars, and networking meetups.</p>
                    </div>
                    {currentUser?.role === 'BusinessOwner' && (
                      <button 
                        onClick={() => setShowAddEventModal(true)}
                        className="bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy px-6 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2"
                      >
                        <Plus size={16} />
                        Host Event
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.length > 0 ? events.map(event => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={event.id} 
                        className="bg-white dark:bg-oc-navy border border-oc-gold/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group"
                      >
                        <div className="aspect-video bg-oc-navy-mid relative overflow-hidden">
                          {event.image ? (
                            <img src={event.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-oc-gold/20">
                              <CalendarDays size={48} />
                            </div>
                          )}
                          <div className="absolute top-4 left-4 bg-oc-gold text-oc-navy text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                            {event.type}
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="text-[10px] text-oc-gold font-bold uppercase mb-2">{event.date} • {event.location}</div>
                          <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                          <p className="text-xs text-gray-500 line-clamp-2 mb-4">{event.description}</p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-oc-gold/5">
                            <div className="flex -space-x-2">
                              {event.attendees.slice(0, 3).map(a => (
                                <div key={a} className="w-6 h-6 rounded-full border border-oc-navy bg-oc-gold/20 flex items-center justify-center text-[8px] font-bold text-oc-gold">
                                  {a.charAt(0).toUpperCase()}
                                </div>
                              ))}
                              {event.attendees.length > 3 && (
                                <div className="w-6 h-6 rounded-full border border-oc-navy bg-oc-gold/10 flex items-center justify-center text-[8px] font-bold text-gray-400">
                                  +{event.attendees.length - 3}
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={() => joinEvent(event.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${event.attendees.includes(currentUser?.email || '') ? 'bg-green-500/10 text-green-500' : 'bg-oc-gold/10 text-oc-gold hover:bg-oc-gold hover:text-oc-navy'}`}
                            >
                              {event.attendees.includes(currentUser?.email || '') ? '✓ Registered' : 'Register Now'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="col-span-full text-center py-24 bg-white/5 rounded-3xl border border-dashed border-oc-gold/20">
                        <CalendarDays className="mx-auto text-oc-gold/20 mb-4" size={64} />
                        <h3 className="text-lg font-serif font-bold text-oc-gold/60">No upcoming events</h3>
                        <p className="text-gray-500 text-sm">Stay tuned for workshops and webinars from the community.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activePage === 'applications' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-oc-navy dark:text-oc-gold">Job Applications</h2>
                      <p className="text-sm text-gray-500">
                        {currentUser?.role === 'Employee' 
                          ? 'Track your professional journey and application statuses.' 
                          : 'Manage incoming talent and update recruitment progress.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6">
                    {/* Filter for Employers could be added here if needed */}
                    
                    {(() => {
                      const displayedApps = currentUser?.role === 'Employee' 
                        ? applications.filter(a => a.candidateEmail === currentUser.email)
                        : applications.filter(a => a.employerEmail === currentUser.email);

                      if (displayedApps.length === 0) {
                        return (
                          <div className="text-center py-24 bg-white/5 rounded-3xl border border-dashed border-oc-gold/20">
                            <CheckCircle className="mx-auto text-oc-gold/20 mb-4" size={64} />
                            <h3 className="text-lg font-serif font-bold text-oc-gold/60">No applications found</h3>
                            <p className="text-gray-500 text-sm">
                              {currentUser?.role === 'Employee' 
                                ? "You haven't applied for any jobs yet." 
                                : "No candidates have applied for your postings yet."}
                            </p>
                            {currentUser?.role === 'Employee' && (
                              <button 
                                onClick={() => setActivePage('jobs')}
                                className="mt-6 bg-oc-gold text-oc-navy px-6 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-all"
                              >
                                Browse Jobs
                              </button>
                            )}
                          </div>
                        );
                      }

                      return displayedApps.map(app => (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={app.id} 
                          className="bg-white dark:bg-oc-navy border border-oc-gold/10 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-6"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {currentUser?.role === 'Employee' ? (
                              <div className="w-12 h-12 bg-oc-gold/10 rounded-xl flex items-center justify-center text-oc-gold">
                                <Briefcase size={24} />
                              </div>
                            ) : (
                              <img src={app.candidatePhoto || 'https://via.placeholder.com/48'} className="w-12 h-12 rounded-xl object-cover border border-oc-gold/20" alt="" />
                            )}
                            <div>
                              <h4 className="font-bold text-oc-navy dark:text-white truncate">{app.jobTitle}</h4>
                              <p className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                                <span>{currentUser?.role === 'Employee' ? 'Sent to Business' : `Candidate: ${app.candidateName}`}</span>
                                {currentUser?.role !== 'Employee' && users[app.candidateEmail] && hasTrustedBadge(users[app.candidateEmail]) && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25" title="Trusted Badge • Documents Authorized">
                                    <ShieldCheck size={10} /> Trusted
                                  </span>
                                )}
                              </p>
                              <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">
                                Applied: {new Date(app.appliedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col md:items-end gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Status:</span>
                              <Badge className={
                                app.status === 'Applied' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                app.status === 'Under Review' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                app.status === 'Interviewing' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                app.status === 'Offered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }>
                                {app.status}
                              </Badge>
                            </div>
                            
                            {(currentUser?.role === 'Employer' || currentUser?.role === 'BusinessOwner') && app.employerEmail === currentUser.email && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(['Applied', 'Under Review', 'Interviewing', 'Offered', 'Rejected'] as any[]).map(s => (
                                  <button
                                    key={s}
                                    onClick={() => updateApplicationStatus(app.id, s)}
                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${app.status === s ? 'bg-oc-navy text-oc-gold' : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-oc-navy'}`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-oc-gold/5 pt-4 md:pt-0 md:pl-6">
                            <button 
                              onClick={() => {
                                const targetEmail = currentUser?.role === 'Employee' ? app.employerEmail : app.candidateEmail;
                                setActivePage('messages');
                                setActiveConversation(targetEmail);
                              }}
                              className="p-2 text-oc-gold hover:bg-oc-gold/10 rounded-lg transition-colors"
                              title="Message Candidate/Employer"
                            >
                              <MessageSquare size={18} />
                            </button>
                            {currentUser?.role !== 'Employee' && (
                              <button 
                                onClick={() => setViewingProfile(users[app.candidateEmail])}
                                className="p-2 text-oc-gold hover:bg-oc-gold/10 rounded-lg transition-colors"
                                title="View Candidate Profile"
                              >
                                <UserCircle size={18} />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {activePage === 'notifications' && (
                <div className="bg-white dark:bg-oc-navy border border-oc-gold/5 rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-6 border-b border-oc-gold/5 flex items-center justify-between">
                    <h2 className="text-xl font-serif font-bold">All Notifications</h2>
                    <button 
                      onClick={() => markNotifsRead()}
                      className="text-sm text-gray-500 hover:text-oc-gold"
                    >
                      Clear all
                    </button>
                  </div>
                  <div>
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-6 border-b last:border-0 border-oc-gold/5 flex gap-4 items-start ${!notif.read ? 'bg-oc-gold/5' : ''}`}>
                          <div className={`p-3 rounded-xl ${
                            notif.type === 'msg' ? 'bg-blue-100 text-blue-600' :
                            notif.type === 'job' ? 'bg-green-100 text-green-600' :
                            'bg-oc-gold/10 text-oc-gold'
                          }`}>
                            {notif.type === 'msg' ? <MessageSquare size={20} /> : <Bell size={20} />}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold">{notif.text}</div>
                            {notif.sub && <div className="text-xs text-gray-500 mt-1">{notif.sub}</div>}
                            <div className="text-[10px] text-gray-400 mt-2">{new Date(notif.time).toLocaleString()}</div>
                          </div>
                          {!notif.read && <div className="w-2 h-2 rounded-full bg-oc-gold mt-2" />}
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center text-gray-500">No notifications yet</div>
                    )}
                  </div>
                </div>
              )}

              {/* ADMIN CONTROLS VIEW */}
              {activePage === 'admin' && (
                !isMainAdmin ? (
                  <div className="max-w-md mx-auto my-12 bg-white dark:bg-oc-navy p-8 rounded-3xl border border-red-500/30 text-center space-y-4 shadow-xl">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                      <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-oc-navy dark:text-white">Access Restricted</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      The Admin Control Center is strictly reserved for the master administrator account (<strong className="text-oc-navy dark:text-oc-gold">adrielaturinda4@gmail.com</strong>).
                    </p>
                    <button
                      onClick={() => setActivePage('home')}
                      className="px-6 py-2.5 bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold rounded-xl text-xs hover:bg-oc-navy-mid transition-all shadow"
                    >
                      Return to Home
                    </button>
                  </div>
                ) : (
                <div className="space-y-8 max-w-6xl mx-auto">
                  {/* Admin Header & System Status Banner */}
                  <div className="bg-gradient-to-r from-oc-navy via-slate-900 to-oc-navy text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/20 relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-oc-gold/5 rounded-l-full blur-2xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-oc-gold text-oc-navy font-black text-[10px] uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-sm">
                            <Shield size={12} /> Admin Control Center
                          </span>
                          <span className="px-2.5 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" /> System Operational
                          </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-oc-gold-light">
                          Platform Management & Moderation
                        </h1>
                        <p className="text-xs text-gray-300 max-w-xl">
                          Review identity verifications, manage member accounts, moderate job & community listings, and dispatch platform announcements.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setAdminTab('broadcast')}
                          className="px-4 py-2.5 bg-oc-gold text-oc-navy font-bold rounded-2xl text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <Send size={15} />
                          Broadcast System Message
                        </button>
                        
                        <span className="px-3.5 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-2xl text-xs font-bold flex items-center gap-2">
                          <Shield size={15} /> Sole Master Administrator
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metric Overview Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white dark:bg-oc-navy p-5 rounded-2xl border border-oc-gold/10 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-gray-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Members</span>
                        <Users size={18} className="text-oc-gold" />
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-black text-oc-navy dark:text-white">{Object.keys(users).length}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Registered user accounts</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-oc-navy p-5 rounded-2xl border border-amber-500/20 shadow-sm flex flex-col justify-between relative overflow-hidden">
                      {pendingVerificationsCount > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-full animate-pulse" />}
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Pending ID Reviews</span>
                        <ShieldAlert size={18} />
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingVerificationsCount}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Documents waiting</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-oc-navy p-5 rounded-2xl border border-blue-500/20 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-blue-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Verified Badges</span>
                        <ShieldCheck size={18} />
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                          {(Object.values(users) as User[]).filter(u => u.isVerified).length}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Verified members</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-oc-navy p-5 rounded-2xl border border-oc-gold/10 shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between text-gray-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Active Jobs</span>
                        <Briefcase size={18} className="text-oc-gold" />
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-black text-oc-navy dark:text-white">{jobs.length}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{announcements.length} announcements</div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-oc-navy p-5 rounded-2xl border border-oc-gold/10 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
                      <div className="flex items-center justify-between text-gray-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Community Posts</span>
                        <Globe size={18} className="text-oc-gold" />
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-black text-oc-navy dark:text-white">{communityPosts.length}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{events.length} hosted events</div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Navigation Tabs */}
                  <div className="flex items-center gap-2 border-b border-oc-gold/15 pb-2 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => setAdminTab('verifications')}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        adminTab === 'verifications'
                          ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-lg font-black'
                          : 'bg-white dark:bg-oc-navy text-gray-500 hover:text-oc-navy dark:hover:text-white border border-oc-gold/10'
                      }`}
                    >
                      <ShieldCheck size={16} />
                      Identity Verifications
                      {pendingVerificationsCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          {pendingVerificationsCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setAdminTab('users')}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        adminTab === 'users'
                          ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-lg font-black'
                          : 'bg-white dark:bg-oc-navy text-gray-500 hover:text-oc-navy dark:hover:text-white border border-oc-gold/10'
                      }`}
                    >
                      <Users size={16} />
                      User Accounts ({Object.keys(users).length})
                    </button>

                    <button
                      onClick={() => setAdminTab('jobs')}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        adminTab === 'jobs'
                          ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-lg font-black'
                          : 'bg-white dark:bg-oc-navy text-gray-500 hover:text-oc-navy dark:hover:text-white border border-oc-gold/10'
                      }`}
                    >
                      <Briefcase size={16} />
                      Jobs & Announcements ({jobs.length + announcements.length})
                    </button>

                    <button
                      onClick={() => setAdminTab('community')}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        adminTab === 'community'
                          ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-lg font-black'
                          : 'bg-white dark:bg-oc-navy text-gray-500 hover:text-oc-navy dark:hover:text-white border border-oc-gold/10'
                      }`}
                    >
                      <Globe size={16} />
                      Community & Events ({communityPosts.length + events.length})
                    </button>

                    <button
                      onClick={() => setAdminTab('broadcast')}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                        adminTab === 'broadcast'
                          ? 'bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-lg font-black'
                          : 'bg-white dark:bg-oc-navy text-gray-500 hover:text-oc-navy dark:hover:text-white border border-oc-gold/10'
                      }`}
                    >
                      <Bell size={16} />
                      System Broadcast
                    </button>
                  </div>

                  {/* TAB 1: IDENTITY VERIFICATION QUEUE */}
                  {adminTab === 'verifications' && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10">
                        <div>
                          <h3 className="text-base font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                            National Document Submissions Review
                          </h3>
                          <p className="text-xs text-gray-500">
                            Inspect uploaded National IDs, Passports, or Business Licenses to approve or decline verification badges.
                          </p>
                        </div>
                      </div>

                      {(Object.values(users) as User[]).filter(u => u.verificationPending || u.verificationDoc || u.isVerified).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(Object.values(users) as User[])
                            .filter(u => u.verificationPending || u.verificationDoc || u.isVerified)
                            .map(u => (
                              <div key={u.email} className="bg-white dark:bg-oc-navy rounded-2xl border border-oc-gold/10 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-oc-gold/10 overflow-hidden flex items-center justify-center shrink-0 border border-oc-gold/20">
                                      {u.photo || u.logo ? (
                                        <img src={u.photo || u.logo} alt={u.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="font-serif font-bold text-oc-gold text-lg">
                                          {(u.name || u.bizName || u.email).charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <h4 className="font-serif font-bold text-sm text-oc-navy dark:text-white">
                                          {u.name || u.bizName || u.email}
                                        </h4>
                                        {u.isVerified && <CheckCircle size={14} className="text-blue-500 shrink-0" />}
                                      </div>
                                      <p className="text-xs text-gray-500">{u.email}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge className="bg-oc-gold/10 text-oc-gold">{u.role || 'Member'}</Badge>
                                        {u.country && <span className="text-[10px] text-gray-400">{u.country}</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    {u.isVerified ? (
                                      <span className="px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-[10px] font-bold rounded-full flex items-center gap-1">
                                        <CheckCircle size={12} /> Verified Member
                                      </span>
                                    ) : u.verificationPending ? (
                                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-full flex items-center gap-1 animate-pulse">
                                        <Clock size={12} /> Pending Review
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 bg-gray-500/10 text-gray-500 text-[10px] font-bold rounded-full">
                                        Unverified
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="p-3 bg-oc-cream/50 dark:bg-white/5 rounded-xl border border-oc-gold/10 space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 font-medium">Document Type:</span>
                                    <strong className="text-oc-navy dark:text-oc-gold">{u.verificationType || 'National ID / Passport'}</strong>
                                  </div>
                                  {u.verificationReason && (
                                    <div className="text-[11px] text-gray-500 italic border-t border-oc-gold/5 pt-1.5">
                                      "{u.verificationReason}"
                                    </div>
                                  )}
                                </div>

                                <div className="pt-2 border-t border-oc-gold/10 flex items-center justify-between gap-3">
                                  {u.verificationDoc ? (
                                    <button
                                      onClick={() => setAdminDocPreview({ user: u })}
                                      className="px-3 py-1.5 bg-oc-gold/10 hover:bg-oc-gold/20 text-oc-gold rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                    >
                                      <Eye size={14} /> Inspect Image
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 italic">No image file attached</span>
                                  )}

                                  <div className="flex items-center gap-2">
                                    {!u.isVerified ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            toggleUserVerified(u.email, true, 'Approved by Platform Administrator');
                                          }}
                                          className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-bold shadow hover:bg-green-700 transition-all flex items-center gap-1"
                                        >
                                          <Check size={14} /> Approve
                                        </button>
                                        <button
                                          onClick={() => {
                                            setDeclineReasonModal({ email: u.email, name: u.name || u.email });
                                            setDeclineReasonInput('');
                                          }}
                                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                        >
                                          <X size={14} /> Decline
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          if (confirm(`Revoke verified badge for ${u.name || u.email}?`)) {
                                            toggleUserVerified(u.email, false, 'Verified badge revoked by Administrator');
                                          }
                                        }}
                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all"
                                      >
                                        Revoke Badge
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="p-12 text-center bg-white dark:bg-oc-navy rounded-2xl border border-oc-gold/10 space-y-3">
                          <ShieldCheck size={48} className="mx-auto text-oc-gold/40" />
                          <h3 className="text-lg font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                            No Verification Submissions
                          </h3>
                          <p className="text-xs text-gray-500 max-w-md mx-auto">
                            Uploaded national identity documents from members will appear here for review.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: USER DIRECTORY & ROLES */}
                  {adminTab === 'users' && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10">
                        <div className="relative flex-1 max-w-md">
                          <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search users by name, email, or country..."
                            value={adminSearchQuery}
                            onChange={e => setAdminSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-oc-cream/60 dark:bg-white/5 rounded-xl text-xs outline-none border border-oc-gold/15 text-oc-navy dark:text-white"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Filter size={14} className="text-oc-gold" />
                          <span className="text-xs font-bold text-gray-500">Role:</span>
                          <select
                            value={adminRoleFilter}
                            onChange={e => setAdminRoleFilter(e.target.value as any)}
                            className="bg-oc-cream/60 dark:bg-white/5 border border-oc-gold/15 rounded-xl px-3 py-2 text-xs outline-none text-oc-navy dark:text-white font-bold"
                          >
                            <option value="all">All Roles</option>
                            <option value="Employee">Employee / Candidate</option>
                            <option value="Employer">Employer</option>
                            <option value="BusinessOwner">Business Owner</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-oc-navy rounded-2xl border border-oc-gold/10 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-oc-cream/80 dark:bg-white/5 uppercase text-[10px] font-bold text-gray-500 border-b border-oc-gold/10">
                              <tr>
                                <th className="p-4">User Details</th>
                                <th className="p-4">Role & Location</th>
                                <th className="p-4">Badges & Permissions</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-oc-gold/5">
                              {(Object.values(users) as User[])
                                .filter(u => {
                                  const matchesSearch = !adminSearchQuery || 
                                    (u.name || '').toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                                    (u.bizName || '').toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                                    u.email.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
                                    (u.country || '').toLowerCase().includes(adminSearchQuery.toLowerCase());
                                  const matchesRole = adminRoleFilter === 'all' || u.role === adminRoleFilter;
                                  return matchesSearch && matchesRole;
                                })
                                .map(u => (
                                  <tr key={u.email} className="hover:bg-oc-gold/5 transition-colors">
                                    <td className="p-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-oc-gold/10 overflow-hidden flex items-center justify-center shrink-0 border border-oc-gold/20">
                                          {u.photo || u.logo ? (
                                            <img src={u.photo || u.logo} alt={u.name} className="w-full h-full object-cover" />
                                          ) : (
                                            <span className="font-bold text-oc-gold text-xs">
                                              {(u.name || u.bizName || u.email).charAt(0).toUpperCase()}
                                            </span>
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-bold text-oc-navy dark:text-white flex items-center gap-1">
                                            {u.name || u.bizName || u.email}
                                            {u.isVerified && <CheckCircle size={13} className="text-blue-500 shrink-0" />}
                                          </div>
                                          <div className="text-[11px] text-gray-400">{u.email}</div>
                                        </div>
                                      </div>
                                    </td>

                                    <td className="p-4">
                                      <Badge className="bg-oc-gold/10 text-oc-gold mb-1 inline-block">{u.role || 'Member'}</Badge>
                                      <div className="text-[11px] text-gray-500">{u.country || 'Location not set'}</div>
                                    </td>

                                    <td className="p-4 space-y-1">
                                      <div className="flex flex-wrap gap-1">
                                        {u.isVerified && (
                                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold rounded-md">
                                            Verified
                                          </span>
                                        )}
                                        {u.isAdmin && (
                                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-bold rounded-md">
                                            Admin
                                          </span>
                                        )}
                                        {u.openToWork && (
                                          <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] font-bold rounded-md">
                                            Open To Work
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="p-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => toggleUserVerified(u.email, !u.isVerified)}
                                          className={`p-2 rounded-xl transition-all ${
                                            u.isVerified 
                                              ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20' 
                                              : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-blue-500'
                                          }`}
                                          title={u.isVerified ? "Revoke Verified Badge" : "Grant Verified Badge"}
                                        >
                                          <ShieldCheck size={16} />
                                        </button>

                                        {u.email.toLowerCase() === 'adrielaturinda4@gmail.com' && (
                                          <span className="p-2 bg-purple-500/10 text-purple-500 rounded-xl" title="Sole Master Administrator">
                                            <Shield size={16} />
                                          </span>
                                        )}

                                        <button
                                          onClick={() => setViewingProfile(u)}
                                          className="p-2 bg-oc-gold/10 text-oc-gold hover:bg-oc-gold/20 rounded-xl transition-all"
                                          title="View Full Profile"
                                        >
                                          <Eye size={16} />
                                        </button>

                                        <button
                                          onClick={() => {
                                            if (confirm(`Are you sure you want to delete the account for ${u.email}?`)) {
                                              deleteUser(u.email);
                                            }
                                          }}
                                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all"
                                          title="Delete Account"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: JOBS & ANNOUNCEMENTS MODERATION */}
                  {adminTab === 'jobs' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10">
                            <div>
                              <h3 className="font-serif font-bold text-base text-oc-navy dark:text-oc-gold-light">
                                Posted Jobs ({jobs.length})
                              </h3>
                              <p className="text-xs text-gray-500">Manage active job listings</p>
                            </div>
                          </div>

                          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {jobs.length > 0 ? (
                              jobs.map(job => (
                                <div key={job.id} className="bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10 shadow-sm flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-oc-gold/10 text-oc-gold">{job.type}</Badge>
                                      <span className="text-[10px] text-gray-400">{job.time}</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-oc-navy dark:text-white">{job.title}</h4>
                                    <p className="text-xs text-gray-500">{job.posterName} • {job.location}</p>
                                    {job.salary && <p className="text-[11px] font-bold text-oc-gold">{job.salary}</p>}
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (confirm(`Remove job listing "${job.title}"?`)) {
                                        deleteJob(job.id);
                                      }
                                    }}
                                    className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all shrink-0"
                                    title="Delete Job"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-gray-500 bg-white dark:bg-oc-navy rounded-2xl border border-oc-gold/10 text-xs">
                                No job listings posted yet.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10">
                            <div>
                              <h3 className="font-serif font-bold text-base text-oc-navy dark:text-oc-gold-light">
                                Announcements ({announcements.length})
                              </h3>
                              <p className="text-xs text-gray-500">Public hiring & candidate notices</p>
                            </div>
                          </div>

                          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {announcements.length > 0 ? (
                              announcements.map(ann => (
                                <div key={ann.id} className="bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10 shadow-sm flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-oc-gold/10 text-oc-gold">{ann.type}</Badge>
                                      <span className="text-[10px] text-gray-400">{ann.time}</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-oc-navy dark:text-white">{ann.title}</h4>
                                    <p className="text-xs text-gray-500">{ann.posterName} ({ann.posterEmail})</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{ann.desc}</p>
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete announcement "${ann.title}"?`)) {
                                        deleteAnnouncement(ann.id);
                                      }
                                    }}
                                    className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all shrink-0"
                                    title="Delete Announcement"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-gray-500 bg-white dark:bg-oc-navy rounded-2xl border border-oc-gold/10 text-xs">
                                No announcements posted yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: COMMUNITY & EVENTS MODERATION */}
                  {adminTab === 'community' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10">
                            <h3 className="font-serif font-bold text-base text-oc-navy dark:text-oc-gold-light">
                              Community Feed Posts ({communityPosts.length})
                            </h3>
                            <p className="text-xs text-gray-500">Moderate member feed activity</p>
                          </div>

                          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {communityPosts.length > 0 ? (
                              communityPosts.map(post => (
                                <div key={post.id} className="bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10 shadow-sm space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="font-bold text-xs text-oc-navy dark:text-white">{post.authorName}</div>
                                    <button
                                      onClick={() => {
                                        if (confirm("Delete this community post?")) {
                                          deleteCommunityPost(post.id);
                                        }
                                      }}
                                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                      title="Delete Post"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-300">{post.content}</p>
                                  {post.image && (
                                    <img src={post.image} alt="Attachment" className="w-full h-32 object-cover rounded-xl mt-2" />
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-gray-500 bg-white dark:bg-oc-navy rounded-2xl border border-oc-gold/10 text-xs">
                                No community posts found.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10">
                            <h3 className="font-serif font-bold text-base text-oc-navy dark:text-oc-gold-light">
                              Professional Events & Webinars ({events.length})
                            </h3>
                            <p className="text-xs text-gray-500">Manage hosted workshops & meetups</p>
                          </div>

                          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                            {events.length > 0 ? (
                              events.map(e => (
                                <div key={e.id} className="bg-white dark:bg-oc-navy p-4 rounded-2xl border border-oc-gold/10 shadow-sm flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-oc-gold/10 text-oc-gold">{e.type}</Badge>
                                      <span className="text-[10px] text-gray-400">{e.date}</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-oc-navy dark:text-white">{e.title}</h4>
                                    <p className="text-xs text-gray-500">Host: {e.hostName} • {e.attendees.length} Attendees</p>
                                  </div>

                                  <button
                                    onClick={() => {
                                      if (confirm(`Delete event "${e.title}"?`)) {
                                        deleteEvent(e.id);
                                      }
                                    }}
                                    className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-all shrink-0"
                                    title="Delete Event"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-gray-500 bg-white dark:bg-oc-navy rounded-2xl border border-oc-gold/10 text-xs">
                                No events created yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: BROADCAST SYSTEM */}
                  {adminTab === 'broadcast' && (
                    <div className="bg-white dark:bg-oc-navy rounded-3xl p-8 border border-oc-gold/10 shadow-lg space-y-6 max-w-2xl mx-auto">
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-oc-gold/10 flex items-center justify-center text-oc-gold">
                          <Bell size={24} />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                          Dispatch Platform Broadcast
                        </h3>
                        <p className="text-xs text-gray-500">
                          Send an instant notification message to all {Object.keys(users).length} registered member accounts.
                        </p>
                      </div>

                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          if (!broadcastTitle || !broadcastMessage) {
                            alert("Please enter both a title and message.");
                            return;
                          }
                          broadcastNotification(broadcastTitle, broadcastMessage);
                          alert(`Broadcast dispatched to ${Object.keys(users).length} users!`);
                          setBroadcastTitle('');
                          setBroadcastMessage('');
                        }}
                        className="space-y-4"
                      >
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">Notification Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Platform Update: Verified Member Badge Standards"
                            value={broadcastTitle}
                            onChange={e => setBroadcastTitle(e.target.value)}
                            className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl p-3.5 text-xs outline-none text-oc-navy dark:text-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">Message Content</label>
                          <textarea
                            required
                            placeholder="Write the announcement or update to dispatch..."
                            value={broadcastMessage}
                            onChange={e => setBroadcastMessage(e.target.value)}
                            className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl p-3.5 text-xs outline-none h-28 text-oc-navy dark:text-white"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold py-4 rounded-xl shadow-xl hover:scale-[1.01] transition-all text-xs flex items-center justify-center gap-2"
                        >
                          <Send size={16} /> Send Broadcast to All Members
                        </button>
                      </form>
                    </div>
                  )}
                </div>
                )
              )}

              {activePage === 'card' && currentUser && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-serif font-bold text-oc-navy dark:text-oc-gold-light italic">Identity Card</h2>
                    <div className="flex items-center gap-2">
                      {!isEditingProfile ? (
                        <button 
                          onClick={startEditing}
                          className="flex items-center gap-2 px-4 py-2 bg-oc-gold/10 text-oc-gold rounded-xl text-xs font-bold hover:bg-oc-gold/20 transition-all border border-oc-gold/20"
                        >
                          <Settings size={14} />
                          Edit Profile
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsEditingProfile(false)}
                            className="px-4 py-2 text-gray-500 text-xs font-bold hover:text-oc-navy transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSaveProfile}
                            className="px-6 py-2 bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy rounded-xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
                          >
                            Save Changes
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-oc-navy border border-oc-gold/5 rounded-2xl overflow-hidden shadow-xl">
                    <div className="h-24 bg-gradient-to-r from-oc-navy to-oc-navy-mid relative">
                      <div className="absolute -bottom-12 left-8 p-1 bg-white dark:bg-oc-navy rounded-2xl border border-oc-gold/20 group relative overflow-hidden">
                        <img 
                          src={isEditingProfile ? (editForm.photo || editForm.logo || 'https://via.placeholder.com/100') : (currentUser.photo || currentUser.logo || 'https://via.placeholder.com/100')} 
                          className="w-24 h-24 rounded-xl object-cover shadow-lg transition-all group-hover:opacity-75" 
                          alt="Profile" 
                        />
                        {isEditingProfile && (
                          <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                            <Camera size={20} className="mb-1" />
                            <span className="text-[10px] font-bold">Change</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    const base64String = reader.result as string;
                                    setEditForm({ ...editForm, photo: base64String, logo: base64String });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="pt-16 p-8">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          {isEditingProfile ? (
                            <div className="space-y-4">
                              <div>
                                <label className="text-[10px] text-oc-gold uppercase font-bold tracking-wider mb-1 block">Full Name / Business Name</label>
                                <input 
                                  type="text"
                                  className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl px-4 py-2 text-oc-navy dark:text-white font-bold outline-none focus:ring-1 focus:ring-oc-gold"
                                  value={editForm.name || editForm.bizName}
                                  onChange={e => setEditForm({...editForm, name: e.target.value, bizName: e.target.value})}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="text-2xl font-serif font-bold text-oc-navy dark:text-white">
                                {currentUser.bizName || currentUser.name}
                              </h3>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge className="bg-oc-gold/10 text-oc-gold">{currentUser.role}</Badge>
                                {currentUser.openToWork && <Badge className="bg-green-100 text-green-600">Open to Work</Badge>}
                                <div className="flex items-center gap-1 text-oc-gold font-bold text-xs ml-2">
                                  <Star size={12} fill="currentColor" />
                                  <span>{calcRating(currentUser.ratings)}</span>
                                  <span className="text-[10px] text-gray-400 font-normal">({currentUser.ratings?.length || 0})</span>
                                </div>
                                {hasTrustedBadge(currentUser) ? (
                                  <button
                                    type="button"
                                    onClick={() => setShowCertificateModal(currentUser)}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-500/15 via-oc-gold/20 to-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 hover:border-amber-500 hover:shadow-sm transition-all cursor-pointer shadow-sm group"
                                    title="Official Trusted Badge • Documents Authorized (Click to view certificate)"
                                  >
                                    <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                                    <span>Trusted Badge</span>
                                    <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">Docs Authorized</span>
                                    <BadgeCheck size={12} className="text-oc-gold ml-0.5" />
                                  </button>
                                ) : currentUser.verificationPending ? (
                                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                    <Clock size={12} className="animate-pulse text-amber-500" />
                                    <span>Trusted Badge: Pending Authorization</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button 
                                      type="button"
                                      onClick={() => setShowUnlockBadgeRequirementModal(true)}
                                      className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-white/5 hover:bg-amber-500/10 text-gray-500 dark:text-gray-400 hover:text-amber-700 dark:hover:text-amber-300 rounded-full border border-dashed border-gray-300 dark:border-gray-700 hover:border-amber-500/40 text-[11px] font-semibold transition-all cursor-pointer group"
                                      title="Click to learn how to get the Trusted Badge"
                                    >
                                      <Lock size={12} className="text-gray-400 group-hover:text-amber-500" />
                                      <span>Trusted Badge: Locked</span>
                                      <span className="text-[10px] text-gray-400 group-hover:text-amber-600">(Requires Docs)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowProfileVerificationForm(true)}
                                      className="px-2.5 py-1 bg-oc-gold/15 hover:bg-oc-gold/25 text-oc-gold text-[10px] font-bold rounded-full border border-oc-gold/30 transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <ShieldCheck size={11} /> Authorize Docs
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {!isEditingProfile && (
                          <div className="bg-oc-cream dark:bg-white/5 py-2 px-4 rounded-xl text-center border border-oc-gold/10">
                            <div className="text-xl font-bold">{currentUser.views}</div>
                            <div className="text-[10px] text-gray-500 uppercase font-medium">Profile Views</div>
                          </div>
                        )}
                      </div>

                      <div className="mt-8 space-y-6">
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="text-[10px] text-oc-gold uppercase font-bold tracking-wider">Occupation</label>
                            {isEditingProfile ? (
                              <input 
                                type="text"
                                className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-oc-gold mt-1"
                                value={editForm.occupation}
                                onChange={e => setEditForm({...editForm, occupation: e.target.value})}
                              />
                            ) : (
                              <p className="font-medium">{currentUser.occupation || 'Not specified'}</p>
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] text-oc-gold uppercase font-bold tracking-wider">Location</label>
                            {isEditingProfile ? (
                              <input 
                                type="text"
                                className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-oc-gold mt-1"
                                value={editForm.location}
                                onChange={e => setEditForm({...editForm, location: e.target.value})}
                              />
                            ) : (
                              <p className="font-medium">{currentUser.location || 'Not specified'}</p>
                            )}
                          </div>
                          {currentUser.role === 'BusinessOwner' && (
                            <>
                              <div>
                                <label className="text-[10px] text-oc-gold uppercase font-bold tracking-wider">Industry</label>
                                {isEditingProfile ? (
                                  <input 
                                    type="text"
                                    className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-oc-gold mt-1"
                                    value={editForm.industry}
                                    onChange={e => setEditForm({...editForm, industry: e.target.value})}
                                    placeholder="e.g. Technology, Retail"
                                  />
                                ) : (
                                  <p className="font-medium">{currentUser.industry || 'Not specified'}</p>
                                )}
                              </div>
                              <div>
                                <label className="text-[10px] text-oc-gold uppercase font-bold tracking-wider">Website</label>
                                {isEditingProfile ? (
                                  <input 
                                    type="url"
                                    className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-oc-gold mt-1"
                                    value={editForm.website}
                                    onChange={e => setEditForm({...editForm, website: e.target.value})}
                                    placeholder="https://example.com"
                                  />
                                ) : (
                                  <p className="font-medium">{currentUser.website || 'Not specified'}</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="pt-6 border-t border-oc-gold/5">
                          <label className="text-[10px] text-oc-gold uppercase font-bold tracking-wider">About</label>
                          {isEditingProfile ? (
                            <textarea 
                              className="w-full h-32 bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-oc-gold mt-1 resize-none"
                              value={editForm.description}
                              onChange={e => setEditForm({...editForm, description: e.target.value})}
                              placeholder="Tell us about yourself or your business..."
                            />
                          ) : (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {currentUser.description || 'No description provided yet.'}
                            </p>
                          )}
                        </div>

                        <div className="pt-6 border-t border-oc-gold/5">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] text-oc-gold uppercase font-bold tracking-wider">Professional Resume / CV</label>
                            {!isEditingProfile && currentUser.resumeContent && (
                              <Badge className="bg-oc-navy/5 text-oc-navy dark:bg-white/5 dark:text-white-400 text-[8px]">Formal Document</Badge>
                            )}
                          </div>
                          {isEditingProfile ? (
                            <textarea 
                              className="w-full h-48 bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-oc-gold mt-1 font-mono"
                              value={editForm.resumeContent}
                              onChange={e => setEditForm({...editForm, resumeContent: e.target.value})}
                              placeholder="List your work experience, education, and skills in detail..."
                            />
                          ) : (
                            <div className="mt-1 p-4 bg-oc-cream/30 dark:bg-white/5 rounded-xl border border-oc-gold/5">
                              {currentUser.resumeContent ? (
                                <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed italic">
                                  {currentUser.resumeContent}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400 italic">No resume content added yet. Add it by clicking Edit Profile.</p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-6 border-t border-oc-gold/5">
                          <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] text-oc-gold uppercase font-bold tracking-wider">Showcase Your Work (Portfolio)</label>
                            <button 
                              onClick={() => setIsAddingPortfolio(true)}
                              className="bg-oc-gold text-oc-navy px-3 py-1 rounded-lg text-[10px] font-black uppercase text-oc-gold-shadow transition-all hover:scale-105"
                            >
                              + Add Item
                            </button>
                          </div>
                          
                          {isAddingPortfolio && (
                            <div className="bg-oc-gold/5 p-4 rounded-xl border border-oc-gold/20 mb-4 space-y-3">
                              <input 
                                className="w-full bg-white dark:bg-white/5 border border-oc-gold/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-oc-gold"
                                placeholder="Project Title"
                                value={newPortfolioItem.title}
                                onChange={e => setNewPortfolioItem({...newPortfolioItem, title: e.target.value})}
                              />
                              <textarea 
                                className="w-full bg-white dark:bg-white/5 border border-oc-gold/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-oc-gold h-16 resize-none"
                                placeholder="Short description..."
                                value={newPortfolioItem.description}
                                onChange={e => setNewPortfolioItem({...newPortfolioItem, description: e.target.value})}
                              />
                              <input 
                                className="w-full bg-white dark:bg-white/5 border border-oc-gold/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-oc-gold"
                                placeholder="Link (optional)"
                                value={newPortfolioItem.link}
                                onChange={e => setNewPortfolioItem({...newPortfolioItem, link: e.target.value})}
                              />
                              <div className="flex items-center gap-2">
                                <label className="flex-1 bg-white dark:bg-white/10 px-3 py-2 rounded-lg border border-dashed border-oc-gold/20 text-[10px] font-bold text-center cursor-pointer hover:bg-oc-gold/5 transition-all">
                                  {newPortfolioItem.image ? '✓ Image Selected' : '📁 Upload Preview Image'}
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setNewPortfolioItem({...newPortfolioItem, image: reader.result as string});
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                                <button 
                                  onClick={() => {
                                    if (!newPortfolioItem.title) return;
                                    const item: PortfolioItem = { 
                                      id: Date.now().toString(),
                                      title: newPortfolioItem.title,
                                      description: newPortfolioItem.description,
                                      image: newPortfolioItem.image,
                                      link: newPortfolioItem.link
                                    };
                                    const updatedPortfolio = [...(currentUser.portfolio || []), item];
                                    updateCurrentUser({ portfolio: updatedPortfolio });
                                    setNewPortfolioItem({ title: '', description: '', link: '', image: '' });
                                    setIsAddingPortfolio(false);
                                  }}
                                  className="bg-oc-navy text-oc-gold dark:bg-oc-gold dark:text-oc-navy px-4 py-2 rounded-lg text-[10px] font-black uppercase"
                                >
                                  Save Item
                                </button>
                                <button 
                                  onClick={() => setIsAddingPortfolio(false)}
                                  className="text-gray-400 text-[10px] uppercase font-bold hover:text-red-400 px-2"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {(currentUser.portfolio || []).map(p => (
                              <div key={p.id} className="group relative rounded-xl overflow-hidden aspect-video bg-oc-navy border border-oc-gold/10">
                                {p.image ? (
                                  <img src={p.image} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-oc-gold/20">
                                    <LayoutGrid size={24} />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                                  <div className="text-[10px] font-bold text-white uppercase truncate">{p.title}</div>
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        const updated = (currentUser.portfolio || []).filter(item => item.id !== p.id);
                                        updateCurrentUser({ portfolio: updated });
                                      }}
                                      className="p-1 px-2 bg-red-500/20 text-red-400 rounded-md text-[8px] font-black hover:bg-red-500 hover:text-white transition-all"
                                    >
                                      DELETE
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {currentUser.role === 'BusinessOwner' && (
                          <div className="pt-6 border-t border-oc-gold/5">
                            <div className="flex items-center justify-between mb-4">
                              <label className="text-[10px] text-oc-gold uppercase font-bold tracking-wider">Company Management</label>
                              <div className="flex bg-oc-cream dark:bg-white/5 p-1 rounded-lg border border-oc-gold/10">
                                <button 
                                  onClick={() => setHierarchyView('table')}
                                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${hierarchyView === 'table' ? 'bg-oc-navy text-oc-gold' : 'text-gray-500'}`}
                                >
                                  LIST
                                </button>
                                <button 
                                  onClick={() => setHierarchyView('chart')}
                                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${hierarchyView === 'chart' ? 'bg-oc-navy text-oc-gold' : 'text-gray-500'}`}
                                >
                                  CHART
                                </button>
                              </div>
                            </div>

                            <div className="flex gap-2 mb-6">
                              <input 
                                type="email" 
                                placeholder="Employee email address" 
                                value={staffEmailInput}
                                onChange={e => setStaffEmailInput(e.target.value)}
                                className="flex-1 bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-oc-gold"
                              />
                              <button 
                                onClick={addStaffMember}
                                className="bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                              >
                                Add
                              </button>
                            </div>

                            <div className="space-y-3">
                              {hierarchyView === 'table' ? (
                                (currentUser.staff && currentUser.staff.length > 0) ? currentUser.staff.map(m => (
                                  <div key={m.email} className="flex items-center justify-between bg-white dark:bg-white/5 p-4 rounded-2xl border border-oc-gold/5 shadow-sm">
                                    <div className="min-w-0">
                                      <div className="text-sm font-bold truncate">{m.name}</div>
                                      <div className="text-[10px] text-gray-500 truncate">{m.email}</div>
                                      <div className="mt-1 flex gap-1 items-center">
                                        <Badge className="bg-oc-gold/10 text-oc-gold lowercase text-[9px]">{m.post || 'unassigned'}</Badge>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => setAssigningStaff({ email: m.email, name: m.name })}
                                        className="p-2 text-oc-gold hover:bg-oc-gold/10 rounded-lg transition-colors"
                                        title="Assign Post"
                                      >
                                        <Briefcase size={16} />
                                      </button>
                                      <button 
                                        onClick={() => removeStaffMember(m.email)}
                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        title="Remove Staff"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                )) : (
                                  <div className="text-center py-8 border-2 border-dashed border-oc-gold/10 rounded-2xl">
                                    <Users className="mx-auto text-oc-gold/20 mb-2" size={32} />
                                    <p className="text-xs text-gray-500">No staff members added yet</p>
                                  </div>
                                )
                              ) : (
                                <div className="p-8 bg-oc-navy-mid/30 rounded-3xl text-center border border-oc-gold/10 overflow-x-auto no-scrollbar shadow-inner">
                                  <div className="inline-flex flex-col items-center">
                                    <div className="relative">
                                      <div className="bg-oc-gold text-oc-navy px-6 py-3 rounded-2xl font-black text-sm shadow-xl border-2 border-oc-gold/50 flex flex-col items-center gap-1">
                                        <Building size={16} />
                                        {currentUser.bizName}
                                        <div className="text-[7px] opacity-70 tracking-widest font-black uppercase">Founder & CEO</div>
                                      </div>
                                      <div className="absolute top-1/2 -right-16 translate-y-[-50%] bg-oc-gold/10 px-2 py-1 rounded-lg border border-oc-gold/20 text-[8px] font-bold text-oc-gold whitespace-nowrap">
                                        {currentUser.staff?.length || 0} Members
                                      </div>
                                    </div>
                                    <div className="h-10 w-0.5 bg-gradient-to-b from-oc-gold/80 to-oc-gold/20" />
                                    <div className="relative">
                                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] h-0.5 bg-oc-gold/20" />
                                      <div className="flex gap-4 pt-4 px-4">
                                        {(currentUser.staff || []).map(m => (
                                          <div key={m.email} className="flex flex-col items-center min-w-[100px] relative">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-4 w-0.5 bg-oc-gold/20" />
                                            <div className="bg-white/5 border border-oc-gold/30 p-3 rounded-xl text-white shadow-lg backdrop-blur-sm group hover:border-oc-gold transition-all">
                                              <div className="text-[10px] font-bold truncate max-w-[120px]">{m.name}</div>
                                              <div className="text-[8px] text-oc-gold uppercase font-black tracking-tighter mt-1">{m.post || 'OFFICER'}</div>
                                              <div className="mt-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                  onClick={() => setAssigningStaff({ email: m.email, name: m.name })}
                                                  className="p-1 px-2 bg-oc-gold/10 text-oc-gold rounded text-[7px] font-bold hover:bg-oc-gold hover:text-oc-navy"
                                                >
                                                  ROLE
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        {(currentUser.staff || []).length === 0 && (
                                          <div className="text-[10px] text-gray-500 italic py-4">No structural connections found. Add staff above to build your chart.</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        className="mt-8 w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/30 text-oc-navy dark:text-oc-gold-light font-bold py-3 rounded-xl hover:bg-oc-gold hover:text-white dark:hover:bg-oc-gold dark:hover:text-oc-navy transition-all flex items-center justify-center gap-2"
                        onClick={() => setShowSetupModal(true)}
                      >
                        Edit Information
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav 
          aria-label="Mobile Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#0E1726]/95 backdrop-blur-md border-t border-oc-gold/15 py-1.5 px-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
          style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => { setActivePage('home'); setIsSidebarOpen(false); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activePage === 'home'
                ? 'text-oc-navy dark:text-oc-gold font-bold scale-105'
                : 'text-gray-400 hover:text-oc-navy dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${activePage === 'home' ? 'bg-oc-gold/15 text-oc-gold' : ''}`}>
              <HomeIcon size={19} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
          </button>

          <button
            onClick={() => { setActivePage('jobs'); setIsSidebarOpen(false); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activePage === 'jobs'
                ? 'text-oc-navy dark:text-oc-gold font-bold scale-105'
                : 'text-gray-400 hover:text-oc-navy dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${activePage === 'jobs' ? 'bg-oc-gold/15 text-oc-gold' : ''}`}>
              <Briefcase size={19} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Jobs</span>
          </button>

          <button
            onClick={() => { setActivePage('community'); setIsSidebarOpen(false); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activePage === 'community'
                ? 'text-oc-navy dark:text-oc-gold font-bold scale-105'
                : 'text-gray-400 hover:text-oc-navy dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg ${activePage === 'community' ? 'bg-oc-gold/15 text-oc-gold' : ''}`}>
              <Globe size={19} />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Feed</span>
          </button>

          <button
            onClick={() => { setActivePage('messages'); setIsSidebarOpen(false); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl relative transition-all cursor-pointer ${
              activePage === 'messages'
                ? 'text-oc-navy dark:text-oc-gold font-bold scale-105'
                : 'text-gray-400 hover:text-oc-navy dark:hover:text-white'
            }`}
          >
            <div className={`p-1 rounded-lg relative ${activePage === 'messages' ? 'bg-oc-gold/15 text-oc-gold' : ''}`}>
              <MessageSquare size={19} />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Chat</span>
          </button>

          {currentUser ? (
            <button
              onClick={() => { setActivePage('card'); setIsSidebarOpen(false); }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                activePage === 'card'
                  ? 'text-oc-navy dark:text-oc-gold font-bold scale-105'
                  : 'text-gray-400 hover:text-oc-navy dark:hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-lg ${activePage === 'card' ? 'bg-oc-gold/15 text-oc-gold' : ''}`}>
                <UserCircle size={19} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">Card</span>
            </button>
          ) : (
            <button
              onClick={() => { setActivePage('about'); setIsSidebarOpen(false); }}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                activePage === 'about'
                  ? 'text-oc-navy dark:text-oc-gold font-bold scale-105'
                  : 'text-gray-400 hover:text-oc-navy dark:hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-lg ${activePage === 'about' ? 'bg-oc-gold/15 text-oc-gold' : ''}`}>
                <Building size={19} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">About</span>
            </button>
          )}
        </nav>
      </div>

      {/* --- Modals --- */}
      
      {/* Profile Viewer */}
      <AnimatePresence>
        {viewingProfile && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingProfile(null)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-oc-navy rounded-3xl overflow-hidden shadow-2xl border border-oc-gold/10 max-h-[92vh] overflow-y-auto"
            >
              <div className="h-32 bg-oc-navy-mid" />
              <div className="px-8 pb-8 relative">
                <div className="absolute -top-12 left-8 p-1 bg-white dark:bg-oc-navy rounded-2xl">
                  <img src={viewingProfile.photo || viewingProfile.logo || 'https://via.placeholder.com/100'} className="w-24 h-24 rounded-xl object-cover shadow-lg" alt="" />
                </div>
                <div className="pt-16">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-serif font-bold dark:text-white">{viewingProfile.bizName || viewingProfile.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge className="bg-oc-gold/10 text-oc-gold">{viewingProfile.role}</Badge>
                        {viewingProfile.openToWork && <Badge className="bg-green-100 text-green-600">Open to Work</Badge>}
                        {hasTrustedBadge(viewingProfile) ? (
                          <button
                            type="button"
                            onClick={() => setShowCertificateModal(viewingProfile)}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:opacity-85 transition-opacity cursor-pointer shadow-sm"
                            title="Official Trusted Badge • Documents Authorized (Click to inspect credential)"
                          >
                            <ShieldCheck size={12} className="text-amber-600 dark:text-amber-400" />
                            <span>Trusted Badge</span>
                            <span className="text-[9px] opacity-80">(Authorized)</span>
                          </button>
                        ) : (
                          <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 dark:bg-white/5 text-gray-400 border border-gray-200 dark:border-gray-800"
                            title="Documents not yet authorized for Trusted Badge"
                          >
                            <Lock size={10} className="text-gray-400" />
                            <span>Unverified</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-oc-gold font-bold text-xs ml-1">
                          <Star size={12} fill="currentColor" />
                          <span>{calcRating(viewingProfile.ratings)}</span>
                          <span className="text-[10px] text-gray-400 font-normal">({viewingProfile.ratings?.length || 0})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Rating Section for others */}
                  {currentUser && currentUser.email !== viewingProfile.email && (
                    <div className="mt-6 p-4 bg-oc-cream/50 dark:bg-white/5 rounded-2xl border border-oc-gold/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold text-oc-gold tracking-widest">Rate Interaction</span>
                        {viewingProfile.ratingVoters?.[currentUser.email] ? (
                          <span className="text-[10px] text-gray-500 italic">You rated this {viewingProfile.ratingVoters[currentUser.email]} stars</span>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            disabled={!!viewingProfile.ratingVoters?.[currentUser.email]}
                            onClick={() => handleRateUser(viewingProfile.email, star)}
                            className={`p-2 rounded-lg transition-all ${
                              (viewingProfile.ratingVoters?.[currentUser.email] || 0) >= star
                                ? 'text-oc-gold bg-oc-gold/10'
                                : 'text-gray-300 hover:text-oc-gold hover:bg-oc-gold/5'
                            } ${(viewingProfile.ratingVoters?.[currentUser.email]) ? 'cursor-default' : 'active:scale-90'}`}
                          >
                            <Star size={20} fill={(viewingProfile.ratingVoters?.[currentUser.email] || 0) >= star ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 space-y-4 text-sm text-gray-600 dark:text-gray-400">
                    {viewingProfile.description && <p className="leading-relaxed italic">"{viewingProfile.description}"</p>}
                    <div className="grid grid-cols-2 gap-4">
                      {viewingProfile.location && <div><span className="text-[10px] uppercase font-bold text-oc-gold block">Location</span>{viewingProfile.location}</div>}
                      {viewingProfile.speciality && <div><span className="text-[10px] uppercase font-bold text-oc-gold block">Speciality</span>{viewingProfile.speciality}</div>}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                    {currentUser && currentUser.email !== viewingProfile.email && (
                      <button 
                        onClick={() => {
                          const target = viewingProfile;
                          setViewingProfile(null);
                          setBookingTarget(target);
                          setBookingTopic('15-min Discovery Call');
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setBookingDate(tomorrow.toISOString().split('T')[0]);
                          setBookingTimeSlot('10:00 AM - 10:30 AM');
                          setBookingNotes('');
                        }}
                        className="w-full sm:flex-1 bg-gradient-to-r from-oc-gold to-amber-500 text-oc-navy font-black py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2 text-sm"
                      >
                        <CalendarDays size={18} />
                        Book Discovery Call
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        if (currentUser) {
                          setActivePage('messages');
                          setActiveConversation(viewingProfile.email);
                          markThreadAsRead(viewingProfile.email);
                          setViewingProfile(null);
                        }
                      }}
                      className="w-full sm:flex-1 bg-oc-navy text-white dark:bg-white/10 dark:text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                    >
                      <MessageSquare size={18} />
                      Send Message
                    </button>
                  </div>

                  {/* Skills & Endorsements */}
                  <div className="mt-8 pt-8 border-t border-oc-gold/5">
                    <div className="flex items-center gap-2 mb-4">
                      <Award size={16} className="text-oc-gold" />
                      <h4 className="text-xs uppercase font-bold tracking-widest text-oc-gold">Skills & Endorsements</h4>
                    </div>
                    <div className="space-y-3">
                      {(viewingProfile.skills || 'Professionals Service').split(',').map(s => s.trim()).map(skill => {
                        const endorsers = viewingProfile.skillEndorsements?.[skill] || [];
                        const isEndorsed = endorsers.includes(currentUser?.email || '');
                        return (
                          <div key={skill} className="flex items-center justify-between p-3 bg-oc-cream/30 dark:bg-white/5 rounded-xl border border-oc-gold/5">
                            <div>
                              <div className="text-sm font-bold">{skill}</div>
                              <div className="text-[10px] text-gray-500">{endorsers.length} Endorsers</div>
                            </div>
                            {currentUser && currentUser.email !== viewingProfile.email && (
                              <button 
                                onClick={() => handleEndorse(viewingProfile.email, skill)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isEndorsed ? 'bg-oc-gold text-oc-navy shadow-inner' : 'bg-white dark:bg-white/10 text-oc-gold border border-oc-gold/20'}`}
                              >
                                {isEndorsed ? '✓ Endorsed' : '+ Endorse'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Portfolio Section */}
                  <div className="mt-8 pt-8 border-t border-oc-gold/5">
                    <div className="flex items-center gap-2 mb-4">
                      <LayoutGrid size={16} className="text-oc-gold" />
                      <h4 className="text-xs uppercase font-bold tracking-widest text-oc-gold">Portfolio / Gallery</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {viewingProfile.portfolio && viewingProfile.portfolio.length > 0 ? viewingProfile.portfolio.map(p => (
                        <div key={p.id} className="group relative rounded-xl overflow-hidden aspect-video bg-oc-navy border border-oc-gold/10">
                          {p.image ? (
                            <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-oc-gold/20">
                              <LayoutGrid size={24} />
                              <span className="text-[10px] font-bold uppercase mt-1">Project</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                            <h5 className="text-[10px] font-bold text-white uppercase">{p.title}</h5>
                            <p className="text-[8px] text-gray-300 line-clamp-1">{p.description}</p>
                            {p.link && (
                              <a href={p.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-oc-gold text-[8px] font-bold">
                                <ExternalLink size={8} /> VIEW PROJECT
                              </a>
                            )}
                          </div>
                        </div>
                      )) : (
                        <div className="col-span-2 py-8 bg-oc-cream/20 dark:bg-white/5 rounded-xl border border-dashed border-oc-gold/10 text-center">
                          <p className="text-xs text-gray-500 italic">No portfolio items shared yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <button className="absolute top-4 right-4 text-white/50 hover:text-white" onClick={() => setViewingProfile(null)}><X size={24} /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Role Selector Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-oc-navy p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-oc-gold/20 text-center">
              <h2 className="text-2xl font-serif font-bold text-oc-navy dark:text-oc-gold-light mb-6">Choose Your Role</h2>
              <div className="space-y-3">
                {[
                  { id: 'Employee', label: 'Employee', emoji: '👷' },
                  { id: 'Employer', label: 'Employer', emoji: '💼' },
                  { id: 'BusinessOwner', label: 'Business Owner', emoji: '🏢' },
                ].map(r => (
                  <button 
                    key={r.id}
                    onClick={() => selectRole(r.id as UserRole)}
                    className="w-full flex items-center gap-4 bg-oc-cream dark:bg-white/5 p-4 rounded-2xl hover:bg-oc-gold hover:text-white transition-all text-left group"
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="font-bold">{r.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Setup Modal */}
       <AnimatePresence>
        {showSetupModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-oc-navy rounded-3xl p-8 shadow-2xl border border-oc-gold/10 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-serif font-bold text-oc-navy dark:text-oc-gold-light mb-6">Setup Profile</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data = Object.fromEntries(fd.entries());
                finalizeSetup(data);
              }} className="space-y-4">
                <input required name={roleSelection === 'BusinessOwner' ? 'bizName' : 'name'} placeholder={roleSelection === 'BusinessOwner' ? 'Business Name' : 'Full Name'} className="w-full bg-oc-cream dark:bg-white/5 border-none rounded-xl p-4 text-sm outline-none" />
                <input name="location" placeholder="Location (Kampala, etc)" className="w-full bg-oc-cream dark:bg-white/5 border-none rounded-xl p-4 text-sm outline-none" />
                <input name={roleSelection === 'BusinessOwner' ? 'speciality' : 'occupation'} placeholder={roleSelection === 'BusinessOwner' ? 'Business Type' : 'Current Occupation'} className="w-full bg-oc-cream dark:bg-white/5 border-none rounded-xl p-4 text-sm outline-none" />
                {roleSelection === 'BusinessOwner' && (
                  <>
                    <input name="industry" placeholder="Industry (e.g. Finance, Tech)" className="w-full bg-oc-cream dark:bg-white/5 border-none rounded-xl p-4 text-sm outline-none" />
                    <input name="website" type="url" placeholder="Website URL (https://...)" className="w-full bg-oc-cream dark:bg-white/5 border-none rounded-xl p-4 text-sm outline-none" />
                  </>
                )}
                <textarea name="description" placeholder="Short bio or description" className="w-full bg-oc-cream dark:bg-white/5 border-none rounded-xl p-4 text-sm outline-none h-24" />
                <button type="submit" className="w-full bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold py-4 rounded-xl shadow-lg mt-4">
                  Complete Setup
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Job Posting Modal */}
      <AnimatePresence>
        {showJobModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowJobModal(false)} />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
               className="relative w-full max-w-lg bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/10 max-h-[92vh] overflow-y-auto"
             >
               <h2 className="text-2xl font-serif font-bold mb-6">Post a Vacancy</h2>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const fd = new FormData(e.currentTarget);
                 const job: Job = {
                   id: Date.now(),
                   title: fd.get('title') as string,
                   type: fd.get('type') as any,
                   salary: fd.get('salary') as string,
                   location: fd.get('location') as string,
                   contact: fd.get('contact') as string,
                   desc: fd.get('desc') as string,
                   posterEmail: currentUser!.email,
                   posterName: currentUser!.bizName || currentUser!.name!,
                   posterRole: currentUser!.role!,
                   time: new Date().toLocaleDateString()
                 };
                 setJobs([job, ...jobs]);
                 safeStorage.setJSON('oc_jobs', [job, ...jobs]);
                 setShowJobModal(false);
               }} className="space-y-4">
                 <input required name="title" placeholder="Job Title" className="w-full bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none" />
                 <div className="grid grid-cols-2 gap-4">
                   <select name="type" className="bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none appearance-none">
                     <option value="fulltime">Full-time</option>
                     <option value="parttime">Part-time</option>
                     <option value="remote">Remote</option>
                     <option value="contract">Contract</option>
                   </select>
                   <input name="salary" placeholder="Salary (optional)" className="bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none" />
                 </div>
                 <input required name="location" placeholder="Location" className="w-full bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none" />
                 <input required name="contact" placeholder="Email/Phone to apply" className="w-full bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none" />
                 <textarea required name="desc" placeholder="Job details..." className="w-full bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none h-32" />
                 <button className="w-full bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold py-4 rounded-xl shadow-lg cursor-pointer">Post Listing</button>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Host Event Modal */}
      <AnimatePresence>
        {showAddEventModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddEventModal(false)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/10 max-h-[92vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-serif font-bold mb-6">Host Professional Event</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                addEvent({
                  title: fd.get('title') as string,
                  type: fd.get('type') as any,
                  date: fd.get('date') as string,
                  location: fd.get('location') as string,
                  description: fd.get('description') as string,
                });
                setShowAddEventModal(false);
              }} className="space-y-4">
                <input required name="title" placeholder="Event Title (e.g. UX Design Workshop)" className="w-full bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <select name="type" className="bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none appearance-none">
                    <option value="Webinar">Webinar</option>
                    <option value="Meetup">Meetup</option>
                    <option value="Workshop">Workshop</option>
                  </select>
                  <input required name="date" placeholder="Date & Time" className="bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none" />
                </div>
                <input required name="location" placeholder="Location (e.g. Zoom, Sheraton Hotel)" className="w-full bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none" />
                <textarea required name="description" placeholder="What is this event about?" className="w-full bg-oc-cream dark:bg-white/5 rounded-xl p-4 text-sm outline-none h-32" />
                <button className="w-full bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold py-4 rounded-xl shadow-lg cursor-pointer">Schedule Event</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Assignment Modal */}
      <AnimatePresence>
        {assigningStaff && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAssigningStaff(null)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/10 max-h-[92vh] overflow-y-auto"
            >
              <h2 className="text-xl font-serif font-bold mb-1">Assign Post</h2>
              <p className="text-xs text-gray-500 mb-6 font-medium">Setting role for {assigningStaff.name}</p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {['Manager', 'Supervisor', 'Lead', 'Developer', 'Designer', 'Accounts', 'Sales', 'Intern'].map(p => (
                  <button 
                    key={p} 
                    onClick={() => updateStaffPost(assigningStaff.email, p)}
                    className="px-3 py-1.5 bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-full text-[10px] font-bold text-oc-navy dark:text-oc-gold-light hover:bg-oc-gold hover:text-white transition-all capitalize cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Or type a custom post..." 
                  className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/10 rounded-xl p-4 text-sm outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter') updateStaffPost(assigningStaff.email, (e.target as HTMLInputElement).value);
                  }}
                />
                <button 
                  onClick={() => setAssigningStaff(null)}
                  className="w-full py-3 text-sm font-bold text-gray-500 hover:text-oc-navy dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Job Application Modal */}
      <AnimatePresence>
        {applyingForJob && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isApplying && setApplyingForJob(null)} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/10 max-h-[92vh] overflow-y-auto"
            >
              {!isApplying ? (
                <>
                  <h2 className="text-2xl font-serif font-bold mb-1 italic text-oc-navy dark:text-oc-gold-light tracking-tight">Confirm Application</h2>
                  <p className="text-xs text-gray-500 mb-6 font-medium">You are applying for <span className="text-oc-navy dark:text-white font-bold">{applyingForJob.title}</span> at <span className="text-oc-navy dark:text-white font-bold">{applyingForJob.posterName}</span></p>
                  
                  <div className="space-y-6">
                    <div className="bg-oc-cream dark:bg-white/5 p-4 rounded-2xl border border-oc-gold/10">
                      <div className="flex items-center gap-3">
                        {currentUser?.photo || currentUser?.logo ? (
                          <img src={currentUser.photo || currentUser.logo} className="w-10 h-10 rounded-xl object-cover border border-oc-gold/20" alt="" />
                        ) : (
                          <UserCircle className="text-oc-gold" size={40} />
                        )}
                        <div>
                          <div className="text-sm font-bold">{currentUser?.name || currentUser?.bizName}</div>
                          <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{currentUser?.occupation || currentUser?.role}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-white/10 p-4 rounded-2xl border border-oc-gold/5">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="resume" 
                          checked={attachResume} 
                          onChange={e => setAttachResume(e.target.checked)}
                          className="w-5 h-5 accent-oc-gold"
                        />
                        <label htmlFor="resume" className="text-sm font-medium cursor-pointer">
                          Attach my professional profile (Resume)
                        </label>
                      </div>
                      {attachResume && (
                        <div className="mt-2 text-[10px] text-gray-500">
                          Your profile details and CV will be shared. 
                          <button 
                            onClick={() => { setApplyingForJob(null); setActivePage('card'); }}
                            className="text-oc-gold ml-1 hover:underline inline-flex items-center gap-0.5"
                          >
                            Edit Resume <Settings size={10} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => setApplyingForJob(null)}
                        className="flex-1 py-4 text-sm font-bold text-gray-500 hover:text-oc-navy transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setIsApplying(true);
                          setTimeout(() => {
                            addNotificationTo(applyingForJob.posterEmail, {
                              type: 'job',
                              text: `New application: ${applyingForJob.title}`,
                              sub: `Candidate: ${currentUser?.name || currentUser?.email}`
                            });
                            // Also send a formal message to the poster
                            let applicationText = `Hello, I've just applied for the "${applyingForJob.title}" position. `;
                            if (attachResume && currentUser?.resumeContent) {
                              applicationText += `\n\n--- Shared Profile Summary ---\n${currentUser.resumeContent.slice(0, 300)}${currentUser.resumeContent.length > 300 ? '...' : ''}`;
                            } else if (attachResume) {
                              applicationText += `Please find my profile attached.`;
                            }
                            
                            sendMessage(applyingForJob.posterEmail, applicationText);
                            createJobApplication(applyingForJob);
                            
                            setIsApplying(false);
                            setApplyingForJob(null);
                            addNotificationTo(currentUser!.email, {
                              type: 'account',
                              text: `Application Sent!`,
                              sub: `Successfully applied to ${applyingForJob.posterName}`
                            });
                          }, 1500);
                        }}
                        className="flex-1 bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
                      >
                        Submit 
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center space-y-6">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-16 h-16 border-4 border-oc-gold border-t-transparent rounded-full mx-auto"
                  />
                  <div>
                    <h3 className="text-xl font-serif font-bold">Submitting Application...</h3>
                    <p className="text-sm text-gray-500">Preparing your credentials for {applyingForJob.posterName}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Verification Modal */}
      <AnimatePresence>
        {showProfileVerificationForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { if (!isVerifyingAI) setShowProfileVerificationForm(false); }} />
            <motion.div 
              initial={{ scale: 0.92, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/20 z-10 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-oc-gold/10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-oc-gold/10 rounded-2xl flex items-center justify-center text-oc-gold">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-serif font-bold text-oc-navy dark:text-oc-gold-light tracking-tight">Document Authorization</h2>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-1">
                        <Award size={10} /> Unlocks Trusted Badge
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">Verify your government documents to unlock your Trusted Member badge</p>
                  </div>
                </div>
                {!isVerifyingAI && (
                  <button 
                    type="button"
                    onClick={() => {
                      setShowProfileVerificationForm(false);
                      setAiAnalysisResult(null);
                      setSelectedDocPreview(null);
                      setVerificationFeedback(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Trusted Badge Requirement Info Banner */}
              <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Trusted Badge Requirement</span>
                  <span className="text-[11px] opacity-90 leading-relaxed block">
                    To receive the official <strong>Trusted Badge</strong> on your profile, directory cards, and applications, you must first have your official government-issued ID or business registration authorized.
                  </span>
                </div>
              </div>

              {/* Status feedback bar */}
              {verificationFeedback && !aiAnalysisResult && (
                <div className={`mt-4 p-3.5 rounded-2xl text-xs flex items-center gap-2 border ${
                  verificationFeedback.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                }`}>
                  {verificationFeedback.type === 'success' ? <CheckCircle size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
                  <span>{verificationFeedback.message}</span>
                </div>
              )}

              {/* VIEW 1: Document Form (Before Scan) */}
              {!isVerifyingAI && !aiAnalysisResult && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!selectedDocPreview) {
                    alert("Please select or capture a photo of your document.");
                    return;
                  }
                  requestVerification(selectedDocPreview, selectedDocType);
                }} className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">Select Document Category</label>
                    <select 
                      value={selectedDocType} 
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      className="w-full bg-oc-cream dark:bg-white/5 rounded-xl p-3 text-xs outline-none border border-oc-gold/15 text-oc-navy dark:text-white font-medium"
                    >
                      <option value="National ID">National ID Card (Uganda NIRA / East Africa / International)</option>
                      <option value="Passport">International Passport</option>
                      <option value="Driver License">Driver's License / Driving Permit</option>
                      <option value="Business License">Business Registration / URSB / Tax Certificate</option>
                      <option value="Professional Certification">Academic Degree / Professional Accreditation</option>
                    </select>
                  </div>

                  {/* Document Photo Upload / Preview */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">Document Image</label>
                    {selectedDocPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-oc-gold/30 bg-black/60 p-2 text-center">
                        <img 
                          src={selectedDocPreview} 
                          alt="Document Preview" 
                          className="max-h-52 mx-auto rounded-xl object-contain shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedDocPreview(null)}
                          className="absolute top-4 right-4 bg-black/80 hover:bg-red-600 text-white p-2 rounded-full text-xs flex items-center gap-1 backdrop-blur shadow transition-colors"
                        >
                          <X size={14} /> Change Photo
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-oc-gold/25 rounded-2xl p-7 text-center bg-oc-gold/5 group hover:bg-oc-gold/10 transition-all cursor-pointer block relative">
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setSelectedDocPreview(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                        />
                        <FileBadge className="mx-auto text-oc-gold/50 mb-2 group-hover:scale-110 transition-transform" size={42} />
                        <p className="text-xs font-bold text-oc-gold">Tap to take photo or choose file</p>
                        <p className="text-[10px] text-gray-400 mt-1">Accepts clear photo of front of ID / Passport page</p>
                      </label>
                    )}
                  </div>

                  {/* Security and Guidance note */}
                  <div className="p-3.5 bg-oc-gold/5 dark:bg-white/5 rounded-2xl border border-oc-gold/10 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-oc-navy dark:text-oc-gold-light">
                      <Sparkles size={14} className="text-oc-gold" />
                      <span>Forensic Scan Guidelines</span>
                    </div>
                    <ul className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                      <li>Ensure good lighting and no glare on the laminate plastic.</li>
                      <li>Keep all four corners and national seals visible.</li>
                      <li>Document name must match your platform profile (<strong>{currentUser?.name || currentUser?.bizName}</strong>).</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowProfileVerificationForm(false)}
                      className="flex-1 py-3 text-xs font-bold text-gray-500 hover:text-oc-navy dark:hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={!selectedDocPreview}
                      className="flex-1 bg-gradient-to-r from-oc-navy to-slate-900 dark:from-oc-gold dark:to-amber-500 text-oc-gold dark:text-oc-navy font-bold py-3 px-4 rounded-xl shadow-lg hover:opacity-95 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Scan size={16} /> Scan & Verify with AI
                    </button>
                  </div>
                </form>
              )}

              {/* VIEW 2: Scanning In Progress */}
              {isVerifyingAI && (
                <div className="py-6 space-y-6">
                  {/* Visual laser holographic animation */}
                  {selectedDocPreview && (
                    <div className="relative rounded-2xl overflow-hidden border border-oc-gold/40 bg-black max-h-48 flex items-center justify-center shadow-inner">
                      <img 
                        src={selectedDocPreview} 
                        alt="Scanning Document" 
                        className="max-h-48 object-contain opacity-75"
                      />
                      {/* Laser beam */}
                      <motion.div 
                        animate={{ top: ['5%', '90%', '5%'] }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] z-10"
                      />
                      <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] text-cyan-300 font-mono flex items-center gap-1">
                        <Scan size={10} className="animate-spin" /> Neural OCR Vision Active
                      </div>
                    </div>
                  )}

                  {/* Step progress checklist */}
                  <div className="space-y-3 bg-oc-cream/60 dark:bg-white/5 p-4 rounded-2xl border border-oc-gold/10">
                    <div className="flex items-center gap-2 text-xs font-bold text-oc-navy dark:text-oc-gold-light">
                      <Loader2 size={15} className="animate-spin text-oc-gold" />
                      <span>Gemini Forensic Document Inspection</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {[
                        "Evaluating image clarity, resolution & boundary alignment",
                        "Detecting governmental seals, coat of arms & security typography",
                        "Extracting document holder name & masked identification code",
                        "Cross-referencing holder identity with account profile"
                      ].map((stepText, idx) => {
                        const isDone = aiScanStep > idx;
                        const isCurrent = aiScanStep === idx;
                        return (
                          <div key={idx} className={`flex items-center gap-2.5 transition-opacity ${isDone ? 'text-green-600 dark:text-green-400 font-medium' : isCurrent ? 'text-oc-navy dark:text-white font-bold' : 'text-gray-400 opacity-60'}`}>
                            {isDone ? (
                              <CheckCircle size={14} className="text-green-500 shrink-0" />
                            ) : isCurrent ? (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-oc-gold border-t-transparent animate-spin shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-gray-400 shrink-0" />
                            )}
                            <span className="text-[11px]">{stepText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 3: AI Analysis Result Dossier */}
              {!isVerifyingAI && aiAnalysisResult && (
                <div className="mt-4 space-y-4">
                  {/* Status Banner */}
                  <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    aiAnalysisResult.verified && aiAnalysisResult.confidence >= 70
                      ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                      : aiAnalysisResult.recommendation === 'flagged_for_manual_review'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                  }`}>
                    {aiAnalysisResult.verified && aiAnalysisResult.confidence >= 70 ? (
                      <CheckCircle size={22} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={22} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold">
                          {aiAnalysisResult.verified && aiAnalysisResult.confidence >= 70
                            ? 'Document Verified & Approved'
                            : aiAnalysisResult.recommendation === 'flagged_for_manual_review'
                            ? 'Flagged for Manual Review'
                            : 'Verification Unsuccessful'}
                        </h4>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/40">
                          {aiAnalysisResult.confidence}% Confidence
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed opacity-90">{aiAnalysisResult.reason}</p>
                    </div>
                  </div>

                  {/* Extracted Credentials Card */}
                  <div className="bg-oc-cream/80 dark:bg-white/5 rounded-2xl p-4 border border-oc-gold/15 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-oc-gold/10">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-oc-gold">Extracted Information</span>
                      <span className="text-[10px] text-gray-400 font-mono">OCR Verification</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-gray-400 block text-[10px]">Identified Document:</span>
                        <span className="font-semibold text-oc-navy dark:text-white">{aiAnalysisResult.documentTypeDetected || selectedDocType}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Issuing Authority:</span>
                        <span className="font-semibold text-oc-navy dark:text-white">{aiAnalysisResult.issuingAuthority || 'Official Authority'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Holder Legal Name:</span>
                        <span className="font-bold text-oc-navy dark:text-oc-gold-light">{aiAnalysisResult.holderName || 'Not detected'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px]">Document / NIN Number:</span>
                        <span className="font-mono font-medium text-oc-navy dark:text-gray-200">{aiAnalysisResult.documentNumber || '••••••••'}</span>
                      </div>
                    </div>

                    {aiAnalysisResult.nameMatch && (
                      <div className="pt-2 border-t border-oc-gold/10 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Name Match with Profile:</span>
                        <span className={`font-semibold flex items-center gap-1 ${aiAnalysisResult.nameMatch.matches ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {aiAnalysisResult.nameMatch.matches ? <Check size={12} /> : <AlertCircle size={12} />}
                          {aiAnalysisResult.nameMatch.explanation}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Security Checks List */}
                  {aiAnalysisResult.securityChecks && aiAnalysisResult.securityChecks.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-oc-gold block">Security Checks</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {aiAnalysisResult.securityChecks.map((chk, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-oc-gold/10 flex items-start gap-2">
                            {chk.passed ? (
                              <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                            )}
                            <div className="text-[11px]">
                              <span className="font-bold text-oc-navy dark:text-white block">{chk.label}</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">{chk.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                    {aiAnalysisResult.verified && aiAnalysisResult.confidence >= 70 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileVerificationForm(false);
                          setAiAnalysisResult(null);
                          setSelectedDocPreview(null);
                        }}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle size={16} /> Done & View Trusted Badge on Profile
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setAiAnalysisResult(null);
                            setSelectedDocPreview(null);
                          }}
                          className="flex-1 py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw size={14} /> Retake Photo
                        </button>
                        <button
                          type="button"
                          onClick={submitForManualAdminReview}
                          className="flex-1 py-2.5 bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy hover:opacity-90 rounded-xl text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5"
                        >
                          <Users size={14} /> Submit for Admin Review
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Verified Member Certificate of Authenticity Modal */}
      <AnimatePresence>
        {showCertificateModal && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCertificateModal(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 0 }}
              className="relative w-full max-w-lg bg-gradient-to-b from-[#111928] to-[#0b101b] rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-oc-gold/30 text-white overflow-hidden z-10"
            >
              {/* Certificate Guilloche & Embellishment */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-oc-gold/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-oc-gold/20 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-oc-gold/20 border border-oc-gold/40 flex items-center justify-center text-oc-gold">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">Official Credential & Trusted Badge</span>
                    <h3 className="text-sm font-serif font-bold text-white">Authorized Identity Document</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCertificateModal(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="text-center py-2 space-y-3">
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-full border-2 border-oc-gold p-1 mx-auto bg-black/40">
                    <img 
                      src={showCertificateModal.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(showCertificateModal.bizName || showCertificateModal.name || 'Member')}&background=0D1B2A&color=D4AF37`}
                      alt={showCertificateModal.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center border-2 border-[#111928] text-white shadow-lg">
                    <Check size={14} />
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-serif font-bold text-white tracking-wide">
                    {showCertificateModal.bizName || showCertificateModal.name}
                  </h4>
                  <p className="text-xs text-oc-gold/80 font-medium">{showCertificateModal.role} • {showCertificateModal.email}</p>
                </div>

                <div className="my-4 p-4 rounded-2xl bg-white/5 border border-oc-gold/20 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-gray-300">
                    <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Trusted Badge Status:</span>
                    <span className="flex items-center gap-1.5 font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      <ShieldCheck size={12} /> Documents Authorized • Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-300">
                    <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Document Type:</span>
                    <span className="font-semibold text-white">
                      {showCertificateModal.verificationAnalysis?.documentTypeDetected || showCertificateModal.verificationType || 'Official Government Identification'}
                    </span>
                  </div>
                  {showCertificateModal.verificationAnalysis?.issuingAuthority && (
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Issuing Body:</span>
                      <span className="font-semibold text-oc-gold-light">
                        {showCertificateModal.verificationAnalysis.issuingAuthority}
                      </span>
                    </div>
                  )}
                  {showCertificateModal.verificationAnalysis?.documentNumber && (
                    <div className="flex justify-between items-center text-gray-300">
                      <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Masked ID Number:</span>
                      <span className="font-mono text-gray-200">
                        {showCertificateModal.verificationAnalysis.documentNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-gray-300">
                    <span className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Inspection Engine:</span>
                    <span className="font-medium text-blue-300">Gemini 3.8 Forensic Vision</span>
                  </div>
                  {showCertificateModal.verificationReason && (
                    <div className="pt-2 border-t border-white/10 text-[11px] text-gray-300 leading-relaxed italic">
                      "{showCertificateModal.verificationReason}"
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                  <span>ID: OC-V-{showCertificateModal.email.split('@')[0].toUpperCase()}</span>
                  <span>Authenticity Sealed</span>
                </div>
              </div>

              <div className="pt-4 border-t border-oc-gold/20 flex gap-2">
                <button
                  onClick={() => setShowCertificateModal(null)}
                  className="w-full py-2.5 bg-oc-gold text-oc-navy font-bold rounded-xl text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Close Certificate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unlock Trusted Badge Requirement Modal */}
      <AnimatePresence>
        {showUnlockBadgeRequirementModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/75 backdrop-blur-md" 
              onClick={() => setShowUnlockBadgeRequirementModal(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0E1726] rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/30 text-oc-navy dark:text-white z-10 max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-oc-gold/15">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-oc-gold/30 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-oc-gold">Platform Credibility</span>
                    <h3 className="text-lg font-serif font-bold text-oc-navy dark:text-white">How to Get the Trusted Badge</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUnlockBadgeRequirementModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Core Requirement Notice */}
              <div className="my-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                  <Lock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Documents Must First Be Authorized</span>
                </div>
                <p className="text-xs text-amber-900/85 dark:text-amber-200/90 leading-relaxed">
                  To guarantee absolute safety, fraud protection, and high trust on Online Corporate, the <strong>Trusted Badge</strong> is only awarded to members whose identity or business documents have been verified and authorized.
                </p>
              </div>

              {/* 3 Step Roadmap */}
              <div className="space-y-3 my-5">
                <div className="text-[11px] uppercase font-bold tracking-wider text-oc-gold">3-Step Authorization Process</div>
                
                <div className="flex items-start gap-3 p-3 rounded-xl bg-oc-cream/60 dark:bg-white/5 border border-oc-gold/10">
                  <div className="w-7 h-7 rounded-full bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-oc-navy dark:text-white">Submit Official Documentation</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Upload a photo or scanned copy of your National ID, Passport, Driver's Permit, or Business Registration.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-oc-cream/60 dark:bg-white/5 border border-oc-gold/10">
                  <div className="w-7 h-7 rounded-full bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-oc-navy dark:text-white">Forensic AI or Admin Authorization</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Gemini 3.8 Multimodal Vision inspects national seals, guilloche patterns, document integrity, and matches the registrant's name.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-oc-cream/60 dark:bg-white/5 border border-oc-gold/10">
                  <div className="w-7 h-7 rounded-full bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-oc-navy dark:text-white">Trusted Badge Unlocked Permanently</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      An official digital Certificate of Authenticity is issued, activating the gold Trusted Badge across all search feeds and applications.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits of Trusted Badge */}
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1 text-blue-900 dark:text-blue-300 mb-6">
                <span className="font-bold flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-500" />
                  Why get your documents authorized?
                </span>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-200/80">
                  Trusted profiles receive up to <strong>4x higher response rates</strong> from enterprise employers and prospective clients, with zero risk of impersonation.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-oc-gold/10">
                <button
                  type="button"
                  onClick={() => setShowUnlockBadgeRequirementModal(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnlockBadgeRequirementModal(false);
                    setShowProfileVerificationForm(true);
                  }}
                  className="flex-[2] py-3 bg-gradient-to-r from-amber-500 via-oc-gold to-amber-600 hover:opacity-95 text-oc-navy font-extrabold rounded-xl text-xs shadow-lg shadow-oc-gold/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck size={16} />
                  Authorize Documents Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Appointment / Discovery Call Booking Modal */}
      <AnimatePresence>
        {bookingTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/70 backdrop-blur-md" 
              onClick={() => { setBookingTarget(null); setBookingSuccess(null); }} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/20 max-h-[90vh] overflow-y-auto"
            >
              {!bookingSuccess ? (
                <>
                  <div className="flex items-center justify-between pb-4 mb-6 border-b border-oc-gold/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-oc-gold/10 rounded-2xl flex items-center justify-center text-oc-gold border border-oc-gold/20">
                        <CalendarDays size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                          Book Discovery Call
                        </h2>
                        <p className="text-xs text-gray-500">
                          Schedule a meeting with <span className="text-oc-gold font-bold">{bookingTarget.bizName || bookingTarget.name || bookingTarget.email}</span>
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setBookingTarget(null)} 
                      className="text-gray-400 hover:text-oc-navy dark:hover:text-white p-2"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Target Summary Card */}
                  <div className="bg-oc-cream/50 dark:bg-white/5 p-4 rounded-2xl border border-oc-gold/10 flex items-center gap-4 mb-6">
                    <img 
                      src={bookingTarget.photo || bookingTarget.logo || 'https://via.placeholder.com/48'} 
                      className="w-12 h-12 rounded-xl object-cover border border-oc-gold/20" 
                      alt="" 
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-oc-navy dark:text-white truncate">
                        {bookingTarget.bizName || bookingTarget.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {bookingTarget.speciality || bookingTarget.occupation || bookingTarget.role}
                      </div>
                    </div>
                    <Badge className="bg-oc-gold/10 text-oc-gold shrink-0">
                      {bookingTarget.role}
                    </Badge>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const appt = bookAppointment({
                        hostEmail: bookingTarget.email,
                        hostName: bookingTarget.bizName || bookingTarget.name || bookingTarget.email,
                        topic: bookingTopic,
                        date: bookingDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
                        timeSlot: bookingTimeSlot,
                        notes: bookingNotes
                      });
                      setBookingSuccess(appt);
                    }} 
                    className="space-y-5"
                  >
                    {/* Meeting Topic / Purpose */}
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-widest text-oc-gold mb-2">
                        Select Call Purpose
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          '15-min Discovery Call',
                          '30-min Consultation',
                          'Business Partnership',
                          'Career & Hiring Inquiry'
                        ].map(topic => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => setBookingTopic(topic)}
                            className={`p-3 rounded-xl text-left text-xs font-bold transition-all border ${
                              bookingTopic === topic 
                                ? 'bg-oc-navy text-oc-gold border-oc-gold dark:bg-oc-gold dark:text-oc-navy shadow-md' 
                                : 'bg-oc-cream/40 dark:bg-white/5 border-oc-gold/10 hover:border-oc-gold/30 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Selection */}
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-widest text-oc-gold mb-2">
                        Select Date
                      </label>
                      <div className="space-y-2">
                        <input 
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-oc-gold text-oc-navy dark:text-white"
                        />
                        {/* Quick Day Chips */}
                        <div className="flex gap-2">
                          {[
                            { label: 'Tomorrow', daysToAdd: 1 },
                            { label: 'In 2 Days', daysToAdd: 2 },
                            { label: 'In 3 Days', daysToAdd: 3 },
                          ].map(btn => {
                            const d = new Date();
                            d.setDate(d.getDate() + btn.daysToAdd);
                            const dateStr = d.toISOString().split('T')[0];
                            const isSel = bookingDate === dateStr;
                            return (
                              <button
                                key={btn.label}
                                type="button"
                                onClick={() => setBookingDate(dateStr)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                  isSel ? 'bg-oc-gold text-oc-navy' : 'bg-oc-gold/10 text-oc-gold hover:bg-oc-gold/20'
                                }`}
                              >
                                {btn.label} ({d.toLocaleDateString([], { month: 'short', day: 'numeric' })})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Time Slot Selection */}
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-widest text-oc-gold mb-2">
                        Select Time Slot
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          '09:00 AM - 09:30 AM',
                          '10:00 AM - 10:30 AM',
                          '11:30 AM - 12:00 PM',
                          '02:00 PM - 02:30 PM',
                          '03:30 PM - 04:00 PM',
                          '05:00 PM - 05:30 PM'
                        ].map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setBookingTimeSlot(slot)}
                            className={`p-2.5 rounded-xl text-center text-xs font-bold transition-all border ${
                              bookingTimeSlot === slot 
                                ? 'bg-oc-gold text-oc-navy border-oc-gold shadow-md font-extrabold' 
                                : 'bg-oc-cream/30 dark:bg-white/5 border-oc-gold/10 hover:border-oc-gold/30 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <Clock size={12} className="inline mr-1 opacity-70" />
                            {slot.split(' - ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-widest text-oc-gold mb-2">
                        Meeting Notes / Agenda (Optional)
                      </label>
                      <textarea
                        placeholder="Share any topics or context you want to cover..."
                        value={bookingNotes}
                        onChange={(e) => setBookingNotes(e.target.value)}
                        className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-oc-gold h-20 text-oc-navy dark:text-white placeholder-gray-400"
                      />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setBookingTarget(null)}
                        className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-[2] bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-black py-3.5 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                      >
                        <CalendarDays size={16} />
                        Confirm & Book Call
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="py-6 text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mx-auto flex items-center justify-center shadow-lg"
                  >
                    <CheckCircle size={48} />
                  </motion.div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                      Discovery Call Scheduled!
                    </h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      A meeting request has been dispatched to <span className="font-bold text-oc-navy dark:text-white">{bookingSuccess.hostName}</span>. Details have also been saved to your chat messages.
                    </p>
                  </div>

                  <div className="bg-oc-cream/80 dark:bg-white/5 p-4 rounded-2xl border border-oc-gold/20 text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400 uppercase font-bold">Topic:</span>
                      <span className="font-bold">{bookingSuccess.topic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 uppercase font-bold">Date:</span>
                      <span className="font-bold">{bookingSuccess.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 uppercase font-bold">Time Slot:</span>
                      <span className="font-bold">{bookingSuccess.timeSlot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 uppercase font-bold">Status:</span>
                      <Badge className="bg-green-100 text-green-700">Scheduled</Badge>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        const targetEmail = bookingSuccess.hostEmail;
                        setBookingTarget(null);
                        setBookingSuccess(null);
                        setActivePage('messages');
                        setActiveConversation(targetEmail);
                      }}
                      className="flex-1 bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy font-bold py-3.5 rounded-2xl text-xs shadow-md flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={16} />
                      Open Chat Thread
                    </button>
                    <button
                      onClick={() => {
                        setBookingTarget(null);
                        setBookingSuccess(null);
                      }}
                      className="flex-1 bg-oc-cream dark:bg-white/10 text-gray-700 dark:text-white font-bold py-3.5 rounded-2xl text-xs hover:bg-oc-gold/20"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My Scheduled Meetings / Discovery Calls Modal */}
      <AnimatePresence>
        {showMyBookingsModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/70 backdrop-blur-md" 
              onClick={() => setShowMyBookingsModal(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-8 shadow-2xl border border-oc-gold/20 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-oc-gold/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-oc-gold/10 rounded-xl flex items-center justify-center text-oc-gold">
                    <CalendarDays size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                      Discovery Calls & Bookings
                    </h2>
                    <p className="text-xs text-gray-500">
                      Manage your scheduled 1-on-1 calls and meetings
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowMyBookingsModal(false)} className="text-gray-400 hover:text-white p-2">
                  <X size={20} />
                </button>
              </div>

              {/* Bookings List */}
              {appointments.filter(a => a.hostEmail === currentUser?.email || a.bookerEmail === currentUser?.email).length > 0 ? (
                <div className="space-y-4">
                  {appointments
                    .filter(a => a.hostEmail === currentUser?.email || a.bookerEmail === currentUser?.email)
                    .map(appt => {
                      const isHost = appt.hostEmail === currentUser?.email;
                      const otherPartyEmail = isHost ? appt.bookerEmail : appt.hostEmail;
                      const otherPartyName = isHost ? appt.bookerName : appt.hostName;

                      return (
                        <div key={appt.id} className="p-4 bg-oc-cream/40 dark:bg-white/5 rounded-2xl border border-oc-gold/10 hover:border-oc-gold/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Badge className={isHost ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"}>
                                {isHost ? 'Host' : 'Booker'}
                              </Badge>
                              <Badge className={appt.status === 'Scheduled' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                {appt.status}
                              </Badge>
                              <span className="text-xs font-extrabold text-oc-navy dark:text-white">{appt.topic}</span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                              <Users size={14} className="text-oc-gold" />
                              <span>With: <strong className="text-oc-navy dark:text-white">{otherPartyName}</strong> ({otherPartyEmail})</span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-3">
                              <span className="flex items-center gap-1"><Calendar size={12} className="text-oc-gold" /> {appt.date}</span>
                              <span className="flex items-center gap-1"><Clock size={12} className="text-oc-gold" /> {appt.timeSlot}</span>
                            </div>
                            {appt.notes && (
                              <div className="text-[11px] text-gray-400 italic bg-black/5 dark:bg-white/5 p-2 rounded-lg mt-1">
                                "{appt.notes}"
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setShowMyBookingsModal(false);
                                setActivePage('messages');
                                setActiveConversation(otherPartyEmail);
                              }}
                              className="px-3.5 py-2 bg-oc-navy dark:bg-oc-gold text-oc-gold dark:text-oc-navy rounded-xl text-xs font-bold hover:scale-105 transition-all flex items-center gap-1.5"
                            >
                              <MessageSquare size={14} />
                              Chat
                            </button>
                            {appt.status === 'Scheduled' && (
                              <button
                                onClick={() => cancelAppointment(appt.id)}
                                className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-xs font-bold transition-all"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12 bg-oc-cream/20 dark:bg-white/5 rounded-2xl border border-dashed border-oc-gold/15">
                  <CalendarDays size={48} className="mx-auto text-oc-gold/30 mb-3" />
                  <h3 className="text-base font-bold text-gray-500">No Calls or Meetings Booked Yet</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    You can book discovery calls directly from any business or employee card in the network!
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Document Preview Modal */}
      <AnimatePresence>
        {adminDocPreview && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setAdminDocPreview(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 0 }}
              className="relative w-full max-w-4xl bg-white dark:bg-oc-navy rounded-3xl p-6 sm:p-7 shadow-2xl border border-oc-gold/20 overflow-hidden z-10 max-h-[92vh] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between border-b border-oc-gold/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-oc-gold/10 flex items-center justify-center text-oc-gold font-serif font-bold text-base">
                    {(adminDocPreview.user.name || adminDocPreview.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                        Identity Document Forensic Inspection
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        Gemini 3.8
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {adminDocPreview.user.name || adminDocPreview.user.email} ({adminDocPreview.user.email}) • {adminDocPreview.user.verificationType || 'National Document'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    disabled={isAdminReanalyzing || !adminDocPreview.user.verificationDoc}
                    onClick={() => handleAdminReanalyzeDoc(adminDocPreview.user)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                    title="Run fresh Gemini forensic AI scan"
                  >
                    <RefreshCw size={13} className={isAdminReanalyzing ? "animate-spin" : ""} />
                    {isAdminReanalyzing ? 'Analyzing...' : 'Re-run AI Analysis'}
                  </button>
                  <button 
                    onClick={() => setAdminDocPreview(null)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Body: 2 Columns on Desktop */}
              <div className="my-4 flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[60vh] pr-1">
                {/* Left Column: Image Viewer */}
                <div className="bg-black/90 rounded-2xl p-3 flex flex-col items-center justify-center overflow-hidden border border-oc-gold/20 min-h-[260px] relative group">
                  {adminDocPreview.user.verificationDoc ? (
                    <>
                      <img
                        src={adminDocPreview.user.verificationDoc}
                        alt="Submitted Document"
                        className="max-w-full max-h-[48vh] object-contain rounded-lg shadow-lg"
                      />
                      <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-black/75 text-[10px] text-white font-mono flex items-center gap-1.5 border border-white/20">
                        <Scan size={12} className="text-oc-gold" />
                        {adminDocPreview.user.verificationType || 'Document'}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-400 text-xs italic">No document image available</div>
                  )}
                </div>

                {/* Right Column: AI Forensic Dossier */}
                <div className="flex flex-col gap-3">
                  {adminDocPreview.user.verificationAnalysis ? (
                    <>
                      {/* AI Verdict Banner */}
                      <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                        adminDocPreview.user.verificationAnalysis.verified && adminDocPreview.user.verificationAnalysis.confidence >= 70
                          ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                          : adminDocPreview.user.verificationAnalysis.recommendation === 'flagged_for_manual_review'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                      }`}>
                        {adminDocPreview.user.verificationAnalysis.verified && adminDocPreview.user.verificationAnalysis.confidence >= 70 ? (
                          <CheckCircle size={20} className="shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-0.5 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span>
                              {adminDocPreview.user.verificationAnalysis.verified && adminDocPreview.user.verificationAnalysis.confidence >= 70
                                ? 'AI Verdict: Genuine & Approved'
                                : adminDocPreview.user.verificationAnalysis.recommendation === 'flagged_for_manual_review'
                                ? 'AI Verdict: Flagged for Review'
                                : 'AI Verdict: High Risk / Illegible'}
                            </span>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/40">
                              {adminDocPreview.user.verificationAnalysis.confidence}% Match
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed opacity-90">
                            {adminDocPreview.user.verificationAnalysis.reason}
                          </p>
                        </div>
                      </div>

                      {/* Extracted Data Card */}
                      <div className="bg-oc-cream/60 dark:bg-white/5 rounded-2xl p-3.5 border border-oc-gold/15 space-y-2 text-xs">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-oc-gold block">
                          Extracted Credentials
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-gray-400 block text-[10px]">Identified Type:</span>
                            <span className="font-semibold text-oc-navy dark:text-white">
                              {adminDocPreview.user.verificationAnalysis.documentTypeDetected || 'Unknown'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Issuing Authority:</span>
                            <span className="font-semibold text-oc-navy dark:text-white">
                              {adminDocPreview.user.verificationAnalysis.issuingAuthority || 'Unspecified'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Name on Document:</span>
                            <span className="font-bold text-oc-navy dark:text-oc-gold-light">
                              {adminDocPreview.user.verificationAnalysis.holderName || 'Not legible'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Document ID / NIN:</span>
                            <span className="font-mono font-medium text-oc-navy dark:text-gray-200">
                              {adminDocPreview.user.verificationAnalysis.documentNumber || '••••••••'}
                            </span>
                          </div>
                        </div>

                        {adminDocPreview.user.verificationAnalysis.nameMatch && (
                          <div className="pt-1.5 border-t border-oc-gold/10 flex items-center justify-between text-[11px]">
                            <span className="text-gray-400">Name Match:</span>
                            <span className={`font-semibold flex items-center gap-1 ${
                              adminDocPreview.user.verificationAnalysis.nameMatch.matches ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              {adminDocPreview.user.verificationAnalysis.nameMatch.matches ? <Check size={12} /> : <AlertCircle size={12} />}
                              {adminDocPreview.user.verificationAnalysis.nameMatch.explanation}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Security checks breakdown */}
                      {adminDocPreview.user.verificationAnalysis.securityChecks && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-oc-gold block">
                            Forensic Security Checks
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {adminDocPreview.user.verificationAnalysis.securityChecks.map((chk, idx) => (
                              <div key={idx} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-oc-gold/10 flex items-start gap-2">
                                {chk.passed ? (
                                  <CheckCircle size={13} className="text-green-500 shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                                )}
                                <div className="text-[10px]">
                                  <span className="font-bold text-oc-navy dark:text-white block">{chk.label}</span>
                                  <span className="text-gray-400 line-clamp-1">{chk.detail}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-6 rounded-2xl bg-oc-gold/5 border border-oc-gold/15 text-center space-y-3 my-auto">
                      <Scan size={32} className="text-oc-gold/60 mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-oc-navy dark:text-oc-gold-light">
                          No Automated Scan on File
                        </h4>
                        <p className="text-xs text-gray-500 max-w-xs mx-auto">
                          Click below to execute a multimodal Gemini 3.8 forensic inspection of this identity card.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isAdminReanalyzing || !adminDocPreview.user.verificationDoc}
                        onClick={() => handleAdminReanalyzeDoc(adminDocPreview.user)}
                        className="px-4 py-2 bg-oc-gold text-oc-navy font-bold rounded-xl text-xs hover:opacity-90 transition-opacity shadow flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <RefreshCw size={13} className={isAdminReanalyzing ? "animate-spin" : ""} />
                        Run Gemini Forensic Scan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-oc-gold/10">
                <div className="text-xs text-gray-500">
                  Current Status: {adminDocPreview.user.isVerified ? (
                    <span className="font-bold text-green-600 dark:text-green-400">Verified Member</span>
                  ) : adminDocPreview.user.verificationPending ? (
                    <span className="font-bold text-oc-gold">Pending Admin Decision</span>
                  ) : (
                    <span className="font-bold text-gray-400">Unverified</span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!adminDocPreview.user.isVerified ? (
                    <>
                      <button
                        onClick={() => {
                          toggleUserVerified(adminDocPreview.user.email, true, adminDocPreview.user.verificationAnalysis?.reason || 'Approved after document inspection');
                          setAdminDocPreview(null);
                        }}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold shadow hover:bg-green-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check size={16} /> Approve & Grant Verified Badge
                      </button>
                      <button
                        onClick={() => {
                          const target = adminDocPreview.user;
                          setAdminDocPreview(null);
                          setDeclineReasonModal({ email: target.email, name: target.name || target.email });
                          setDeclineReasonInput(target.verificationAnalysis?.reason || '');
                        }}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <X size={16} /> Decline
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        toggleUserVerified(adminDocPreview.user.email, false, 'Revoked by admin');
                        setAdminDocPreview(null);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Revoke Badge
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Decline Reason Modal */}
      <AnimatePresence>
        {declineReasonModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeclineReasonModal(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-oc-navy rounded-3xl p-6 shadow-2xl border border-oc-gold/20 space-y-5 z-10 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-oc-gold/10 pb-3">
                <h3 className="text-base font-serif font-bold text-oc-navy dark:text-oc-gold-light">
                  Decline Verification Request
                </h3>
                <button onClick={() => setDeclineReasonModal(null)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Please enter feedback for <strong className="text-oc-navy dark:text-white">{declineReasonModal.name}</strong> explaining why the identity document was declined.
              </p>

              <textarea
                value={declineReasonInput}
                onChange={e => setDeclineReasonInput(e.target.value)}
                placeholder="e.g. Document image was blurred, or ID name does not match profile name."
                className="w-full bg-oc-cream dark:bg-white/5 border border-oc-gold/15 rounded-xl p-3 text-xs outline-none text-oc-navy dark:text-white h-24"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeclineReasonModal(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:text-oc-navy dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reason = declineReasonInput.trim() || 'Document verification declined by administrator.';
                    toggleUserVerified(declineReasonModal.email, false, reason);
                    setDeclineReasonModal(null);
                  }}
                  className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs shadow hover:bg-red-700 transition-all"
                >
                  Decline Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
