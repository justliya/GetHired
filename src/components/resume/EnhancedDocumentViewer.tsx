import React, { useState, useCallback, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface Job {
  title?: string;
  company?: string;
  description?: string;
  [key: string]: unknown;
}

interface EnhancedDocumentViewerProps {
  documentUrl: string;
  authenticatedUrl?: string;
  job?: Job | null;
  onDownload?: () => void;
}

const EnhancedDocumentViewer: React.FC<EnhancedDocumentViewerProps> = ({
  documentUrl,
  authenticatedUrl,
  job,
  onDownload
}) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerFallback, setViewerFallback] = useState(0); // 0: primary, 1: fallback 1, 2: fallback 2
  const [urlFallback, setUrlFallback] = useState(0); // 0: primary URL, 1: authenticated URL
  const [corsFixedUrl, setCorsFixedUrl] = useState<string | null>(null);

  // Get file extension to determine document type
  const getFileExtension = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const extension = pathname.split('.').pop()?.toLowerCase() || '';
      return extension;
    } catch {
      return '';
    }
  };

  // Get the current URL to use (fallback between primary and authenticated)
  const getCurrentUrl = useCallback(() => {
    if (urlFallback === 0) {
      return documentUrl;
    } else if (urlFallback === 1 && authenticatedUrl) {
      return authenticatedUrl;
    }
    return documentUrl;
  }, [documentUrl, authenticatedUrl, urlFallback]);

  const currentUrl = getCurrentUrl();
  const fileExtension = getFileExtension(currentUrl);

  // Check if URL is a data URL (base64) - these don't have CORS issues
  const isDataUrl = currentUrl.startsWith('data:');

  // Convert Firebase Storage URL to direct GCS URL for better CORS compatibility
  const createCorsFixedUrl = useCallback((url: string): string => {
    try {
      // If it's already a data URL, return as-is
      if (url.startsWith('data:')) {
        return url;
      }

      // If it's a Firebase Storage URL, convert to direct GCS URL
      if (url.includes('firebasestorage.googleapis.com')) {
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/v0\/b\/(.+?)\/o\/(.+)/);
        if (pathMatch) {
          const [, bucket, encodedPath] = pathMatch;
          const decodedPath = decodeURIComponent(encodedPath);
          return `https://storage.googleapis.com/${bucket}/${decodedPath}`;
        }
      }

      // If it's already a direct GCS URL, return as-is
      if (url.includes('storage.googleapis.com')) {
        return url;
      }

      return url;
    } catch (error) {
      console.error('Failed to create CORS-fixed URL:', error);
      return url;
    }
  }, []);

  // Update CORS-fixed URL when document URL changes
  useEffect(() => {
    const fixedUrl = createCorsFixedUrl(currentUrl);
    setCorsFixedUrl(fixedUrl);
    console.log('🔗 Original URL:', currentUrl);
    console.log('🔧 CORS-fixed URL:', fixedUrl);
  }, [currentUrl, createCorsFixedUrl]);
  
  const isWordDoc = ['doc', 'docx'].includes(fileExtension);
  const isPdf = fileExtension === 'pdf';

  // Generate viewer URL based on document type with fallback options
  const getViewerUrl = useCallback(() => {
    const urlToUse = corsFixedUrl || currentUrl;
    
    // If it's a data URL, return directly (no external viewer needed)
    if (isDataUrl) {
      return urlToUse;
    }
    
    if (isWordDoc) {
      switch (viewerFallback) {
        case 0:
          // Primary: Microsoft Office Online viewer
          return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlToUse)}`;
        case 1:
          // Fallback 1: Google Drive viewer
          return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(urlToUse)}`;
        case 2:
          // Fallback 2: Direct download link
          return urlToUse;
        default:
          return urlToUse;
      }
    } else if (isPdf) {
      switch (viewerFallback) {
        case 0:
          // Primary: Direct PDF viewing with embedded PDF viewer
          return `${urlToUse}#toolbar=0&navpanes=0&scrollbar=0`;
        case 1:
          // Fallback: Google Drive viewer for PDFs
          return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(urlToUse)}`;
        case 2:
          // Fallback 2: Mozilla PDF.js viewer
          return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(urlToUse)}`;
        default:
          return urlToUse;
      }
    } else {
      switch (viewerFallback) {
        case 0:
          // Primary: Google Drive viewer
          return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(urlToUse)}`;
        case 1:
          // Fallback: Microsoft Office Online (for other office docs)
          return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(urlToUse)}`;
        case 2:
          // Fallback 2: Direct link
          return urlToUse;
        default:
          return urlToUse;
      }
    }
  }, [corsFixedUrl, currentUrl, isWordDoc, isPdf, viewerFallback, isDataUrl]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = async () => {
    try {
      const urlToDownload = corsFixedUrl || currentUrl;
      
      // Handle data URLs differently
      if (isDataUrl) {
        const link = document.createElement('a');
        link.href = urlToDownload;
        link.download = `tailored_resume_${job?.company || 'document'}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For regular URLs, create download link
        const link = document.createElement('a');
        link.href = urlToDownload;
        link.download = `tailored_resume_${job?.company || 'document'}.${fileExtension}`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      if (onDownload) {
        onDownload();
      }
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new tab
      window.open(corsFixedUrl || currentUrl, '_blank');
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    // Force iframe reload by updating the src
    const iframe = document.querySelector('.document-viewer-iframe') as HTMLIFrameElement;
    if (iframe) {
      // Force iframe reload by changing the src
      const originalSrc = iframe.src;
      iframe.src = 'about:blank';
      setTimeout(() => {
        iframe.src = originalSrc;
      }, 100);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    
    // First try alternative URL if available
    if (urlFallback === 0 && authenticatedUrl) {
      console.log('Primary URL failed, trying authenticated URL');
      setUrlFallback(1);
      setIsLoading(true);
      setError(null);
      return;
    }
    
    // Then try fallback viewers before showing error
    if (viewerFallback < 2) {
      console.log(`Viewer failed, trying fallback ${viewerFallback + 1}`);
      setViewerFallback(prev => prev + 1);
      setUrlFallback(0); // Reset URL fallback when trying new viewer
      setIsLoading(true);
      setError(null);
      return;
    }
    
    setError('Document preview unavailable. You can still download or open the document in a new tab.');
  };

  const handleTryAlternativeViewer = () => {
    if (viewerFallback < 2) {
      setViewerFallback(prev => prev + 1);
    } else {
      setViewerFallback(0);
    }
    setUrlFallback(0); // Reset URL fallback when trying new viewer
    setIsLoading(true);
    setError(null);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-50' : ''
    }`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Tailored Resume Document
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {job?.title && job?.company ? `${job.title} at ${job.company}` : 'Resume Document'}
            </p>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-600 rounded-md border border-gray-300 dark:border-gray-500">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-3 py-2 text-sm font-medium min-w-[60px] text-center border-x border-gray-300 dark:border-gray-500">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 300}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Other controls */}
          <button
            onClick={handleRotate}
            className="p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
            title="Rotate Document"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleRefresh}
            className="p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
            title="Refresh Document"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleFullscreen}
            className="p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            title="Download Document"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </button>

          <a
            href={corsFixedUrl || currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Preview
          </a>

          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Document viewer area */}
      <div className={`relative bg-gray-100 dark:bg-gray-900 ${
        isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[600px]'
      }`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-75">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-600 dark:text-gray-400">Loading document...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center p-6">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Document Preview Unavailable
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error}
              </p>
              {authenticatedUrl && urlFallback === 0 && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                  Trying authenticated URL fallback...
                </p>
              )}
              <div className="space-x-2">
                <button
                  onClick={handleTryAlternativeViewer}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Alternative Viewer
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Document
                </button>
                <a
                  href={corsFixedUrl || currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Render different viewer based on URL type */}
        {isDataUrl ? (
          // For data URLs, embed directly or show download option
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Document Ready for Download
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This document is stored as secure data. Click download to view it.
              </p>
              <div className="space-x-2">
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download & View
                </button>
                <a
                  href={getViewerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View in New Tab
                </a>
              </div>
            </div>
          </div>
        ) : (
          <iframe
            src={getViewerUrl()}
            className={`document-viewer-iframe w-full h-full border-0 transition-transform ${
              error ? 'hidden' : ''
            }`}
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title="Document Viewer"
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        )}
      </div>

      {/* Footer with document info */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Document type: {fileExtension.toUpperCase()} • 
            Generated: {new Date().toLocaleDateString()}
          </span>
          <span>
            Zoom: {zoom}% • Rotation: {rotation}°
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDocumentViewer;
