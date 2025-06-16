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
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Job Description
        </label>
        <div className="flex gap-3">
          {userJobs.length > 0 && (
            <button
              onClick={onToggleJobSelector}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-md border border-blue-200 dark:border-blue-700 transition-colors"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Saved Jobs ({userJobs.length})
              <ChevronDown className={`w-4 h-4 ml-1.5 transition-transform ${showJobSelector ? 'rotate-180' : ''}`} />
            </button>
          )}
          <button
            onClick={onLoadSampleJob}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md border border-gray-200 dark:border-gray-600 transition-colors"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Sample Job
          </button>
        </div>
      </div>

      {showJobSelector && (
        <div className="mb-4 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg bg-white dark:bg-gray-800 overflow-hidden">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Select from your saved jobs</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click on a job to load its description</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {userJobs.map((jobListing) => (
              <button
                key={jobListing.id}
                onClick={() => onLoadJobFromListing(jobListing)}
                className="w-full text-left p-4 hover:bg-blue-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {jobListing.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{jobListing.company}</div>
                    {jobListing.location && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                        📍 {jobListing.location}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to load
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={jobDescription}
        onChange={(e) => onJobDescriptionChange(e.target.value)}
        className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg h-64 resize-none bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors"
        placeholder="Paste the job description here, or use the buttons above to load from your saved jobs or try a sample job description..."
      />
    </div>
  );
};

export default JobDescriptionInput;
