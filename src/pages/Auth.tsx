

import { useEffect, useState } from "react";
import {
  auth,
  db,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
} from "../firebase";
import { User as UserIcon, LogIn } from "lucide-react";
import type { User } from "firebase/auth";

export default function Auth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          await createUserDoc(currentUser);
        } catch (error) {
          console.error("Error creating user doc:", error);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const createUserDoc = async (user: User) => {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: new Date(),
      });
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await createUserDoc(result.user);
      setUser(result.user);
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md text-center space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to GetHired
        </h1>
        {user ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <UserIcon className="w-6 h-6 text-gray-500 mr-2" />
              <p className="font-medium text-gray-800">{user.displayName}</p>
            </div>
            <img
              src={user.photoURL || ""}
              alt="User avatar"
              className="w-16 h-16 rounded-full mx-auto shadow"
            />
          </div>
        ) : (
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-gray-700"
          >
            <LogIn size={20} />
            <span className="text-sm font-medium">Sign in with Google</span>
          </button>
        )}
      </div>
    </div>
  );
}
