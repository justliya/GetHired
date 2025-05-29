import  { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Building2, Globe, FileText, ExternalLink, 
  CheckCircle, XCircle, Briefcase, User, 
  Clock, DollarSign
} from 'lucide-react';
import { mockJobListings, mockCompanyResearch } from '../data/mockData';

const CompanyResearch = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [isResearching, setIsResearching] = useState(jobId === 'new');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  
  // Find job data if not new
  const job = jobId !== 'new' 
    ? mockJobListings.find(j => j.id === jobId) 
    : null;
    
  // Find research data if exists
  const researchData = jobId !== 'new'
    ? mockCompanyResearch.find(r => r.jobId === jobId)
    : null;
    
  const startResearch = () => {
    // In a real app, this would trigger the AI agent to start researching
    setIsResearching(true);
    // Simulate a delay for research
    setTimeout(() => {
      setIsResearching(false);
    }, 3000);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {job 
              ? `Researching ${job.company} for ${job.title} position` 
              : 'Research a new company'}
          </p>
        </div>
      </div>

      {jobId === 'new' && !researchData ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Research a New Company
          </h2>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="E.g., Google, Microsoft, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="E.g., Software Engineer, Product Manager, etc."
              />
            </div>
          </div>
          <button
            onClick={startResearch}
            disabled={!companyName || isResearching}
            className={`inline-flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
              !companyName || isResearching
                ? 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isResearching ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Researching...
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5 mr-2" />
                Start Research
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Company Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="rounded-full p-3 bg-blue-100 dark:bg-blue-900 mr-4">
                    <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {job?.company || researchData?.companyName || 'Company Overview'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">{job?.title || 'Position Details'}</p>
                  </div>
                </div>
                {researchData?.officialWebsite && (
                  <a 
                    href={researchData.officialWebsite} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Globe className="w-5 h-5 mr-1" />
                    Website
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                )}
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Job Details</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Position</h4>
                      <div className="flex items-center text-gray-900 dark:text-white">
                        <Briefcase className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                        {job?.title || 'Position Title'}
                      </div>
                    </div>
                    
                    {job?.location && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</h4>
                        <div className="flex items-center text-gray-900 dark:text-white">
                          <User className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                          {job.location}
                        </div>
                      </div>
                    )}
                    
                    {job?.datePosted && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Posted</h4>
                        <div className="flex items-center text-gray-900 dark:text-white">
                          <Clock className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                          {job.datePosted}
                        </div>
                      </div>
                    )}
                    
                    {job?.salary && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Salary</h4>
                        <div className="flex items-center text-gray-900 dark:text-white">
                          <DollarSign className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                          {job.salary}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <a 
                      href={job?.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors duration-200"
                    >
                      View Job Listing
                    </a>
                    <a 
                      href={researchData?.glassdoorLink || '#'}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      View on Glassdoor
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Job Responsibilities */}
          {researchData?.responsibilities && researchData.responsibilities.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Responsibilities
                </div>
              </h3>
              <ul className="space-y-2">
                {researchData.responsibilities.map((responsibility, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 dark:text-blue-400 mr-2">•</span>
                    <span className="text-gray-700 dark:text-gray-300">{responsibility}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Benefits */}
          {researchData?.benefits && researchData.benefits.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                  Benefits
                </div>
              </h3>
              <ul className="space-y-2">
                {researchData.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                    <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Pros and Cons */}
          {(researchData?.pros.length || researchData?.cons.length) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Employee Reviews</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pros */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                    Pros
                  </h4>
                  {researchData?.pros.length ? (
                    <ul className="space-y-2">
                      {researchData.pros.map((pro, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                          <span className="text-gray-700 dark:text-gray-300">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">No pros found</p>
                  )}
                </div>
                
                {/* Cons */}
                <div>
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                    <XCircle className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
                    Cons
                  </h4>
                  {researchData?.cons.length ? (
                    <ul className="space-y-2">
                      {researchData.cons.map((con, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-red-600 dark:text-red-400 mr-2">•</span>
                          <span className="text-gray-700 dark:text-gray-300">{con}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">No cons found</p>
                  )}
                </div>
              </div>
              
              {researchData?.glassdoorLink && (
                <div className="mt-4 text-right">
                  <a 
                    href={researchData.glassdoorLink}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View more reviews on Glassdoor
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Research Notes</h3>
            <textarea
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-32 resize-none"
              placeholder="Add your personal notes about this company here..."
              defaultValue={researchData?.notes || ''}
            ></textarea>
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200">
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyResearch;