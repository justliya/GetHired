import React, { useState } from 'react';
import { Building2, Users, MapPin, Star, DollarSign, Bookmark, ExternalLink, Award, TrendingUp, AlertTriangle } from 'lucide-react';
import type { CompanyResearch } from '../types';

interface CompanyCardProps {
  companyResearch: CompanyResearch & {
    favorite?: boolean;
  };
  onFavoriteToggle: (company: CompanyResearch) => void;
  onResearch: (company: CompanyResearch) => void;
  onDelete: (company: CompanyResearch) => void;
  onViewReviews: (company: CompanyResearch) => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({
  companyResearch,
  onFavoriteToggle,
  onResearch,
  onDelete,
  onViewReviews,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { companyOverview, ratings, salaryEstimates, strategicAssessment, awards } = companyResearch;
  
  // Create a summary description from strategic assessment
  const summaryDescription = [
    strategicAssessment.strengths[0],
    strategicAssessment.concerns[0]
  ].filter(Boolean).join('. ');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {companyOverview.logoUrl && (
            <img 
              src={companyOverview.logoUrl} 
              alt={`${companyOverview.name} logo`}
              className="w-8 h-8 rounded object-contain"
            />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {companyOverview.name}
              {companyOverview.stockSymbol && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                  {companyOverview.stockSymbol}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{companyOverview.industry}</p>
          </div>
        </div>
        <button onClick={() => onFavoriteToggle(companyResearch)}>
          <Bookmark className={`w-5 h-5 ${companyResearch.favorite ? 'text-yellow-500' : 'text-gray-400'}`} />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center">
          <Star className="w-4 h-4 text-yellow-400 mr-1" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {ratings.overall.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
            ({ratings.reviewCount.toLocaleString()} reviews)
          </span>
        </div>
        {awards.length > 0 && (
          <div className="flex items-center">
            <Award className="w-4 h-4 text-amber-500 mr-1" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {awards.length} award{awards.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {summaryDescription && (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            {isExpanded ? summaryDescription : `${summaryDescription.slice(0, 120)}...`}
          </p>
          {summaryDescription.length > 120 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              {isExpanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
        <Users className="w-4 h-4" />
        <span>{companyOverview.size}</span>
        <MapPin className="w-4 h-4 ml-4" />
        <span>{companyOverview.headquarters}</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Building2 className="w-4 h-4" />
        <span>Founded {companyOverview.founded}</span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <DollarSign className="w-4 h-4" />
        <span>
          {salaryEstimates.title}: $
          {salaryEstimates.baseRange.min.toLocaleString()} - $
          {salaryEstimates.baseRange.max.toLocaleString()}
          <span className="text-xs ml-1">
            (median: ${salaryEstimates.baseRange.median.toLocaleString()})
          </span>
        </span>
      </div>

      {/* Strategic indicators */}
      <div className="flex flex-wrap gap-2 mb-4">
        {strategicAssessment.strengths.slice(0, 1).map((strength, index) => (
          <span key={index} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded text-xs flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {strength.length > 25 ? `${strength.slice(0, 25)}...` : strength}
          </span>
        ))}
        {strategicAssessment.concerns.slice(0, 1).map((concern, index) => (
          <span key={index} className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-0.5 rounded text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {concern.length > 25 ? `${concern.slice(0, 25)}...` : concern}
          </span>
        ))}
        {(strategicAssessment.strengths.length + strategicAssessment.concerns.length) > 2 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            +{(strategicAssessment.strengths.length + strategicAssessment.concerns.length) - 2} more insights
          </span>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => window.open(companyOverview.website || '#', '_blank')}
          className="text-blue-600 hover:underline dark:text-blue-400 text-sm font-medium flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          Visit Website
        </button>
        <button
          onClick={() => onViewReviews(companyResearch)}
          className="text-purple-600 dark:text-purple-400 hover:underline text-sm"
        >
          View Reviews
        </button>
        <button
          onClick={() => onResearch(companyResearch)}
          className="text-gray-600 dark:text-gray-300 hover:underline text-sm"
        >
          Deep Research
        </button>
        <button
          onClick={() => onDelete(companyResearch)}
          className="text-red-600 dark:text-red-400 hover:underline text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default CompanyCard;