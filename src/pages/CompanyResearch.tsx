import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

import { db, auth } from "../firebase";
import type { JobListing } from "../types";

const CompanyResearch = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [user] = useAuthState(auth);

  const [job, setJob] = useState<JobListing | null>(null);
  // Define a type for research data or use 'unknown' if not yet defined
  const [researchData, setResearchData] = useState<unknown>(null);
  const [isResearching, setIsResearching] = useState(jobId === "new");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

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

  const startResearch = () => {
    setIsResearching(true);
    setTimeout(() => {
      setIsResearching(false);
  
    }, 3000);
  };

  const title = job?.title || jobTitle;
  const company = job?.company || companyName;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {job ? `Researching ${company} for ${title}` : "Research a new company"}
        </p>
      </div>

      {jobId === "new" && !researchData ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Research a New Company</h2>
          <input
            className="w-full mb-3 p-2 rounded-md border dark:bg-gray-700 dark:text-white"
            placeholder="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <input
            className="w-full mb-4 p-2 rounded-md border dark:bg-gray-700 dark:text-white"
            placeholder="Job Title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
          <button
            disabled={!companyName || isResearching}
            onClick={startResearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            {isResearching ? "Researching..." : "Start Research"}
          </button>
        </div>
      ) : (
        <>

        </>
      )}
    </div>
  );
};

export default CompanyResearch;