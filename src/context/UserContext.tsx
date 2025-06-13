import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { auth, db, onAuthStateChanged } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User as FirebaseUser, IdTokenResult } from 'firebase/auth';
import type { JobPreferences } from '../models/UserData';

// --- Profile-related types ---
export interface ExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  description: string;
}

export interface EducationEntry {
  school: string;
  degree: string;
  field: string;
  graduationYear: number;
}

export interface LinkEntry {
  type: string; // e.g. 'linkedin', 'github', etc.
  url: string;
}

// --- AppUser ---
// Extend FirebaseUser with your custom application and profile fields
export interface AppUser extends Omit<FirebaseUser, 'reload'> {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  location: string;
  connections: number;
  applications: number;
  interviews: number;
  title: string;
  bio: string;
  avatar: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  links: LinkEntry[];
  preferences?: JobPreferences;
}

interface UserContextValue {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const ref = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(ref);
        let data: Partial<AppUser> = {};
        if (snap.exists()) {
          data = snap.data() as Partial<AppUser>;
        } else {
          // Create default profile
          const defaults: Partial<AppUser> = {
            role: '',
            location: '',
            connections: 0,
            applications: 0,
            interviews: 0,
            title: '',
            bio: '',
            avatar: fbUser.photoURL || '',
            skills: [],
            experience: [],            education: [],
            links: [],
            preferences: {
              titles: [],
              locations: [],
              salaryRange: { min: 0, max: 200000 },
              jobType: 'Full-time',
              seniority: 'Mid',
              other: '',
              includeKeywords: [],
              excludeKeywords: [],
              searchSchedule: {
                enabled: false,
                frequency: 'Daily',
                customSchedule: '09:00',
                notificationType: 'Email',
                quietHours: {
                  start: '22:00',
                  end: '08:00'
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
              },
              skills: []
            }
          };
          await setDoc(ref, defaults);
          data = defaults;
        }
        // Merge FirebaseUser with stored data
        const merged: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          emailVerified: fbUser.emailVerified,
          providerId: fbUser.providerId,
          metadata: fbUser.metadata,
          getIdToken: (forceRefresh?: boolean) => fbUser.getIdToken(forceRefresh),

          role: data.role || '',
          location: data.location || '',
          connections: data.connections || 0,
          applications: data.applications || 0,
          interviews: data.interviews || 0,
          title: data.title || '',
          bio: data.bio || '',
          avatar: data.avatar || '',
          skills: Array.isArray(data.skills) ? data.skills : [],
          experience: Array.isArray(data.experience) ? data.experience : [],
          education: Array.isArray(data.education) ? data.education : [],          links: Array.isArray(data.links) ? data.links : [],
          preferences: data.preferences || {
            titles: [],
            locations: [],
            salaryRange: { min: 0, max: 200000 },
            jobType: 'Full-time',
            seniority: 'Mid',
            other: '',
            includeKeywords: [],
            excludeKeywords: [],
            searchSchedule: {
              enabled: false,
              frequency: 'Daily',
              customSchedule: '09:00',
              notificationType: 'Email',
              quietHours: {
                start: '22:00',
                end: '08:00'
              },
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            skills: []
          },
          isAnonymous: false,
          providerData: [],
          refreshToken: '',
          tenantId: null,
          delete: function (): Promise<void> {
            throw new Error('Function not implemented.');
          },
          getIdTokenResult: function (): Promise<IdTokenResult> {
            throw new Error('Function not implemented.');
          },
          toJSON: function (): object {
            throw new Error('Function not implemented.');
          },
          phoneNumber: null
        };
        setUser(merged);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const User = (): UserContextValue => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
};