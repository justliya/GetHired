/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Profile {
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export interface SalaryRange {
  min: number;
  max: number;
}

// Schedule related interfaces
export type SchedulePreset = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
export type SearchFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
export type NotificationType = 'Email' | 'Push' | 'SMS';

export interface QuietHours {
  start: string;
  end: string;
}

export interface SearchSchedule {
  enabled: boolean;
  frequency: SearchFrequency;
  customSchedule?: string;
  notificationType: NotificationType;
  quietHours: QuietHours;
  timezone: string;
  daysOfWeek?: number[];      // 0-6 for Sunday-Saturday, used for Weekly frequency
  daysOfMonth?: number[];     // 1-31, used for Monthly frequency
}
export interface ScheduleSettings {
  enabled: boolean;
  preset: SchedulePreset;
  daysOfWeek?: number[];      // 0-6 for Sunday-Saturday
  daysOfMonth?: number[];     // 1-31
  timesOfDay?: string[];      // 24hr format "HH:MM"
  custom?: string;            // For custom CRON-like schedules
}

export interface JobPreferences {
  titles: string[];
  locations: string[];
  skills: string[];
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead';
  salaryRange: SalaryRange;
  searchSchedule: SearchSchedule;
  companies?: string[];
  other?: string;
  includeKeywords?: string[];
  excludeKeywords?: string[];
}

// Subcollection interfaces
export interface Application {
  company: string;
  role: string;
  status: 'applied' | 'interviewing' | 'offered' | 'rejected';
  resumeRef: string;
  notes?: string;
  updatedAt: string;
}

export type ResumeType = 'original' | 'tailored' | 'generated';
export type ResumeUploadSource = 'manual' | 'job-application' | 'auto-generated' | 'ai_generated' | 'proxy' | 'public' | 'firebase' | 'direct' | 'base64';

export interface Resume {
  fileUrl: string;
  publicUrl?: string;  // Public URL for agent processing (without authentication)
  createdAt: string;
  type: ResumeType;
  metadata: {
    title?: string;
    description?: string;
    keywords?: string[];
    lastModified?: string;
    version?: number;
    uploadSource: ResumeUploadSource;
    isOriginal: boolean;
    relatedJobId?: string;       // ID of the job this resume was created/tailored for
    relatedCompany?: string;     // Company this resume version is for
    relatedRole?: string;        // Role this resume version is for
    originalResumeId?: string;   // Reference to the original resume this was based on
    customizations?: string[];   // List of customizations made to original
    [key: string]: unknown;
  };
}

// Resume Tailoring Types
export interface ResumeSuggestion {
  section: string;
  original: string;
  suggested: string;
  reason: string;
}

export interface TailoredResumeUrls {
  publicUrl?: string;
  authenticatedUrl?: string;
  signedUrl?: string;
  firebaseUrl?: string;
  gcsUrl?: string;
}

export interface ResumeTailoringContext {
  user_id: string;
  firebase_uid?: string;
  is_anonymous?: boolean;
  task: string;
  user_name: string;
  resume_storage_url?: string;
  job_description: string;
  job_title?: string;
  job_company?: string;
  require_authenticated_urls?: boolean;
  user_email?: string;
  timestamp?: string;
  user_agent?: string;
}

export interface ResumeTailoringResponse {
  message: string;
  status: string;
  data?: {
    resume_text?: string;
    final_resume?: string;
    tailored_resume_text?: string;
    public_url?: string;
    document_url?: string;
    authenticated_url?: string;
    signed_url?: string;
    firebase_url?: string;
    gcs_url?: string;
    filename?: string;
    status?: string;
    suggested_changes?: ResumeSuggestion[];
    cover_letter?: string;
  };
  session_id?: string;
}

export interface TailoredResume extends Resume {
  tailoringData?: {
    suggestedChanges?: ResumeSuggestion[];
    coverLetter?: string;
    urls?: TailoredResumeUrls;
    analysisTimestamp?: string;
    confidenceScore?: number;
  };
}

export interface SearchParameters {
  titles: string[];
  locations: string[];
  salaryRange: SalaryRange;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  scheduleSettings?: ScheduleSettings;
}

export interface JobSearch {
  preferences: JobPreferences;
  initiatedAt: string;
  resultsCount: number;
  status?: 'queued' | 'running' | 'completed' | 'failed';
}
export interface JobListing {
  jobId: string;
  id: string;
  listingNumber?: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  datePosted: string;
  description: string;
  qualifications: string[];
  benefits: string[];
  jobLink?: string;
  easyApply?: boolean;
  favorite: boolean;
  status: string;
  hasTailoredResume?: boolean;
  tailoredResumeId?: string;
  lastTailoredDate?: string;
}
export interface CompanyResearch {
  jobId: string;
  companyOverview: {
    name: string;
    id: string;
    industry: string;
    size: string;
    founded: number;
    headquarters: string;
    website: string;
    stockSymbol: string | null;
    logoUrl: string;
  };
  ratings: {
    overall: number;
    reviewCount: number;
    ceo: {
      rating: number;
      name: string;
    };
    recommendToFriend: number;
    detailedBreakdown: {
      workLifeBalance: number;
      cultureAndValues: number;
      compensationAndBenefits: number;
      careerOpportunities: number;
      seniorManagement: number;
      businessOutlook: string;
    };
  };
  salaryEstimates: {
    title: string;
    baseRange: { min: number; max: number; median: number };
    additionalPay: { min: number; max: number };
    totalCompensation: { min: number; max: number };
    confidenceLevel: string;
    dataPoints: number;
  };
  reviewsSummary: {
    link: string;
    pros: string[];
    cons: string[];
    recentInsight: {
      title: string;
      location: string;
      duration: string;
      snippet: string;
    };
  };
  interviewIntelligence: {
    difficultyLevel: string;
    process: string;
    timeline: string;
    successRate: string;
    commonQuestions: string[];
    tips: string[];
  };
  competitors: {
    name: string;
    id: string;
  }[];
  officeLocations: string[];
  awards: {
    title: string;
    year: number;
  }[];
  strategicAssessment: {
    strengths: string[];
    concerns: string[];
    recommendation: string;
  };
  favorite?: boolean;
}


export interface UserPreferences {
  jobTitles: string[];
  locations: string[];
  remoteOnly: boolean;
  minSalary: number | null;
  skills: string[];
  experienceLevel: string | null;
}


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  title: string;
  location: string;
  bio: string;
  skills: string[];
  experience: {
    company: string;
    title: string;
    startDate: string;
    endDate: string | null;
    description: string;
  }[];
  education: {
    school: string;
    degree: string;
    field: string;
    graduationYear: number;
  }[];
  links: {
    type: 'linkedin' | 'github' | 'portfolio' | 'other';
    url: string;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Main user data interface
export interface UserData {
  profile: Profile;
  jobPreferences: JobPreferences;
  applications: Application[];
  resumes: Resume[];
  jobListings: JobListing[];
  jobSearches: JobSearch[];
  tailoredResumes?: TailoredResume[];  // Add this for tracking tailored resumes
}


// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Firebase Service Response Types
export interface FirebaseServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/*export interface ResumeTailoring {
  id: string;
  jobId: string;
  suggestedChanges: {
    section: string;
    original: string;
    suggested: string;
    reason: string;
  }[];
  coverLetter: string | null;
}*/