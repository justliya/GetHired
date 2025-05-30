import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { 
  Profile, 
  JobPreferences, 
  UserData, 
  Application,
  Resume,
  JobListing,
  JobSearch
} from "../models/UserData";

// Basic auth user interface
export interface AppUser extends UserData {
  uid: string;
}

interface UserContextValue {
  user: AppUser | null;
  setUser: (u: AppUser | null) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  setUser: () => {},
  loading: true,
});

const defaultJobPreferences: JobPreferences = {
  titles: [],
  locations: [],
  skills: [],
  salaryRange: { min: 0, max: 100000 },
  jobType: "Full-time",
  seniority: "Junior",
  other: "",
  includeKeywords: [],
  excludeKeywords: [],
  scheduleEnabled: false,
  schedulePreset: "Daily",
  customSchedule: "",
};

const defaultApplications: Application[] = [
  {
    company: "TechCorp",
    role: "Frontend Developer",
    status: "applied",
    resumeRef: "resume1",
    notes: "Initial application submitted",
    updatedAt: new Date().toISOString()
  }
];

const defaultResumes: Resume[] = [
  {
    fileUrl: "https://example.com/default-resume.pdf",
    createdAt: new Date().toISOString(),
    type: "original",
    metadata: {
      title: "Initial Resume",
      description: "General purpose resume",
      keywords: ["JavaScript", "React", "TypeScript"],
      uploadSource: "manual",
      isOriginal: true
    }
  }
];

const defaultJobListings: JobListing[] = [
  {
    title: "Frontend Developer",
    company: "TechCorp",
    location: "Remote",
    postedDate: new Date().toISOString(),
    description: "Looking for a frontend developer with React experience",
    url: "https://example.com/job1",
    salary: "$100k-$150k",
    employmentType: "Full-time"
  }
];

const defaultJobSearches: JobSearch[] = [
  {
    preferences: defaultJobPreferences,
    initiatedAt: new Date().toISOString(),
    resultsCount: 0,
    status: "completed"
  }
];

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        const userRef = doc(db, "users", fbUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          // Preserve existing data structure
          setUser({ uid: fbUser.uid, ...userSnap.data() } as AppUser);
        } else {
          // Initialize new user with default structure
          const defaultProfile: Profile = {
            name: fbUser.displayName || "",
            email: fbUser.email || "",
            phone: "",
            createdAt: new Date().toISOString(),
          };

          const userData: UserData = {
            profile: defaultProfile,
            jobPreferences: defaultJobPreferences,
            applications: defaultApplications,
            resumes: defaultResumes,
            jobListings: defaultJobListings,
            jobSearches: defaultJobSearches,
          };

          // Save initial user data
          await setDoc(userRef, userData);

          // Set user in context
          setUser({ uid: fbUser.uid, ...userData } as AppUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const User = () => useContext(UserContext);