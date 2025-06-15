import  { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, CheckCircle, Edit, 
   Save, Copy,
  MessageSquare
} from 'lucide-react';
import { mockJobListings, mockResumeTailoring } from '../data/mockData';

const ResumeTailoring = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [isAnalyzing, setIsAnalyzing] = useState(jobId === 'new');
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter'>('resume');
  
  // Find job data if not new
  const job = jobId !== 'new' 
    ? mockJobListings.find(j => j.id === jobId) 
    : null;
    
  // Find tailoring data if exists
  const tailoringData = jobId !== 'new'
    ? mockResumeTailoring.find(r => r.jobId === jobId)
    : null;
    
  const startAnalysis = () => {
    // In a real app, this would trigger the AI agent to start analyzing
    setIsAnalyzing(true);
    // Simulate a delay for analysis
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 3000);
  };

  const copySuggestion = (text: string) => {
    navigator.clipboard.writeText(text);
    // In a real app, add a toast notification here
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Resume Tailoring</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {job 
              ? `Tailoring resume for ${job.title} at ${job.company}` 
              : 'Tailor your resume for a job'}
          </p>
        </div>
        {jobId !== 'new' && !isAnalyzing && (
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                activeTab === 'resume'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Resume
            </button>
            <button
              onClick={() => setActiveTab('coverLetter')}
              className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                activeTab === 'coverLetter'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Cover Letter
            </button>
          </div>
        )}
      </div>

      {jobId === 'new' && !tailoringData ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tailor Your Resume
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Resume
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-64 resize-none"
                placeholder="Paste your current resume text here..."
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-64 resize-none"
                placeholder="Paste the job description here..."
              ></textarea>
            </div>
          </div>
          <button
            onClick={startAnalysis}
            disabled={!resumeText || !jobDescription || isAnalyzing}
            className={`inline-flex items-center px-4 py-2 rounded-md transition-colors duration-200 ${
              !resumeText || !jobDescription || isAnalyzing
                ? 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isAnalyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-2" />
                Analyze and Tailor
              </>
            )}
          </button>
        </div>
      ) : (
        <div>
          {activeTab === 'resume' && (
            <div className="space-y-6">
              {/* Suggested Changes */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Suggested Resume Changes
                  </div>
                </h3>
                {tailoringData?.suggestedChanges && tailoringData.suggestedChanges.length > 0 ? (
                  <div className="space-y-6">
                    {tailoringData.suggestedChanges.map((change, index) => (
                      <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-750 p-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center">
                            <Edit className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                            <h4 className="font-medium text-gray-900 dark:text-white">{change.section}</h4>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-md">
                              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Original</div>
                              <div className="text-gray-800 dark:text-gray-200">{change.original}</div>
                            </div>
                            <div className="relative p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Suggested</div>
                              <div className="text-gray-800 dark:text-gray-200">{change.suggested}</div>
                              <button 
                                onClick={() => copySuggestion(change.suggested)}
                                className="absolute top-3 right-3 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                title="Copy suggestion"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                            <div className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">Why this change?</div>
                            <div className="text-gray-700 dark:text-gray-300 text-sm">{change.reason}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No suggested changes available yet.</p>
                    <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200">
                      Generate Suggestions
                    </button>
                  </div>
                )}
              </div>
              
              {/* Your Resume */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                    Your Resume
                  </div>
                </h3>
                <textarea
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-64 resize-none"
                  placeholder="Paste your current resume here to make the suggested changes..."
                ></textarea>
                <div className="mt-4 flex justify-end">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200">
                    <Save className="w-4 h-4 mr-2 inline" />
                    Save Updated Resume
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'coverLetter' && (
            <div className="space-y-6">
              {/* Cover Letter */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                      AI-Generated Cover Letter
                    </div>
                  </h3>
                  <button 
                    onClick={() => tailoringData?.coverLetter && copySuggestion(tailoringData.coverLetter)}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                    disabled={!tailoringData?.coverLetter}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy All
                  </button>
                </div>
                {tailoringData?.coverLetter ? (
                  <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-md whitespace-pre-line">
                    {tailoringData.coverLetter}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No cover letter available yet.</p>
                    <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200">
                      Generate Cover Letter
                    </button>
                  </div>
                )}
              </div>
              
              {/* Edit Cover Letter */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  <div className="flex items-center">
                    <Edit className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                    Edit Cover Letter
                  </div>
                </h3>
                <textarea
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-64 resize-none"
                  defaultValue={tailoringData?.coverLetter || ''}
                  placeholder="Edit your cover letter here..."
                ></textarea>
                <div className="mt-4 flex justify-end">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200">
                    <Save className="w-4 h-4 mr-2 inline" />
                    Save Cover Letter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeTailoring;