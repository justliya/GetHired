
import { useState } from 'react';
import { getApiUrl } from '../config/environment';
import type { ResumeTailoringContext } from '../types';

// Commented out for now - will be used when implementing suggested changes feature
// interface SuggestedChange {
//   section: string;
//   original: string;
//   suggested: string;
//   reason: string;
// }

interface TailoringData {
  // suggestedChanges?: SuggestedChange[]; // Commented out for now
  // coverLetter?: string; // Commented out for now
  publicUrl?: string;      // For saving to Firebase
  signedUrl?: string;       // For immediate download
  tailoredResumeText?: string;
  resumeText?:string;
  filename?: string;
  status?: string;
}

export const useResumeTailoring = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tailoringData, setTailoringData] = useState<TailoringData | null>(null);

  // Helper function to parse AI response
  const parseAIResponse = (response: Record<string, unknown>) => {
    console.log('🔍 Parsing AI response:', response);
    
    try {
      // The response structure from backend should be:
      // {
      //   "status": "success",
      //   "message": "Resume tailored successfully",
      //   "tailored_resume": formatted_resume,
      //   "document_url": document_url,
      //   "session_id": session_id
      // }
      
      // But we're also expecting the doc object with the full details
      const doc = (response.content || response.doc || {}) as Record<string, unknown>;

      // Only use values from doc/content, not root response
      const resumeText = (doc.resume_text as string) || '';
      const publicUrl = (doc.public_url as string) || '';
      const signedUrl = (doc.signed_url as string) || '';
      const filename = (doc.filename as string) || '';
      const status = (doc.status as string) || 'unknown';
      
      // Validate URLs - reject URLs with literal "user_id"
      const isValidUrl = (url: string) => url && !url.includes('user_id');
      
      console.log('🎯 Extracted data:', {
        publicUrl: isValidUrl(publicUrl) ? publicUrl : 'Invalid URL',
        signedUrl: isValidUrl(signedUrl) ? signedUrl : 'Invalid URL',
        resumeTextLength: resumeText.length,
        filename,
        status
      });
      
      return {
        // changes: [], // Commented out for now
        // coverLetter: '', // Commented out for now
        resumeText: resumeText,
        publicUrl: isValidUrl(publicUrl) ? publicUrl : '',
        signedUrl: isValidUrl(signedUrl) ? signedUrl : '',
        filename: filename,
        status: status,
        rawResponse: response
      };
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      return {
        // changes: [], // Commented out for now
        // coverLetter: '', // Commented out for now
        resumeText: '',
        publicUrl: '',
        signedUrl: '',
        filename: '',
        status: 'error',
        rawResponse: response
      };
    }
  };
const startAnalysis = async (
  resumeText: string,
  resume_storage_url: string,
  jobDescription: string,
  context: ResumeTailoringContext,
) => {
  if (!resumeText || !jobDescription) return;

  setIsAnalyzing(true);
  try {
    // Use the public URL in the message
    const messageContent = resume_storage_url 
      ? `Please tailor this resume for this job description:

RESUME URL: ${resume_storage_url}

JOB DESCRIPTION:
${jobDescription}

`
      : `Please tailor this resume for this job description:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;

    const response = await fetch(`${getApiUrl(true)}/tailor-resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: messageContent,
        context: {
          ...context,
          resume_url: resume_storage_url, // Include the public URL in context too
        },
        session_id: `resume-${Date.now()}`
      }),
    });

    // ... r

      const result = await response.json();
      console.log('🚀 Resume tailoring response received:', result);
      
      // Parse the AI response to extract tailoring data
      const parsedData = parseAIResponse(result);
      console.log('💡 Parsed tailoring data:', parsedData);
      
      const newTailoringData: TailoringData = {
        // suggestedChanges: parsedData.changes, // Commented out for now
        // coverLetter: parsedData.coverLetter, // Commented out for now
        publicUrl: parsedData.publicUrl,
        signedUrl: parsedData.signedUrl,
        tailoredResumeText: parsedData.resumeText,
        filename: parsedData.filename,
        status: parsedData.status
      };
      
      console.log('📋 Setting tailoring data:', newTailoringData);
      
      // Warn if URLs contain literal "user_id"
      if (newTailoringData.publicUrl?.includes('user_id')) {
        console.error('❌ CRITICAL: publicUrl contains literal "user_id" - Backend did not replace with actual user_id');
      }
      if (newTailoringData.signedUrl?.includes('user_id')) {
        console.error('❌ CRITICAL: signedUrl contains literal "user_id" - Backend did not replace with actual user_id');
      }
      
      setTailoringData(newTailoringData);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Set error state with fallback data
      setTailoringData({
        // suggestedChanges: [ // Commented out for now
        //   {
        //     section: 'Professional Summary',
        //     original: 'Experienced software developer',
        //     suggested: 'Experienced full-stack developer with expertise in React and Node.js',
        //     reason: 'Matches the specific technologies mentioned in the job description'
        //   },
        //   {
        //     section: 'Skills',
        //     original: 'JavaScript, HTML, CSS',
        //     suggested: 'JavaScript, React, Node.js, TypeScript, HTML, CSS, MongoDB',
        //     reason: 'Added specific technologies and frameworks mentioned in the job requirements'
        //   }
        // ],
        // coverLetter: `Dear Hiring Manager,
        //
        // I am excited to apply for the ${job?.title || 'position'} at ${job?.company || 'your company'}. Based on the job description, I believe my experience aligns well with your requirements.
        //
        // Best regards,
        // ${userName || 'Your Name'}`,
        status: 'error',
        tailoredResumeText: 'Error occurred while tailoring resume. Please try again.'
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