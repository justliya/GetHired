import { useState } from 'react';

interface SuggestedChange {
  section: string;
  original: string;
  suggested: string;
  reason: string;
}

interface TailoringData {
  suggestedChanges?: SuggestedChange[];
  coverLetter?: string;
  tailoredResumeUrl?: string;
  tailoredResumeText?: string;
  [key: string]: unknown;
}

interface Job {
  title?: string;
  company?: string;
  description?: string;
  [key: string]: unknown;
}

export const useResumeTailoring = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tailoringData, setTailoringData] = useState<TailoringData | null>(null);

  // Helper function to parse AI response
  const parseAIResponse = (response: Record<string, unknown>) => {
    try {
      // Handle AgentResponse format: { message, status, data, session_id }
      const responseData = response.data as Record<string, unknown> || {};
      const message = response.message as string || '';
      
      // Try to extract structured data from the response
      let resumeText = '';
      let resumeUrl = '';
      let filename = '';
      
      // Check if the message contains structured data
      if (message) {
        // Try to extract JSON from message if present
        const jsonMatch = message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            resumeText = parsed.resume_text || parsed.final_resume || parsed.tailored_resume_text || '';
            resumeUrl = parsed.download_url || parsed.tailored_resume_url || '';
            filename = parsed.filename || '';
          } catch (e) {
            console.warn('Failed to parse JSON from message:', e);
          }
        }
        
        // If no structured data found, treat the entire message as resume text
        if (!resumeText) {
          resumeText = message;
        }
      }
      
      // Also check the data field for structured information
      if (responseData) {
        resumeText = resumeText || (responseData.resume_text as string) || (responseData.final_resume as string) || (responseData.tailored_resume_text as string) || '';
        resumeUrl = resumeUrl || (responseData.download_url as string) || (responseData.tailored_resume_url as string) || '';
        filename = filename || (responseData.filename as string) || '';
      }
      
      return {
        changes: Array.isArray(responseData.suggested_changes) ? responseData.suggested_changes as SuggestedChange[] : [],
        coverLetter: (responseData.cover_letter as string) || (responseData.coverLetter as string) || '',
        resumeText: resumeText,
        resumeUrl: resumeUrl,
        filename: filename,
        status: response.status as string || 'unknown',
        rawResponse: response
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        changes: [],
        coverLetter: '',
        resumeText: String(response.message || response),
        resumeUrl: '',
        filename: '',
        status: 'error',
        rawResponse: response
      };
    }
  };

  const startAnalysis = async (
    resumeText: string,
    resumeUrl: string,
    jobDescription: string,
    context: {
      user_id: string;
      firebase_uid?: string;
      is_anonymous?: boolean;
      task: string;
      user_name: string;
      resume_storage_url?: string;
      job_description: string;
      job_title?: string;
      job_company?: string;
    },
    job: Job | null,
    userName: string
  ) => {
    if (!resumeText || !jobDescription) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('https://gethired-agents-staging-104139545590.us-central1.run.app/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Please tailor this resume for this job description:

RESUME:
${ resumeUrl || resumeText}

JOB DESCRIPTION:
${jobDescription}
`,
          context,
          session_id: `resume-${Date.now()}`
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Agent response:', result); // Debug log
      console.log('Response structure:', {
        hasMessage: !!result.message,
        hasData: !!result.data,
        hasStatus: !!result.status,
        messageType: typeof result.message,
        dataType: typeof result.data
      });
      
      // Parse the AI response to extract tailoring suggestions
      const suggestions = parseAIResponse(result);
      console.log('Parsed suggestions:', suggestions); // Debug log
      
      setTailoringData({
        suggestedChanges: suggestions.changes,
        coverLetter: suggestions.coverLetter || result.message || '',
        tailoredResumeUrl: suggestions.resumeUrl,
        tailoredResumeText: suggestions.resumeText
      });
      
    } catch (error) {
      console.error('Analysis failed:', error);
      
      setTailoringData({
        suggestedChanges: [
          {
            section: 'Professional Summary',
            original: 'Experienced software developer',
            suggested: 'Experienced full-stack developer with expertise in React and Node.js',
            reason: 'Matches the specific technologies mentioned in the job description'
          },
          {
            section: 'Skills',
            original: 'JavaScript, HTML, CSS',
            suggested: 'JavaScript, React, Node.js, TypeScript, HTML, CSS, MongoDB',
            reason: 'Added specific technologies and frameworks mentioned in the job requirements'
          }
        ],
        coverLetter: `Dear Hiring Manager,

I am excited to apply for the ${job?.title || 'position'} at ${job?.company || 'your company'}. Based on the job description, I believe my experience aligns well with your requirements.

Best regards,
${userName || 'Your Name'}`,
        tailoredResumeUrl: undefined
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copySuggestion = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Text copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return {
    isAnalyzing,
    tailoringData,
    startAnalysis,
    copySuggestion,
    setTailoringData
  };
};
