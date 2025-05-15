import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import Dashboard from "./pages/Dashboard";
import JobDiscovery from "./pages/JobDiscovery";
import ResumeTailoring from "./pages/ResumeTailoring";
import CompanyResearch from "./pages/CompanyResearch";
import ApplicationTracker from "./pages/ApplicationTracker";
import Networking from "./pages/Networking";
import Profile from "./pages/Profile";
import { type Page } from "./types";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={(page) => setCurrentPage(page)} />;
      case "jobs":
        return <JobDiscovery />;
      case "profile":
        return <Profile />;
      case "resume":
        return <ResumeTailoring />;
      case "company":
        return <CompanyResearch />;
      case "applications":
        return <ApplicationTracker />;

      case "networking":
        return <Networking />;
      default:
        return <Dashboard onNavigate={(page) => setCurrentPage(page)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex">
      <Sidebar
        isOpen={isSidebarOpen}
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
      />
      <div className="flex-1 flex flex-col transition-all duration-300">
        <Header
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          currentPage={currentPage}
          onNavigate={(page) => setCurrentPage(page)}
        />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
