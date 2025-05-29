import  { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Briefcase, Building2, FileText, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { mockJobListings } from '../data/mockData';
import JobCard from '../components/JobCard';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showJobPreferences, setShowJobPreferences] = useState(false);
  
  // Mock data for dashboard stats
  const stats = [
    { label: 'Jobs Found', value: 42, icon: <Search className="w-5 h-5 text-blue-500" /> },
    { label: 'Applications', value: 12, icon: <Briefcase className="w-5 h-5 text-purple-500" /> },
    { label: 'Interviews', value: 3, icon: <Building2 className="w-5 h-5 text-teal-500" /> },
    { label: 'Offers', value: 1, icon: <FileText className="w-5 h-5 text-green-500" /> },
  ];

  // Recent jobs (showing just a few from our mock data)
  const recentJobs = mockJobListings.slice(0, 3);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Track your job search progress</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => setShowJobPreferences(!showJobPreferences)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {showJobPreferences ? 'Hide Preferences' : 'Job Preferences'}
          </button>
        </div>
      </div>

      {showJobPreferences && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Job Search Preferences</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Titles (comma separated)
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Frontend Developer, UI Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Locations (comma separated)
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="San Francisco, Remote"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Skills (comma separated)
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="React, TypeScript, Node.js"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Salary
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="80000"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remoteOnly"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="remoteOnly" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Remote Only
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Experience Level
              </label>
              <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">Any</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200">
              Save Preferences
            </button>
          </div>
        </motion.div>
      )}

      {/* Dashboard Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 flex items-center"
          >
            <div className="rounded-full p-3 bg-gray-100 dark:bg-gray-700 mr-4">
              {stat.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search for jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
            onClick={() => navigate('/jobs')}
          >
            Search
          </button>
        </div>
      </div>

      {/* Recent Jobs */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Jobs</h2>
          <button 
            onClick={() => navigate('/jobs')}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* Agent Overview */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your AI Assistants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-start">
              <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900 mr-4">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Job Discovery Agent</h3>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Scans job boards based on your preferences and finds the best matches for you.
                </p>
                <button 
                  onClick={() => navigate('/jobs')}
                  className="mt-3 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                >
                  Find Jobs
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-start">
              <div className="rounded-full p-3 bg-purple-100 dark:bg-purple-900 mr-4">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Company Research Agent</h3>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Gathers insights on company culture, reviews, and team structure to help you prepare.
                </p>
                <button 
                  onClick={() => navigate('/company-research/new')}
                  className="mt-3 text-purple-600 dark:text-purple-400 font-medium hover:underline"
                >
                  Research Company
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-teal-500">
            <div className="flex items-start">
              <div className="rounded-full p-3 bg-teal-100 dark:bg-teal-900 mr-4">
                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Resume Tailoring Agent</h3>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Analyzes job descriptions and suggests tailored resume and cover letter changes.
                </p>
                <button 
                  onClick={() => navigate('/resume-tailoring/new')}
                  className="mt-3 text-teal-600 dark:text-teal-400 font-medium hover:underline"
                >
                  Tailor Resume
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-start">
              <div className="rounded-full p-3 bg-green-100 dark:bg-green-900 mr-4">
                <Briefcase className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Application Manager</h3>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  Tracks your applications, sends reminders, and helps with follow-ups.
                </p>
                <button 
                  className="mt-3 text-green-600 dark:text-green-400 font-medium hover:underline"
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;