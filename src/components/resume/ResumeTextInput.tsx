interface ResumeTextInputProps {
  resumeText: string;
  resumeInputMethod: 'manual' | 'upload' | 'saved';
  onResumeTextChange: (value: string) => void;
  onSwitchToManual: () => void;
}

const ResumeTextInput: React.FC<ResumeTextInputProps> = ({
  resumeText,
  resumeInputMethod,
  onResumeTextChange,
  onSwitchToManual
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Resume Text
        </label>
        {resumeInputMethod !== 'manual' && (
          <button
            onClick={onSwitchToManual}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Switch to manual input
          </button>
        )}
      </div>
      <textarea
        value={resumeText}
        onChange={(e) => onResumeTextChange(e.target.value)}
        disabled={resumeInputMethod !== 'manual'}
        className={`w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg h-64 resize-none bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-colors ${
          resumeInputMethod !== 'manual' 
            ? 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 cursor-not-allowed' 
            : ''
        }`}
        placeholder={
          resumeInputMethod === 'manual' 
            ? "Paste your current resume text here or upload a file above..."
            : "Resume loaded from file. Use 'Switch to manual input' to edit manually."
        }
      />
    </div>
  );
};

export default ResumeTextInput;
