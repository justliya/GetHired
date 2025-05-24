export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  description: string;
  qualifications: string[];
  datePosted: string;
  url: string;
  favorite: boolean;
  status: 'new' | 'researching' | 'applying' | 'applied' | 'interviewing' | 'rejected' | 'offered';
}

export interface CompanyResearch {
  id: string;
  jobId: string;
  companyName: string;
  officialWebsite: string | null;
  responsibilities: string[];
  benefits: string[];
  pros: string[];
  cons: string[];
  glassdoorLink: string | null;
  notes: string;
}

export interface ResumeTailoring {
  id: string;
  jobId: string;
  suggestedChanges: {
    section: string;
    original: string;
    suggested: string;
    reason: string;
  }[];
  coverLetter: string | null;
}

export interface UserPreferences {
  jobTitles: string[];
  locations: string[];
  remoteOnly: boolean;
  minSalary: number | null;
  skills: string[];
  experienceLevel: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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