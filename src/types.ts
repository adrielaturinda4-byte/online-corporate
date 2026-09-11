export type UserRole = 'Employee' | 'Employer' | 'BusinessOwner';

export type ApplicationStatus = 'Applied' | 'Under Review' | 'Interviewing' | 'Offered' | 'Rejected';

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  employerEmail: string;
  candidateEmail: string;
  candidateName: string;
  candidatePhoto?: string;
  status: ApplicationStatus;
  appliedAt: number;
  updatedAt: number;
}

export interface User {
  email: string;
  password?: string;
  isVerified?: boolean;
  verificationCode?: string;
  role?: UserRole;
  name?: string;
  age?: string;
  occupation?: string;
  contact?: string;
  country?: string;
  description?: string;
  skills?: string;
  resumeContent?: string;
  photo?: string;
  business?: string; // For Employer
  bizName?: string; // For BusinessOwner
  speciality?: string;
  industry?: string;
  website?: string;
  location?: string;
  logo?: string;
  contacts?: string[];
  staff?: StaffMember[];
  views?: number;
  openToWork?: boolean;
  assignedPost?: string;
  assignedBiz?: string;
  endorsements?: string[];
  ratings?: number[];
  ratingVoters?: Record<string, number>;
  portfolio?: PortfolioItem[];
  skillEndorsements?: Record<string, string[]>; // skillName -> list of emails who endorsed
  isAdmin?: boolean;
  verificationPending?: boolean;
  verificationDoc?: string;
  verificationType?: string;
  verificationReason?: string;
  verificationConfidence?: number;
  verificationChecks?: { name: string; passed: boolean; detail: string }[];
  verifiedAt?: string;
}

export interface ProfessionalEvent {
  id: string;
  hostEmail: string;
  hostName: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: 'Webinar' | 'Meetup' | 'Workshop';
  attendees: string[]; // emails
  image?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  image?: string;
  link?: string;
}

export interface CommunityPost {
  id: string;
  authorEmail: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  image?: string;
  timestamp: number;
  likes: string[]; // emails
}

export interface StaffMember {
  email: string;
  name: string;
  post: string;
}

export interface Announcement {
  id: number;
  title: string;
  type: 'hiring' | 'looking' | 'general';
  occupation?: string;
  contact: string;
  desc: string;
  posterEmail: string;
  posterName: string;
  posterRole: string;
  time: string;
}

export interface Job {
  id: number;
  title: string;
  type: 'fulltime' | 'parttime' | 'contract' | 'remote';
  salary?: string;
  location: string;
  contact: string;
  desc: string;
  posterEmail: string;
  posterName: string;
  posterRole: string;
  time: string;
}

export interface Message {
  from: string;
  text: string;
  time: number;
  read: boolean;
}

export interface Thread {
  key: string;
  other: string;
  messages: Message[];
}

export interface Notification {
  id: number;
  type: 'msg' | 'job' | 'assign' | 'ann' | 'account';
  text: string;
  sub?: string;
  time: number;
  read: boolean;
}

export interface JobSearchHistory {
  id: string;
  type: string;
  location: string;
  timestamp: number;
}

export interface Appointment {
  id: string;
  hostEmail: string;
  hostName: string;
  bookerEmail: string;
  bookerName: string;
  topic: string;
  date: string;
  timeSlot: string;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  createdAt: number;
}
