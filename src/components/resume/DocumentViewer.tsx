import { FileText, Copy, Download } from 'lucide-react';

interface Job {
  title?: string;
  company?: string;
  description?: string;
  [key: string]: unknown;
}

interface DocumentViewerProps {
  resumeText: string;
  resumeUrl?: string;
  job?: Job | null;
  onCopyText: (text: string) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  resumeText,
  resumeUrl,
  job,
  onCopyText
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Tailored Resume Document
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCopyText(resumeText)}
            className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-md flex items-center text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            <Copy className="w-4 h-4 mr-1" /> Copy Text
          </button>
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-md flex items-center text-sm hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            >
              <Download className="w-4 h-4 mr-1" /> Download DOCX
            </a>
          )}
        </div>
      </div>
      
      {/* Document View - Styled like a real document */}
      <div className="bg-gray-100 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg">
          {/* Document Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                <FileText className="w-4 h-4 mr-1" />
                Tailored Resume - {job?.title || 'Position'} at {job?.company || 'Company'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Generated {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
          
          {/* Document Content */}
          <div 
            className="p-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[600px] max-h-[800px] overflow-y-auto"
            style={{ 
              fontFamily: '"Times New Roman", serif',
              lineHeight: '1.5',
              fontSize: '14px'
            }}
          >
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap break-words font-serif text-gray-900 dark:text-gray-100">
                {resumeText}
              </pre>
            </div>
          </div>
          
          {/* Document Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Tailored by GetHired AI Agent</span>
              <span>{resumeText?.split('\n').length || 0} lines</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
