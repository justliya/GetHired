import React, { useState } from 'react';
import { 

  Users, 
  MapPin, 
  Star, 
  DollarSign, 
  Bookmark, 
  ExternalLink, 
  Award, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CompanyResearch {
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

interface ResearchCardProps {
  companyResearch: CompanyResearch;
  onFavoriteToggle: (company: CompanyResearch) => void;
  onResearch: (company: CompanyResearch) => void;
  onDelete: (company: CompanyResearch) => void;
  onViewReviews: (company: CompanyResearch) => void;
  variant?: 'compact' | 'detailed';
  className?: string;
}

// Improved Logo Component with Error Handling
const CompanyLogo: React.FC<{
  logoUrl: string;
  companyName: string;
  className?: string;
}> = ({ logoUrl, companyName, className = "" }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // If no logoUrl provided or image failed to load, show fallback
  if (!logoUrl || imageError) {
    return (
      <div className={`w-10 h-10 rounded bg-white/30 flex items-center justify-center text-white font-bold text-lg border-2 border-white/20 ${className}`}>
        {companyName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={`w-10 h-10 rounded bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/20 ${className}`}>
      {imageLoading && (
        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
      )}
      <img 
        src={logoUrl} 
        alt={`${companyName} logo`}
        className={`w-full h-full object-contain transition-opacity duration-200 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
        onLoad={() => {
          setImageLoading(false);
        }}
        style={{ 
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
    </div>
  );
};

const ResearchCard: React.FC<ResearchCardProps> = ({
  companyResearch,
  onFavoriteToggle,
  onResearch,
  onDelete,
  onViewReviews,
  variant = 'compact',
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetailedRatings, setShowDetailedRatings] = useState(false);
  
  const { companyOverview, ratings, salaryEstimates, strategicAssessment, awards } = companyResearch;
  
  // Create a summary description from strategic assessment
  const summaryDescription = [
    strategicAssessment.strengths[0],
    strategicAssessment.concerns[0]
  ].filter(Boolean).join('. ');



  const getRatingBadgeColor = (rating: number) => {
    if (rating >= 4.0) return 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400';
    if (rating >= 3.0) return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
    return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden ${className}`}>
      {/* Header - Gradient like CompanyResearch */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <CompanyLogo 
              logoUrl={companyOverview.logoUrl}
              companyName={companyOverview.name}
            />
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {companyOverview.name}
                {companyOverview.stockSymbol && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded font-mono">
                    {companyOverview.stockSymbol}
                  </span>
                )}
              </h3>
              <p className="text-sm opacity-90">{companyOverview.industry}</p>
            </div>
          </div>
          <button 
            onClick={() => onFavoriteToggle(companyResearch)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Bookmark className={`w-5 h-5 ${companyResearch.favorite ? 'text-yellow-300 fill-current' : 'text-white/70'}`} />
          </button>
        </div>

        {/* Header Stats */}
        <div className="flex flex-wrap gap-4 text-sm opacity-90">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {companyOverview.size}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {companyOverview.headquarters}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Founded {companyOverview.founded}
          </span>
          {awards.length > 0 && (
            <span className="flex items-center gap-1">
              <Award className="w-4 h-4" />
              {awards.length} award{awards.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Rating and Summary */}
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <div className="flex items-center">
                <Star className="w-5 h-5 text-yellow-500 mr-1" />
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {ratings.overall.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                ({ratings.reviewCount.toLocaleString()} reviews)
              </span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {ratings.recommendToFriend}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Recommend</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {ratings.ceo.rating.toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">CEO Rating</div>
            </div>
          </div>

          {/* Summary Description */}
          {summaryDescription && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {isExpanded ? summaryDescription : `${summaryDescription.slice(0, 120)}${summaryDescription.length > 120 ? '...' : ''}`}
              </p>
              {summaryDescription.length > 120 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400 mt-2"
                >
                  {isExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Salary Information */}
        <div>
          <h4 className="text-lg font-semibold dark:text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Salary Estimates
          </h4>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {salaryEstimates.title}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Base Salary Range</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${salaryEstimates.baseRange.min.toLocaleString()} - ${salaryEstimates.baseRange.max.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Compensation</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${salaryEstimates.totalCompensation.min.toLocaleString()} - ${salaryEstimates.totalCompensation.max.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Median: ${salaryEstimates.baseRange.median.toLocaleString()} • {salaryEstimates.confidenceLevel} confidence
            </div>
          </div>
        </div>

        {/* Detailed Ratings (Collapsible) */}
        {variant === 'detailed' && (
          <div>
            <button
              onClick={() => setShowDetailedRatings(!showDetailedRatings)}
              className="flex items-center justify-between w-full text-lg font-semibold text-gray-900 dark:text-white mb-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <span>Detailed Ratings</span>
              {showDetailedRatings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {showDetailedRatings && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Work-Life Balance</span>
                  <span className={`font-semibold px-3 py-1 rounded-full text-sm ${getRatingBadgeColor(ratings.detailedBreakdown.workLifeBalance)}`}>
                    {ratings.detailedBreakdown.workLifeBalance.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Culture & Values</span>
                  <span className={`font-semibold px-3 py-1 rounded-full text-sm ${getRatingBadgeColor(ratings.detailedBreakdown.cultureAndValues)}`}>
                    {ratings.detailedBreakdown.cultureAndValues.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Compensation</span>
                  <span className={`font-semibold px-3 py-1 rounded-full text-sm ${getRatingBadgeColor(ratings.detailedBreakdown.compensationAndBenefits)}`}>
                    {ratings.detailedBreakdown.compensationAndBenefits.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Career Growth</span>
                  <span className={`font-semibold px-3 py-1 rounded-full text-sm ${getRatingBadgeColor(ratings.detailedBreakdown.careerOpportunities)}`}>
                    {ratings.detailedBreakdown.careerOpportunities.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Senior Management</span>
                  <span className={`font-semibold px-3 py-1 rounded-full text-sm ${getRatingBadgeColor(ratings.detailedBreakdown.seniorManagement)}`}>
                    {ratings.detailedBreakdown.seniorManagement.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Business Outlook</span>
                  <span className="font-semibold px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    {ratings.detailedBreakdown.businessOutlook}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Strategic Assessment Tags */}
        <div>
          <h4 className="text-lg font-semibold dark:text-white mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Key Insights
          </h4>
          <div className="flex flex-wrap gap-2">
            {strategicAssessment.strengths.slice(0, 2).map((strength, index) => (
              <span key={`strength-${index}`} className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <TrendingUp className="w-3 h-3" />
                {strength.length > 30 ? `${strength.slice(0, 30)}...` : strength}
              </span>
            ))}
            {strategicAssessment.concerns.slice(0, 1).map((concern, index) => (
              <span key={`concern-${index}`} className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                {concern.length > 30 ? `${concern.slice(0, 30)}...` : concern}
              </span>
            ))}
            {(strategicAssessment.strengths.length + strategicAssessment.concerns.length) > 3 && (
              <span className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                +{(strategicAssessment.strengths.length + strategicAssessment.concerns.length) - 3} more insights
              </span>
            )}
          </div>
        </div>

        {/* Awards Section - only show if awards exist */}
        {awards.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold dark:text-white mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Recent Awards
            </h4>
            <div className="flex flex-wrap gap-2">
              {awards.slice(0, 3).map((award, index) => (
                <span key={index} className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 px-3 py-2 rounded-lg text-sm">
                  {award.title} ({award.year})
                </span>
              ))}
              {awards.length > 3 && (
                <span className="text-sm text-gray-500 dark:text-gray-400 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  +{awards.length - 3} more awards
                </span>
              )}
            </div>
          </div>
        )}

        {/* Recommendation */}
        {variant === 'detailed' && (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
            <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Strategic Recommendation
            </h4>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              {strategicAssessment.recommendation}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={() => window.open(companyOverview.website || '#', '_blank')}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1 hover:underline transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Website
        </button>
        <button
          onClick={() => onViewReviews(companyResearch)}
          className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium hover:underline transition-colors"
        >
          Reviews
        </button>
        <button
          onClick={() => onResearch(companyResearch)}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 text-sm font-medium hover:underline transition-colors"
        >
          Research
        </button>
        <button
          onClick={() => onDelete(companyResearch)}
          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium hover:underline transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ResearchCard;