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
  subscribeToMessages
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

    // Load users
    const loadedUsers: Record<string, User> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('oc_u_')) {
        try {
          const u = JSON.parse(localStorage.getItem(key) || '');
          if (u && u.email && !fakeSeedEmails.includes(u.email.trim().toLowerCase())) {
            const e = u.email.trim().toLowerCase();
            if (e !== 'adrielaturinda4@gmail.com') {
              u.isAdmin = false;
            }
            loadedUsers[e] = u;
          }
        } catch (e) {}
      }
    }

    // Ensure Admin Account adrielaturinda4@gmail.com is present with requested credentials and permissions
    const adminEmail = 'adrielaturinda4@gmail.com';
    const existingAdmin = loadedUsers[adminEmail];
    const adminUser: User = {
      ...(existingAdmin || {}),
      email: adminEmail,
      password: 'adrielissocool1',
      isAdmin: true,
      isVerified: true,
      name: existingAdmin?.name || 'Adriel Aturinda',
      bizName: existingAdmin?.bizName || 'Online Corporate Administration',
      role: existingAdmin?.role || 'BusinessOwner',
      country: existingAdmin?.country || 'Uganda',
      description: existingAdmin?.description || 'Platform Administrator & Founder'
    };
    loadedUsers[adminEmail] = adminUser;
    localStorage.setItem(`oc_u_${adminEmail}`, JSON.stringify(adminUser));

    setUsers(loadedUsers);

    // Load current user
    const loggedEmail = localStorage.getItem('oc_logged')?.trim().toLowerCase();
    if (loggedEmail && loadedUsers[loggedEmail]) {
      setCurrentUser(loadedUsers[loggedEmail]);
    }

    // Check active Supabase session & listen for Google OAuth logins
    const syncSupabaseAuthUser = (user: any) => {
      if (!user?.email) return;
      const supEmail = user.email.trim().toLowerCase();
      const meta = user.user_metadata || {};
      
      const existing = loadedUsers[supEmail];
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
        isVerified: existing ? existing.isVerified : true,
        isAdmin: supEmail === 'adrielaturinda4@gmail.com',
        ...existing,
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
            merged[e] = { ...(merged[e] || {}), ...p };
            localStorage.setItem(`oc_u_${e}`, JSON.stringify(merged[e]));
          });
          return merged;
        });
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
    localStorage.setItem('oc_posts', JSON.stringify(newList));
  };

  const likePost = (postId: string) => {
    if (!currentUser) return;
    const newList = communityPosts.map(p => {
      if (p.id === postId) {
        const liked = p.likes.includes(currentUser.email);
        return {
          ...p,
          likes: liked 
            ? p.likes.filter(e => e !== currentUser.email)
            : [...p.likes, currentUser.email]
        };
      }
      return p;
    });
    setCommunityPosts(newList);
    localStorage.setItem('oc_posts', JSON.stringify(newList));
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
    localStorage.setItem('oc_events', JSON.stringify(newList));
  };

  const joinEvent = (eventId: string) => {
    if (!currentUser) return;
    const newList = events.map(e => {
      if (e.id === eventId) {
        const attending = e.attendees.includes(currentUser.email);
        return {
          ...e,
          attendees: attending 
            ? e.attendees.filter(a => a !== currentUser.email)
            : [...e.attendees, currentUser.email]
        };
      }
      return e;
    });
    setEvents(newList);
    localStorage.setItem('oc_events', JSON.stringify(newList));
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
      m.from !== cleanMy ? { ...m, read: true } : m
    );
    
    const newMsgs = { ...messages, [key]: updatedThread };
    setMessages(newMsgs);
    localStorage.setItem('oc_msgs', JSON.stringify(newMsgs));

    // Sync read state with Supabase
    markMessagesAsReadInSupabase(cleanMy, cleanOther).catch(() => {});
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
      verificationPending: false,
      verificationReason: reason || (isVerified ? 'Approved by Platform Administrator' : 'Verification declined by Administrator')
    };

    saveUser(updated);

    addNotificationTo(cleanEmail, {
      type: 'account',
      text: isVerified ? 'Identity Verified! Badge Granted' : 'Verification Status Updated',
      sub: reason || (isVerified ? 'An administrator has verified your national identity document.' : 'Your verification request was reviewed.')
    });
  };

  const toggleUserAdmin = (email: string, _isAdmin: boolean) => {
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail !== 'adrielaturinda4@gmail.com') {
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
    localStorage.setItem('oc_jobs', JSON.stringify(updated));
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
