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
  job?: Job | null;
  onDownload?: () => void;
}

const EnhancedDocumentViewer: React.FC<EnhancedDocumentViewerProps> = ({
  documentUrl,
  job,
  onDownload
}) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [viewerFallback, setViewerFallback] = useState(0); // 0: primary, 1: fallback 1, 2: fallback 2

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

  const fileExtension = getFileExtension(documentUrl);
  const isWordDoc = ['doc', 'docx'].includes(fileExtension);
  const isPdf = fileExtension === 'pdf';

  // Try to create proxy URL for better external viewer compatibility
  useEffect(() => {
    const createProxyUrl = async () => {
      try {
        // Import proxy service dynamically to avoid circular dependencies
        const { getBestUrlForContext } = await import('../../services/fileProxyService');
        
        if (isWordDoc) {
          const bestUrl = await getBestUrlForContext(documentUrl, 'office-viewer');
          setProxyUrl(bestUrl);
        } else {
          const bestUrl = await getBestUrlForContext(documentUrl, 'google-viewer');
          setProxyUrl(bestUrl);
        }
      } catch (error) {
        console.warn('Failed to create proxy URL:', error);
        setProxyUrl(documentUrl); // Fallback to original URL
      }
    };

    createProxyUrl();
  }, [documentUrl, isWordDoc]);

  // Generate viewer URL based on document type with fallback options
  const getViewerUrl = useCallback(() => {
    const urlToUse = proxyUrl || documentUrl;
    
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
          // Primary: Direct PDF viewing
          return urlToUse;
        case 1:
          // Fallback: Google Drive viewer for PDFs
          return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(urlToUse)}`;
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
  }, [documentUrl, proxyUrl, isWordDoc, isPdf, viewerFallback]);

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
      const response = await fetch(documentUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tailored_resume_${job?.company || 'document'}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      if (onDownload) {
        onDownload();
      }
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new tab
      window.open(documentUrl, '_blank');
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
    
    // Try fallback viewers before showing error
    if (viewerFallback < 2) {
      console.log(`Primary viewer failed, trying fallback ${viewerFallback + 1}`);
      setViewerFallback(prev => prev + 1);
      setIsLoading(true);
      setError(null);
      return;
    }
    
    setError('Failed to load document. The document might not be publicly accessible or may have CORS restrictions.');
  };

  const handleTryAlternativeViewer = () => {
    setViewerFallback(prev => (prev + 1) % 3);
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
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Open
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
                  href={documentUrl}
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
