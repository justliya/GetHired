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
    <div>
      <div className="flex items-center justify-between mb-2">
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
        className={`w-full p-3 border rounded-md h-64 resize-none dark:bg-gray-700 dark:text-white ${
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
