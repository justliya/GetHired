import React, { useState, useCallback, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  ExternalLink,
  RefreshCw,
  Copy
} from 'lucide-react';

interface Job {
  title?: string;
  company?: string;
  description?: string;
  [key: string]: unknown;
}

interface UnifiedDocumentViewerProps {
  resumeText?: string;
  documentUrl?: string;
  authenticatedUrl?: string;
  job?: Job | null;
  onCopyText?: (text: string) => void;
  onDownload?: () => void;
}

const UnifiedDocumentViewer: React.FC<UnifiedDocumentViewerProps> = ({
  resumeText,
  documentUrl,
  authenticatedUrl,
  job,
  onCopyText,
  onDownload
}) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerFallback, setViewerFallback] = useState(0);
  const [urlFallback, setUrlFallback] = useState(0);

  // If we only have a URL, show enhanced viewer
  const currentUrl = urlFallback === 0 ? documentUrl : authenticatedUrl;

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

  const handleUrlFallback = useCallback(() => {
    if (urlFallback === 0 && authenticatedUrl) {
      setUrlFallback(1);
      setError(null);
      setIsLoading(true);
      setViewerFallback(0);
    } else {
      setError('No alternative URLs available');
    }
  }, [urlFallback, authenticatedUrl]);

  const handleViewerFallback = useCallback(() => {
    setViewerFallback(prev => {
      const next = prev + 1;
      if (next > 2) {
        handleUrlFallback();
        return 0;
      }
      setError(null);
      setIsLoading(true);
      return next;
    });
  }, [handleUrlFallback]);

  const getViewerUrl = useCallback((url: string) => {
    const fileExtension = getFileExtension(url);
    
    switch (viewerFallback) {
      case 0:
        if (fileExtension === 'pdf') {
          return url;
        } else {
          return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
        }
      case 1:
        return `https://drive.google.com/viewerng/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      case 2:
        if (fileExtension === 'pdf') {
          return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(url)}`;
        } else {
          return url;
        }
      default:
        return url;
    }
  }, [viewerFallback]);

  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload();
      return;
    }
    
    if (currentUrl) {
      window.open(currentUrl, '_blank');
    }
  }, [currentUrl, onDownload]);

  useEffect(() => {
    if (currentUrl) {
      setError(null);
      setIsLoading(true);
    }
  }, [currentUrl, viewerFallback]);

  // If we have resume text, show text viewer
  if (resumeText) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Tailored Resume Document
            </h3>
          </div>
          <div className="flex gap-2">
            {onCopyText && (
              <button
                onClick={() => onCopyText(resumeText)}
                className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-md flex items-center text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <Copy className="w-4 h-4 mr-1" /> Copy Text
              </button>
            )}
            {(documentUrl || authenticatedUrl) && (
              <>
                <a
                  href={documentUrl || authenticatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-md flex items-center text-sm hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" /> Download DOCX
                </a>
                <a
                  href={documentUrl || authenticatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-md flex items-center text-sm hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-1" /> Preview
                </a>
              </>
            )}
          </div>
        </div>
        
        {/* Document View - Styled like a real document */}
        <div className="bg-gray-100 dark:bg-gray-900 p-8">
          <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg">
            {/* Document Header */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  Tailored Resume - {job?.title || 'Position'} at {job?.company || 'Company'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  Generated {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
            
            {/* Document Content */}
            <div 
              className="p-8 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[600px] max-h-[800px] overflow-y-auto"
              style={{ 
                fontFamily: '"Times New Roman", serif',
                lineHeight: '1.5',
                fontSize: '14px'
              }}
            >
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap break-words font-serif text-gray-900 dark:text-gray-100">
                  {resumeText}
                </pre>
              </div>
            </div>
            
            {/* Document Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Tailored by GetHired AI Agent</span>
                <span>{resumeText?.split('\n').length || 0} lines</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUrl) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No document available to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Toolbar */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-gray-900 dark:text-white">
            {job?.title || 'Resume Document'} - {job?.company || 'Document Viewer'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* URL Fallback Indicator */}
          {urlFallback > 0 && (
            <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 px-2 py-1 rounded">
              Using Fallback URL
            </span>
          )}
          
          {/* Viewer Fallback Indicator */}
          {viewerFallback > 0 && (
            <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded">
              Viewer {viewerFallback + 1}/3
            </span>
          )}
          
          {/* Zoom Controls */}
          <button
            onClick={() => setZoom(Math.max(50, zoom - 25))}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[3rem] text-center">
            {zoom}%
          </span>
          
          <button
            onClick={() => setZoom(Math.min(200, zoom + 25))}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          {/* Rotation Control */}
          <button
            onClick={() => setRotation((rotation + 90) % 360)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          
          {/* Retry Button */}
          {error && (
            <button
              onClick={handleViewerFallback}
              className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded"
              title="Try Alternative Viewer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          
          {/* Download Button */}
          <button
            onClick={handleDownload}
            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
            title="Download Document"
          >
            <Download className="w-4 h-4" />
          </button>
          
          {/* External Link */}
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          
          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="relative" style={{ height: isFullscreen ? 'calc(100vh - 64px)' : '600px' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center p-8">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Unable to Load Document
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error}
              </p>
              <div className="space-x-2">
                <button
                  onClick={handleViewerFallback}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Try Alternative Viewer
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Download Instead
                </button>
              </div>
            </div>
          </div>
        )}
        
        <iframe
          src={getViewerUrl(currentUrl)}
          className="w-full h-full border-0"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError(`Failed to load document with viewer ${viewerFallback + 1}`);
          }}
          title="Document Viewer"
        />
      </div>
    </div>
  );
};

export default UnifiedDocumentViewer;
