import { Bookmark, Briefcase, MapPin } from 'lucide-react';
import type { JobListing } from '../types';

interface JobCardProps {
  job: JobListing;
  onFavoriteToggle: (job: JobListing) => void;
  onResearch: (job: JobListing) => void;
}

const JobCard = ({ job, onFavoriteToggle, onResearch }: JobCardProps) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={job.avatar || '/placeholder-avatar.png'} alt="Company logo" className="w-10 h-10 rounded-full" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{job.company}</p>
          </div>
        </div>
        <button onClick={() => onFavoriteToggle(job)}>
          <Bookmark className={`w-5 h-5 ${job.favorite ? 'text-yellow-500' : 'text-gray-400'}`} />
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">{job.description}</p>
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Briefcase className="w-4 h-4" />
        <span>{job.salary || 'Salary not listed'}</span>
        <MapPin className="w-4 h-4 ml-4" />
        <span>{job.location}</span>
      </div>
      <div className="flex justify-between">
        <button
          onClick={() => window.open(job.url || '#', '_blank')}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          View Job
        </button>
        <button
          onClick={() => onResearch(job)}
          className="text-gray-600 dark:text-gray-300 hover:underline text-sm"
        >
          Research
        </button>
      </div>
    </div>
  );
};

export default JobCard;