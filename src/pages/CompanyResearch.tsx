/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { doc, deleteDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Building2 } from 'lucide-react';
import { db, auth } from "../firebase";
import type { CompanyResearch } from "../types";
import CompanyCard from "../components/CompanyCard";
import ResearchCard from "../components/ResearchCard";

function isValidCompanyResearch(obj: any): obj is CompanyResearch {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.companyOverview?.name === 'string' &&
    typeof obj.ratings?.overall === 'number' &&
    typeof obj.salaryEstimates?.title === 'string' &&
    Array.isArray(obj.reviewsSummary?.pros) &&
    Array.isArray(obj.interviewIntelligence?.commonQuestions) &&
    Array.isArray(obj.competitors) &&
    Array.isArray(obj.officeLocations) &&
    Array.isArray(obj.awards) &&
    typeof obj.strategicAssessment?.recommendation === 'string'
  );
}

const CompanyResearch = () => {
  const [user] = useAuthState(auth);
  const [researchList, setResearchList] = useState<CompanyResearch[]>([]);
  const [selectedResearchIndex, setSelectedResearchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detailed'>('list');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const parseResearchData = useCallback((rawData: any): CompanyResearch | null => {
    if (!rawData) return null;

    if (isValidCompanyResearch(rawData)) {
      return rawData;
    }

    const possibleStructures = [
      rawData?.companyResearch,
      rawData?.data?.companyResearch,
      rawData?.researchData,
      rawData?.research,
      rawData?.response?.companyResearch,
      Array.isArray(rawData) ? rawData[0] : null,
    ].filter(obj => obj && typeof obj === 'object');

    for (const obj of possibleStructures) {
      if (isValidCompanyResearch(obj)) {
        return obj;
      }
    }

    const messageText = rawData?.message || rawData?.data?.raw_events?.[0]?.parts?.[0]?.text || rawData?.text || "";
    if (messageText) {
      const patterns = [
        /```json\s*([\s\S]+?)```/,
        /```([\s\S]+?)```/,
        /\{[\s\S]*"companyOverview"[\s\S]*\}/,
        /\{[\s\S]*\}/,
      ];
      for (const pattern of patterns) {
        const match = messageText.match(pattern);
        if (match) {
          const jsonStr = match[1] || match[0];
          try {
            const parsed = JSON.parse(jsonStr);
            const dataObj = parsed.companyResearch ?? parsed;
            if (isValidCompanyResearch(dataObj)) {
              return dataObj;
            }
          } catch {
            // ignore parse error
          }
        }
      }
    }
    return null;
  }, []);

  const saveResearchData = useCallback(async (data: CompanyResearch) => {
    try {
      if (user?.uid) {
        const companyId = data.companyOverview.id || data.companyOverview.name;
        const companyResearchRef = doc(db, "users", user.uid, "companyResearch", companyId);
        await setDoc(companyResearchRef, {
          companyId: companyId,
          companyName: data.companyOverview.name,
          researchData: data,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
        console.log('Company research saved to Firebase');
      }
    } catch (error) {
      console.error('Failed to save research data:', error);
      setError('Failed to save research data. Please try again.');
    }
  }, [user]);

  // Load all company research documents for the user
  const loadResearchData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'companyResearch'));
      const allResearch = snapshot.docs.map(doc => {
        const data = doc.data();
        const validData = parseResearchData(data.researchData || data);
        return validData;
      }).filter((data): data is CompanyResearch => !!data);

      setResearchList(allResearch);
      setSelectedResearchIndex(0);
    } catch {
      setError("Failed to load research data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, parseResearchData]);

  // Load research data when component mounts
  useEffect(() => {
    loadResearchData();
  }, [loadResearchData]);

  // Card component event handlers
  const handleFavoriteToggle = (company: CompanyResearch) => {
    const companyId = company.companyOverview.id || company.companyOverview.name;
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(companyId)) {
        newFavorites.delete(companyId);
      } else {
        newFavorites.add(companyId);
      }
      return newFavorites;
    });
  };

  const handleResearch = (company: CompanyResearch) => {
    const index = researchList.findIndex(r => r.companyOverview.name === company.companyOverview.name);
    if (index >= 0) {
      setSelectedResearchIndex(index);
      setViewMode('detailed');
    }
  };

  const handleDelete = async (company: CompanyResearch) => {
    const index = researchList.findIndex(r => r.companyOverview.name === company.companyOverview.name);
    if (index >= 0 && user?.uid) {
      try {
        const companyId = company.companyOverview.id || company.companyOverview.name;
        const ref = doc(db, "users", user.uid, "companyResearch", companyId);
        await deleteDoc(ref);
        
        // Remove from local list
        const newList = researchList.filter((_, idx) => idx !== index);
        setResearchList(newList);
        
        // Adjust selected index if needed
        if (selectedResearchIndex >= newList.length) {
          setSelectedResearchIndex(Math.max(0, newList.length - 1));
        }
        
        setError(null);
      } catch {
        setError('Failed to delete research data. Please try again.');
      }
    }
  };

  const handleViewReviews = (company: CompanyResearch) => {
    if (company.reviewsSummary?.link) {
      window.open(company.reviewsSummary.link, '_blank');
    }
  };

  // Delete currently selected research data
  const deleteResearchData = async () => {
    if (!user?.uid || researchList.length === 0) return;
    const researchData = researchList[selectedResearchIndex];
    if (!researchData) return;
    
    try {
      const companyId = researchData.companyOverview.id || researchData.companyOverview.name;
      const ref = doc(db, "users", user.uid, "companyResearch", companyId);
      await deleteDoc(ref);
      
      // Remove from local list
      const newList = researchList.filter((_, idx) => idx !== selectedResearchIndex);
      setResearchList(newList);
      setSelectedResearchIndex(Math.max(0, newList.length - 1));
      setError(null);
    } catch {
      setError('Failed to delete research data. Please try again.');
    }
  };

  // Save current research data
  const handleSaveResearchData = async () => {
    const researchData = researchList[selectedResearchIndex];
    if (researchData) {
      await saveResearchData(researchData);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Loading research data...</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  // Select the current research data based on selectedResearchIndex
  const researchData = researchList[selectedResearchIndex];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage and view your company research data
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="text-red-800 dark:text-red-200">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 text-sm underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Card View
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'detailed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Detailed View
          </button>
        </div>

        {researchList.length > 1 && viewMode === 'detailed' && (
          <select
            className="px-3 py-2 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={selectedResearchIndex}
            onChange={(e) => setSelectedResearchIndex(parseInt(e.target.value))}
          >
            {researchList.map((item, idx) => (
              <option key={idx} value={idx}>
                {item.companyOverview.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {researchList.length > 0 ? (
        viewMode === 'list' ? (
          // Card Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {researchList.map((research, index) => {
              const companyId = research.companyOverview.id || research.companyOverview.name;
              return (
                <CompanyCard
                  key={index}
                  companyResearch={{
                    ...research,
                    favorite: favorites.has(companyId)
                  }}
                  onFavoriteToggle={handleFavoriteToggle}
                  onResearch={handleResearch}
                  onDelete={handleDelete}
                  onViewReviews={handleViewReviews}
                />
              );
            })}
          </div>
        ) : (
          // Detailed Research Card View
          <div className="space-y-6">
            <ResearchCard
              companyResearch={researchData}
              title="Company Research Details"
              icon={<Building2 className="w-5 h-5" />}
              className="max-w-4xl"
            />
            
            {/* Action Buttons */}
            <div className="flex gap-4 max-w-4xl">
              <button
                onClick={deleteResearchData}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Research
              </button>
              <button
                onClick={loadResearchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh Data
              </button>
              <button
                onClick={handleSaveResearchData}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Save Research
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No company research available.</p>
          <button
            onClick={loadResearchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Loading Again
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyResearch;