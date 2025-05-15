import React from 'react';
import { Menu, Bell, User, X } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  currentPage: string;
}

const pageNames: Record<string, string> = {
  dashboard: 'Dashboard',
  jobs: 'Job Discovery',
  resume: 'Resume Tailoring',
  company: 'Company Research',
  applications: 'Application Tracker',
  networking: 'Networking',
};

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen, currentPage }) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 h-16 flex items-center px-4 shadow-sm">
      <button 
        onClick={toggleSidebar}
        className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      
      <h1 className="ml-4 text-xl font-semibold text-gray-800">
        {pageNames[currentPage] || 'Dashboard'}
      </h1>
      
      <div className="flex-1"></div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-gray-100 relative">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary-600 ring-2 ring-white"></span>
        </button>
        
        <div className="flex items-center space-x-2">
          <button className="rounded-full bg-gray-200 p-1">
            <User size={24} className="text-gray-600" />
          </button>
          <span className="text-sm text-gray-700 hidden md:inline">User Name</span>
        </div>
      </div>
    </header>
  );
};

export default Header;