import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  FileText,
  Image as ImageIcon,
  Calendar,
  Layers,
  BookOpen,
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react';
import './NotePreviewModal.css';

export const NotePreviewModal = ({ file, isOpen, onClose, onDownload, getPreviewUrl, onOpenAiAssistant }) => {
  const [activeUrl, setActiveUrl] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isOpen || !file) {
      setActiveUrl('');
      setZoomLevel(1);
      setRotation(0);
      setIsFullscreen(false);
      setLoadError(false);
      return;
    }

    setLoading(true);
    setLoadError(false);

    let isMounted = true;
    const fetchUrl = async () => {
      try {
        if (getPreviewUrl) {
          const url = await getPreviewUrl(file);
          if (isMounted) {
            setActiveUrl(url || file.previewUrl || '');
            setLoading(false);
          }
        } else {
          setActiveUrl(file.previewUrl || '');
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Preview URL fetch notice:', err.message);
          setActiveUrl(file.previewUrl || '');
          setLoading(false);
        }
      }
    };

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [isOpen, file, getPreviewUrl]);

  if (!isOpen || !file) return null;

  const isPdf = file.fileExt?.toLowerCase() === 'pdf' || file.fileType?.includes('pdf');
  const isImage = !isPdf;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`note-preview-backdrop ${isFullscreen ? 'fullscreen-mode' : ''}`} onClick={onClose}>
      <div className="note-preview-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header Toolbar */}
        <div className="note-preview-header">
          <div className="note-preview-title-block">
            <div className="note-type-badge-icon">
              {isPdf ? (
                <FileText size={18} className="badge-pdf-icon" />
              ) : (
                <ImageIcon size={18} className="badge-img-icon" />
              )}
            </div>
            <div className="note-preview-title-wrap">
              <h3 className="note-preview-filename" title={file.title || file.fileName}>
                {file.title || file.fileName}
              </h3>
              <div className="note-preview-submeta">
                <span className="meta-badge-ext">{(file.fileExt || 'file').toUpperCase()}</span>
                <span>•</span>
                <span>{formatFileSize(file.fileSize)}</span>
                {file.subject && (
                  <>
                    <span>•</span>
                    <span className="meta-subject"><BookOpen size={12} /> {file.subject}</span>
                  </>
                )}
                {file.module && (
                  <>
                    <span>•</span>
                    <span className="meta-module"><Layers size={12} /> {file.module}</span>
                  </>
                )}
                <span>•</span>
                <span className="meta-date"><Calendar size={12} /> {formatDate(file.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="note-preview-controls">
            {/* Image zoom & rotate controls */}
            {isImage && (
              <div className="image-control-pills">
                <button
                  type="button"
                  className="control-icon-btn"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="zoom-percentage">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  className="control-icon-btn"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  className="control-icon-btn"
                  onClick={handleRotate}
                  title="Rotate 90°"
                  aria-label="Rotate image"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  type="button"
                  className="control-icon-btn"
                  onClick={handleReset}
                  title="Reset view"
                  aria-label="Reset zoom and rotation"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            )}

            {/* AI Assistant button */}
            {onOpenAiAssistant && (
              <button
                type="button"
                className="btn btn-primary btn-sm preview-btn btn-ai-preview"
                onClick={() => onOpenAiAssistant(file)}
                title="AI Study Assistant (Summarize, MCQs, Explain, Quiz)"
              >
                <Sparkles size={15} />
                <span className="btn-label-text">AI Assistant</span>
              </button>
            )}

            {/* Download button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm preview-btn"
              onClick={() => onDownload && onDownload(file)}
              title="Download file"
            >
              <Download size={15} />
              <span className="btn-label-text">Download</span>
            </button>

            {/* Open in new window */}
            {activeUrl && (
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm preview-btn"
                title="Open in new browser tab"
              >
                <ExternalLink size={15} />
                <span className="btn-label-text">Open</span>
              </a>
            )}

            {/* Fullscreen toggle */}
            <button
              type="button"
              className="control-icon-btn fullscreen-btn"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* Close button */}
            <button
              type="button"
              className="preview-close-btn"
              onClick={onClose}
              title="Close preview"
              aria-label="Close preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview Content Area */}
        <div className="note-preview-body">
          {loading ? (
            <div className="preview-loading-state">
              <div className="preview-spinner"></div>
              <p>Loading document preview...</p>
            </div>
          ) : loadError || !activeUrl ? (
            <div className="preview-error-state">
              <FileText size={48} color="#94A3B8" />
              <h4>Preview not available</h4>
              <p>The file could not be displayed inline. You can download it directly.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onDownload && onDownload(file)}
              >
                <Download size={15} /> Download Document
              </button>
            </div>
          ) : isPdf ? (
            <div className="pdf-viewer-frame-container">
              <iframe
                title={file.title || file.fileName}
                src={`${activeUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="pdf-viewer-iframe"
                onError={() => setLoadError(true)}
              />
            </div>
          ) : (
            <div className="image-viewer-stage">
              <div
                className="image-viewer-wrapper"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <img
                  src={activeUrl}
                  alt={file.title || file.fileName}
                  className="image-preview-element"
                  onError={() => setLoadError(true)}
                  draggable={false}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        {file.description && (
          <div className="note-preview-footer-note">
            <strong>Notes / Summary:</strong> {file.description}
          </div>
        )}
      </div>
    </div>
  );
};
