import React from "react";
import { Menu, Bell, User as UserIcon, X } from "lucide-react";
import { type Page } from "../../types";
import { User } from "../../contexts/UserContext";

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const pageNames: Record<Page, string> = {
  dashboard: "Dashboard",
  jobs: "Job Discovery",
  resume: "Resume Tailoring",
  company: "Company Research",
  applications: "Application Tracker",
  networking: "Networking",
  profile: "Profile",
  auth: "Sign In",
};

const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  isSidebarOpen,
  currentPage,
  onNavigate,
}) => {
  const { user } = User();

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 h-16 flex items-center px-4 shadow-sm">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Page title */}
      <h1 className="ml-4 text-xl font-semibold text-gray-800">
        {pageNames[currentPage] || "Dashboard"}
      </h1>

      <div className="flex-1"></div>

      {/* Notifications and user */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="p-2 rounded-full hover:bg-gray-100 relative">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary-600 ring-2 ring-white"></span>
        </button>

        {/* User avatar and name */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate("profile")}
            className="rounded-full overflow-hidden bg-gray-200 p-0.5 hover:bg-gray-300 transition"
            aria-label="Go to profile"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <UserIcon size={24} className="text-gray-600" />
            )}
          </button>
          <span
            onClick={() => onNavigate("profile")}
            className="cursor-pointer text-sm text-gray-700 hidden md:inline hover:underline"
          >
            {user?.name || "User Name"}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
