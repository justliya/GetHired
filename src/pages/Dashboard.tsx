import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Briefcase, Building2, FileText, Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import JobCard from '../components/JobCard';
import ScheduleStatusDisplay from '../components/ui/ScheduleStatusDisplay';
import type { JobListing } from '../types';
import type { ScheduledSearch } from '../services/scheduledSearchService';

interface DashboardProps {
  onOpenPreferences: (scheduleData?: ScheduledSearch) => void;
}

const Dashboard = ({ onOpenPreferences }: DashboardProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [jobListings, setJobListings] = useState<JobListing[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snapshot = await getDocs(collection(db, 'users', user.uid, 'jobListings'));
      const jobs: JobListing[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as JobListing[];

      setJobListings(jobs);
    };

    fetchJobs();
  }, []);

  const filteredJobs = jobListings.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = [
    { label: 'Jobs Found', value: jobListings.length, icon: <Search className="w-5 h-5 text-blue-500" /> },
    { label: 'Applications', value: jobListings.filter(j => j.status === 'applying' || j.status === 'applied').length, icon: <Briefcase className="w-5 h-5 text-purple-500" /> },
    { label: 'Interviews', value: jobListings.filter(j => j.status === 'interviewing').length, icon: <Building2 className="w-5 h-5 text-teal-500" /> },
    { label: 'Offers', value: jobListings.filter(j => j.status === 'offered').length, icon: <FileText className="w-5 h-5 text-green-500" /> },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4 },
    },
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
            onClick={() => onOpenPreferences()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Job Preferences
          </button>
        </div>
      </div>

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
          {filteredJobs.slice(0, 3).map((job) => (
            <JobCard
              key={job.id}
              job={job}
                onFavoriteToggle={() => { } }
                onResearch={() => { } }
                onTailorResume={function (): void {
                  throw new Error('Function not implemented.');
                } }
                onDelete={function (): void {
                  throw new Error('Function not implemented.');
                } }
              />
          ))}
        </div>
      </section>

      {/* Scheduled Searches Section */}
      <section className="mb-8">
        <ScheduleStatusDisplay onEditSchedule={(schedule) => onOpenPreferences(schedule)} />
      </section>

      {/* AI Agents Section */}
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
                <button className="mt-3 text-green-600 dark:text-green-400 font-medium hover:underline">
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
