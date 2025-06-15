// components/JobResults.tsx
import React from "react";
import JobGrid from "./JobGrid";
import type { JobListing } from "../types";

interface JobResultsProps {
  jobs: JobListing[];
  onResearch: (job: JobListing) => void;
  onFavoriteToggle: (job: JobListing) => void;
}

const JobResults: React.FC<JobResultsProps> = ({
  jobs,
  onResearch,
  onFavoriteToggle,
}) => {
  if (jobs.length === 0) {
    return (
      <div className="py-8 text-center col-span-3">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          No jobs found with current criteria.
        </p>
      </div>
    );
  }

  return (
    <JobGrid
      jobs={jobs}
      onResearch={onResearch}
      onFavoriteToggle={onFavoriteToggle}
    />
  );
};

export default JobResults;