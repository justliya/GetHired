// hooks/JobSave.ts
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { JobListing } from "../types";

export async function saveListingsToUserProfile(
  uid: string,
  listings: JobListing[]
): Promise<void> {
  if (!uid) return;
  const userRef = doc(db, "users", uid);
  const payload = {
    jobListings: listings,
    lastJobUpdate: new Date().toISOString(),
  };

  try {
    // Always merge so existing fields aren’t clobbered
    await setDoc(userRef, payload, { merge: true });
    console.log("✅ Job listings successfully saved for user", uid);
  } catch (err) {
    console.error("🔥 Failed to save job listings:", err);
    throw err;
  }
}