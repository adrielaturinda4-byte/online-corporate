import { useState, useEffect } from 'react';
import { User, Announcement, Job, Notification, Message, JobSearchHistory, CommunityPost, ProfessionalEvent, JobApplication, ApplicationStatus, Appointment } from './types';
import { 
  supabase, 
  signOutFromSupabase, 
  updateUserMetadataInSupabase, 
  fetchProfilesFromSupabase, 
  upsertProfileToSupabase,
  fetchMessagesFromSupabase,
  sendMessageToSupabase,
  markMessagesAsReadInSupabase,
  subscribeToMessages
} from './lib/supabase';
import { safeStorage } from './lib/safeStorage';

const FAKE_SEED_EMAILS = ['employee@corporate.com', 'employer@corporate.com', 'owner@corporate.com'];
const ADMIN_EMAIL = 'adrielaturinda4@gmail.com';

function getInitialUsers(): Record<string, User> {
  const loadedUsers: Record<string, User> = {};
  
  // Remove legacy fake seeds if present
  try {
    FAKE_SEED_EMAILS.forEach(email => {
      safeStorage.removeItem(`oc_u_${email}`);
    });

    const keys = safeStorage.getAllKeys();
    for (const key of keys) {
      if (key.startsWith('oc_u_')) {
        const u = safeStorage.getJSON<User | null>(key, null);
        if (u && typeof u.email === 'string' && !FAKE_SEED_EMAILS.includes(u.email.trim().toLowerCase())) {
          const e = u.email.trim().toLowerCase();
          if (e !== ADMIN_EMAIL) {
            u.isAdmin = false;
          }
          loadedUsers[e] = u;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading initial users from storage:', e);
  }

  // Ensure Admin user exists with proper permissions
  const existingAdmin = loadedUsers[ADMIN_EMAIL];
  const adminUser: User = {
    ...(existingAdmin || {}),
    email: ADMIN_EMAIL,
    password: 'adrielissocool1',
    isAdmin: true,
    isVerified: true,
    documentsAuthorized: true,
    trustedBadge: true,
    name: existingAdmin?.name || 'Adriel Aturinda',
    bizName: existingAdmin?.bizName || 'Online Corporate Administration',
    role: existingAdmin?.role || 'BusinessOwner',
    country: existingAdmin?.country || 'Uganda',
    description: existingAdmin?.description || 'Platform Administrator & Founder'
  };
  loadedUsers[ADMIN_EMAIL] = adminUser;
  safeStorage.setJSON(`oc_u_${ADMIN_EMAIL}`, adminUser);

  return loadedUsers;
}

function getInitialCurrentUser(loadedUsers: Record<string, User>): User | null {
  try {
    const rawLogged = safeStorage.getItem('oc_logged');
    const loggedEmail = typeof rawLogged === 'string' ? rawLogged.trim().toLowerCase() : null;
    if (loggedEmail && loadedUsers[loggedEmail]) {
      return loadedUsers[loggedEmail];
    }
  } catch (e) {}
  return null;
}

export function useAppStorage() {
  const [users, setUsers] = useState<Record<string, User>>(() => getInitialUsers());
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const initUsers = getInitialUsers();
    return getInitialCurrentUser(initUsers);
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => safeStorage.getJSON<Announcement[]>('oc_ann', []));
  const [jobs, setJobs] = useState<Job[]>(() => safeStorage.getJSON<Job[]>('oc_jobs', []));
  const [events, setEvents] = useState<ProfessionalEvent[]>(() => safeStorage.getJSON<ProfessionalEvent[]>('oc_events', []));
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => safeStorage.getJSON<CommunityPost[]>('oc_posts', []));
  const [applications, setApplications] = useState<JobApplication[]>(() => safeStorage.getJSON<JobApplication[]>('oc_applications', []));
  const [appointments, setAppointments] = useState<Appointment[]>(() => safeStorage.getJSON<Appointment[]>('oc_appointments', []));
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const rawLogged = safeStorage.getItem('oc_logged');
    if (rawLogged) {
      return safeStorage.getJSON<Notification[]>(`oc_notif_${rawLogged.trim().toLowerCase()}`, []);
    }
    return [];
  });
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => safeStorage.getJSON<Record<string, Message[]>>('oc_msgs', {}));
  const [searchHistory, setSearchHistory] = useState<JobSearchHistory[]>(() => {
    const rawLogged = safeStorage.getItem('oc_logged');
    if (rawLogged) {
      return safeStorage.getJSON<JobSearchHistory[]>(`oc_search_${rawLogged.trim().toLowerCase()}`, []);
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Background Supabase authentication listener and profile sync
  useEffect(() => {
    let isMounted = true;

    const syncSupabaseAuthUser = (user: any) => {
      if (!user?.email || !isMounted) return;
      const supEmail = user.email.trim().toLowerCase();
      const meta = user.user_metadata || {};
      
      setUsers(prev => {
        const existing = prev[supEmail];
        const syncedUser: User = {
          email: supEmail,
          name: meta.full_name || meta.name || existing?.name || '',
          bizName: meta.bizName || existing?.bizName || '',
          role: (meta.role as any) || existing?.role || 'Employee',
          occupation: meta.occupation || existing?.occupation || '',
          speciality: meta.speciality || existing?.speciality || '',
          location: meta.location || existing?.location || '',
          description: meta.description || existing?.description || '',
          photo: meta.avatar_url || meta.picture || existing?.photo || '',
          isVerified: existing ? Boolean(existing.isVerified) : false,
          documentsAuthorized: existing ? Boolean(existing.documentsAuthorized || existing.isVerified) : false,
          trustedBadge: existing ? Boolean(existing.trustedBadge || existing.isVerified) : false,
          isAdmin: supEmail === ADMIN_EMAIL,
          ...existing,
        };

        safeStorage.setJSON(`oc_u_${supEmail}`, syncedUser);
        safeStorage.setItem('oc_logged', supEmail);
        setCurrentUser(syncedUser);

        // Persist to public profiles in Supabase
        upsertProfileToSupabase(syncedUser).catch(() => {});

        return { ...prev, [supEmail]: syncedUser };
      });
    };

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email && isMounted) {
        syncSupabaseAuthUser(session.user);
      }
    }).catch(() => {});

    // Listen for auth state changes
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.email && isMounted) {
        syncSupabaseAuthUser(session.user);
        try {
          if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {}
      }
    });

    // Check if the current window URL has OAuth hash parameters directly (e.g. redirected directly)
    if (typeof window !== 'undefined' && window.location.hash) {
      try {
        const hash = window.location.hash.replace(/^#/, '');
        if (hash.includes('access_token=')) {
          const params = new URLSearchParams(hash);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            supabase.auth.setSession({ access_token, refresh_token }).then(({ data }) => {
              if (data?.session?.user && isMounted) {
                syncSupabaseAuthUser(data.session.user);
              }
            }).catch(() => {});
          }
        }
      } catch (e) {}
    }

    // Popup OAuth listener for Google Sign In
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const hash = event.data.hash || '';
        const search = event.data.search || '';

        try {
          if (hash) {
            const cleanHash = hash.replace(/^#/, '');
            const params = new URLSearchParams(cleanHash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');

            if (access_token && refresh_token) {
              const { data: sessionData } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (sessionData?.session?.user && isMounted) {
                syncSupabaseAuthUser(sessionData.session.user);
                return;
              }
            }
          }

          if (search) {
            const cleanSearch = search.replace(/^\?/, '');
            const params = new URLSearchParams(cleanSearch);
            const code = params.get('code');
            if (code) {
              const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code);
              if (sessionData?.session?.user && isMounted) {
                syncSupabaseAuthUser(sessionData.session.user);
                return;
              }
            }
          }

          // Fallback: check session from client
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            syncSupabaseAuthUser(session.user);
          }
        } catch (err) {
          console.warn('Failed to process OAuth tokens from popup:', err);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleOAuthMessage);
    }

    // Fetch all registered user profiles from Supabase database in background
    fetchProfilesFromSupabase().then(remoteProfiles => {
      if (remoteProfiles && Array.isArray(remoteProfiles) && remoteProfiles.length > 0 && isMounted) {
        setUsers(prev => {
          const merged = { ...prev };
          remoteProfiles.forEach(p => {
            if (p && typeof p.email === 'string') {
              const e = p.email.trim().toLowerCase();
              merged[e] = { ...(merged[e] || {}), ...p };
              safeStorage.setJSON(`oc_u_${e}`, merged[e]);
            }
          });
          return merged;
        });
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
      try {
        authSub?.subscription?.unsubscribe();
      } catch (e) {}
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', handleOAuthMessage);
      }
    };
  }, []);

  // Synchronize and subscribe to messages in real-time via Supabase
  useEffect(() => {
    if (!currentUser?.email) return;
    const myEmail = currentUser.email.trim().toLowerCase();
    let isMounted = true;

    // Fetch existing messages from Supabase
    const syncRemoteMessages = async () => {
      try {
        const remoteMsgs = await fetchMessagesFromSupabase(myEmail);
        if (remoteMsgs && Object.keys(remoteMsgs).length > 0 && isMounted) {
          setMessages(prev => {
            const merged = { ...prev };
            for (const [key, msgList] of Object.entries(remoteMsgs)) {
              const existing = merged[key] || [];
              const combined = [...existing];
              for (const rm of msgList) {
                const exists = combined.some(
                  m => Math.abs(m.time - rm.time) < 2000 && m.text === rm.text && m.from === rm.from
                );
                if (!exists) {
                  combined.push(rm);
                }
              }
              combined.sort((a, b) => a.time - b.time);
              merged[key] = combined;
            }
            safeStorage.setJSON('oc_msgs', merged);
            return merged;
          });
        }
      } catch (_) {}
    };

    syncRemoteMessages();

    // Realtime channel for instant message receipt
    const unsubscribe = subscribeToMessages(myEmail, (incoming) => {
      if (!isMounted) return;
      const cleanFrom = incoming.sender_email.trim().toLowerCase();
      const cleanTo = incoming.receiver_email.trim().toLowerCase();
      const key = [cleanFrom, cleanTo].sort().join('::');

      const newMsg: Message = {
        from: cleanFrom,
        text: incoming.text,
        time: incoming.created_at ? new Date(incoming.created_at).getTime() : Date.now(),
        read: Boolean(incoming.read)
      };

      setMessages(prev => {
        const existing = prev[key] || [];
        const alreadyHas = existing.some(
          m => Math.abs(m.time - newMsg.time) < 2000 && m.text === newMsg.text && m.from === newMsg.from
        );
        if (alreadyHas) return prev;

        const updatedThread = [...existing, newMsg].sort((a, b) => a.time - b.time);
        const updated = { ...prev, [key]: updatedThread };
        safeStorage.setJSON('oc_msgs', updated);
        return updated;
      });

      // Show notification if message is from the other party
      if (cleanFrom !== myEmail) {
        addNotificationTo(myEmail, {
          type: 'msg',
          text: `New message from ${cleanFrom}`,
          sub: incoming.text.slice(0, 50)
        });
      }
    });

    const intervalId = setInterval(syncRemoteMessages, 30000);

    return () => {
      isMounted = false;
      try {
        unsubscribe();
      } catch (e) {}
      clearInterval(intervalId);
    };
  }, [currentUser?.email]);

  const saveUser = (user: User) => {
    const cleanEmail = user.email.trim().toLowerCase();
    const updatedUser = { ...user, email: cleanEmail };
    safeStorage.setJSON(`oc_u_${cleanEmail}`, updatedUser);
    setUsers(prev => ({ ...prev, [cleanEmail]: updatedUser }));
    if (currentUser?.email.trim().toLowerCase() === cleanEmail) {
      setCurrentUser(updatedUser);
    }
    // Sync profile across devices in Supabase public.profiles
    upsertProfileToSupabase(updatedUser).catch(() => {});
  };

  const login = (email: string, user?: User) => {
    const cleanEmail = email.trim().toLowerCase();
    safeStorage.setItem('oc_logged', cleanEmail);
    const userToSet = user || users[cleanEmail] || null;
    setCurrentUser(userToSet);
    if (userToSet) {
      setNotifications(safeStorage.getJSON<Notification[]>(`oc_notif_${cleanEmail}`, []));
      setSearchHistory(safeStorage.getJSON<JobSearchHistory[]>(`oc_search_${cleanEmail}`, []));
    }
  };

  const logout = () => {
    safeStorage.removeItem('oc_logged');
    setCurrentUser(null);
    signOutFromSupabase().catch(() => {});
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    saveUser(updated);
    updateUserMetadataInSupabase(updated).catch(() => {});
  };

  const createJobApplication = (job: Job) => {
    if (!currentUser) return;
    const newApp: JobApplication = {
      id: `app_${Date.now()}`,
      jobId: job.id.toString(),
      jobTitle: job.title,
      employerEmail: job.posterEmail,
      candidateEmail: currentUser.email,
      candidateName: currentUser.name || currentUser.bizName || currentUser.email,
      candidatePhoto: currentUser.photo || currentUser.logo,
      status: 'Applied',
      appliedAt: Date.now(),
      updatedAt: Date.now()
    };
    const newList = [newApp, ...applications];
    setApplications(newList);
    safeStorage.setJSON('oc_applications', newList);
  };

  const updateApplicationStatus = (appId: string, status: ApplicationStatus) => {
    const newList = applications.map(app => 
      app.id === appId ? { ...app, status, updatedAt: Date.now() } : app
    );
    setApplications(newList);
    safeStorage.setJSON('oc_applications', newList);
    
    const app = applications.find(a => a.id === appId);
    if (app) {
      addNotificationTo(app.candidateEmail, {
        type: 'job',
        text: 'Application Update',
        sub: `Your application for ${app.jobTitle} is now: ${status}`
      });
    }
  };

  const addCommunityPost = (content: string, image?: string) => {
    if (!currentUser) return;
    const newPost: CommunityPost = {
      id: Date.now().toString(),
      authorEmail: currentUser.email,
      authorName: currentUser.bizName || currentUser.name || currentUser.email,
      authorPhoto: currentUser.photo || currentUser.logo,
      content,
      image,
      timestamp: Date.now(),
      likes: []
    };
    const newList = [newPost, ...communityPosts];
    setCommunityPosts(newList);
    safeStorage.setJSON('oc_posts', newList);
  };

  const likePost = (postId: string) => {
    if (!currentUser) return;
    const newList = communityPosts.map(p => {
      if (p.id === postId) {
        const liked = (p.likes || []).includes(currentUser.email);
        return {
          ...p,
          likes: liked 
            ? (p.likes || []).filter(e => e !== currentUser.email)
            : [...(p.likes || []), currentUser.email]
        };
      }
      return p;
    });
    setCommunityPosts(newList);
    safeStorage.setJSON('oc_posts', newList);
  };

  const addEvent = (event: Omit<ProfessionalEvent, 'id' | 'hostEmail' | 'hostName' | 'attendees'>) => {
    if (!currentUser) return;
    const newEvent: ProfessionalEvent = {
      ...event,
      id: Date.now().toString(),
      hostEmail: currentUser.email,
      hostName: currentUser.bizName || currentUser.name || currentUser.email,
      attendees: [currentUser.email]
    };
    const newList = [newEvent, ...events];
    setEvents(newList);
    safeStorage.setJSON('oc_events', newList);
  };

  const joinEvent = (eventId: string) => {
    if (!currentUser) return;
    const newList = events.map(e => {
      if (e.id === eventId) {
        const attending = (e.attendees || []).includes(currentUser.email);
        return {
          ...e,
          attendees: attending 
            ? (e.attendees || []).filter(a => a !== currentUser.email)
            : [...(e.attendees || []), currentUser.email]
        };
      }
      return e;
    });
    setEvents(newList);
    safeStorage.setJSON('oc_events', newList);
  };

  const addNotificationTo = (email: string, notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    const key = `oc_notif_${email}`;
    const newNotif: Notification = {
      ...notif,
      id: Date.now(),
      time: Date.now(),
      read: false
    };
    
    const list = safeStorage.getJSON<Notification[]>(key, []);
    const newList = [newNotif, ...list].slice(0, 50);
    safeStorage.setJSON(key, newList);
    
    if (currentUser?.email === email) {
      setNotifications(newList);
    }
  };

  const sendMessage = (toEmail: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    const cleanFrom = currentUser.email.trim().toLowerCase();
    const cleanTo = toEmail.trim().toLowerCase();
    const key = [cleanFrom, cleanTo].sort().join('::');
    const newMsg: Message = {
      from: cleanFrom,
      text: text.trim(),
      time: Date.now(),
      read: false
    };

    const newMsgs = { ...messages };
    newMsgs[key] = [...(newMsgs[key] || []), newMsg];
    setMessages(newMsgs);
    safeStorage.setJSON('oc_msgs', newMsgs);

    // Persist to Supabase database
    sendMessageToSupabase(cleanFrom, cleanTo, text.trim()).catch(() => {});

    const recipientName = currentUser.bizName || currentUser.name || currentUser.email;
    addNotificationTo(cleanTo, {
      type: 'msg',
      text: `New message from ${recipientName}`,
      sub: text.trim().slice(0, 50)
    });
  };

  const markThreadAsRead = (otherEmail: string) => {
    if (!currentUser || !otherEmail) return;
    const cleanMy = currentUser.email.trim().toLowerCase();
    const cleanOther = otherEmail.trim().toLowerCase();
    const key = [cleanMy, cleanOther].sort().join('::');
    if (!messages[key]) return;
    
    const hasUnread = (messages[key] || []).some(
      m => (m.from || '').trim().toLowerCase() !== cleanMy && !m.read
    );
    if (!hasUnread) return;

    const updatedThread = (messages[key] || []).map(m => 
      (m.from || '').trim().toLowerCase() !== cleanMy ? { ...m, read: true } : m
    );
    
    const newMsgs = { ...messages, [key]: updatedThread };
    setMessages(newMsgs);
    safeStorage.setJSON('oc_msgs', newMsgs);

    // Sync read state with Supabase
    markMessagesAsReadInSupabase(cleanMy, cleanOther).catch(() => {});
  };

  const markNotifsRead = () => {
    if (!currentUser) return;
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    safeStorage.setJSON(`oc_notif_${currentUser.email}`, updated);
  };

  const saveJobSearch = (type: string, location: string) => {
    if (!currentUser) return;
    if (type === 'all' && !location) return;

    const key = `oc_search_${currentUser.email}`;
    const newSearch: JobSearchHistory = {
      id: Date.now().toString(),
      type,
      location,
      timestamp: Date.now()
    };
    
    const isDuplicate = searchHistory.some(s => s.type === type && s.location === location);
    if (isDuplicate) return;

    const newList = [newSearch, ...searchHistory].slice(0, 10);
    setSearchHistory(newList);
    safeStorage.setJSON(key, newList);
  };

  const clearSearchHistory = () => {
    if (!currentUser) return;
    const key = `oc_search_${currentUser.email}`;
    setSearchHistory([]);
    safeStorage.removeItem(key);
  };

  const deleteUser = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    safeStorage.removeItem(`oc_u_${cleanEmail}`);
    setUsers(prev => {
      const copy = { ...prev };
      delete copy[cleanEmail];
      return copy;
    });
    if (currentUser?.email.trim().toLowerCase() === cleanEmail) {
      logout();
    }
  };

  const toggleUserVerified = (email: string, isVerified: boolean, reason?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const targetUser = users[cleanEmail];
    if (!targetUser) return;

    const updated: User = {
      ...targetUser,
      isVerified,
      documentsAuthorized: isVerified,
      trustedBadge: isVerified,
      verificationPending: false,
      verificationReason: reason || (isVerified ? 'Documents Authorized by Platform Administrator' : 'Verification declined by Administrator')
    };

    saveUser(updated);

    addNotificationTo(cleanEmail, {
      type: 'account',
      text: isVerified ? 'Documents Authorized! Trusted Badge Awarded' : 'Document Status Updated',
      sub: reason || (isVerified ? 'Your submitted documents have been officially authorized. The Trusted Badge is now active on your profile.' : 'Your verification request was reviewed.')
    });
  };

  const toggleUserAdmin = (email: string, _isAdmin: boolean) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== ADMIN_EMAIL) {
      return;
    }
    const targetUser = users[cleanEmail];
    if (!targetUser) return;

    const updated: User = {
      ...targetUser,
      isAdmin: true
    };

    saveUser(updated);
  };

  const deleteJob = (jobId: number) => {
    const updated = jobs.filter(j => j.id !== jobId);
    setJobs(updated);
    safeStorage.setJSON('oc_jobs', updated);
  };

  const deleteAnnouncement = (annId: number) => {
    const updated = announcements.filter(a => a.id !== annId);
    setAnnouncements(updated);
    safeStorage.setJSON('oc_ann', updated);
  };

  const deleteCommunityPost = (postId: string) => {
    const updated = communityPosts.filter(p => p.id !== postId);
    setCommunityPosts(updated);
    safeStorage.setJSON('oc_posts', updated);
  };

  const deleteEvent = (eventId: string) => {
    const updated = events.filter(e => e.id !== eventId);
    setEvents(updated);
    safeStorage.setJSON('oc_events', updated);
  };

  const broadcastNotification = (title: string, message: string) => {
    const userEmails = Object.keys(users);
    userEmails.forEach(email => {
      addNotificationTo(email, {
        type: 'account',
        text: title,
        sub: message
      });
    });
  };

  const bookAppointment = (data: {
    hostEmail: string;
    hostName: string;
    topic: string;
    date: string;
    timeSlot: string;
    notes?: string;
  }) => {
    if (!currentUser) return null;
    const newAppt: Appointment = {
      id: `apt_${Date.now()}`,
      hostEmail: data.hostEmail,
      hostName: data.hostName,
      bookerEmail: currentUser.email,
      bookerName: currentUser.bizName || currentUser.name || currentUser.email,
      topic: data.topic,
      date: data.date,
      timeSlot: data.timeSlot,
      notes: data.notes,
      status: 'Scheduled',
      createdAt: Date.now()
    };
    const newList = [newAppt, ...appointments];
    setAppointments(newList);
    safeStorage.setJSON('oc_appointments', newList);

    // Send notification to host
    addNotificationTo(data.hostEmail, {
      type: 'msg',
      text: `New Call Booking from ${newAppt.bookerName}`,
      sub: `${data.topic} on ${data.date} @ ${data.timeSlot}`
    });

    // Also auto-send a message in chat thread
    sendMessage(
      data.hostEmail, 
      `📅 [Discovery Call Booked]\nTopic: ${data.topic}\nDate: ${data.date}\nTime: ${data.timeSlot}${data.notes ? `\nNotes: ${data.notes}` : ''}`
    );

    return newAppt;
  };

  const cancelAppointment = (appointmentId: string) => {
    const newList = appointments.map(a => 
      a.id === appointmentId ? { ...a, status: 'Cancelled' as const } : a
    );
    setAppointments(newList);
    safeStorage.setJSON('oc_appointments', newList);
  };

  return {
    currentUser,
    users,
    announcements,
    jobs,
    notifications,
    messages,
    searchHistory,
    communityPosts,
    events,
    applications,
    appointments,
    isLoading,
    saveUser,
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
    bookAppointment,
    cancelAppointment,
    sendMessage,
    markThreadAsRead,
    markNotifsRead,
    setNotifications,
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
  };
}
