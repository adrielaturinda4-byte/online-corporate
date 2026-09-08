import { useState, useEffect } from 'react';
import { User, Announcement, Job, Notification, Message, JobSearchHistory, CommunityPost, PortfolioItem, ProfessionalEvent, JobApplication, ApplicationStatus, Appointment } from './types';
import { 
  supabase, 
  signOutFromSupabase, 
  updateUserMetadataInSupabase, 
  fetchProfilesFromSupabase, 
  upsertProfileToSupabase,
  fetchMessagesFromSupabase,
  sendMessageToSupabase,
  markMessagesAsReadInSupabase,
  subscribeToMessages,
  fetchCommunityPostsFromSupabase,
  publishCommunityPostToSupabase,
  subscribeToCommunityFeed
} from './lib/supabase';

export function useAppStorage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [events, setEvents] = useState<ProfessionalEvent[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [searchHistory, setSearchHistory] = useState<JobSearchHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Remove any legacy fake seed accounts from localStorage if present
    const fakeSeedEmails = ['employee@corporate.com', 'employer@corporate.com', 'owner@corporate.com'];
    fakeSeedEmails.forEach(email => {
      localStorage.removeItem(`oc_u_${email}`);
    });

    // Remove legacy fake seed messages from localStorage
    try {
      const storedMsgs = JSON.parse(localStorage.getItem('oc_msgs') || '{}');
      let modified = false;
      for (const key of Object.keys(storedMsgs)) {
        const parts = key.toLowerCase().split('::').map(s => s.trim());
        if (parts.some(p => fakeSeedEmails.includes(p))) {
          delete storedMsgs[key];
          modified = true;
        }
      }
      if (modified) {
        localStorage.setItem('oc_msgs', JSON.stringify(storedMsgs));
      }
    } catch (_) {}

    // Load users
    const loadedUsers: Record<string, User> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('oc_u_')) {
        try {
          const u = JSON.parse(localStorage.getItem(key) || '');
          if (u && u.email && !fakeSeedEmails.includes(u.email.trim().toLowerCase())) {
            const e = u.email.trim().toLowerCase();
            loadedUsers[e] = u;
          }
        } catch (e) {}
      }
    }

    setUsers(loadedUsers);

    // Load current user
    const loggedEmail = localStorage.getItem('oc_logged')?.trim().toLowerCase();
    if (loggedEmail && loadedUsers[loggedEmail]) {
      setCurrentUser(loadedUsers[loggedEmail]);
    }

    // Check active Supabase session & listen for Google OAuth logins
    const syncSupabaseAuthUser = async (user: any) => {
      if (!user?.email) return;
      const supEmail = user.email.trim().toLowerCase();
      const meta = user.user_metadata || {};
      
      const existing = loadedUsers[supEmail];

      // Fetch profile row from Supabase to check the true database is_admin status
      let dbIsAdmin = existing ? Boolean(existing.isAdmin) : false;
      try {
        const { data: prof } = await supabase.from('profiles').select('is_admin').eq('email', supEmail).maybeSingle();
        if (prof && prof.is_admin !== undefined && prof.is_admin !== null) {
          dbIsAdmin = Boolean(prof.is_admin);
        }
      } catch (_) {}

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
        ...existing,
        isAdmin: dbIsAdmin || Boolean(existing?.isAdmin),
      };

      loadedUsers[supEmail] = syncedUser;
      setUsers(prev => ({ ...prev, [supEmail]: syncedUser }));
      localStorage.setItem(`oc_u_${supEmail}`, JSON.stringify(syncedUser));
      setCurrentUser(syncedUser);
      localStorage.setItem('oc_logged', supEmail);

      // Persist to public profiles in Supabase
      upsertProfileToSupabase(syncedUser).catch(() => {});
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        syncSupabaseAuthUser(session.user);
      }
    }).catch(() => {});

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.email) {
        syncSupabaseAuthUser(session.user);
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });

    // Fetch all registered user profiles from Supabase database
    fetchProfilesFromSupabase().then(remoteProfiles => {
      if (remoteProfiles && remoteProfiles.length > 0) {
        setUsers(prev => {
          const merged = { ...prev };
          remoteProfiles.forEach(p => {
            const e = p.email.trim().toLowerCase();
            merged[e] = { ...(merged[e] || {}), ...p, isAdmin: Boolean(p.isAdmin) };
            localStorage.setItem(`oc_u_${e}`, JSON.stringify(merged[e]));
          });
          return merged;
        });

        // Sync currentUser if remote profile has updated admin or badge status
        const activeLogged = localStorage.getItem('oc_logged')?.trim().toLowerCase();
        if (activeLogged) {
          const selfProfile = remoteProfiles.find(p => p.email.trim().toLowerCase() === activeLogged);
          if (selfProfile) {
            setCurrentUser(prev => prev ? ({ ...prev, ...selfProfile, isAdmin: Boolean(selfProfile.isAdmin) }) : prev);
          }
        }
      }
    }).catch(() => {});

    // Load other data
    try {
      setAnnouncements(JSON.parse(localStorage.getItem('oc_ann') || '[]'));
      setJobs(JSON.parse(localStorage.getItem('oc_jobs') || '[]'));
      setEvents(JSON.parse(localStorage.getItem('oc_events') || '[]'));
      setCommunityPosts(JSON.parse(localStorage.getItem('oc_posts') || '[]'));
      setApplications(JSON.parse(localStorage.getItem('oc_applications') || '[]'));
      setAppointments(JSON.parse(localStorage.getItem('oc_appointments') || '[]'));
      
      if (loggedEmail) {
        setNotifications(JSON.parse(localStorage.getItem(`oc_notif_${loggedEmail}`) || '[]'));
        setSearchHistory(JSON.parse(localStorage.getItem(`oc_search_${loggedEmail}`) || '[]'));
      }
      setMessages(JSON.parse(localStorage.getItem('oc_msgs') || '{}'));
    } catch (e) {}

    setIsLoading(false);
  }, []);

  // Synchronize and subscribe to messages in real-time via Supabase
  useEffect(() => {
    if (!currentUser?.email) return;
    const myEmail = currentUser.email.trim().toLowerCase();

    // Fetch existing messages from Supabase
    const syncRemoteMessages = async () => {
      try {
        const remoteMsgs = await fetchMessagesFromSupabase(myEmail);
        if (remoteMsgs && Object.keys(remoteMsgs).length > 0) {
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
            localStorage.setItem('oc_msgs', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (_) {}
    };

    syncRemoteMessages();

    // Realtime channel for instant message receipt
    const unsubscribe = subscribeToMessages(myEmail, (record) => {
      const sender = (record.sender_email || '').trim().toLowerCase();
      const receiver = (record.receiver_email || '').trim().toLowerCase();
      const key = [sender, receiver].sort().join('::');
      const newMsg: Message = {
        from: sender,
        text: record.text || '',
        time: record.created_at ? new Date(record.created_at).getTime() : Date.now(),
        read: Boolean(record.read)
      };

      setMessages(prev => {
        const currentList = prev[key] || [];
        const exists = currentList.some(
          m => Math.abs(m.time - newMsg.time) < 2000 && m.text === newMsg.text && m.from === newMsg.from
        );
        if (exists) return prev;
        const updated = {
          ...prev,
          [key]: [...currentList, newMsg]
        };
        localStorage.setItem('oc_msgs', JSON.stringify(updated));
        return updated;
      });

      // Notification for incoming message
      if (receiver === myEmail && sender !== myEmail) {
        const senderUser = users[sender];
        const senderName = senderUser?.bizName || senderUser?.name || sender;
        addNotificationTo(myEmail, {
          type: 'msg',
          text: `New message from ${senderName}`,
          sub: (record.text || '').slice(0, 50)
        });
      }
    });

    // Fallback sync every 6 seconds to ensure messages never lag
    const intervalId = setInterval(syncRemoteMessages, 6000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [currentUser?.email]);

  // Synchronize Community Posts, Events, and Jobs across all devices and users
  useEffect(() => {
    let isMounted = true;

    // 1. Sync community posts from server API and Supabase
    const syncCommunityFeed = async () => {
      try {
        let serverPosts: CommunityPost[] = [];

        // Fetch from server API
        try {
          const res = await fetch('/api/community-posts');
          if (res.ok) {
            const json = await res.json();
            if (json?.data && Array.isArray(json.data)) {
              serverPosts = json.data;
            }
          }
        } catch (_) {}

        // Fetch from Supabase messages as backup/supplement
        try {
          const supPosts = await fetchCommunityPostsFromSupabase();
          if (supPosts && supPosts.length > 0) {
            for (const sp of supPosts) {
              if (!serverPosts.some(p => p.id === sp.id)) {
                serverPosts.push(sp);
              }
            }
          }
        } catch (_) {}

        // Upload any existing local posts that are not yet on the server
        let localPosts: CommunityPost[] = [];
        try {
          localPosts = JSON.parse(localStorage.getItem('oc_posts') || '[]');
        } catch (_) {}

        for (const lp of localPosts) {
          if (!serverPosts.some(p => p.id === lp.id)) {
            serverPosts.unshift(lp);
            fetch('/api/community-posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(lp)
            }).catch(() => {});
            publishCommunityPostToSupabase(lp).catch(() => {});
          }
        }

        serverPosts.sort((a, b) => b.timestamp - a.timestamp);

        if (isMounted && serverPosts.length > 0) {
          setCommunityPosts(serverPosts);
          localStorage.setItem('oc_posts', JSON.stringify(serverPosts));
        }
      } catch (_) {}
    };

    // 2. Sync Jobs and Events across users
    const syncJobsAndEvents = async () => {
      try {
        const [jobsRes, eventsRes] = await Promise.allSettled([
          fetch('/api/jobs').then(r => r.json()),
          fetch('/api/events').then(r => r.json())
        ]);

        if (jobsRes.status === 'fulfilled' && jobsRes.value?.data && Array.isArray(jobsRes.value.data)) {
          const sJobs = jobsRes.value.data;
          let lJobs: Job[] = [];
          try {
            lJobs = JSON.parse(localStorage.getItem('oc_jobs') || '[]');
          } catch (_) {}

          const mergedJobs = [...sJobs];
          for (const lj of lJobs) {
            if (!mergedJobs.some(j => j.id === lj.id)) {
              mergedJobs.unshift(lj);
              fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(lj)
              }).catch(() => {});
            }
          }
          if (isMounted) {
            setJobs(mergedJobs);
            localStorage.setItem('oc_jobs', JSON.stringify(mergedJobs));
          }
        }

        if (eventsRes.status === 'fulfilled' && eventsRes.value?.data && Array.isArray(eventsRes.value.data)) {
          const sEvents = eventsRes.value.data;
          let lEvents: ProfessionalEvent[] = [];
          try {
            lEvents = JSON.parse(localStorage.getItem('oc_events') || '[]');
          } catch (_) {}

          const mergedEvents = [...sEvents];
          for (const le of lEvents) {
            if (!mergedEvents.some(e => e.id === le.id)) {
              mergedEvents.unshift(le);
              fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(le)
              }).catch(() => {});
            }
          }
          if (isMounted) {
            setEvents(mergedEvents);
            localStorage.setItem('oc_events', JSON.stringify(mergedEvents));
          }
        }
      } catch (_) {}
    };

    syncCommunityFeed();
    syncJobsAndEvents();

    // Listen to Supabase Realtime for instant community feed delivery across users
    const unsubscribeFeed = subscribeToCommunityFeed((newFeedPost) => {
      if (!isMounted) return;
      setCommunityPosts(prev => {
        if (prev.some(p => p.id === newFeedPost.id)) return prev;
        const updated = [newFeedPost, ...prev];
        localStorage.setItem('oc_posts', JSON.stringify(updated));
        return updated;
      });
    });

    // Periodic background sync every 8 seconds
    const interval = setInterval(() => {
      syncCommunityFeed();
    }, 8000);

    return () => {
      isMounted = false;
      unsubscribeFeed();
      clearInterval(interval);
    };
  }, []);

  const saveUser = (user: User) => {
    const cleanEmail = user.email.trim().toLowerCase();
    const updatedUser = { ...user, email: cleanEmail };
    localStorage.setItem(`oc_u_${cleanEmail}`, JSON.stringify(updatedUser));
    setUsers(prev => ({ ...prev, [cleanEmail]: updatedUser }));
    if (currentUser?.email.trim().toLowerCase() === cleanEmail) {
      setCurrentUser(updatedUser);
    }
    // Sync profile across devices in Supabase public.profiles
    upsertProfileToSupabase(updatedUser).catch(() => {});
  };

  const login = (email: string, user?: User) => {
    const cleanEmail = email.trim().toLowerCase();
    localStorage.setItem('oc_logged', cleanEmail);
    const userToSet = user || users[cleanEmail] || null;
    setCurrentUser(userToSet);
    if (userToSet) {
      setNotifications(JSON.parse(localStorage.getItem(`oc_notif_${cleanEmail}`) || '[]'));
      setSearchHistory(JSON.parse(localStorage.getItem(`oc_search_${cleanEmail}`) || '[]'));
    }
  };

  const logout = () => {
    localStorage.removeItem('oc_logged');
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
    localStorage.setItem('oc_applications', JSON.stringify(newList));
  };

  const updateApplicationStatus = (appId: string, status: ApplicationStatus) => {
    const newList = applications.map(app => 
      app.id === appId ? { ...app, status, updatedAt: Date.now() } : app
    );
    setApplications(newList);
    localStorage.setItem('oc_applications', JSON.stringify(newList));
    
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
    const cleanEmail = currentUser.email.trim().toLowerCase();
    const newPost: CommunityPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      authorEmail: cleanEmail,
      authorName: currentUser.bizName || currentUser.name || cleanEmail,
      authorPhoto: currentUser.photo || currentUser.logo || '',
      content: content.trim(),
      image,
      timestamp: Date.now(),
      likes: []
    };
    
    // 1. Optimistic update in state and localStorage
    const newList = [newPost, ...communityPosts];
    setCommunityPosts(newList);
    localStorage.setItem('oc_posts', JSON.stringify(newList));

    // 2. Persist to shared server API so any user on any device can read it
    fetch('/api/community-posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost)
    }).catch(err => console.warn('[Community API Post notice]:', err));

    // 3. Broadcast to Supabase Realtime so active users see it live instantly
    publishCommunityPostToSupabase(newPost).catch(() => {});
  };

  const likePost = (postId: string) => {
    if (!currentUser) return;
    const cleanEmail = currentUser.email.trim().toLowerCase();
    const newList = communityPosts.map(p => {
      if (p.id === postId) {
        const liked = p.likes.includes(cleanEmail);
        return {
          ...p,
          likes: liked 
            ? p.likes.filter(e => e !== cleanEmail)
            : [...p.likes, cleanEmail]
        };
      }
      return p;
    });
    setCommunityPosts(newList);
    localStorage.setItem('oc_posts', JSON.stringify(newList));

    // Sync like action to server
    fetch(`/api/community-posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: cleanEmail })
    }).catch(() => {});
  };

  const addEvent = (event: Omit<ProfessionalEvent, 'id' | 'hostEmail' | 'hostName' | 'attendees'>) => {
    if (!currentUser) return;
    const newEvent: ProfessionalEvent = {
      ...event,
      id: `ev_${Date.now()}`,
      hostEmail: currentUser.email.trim().toLowerCase(),
      hostName: currentUser.bizName || currentUser.name || currentUser.email,
      attendees: [currentUser.email.trim().toLowerCase()]
    };
    const newList = [newEvent, ...events];
    setEvents(newList);
    localStorage.setItem('oc_events', JSON.stringify(newList));

    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent)
    }).catch(() => {});
  };

  const joinEvent = (eventId: string) => {
    if (!currentUser) return;
    const cleanEmail = currentUser.email.trim().toLowerCase();
    const newList = events.map(e => {
      if (e.id === eventId) {
        const attending = (e.attendees || []).includes(cleanEmail);
        return {
          ...e,
          attendees: attending 
            ? e.attendees.filter(a => a !== cleanEmail)
            : [...(e.attendees || []), cleanEmail]
        };
      }
      return e;
    });
    setEvents(newList);
    localStorage.setItem('oc_events', JSON.stringify(newList));

    fetch(`/api/events/${eventId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: cleanEmail })
    }).catch(() => {});
  };

  const addNotificationTo = (email: string, notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    const key = `oc_notif_${email}`;
    const newNotif: Notification = {
      ...notif,
      id: Date.now(),
      time: Date.now(),
      read: false
    };
    
    let list: Notification[] = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {}
    
    const newList = [newNotif, ...list].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(newList));
    
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
    localStorage.setItem('oc_msgs', JSON.stringify(newMsgs));

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
    if (!currentUser) return;
    const cleanMy = currentUser.email.trim().toLowerCase();
    const cleanOther = otherEmail.trim().toLowerCase();
    const key = [cleanMy, cleanOther].sort().join('::');
    if (!messages[key]) return;
    
    const updatedThread = messages[key].map(m => 
      m.from?.trim().toLowerCase() !== cleanMy ? { ...m, read: true } : m
    );
    
    const newMsgs = { ...messages, [key]: updatedThread };
    setMessages(newMsgs);
    localStorage.setItem('oc_msgs', JSON.stringify(newMsgs));

    // Sync read state with Supabase
    markMessagesAsReadInSupabase(cleanMy, cleanOther).catch(() => {});
  };

  const markAllMessagesAsRead = () => {
    if (!currentUser?.email) return;
    const cleanMy = currentUser.email.trim().toLowerCase();
    let hasChanges = false;
    const updated = { ...messages };

    for (const [key, thread] of Object.entries(updated)) {
      const parts = key.toLowerCase().split('::').map(s => s.trim());
      if (parts.includes(cleanMy) && Array.isArray(thread)) {
        const newThread = thread.map(m => {
          if (m.from?.trim().toLowerCase() !== cleanMy && !m.read) {
            hasChanges = true;
            return { ...m, read: true };
          }
          return m;
        });
        updated[key] = newThread;
        const otherEmail = parts.find(p => p !== cleanMy);
        if (otherEmail) {
          markMessagesAsReadInSupabase(cleanMy, otherEmail).catch(() => {});
        }
      }
    }

    if (hasChanges) {
      setMessages(updated);
      localStorage.setItem('oc_msgs', JSON.stringify(updated));
    }
  };

  const markNotifsRead = () => {
    if (!currentUser) return;
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(`oc_notif_${currentUser.email}`, JSON.stringify(updated));
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
    localStorage.setItem(key, JSON.stringify(newList));
  };

  const clearSearchHistory = () => {
    if (!currentUser) return;
    const key = `oc_search_${currentUser.email}`;
    setSearchHistory([]);
    localStorage.removeItem(key);
  };

  const deleteUser = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    localStorage.removeItem(`oc_u_${cleanEmail}`);
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

  const toggleUserAdmin = (email: string, makeAdmin: boolean) => {
    const cleanEmail = email.trim().toLowerCase();
    const targetUser = users[cleanEmail];
    if (!targetUser) return;

    const updated: User = {
      ...targetUser,
      isAdmin: makeAdmin
    };

    saveUser(updated);
  };

  const deleteJob = (jobId: number) => {
    const updated = jobs.filter(j => j.id !== jobId);
    setJobs(updated);
    localStorage.setItem('oc_jobs', JSON.stringify(updated));
    fetch(`/api/jobs/${jobId}`, { method: 'DELETE' }).catch(() => {});
  };

  const deleteAnnouncement = (annId: number) => {
    const updated = announcements.filter(a => a.id !== annId);
    setAnnouncements(updated);
    localStorage.setItem('oc_ann', JSON.stringify(updated));
  };

  const deleteCommunityPost = (postId: string) => {
    const updated = communityPosts.filter(p => p.id !== postId);
    setCommunityPosts(updated);
    localStorage.setItem('oc_posts', JSON.stringify(updated));
    fetch(`/api/community-posts/${postId}`, { method: 'DELETE' }).catch(() => {});
  };

  const deleteEvent = (eventId: string) => {
    const updated = events.filter(e => e.id !== eventId);
    setEvents(updated);
    localStorage.setItem('oc_events', JSON.stringify(updated));
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
    localStorage.setItem('oc_appointments', JSON.stringify(newList));

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
    localStorage.setItem('oc_appointments', JSON.stringify(newList));
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
    markAllMessagesAsRead,
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
