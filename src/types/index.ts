export interface JobListing {
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
  jobLink: string;
  easyApply?: boolean;
  favorite: boolean;
  status: string;
}
export interface CompanyResearch {
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