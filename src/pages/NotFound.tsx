import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
      <AlertTriangle className="w-16 h-16 text-red-500 dark:text-red-400 mb-4" />
      <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">404 - Page Not Found</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all duration-200"
      >
        Go Back Dashboard
      </button>
    </div>
  );
};

export default PageNotFound;