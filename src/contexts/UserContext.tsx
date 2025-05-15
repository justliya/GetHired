import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { auth, db, onAuthStateChanged } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

 
export interface AppUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  // New optional fields
  role: string;
  location: string;
  connections: number;
  applications: number;
  interviews: number;
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

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setUser(snap.data() as AppUser);
        } else {
          // Fill in defaults for the new fields
          const defaultProfile: AppUser = {
            uid: fbUser.uid,
            name: fbUser.displayName || "",
            email: fbUser.email || "",
            photoURL: fbUser.photoURL || "",
            role: "",
            location: "",
            connections: 0,
            applications: 0,
            interviews: 0,
          };
          await setDoc(ref, defaultProfile);
          setUser(defaultProfile);
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