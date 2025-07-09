/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, FileText } from 'lucide-react';
import { doc, getDoc, setDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth } from '../firebase';
import {
  getUserResumes,
  getResumeUrlForContext,
 
  getJobListings,
  getUserData,
  saveTailoredResume
} from '../services/firebaseService';
import { useResumeTailoring } from '../hooks/useResumeTailoring';
import {
  ResumeSelector,
  JobDescriptionInput,
  ResumeTextInput,
  /*SuggestedChanges,*/
  DownloadBanner,
  UnifiedDocumentViewer
} from '../components/resume';
import type { Resume, ResumeTailoringContext } from '../types';
import type { JobListing } from '../types';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Job selection state
  const [userJobs, setUserJobs] = useState<JobListing[]>([]);
  const [showJobSelector, setShowJobSelector] = useState(false);

  // User profile state
  const [userName, setUserName] = useState<string>('');

  // Load resumes function
  const loadResumes = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const resumesResult = await getUserResumes(user.uid);
      if (resumesResult.success) {
        setUserResumes(resumesResult.data || []);
        // Auto-select the first original resume if no resume is selected
        if (!selectedResumeId) {
          const defaultResume = resumesResult.data?.find(r => r.metadata?.isOriginal);
          if (defaultResume) {
            setSelectedResumeId(defaultResume.id);
            setSelectedResumeUrl(getResumeUrlForContext(defaultResume));
            setResumeInputMethod('saved');
            setResumeText(`Resume content will be processed automatically.`);
          }
        }
      }
    } catch (err) {
      console.error('Error loading resumes:', err);
    }
  }, [user?.uid, selectedResumeId]);

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
        await loadResumes();
        
        const jobsResult = await getJobListings(user.uid);
        if (jobsResult.success) {
          // Map the job listings to match the expected JobListing interface (fully typed)
          const jobListings: JobListing[] = (jobsResult.data as any[]).map(job => ({
            jobId: job.jobId ?? job.id,
            id: job.id,
            listingNumber: job.listingNumber,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            salary: job.salary ?? 'Not specified',
            datePosted: job.datePosted ?? job.postedDate ?? 'Unknown',
            qualifications: job.qualifications ?? [],
            benefits: job.benefits ?? [],
            jobLink: job.jobLink,
            easyApply: job.easyApply ?? false,
            favorite: false,
            status: 'new',
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
  }, [jobId, user?.uid, user?.displayName, setTailoringData, loadResumes]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;

    try {
      setIsUploading(true);
      
      // Upload to Firebase Storage
      const storage = getStorage();
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storagePath = `resumes/${user.uid}/${fileName}`;
      const fileRef = storageRef(storage, storagePath);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);
      
      // Add to resumes collection in Firestore
      const resumeData = {
        fileUrl: downloadUrl,
        title: file.name,
        documentUrl: downloadUrl,
        storagePath: storagePath,
        type: 'original' as const,
        metadata: {
          isOriginal: true,
          uploadSource: 'manual' as const,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size,
          fileType: file.type
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'users', user.uid, 'resumes'), resumeData);
      
      // Create the resume object with the ID
      const newResume: Resume & { id: string } = {
        ...resumeData,
        id: docRef.id
      };
      
      // Update user document with resume URL
      await setDoc(
        doc(db, "users", user.uid),
        { 
          resumeUrl: downloadUrl,
          lastResumeUpload: new Date().toISOString(),
          hasResume: true
        },
        { merge: true }
      );
      
      // Update local state
      setUserResumes(prev => [...prev, newResume]);
      setSelectedResumeId(newResume.id);
      setSelectedResumeUrl(downloadUrl);
      setResumeInputMethod('upload');
      setResumeText(`Resume uploaded successfully. The content will be processed automatically.`);
      
      console.log('✅ Resume uploaded:', downloadUrl);
      
    } catch (err) {
      console.error('Error uploading resume:', err);
      alert('Failed to upload resume. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!user?.uid) return;
    
    const resume = userResumes.find(r => r.id === resumeId);
    if (!resume) return;
    
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${resume.title}"?`)) {
      return;
    }
    
    try {
      setIsDeleting(resumeId);
      
      // Delete from Storage if there's a storage path
      if (resume.storagePath) {
        try {
          const storage = getStorage();
          const fileRef = storageRef(storage, resume.storagePath);
          await deleteObject(fileRef);
        } catch (storageError) {
          console.warn('Error deleting from storage:', storageError);
          // Continue with Firestore deletion even if storage deletion fails
        }
      }
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', user.uid, 'resumes', resumeId));
      
      // Update local state
      setUserResumes(prev => prev.filter(r => r.id !== resumeId));
      
      // If this was the selected resume, clear selection
      if (selectedResumeId === resumeId) {
        setSelectedResumeId('');
        setSelectedResumeUrl('');
        setResumeText('');
        setResumeInputMethod('manual');
      }
      
      console.log('✅ Resume deleted successfully');
      
    } catch (err) {
      console.error('Error deleting resume:', err);
      alert('Failed to delete resume. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleLoadResumeText = async (resumeId: string) => {
    const resume = userResumes.find(r => r.id === resumeId);
    if (!resume) return;

    setSelectedResumeUrl(getResumeUrlForContext(resume));
    setResumeInputMethod('saved');
    setResumeText(`Resume content will be processed automatically.`);
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

  const handleStartAnalysis = () => {
    const context: ResumeTailoringContext = {
      user_id: user?.uid || 'anonymous',
      firebase_uid: user?.uid,
      is_anonymous: user?.isAnonymous || false,
      task: 'resume_tailoring',
      user_name: userName || user?.displayName || '',
      resume_storage_url: selectedResumeUrl || '', // Send the download URL directly
      job_description: jobDescription,
      job_title: job?.title || '',
      job_company: job?.company || '',
      require_authenticated_urls: true,
      user_email: user?.email || '',
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent
    };

    console.log('🚀 Starting analysis with context:', {
      ...context,
      resume_url_provided: !!selectedResumeUrl
    });

    startAnalysis(resumeText, selectedResumeUrl, jobDescription, context);
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

  // Get the best available download URL
  const getDownloadUrl = (): string => {
    if (!tailoringData) return '';
    // Priority: authenticated/signed URL > public URL
    return tailoringData.signedUrl || tailoringData.publicUrl || '';
  };

  // Handler for saving tailored resume
  const handleSaveResume = async () => {
    if (!user?.uid || !tailoringData) {
      console.error('Cannot save resume: user not authenticated or no tailoring data');
      return;
    }

    try {
      console.log('💾 Saving tailored resume...');

      // Find the original resume ID if possible
      const originalResumeId = selectedResumeId || userResumes.find(r => r.metadata?.isOriginal)?.id;

      const result = await saveTailoredResume(user.uid, {
        resumeText: tailoringData.tailoredResumeText || '',
        documentUrl: tailoringData.publicUrl,  // Save the public URL
        jobTitle: job?.title,
        jobCompany: job?.company,
        originalResumeId: originalResumeId
      });

      if (result.success) {
        console.log('✅ Resume saved successfully:', result.data);

        // Update the local resumes list to include the new saved resume
        if (result.data) {
          setUserResumes(prev => [...prev, result.data!]);
        }

        alert('Resume saved successfully! You can find it in your saved resumes.');
      } else {
        console.error('❌ Failed to save resume:', result.error);
        alert('Failed to save resume. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving resume:', error);
      alert('An error occurred while saving the resume.');
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

      {/* Resume Selection Section - Updated with delete functionality */}
      <ResumeSelector
        userResumes={userResumes}
        selectedResumeId={selectedResumeId}
        isUploading={isUploading}
        isLoadingResumes={isLoadingResumes}
        resumeInputMethod={resumeInputMethod}
        onFileUpload={handleFileUpload}
        onResumeSelect={handleResumeSelect}
        onLoadSampleResume={loadSampleResume}
        onDeleteResume={handleDeleteResume}
        isDeleting={isDeleting}
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
          {getDownloadUrl() && (
            <DownloadBanner
              resumeUrl={getDownloadUrl()}
            />
          )}

          {/* Resume Changes Tab */}
          {activeTab === 'resume' && (
            <div className="space-y-6">
              {/* Document Viewer */}
              {(tailoringData.tailoredResumeText || getDownloadUrl()) && (
                <UnifiedDocumentViewer
                  resumeText={tailoringData.resumeText}
                  documentUrl={tailoringData.publicUrl}
                  authenticatedUrl={tailoringData.signedUrl}
                  job={job}
                  onCopyText={(text) => copySuggestion(text)}
                  onDownload={() => {
                    // Use signed URL for download if available
                    const downloadUrl = getDownloadUrl();
                    if (downloadUrl) {
                      window.open(downloadUrl, '_blank');
                    }
                  }}
                  onSave={handleSaveResume}
                />
              )}

              {/* Suggested Changes - Commented out for now
              {tailoringData.suggestedChanges && tailoringData.suggestedChanges.length > 0 && (
                <SuggestedChanges
                  changes={tailoringData.suggestedChanges}
                  onCopyText={copySuggestion}
                />
              )}
              */}
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

      {/* Error State */}
      {!isAnalyzing && !tailoringData && (resumeText && jobDescription) && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Click "Tailor My Resume" to start the analysis and get personalized recommendations.
          </p>
        </div>
      )}
    </div>
  );
};

export default ResumeTailoring;