// components/JobResults.tsx
import JobCard from "./JobCard";
import type { JobListing } from "../types";

type Props = {
  jobs: JobListing[];
  onResearch: (job: JobListing) => void;
  onFavoriteToggle: (job: JobListing) => void;
  useAgentJobs?: boolean;
  onShowAssistant?: () => void;
  onClearFilters?: () => void;
};

const JobResults = ({
  jobs,
  onResearch,
  onFavoriteToggle,
  useAgentJobs,
  onShowAssistant,
  onClearFilters,
}: Props) => {
  if (jobs.length === 0) {
    return (
      <div className="col-span-3 py-8 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {useAgentJobs
            ? "No AI-found jobs match your filters. Try adjusting filters or ask for different criteria."
            : "No jobs found with current criteria."}
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear Filters
          </button>
        )}
        {onShowAssistant && (
          <button
            onClick={onShowAssistant}
            className="mt-2 ml-4 text-purple-600 dark:text-purple-400 hover:underline"
          >
            Ask AI Assistant
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onResearch={onResearch}
          onFavoriteToggle={onFavoriteToggle}
        />
      ))}
    </div>
  );
};

export default JobResults;