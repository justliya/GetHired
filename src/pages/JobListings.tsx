import  { useState } from 'react';
import { 
  Search, Filter, ChevronDown, ChevronUp, 
  MapPin, DollarSign, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockJobListings } from '../data/mockData';
import JobCard from '../components/JobCard';

const JobListings = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<'datePosted' | 'salary'>('datePosted');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  
  // Get unique locations and statuses for filters
  const locations = Array.from(new Set(mockJobListings.map(job => job.location)));
  const statuses = Array.from(new Set(mockJobListings.map(job => job.status)));
  
  // Sort and filter jobs
  const filteredJobs = mockJobListings
    .filter(job => {
      // Search filter
      if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !job.company.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Location filter
      if (locationFilter.length > 0 && !locationFilter.includes(job.location)) {
        return false;
      }
      
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(job.status)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortField === 'datePosted') {
        return sortOrder === 'desc'
          ? new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()
          : new Date(a.datePosted).getTime() - new Date(b.datePosted).getTime();
      } else if (sortField === 'salary') {
        // Extract min salary for sorting (very simplified approach)
        const getSalaryNumber = (salary: string | null) => {
          if (!salary) return 0;
          const match = salary.match(/\$(\d+),(\d+)/);
          return match ? parseInt(match[1] + match[2]) : 0;
        };
        
        return sortOrder === 'desc'
          ? getSalaryNumber(b.salary) - getSalaryNumber(a.salary)
          : getSalaryNumber(a.salary) - getSalaryNumber(b.salary);
      }
      return 0;
    });

  const toggleSort = (field: 'datePosted' | 'salary') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  const toggleLocationFilter = (location: string) => {
    setLocationFilter(prev => 
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };
  
  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  const clearFilters = () => {
    setLocationFilter([]);
    setStatusFilter([]);
    setSortField('datePosted');
    setSortOrder('desc');
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Job Listings</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Found {filteredJobs.length} jobs
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
            {showFilters ? (
              <ChevronUp className="w-5 h-5 ml-1" />
            ) : (
              <ChevronDown className="w-5 h-5 ml-1" />
            )}
          </button>
          
          <button
            onClick={() => toggleSort('datePosted')}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm transition-colors duration-200 ${
              sortField === 'datePosted'
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:border-blue-700 dark:hover:bg-blue-800'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Date
            {sortField === 'datePosted' && (
              sortOrder === 'desc' ? <ChevronDown className="w-5 h-5 ml-1" /> : <ChevronUp className="w-5 h-5 ml-1" />
            )}
          </button>
          
          <button
            onClick={() => toggleSort('salary')}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm transition-colors duration-200 ${
              sortField === 'salary'
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:border-blue-700 dark:hover:bg-blue-800'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <DollarSign className="w-5 h-5 mr-2" />
            Salary
            {sortField === 'salary' && (
              sortOrder === 'desc' ? <ChevronDown className="w-5 h-5 ml-1" /> : <ChevronUp className="w-5 h-5 ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search jobs by title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location filters */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Location</h3>
                <div className="space-y-2">
                  {locations.map((location, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`location-${index}`}
                        checked={locationFilter.includes(location)}
                        onChange={() => toggleLocationFilter(location)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`location-${index}`} className="ml-2 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
                          {location}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Status filters */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Status</h3>
                <div className="space-y-2">
                  {statuses.map((status, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`status-${index}`}
                        checked={statusFilter.includes(status)}
                        onChange={() => toggleStatusFilter(status)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`status-${index}`} className="ml-2 capitalize text-gray-700 dark:text-gray-300">
                        {status}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job Listings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))
        ) : (
          <div className="col-span-3 py-8 text-center">
            <p className="text-lg text-gray-600 dark:text-gray-400">No jobs found with the current filters.</p>
            <button
              onClick={clearFilters}
              className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobListings;