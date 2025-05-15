import React from "react";
import {
  LayoutDashboard,
  Search,
  FileText,
  Building2,
  ClipboardList,
  Speech,
  Users,
  LogOut,
  Settings,
} from "lucide-react";

type Page =
  | "dashboard"
  | "jobs"
  | "resume"
  | "company"
  | "applications"
  | "networking";

interface SidebarProps {
  isOpen: boolean;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  currentPage,
  onNavigate,
}) => {
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    { id: "jobs", label: "Job Discovery", icon: <Search size={20} /> },
    { id: "resume", label: "Resume Tailoring", icon: <FileText size={20} /> },
    { id: "company", label: "Company Research", icon: <Building2 size={20} /> },
    {
      id: "applications",
      label: "Application Tracker",
      icon: <ClipboardList size={20} />,
    },
    { id: "interview", label: "Interview Prep", icon: <Speech size={20} /> },
    { id: "networking", label: "Networking", icon: <Users size={20} /> },
  ];

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? "w-64" : "w-0 md:w-16 overflow-hidden"
      }`}
    >
      <div className="p-4 flex items-center justify-center h-16">
        {isOpen ? (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold">G.H</span>
            </div>
            <h1 className="ml-2 text-lg font-bold text-gray-900">GetHired AI</h1>
          </div>
        ) : (
          <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
            <span className="text-white font-bold">G.H</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as Page)}
            className={`flex items-center w-full px-3 py-2 rounded-md text-left transition-colors duration-200 ${
              currentPage === item.id
                ? "bg-primary-50 text-primary-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {isOpen && <span className="ml-3 truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        {isOpen ? (
          <div className="flex flex-col space-y-2">
            <button className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              <Settings size={20} />
              <span className="ml-3">Settings</span>
            </button>
            <button className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              <LogOut size={20} />
              <span className="ml-3">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              <Settings size={20} />
            </button>
            <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
