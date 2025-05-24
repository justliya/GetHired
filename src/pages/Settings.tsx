import { useState } from "react";

import {
  Lock,
  Bell,
  FileText,
  Download,
  Upload,
  Trash2,
  LogOut,
 
} from "lucide-react";
import { motion } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const Settings = () => {

  const [activeTab, setActiveTab] = useState('resume');
  // Use the already initialized auth instance
  const handleLogout = async () => {
    await signOut(auth);
  };

  const tabs = [
    { id: "resume", label: "Resume", icon: <FileText className="w-5 h-5" /> },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="w-5 h-5" />,
    },
    { id: "account", label: "Account", icon: <Lock className="w-5 h-5" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <nav>
            <ul className="space-y-1">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center w-full p-3 rounded-md transition-colors duration-200 ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-blue-400"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    {tab.icon}
                    <span className="ml-3">{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="flex items-center w-full p-3 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Log Out
              </button>
            </div>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {activeTab === "resume" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Resume Management
              </h2>

              <div className="space-y-6">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Primary Resume
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Last updated: June 15, 2023
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                      <button className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200">
                        <Upload className="w-4 h-4 mr-1" />
                        Update
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Developer Resume
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Last updated: May 22, 2023
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                      <button className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "account" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Account Settings
              </h2>
              <div className="space-y-6">
                {/* Danger Zone */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-3">
                    Danger Zone
                  </h3>
                  <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md">
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      Deleting your account will permanently remove all of your
                      data, including job applications, saved jobs, and custom
                      resume data. This action cannot be undone.
                    </p>
                    <button
                      onClick={() => {
                        /* TODO: hook up delete handler */
                      }}
                      className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
