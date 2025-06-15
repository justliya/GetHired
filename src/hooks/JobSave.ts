// hooks/JobSave.ts
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import type { JobListing } from "../types";

const db = getFirestore();

export const saveListingsToUserProfile = async (
  uid: string,
  listings: JobListing[]
): Promise<void> => {
  if (!uid) return;

  const userRef = doc(db, "users", uid);

  try {
    await updateDoc(userRef, {
      jobListings: listings,
      lastJobUpdate: new Date().toISOString(),
    });
    console.log("Job listings updated to user profile");
  } catch (error) {
    console.warn("Initial update failed, attempting to create document:", error);
    try {
      await setDoc(
        userRef,
        {
          jobListings: listings,
          lastJobUpdate: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log("User document created and listings saved");
    } catch (createError) {
      console.error("Error saving job listings to user profile:", createError);
    }
  }
};