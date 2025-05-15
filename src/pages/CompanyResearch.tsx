import React, { useState } from 'react';
import { Building2, Search, Users, BarChart as ChartBar, MapPin, Globe, DollarSign, Award, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const CompanyResearch: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<null | {
    name: string;
    logo: string;
    industry: string;
    size: string;
    headquarters: string;
    founded: string;
    website: string;
    revenue: string;
    rating: number;
    reviews: {
      overall: number;
      workLife: number;
      compensation: number;
      culture: number;
      career: number;
    };
    pros: string[];
    cons: string[];
    keyPeople: {
      name: string;
      position: string;
    }[];
  }>(null);

  const handleSearch = () => {
    if (!companyName.trim()) return;
    
    setIsSearching(true);
    
    // Simulate search delay
    setTimeout(() => {
      setCompanyInfo({
        name: "TechCorp Inc.",
        logo: "https://placehold.co/100x100?text=TC",
        industry: "Information Technology",
        size: "1,000-5,000 employees",
        headquarters: "San Francisco, CA",
        founded: "2010",
        website: "www.techcorp-example.com",
        revenue: "$100M - $500M",
        rating: 4.2,
        reviews: {
          overall: 4.2,
          workLife: 3.8,
          compensation: 4.5,
          culture: 4.0,
          career: 3.9,
        },
        pros: [
          "Competitive salary and benefits",
          "Good work-life balance",
          "Strong engineering culture",
          "Remote work options"
        ],
        cons: [
          "Limited career advancement in some departments",
          "Decision-making can be slow",
          "High pressure during release cycles"
        ],
        keyPeople: [
          { name: "Jane Smith", position: "CEO" },
          { name: "John Doe", position: "CTO" },
          { name: "Alice Johnson", position: "VP of Engineering" }
        ]
      });
      setIsSearching(false);
    }, 1500);
  };

  // Function to render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<span key={i} className="text-warning-500">★</span>);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<span key={i} className="text-warning-500">★</span>);
      } else {
        stars.push(<span key={i} className="text-gray-300">★</span>);
      }
    }
    
    return stars;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Building2 size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter company name..."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            disabled={!companyName.trim() || isSearching}
            onClick={handleSearch}
          >
            {isSearching ? (
              <>
                <RefreshCw size={18} className="mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search size={18} className="mr-2" />
                Research Company
              </>
            )}
          </Button>
        </div>
      </Card>

      {companyInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
          <Card className="md:col-span-3">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg w-16 h-16 flex items-center justify-center">
                <img 
                  src={companyInfo.logo} 
                  alt={`${companyInfo.name} logo`} 
                  className="max-w-full max-h-full"
                />
              </div>
              <div className="mt-4 md:mt-0 md:ml-6">
                <h2 className="text-2xl font-bold text-gray-900">{companyInfo.name}</h2>
                <div className="flex items-center mt-1">
                  <div className="flex mr-2">
                    {renderStars(companyInfo.rating)}
                  </div>
                  <span className="text-sm text-gray-600">{companyInfo.rating} out of 5</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="flex items-start">
                <Users size={18} className="mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Company Size</p>
                  <p className="text-sm font-medium">{companyInfo.size}</p>
                </div>
              </div>
              <div className="flex items-start">
                <ChartBar size={18} className="mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Industry</p>
                  <p className="text-sm font-medium">{companyInfo.industry}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin size={18} className="mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Headquarters</p>
                  <p className="text-sm font-medium">{companyInfo.headquarters}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Globe size={18} className="mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Website</p>
                  <p className="text-sm font-medium">{companyInfo.website}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Award size={18} className="mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Founded</p>
                  <p className="text-sm font-medium">{companyInfo.founded}</p>
                </div>
              </div>
              <div className="flex items-start">
                <DollarSign size={18} className="mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-sm font-medium">{companyInfo.revenue}</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card title="Employee Reviews" className="md:col-span-2">
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">Overall:</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-primary-600 rounded-full" 
                    style={{ width: `${(companyInfo.reviews.overall / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium">{companyInfo.reviews.overall}</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">Work/Life Balance:</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-primary-600 rounded-full" 
                    style={{ width: `${(companyInfo.reviews.workLife / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium">{companyInfo.reviews.workLife}</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">Compensation:</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-primary-600 rounded-full" 
                    style={{ width: `${(companyInfo.reviews.compensation / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium">{companyInfo.reviews.compensation}</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">Culture:</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-primary-600 rounded-full" 
                    style={{ width: `${(companyInfo.reviews.culture / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium">{companyInfo.reviews.culture}</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-sm text-gray-600">Career Growth:</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-primary-600 rounded-full" 
                    style={{ width: `${(companyInfo.reviews.career / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium">{companyInfo.reviews.career}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <h4 className="text-sm font-semibold text-green-600 mb-2">Pros</h4>
                <ul className="space-y-2">
                  {companyInfo.pros.map((pro, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-success-500 mr-2">+</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-2">Cons</h4>
                <ul className="space-y-2">
                  {companyInfo.cons.map((con, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-error-500 mr-2">-</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
          
          <Card title="Key People">
            <div className="space-y-4">
              {companyInfo.keyPeople.map((person, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {person.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800">{person.name}</p>
                    <p className="text-xs text-gray-500">{person.position}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Button variant="outline" size="sm" className="w-full">
                View More People on LinkedIn
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CompanyResearch;