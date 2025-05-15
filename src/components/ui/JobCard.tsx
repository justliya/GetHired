import React from 'react';
import { Building2, MapPin, Clock, DollarSign, Star } from 'lucide-react';
import Button from './Button';

interface JobCardProps {
  title: string;
  company: string;
  location: string;
  salary?: string;
  postedDate: string;
  matchPercentage?: number;
  isRemote?: boolean;
  isSaved?: boolean;
  onSave?: () => void;
  onApply?: () => void;
}

const JobCard: React.FC<JobCardProps> = ({
  title,
  company,
  location,
  salary,
  postedDate,
  matchPercentage,
  isRemote = false,
  isSaved = false,
  onSave,
  onApply,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
            <div className="flex items-center mt-1 text-gray-600">
              <Building2 size={16} className="mr-1" />
              <span className="text-sm">{company}</span>
            </div>
          </div>
          {matchPercentage && (
            <div className="bg-primary-50 text-primary-700 px-2 py-1 rounded text-sm font-medium">
              {matchPercentage}% Match
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin size={16} className="mr-1" />
            <span>{location}</span>
            {isRemote && <span className="ml-1 text-primary-600 font-medium">(Remote)</span>}
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <Clock size={16} className="mr-1" />
            <span>Posted {postedDate}</span>
          </div>
          
          {salary && (
            <div className="flex items-center text-sm text-gray-600">
              <DollarSign size={16} className="mr-1" />
              <span>{salary}</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            icon={<Star size={16} fill={isSaved ? "#eab308" : "none"} color={isSaved ? "#eab308" : "currentColor"} />}
            onClick={onSave}
          >
            {isSaved ? 'Saved' : 'Save'}
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            onClick={onApply}
          >
            Apply Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;