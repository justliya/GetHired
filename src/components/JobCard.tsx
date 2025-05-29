import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, DollarSign, Heart } from 'lucide-react';
import type { JobListing } from '../types/index';

interface JobCardProps {
  job: JobListing;
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

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const navigate = useNavigate();
  // Safely handle qualifications possibly being undefined
  const qualifications = job.qualifications ?? [];

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col"
    >
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status]}`}>
              {statusLabels[job.status]}
            </span>
          </div>
          <button className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200">
            {job.favorite ? (
              <Heart className="w-5 h-5 fill-red-500 text-red-500" />
            ) : (
              <Heart className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <h3 
          className="text-lg font-semibold text-gray-900 dark:text-white mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          onClick={() => navigate(`/jobs/${job.id}`)}
        >
          {job.title}
        </h3>
        
        <p className="text-gray-700 dark:text-gray-300 font-medium mb-3">{job.company}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>{job.location}</span>
          </div>
          
          {job.salary && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <DollarSign className="w-4 h-4 mr-1 flex-shrink-0" />
              <span>{job.salary}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <CalendarDays className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>Posted {job.datePosted}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {qualifications.slice(0, 2).map((qualification, index) => (
            <span 
              key={index} 
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            >
              {qualification.length > 25 ? `${qualification.substring(0, 25)}...` : qualification}
            </span>
          ))}
          {qualifications.length > 2 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              +{qualifications.length - 2} more
            </span>
          )}
        </div>
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-750 flex justify-between">
        <button 
          onClick={() => navigate(`/company-research/${job.id}`)}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Research Company
        </button>
        <button 
          onClick={() => navigate(`/resume-tailoring/${job.id}`)}
          className="text-sm font-medium text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
        >
          Tailor Resume
        </button>
      </div>
    </div>
  );
};

export default JobCard;