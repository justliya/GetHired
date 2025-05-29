
export interface Profile {
  name: string;
  email: string;
  phone?: string;
}

export interface SalaryRange {
  min: number;
  max: number;
}

export type SearchFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';
export type NotificationType = 'Email' | 'Push' | 'Both' | 'None';

export interface SearchSchedule {
  enabled: boolean;
  frequency: SearchFrequency;
  customSchedule?: string; // For custom CRON-like schedules
  notificationType: NotificationType;
  quietHours?: {
    start: string; // 24hr format "HH:MM"
    end: string;
  };
  timezone: string;
  lastSearched?: Date;
  nextScheduledSearch?: Date;
}

// 3. Job Preferences model
export interface JobPreferences {
  titles: string[];
  locations: string[];
  salaryRange: SalaryRange;
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Exec';
  other?: string;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  searchSchedule: SearchSchedule;
}

export interface UserData {
  profile: Profile;
  jobPreferences: JobPreferences;
}

export interface Application {
  id?: string;
  company: string;
  role: string;
  status: 'applied' | 'interviewing' | 'offered' | 'rejected';
  resumeRef: string;
  notes?: string;
  updatedAt: Date;
}

export interface Resume {
  id?: string;
  fileUrl: string;
  createdAt: Date;
  metadata?: string;
}

export interface JobListing {
  id?: string;
  title: string;
  company: string;
  location: string;
  postedDate: Date;
  description: string;
  url: string;
  salary?: string;
  employmentType?: string;
}