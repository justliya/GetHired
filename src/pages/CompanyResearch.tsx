/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { doc, deleteDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Building2, Grid3X3, List, RefreshCw } from 'lucide-react';
import { db, auth } from "../firebase";
import type { CompanyResearch } from "../types";

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

const CompanyResearchPage = () => {
  const [user] = useAuthState(auth);
  const [researchList, setResearchList] = useState<CompanyResearch[]>([]);
  const [selectedResearchIndex, setSelectedResearchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detailed'>('grid');
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
      if (allResearch.length > 0 && selectedResearchIndex >= allResearch.length) {
        setSelectedResearchIndex(0);
      }
    } catch (err) {
      console.error('Failed to load research data:', err);
      setError("Failed to load research data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, parseResearchData, selectedResearchIndex]);

  // Load research data when component mounts
  useEffect(() => {
    loadResearchData();
  }, [loadResearchData]);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('companyFavorites');
    if (savedFavorites) {
      try {
        const parsed = JSON.parse(savedFavorites);
        setFavorites(new Set(parsed));
      } catch (err) {
        console.error('Failed to parse saved favorites:', err);
      }
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    localStorage.setItem('companyFavorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

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
      } catch (err) {
        console.error('Failed to delete research data:', err);
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
    } catch (err) {
      console.error('Failed to delete research data:', err);
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
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Loading research data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Select the current research data based on selectedResearchIndex
  const researchData = researchList[selectedResearchIndex];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage and view your company research data ({researchList.length} companies)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="text-red-800 dark:text-red-200">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 text-sm underline mt-2 hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <Grid3X3 className="w-4 h-4" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>

        {/* Company Selector for Detailed View */}
        {researchList.length > 1 && viewMode === 'detailed' && (
          <select
            className="px-3 py-2 rounded-md border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
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

        {/* Refresh Button */}
        <button
          onClick={loadResearchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {researchList.length > 0 ? (
        viewMode === 'detailed' && researchData ? (
          // Detailed View
          <div className="space-y-6">
            <ResearchCard
              companyResearch={{
                ...researchData,
                favorite: favorites.has(researchData.companyOverview.id || researchData.companyOverview.name)
              }}
              variant="detailed"
              onFavoriteToggle={handleFavoriteToggle}
              onResearch={handleResearch}
              onDelete={handleDelete}
              onViewReviews={handleViewReviews}
              className="max-w-4xl mx-auto"
            />

            {/* Action Buttons for Detailed View */}
            <div className="flex flex-wrap gap-4 max-w-4xl mx-auto">
              <button
                onClick={deleteResearchData}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                Delete Research
              </button>
              <button
                onClick={handleSaveResearchData}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                Save Research
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                Back to Grid
              </button>
            </div>
          </div>
        ) : (
          // Grid/List View
          <div className={`
            ${viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
            }
          `}>
            {researchList.map((research, index) => {
              const companyId = research.companyOverview.id || research.companyOverview.name;
              return (
                <ResearchCard
                  key={`${companyId}-${index}`}
                  companyResearch={{
                    ...research,
                    favorite: favorites.has(companyId)
                  }}
                  variant={viewMode === 'list' ? 'detailed' : 'compact'}
                  onFavoriteToggle={handleFavoriteToggle}
                  onResearch={handleResearch}
                  onDelete={handleDelete}
                  onViewReviews={handleViewReviews}
                />
              );
            })}
          </div>
        )
      ) : (
        // Empty State
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Company Research Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You haven't saved any company research yet. Start by researching companies to see them here.
          </p>
          <button
            onClick={loadResearchData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Try Loading Again
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyResearchPage;