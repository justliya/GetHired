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
  ChevronUp,
  MessageSquare,
  Target,
  Building,
  HelpCircle,
  CheckCircle,
  Trophy
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

// Expandable List Component
const ExpandableList: React.FC<{
  items: string[];
  maxItems?: number;
  className?: string;
  itemClassName?: string;
}> = ({ items, maxItems = 3, className = "", itemClassName = "" }) => {
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? items : items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  return (
    <div className={className}>
      {displayItems.map((item, index) => (
        <div key={index} className={`text-sm text-gray-700 dark:text-gray-300 ${itemClassName}`}>
          • {item}
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 flex items-center gap-1"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              View {items.length - maxItems} more
            </>
          )}
        </button>
      )}
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-600">
          {children}
        </div>
      )}
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
  
  const { 
    companyOverview, 
    ratings, 
    salaryEstimates, 
    strategicAssessment, 
    awards,
    reviewsSummary,
    interviewIntelligence,
    competitors,
    officeLocations
  } = companyResearch;
  
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400';
      case 'medium': return 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'hard': return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400';
    }
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
              Median: ${salaryEstimates.baseRange.median.toLocaleString()} • {salaryEstimates.confidenceLevel} confidence • {salaryEstimates.dataPoints} data points
            </div>
          </div>
        </div>

        {/* Expandable Sections */}
        <div className="space-y-4">
          {/* Detailed Ratings */}
          <CollapsibleSection
            title="Detailed Ratings"
            icon={<Star className="w-5 h-5 text-yellow-600" />}
            defaultOpen={variant === 'detailed'}
          >
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
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                CEO: {ratings.ceo.name}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Rating: {ratings.ceo.rating.toFixed(1)}/5.0
              </div>
            </div>
          </CollapsibleSection>

          {/* Reviews Summary */}
          <CollapsibleSection
            title="Reviews Summary"
            icon={<MessageSquare className="w-5 h-5 text-blue-600" />}
          >
            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Pros
                </h5>
                <ExpandableList 
                  items={reviewsSummary.pros} 
                  maxItems={3}
                  className="space-y-1"
                />
              </div>
              <div>
                <h5 className="font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Cons
                </h5>
                <ExpandableList 
                  items={reviewsSummary.cons} 
                  maxItems={3}
                  className="space-y-1"
                />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Recent Insight</h5>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {reviewsSummary.recentInsight.title} • {reviewsSummary.recentInsight.location} • {reviewsSummary.recentInsight.duration}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  "{reviewsSummary.recentInsight.snippet}"
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Interview Intelligence */}
          <CollapsibleSection
            title="Interview Intelligence"
            icon={<HelpCircle className="w-5 h-5 text-purple-600" />}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`font-semibold px-3 py-2 rounded-lg text-sm ${getDifficultyColor(interviewIntelligence.difficultyLevel)}`}>
                    {interviewIntelligence.difficultyLevel}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Difficulty</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold px-3 py-2 rounded-lg text-sm bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                    {interviewIntelligence.timeline}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Timeline</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold px-3 py-2 rounded-lg text-sm bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                    {interviewIntelligence.successRate}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold px-3 py-2 rounded-lg text-sm bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                    {interviewIntelligence.process.split(' ')[0]}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Rounds</div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Process</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">{interviewIntelligence.process}</p>
              </div>

              <div>
                <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  Common Questions
                </h5>
                <ExpandableList 
                  items={interviewIntelligence.commonQuestions} 
                  maxItems={3}
                  className="space-y-1"
                />
              </div>

              <div>
                <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Interview Tips
                </h5>
                <ExpandableList 
                  items={interviewIntelligence.tips} 
                  maxItems={3}
                  className="space-y-1"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Office Locations */}
          {officeLocations.length > 0 && (
            <CollapsibleSection
              title="Office Locations"
              icon={<Building className="w-5 h-5 text-indigo-600" />}
            >
              <div className="flex flex-wrap gap-2">
                {officeLocations.map((location, index) => (
                  <span key={index} className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 px-3 py-2 rounded-lg text-sm">
                    {location}
                  </span>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Competitors */}
          {competitors.length > 0 && (
            <CollapsibleSection
              title="Competitors"
              icon={<Users className="w-5 h-5 text-orange-600" />}
            >
              <div className="flex flex-wrap gap-2">
                {competitors.map((competitor, index) => (
                  <span key={index} className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 px-3 py-2 rounded-lg text-sm">
                    {competitor.name}
                  </span>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Awards */}
          {awards.length > 0 && (
            <CollapsibleSection
              title="Awards & Recognition"
              icon={<Trophy className="w-5 h-5 text-amber-600" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {awards.map((award, index) => (
                  <div key={index} className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                    <div className="font-medium text-amber-700 dark:text-amber-300">{award.title}</div>
                    <div className="text-sm text-amber-600 dark:text-amber-400">{award.year}</div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Strategic Assessment */}
          <CollapsibleSection
            title="Strategic Assessment"
            icon={<Award className="w-5 h-5 text-purple-600" />}
            defaultOpen={variant === 'detailed'}
          >
            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Strengths
                </h5>
                <ExpandableList 
                  items={strategicAssessment.strengths} 
                  maxItems={3}
                  className="space-y-2"
                  itemClassName="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg"
                />
              </div>
              
              <div>
                <h5 className="font-medium text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Concerns
                </h5>
                <ExpandableList 
                  items={strategicAssessment.concerns} 
                  maxItems={3}
                  className="space-y-2"
                  itemClassName="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg"
                />
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                <h5 className="font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Recommendation
                </h5>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  {strategicAssessment.recommendation}
                </p>
              </div>
            </div>
          </CollapsibleSection>
        </div>
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