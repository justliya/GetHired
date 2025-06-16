import { Download, ExternalLink } from 'lucide-react';

interface DownloadBannerProps {
  resumeUrl: string;
}

const DownloadBanner: React.FC<DownloadBannerProps> = ({ resumeUrl }) => {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Download className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
          <span className="font-medium text-green-800 dark:text-green-200">
            Your tailored resume document is ready!
          </span>
        </div>
        <div className="flex gap-2">
          <a
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Download DOCX
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
          <button
            onClick={() => window.open(resumeUrl, '_blank')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadBanner;
