import React, { useState } from 'react';
import { Search, Filter, MapPin, Briefcase, Clock, ArrowUpDown, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import JobCard from '../components/ui/JobCard';

const JobDiscovery: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const mockJobs = [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'TechCorp Inc.',
      location: 'San Francisco, CA',
      salary: '$120K - $150K',
      postedDate: '2 days ago',
      matchPercentage: 92,
      isRemote: true,
      isSaved: false,
    },
    {
      id: 2,
      title: 'Full Stack Engineer',
      company: 'InnovateSoft',
      location: 'New York, NY',
      salary: '$100K - $130K',
      postedDate: '1 week ago',
      matchPercentage: 88,
      isRemote: false,
      isSaved: true,
    },
    {
      id: 3,
      title: 'React Developer',
      company: 'WebSolutions',
      location: 'Austin, TX',
      salary: '$90K - $110K',
      postedDate: '3 days ago',
      matchPercentage: 85,
      isRemote: true,
      isSaved: false,
    },
    {
      id: 4,
      title: 'UI/UX Developer',
      company: 'DesignHub',
      location: 'Seattle, WA',
      salary: '$95K - $120K',
      postedDate: '1 day ago',
      matchPercentage: 78,
      isRemote: false,
      isSaved: false,
    },
  ];

  const handleSearch = () => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const toggleSaveJob = (jobId: number) => {
    // This would update the job's saved status
    console.log(`Toggle save for job ${jobId}`);
  };

  const handleApply = (jobId: number) => {
    // This would navigate to application page
    console.log(`Apply for job ${jobId}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative col-span-3 md:col-span-2">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Job title, skills, or keywords"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Button
              variant="primary"
              className="w-full"
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                'Find Jobs'
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<MapPin size={16} />}
          >
            Location
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Briefcase size={16} />}
          >
            Job Type
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Clock size={16} />}
          >
            Date Posted
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Filter size={16} />}
          >
            More Filters
          </Button>
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Jobs For You</h2>
        <div className="flex items-center text-sm">
          <span className="text-gray-600 mr-2">Sort by:</span>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<ArrowUpDown size={14} />}
          >
            Best Match
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockJobs.map((job) => (
          <JobCard
            key={job.id}
            title={job.title}
            company={job.company}
            location={job.location}
            salary={job.salary}
            postedDate={job.postedDate}
            matchPercentage={job.matchPercentage}
            isRemote={job.isRemote}
            isSaved={job.isSaved}
            onSave={() => toggleSaveJob(job.id)}
            onApply={() => handleApply(job.id)}
          />
        ))}
      </div>

      <div className="flex justify-center mt-4">
        <Button variant="outline">Load More Jobs</Button>
      </div>
    </div>
  );
};

export default JobDiscovery;