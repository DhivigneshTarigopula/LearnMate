import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  AlertCircle,
  Folder,
  Layers,
  BookOpen,
  Tag
} from 'lucide-react';
import { Modal } from '../common/Modal';
import './FileUploadModal.css';

export const FileUploadModal = ({
  isOpen,
  onClose,
  onUpload,
  folders = [],
  currentFolderId = null,
  existingSubjects = []
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [metadata, setMetadata] = useState({
    subject: '',
    module: '',
    topic: '',
    folderId: currentFolderId || '',
    description: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [validationError, setValidationError] = useState('');

  const inputRef = useRef(null);

  const resetForm = () => {
    setSelectedFiles([]);
    setMetadata({
      subject: '',
      module: '',
      topic: '',
      folderId: currentFolderId || '',
      description: ''
    });
    setUploading(false);
    setUploadProgress(0);
    setUploadStatusText('');
    setValidationError('');
  };

  const handleClose = () => {
    if (uploading) return;
    resetForm();
    onClose();
  };

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_EXTS = ['pdf', 'jpg', 'jpeg', 'png'];
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB

  const handleFilesAdded = (files) => {
    setValidationError('');
    const newFiles = Array.from(files || []);
    if (newFiles.length === 0) return;

    const validBatch = [];
    for (const f of newFiles) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      const isAllowed = ALLOWED_EXTS.includes(ext) || ALLOWED_TYPES.includes(f.type.toLowerCase());
      if (!isAllowed) {
        setValidationError(`"${f.name}" is not a supported file type. Only PDF, JPG, JPEG, and PNG files are allowed.`);
        return;
      }
      if (f.size > MAX_SIZE) {
        setValidationError(`"${f.name}" exceeds the 20MB maximum file size limit.`);
        return;
      }
      validBatch.push(f);
    }

    setSelectedFiles((prev) => [...prev, ...validBatch]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setValidationError('Please select at least one file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(5);
    setUploadStatusText('Starting upload...');

    try {
      const result = await onUpload(selectedFiles, metadata, (pct, status) => {
        setUploadProgress(pct);
        setUploadStatusText(status);
      });

      if (result?.success) {
        handleClose();
      } else {
        setValidationError(result?.error || 'Upload failed. Please check connection.');
        setUploading(false);
      }
    } catch (err) {
      setValidationError(err.message || 'An unexpected error occurred during upload.');
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Smart Notes & Study Materials"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} className="file-upload-form">
        {/* Validation alert banner */}
        {validationError && (
          <div className="upload-alert-banner">
            <AlertCircle size={18} className="alert-icon" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Dropzone */}
        <div
          className={`upload-dropzone ${dragActive ? 'dropzone-active' : ''} ${
            selectedFiles.length > 0 ? 'has-files' : ''
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            style={{ display: 'none' }}
            onChange={(e) => handleFilesAdded(e.target.files)}
            disabled={uploading}
          />
          <div className="dropzone-icon-circle">
            <UploadCloud size={32} />
          </div>
          <div className="dropzone-content">
            <h4 className="dropzone-title">
              {dragActive ? 'Drop your files here' : 'Drag & drop notes or browse'}
            </h4>
            <p className="dropzone-subtitle">
              Supports <strong>PDF</strong>, <strong>JPG</strong>, <strong>JPEG</strong>, and <strong>PNG</strong> (handwritten notes, screenshots, scans). Up to 20MB per file.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm dropzone-browse-btn"
              disabled={uploading}
            >
              Select Files
            </button>
          </div>
        </div>

        {/* Selected files queue */}
        {selectedFiles.length > 0 && (
          <div className="selected-files-section">
            <div className="selected-files-header">
              <span className="files-count-badge">
                {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
              </span>
              <span className="files-total-size">
                Total:{' '}
                {formatFileSize(
                  selectedFiles.reduce((acc, f) => acc + f.size, 0)
                )}
              </span>
            </div>

            <div className="selected-files-list">
              {selectedFiles.map((file, idx) => {
                const ext = (file.name.split('.').pop() || '').toLowerCase();
                const isPdf = ext === 'pdf';
                return (
                  <div key={idx} className="staged-file-item">
                    <div className="staged-file-icon">
                      {isPdf ? (
                        <FileText size={18} color="#DC2626" />
                      ) : (
                        <ImageIcon size={18} color="#52796F" />
                      )}
                    </div>
                    <div className="staged-file-meta">
                      <span className="staged-file-name" title={file.name}>
                        {file.name}
                      </span>
                      <span className="staged-file-size">
                        {formatFileSize(file.size)} • {ext.toUpperCase()}
                      </span>
                    </div>
                    {!uploading && (
                      <button
                        type="button"
                        className="staged-file-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        title="Remove file"
                        aria-label="Remove file"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="upload-progress-card">
            <div className="upload-progress-header">
              <span>{uploadStatusText || 'Uploading to Supabase Storage...'}</span>
              <span className="progress-pct-val">{uploadProgress}%</span>
            </div>
            <div className="upload-progress-bar-track">
              <div
                className="upload-progress-bar-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Organization Metadata Fields */}
        <div className="upload-meta-grid">
          <div className="form-group">
            <label className="form-label">
              <BookOpen size={14} /> Subject / Course
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Data Structures & Algorithms"
              value={metadata.subject}
              onChange={(e) => setMetadata({ ...metadata, subject: e.target.value })}
              list="existing-subjects-list"
              disabled={uploading}
            />
            {existingSubjects.length > 0 && (
              <datalist id="existing-subjects-list">
                {existingSubjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              <Layers size={14} /> Module / Unit
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Module 3: Graph Algorithms"
              value={metadata.module}
              onChange={(e) => setMetadata({ ...metadata, module: e.target.value })}
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Tag size={14} /> Topic / Concept
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Dijkstra, Bellman-Ford"
              value={metadata.topic}
              onChange={(e) => setMetadata({ ...metadata, topic: e.target.value })}
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Folder size={14} /> Destination Folder
            </label>
            <select
              className="form-select"
              value={metadata.folderId}
              onChange={(e) => setMetadata({ ...metadata, folderId: e.target.value })}
              disabled={uploading}
            >
              <option value="">📁 Root / All Notes</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name} {f.subject ? `(${f.subject})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes Summary / Description (Optional)</label>
          <textarea
            rows={2}
            className="form-textarea"
            placeholder="Key formulas, lecture date, quick context..."
            value={metadata.description}
            onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
            disabled={uploading}
          ></textarea>
        </div>

        {/* Actions */}
        <div className="upload-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || selectedFiles.length === 0}
          >
            {uploading ? (
              <>Uploading ({uploadProgress}%)...</>
            ) : (
              <>Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ` : ''}File{selectedFiles.length > 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
