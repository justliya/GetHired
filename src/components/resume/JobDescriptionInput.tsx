import { FileText, ChevronDown } from 'lucide-react';
import type { JobListing } from '../../types';

interface JobDescriptionInputProps {
  jobDescription: string;
  userJobs: JobListing[];
  showJobSelector: boolean;
  onJobDescriptionChange: (value: string) => void;
  onToggleJobSelector: () => void;
  onLoadJobFromListing: (jobListing: JobListing) => void;
  onLoadSampleJob: () => void;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  jobDescription,
  userJobs,
  showJobSelector,
  onJobDescriptionChange,
  onToggleJobSelector,
  onLoadJobFromListing,
  onLoadSampleJob
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Job Description
        </label>
        <div className="flex gap-2">
          {userJobs.length > 0 && (
            <button
              onClick={onToggleJobSelector}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center transition-colors"
            >
              <FileText className="w-4 h-4 mr-1" />
              Load from saved jobs ({userJobs.length})
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showJobSelector ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            onClick={onLoadSampleJob}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 flex items-center transition-colors"
          >
            <FileText className="w-4 h-4 mr-1" />
            Load Sample Job
          </button>
        </div>
      </div>

      {showJobSelector && (
        <div className="mb-4 border border-gray-300 dark:border-gray-600 rounded-md max-h-32 overflow-y-auto bg-white dark:bg-gray-800 shadow-lg z-10 relative">
          {userJobs.map((jobListing) => (
            <button
              key={jobListing.id}
              onClick={() => onLoadJobFromListing(jobListing)}
              className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white">{jobListing.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{jobListing.company}</div>
              {jobListing.location && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{jobListing.location}</div>
              )}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={jobDescription}
        onChange={(e) => onJobDescriptionChange(e.target.value)}
        className="w-full p-3 border rounded-md h-64 resize-none dark:bg-gray-700 dark:text-white"
        placeholder="Paste the job description here or load from saved jobs..."
      />
    </div>
  );
};

export default JobDescriptionInput;
