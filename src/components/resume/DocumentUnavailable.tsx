import { Download } from 'lucide-react';

interface DocumentUnavailableProps {
  resumeUrl: string;
}

const DocumentUnavailable: React.FC<DocumentUnavailableProps> = ({ resumeUrl }) => {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-blue-800 dark:text-blue-200">Document Available</h4>
          <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
            Your tailored resume has been created and is available for download. 
            The document text preview is not available, but you can download and view the formatted document.
          </p>
        </div>
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-4 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          View Document
        </a>
      </div>
    </div>
  );
};

export default DocumentUnavailable;
