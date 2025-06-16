interface TailoringData {
  tailoredResumeText?: string;
  tailoredResumeUrl?: string;
  [key: string]: unknown;
}

interface DebugPanelProps {
  tailoringData: TailoringData;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ tailoringData }) => {
  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
      <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Debug Info:</h4>
      <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
        <div>Has Resume Text: {tailoringData.tailoredResumeText ? '✅' : '❌'}</div>
        <div>Has Resume URL: {tailoringData.tailoredResumeUrl ? '✅' : '❌'}</div>
        <div>Resume URL: {tailoringData.tailoredResumeUrl || 'None'}</div>
        <div>Text Length: {tailoringData.tailoredResumeText?.length || 0} characters</div>
      </div>
    </div>
  );
};

export default DebugPanel;
