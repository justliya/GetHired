import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, FileText } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth } from '../firebase';
import { getUserResumes, getResumeUrlForContext, uploadResumeWithFallback, getJobListings, getUserData } from '../services/firebaseService';
import { useResumeTailoring } from '../hooks/useResumeTailoring';
import {
  ResumeSelector,
  JobDescriptionInput,
  ResumeTextInput,
  DocumentViewer,
  EnhancedDocumentViewer,
  SuggestedChanges,
  DownloadBanner
} from '../components/resume';
import type { Resume } from '../models/UserData';
import type { JobListing } from '../types';

interface Job {
  title?: string;
  company?: string;
  description?: string;
  [key: string]: unknown;
}

const ResumeTailoring = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const { isAnalyzing, tailoringData, startAnalysis, copySuggestion, setTailoringData } = useResumeTailoring();

  // Main state
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter'>('resume');
  const [job, setJob] = useState<Job | null>(null);

  // Resume selection state
  const [userResumes, setUserResumes] = useState<(Resume & { id: string })[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedResumeUrl, setSelectedResumeUrl] = useState<string>('');
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeInputMethod, setResumeInputMethod] = useState<'manual' | 'upload' | 'saved'>('manual');

  // Job selection state
  const [userJobs, setUserJobs] = useState<JobListing[]>([]);
  const [showJobSelector, setShowJobSelector] = useState(false);

  // User profile state
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        // Load user profile data to get the name
        const userDataResult = await getUserData(user.uid);
        if (userDataResult.success && userDataResult.data) {
          const userData = userDataResult.data;
          setUserName(userData.profile?.name || user.displayName || '');
        }

        // Load user resumes
        setIsLoadingResumes(true);
        const resumesResult = await getUserResumes(user.uid);
        if (resumesResult.success) {
          setUserResumes(resumesResult.data || []);
          // Auto-select the first original resume
          const defaultResume = resumesResult.data?.find(r => r.metadata?.isOriginal);
          if (defaultResume) {
            setSelectedResumeId(defaultResume.id);
            setSelectedResumeUrl(getResumeUrlForContext(defaultResume));
            setResumeInputMethod('saved');
            setResumeText(`Upload resume content will be processed automatically.`);
          }
        }

        // Load user job listings for job description dropdown
        const jobsResult = await getJobListings(user.uid);
        if (jobsResult.success) {
          // Map the job listings to match the expected JobListing interface
          const jobListings: JobListing[] = (jobsResult.data || []).map((job: Record<string, unknown>) => ({
            id: job.id as string,
            title: job.title as string,
            company: job.company as string,
            location: job.location as string,
            description: job.description as string,
            salary: (job.salary as string) ?? 'Not specified',
            url: job.url as string,
            status: 'new',
            favorite: false,
            datePosted: (job.datePosted as string) || (job.postedDate as string) || 'Unknown',
            qualifications: (job.qualifications as string[]) || [],
            benefits: (job.benefits as string[]) || [],
          }));
          setUserJobs(jobListings);
        }

        // If we have a specific job ID, load that job's data
        if (jobId && jobId !== 'new') {
          const jobRef = doc(db, 'users', user.uid, 'jobListings', jobId);
          const tailoringRef = doc(db, 'users', user.uid, 'resumeTailoring', jobId);

          const [jobSnap, tailoringSnap] = await Promise.all([
            getDoc(jobRef),
            getDoc(tailoringRef),
          ]);

          if (jobSnap.exists()) {
            const jobData = jobSnap.data() as Job;
            setJob(jobData);
            setJobDescription(jobData.description || '');
          }
          if (tailoringSnap.exists()) {
            const data = tailoringSnap.data();
            if (data) {
              setTailoringData(data);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoadingResumes(false);
      }
    };

    fetchData();
  }, [jobId, user?.uid, user?.displayName, setTailoringData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    try {
      setIsUploading(true);
      const result = await uploadResumeWithFallback(user.uid, file, {
        title: file.name,
        isOriginal: true,
        uploadSource: 'manual',
      });

      if (result.success && result.data) {
        const newResume = result.data;
        setUserResumes(prev => [...prev, newResume]);
        setSelectedResumeId(newResume.id);
        setSelectedResumeUrl(getResumeUrlForContext(newResume));
        setResumeInputMethod('upload');

        setResumeText(`The resume content will be processed automatically.`);
      }
    } catch (err) {
      console.error('Error uploading resume:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadResumeText = async (resumeId: string) => {
    const resume = userResumes.find(r => r.id === resumeId);
    if (!resume) return;

    setSelectedResumeUrl(getResumeUrlForContext(resume));
    setResumeInputMethod('saved');

    setResumeText(`The resume content will be processed automatically. You can also paste additional text if needed.`);
  };

  const loadSampleResume = () => {
    setResumeInputMethod('manual');
    setSelectedResumeId('');
    setSelectedResumeUrl('');

    const sampleResume = `John Doe
Software Developer
john.doe@email.com | (555) 123-4567 | LinkedIn: linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced software developer with 5+ years of experience in web development. Proficient in JavaScript, HTML, CSS, and various frameworks. Strong problem-solving skills and ability to work in team environments.

TECHNICAL SKILLS
• Programming Languages: JavaScript, Python, Java
• Web Technologies: HTML, CSS, React, Node.js
• Databases: MySQL, MongoDB
• Tools: Git, Docker, Jenkins

EXPERIENCE
Senior Developer | Tech Company Inc. | 2021 - Present
• Developed and maintained web applications using React and Node.js
• Collaborated with cross-functional teams to deliver features on time
• Implemented CI/CD pipelines to improve deployment efficiency
• Mentored junior developers and conducted code reviews

Software Developer | StartupCorp | 2019 - 2021
• Built responsive web applications using modern JavaScript frameworks
• Optimized application performance and improved user experience
• Participated in agile development processes and sprint planning
• Worked closely with designers to implement pixel-perfect UIs

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2019

PROJECTS
• E-commerce Platform: Built a full-stack e-commerce application with React and Node.js
• Task Management App: Developed a productivity app with real-time updates
• Open Source Contributions: Regular contributor to popular JavaScript libraries`;

    setResumeText(sampleResume);
  };

  const loadSampleJobDescription = () => {
    const sampleJob = `Senior Frontend Developer - TechCorp

We are seeking a Senior Frontend Developer to join our dynamic team. The ideal candidate will have extensive experience with modern JavaScript frameworks and a passion for creating exceptional user experiences.

RESPONSIBILITIES:
• Develop and maintain complex web applications using React and TypeScript
• Collaborate with UX/UI designers to implement responsive designs
• Work with backend teams to integrate APIs and optimize performance
• Lead code reviews and mentor junior developers
• Participate in agile development processes and technical decision-making

REQUIRED QUALIFICATIONS:
• Bachelor's degree in Computer Science or related field
• 5+ years of experience in frontend development
• Expert knowledge of React, TypeScript, and modern JavaScript (ES6+)
• Experience with state management libraries (Redux, Context API)
• Proficiency in CSS, SASS/SCSS, and responsive design principles
• Experience with testing frameworks (Jest, React Testing Library)
• Strong understanding of web performance optimization
• Experience with version control (Git) and CI/CD pipelines

PREFERRED QUALIFICATIONS:
• Experience with Node.js and full-stack development
• Knowledge of cloud platforms (AWS, Azure, GCP)
• Experience with GraphQL and REST APIs
• Familiarity with Docker and containerization
• Previous experience in mentoring and team leadership

BENEFITS:
• Competitive salary ($120,000 - $160,000)
• Comprehensive health insurance
• Flexible work arrangements and remote options
• Professional development budget
• Stock options and retirement plans

Join our team and help build the next generation of web applications that serve millions of users worldwide!`;

    setJobDescription(sampleJob);
    setJob({
      title: 'Senior Frontend Developer',
      company: 'TechCorp',
      description: sampleJob
    });
  };

  const handleLoadJobFromListing = (jobListing: JobListing) => {
    setJobDescription(jobListing.description);
    setJob({
      title: jobListing.title,
      company: jobListing.company,
      description: jobListing.description,
    });
    setShowJobSelector(false);
  };

  // Handler for the Tailor Resume button  
  const handleStartAnalysis = () => {
    const context = {
      user_id: user?.uid || 'anonymous',
      firebase_uid: user?.uid,
      is_anonymous: user?.isAnonymous || false,
      task: 'resume_tailoring',
      user_name: userName || user?.displayName || '',
      resume_storage_url: selectedResumeUrl || '',
      job_description: jobDescription,
      job_title: job?.title || '',
      job_company: job?.company || ''
    };

    startAnalysis(resumeText, selectedResumeUrl, jobDescription, context, job, userName);
  };

  // Handlers for ResumeSelector component
  const handleResumeSelect = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    if (resumeId) {
      handleLoadResumeText(resumeId);
    } else {
      setResumeInputMethod('manual');
      setSelectedResumeUrl('');
      setResumeText('');
    }
  };

  // Handlers for ResumeTextInput component  
  const handleSwitchToManual = () => {
    setResumeInputMethod('manual');
    setSelectedResumeId('');
    setSelectedResumeUrl('');
    setResumeText('');
  };

  // Handlers for JobDescriptionInput component
  const handleToggleJobSelector = () => {
    setShowJobSelector(!showJobSelector);
  };

  const title = job?.title || '';
  const company = job?.company || '';

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Resume Tailoring</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {job ? `Tailoring resume for ${title} at ${company}` : 'Tailor your resume for a job'}
            </p>
          </div>
        </div>
        {jobId !== 'new' && !isAnalyzing && tailoringData && (
          <div className="mt-4 md:mt-0 flex space-x-2">
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-4 py-2 rounded-md ${activeTab === 'resume' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 border text-gray-700 dark:text-gray-300'}`}
            >
              Resume
            </button>
            <button
              onClick={() => setActiveTab('coverLetter')}
              disabled={true}
              className={`px-4 py-2 rounded-md opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-600 border text-gray-500 dark:text-gray-400`}
              title="Cover Letter feature coming soon"
            >
              Cover Letter (Coming Soon)
            </button>
          </div>
        )}
      </div>

      {/* Resume Selection Section */}
      <ResumeSelector
        userResumes={userResumes}
        selectedResumeId={selectedResumeId}
        isUploading={isUploading}
        isLoadingResumes={isLoadingResumes}
        resumeInputMethod={resumeInputMethod}
        onFileUpload={handleFileUpload}
        onResumeSelect={handleResumeSelect}
        onLoadSampleResume={loadSampleResume}
      />

      {/* Main Tailoring Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Resume & Job Description
          </h2>
          {!resumeText || !jobDescription ? (
            <div className="flex items-center text-sm text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
              {!resumeText && !jobDescription ? 'Add resume and job description to continue' :
                !resumeText ? 'Add resume content to continue' : 'Add job description to continue'}
            </div>
          ) : (
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Ready to tailor resume
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Resume Text Area */}
          <div className="flex flex-col">
            <ResumeTextInput
              resumeText={resumeText}
              resumeInputMethod={resumeInputMethod}
              onResumeTextChange={setResumeText}
              onSwitchToManual={handleSwitchToManual}
            />
            {resumeInputMethod === 'manual' && userResumes.length > 0 && (
              <button
                onClick={() => {
                  setResumeInputMethod('saved');
                  setResumeText('');
                }}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline self-start"
              >
                Use Saved Resume
              </button>
            )}
          </div>

          {/* Job Description Area */}
          <div className="flex flex-col">
            <JobDescriptionInput
              jobDescription={jobDescription}
              userJobs={userJobs}
              showJobSelector={showJobSelector}
              onJobDescriptionChange={setJobDescription}
              onToggleJobSelector={handleToggleJobSelector}
              onLoadJobFromListing={handleLoadJobFromListing}
              onLoadSampleJob={loadSampleJobDescription}
            />
          </div>
        </div>

        <div className="flex items-center justify-center">
          <button
            onClick={handleStartAnalysis}
            disabled={!resumeText || !jobDescription || isAnalyzing}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium transition-all transform hover:scale-105 disabled:hover:scale-100"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                Analyzing & Tailoring Resume...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 mr-3" />
                Tailor My Resume
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {tailoringData && (
        <div>
          {/* Download Banner */}
          {tailoringData.tailoredResumeUrl && (
            <DownloadBanner resumeUrl={tailoringData.tailoredResumeUrl} />
          )}

          {/* Resume Changes Tab */}
          {activeTab === 'resume' && (
            <div className="space-y-6">
              {/* Document Viewer */}
              {tailoringData.tailoredResumeText ? (
                <DocumentViewer
                  resumeText={tailoringData.tailoredResumeText}
                  resumeUrl={tailoringData.tailoredResumeUrl}
                  job={job}
                  onCopyText={copySuggestion}
                />
              ) : tailoringData.tailoredResumeUrl ? (
                <EnhancedDocumentViewer
                  documentUrl={tailoringData.tailoredResumeUrl}
                  job={job}
                  onDownload={() => {
                    if (tailoringData.tailoredResumeUrl) {
                      window.open(tailoringData.tailoredResumeUrl, '_blank');
                    }
                  }}
                />
              ) : null}

              {/* Suggested Changes */}
              {tailoringData.suggestedChanges && tailoringData.suggestedChanges.length > 0 && (
                <SuggestedChanges
                  changes={tailoringData.suggestedChanges}
                  onCopyText={copySuggestion}
                />
              )}
            </div>
          )}

          {/* Cover Letter Tab - Disabled for now */}
          {activeTab === 'coverLetter' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 opacity-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  AI-Generated Cover Letter
                </h3>
                <div className="bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1 rounded-md">
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">Coming Soon</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Cover letter generation feature is coming soon. For now, focus on tailoring your resume!
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeTailoring;
