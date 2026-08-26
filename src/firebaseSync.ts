import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Unsubscribe
} from 'firebase/firestore';
import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType, 
  testFirestoreConnection,
  signInWithPopup,
  googleProvider,
  firebaseSignOut
} from './firebase';
import { 
  User, 
  Job, 
  Announcement, 
  CommunityPost, 
  ProfessionalEvent, 
  JobApplication, 
  Appointment, 
  Message, 
  Notification 
} from './types';

// Helper to get safe document ID for email
export const emailToDocId = (email: string) => {
  return email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
};

export const syncFirebase = {
  // Test connection
  testConnection: testFirestoreConnection,

  // Google Login
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  },

  // USERS
  saveUser: async (user: User) => {
    const docId = emailToDocId(user.email);
    const path = `users/${docId}`;
    try {
      await setDoc(doc(db, 'users', docId), user, { merge: true });
    } catch (error) {
      // Non-blocking catch with proper logging
      console.warn('Firestore saveUser error:', error);
    }
  },

  subscribeUsers: (callback: (users: Record<string, User>) => void): Unsubscribe => {
    const path = 'users';
    return onSnapshot(collection(db, path), (snapshot) => {
      const userMap: Record<string, User> = {};
      snapshot.forEach(docSnap => {
        const u = docSnap.data() as User;
        if (u && u.email) {
          userMap[u.email.trim().toLowerCase()] = u;
        }
      });
      callback(userMap);
    }, (error) => {
      console.warn('Firestore subscribeUsers error:', error);
    });
  },

  deleteUser: async (email: string) => {
    const docId = emailToDocId(email);
    try {
      await deleteDoc(doc(db, 'users', docId));
    } catch (error) {
      console.warn('Firestore deleteUser error:', error);
    }
  },

  // JOBS
  saveJob: async (job: Job) => {
    const docId = job.id.toString();
    try {
      await setDoc(doc(db, 'jobs', docId), job);
    } catch (error) {
      console.warn('Firestore saveJob error:', error);
    }
  },

  deleteJob: async (jobId: number) => {
    try {
      await deleteDoc(doc(db, 'jobs', jobId.toString()));
    } catch (error) {
      console.warn('Firestore deleteJob error:', error);
    }
  },

  subscribeJobs: (callback: (jobs: Job[]) => void): Unsubscribe => {
    return onSnapshot(collection(db, 'jobs'), (snapshot) => {
      const list: Job[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Job);
      });
      list.sort((a, b) => (b.id || 0) - (a.id || 0));
      callback(list);
    }, (error) => {
      console.warn('Firestore subscribeJobs error:', error);
    });
  },

  // ANNOUNCEMENTS
  saveAnnouncement: async (ann: Announcement) => {
    const docId = ann.id.toString();
    try {
      await setDoc(doc(db, 'announcements', docId), ann);
    } catch (error) {
      console.warn('Firestore saveAnnouncement error:', error);
    }
  },

  deleteAnnouncement: async (annId: number) => {
    try {
      await deleteDoc(doc(db, 'announcements', annId.toString()));
    } catch (error) {
      console.warn('Firestore deleteAnnouncement error:', error);
    }
  },

  subscribeAnnouncements: (callback: (announcements: Announcement[]) => void): Unsubscribe => {
    return onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const list: Announcement[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Announcement);
      });
      list.sort((a, b) => (b.id || 0) - (a.id || 0));
      callback(list);
    }, (error) => {
      console.warn('Firestore subscribeAnnouncements error:', error);
    });
  },

  // COMMUNITY POSTS
  saveCommunityPost: async (post: CommunityPost) => {
    try {
      await setDoc(doc(db, 'communityPosts', post.id), post);
    } catch (error) {
      console.warn('Firestore saveCommunityPost error:', error);
    }
  },

  deleteCommunityPost: async (postId: string) => {
    try {
      await deleteDoc(doc(db, 'communityPosts', postId));
    } catch (error) {
      console.warn('Firestore deleteCommunityPost error:', error);
    }
  },

  subscribeCommunityPosts: (callback: (posts: CommunityPost[]) => void): Unsubscribe => {
    return onSnapshot(collection(db, 'communityPosts'), (snapshot) => {
      const list: CommunityPost[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as CommunityPost);
      });
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(list);
    }, (error) => {
      console.warn('Firestore subscribeCommunityPosts error:', error);
    });
  },

  // PROFESSIONAL EVENTS
  saveEvent: async (event: ProfessionalEvent) => {
    try {
      await setDoc(doc(db, 'events', event.id), event);
    } catch (error) {
      console.warn('Firestore saveEvent error:', error);
    }
  },

  deleteEvent: async (eventId: string) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
    } catch (error) {
      console.warn('Firestore deleteEvent error:', error);
    }
  },

  subscribeEvents: (callback: (events: ProfessionalEvent[]) => void): Unsubscribe => {
    return onSnapshot(collection(db, 'events'), (snapshot) => {
      const list: ProfessionalEvent[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as ProfessionalEvent);
      });
      callback(list);
    }, (error) => {
      console.warn('Firestore subscribeEvents error:', error);
    });
  },

  // JOB APPLICATIONS
  saveApplication: async (app: JobApplication) => {
    try {
      await setDoc(doc(db, 'applications', app.id), app);
    } catch (error) {
      console.warn('Firestore saveApplication error:', error);
    }
  },

  subscribeApplications: (callback: (apps: JobApplication[]) => void): Unsubscribe => {
    return onSnapshot(collection(db, 'applications'), (snapshot) => {
      const list: JobApplication[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as JobApplication);
      });
      list.sort((a, b) => (b.appliedAt || 0) - (a.appliedAt || 0));
      callback(list);
    }, (error) => {
      console.warn('Firestore subscribeApplications error:', error);
    });
  },

  // APPOINTMENTS
  saveAppointment: async (appt: Appointment) => {
    try {
      await setDoc(doc(db, 'appointments', appt.id), appt);
    } catch (error) {
      console.warn('Firestore saveAppointment error:', error);
    }
  },

  subscribeAppointments: (callback: (appts: Appointment[]) => void): Unsubscribe => {
    return onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const list: Appointment[] = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data() as Appointment);
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(list);
    }, (error) => {
      console.warn('Firestore subscribeAppointments error:', error);
    });
  },

  // CHAT MESSAGES
  saveMessage: async (msg: Message & { to: string; threadKey: string }) => {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await setDoc(doc(db, 'messages', msgId), {
        id: msgId,
        from: msg.from,
        to: msg.to,
        threadKey: msg.threadKey,
        text: msg.text,
        time: msg.time,
        read: msg.read
      });
    } catch (error) {
      console.warn('Firestore saveMessage error:', error);
    }
  },

  subscribeMessages: (callback: (messagesMap: Record<string, Message[]>) => void): Unsubscribe => {
    return onSnapshot(collection(db, 'messages'), (snapshot) => {
      const map: Record<string, Message[]> = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Message & { to: string; threadKey: string };
        const key = data.threadKey || [data.from, data.to].sort().join('::');
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push({
          from: data.from,
          text: data.text,
          time: data.time,
          read: data.read
        });
      });

      // Sort messages by time
      Object.keys(map).forEach(k => {
        map[k].sort((a, b) => a.time - b.time);
      });

      callback(map);
    }, (error) => {
      console.warn('Firestore subscribeMessages error:', error);
    });
  },

  // NOTIFICATIONS
  saveNotification: async (notif: Notification & { userEmail: string }) => {
    const notifId = `notif_${notif.id}`;
    try {
      await setDoc(doc(db, 'notifications', notifId), notif);
    } catch (error) {
      console.warn('Firestore saveNotification error:', error);
    }
  },

  subscribeNotifications: (userEmail: string, callback: (notifs: Notification[]) => void): Unsubscribe => {
    const cleanEmail = userEmail.trim().toLowerCase();
    return onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const list: Notification[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Notification & { userEmail: string };
        if (data.userEmail && data.userEmail.trim().toLowerCase() === cleanEmail) {
          list.push({
            id: data.id,
            type: data.type,
            text: data.text,
            sub: data.sub,
            time: data.time,
            read: data.read
          });
        }
      });
      list.sort((a, b) => b.time - a.time);
      callback(list);
    }, (error) => {
      console.warn('Firestore subscribeNotifications error:', error);
    });
  }
};
