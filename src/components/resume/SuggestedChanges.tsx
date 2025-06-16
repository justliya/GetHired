import { Edit, Copy } from 'lucide-react';

interface SuggestedChange {
  section: string;
  original: string;
  suggested: string;
  reason: string;
}

interface SuggestedChangesProps {
  changes: SuggestedChange[];
  onCopyText: (text: string) => void;
}

const SuggestedChanges: React.FC<SuggestedChangesProps> = ({ changes, onCopyText }) => {
  if (!changes || changes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Suggested Resume Changes
      </h3>
      {changes.map((change: SuggestedChange, index: number) => (
        <div key={index} className="border rounded-lg overflow-hidden">
          <div className="p-3 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center">
              <Edit className="w-5 h-5 mr-2" />
              <h4 className="font-medium text-gray-900 dark:text-white">{change.section}</h4>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
              <div className="text-sm font-medium text-gray-500 mb-2">Original</div>
              <div className="text-gray-700 dark:text-gray-300">{change.original}</div>
            </div>
            <div className="relative bg-blue-50 dark:bg-blue-900 p-3 rounded-md">
              <div className="text-sm font-medium text-blue-600 mb-2">Suggested</div>
              <div className="text-gray-700 dark:text-gray-300">{change.suggested}</div>
              <button
                onClick={() => onCopyText(change.suggested)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md mx-4 mb-4">
            <div className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
              Why this change?
            </div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">{change.reason}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SuggestedChanges;
