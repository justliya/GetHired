// src/App.tsx
import { useState, useEffect } from "react";
import Sidebar from "./components/layout/SideBar"
import Header from "./components/layout/Header";
import Dashboard from "./pages/Dashboard";
import JobDiscovery from "./pages/JobDiscovery";
import ResumeTailoring from "./pages/ResumeTailoring";
import CompanyResearch from "./pages/CompanyResearch";
import ApplicationTracker from "./pages/ApplicationTracker";
import Networking from "./pages/Networking";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import { type Page } from "./types";

import { auth, onAuthStateChanged } from "./firebase";
import UserPreferencesModal from "./components/ui/UserPreferencesModal";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("auth");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // New state for user preferences modal
  const [showUserPrefs, setShowUserPrefs] = useState<boolean>(false);
  const [hasShownUserPrefs, setHasShownUserPrefs] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentPage("dashboard");
      } else {
        setCurrentPage("auth");
      }
    });
    return () => unsubscribe();
  }, []);
  
  // When dashboard loads for the first time, show the modal
  useEffect(() => {
    if (currentPage === "dashboard" && !hasShownUserPrefs) {
      setShowUserPrefs(true);
    }
  }, [currentPage]);

  const handleCloseUserPrefs = () => {
    setShowUserPrefs(false);
    setHasShownUserPrefs(true);
  };

  const handleUserPrefsSubmit = () => {
    handleCloseUserPrefs();
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((open) => !open);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={(p) => setCurrentPage(p)} />;
      case "jobs":
        return <JobDiscovery />;
      case "resume":
        return <ResumeTailoring />;
      case "company":
        return <CompanyResearch />;
      case "applications":
        return <ApplicationTracker />;
      case "networking":
        return <Networking />;
      case "profile":
        return <Profile />;
      case "auth":
        return <Auth />;
      default:
        return <Dashboard onNavigate={(p) => setCurrentPage(p)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex">
      {currentPage !== "auth" && (
        <Sidebar
          isOpen={isSidebarOpen}
          currentPage={currentPage}
          onNavigate={(p) => setCurrentPage(p)}
        />
      )}

      <div className="flex-1 flex flex-col transition-all duration-300">
        {currentPage !== "auth" && (
          <Header
            toggleSidebar={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
            currentPage={currentPage}
            onNavigate={(p) => setCurrentPage(p)}
          />
        )}

        <main className={`flex-1 overflow-y-auto ${currentPage !== "auth" ? "p-4 md:p-6" : ""}`}>
          <div className={`${currentPage !== "auth" ? "max-w-7xl mx-auto animate-fade-in" : ""}`}>
            {renderPage()}
          </div>
        </main>
      </div>
      {/* New modal for user preferences */}
      {currentPage === "dashboard" && (
        <UserPreferencesModal
          show={showUserPrefs}
          onHide={handleCloseUserPrefs}
          onSubmit={handleUserPrefsSubmit}
        />
      )}
    </div>
  );
}

export default App;