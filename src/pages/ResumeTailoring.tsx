import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Edit, Copy, Upload, FileText, Download, ExternalLink, ChevronDown, Loader2, ArrowLeft
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth } from '../firebase';
import { getUserResumes, uploadResume, getJobListings, getUserData } from '../services/firebaseService';
import type { Resume } from '../models/UserData';
import type { JobListing } from '../types';

interface Job {
  title?: string;
  company?: string;
  description?: string;
  [key: string]: unknown;
}

interface SuggestedChange {
  section: string;
  original: string;
  suggested: string;
  reason: string;
}

interface TailoringData {
  suggestedChanges?: SuggestedChange[];
  coverLetter?: string;
  tailoredResumeUrl?: string;
  tailoredResumeText?: string;
  [key: string]: unknown;
}

const ResumeTailoring = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter'>('resume');
  const [job, setJob] = useState<Job | null>(null);
  const [tailoringData, setTailoringData] = useState<TailoringData | null>(null);
  
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
            setSelectedResumeUrl(defaultResume.fileUrl);
            setResumeInputMethod('saved');
            setResumeText(`Resume loaded: ${defaultResume.metadata?.title || 'Untitled Resume'}

File stored at: ${defaultResume.fileUrl}

The resume content will be processed automatically. You can also paste additional text if needed.`);
          }
        }

        // Load user job listings for job description dropdown
        const jobsResult = await getJobListings(user.uid);
        if (jobsResult.success) {
          // Map the job listings to match the expected JobListing interface
          const jobListings = (jobsResult.data || []).map(job => ({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            salary: job.salary,
            url: job.url,
            status: 'new' as const,
            favorite: false
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
            setTailoringData(tailoringSnap.data() as TailoringData);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoadingResumes(false);
      }
    };

    fetchData();
  }, [jobId, user?.uid, user?.displayName]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    try {
      setIsUploading(true);
      const result = await uploadResume(user.uid, file, {
        title: file.name,
        isOriginal: true,
        uploadSource: 'manual',
      });

      if (result.success && result.data) {
        const newResume = result.data;
        setUserResumes(prev => [...prev, newResume]);
        setSelectedResumeId(newResume.id);
        setSelectedResumeUrl(newResume.fileUrl);
        setResumeInputMethod('upload');
        
        setResumeText(`Resume uploaded: ${newResume.metadata?.title || 'Untitled Resume'}

File stored at: ${newResume.fileUrl}

The resume content will be processed automatically. You can also paste additional text if needed.`);
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

    setSelectedResumeUrl(resume.fileUrl);
    setResumeInputMethod('saved');
    
    setResumeText(`Resume loaded: ${resume.metadata?.title || 'Untitled Resume'}

File stored at: ${resume.fileUrl}

The resume content will be processed automatically. You can also paste additional text if needed.`);
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

  const startAnalysis = async () => {
    if (!resumeText || !jobDescription) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('https://gethired-agents-staging-104139545590.us-central1.run.app/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Please tailor this resume for this job description:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
`,
          context: {
            user_id: user?.uid || 'anonymous',
            firebase_uid: user?.uid,
            is_anonymous: user?.isAnonymous || false,
            task: 'resume_tailoring',
            user_name: userName || user?.displayName || '',
            resume_storage_url: selectedResumeUrl || '',
            job_description: jobDescription,
            job_title: job?.title || '',
            job_company: job?.company || ''
          },
          session_id: `resume-${Date.now()}`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Parse the AI response to extract tailoring suggestions
      const suggestions = parseAIResponse(result.message || result.data);
      
      setTailoringData({
        suggestedChanges: suggestions.changes || [
          {
            section: 'Professional Summary',
            original: 'Generic summary from your resume',
            suggested: 'AI-generated targeted summary based on job requirements',
            reason: 'Aligns better with the specific role requirements mentioned in the job description'
          }
        ],
        coverLetter: suggestions.coverLetter || result.message,
        tailoredResumeUrl: suggestions.resumeUrl || result.tailored_resume_url || undefined,
        tailoredResumeText: suggestions.resumeText || result.tailored_resume_text || undefined
      });
      
    } catch (error) {
      console.error('Analysis failed:', error);
      
      setTailoringData({
        suggestedChanges: [
          {
            section: 'Professional Summary',
            original: 'Experienced software developer',
            suggested: 'Experienced full-stack developer with expertise in React and Node.js',
            reason: 'Matches the specific technologies mentioned in the job description'
          },
          {
            section: 'Skills',
            original: 'JavaScript, HTML, CSS',
            suggested: 'JavaScript, React, Node.js, TypeScript, HTML, CSS, MongoDB',
            reason: 'Added specific technologies and frameworks mentioned in the job requirements'
          }
        ],
        coverLetter: `Dear Hiring Manager,

I am excited to apply for the ${job?.title || 'position'} at ${job?.company || 'your company'}. Based on the job description, I believe my experience aligns well with your requirements.

Best regards,
${userName || 'Your Name'}`,
        tailoredResumeUrl: undefined
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper function to parse AI response
  const parseAIResponse = (response: string) => {
    try {
      // Try to extract JSON if present
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
      
      // Otherwise return text response
      return {
        changes: [],
        coverLetter: response
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        changes: [],
        coverLetter: response
      };
    }
  };

  const copySuggestion = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Text copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Select Your Resume
          </h2>
          {resumeInputMethod !== 'manual' && (
            <div className="flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-green-700 dark:text-green-300">
                {resumeInputMethod === 'upload' ? 'File Uploaded' : 'Resume Loaded'}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Upload Resume Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload Resume
          </button>

          {/* Use Saved Resume Dropdown */}
          {userResumes.length > 0 && (
            <div className="relative">
              <select
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value);
                  if (e.target.value) {
                    handleLoadResumeText(e.target.value);
                  } else {
                    setResumeInputMethod('manual');
                    setSelectedResumeUrl('');
                    setResumeText('');
                  }
                }}
                className="px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <option value="">Select a saved resume</option>
                {userResumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.metadata?.title || 'Untitled Resume'} 
                    {resume.metadata?.isOriginal && ' (Original)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sample Resume Button */}
          <button
            onClick={loadSampleResume}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Load Sample Resume
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
        />

        {isLoadingResumes && (
          <div className="text-gray-500 dark:text-gray-400">Loading your resumes...</div>
        )}
      </div>

      {/* Main Tailoring Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Resume & Job Description
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Resume Text Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Resume Text
              </label>
              {resumeInputMethod !== 'manual' && (
                <button
                  onClick={() => {
                    setResumeInputMethod('manual');
                    setSelectedResumeId('');
                    setSelectedResumeUrl('');
                    setResumeText('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Switch to manual input
                </button>
              )}
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              disabled={resumeInputMethod !== 'manual'}
              className={`w-full p-3 border rounded-md h-64 resize-none dark:bg-gray-700 dark:text-white ${
                resumeInputMethod !== 'manual' 
                  ? 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed' 
                  : ''
              }`}
              placeholder={
                resumeInputMethod === 'manual' 
                  ? "Paste your current resume text here or upload a file above..."
                  : "Resume loaded from file. Use 'Switch to manual input' to edit manually."
              }
            />
          </div>

          {/* Job Description Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Job Description
              </label>
              <div className="flex gap-2">
                {userJobs.length > 0 && (
                  <button
                    onClick={() => setShowJobSelector(!showJobSelector)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Load from saved jobs ({userJobs.length})
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showJobSelector ? 'rotate-180' : ''}`} />
                  </button>
                )}
                <button
                  onClick={loadSampleJobDescription}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Load Sample Job
                </button>
              </div>
            </div>

            {showJobSelector && (
              <div className="mb-4 border border-gray-300 dark:border-gray-600 rounded-md max-h-32 overflow-y-auto bg-white dark:bg-gray-800 shadow-lg z-10 relative">
                {userJobs.map((jobListing) => (
                  <button
                    key={jobListing.id}
                    onClick={() => handleLoadJobFromListing(jobListing)}
                    className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{jobListing.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{jobListing.company}</div>
                    {jobListing.location && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{jobListing.location}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="w-full p-3 border rounded-md h-64 resize-none dark:bg-gray-700 dark:text-white"
              placeholder="Paste the job description here or load from saved jobs..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={startAnalysis}
            disabled={!resumeText || !jobDescription || isAnalyzing}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Tailor Resume'
            )}
          </button>
          
          {(!resumeText || !jobDescription) && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {!resumeText && !jobDescription ? 'Please add resume text and job description' :
               !resumeText ? 'Please add resume text' : 'Please add job description'}
            </span>
          )}
        </div>
      </div>

      {/* Results Section */}
      {tailoringData && (
        <div>
          {/* Download Tailored Resume */}
          {tailoringData.tailoredResumeUrl && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Download className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                  <span className="font-medium text-green-800 dark:text-green-200">
                    Your tailored resume is ready!
                  </span>
                </div>
                <a
                  href={tailoringData.tailoredResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            </div>
          )}

          {/* Resume Changes Tab */}
          {activeTab === 'resume' && (
            <div className="space-y-6">
              {/* Tailored Resume Text Display */}
              {tailoringData.tailoredResumeText && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Tailored Resume Text
                    </h3>
                    <button
                      onClick={() => copySuggestion(tailoringData.tailoredResumeText!)}
                      className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md flex items-center text-sm"
                    >
                      <Copy className="w-4 h-4 mr-1" /> Copy All
                    </button>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md whitespace-pre-line max-h-96 overflow-y-auto">
                    {tailoringData.tailoredResumeText}
                  </div>
                </div>
              )}

              {/* Suggested Changes */}
              {tailoringData.suggestedChanges && tailoringData.suggestedChanges.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Suggested Resume Changes
                  </h3>
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
                          <div className="text-gray-700 dark:text-gray-300">{change.original}</div>
                        </div>
                        <div className="relative bg-blue-50 dark:bg-blue-900 p-3 rounded-md">
                          <div className="text-sm font-medium text-blue-600 mb-2">Suggested</div>
                          <div className="text-gray-700 dark:text-gray-300">{change.suggested}</div>
                          <button
                            onClick={() => copySuggestion(change.suggested)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md mx-4 mb-4">
                        <div className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                          Why this change?
                        </div>
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">{change.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
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
