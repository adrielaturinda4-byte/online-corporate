import { useState, useEffect } from 'react';
import { 
  User, 
  Announcement, 
  Job, 
  Notification, 
  Message, 
  JobSearchHistory, 
  CommunityPost, 
  ProfessionalEvent, 
  JobApplication, 
  ApplicationStatus, 
  Appointment 
} from './types';
import { db, auth, googleProvider, setCachedGoogleAccessToken, handleFirestoreError, OperationType } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  GoogleAuthProvider 
} from 'firebase/auth';

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
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Helper to sanitize doc IDs
  const sanitizeId = (id: string) => id.replace(/[/.]/g, '_').toLowerCase();

  useEffect(() => {
    // Remove any legacy fake seed accounts from localStorage if present
    const fakeSeedEmails = ['employee@corporate.com', 'employer@corporate.com', 'owner@corporate.com'];
    fakeSeedEmails.forEach(email => {
      localStorage.removeItem(`oc_u_${email}`);
    });

    // 1. Initial Local Data Load for Instant Offline/Hydrated Responsiveness
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

    // Ensure Admin Account adrielaturinda4@gmail.com is present with requested credentials
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

    // Initial load from local
    const loggedEmail = localStorage.getItem('oc_logged')?.trim().toLowerCase();
    if (loggedEmail && loadedUsers[loggedEmail]) {
      setCurrentUser(loadedUsers[loggedEmail]);
    }

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

    // 2. Realtime Cloud Firestore Synchronization
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setIsFirebaseConnected(true);
      const remoteUsers: Record<string, User> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as User;
        if (data && data.email) {
          const email = data.email.trim().toLowerCase();
          if (email !== 'adrielaturinda4@gmail.com') {
            data.isAdmin = false;
          }
          remoteUsers[email] = data;
          localStorage.setItem(`oc_u_${email}`, JSON.stringify(data));
        }
      });

      // Always guarantee master admin
      remoteUsers[adminEmail] = {
        ...(remoteUsers[adminEmail] || {}),
        ...adminUser,
        isAdmin: true
      };

      setUsers(prev => ({ ...prev, ...remoteUsers }));
      
      const currentLogged = localStorage.getItem('oc_logged')?.trim().toLowerCase();
      if (currentLogged && remoteUsers[currentLogged]) {
        setCurrentUser(remoteUsers[currentLogged]);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    const unsubJobs = onSnapshot(collection(db, 'jobs'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteJobs: Job[] = [];
        snapshot.forEach(docSnap => {
          remoteJobs.push(docSnap.data() as Job);
        });
        remoteJobs.sort((a, b) => (b.id || 0) - (a.id || 0));
        setJobs(remoteJobs);
        localStorage.setItem('oc_jobs', JSON.stringify(remoteJobs));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'jobs');
    });

    const unsubAnn = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteAnn: Announcement[] = [];
        snapshot.forEach(docSnap => {
          remoteAnn.push(docSnap.data() as Announcement);
        });
        remoteAnn.sort((a, b) => (b.id || 0) - (a.id || 0));
        setAnnouncements(remoteAnn);
        localStorage.setItem('oc_ann', JSON.stringify(remoteAnn));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'announcements');
    });

    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteEvents: ProfessionalEvent[] = [];
        snapshot.forEach(docSnap => {
          remoteEvents.push(docSnap.data() as ProfessionalEvent);
        });
        setEvents(remoteEvents);
        localStorage.setItem('oc_events', JSON.stringify(remoteEvents));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'events');
    });

    const unsubPosts = onSnapshot(collection(db, 'community_posts'), (snapshot) => {
      if (!snapshot.empty) {
        const remotePosts: CommunityPost[] = [];
        snapshot.forEach(docSnap => {
          remotePosts.push(docSnap.data() as CommunityPost);
        });
        remotePosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setCommunityPosts(remotePosts);
        localStorage.setItem('oc_posts', JSON.stringify(remotePosts));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'community_posts');
    });

    const unsubApps = onSnapshot(collection(db, 'applications'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteApps: JobApplication[] = [];
        snapshot.forEach(docSnap => {
          remoteApps.push(docSnap.data() as JobApplication);
        });
        remoteApps.sort((a, b) => (b.appliedAt || 0) - (a.appliedAt || 0));
        setApplications(remoteApps);
        localStorage.setItem('oc_applications', JSON.stringify(remoteApps));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'applications');
    });

    const unsubApts = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      if (!snapshot.empty) {
        const remoteApts: Appointment[] = [];
        snapshot.forEach(docSnap => {
          remoteApts.push(docSnap.data() as Appointment);
        });
        remoteApts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAppointments(remoteApts);
        localStorage.setItem('oc_appointments', JSON.stringify(remoteApts));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'appointments');
    });

    // 3. Listen to Firebase Auth state
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const email = firebaseUser.email.trim().toLowerCase();
        // If not logged in locally or different user
        if (!currentUser || currentUser.email !== email) {
          const existing = loadedUsers[email];
          if (existing) {
            login(email, existing);
          } else {
            // New Firebase user profile
            const newUser: User = {
              email,
              name: firebaseUser.displayName || email.split('@')[0],
              photo: firebaseUser.photoURL || undefined,
              isVerified: email === 'adrielaturinda4@gmail.com',
              isAdmin: email === 'adrielaturinda4@gmail.com',
              role: 'Employee'
            };
            saveUser(newUser);
            login(email, newUser);
          }
        }
      }
    });

    return () => {
      unsubUsers();
      unsubJobs();
      unsubAnn();
      unsubEvents();
      unsubPosts();
      unsubApps();
      unsubApts();
      unsubAuth();
    };
  }, []);

  const saveUser = (user: User) => {
    const cleanEmail = user.email.trim().toLowerCase();
    const isMaster = cleanEmail === 'adrielaturinda4@gmail.com';
    const updatedUser = { 
      ...user, 
      email: cleanEmail,
      isAdmin: isMaster ? true : false 
    };

    localStorage.setItem(`oc_u_${cleanEmail}`, JSON.stringify(updatedUser));
    setUsers(prev => ({ ...prev, [cleanEmail]: updatedUser }));
    if (currentUser?.email.trim().toLowerCase() === cleanEmail) {
      setCurrentUser(updatedUser);
    }

    // Sync to Cloud Firestore
    const docId = sanitizeId(cleanEmail);
    setDoc(doc(db, 'users', docId), updatedUser, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `users/${docId}`);
    });
  };

  // Concurrency guard for Firebase Auth popup to avoid "INTERNAL ASSERTION FAILED: Pending promise was never set"
  const [isGoogleAuthPending, setIsGoogleAuthPending] = useState(false);

  const loginWithGoogle = async (): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (isGoogleAuthPending) {
      return { success: false, error: 'Sign-in is already in progress. Please check the open Google window.' };
    }

    setIsGoogleAuthPending(true);
    try {
      // Set custom parameters if needed
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedGoogleAccessToken(credential.accessToken);
      }
      const fbUser = result.user;
      if (fbUser.email) {
        const cleanEmail = fbUser.email.trim().toLowerCase();
        const existing = users[cleanEmail];
        if (existing) {
          login(cleanEmail, existing);
          setIsGoogleAuthPending(false);
          return { success: true, user: existing };
        } else {
          const newUser: User = {
            email: cleanEmail,
            name: fbUser.displayName || cleanEmail.split('@')[0],
            photo: fbUser.photoURL || undefined,
            isVerified: cleanEmail === 'adrielaturinda4@gmail.com',
            isAdmin: cleanEmail === 'adrielaturinda4@gmail.com',
            role: 'Employee'
          };
          saveUser(newUser);
          login(cleanEmail, newUser);
          setIsGoogleAuthPending(false);
          return { success: true, user: newUser };
        }
      }
      setIsGoogleAuthPending(false);
      return { success: false, error: 'No email found in Google account.' };
    } catch (error: any) {
      setIsGoogleAuthPending(false);
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';

      // Gracefully handle iframe popup blocking and user cancellations
      if (errorCode === 'auth/popup-blocked') {
        return {
          success: false,
          error: 'Google Sign-In popup was blocked by your browser/iframe sandbox. Please open the app in a new tab or use the email & password form below.'
        };
      } else if (errorCode === 'auth/popup-closed-by-user') {
        return {
          success: false,
          error: 'The Google sign-in window was closed before completing.'
        };
      } else if (errorCode === 'auth/cancelled-popup-request') {
        return {
          success: false,
          error: 'Another sign-in attempt was in progress. Please try again.'
        };
      } else if (errorCode === 'auth/internal-error' || errorMessage.includes('INTERNAL ASSERTION') || errorMessage.includes('Pending promise')) {
        return {
          success: false,
          error: 'Authentication popup is restricted inside the preview iframe. Please sign in with email/password or open the app in a new browser tab.'
        };
      } else if (errorCode === 'auth/unauthorized-domain') {
        return {
          success: false,
          error: 'This domain is not in your Firebase authorized domains list. Please use the email sign in below.'
        };
      }

      console.warn('Firebase Auth Notice:', errorCode || errorMessage);
      return { success: false, error: errorMessage || 'Google Sign In could not be completed.' };
    }
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

  const logout = async () => {
    localStorage.removeItem('oc_logged');
    setCurrentUser(null);
    try {
      await fbSignOut(auth);
    } catch (e) {}
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    saveUser(updated);
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

    // Sync to Firestore
    setDoc(doc(db, 'applications', newApp.id), newApp).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `applications/${newApp.id}`);
    });
  };

  const updateApplication = (appId: string, updates: Partial<JobApplication>) => {
    const newList = applications.map(app => 
      app.id === appId ? { ...app, ...updates, updatedAt: Date.now() } : app
    );
    setApplications(newList);
    localStorage.setItem('oc_applications', JSON.stringify(newList));
    
    const targetApp = newList.find(a => a.id === appId);
    if (targetApp) {
      setDoc(doc(db, 'applications', appId), targetApp, { merge: true }).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `applications/${appId}`);
      });
      if (updates.status) {
        addNotificationTo(targetApp.candidateEmail, {
          type: 'job',
          text: 'Application Update',
          sub: `Your application for ${targetApp.jobTitle} is now: ${updates.status}`
        });
      }
    }
  };

  const updateApplicationStatus = (appId: string, status: ApplicationStatus) => {
    updateApplication(appId, { status });
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

    // Sync to Firestore
    setDoc(doc(db, 'community_posts', newPost.id), newPost).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `community_posts/${newPost.id}`);
    });
  };

  const likePost = (postId: string) => {
    if (!currentUser) return;
    const targetPost = communityPosts.find(p => p.id === postId);
    if (!targetPost) return;

    const liked = targetPost.likes.includes(currentUser.email);
    const updatedLikes = liked 
      ? targetPost.likes.filter(e => e !== currentUser.email)
      : [...targetPost.likes, currentUser.email];

    const updatedPost = { ...targetPost, likes: updatedLikes };
    const newList = communityPosts.map(p => p.id === postId ? updatedPost : p);
    setCommunityPosts(newList);
    localStorage.setItem('oc_posts', JSON.stringify(newList));

    setDoc(doc(db, 'community_posts', postId), { likes: updatedLikes }, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `community_posts/${postId}`);
    });
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

    setDoc(doc(db, 'events', newEvent.id), newEvent).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `events/${newEvent.id}`);
    });
  };

  const joinEvent = (eventId: string) => {
    if (!currentUser) return;
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) return;

    const attending = targetEvent.attendees.includes(currentUser.email);
    const updatedAttendees = attending 
      ? targetEvent.attendees.filter(a => a !== currentUser.email)
      : [...targetEvent.attendees, currentUser.email];

    const updatedEvent = { ...targetEvent, attendees: updatedAttendees };
    const newList = events.map(e => e.id === eventId ? updatedEvent : e);
    setEvents(newList);
    localStorage.setItem('oc_events', JSON.stringify(newList));

    setDoc(doc(db, 'events', eventId), { attendees: updatedAttendees }, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `events/${eventId}`);
    });
  };

  const addNotificationTo = (email: string, notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
    const cleanEmail = email.trim().toLowerCase();
    const key = `oc_notif_${cleanEmail}`;
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
    
    if (currentUser?.email === cleanEmail) {
      setNotifications(newList);
    }

    const notifDocId = `notif_${newNotif.id}`;
    setDoc(doc(db, 'notifications', notifDocId), {
      ...newNotif,
      recipientEmail: cleanEmail
    }).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `notifications/${notifDocId}`);
    });
  };

  const sendMessage = (toEmail: string, text: string) => {
    if (!currentUser) return;
    const cleanTo = toEmail.trim().toLowerCase();
    const cleanFrom = currentUser.email.trim().toLowerCase();
    const key = [cleanFrom, cleanTo].sort().join('::');
    const newMsg: Message = {
      from: cleanFrom,
      text,
      time: Date.now(),
      read: false
    };

    const newMsgs = { ...messages };
    newMsgs[key] = [...(newMsgs[key] || []), newMsg];
    setMessages(newMsgs);
    localStorage.setItem('oc_msgs', JSON.stringify(newMsgs));

    // Sync to Firestore messages collection
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setDoc(doc(db, 'messages', msgId), {
      id: msgId,
      threadKey: key,
      from: cleanFrom,
      to: cleanTo,
      text,
      time: newMsg.time,
      read: false
    }).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `messages/${msgId}`);
    });

    const recipientName = currentUser.bizName || currentUser.name || currentUser.email;
    addNotificationTo(cleanTo, {
      type: 'msg',
      text: `New message from ${recipientName}`,
      sub: text.slice(0, 50)
    });
  };

  const markThreadAsRead = (otherEmail: string) => {
    if (!currentUser) return;
    const key = [currentUser.email.trim().toLowerCase(), otherEmail.trim().toLowerCase()].sort().join('::');
    if (!messages[key]) return;
    
    const updatedThread = messages[key].map(m => 
      m.from !== currentUser.email ? { ...m, read: true } : m
    );
    
    const newMsgs = { ...messages, [key]: updatedThread };
    setMessages(newMsgs);
    localStorage.setItem('oc_msgs', JSON.stringify(newMsgs));
  };

  const markNotifsRead = () => {
    if (!currentUser) return;
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(`oc_notif_${currentUser.email.trim().toLowerCase()}`, JSON.stringify(updated));
  };

  const saveJobSearch = (type: string, location: string) => {
    if (!currentUser) return;
    if (type === 'all' && !location) return;

    const key = `oc_search_${currentUser.email.trim().toLowerCase()}`;
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
    const key = `oc_search_${currentUser.email.trim().toLowerCase()}`;
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
    const docId = sanitizeId(cleanEmail);
    deleteDoc(doc(db, 'users', docId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `users/${docId}`);
    });
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

  const addJob = (job: Job) => {
    const newList = [job, ...jobs];
    setJobs(newList);
    localStorage.setItem('oc_jobs', JSON.stringify(newList));
    setDoc(doc(db, 'jobs', job.id.toString()), job).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `jobs/${job.id}`);
    });
  };

  const deleteJob = (jobId: number) => {
    const updated = jobs.filter(j => j.id !== jobId);
    setJobs(updated);
    localStorage.setItem('oc_jobs', JSON.stringify(updated));
    deleteDoc(doc(db, 'jobs', jobId.toString())).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `jobs/${jobId}`);
    });
  };

  const addAnnouncement = (ann: Announcement) => {
    const newList = [ann, ...announcements];
    setAnnouncements(newList);
    localStorage.setItem('oc_ann', JSON.stringify(newList));
    setDoc(doc(db, 'announcements', ann.id.toString()), ann).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `announcements/${ann.id}`);
    });
  };

  const deleteAnnouncement = (annId: number) => {
    const updated = announcements.filter(a => a.id !== annId);
    setAnnouncements(updated);
    localStorage.setItem('oc_ann', JSON.stringify(updated));
    deleteDoc(doc(db, 'announcements', annId.toString())).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${annId}`);
    });
  };

  const deleteCommunityPost = (postId: string) => {
    const updated = communityPosts.filter(p => p.id !== postId);
    setCommunityPosts(updated);
    localStorage.setItem('oc_posts', JSON.stringify(updated));
    deleteDoc(doc(db, 'community_posts', postId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `community_posts/${postId}`);
    });
  };

  const deleteEvent = (eventId: string) => {
    const updated = events.filter(e => e.id !== eventId);
    setEvents(updated);
    localStorage.setItem('oc_events', JSON.stringify(updated));
    deleteDoc(doc(db, 'events', eventId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `events/${eventId}`);
    });
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
    meetUri?: string;
    meetCode?: string;
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
      meetUri: data.meetUri,
      meetCode: data.meetCode,
      status: 'Scheduled',
      createdAt: Date.now()
    };
    const newList = [newAppt, ...appointments];
    setAppointments(newList);
    localStorage.setItem('oc_appointments', JSON.stringify(newList));

    setDoc(doc(db, 'appointments', newAppt.id), newAppt).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, `appointments/${newAppt.id}`);
    });

    // Send notification to host
    addNotificationTo(data.hostEmail, {
      type: 'msg',
      text: `New Call Booking from ${newAppt.bookerName}`,
      sub: `${data.topic} on ${data.date} @ ${data.timeSlot}${data.meetUri ? ' (Google Meet)' : ''}`
    });

    // Auto-send chat message
    sendMessage(
      data.hostEmail, 
      `📅 [Discovery Call Booked]\nTopic: ${data.topic}\nDate: ${data.date}\nTime: ${data.timeSlot}${data.meetUri ? `\nGoogle Meet: ${data.meetUri}` : ''}${data.notes ? `\nNotes: ${data.notes}` : ''}`
    );

    return newAppt;
  };

  const updateAppointment = (appointmentId: string, updates: Partial<Appointment>) => {
    const newList = appointments.map(a => 
      a.id === appointmentId ? { ...a, ...updates } : a
    );
    setAppointments(newList);
    localStorage.setItem('oc_appointments', JSON.stringify(newList));

    setDoc(doc(db, 'appointments', appointmentId), updates, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${appointmentId}`);
    });
  };

  const cancelAppointment = (appointmentId: string) => {
    updateAppointment(appointmentId, { status: 'Cancelled' });
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
    isFirebaseConnected,
    saveUser,
    login,
    loginWithGoogle,
    logout,
    updateCurrentUser,
    addNotificationTo,
    setAnnouncements,
    addAnnouncement,
    setJobs,
    addJob,
    addCommunityPost,
    likePost,
    addEvent,
    joinEvent,
    createJobApplication,
    updateApplication,
    updateApplicationStatus,
    bookAppointment,
    updateAppointment,
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
