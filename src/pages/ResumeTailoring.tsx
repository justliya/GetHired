import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Edit, Copy
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth } from '../firebase';

const ResumeTailoring = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [user] = useAuthState(auth);

  const [isAnalyzing, setIsAnalyzing] = useState(jobId === 'new');
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter'>('resume');
  interface Job {
    title?: string;
    company?: string;
    [key: string]: unknown;
  }
  const [job, setJob] = useState<Job | null>(null);
  interface SuggestedChange {
    section: string;
    original: string;
    suggested: string;
    reason: string;
  }

  interface TailoringData {
    suggestedChanges?: SuggestedChange[];
    coverLetter?: string;
    [key: string]: unknown;
  }

  const [tailoringData, setTailoringData] = useState<TailoringData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid || !jobId || jobId === 'new') return;

      try {
        const jobRef = doc(db, 'users', user.uid, 'jobListings', jobId);
        const tailoringRef = doc(db, 'users', user.uid, 'resumeTailoring', jobId);

        const [jobSnap, tailoringSnap] = await Promise.all([
          getDoc(jobRef),
          getDoc(tailoringRef),
        ]);

        if (jobSnap.exists()) setJob(jobSnap.data());
        if (tailoringSnap.exists()) setTailoringData(tailoringSnap.data());
      } catch (err) {
        console.error('Error fetching job or tailoring data:', err);
      }
    };

    fetchData();
  }, [jobId, user?.uid]);

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      // TODO: trigger AI agent here
    }, 3000);
  };

  const copySuggestion = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: show toast notification
  };

  const title = job?.title || '';
  const company = job?.company || '';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resume Tailoring</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {job ? `Tailoring resume for ${title} at ${company}` : 'Tailor your resume for a job'}
          </p>
        </div>
        {jobId !== 'new' && !isAnalyzing && (
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-4 py-2 rounded-md ${activeTab === 'resume' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border text-gray-700 dark:text-gray-300'}`}
            >Resume</button>
            <button
              onClick={() => setActiveTab('coverLetter')}
              className={`px-4 py-2 rounded-md ${activeTab === 'coverLetter' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border text-gray-700 dark:text-gray-300'}`}
            >Cover Letter</button>
          </div>
        )}
      </div>

      {jobId === 'new' && !tailoringData ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tailor Your Resume</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="w-full p-3 border rounded-md h-64 resize-none dark:bg-gray-700 dark:text-white"
              placeholder="Paste your current resume text here..."
            ></textarea>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full p-3 border rounded-md h-64 resize-none dark:bg-gray-700 dark:text-white"
              placeholder="Paste the job description here..."
            ></textarea>
          </div>
          <button
            onClick={startAnalysis}
            disabled={!resumeText || !jobDescription || isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze and Tailor'}
          </button>
        </div>
      ) : (
        <div>
          {activeTab === 'resume' && tailoringData?.suggestedChanges && tailoringData.suggestedChanges.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Suggested Resume Changes</h3>
              {tailoringData.suggestedChanges.map((change: SuggestedChange, index: number) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center">
                      <Edit className="w-5 h-5 mr-2" />
                      <h4 className="font-medium text-gray-900 dark:text-white">{change.section}</h4>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                      <div className="text-sm font-medium text-gray-500 mb-2">Original</div>
                      <div>{change.original}</div>
                    </div>
                    <div className="relative bg-blue-50 dark:bg-blue-900 p-3 rounded-md">
                      <div className="text-sm font-medium text-blue-600 mb-2">Suggested</div>
                      <div>{change.suggested}</div>
                      <button onClick={() => copySuggestion(change.suggested)} className="absolute top-3 right-3">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 bg-yellow-50 dark:bg-yellow-900 p-3 rounded-md">
                    <div className="font-medium text-yellow-700 mb-1">Why this change?</div>
                    <div className="text-sm">{change.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'coverLetter' && tailoringData?.coverLetter && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">AI-Generated Cover Letter</h3>
                <button
                  onClick={() => tailoringData.coverLetter && copySuggestion(tailoringData.coverLetter)}
                  className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md"
                >
                  <Copy className="w-4 h-4 mr-1 inline" /> Copy All
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md whitespace-pre-line">
                {tailoringData.coverLetter}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeTailoring;