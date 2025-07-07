// Basic interfaces
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

// Main preferences interface
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

export interface JobListing {
  title: string;
  company: string;
  location: string;
  postedDate: string;
  description: string;
  url: string;
  salary?: string;
  employmentType?: string;
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

// Main user data interface
export interface UserData {
  profile: Profile;
  jobPreferences: JobPreferences;
  applications: Application[]
  resumes: Resume[]
  jobListings: JobListing[]
  jobSearches: JobSearch[]
}