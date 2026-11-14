import React, { useState, useRef } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { extractAssignmentFromDocument } from '../../lib/geminiScheduleExtractor.js';
import { useApp } from '../../context/AppContext';
import './AiAssignmentUploadModal.css';

export const AiAssignmentUploadModal = ({ isOpen, onClose }) => {
  const { session, addAssignment, showToast } = useApp();

  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'preview'
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form for preview and correction
  const [form, setForm] = useState({
    title: '',
    subject: '',
    courseCode: '',
    dueDate: '',
    priority: 'medium',
    description: ''
  });

  const fileInputRef = useRef(null);

  const resetModal = () => {
    setStep('upload');
    setSelectedFile(null);
    setDragActive(false);
    setProcessingStatus('');
    setErrorMessage('');
    setForm({
      title: '',
      subject: '',
      courseCode: '',
      dueDate: '',
      priority: 'medium',
      description: ''
    });
  };

  const handleClose = () => {
    if (step === 'processing') return;
    resetModal();
    onClose();
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setErrorMessage('');
    if (!file) return;

    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isValid = validTypes.includes(file.type) || ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext);

    if (!isValid) {
      setErrorMessage('Please upload an assignment document (.pdf, .png, .jpg, .webp).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const startAiExtraction = async () => {
    if (!selectedFile) return;

    setStep('processing');
    setErrorMessage('');
    setProcessingStatus('Reading coursework document...');

    try {
      setTimeout(() => {
        setProcessingStatus('Gemini AI analyzing instructions, deliverables, and due dates...');
      }, 900);

      const result = await extractAssignmentFromDocument({
        file: selectedFile,
        session
      });

      if (!result || !result.title) {
        throw new Error('Could not identify assignment details from this document.');
      }

      setForm({
        title: result.title,
        subject: result.subject || 'General',
        courseCode: result.courseCode || '',
        dueDate: result.dueDate,
        priority: result.priority || 'medium',
        description: result.description || ''
      });

      setStep('preview');
      showToast('Assignment details extracted! Review and confirm below.', 'info');
    } catch (err) {
      console.error('[AI Assignment Extraction Error]:', err);
      setErrorMessage(err.message || 'Failed to extract assignment details. Please try a clearer document.');
      setStep('upload');
    }
  };

  const handleConfirmSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.subject.trim()) {
      setErrorMessage('Title and Subject are required.');
      return;
    }

    await addAssignment({
      title: form.title.trim(),
      subject: form.subject.trim(),
      courseCode: form.courseCode.trim(),
      dueDate: form.dueDate,
      priority: form.priority,
      description: form.description.trim()
    });

    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Assignment with AI"
      maxWidth="720px"
    >
      <div className="ai-asg-modal-content">
        {errorMessage && (
          <div className="ai-modal-error-banner">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="ai-upload-step">
            <p className="ai-upload-intro">
              Upload your homework prompt sheet, coursework PDF, or problem set screenshot.
              <strong> Google Gemini AI</strong> will extract the assignment title, subject, due date, and instructions automatically.
            </p>

            <div
              className={`ai-dropzone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="ai-file-hidden-input"
                accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="ai-selected-file-preview">
                  <div className="file-type-icon-box">
                    {selectedFile.type?.includes('pdf') || selectedFile.name.endsWith('.pdf') ? (
                      <FileText size={32} color="#DC2626" />
                    ) : (
                      <ImageIcon size={32} color="#7566D8" />
                    )}
                  </div>
                  <div className="file-info-text">
                    <h4 className="file-name">{selectedFile.name}</h4>
                    <span className="file-meta">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Document'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="change-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="dropzone-empty-prompt">
                  <div className="cloud-icon-circle asg-cloud-circle">
                    <UploadCloud size={30} />
                  </div>
                  <h3>Drag & Drop Assignment Handout or Prompt</h3>
                  <p>Supports problem set PDFs, question sheets, and mobile photos (up to 25MB)</p>
                  <button type="button" className="btn btn-secondary btn-sm browse-btn">
                    Browse Files
                  </button>
                </div>
              )}
            </div>

            <div className="ai-upload-tips">
              <span className="tips-badge">Smart Detection</span>
              <span>Extracts Title • Due Date Deadline • Priority Level • Submission Guidelines</span>
            </div>

            <div className="ai-modal-footer-actions">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-ai-generate"
                disabled={!selectedFile}
                onClick={startAiExtraction}
              >
                <Sparkles size={16} /> Extract with AI
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PROCESSING */}
        {step === 'processing' && (
          <div className="ai-processing-step">
            <div className="ai-animated-scanner">
              <div className="scanner-glow-circle">
                <Sparkles size={36} className="pulsing-sparkle" />
              </div>
              <div className="ai-shimmer-bar"></div>
            </div>
            <h3>Analyzing Assignment with Gemini AI</h3>
            <p className="processing-status-text">{processingStatus}</p>
          </div>
        )}

        {/* STEP 3: PREVIEW & EDIT */}
        {step === 'preview' && (
          <form onSubmit={handleConfirmSave} className="ai-asg-preview-form">
            <div className="preview-top-banner">
              <div>
                <h4 className="preview-heading">
                  <CheckCircle2 size={18} color="#40B8A5" />
                  Assignment Details Extracted
                </h4>
                <p className="preview-sub">Review or correct the information before adding to your assignments.</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setStep('upload')}
              >
                <RefreshCw size={13} /> Re-Upload
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Assignment Title *</label>
              <input
                type="text"
                required
                className="form-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Distributed Systems Homework 3"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Subject / Course *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Computer Science"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.courseCode}
                  onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
                  placeholder="e.g. CS450"
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Submission Due Date *</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priority Level</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="high">High Priority (Coral)</option>
                  <option value="medium">Medium Priority (Warning)</option>
                  <option value="low">Low Priority (Teal)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Instructions & Key Requirements</label>
              <textarea
                rows={3}
                className="form-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Important instructions extracted by AI..."
              />
            </div>

            <div className="ai-modal-footer-actions">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <CheckCircle2 size={16} /> Confirm & Save Assignment
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

