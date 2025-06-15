// components/JobFilters.tsx
import { Search } from "lucide-react";

type Props = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
};

const JobFilters = ({ searchQuery, onSearchChange, onClear }: Props) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search jobs by title or company..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-blue-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default JobFilters;