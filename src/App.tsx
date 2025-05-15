import { useState } from 'react';
import Sidebar from './components/layout/SideBar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import JobDiscovery from './pages/JobDiscovery';
import ResumeTailoring from './pages/ResumeTailoring';
import CompanyResearch from './pages/CompanyResearch';
import ApplicationTracker from './pages/ApplicationTracker';
import Networking from './pages/Networking';

type Page = 'dashboard' | 'jobs' | 'resume' | 'company' | 'applications' | 'networking';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'jobs':
        return <JobDiscovery />;
      case 'resume':
        return <ResumeTailoring />;
      case 'company':
        return <CompanyResearch />;
      case 'applications':
        return <ApplicationTracker />;
      case 'networking':
        return <Networking />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex">
      <Sidebar 
        isOpen={isSidebarOpen} 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
      />
      <div className="flex-1 flex flex-col transition-all duration-300">
        <Header 
          toggleSidebar={toggleSidebar} 
          isSidebarOpen={isSidebarOpen} 
          currentPage={currentPage}
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