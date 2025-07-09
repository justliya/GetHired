import { useRef, useState } from 'react';
import { Upload, FileText, Loader2, ChevronDown, Trash2 } from 'lucide-react';
import type { Resume } from '../../types';

interface ResumeSelectorProps {
  userResumes: (Resume & { id: string })[];
  selectedResumeId: string;
  isUploading: boolean;
  isLoadingResumes: boolean;
  resumeInputMethod: 'manual' | 'upload' | 'saved';
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteResume?: (resumeId: string) => Promise<void>;
  isDeleting?: string | null;
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
  onDeleteResume,
  isDeleting,
  onResumeSelect,
  onLoadSampleResume
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedResume = userResumes.find(r => r.id === selectedResumeId);

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

        {/* Custom Dropdown for Saved Resumes */}
        {userResumes.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 min-w-[200px]"
            >
              <span className="truncate">
                {selectedResume 
                  ? (selectedResume.metadata?.title || selectedResume.title || 'Untitled Resume')
                  : 'Select a saved resume'}
              </span>
              <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {userResumes.map((resume) => (
                    <div
                      key={resume.id}
                      className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 group"
                    >
                      <button
                        onClick={() => {
                          onResumeSelect(resume.id);
                          setIsDropdownOpen(false);
                        }}
                        className="flex-1 text-left px-4 py-2 text-gray-700 dark:text-gray-300"
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">
                            {resume.metadata?.title || resume.title || 'Untitled Resume'}
                            {resume.metadata?.isOriginal && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Original)</span>
                            )}
                          </span>
                          {selectedResumeId === resume.id && (
                            <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                          )}
                        </div>
                        {typeof resume.metadata?.uploadedAt === 'string' && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Uploaded: {new Date(resume.metadata.uploadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </button>
                      
                      {/* Delete Button */}
                      {onDeleteResume && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteResume(resume.id);
                          }}
                          disabled={isDeleting === resume.id}
                          className="p-2 mr-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete resume"
                        >
                          {isDeleting === resume.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {userResumes.length === 0 && (
                    <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                      No saved resumes found
                    </div>
                  )}
                </div>
              </>
            )}
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
        <div className="flex items-center text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Loading your resumes...
        </div>
      )}

      {/* Resume count indicator */}
      {!isLoadingResumes && userResumes.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {userResumes.length} resume{userResumes.length !== 1 ? 's' : ''} saved
        </div>
      )}
    </div>
  );
};

export default ResumeSelector;