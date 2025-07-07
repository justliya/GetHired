/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { doc, deleteDoc, setDoc, collection, getDocs, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Building2, Grid3X3, List, RefreshCw, Loader2, Briefcase } from 'lucide-react';
import { db, auth } from "../firebase";
import type { CompanyResearch, JobListing } from "../types";
import { useLocation } from 'react-router-dom';
import ResearchCard from "../components/ResearchCard";

interface EnhancedCompanyResearch extends CompanyResearch {
  associatedJob?: JobListing;
  sessionId?: string;
  jobId?: string;
}

const CompanyResearchPage = () => {
  const [user] = useAuthState(auth);
  const location = useLocation();
  const [researchList, setResearchList] = useState<EnhancedCompanyResearch[]>([]);
  const [selectedResearchIndex, setSelectedResearchIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detailed'>('grid');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Load all company research documents for the user
  const loadResearchData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);

    try {
      let allResearch: EnhancedCompanyResearch[] = [];

      // Get active session ID from sessionStorage
      const activeSessionId = sessionStorage.getItem('active-session-id');
      if (activeSessionId) {
        setCurrentSessionId(activeSessionId);

        // First, check localStorage for recent research data
        const localDataKey = `companyResearch-${activeSessionId}`;
        const localData = localStorage.getItem(localDataKey);

        if (localData) {
          try {
            const parsedLocalData = JSON.parse(localData);

            // Data is already pre-parsed as an array
            if (Array.isArray(parsedLocalData)) {
              allResearch = parsedLocalData.map(research => ({
                ...research,
                sessionId: activeSessionId
              }));
            }
          } catch (err) {
            console.error('Failed to parse localStorage data:', err);
          }
        }

        // Load from Firebase using session ID
        const researchRef = doc(db, 'users', user.uid, 'companyResearch', activeSessionId);
        const researchSnap = await getDoc(researchRef);

        if (researchSnap.exists()) {
          const data = researchSnap.data();
          if (data.researchData && Array.isArray(data.researchData)) {
            // Merge with localStorage data, avoiding duplicates
            data.researchData.forEach((research: CompanyResearch) => {
              const exists = allResearch.some(
                r => r.companyOverview.name === research.companyOverview.name
              );
              if (!exists) {
                allResearch.push({
                  ...research,
                  sessionId: activeSessionId
                });
              }
            });
          }
        }
      }

      // Also load all company research sessions from Firebase
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'companyResearch'));

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const sessionId = doc.id;

        if (data.researchData && Array.isArray(data.researchData)) {
          data.researchData.forEach((research: CompanyResearch) => {
            const exists = allResearch.some(
              r => r.companyOverview.name === research.companyOverview.name &&
                r.sessionId === sessionId
            );
            if (!exists) {
              allResearch.push({
                ...research,
                sessionId: sessionId
              });
            }
          });
        }
      }

      // If coming from JobListings with specific research data
      const locationState = location.state as any;
      if (locationState?.allCompanyResearch && locationState?.sessionId) {
        const stateResearch = locationState.allCompanyResearch;
        if (Array.isArray(stateResearch)) {
          stateResearch.forEach((research: CompanyResearch) => {
            const exists = allResearch.some(
              r => r.companyOverview.name === research.companyOverview.name &&
                r.sessionId === locationState.sessionId
            );
            if (!exists) {
              allResearch.push({
                ...research,
                sessionId: locationState.sessionId
              });
            }
          });
        }
      }

      setResearchList(allResearch);

      // If navigated from job listings with a specific company
      if (locationState?.selectedJob && locationState?.companyResearch) {
        const index = allResearch.findIndex(
          r => r.companyOverview.name === locationState.companyResearch.companyOverview.name
        );
        if (index >= 0) {
          setSelectedResearchIndex(index);
          setViewMode('detailed');
        }
      }

    } catch (err) {
      console.error('Failed to load research data:', err);
      setError("Failed to load research data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, location.state]);

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

  const handleDelete = async (company: EnhancedCompanyResearch) => {
    if (!user?.uid) return;

    try {
      // If it has a sessionId, update the session data
      if (company.sessionId) {
        const researchRef = doc(db, "users", user.uid, "companyResearch", company.sessionId);
        const researchSnap = await getDoc(researchRef);

        if (researchSnap.exists()) {
          const data = researchSnap.data();
          const updatedResearch = data.researchData.filter(
            (r: CompanyResearch) => r.companyOverview.name !== company.companyOverview.name
          );

          if (updatedResearch.length > 0) {
            // Update the document with remaining research
            await setDoc(researchRef, {
              ...data,
              researchData: updatedResearch,
              lastUpdated: new Date().toISOString()
            });
          } else {
            // Delete the document if no research left
            await deleteDoc(researchRef);
          }

          // Update localStorage
          const localDataKey = `companyResearch-${company.sessionId}`;
          if (updatedResearch.length > 0) {
            localStorage.setItem(localDataKey, JSON.stringify(updatedResearch));
          } else {
            localStorage.removeItem(localDataKey);
          }
        }
      }

      // Remove from local list
      const newList = researchList.filter(r =>
        !(r.companyOverview.name === company.companyOverview.name &&
          r.sessionId === company.sessionId)
      );
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
  };

  const handleViewReviews = (company: CompanyResearch) => {
    if (company.reviewsSummary?.link) {
      window.open(company.reviewsSummary.link, '_blank');
    }
  };

  if (loading && researchList.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Loading research data...</p>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
        {currentSessionId && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Current session: {currentSessionId.slice(-8)}
          </p>
        )}
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
                {item.sessionId && ` (${item.sessionId.slice(-8)})`}
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
                favorite: favorites.has(researchData.companyOverview.id || researchData.companyOverview.name),
                jobId: researchData.jobId || researchData.associatedJob?.id || ""
              }}
              variant="detailed"
              onFavoriteToggle={handleFavoriteToggle}
              onResearch={handleResearch}
              onDelete={() => handleDelete(researchData)}
              onViewReviews={handleViewReviews}
              className="max-w-4xl mx-auto"
            />

            {/* Show associated job info if available */}
            {researchData.sessionId && (
              <div className="max-w-4xl mx-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Briefcase className="w-4 h-4" />
                  <span>From job search session: {researchData.sessionId.slice(-8)}</span>
                </div>
              </div>
            )}

            {/* Action Buttons for Detailed View */}
            <div className="flex flex-wrap gap-4 max-w-4xl mx-auto">
              <button
                onClick={() => handleDelete(researchData)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                Delete Research
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
                  key={`${companyId}-${research.sessionId}-${index}`}
                  companyResearch={{
                    ...research,
                    favorite: favorites.has(companyId),
                    jobId: research.jobId || research.associatedJob?.id || ""
                  }}
                  variant={viewMode === 'list' ? 'detailed' : 'compact'}
                  onFavoriteToggle={handleFavoriteToggle}
                  onResearch={handleResearch}
                  onDelete={() => handleDelete(research)}
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
            You haven't saved any company research yet. Start by searching for jobs to see research here.
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