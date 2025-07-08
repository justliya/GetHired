import { useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import type { Resume } from '../../types';

interface ResumeSelectorProps {
  userResumes: (Resume & { id: string })[];
  selectedResumeId: string;
  isUploading: boolean;
  isLoadingResumes: boolean;
  resumeInputMethod: 'manual' | 'upload' | 'saved';
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onResumeSelect: (resumeId: string) => void;
  onLoadSampleResume: () => void;
}

const ResumeSelector: React.FC<ResumeSelectorProps> = ({
  userResumes,
  selectedResumeId,
  isUploading,
  isLoadingResumes,
  resumeInputMethod,
  onFileUpload,
  onResumeSelect,
  onLoadSampleResume
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Select Your Resume
        </h2>
        {resumeInputMethod !== 'manual' && (
          <div className="flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-green-700 dark:text-green-300">
              {resumeInputMethod === 'upload' ? 'File Uploaded' : 'Resume Loaded'}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Upload Resume Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          Upload Resume
        </button>

        {/* Use Saved Resume Dropdown */}
        {userResumes.length > 0 && (
          <div className="relative">
            <select
              value={selectedResumeId}
              onChange={(e) => onResumeSelect(e.target.value)}
              className="px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <option value="">Select a saved resume</option>
              {userResumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.metadata?.title || 'Untitled Resume'} 
                  {resume.metadata?.isOriginal && ' (Original)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sample Resume Button */}
        <button
          onClick={onLoadSampleResume}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          <FileText className="w-4 h-4 mr-2" />
          Load Sample Resume
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={onFileUpload}
        className="hidden"
      />

      {isLoadingResumes && (
        <div className="text-gray-500 dark:text-gray-400">Loading your resumes...</div>
      )}
    </div>
  );
};

export default ResumeSelector;
