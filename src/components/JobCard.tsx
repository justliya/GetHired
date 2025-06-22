import { useState } from 'react';
import { Bookmark, Briefcase, MapPin, CalendarDays, ChevronDown, ChevronUp, ExternalLink, Building2 } from 'lucide-react';
import type { JobListing } from '../types';

interface JobCardProps {
  job: JobListing;
  onFavoriteToggle: (job: JobListing) => void;
  onResearch: (job: JobListing) => void;
  onTailorResume: (job: JobListing) => void;
  onDelete: (job: JobListing) => void;
}

const statusColors: Record<JobListing['status'], string> = {
  new: 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-300 dark:border-blue-700',
  researching: 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 dark:text-purple-300 dark:border-purple-700',
  applying: 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200 dark:from-yellow-900/20 dark:to-yellow-800/20 dark:text-yellow-300 dark:border-yellow-700',
  applied: 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200 dark:from-green-900/20 dark:to-green-800/20 dark:text-green-300 dark:border-green-700',
  interviewing: 'bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 border-teal-200 dark:from-teal-900/20 dark:to-teal-800/20 dark:text-teal-300 dark:border-teal-700',
  rejected: 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200 dark:from-red-900/20 dark:to-red-800/20 dark:text-red-300 dark:border-red-700',
  offered: 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 border-indigo-200 dark:from-indigo-900/20 dark:to-indigo-800/20 dark:text-indigo-300 dark:border-indigo-700'
};

const statusLabels: Record<JobListing['status'], string> = {
  new: 'New',
  researching: 'Researching',
  applying: 'Applying',
  applied: 'Applied',
  interviewing: 'Interviewing',
  rejected: 'Rejected',
  offered: 'Offered'
};

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