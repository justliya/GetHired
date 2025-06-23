/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect} from "react";
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Grid3X3, List, Building2 } from 'lucide-react';

import type { companyResearch } from "../types";

import ResearchCard from "../components/ResearchCard";

const CompanyResearchPage = () => {
  const [researchList, setResearchList] = useState<Array<companyResearch & { jobId: string }>>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch company research from Firestore
  useEffect(() => {
    const fetchResearch = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'companyResearch'));
        const research = snapshot.docs
          .map(docSnap => {
            const raw = docSnap.data();
            const entry = (raw as any).researchData ?? raw;
            // Validate that the document has the required structure
            if (!entry.companyOverview || (!entry.companyOverview.id && !entry.companyOverview.name)) {
              console.warn('Invalid research document structure:', docSnap.id, raw);
              return null;
            }
            // Attach the Firestore doc ID (or stored jobId) for deletions
            return { ...(entry as companyResearch), jobId: (raw as any).jobId ?? docSnap.id };
          })
          .filter((item): item is companyResearch & { jobId: string } => item !== null);
        setResearchList(research);
      } catch (error) {
        console.error('Error fetching research:', error);
        setResearchList([]);
      }
    };

    fetchResearch();
  }, []);

  // Handler to delete company research
  const handleDelete = async (research: companyResearch & { jobId: string }) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const researchRef = doc(db, 'users', user.uid, 'companyResearch', research.jobId);
      await deleteDoc(researchRef);
      setResearchList(prev => prev.filter(r => r.jobId !== research.jobId));
    } catch (error) {
      console.error('Error deleting research:', error);
    }
  };

  // Handle view reviews
  const handleViewReviews = (research: companyResearch) => {
    if (research.reviewsSummary?.link) {
      window.open(research.reviewsSummary.link, '_blank');
    } else {
      // Fallback to a general search or show a message
      const searchQuery = encodeURIComponent(`${research.companyOverview.name} reviews`);
      window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
    }
  };

  if (researchList.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage and view your company research data
          </p>
        </div>
        
        {/* Empty State */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Company Research Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You haven't saved any company research yet. Start by researching companies to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Research</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage and view your company research data ({researchList.length} companies)
        </p>
      </div>

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
      </div>

      {/* Grid/List View */}
      <div className={`
        ${viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
        }
      `}>
        {researchList
          .filter((research) => research?.companyOverview?.id || research?.companyOverview?.name)
          .map((research) => {
            // Create a unique key using companyOverview.id with fallback to name
            const companyId = research.companyOverview.id || research.companyOverview.name;
            return (
              <ResearchCard
                key={companyId}
                companyResearch={research}
                variant={viewMode === 'list' ? 'detailed' : 'compact'}
                onDelete={handleDelete}
                onViewReviews={handleViewReviews}
              />
            );
          })}
      </div>
    </div>
  );
};
export default CompanyResearchPage;