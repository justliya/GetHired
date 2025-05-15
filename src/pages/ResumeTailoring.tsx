import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, ArrowRight, RefreshCw, Briefcase} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const ResumeTailoring: React.FC = () => {
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<null | {
    matchScore: number;
    missingKeywords: string[];
    suggestedImprovements: string[];
  }>(null);

  const handleUploadResume = () => {
    setTimeout(() => {
      setResumeUploaded(true);
    }, 1000);
  };

  const handleAnalyzeResume = () => {
    if (!jobDescription.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      setAnalysisResult({
        matchScore: 65,
        missingKeywords: ['DevOps', 'Docker', 'CI/CD', 'AWS'],
        suggestedImprovements: [
          'Add more specific achievements with metrics',
          'Include experience with AWS cloud services',
          'Highlight CI/CD pipeline management',
          'Emphasize Docker containerization experience'
        ]
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Upload Your Resume" icon={<FileText size={18} />}>
          <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            {!resumeUploaded ? (
              <>
                <Upload size={36} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-4">Upload your current resume (PDF or DOCX)</p>
                <Button 
                  variant="primary" 
                  onClick={handleUploadResume}
                >
                  Select File
                </Button>
              </>
            ) : (
              <>
                <CheckCircle size={36} className="text-success-500 mb-2" />
                <p className="text-sm text-gray-600 mb-2">resume.pdf uploaded successfully</p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Replace
                  </Button>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card title="Job Description" icon={<Briefcase size={18} />}>
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 min-h-[200px] focus:ring-primary-500 focus:border-primary-500"
            placeholder="Paste the job description here to analyze against your resume..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          ></textarea>
          <Button
            variant="primary"
            className="mt-4 w-full"
            disabled={!resumeUploaded || !jobDescription || isAnalyzing}
            onClick={handleAnalyzeResume}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={18} className="mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Match'
            )}
          </Button>
        </Card>
      </div>

      {analysisResult && (
        <Card title="Analysis Results" className="animate-slide-up">
          <div className="flex items-center mb-4">
            <div className="w-24 h-24 rounded-full flex items-center justify-center bg-primary-50 border-4 border-primary-100">
              <span className="text-2xl font-bold text-primary-600">{analysisResult.matchScore}%</span>
            </div>
            <div className="ml-6">
              <h3 className="text-lg font-medium text-gray-800">Resume Match Score</h3>
              <p className="text-gray-600">Your resume matches {analysisResult.matchScore}% of job requirements</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Missing Keywords</h4>
              <ul className="space-y-1">
                {analysisResult.missingKeywords.map((keyword, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <ArrowRight size={14} className="mr-2 text-primary-500" />
                    {keyword}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Suggested Improvements</h4>
              <ul className="space-y-2">
                {analysisResult.suggestedImprovements.map((suggestion, index) => (
                  <li key={index} className="flex items-start text-gray-600">
                    <CheckCircle size={16} className="mr-2 text-secondary-500 flex-shrink-0 mt-0.5" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <Button variant="outline">Save Analysis</Button>
            <Button variant="primary">Generate Optimized Resume</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResumeTailoring;

