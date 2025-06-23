import { useState } from 'react';
import { getApiUrl } from '../config/environment';

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
  authenticatedUrl?: string;
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
    console.log('🔍 Parsing AI response:', response);
    
    try {
      // Handle AgentResponse format: { message, status, data, session_id }
      const responseData = response.data as Record<string, unknown> || {};
      const message = response.message as string || '';
      
      console.log('📝 Response data:', responseData);
      console.log('💬 Response message:', message);
      
      // Try to extract structured data from the response
      let resumeText = '';
      let resumeUrl = '';
      let authenticatedUrl = '';
      let filename = '';
      
      // Check if the message contains structured data
      if (message) {
        console.log('🔎 Searching for JSON in message...');
        // Try to extract JSON from message if present
        const jsonMatch = message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('📄 Found JSON in message:', jsonMatch[0]);
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ Parsed JSON:', parsed);
            resumeText = parsed.resume_text || parsed.final_resume || parsed.tailored_resume_text || '';
            resumeUrl = parsed.document_url || parsed.download_url || parsed.resume_url || parsed.public_url || '';
            authenticatedUrl = parsed.authenticated_url || parsed.gcs_url || '';
            filename = parsed.filename || '';
            
            // Validate URLs - reject URLs with literal "user_id"
            if (resumeUrl && resumeUrl.includes('user_id')) {
              console.warn('❌ Invalid resumeUrl contains literal "user_id":', resumeUrl);
              resumeUrl = '';
            }
            if (authenticatedUrl && authenticatedUrl.includes('user_id')) {
              console.warn('❌ Invalid authenticatedUrl contains literal "user_id":', authenticatedUrl);
              authenticatedUrl = '';
            }
            
            console.log('🎯 Extracted from JSON - Public URL:', resumeUrl, 'Authenticated URL:', authenticatedUrl, 'Text length:', resumeText.length, 'Filename:', filename);
          } catch (e) {
            console.warn('❌ Failed to parse JSON from message:', e);
          }
        } else {
          console.log('🔍 No JSON found in message, checking for direct URL patterns...');
          // Look for URLs in the message
          const urlPattern = /https?:\/\/[^\s]+/g;
          const urls = message.match(urlPattern);
          if (urls && urls.length > 0) {
            console.log('🔗 Found URLs in message:', urls);
            // Use the first URL that looks like a document
            resumeUrl = urls.find(url => 
              url.includes('storage.googleapis') || 
              url.includes('firebase') || 
              url.includes('.docx') || 
              url.includes('.pdf')
            ) || urls[0];
            console.log('📎 Selected URL:', resumeUrl);
          }
        }
        
        // If no structured data found, treat the entire message as resume text
        if (!resumeText) {
          resumeText = message;
          console.log('📄 Using entire message as resume text, length:', resumeText.length);
        }
      }
      
      // Also check the data field for structured information
      if (responseData) {
        console.log('🔍 Checking responseData for additional fields...');
        const originalResumeText = resumeText;
        const originalResumeUrl = resumeUrl;
        const originalAuthenticatedUrl = authenticatedUrl;
        const originalFilename = filename;
        
        resumeText = resumeText || (responseData.resume_text as string) || (responseData.final_resume as string) || (responseData.tailored_resume_text as string) || '';
        resumeUrl = resumeUrl || (responseData.document_url as string) || (responseData.download_url as string) || (responseData.tailored_resume_url as string) || (responseData.public_url as string) || '';
        authenticatedUrl = authenticatedUrl || (responseData.authenticated_url as string) || (responseData.signed_url as string) || (responseData.gcs_url as string) || '';
        filename = filename || (responseData.filename as string) || '';
        
        if (resumeText !== originalResumeText || resumeUrl !== originalResumeUrl || authenticatedUrl !== originalAuthenticatedUrl || filename !== originalFilename) {
          console.log('🔄 Updated from responseData - URL:', resumeUrl, 'Authenticated URL:', authenticatedUrl, 'Text length:', resumeText.length, 'Filename:', filename);
        }
      }
      
      console.log('🎯 Final extraction results:', {
        resumeUrl,
        authenticatedUrl,
        resumeTextLength: resumeText.length,
        filename,
        hasChanges: Array.isArray(responseData.suggested_changes),
        changesCount: Array.isArray(responseData.suggested_changes) ? responseData.suggested_changes.length : 0
      });
      
      return {
        changes: Array.isArray(responseData.suggested_changes) ? responseData.suggested_changes as SuggestedChange[] : [],
        coverLetter: (responseData.cover_letter as string) || (responseData.coverLetter as string) || '',
        resumeText: resumeText,
        resumeUrl: resumeUrl,
        authenticatedUrl: authenticatedUrl,
        filename: filename,
        status: response.status as string || 'unknown',
        rawResponse: response
      };
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      return {
        changes: [],
        coverLetter: '',
        resumeText: String(response.message || response),
        resumeUrl: '',
        authenticatedUrl: '',
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
      const response = await fetch(`${getApiUrl(true)}/run`, {
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
      console.log('🚀 Agent response received:', result);
      console.log('📊 Response structure:', {
        hasMessage: !!result.message,
        hasData: !!result.data,
        hasStatus: !!result.status,
        messageType: typeof result.message,
        dataType: typeof result.data,
        messageLength: result.message ? result.message.length : 0
      });
      
      // Parse the AI response to extract tailoring suggestions
      const suggestions = parseAIResponse(result);
      console.log('💡 Parsed suggestions:', suggestions);
      
      const newTailoringData = {
        suggestedChanges: suggestions.changes,
        coverLetter: suggestions.coverLetter || result.message || '',
        tailoredResumeUrl: suggestions.resumeUrl,
        authenticatedUrl: suggestions.authenticatedUrl,
        tailoredResumeText: suggestions.resumeText
      };
      
      console.log('📋 Setting tailoring data:', newTailoringData);
      console.log('🔗 Resume URL being set:', newTailoringData.tailoredResumeUrl);
      console.log('🔐 Authenticated URL being set:', newTailoringData.authenticatedUrl);
      
      // Warn if URLs contain literal "user_id"
      if (newTailoringData.tailoredResumeUrl?.includes('user_id')) {
        console.error('❌ CRITICAL: tailoredResumeUrl contains literal "user_id" - LLM did not extract real user_id from context');
      }
      if (newTailoringData.authenticatedUrl?.includes('user_id')) {
        console.error('❌ CRITICAL: authenticatedUrl contains literal "user_id" - LLM did not extract real user_id from context');
      }
      
      setTailoringData(newTailoringData);
      
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
        tailoredResumeUrl: undefined,
        authenticatedUrl: undefined
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
