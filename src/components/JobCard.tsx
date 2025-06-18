import { useState } from 'react';
import { Bookmark, Briefcase, MapPin, CalendarDays } from 'lucide-react';
import type { JobListing } from '../types';

interface JobCardProps {
  job: JobListing;
  onFavoriteToggle: (job: JobListing) => void;
  onResearch: (job: JobListing) => void;
  onTailorResume: (job: JobListing) => void;
  onDelete: (job: JobListing) => void;
}

const statusColors: Record<JobListing['status'], string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  researching: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  applying: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  applied: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  interviewing: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  offered: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
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

const JobCard = ({ job, onFavoriteToggle, onResearch, onTailorResume, onDelete }: JobCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const qualifications = job.qualifications ?? [];

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{job.company}</p>
          </div>
          <button onClick={() => onFavoriteToggle(job)}>
            <Bookmark className={`w-5 h-5 ${job.favorite ? 'text-yellow-500' : 'text-gray-400'}`} />
          </button>
        </div>

        <span className={`inline-block text-xs font-medium mb-2 px-2.5 py-0.5 rounded-full ${statusColors[job.status]}`}>
          {statusLabels[job.status]}
        </span>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {isExpanded ? job.description : `${job.description.slice(0, 120)}...`}
        </p>
        {job.description.length > 120 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            {isExpanded ? 'Read less' : 'Read more'}
          </button>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Briefcase className="w-4 h-4" />
          <span>{job.salary || 'Salary not listed'}</span>
          <MapPin className="w-4 h-4 ml-4" />
          <span>{job.location}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <CalendarDays className="w-4 h-4" />
          <span>Posted {job.datePosted}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {qualifications.slice(0, 2).map((qual, index) => (
            <span key={index} className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded text-xs">
              {qual.length > 25 ? `${qual.slice(0, 25)}...` : qual}
            </span>
          ))}
          {qualifications.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">+{qualifications.length - 2} more</span>
          )}
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => window.open(job.jobLink || '#', '_blank')}
            className="text-blue-600 hover:underline dark:text-blue-400 text-sm font-medium"
          >
            View Job
          </button>
          <button
            onClick={() => onResearch(job)}
            className="text-gray-600 dark:text-gray-300 hover:underline text-sm"
          >
            Research Company
          </button>
          <button
            onClick={() => onTailorResume(job)}
            className="text-teal-600 dark:text-teal-400 hover:underline text-sm"
          >
            Tailor Resume
          </button>
          <button
            onClick={() => onDelete(job)}
            className="text-red-600 dark:text-red-400 hover:underline text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
};

export default JobCard;