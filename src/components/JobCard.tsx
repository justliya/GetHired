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

const JobCard = ({ job, onFavoriteToggle, onResearch, onDelete }: JobCardProps) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [areQualificationsExpanded, setAreQualificationsExpanded] = useState(false);
  const qualifications = job.qualifications ?? [];
  const visibleQualifications = areQualificationsExpanded ? qualifications : qualifications.slice(0, 3);

  const handleViewJob = () => {
    if (job.jobLink && job.jobLink.trim() !== '') {
      window.open(job.jobLink, '_blank');
    } else {
      alert('No job link available for this position');
    }
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate pr-2">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                {job.company}
              </p>
            </div>
          </div>
          <button 
            onClick={() => onFavoriteToggle(job)}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <Bookmark 
              className={`w-5 h-5 transition-colors ${
                job.favorite 
                  ? 'text-yellow-500 fill-yellow-500' 
                  : 'text-gray-400 hover:text-yellow-500'
              }`} 
            />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full border ${statusColors[job.status]}`}>
            {statusLabels[job.status]}
          </span>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {isDescriptionExpanded ? job.description : `${job.description.slice(0, 150)}${job.description.length > 150 ? '...' : ''}`}
          </p>
          {job.description.length > 150 && (
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              {isDescriptionExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show more
                </>
              )}
            </button>
          )}
        </div>

        {/* Job Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              <span className="font-medium">{job.salary || 'Salary not specified'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <CalendarDays className="w-4 h-4" />
              <span>Posted {job.datePosted}</span>
            </div>
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

        {/* Qualifications */}
        {qualifications.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Requirements
              </h4>
              {qualifications.length > 3 && (
                <button
                  onClick={() => setAreQualificationsExpanded(!areQualificationsExpanded)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  {areQualificationsExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Show all ({qualifications.length})
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleQualifications.map((qual, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200"
                  title={qual.length > 30 ? qual : undefined}
                >
                  {qual.length > 30 ? `${qual.slice(0, 30)}...` : qual}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleViewJob}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              job.jobLink && job.jobLink.trim() !== '' 
                ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20' 
                : 'text-gray-400 cursor-not-allowed'
            }`}
            disabled={!job.jobLink || job.jobLink.trim() === ''}
          >
            <ExternalLink className="w-4 h-4" />
            View Job
          </button>
          
          <div className="flex items-center gap-1">
            <label className="inline-flex items-center space-x-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={job.status === 'researching'}
                onChange={() => {
                  window.getSelection()?.removeAllRanges();
                  onResearch(job);
                }}
                className="form-checkbox rounded border-gray-300 text-purple-600 dark:border-gray-600 dark:bg-gray-800"
              />
              <span>Research</span>
            </label>
            <button
              onClick={() => onDelete(job)}
              className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;