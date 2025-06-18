import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

import { db, auth } from "../firebase";
import type { JobListing } from "../types";

const CompanyResearch = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [user] = useAuthState(auth);

  const [job, setJob] = useState<JobListing | null>(null);
  // Define a type for research data or use 'unknown' if not yet defined
  const [researchData, setResearchData] = useState<unknown>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid || !jobId || jobId === "new") return;

      try {
        const jobRef = doc(db, "users", user.uid, "jobListings", jobId);
        const researchRef = doc(db, "users", user.uid, "companyResearch", jobId);

        const [jobSnap, researchSnap] = await Promise.all([
          getDoc(jobRef),
          getDoc(researchRef),
        ]);

        if (jobSnap.exists()) setJob(jobSnap.data() as JobListing);
        if (researchSnap.exists()) setResearchData(researchSnap.data());
      } catch (err) {
        console.error("Error fetching job or research data:", err);
      }
    };

    fetchData();
  }, [jobId, user?.uid]);

  const title = job?.title;
  const company = job?.company;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {job ? `Researching ${company} for ${title}` : "Research a new company"}
        </p>
      </div>

      {researchData ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Company Research Details</h2>
          <pre className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{JSON.stringify(researchData, null, 2)}</pre>
          <button
            onClick={async () => {
              if (!user?.uid || !jobId) return;
              try {
                localStorage.removeItem("companyResearch");
                const ref = doc(db, "users", user.uid, "companyResearch", jobId);
                await deleteDoc(ref);
                setResearchData(null);
              } catch (err) {
                console.error("Failed to delete company research:", err);
              }
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md"
          >
            Delete Research
          </button>
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No company research available.</p>
      )}
    </div>
  );
};

export default CompanyResearch;