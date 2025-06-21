import React, { type ReactNode } from 'react';
import { 
  Building2, 
  Users, 
  MapPin, 
  Star, 
  DollarSign, 
  TrendingUp,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface ResearchCardProps {
  companyResearch: {
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
  };
  title?: string;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const ResearchCard: React.FC<ResearchCardProps> = ({
  companyResearch,
  title,
  icon,
  className = '',
  onClick,
  hover = false
}) => {
  const { companyOverview, ratings, salaryEstimates, strategicAssessment } = companyResearch;

  const getRatingColor = (rating: number) => {
    if (rating >= 4.0) return 'text-green-600';
    if (rating >= 3.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${
        hover ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {(title || icon) && (
        <div className="p-4 border-b border-gray-100 flex items-center">
          {icon && <div className="mr-3 text-primary-600">{icon}</div>}
          {title && <h3 className="font-medium text-gray-800">{title}</h3>}
        </div>
      )}
      
      <div className="p-4">
        {/* Company Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-xl font-bold text-gray-900">{companyOverview.name}</h3>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 mr-1" />
              <span className="font-semibold">{ratings.overall.toFixed(1)}</span>
            </div>
          </div>
          {companyOverview.stockSymbol && (
            <span className="text-sm text-gray-600 font-medium">{companyOverview.stockSymbol}</span>
          )}
        </div>

        {/* Company Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Building2 className="w-4 h-4 mr-2" />
            {companyOverview.industry}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            {companyOverview.size}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {companyOverview.headquarters}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            Founded {companyOverview.founded}
          </div>
        </div>

        {/* Salary Info */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 mr-1" />
            {salaryEstimates.title}
          </div>
          <div className="text-sm text-gray-600">
            Base: ${salaryEstimates.baseRange.min.toLocaleString()} - ${salaryEstimates.baseRange.max.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">
            Total: ${salaryEstimates.totalCompensation.min.toLocaleString()} - ${salaryEstimates.totalCompensation.max.toLocaleString()}
          </div>
        </div>

        {/* Key Ratings */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Work-Life Balance</span>
            <span className={`font-medium ${getRatingColor(ratings.detailedBreakdown.workLifeBalance)}`}>
              {ratings.detailedBreakdown.workLifeBalance.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Culture & Values</span>
            <span className={`font-medium ${getRatingColor(ratings.detailedBreakdown.cultureAndValues)}`}>
              {ratings.detailedBreakdown.cultureAndValues.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Compensation</span>
            <span className={`font-medium ${getRatingColor(ratings.detailedBreakdown.compensationAndBenefits)}`}>
              {ratings.detailedBreakdown.compensationAndBenefits.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Career Growth</span>
            <span className={`font-medium ${getRatingColor(ratings.detailedBreakdown.careerOpportunities)}`}>
              {ratings.detailedBreakdown.careerOpportunities.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Strategic Assessment */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <TrendingUp className="w-4 h-4 mr-1" />
            Assessment
          </div>
          <div className="text-sm text-gray-600 mb-1">
            <span className="font-medium text-green-600">Strengths:</span> {strategicAssessment.strengths.slice(0, 1).join(', ')}
          </div>
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium text-yellow-600">Concerns:</span> {strategicAssessment.concerns.slice(0, 1).join(', ')}
          </div>
          <div className="text-sm">
            <span className="font-medium text-gray-700">Recommendation:</span>
            <span className="ml-1 text-gray-600">{strategicAssessment.recommendation}</span>
          </div>
        </div>

        {/* Website Link */}
        {companyOverview.website && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <a 
              href={companyOverview.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Visit Website
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchCard;