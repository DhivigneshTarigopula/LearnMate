import React, { useState, useRef, useMemo } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  User,
  Trash2,
  Edit2,
  Save,
  RefreshCw,
  Users,
  Coffee,
  Check
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { extractTimetableFromDocument } from '../../lib/geminiScheduleExtractor';
import { useApp } from '../../context/AppContext';
import './AiTimetableUploadModal.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TYPES = ['Lecture', 'Lab', 'Tutorial', 'Seminar', 'Soft Skill', 'Activity', 'Self-Study', 'Mentoring', 'Break'];
const BATCHES = ['All', 'C1', 'C2'];

export const AiTimetableUploadModal = ({ isOpen, onClose }) => {
  const { session, timetable = [], addMultipleClasses, showToast } = useApp();

  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'preview'
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [extractedClasses, setExtractedClasses] = useState([]);
  const [timetableMeta, setTimetableMeta] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Batch allocation filter: 'All' | 'C1' | 'C2'
  const [selectedBatch, setSelectedBatch] = useState('C1');
  const [includeBreaks, setIncludeBreaks] = useState(false);

  const fileInputRef = useRef(null);

  const resetModal = () => {
    setStep('upload');
    setSelectedFile(null);
    setDragActive(false);
    setProcessingStatus('');
    setExtractedClasses([]);
    setTimetableMeta({});
    setErrorMessage('');
    setEditingIndex(null);
    setEditForm(null);
    setSelectedBatch('C1');
    setIncludeBreaks(false);
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
    const isPdfOrImg = validTypes.includes(file.type) || ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext);

    if (!isPdfOrImg) {
      setErrorMessage('Please upload a PDF timetable or an image/screenshot (.pdf, .png, .jpg, .jpeg, .webp).');
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
    setProcessingStatus('Enhancing image contrast & resolution for OCR...');

    try {
      setTimeout(() => {
        setProcessingStatus('Reading table columns, 7 periods, and break intervals...');
      }, 700);

      setTimeout(() => {
        setProcessingStatus('Parsing merged lab cells, C1/C2 batches, and course codes...');
      }, 1600);

      const result = await extractTimetableFromDocument({
        file: selectedFile,
        session
      });

      if (!result || !result.classes || result.classes.length === 0) {
        throw new Error('Could not identify class schedules from this document. Please verify the timetable format.');
      }

      setTimetableMeta({
        institution: result.institution || '',
        department: result.department || '',
        section: result.section || '',
        semester: result.semester || '',
        classAdvisor: result.classAdvisor || '',
        defaultRoom: result.defaultRoom || '',
      });
      setExtractedClasses(result.classes);
      setStep('preview');
      showToast(`✨ Extracted timetable successfully! Review and select your batch below.`, 'info');
    } catch (err) {
      console.error('[AI Timetable Extraction Error]:', err);
      setErrorMessage(err.message || 'Failed to extract timetable schedule. Please try a clearer document.');
      setStep('upload');
    }
  };

  // Filter classes based on selected batch & break toggle
  const displayedClasses = useMemo(() => {
    return extractedClasses.filter((item) => {
      if (!includeBreaks && item.isBreak) return false;
      if (selectedBatch === 'All') return true;
      return item.batch === selectedBatch || item.batch === 'All' || !item.batch;
    });
  }, [extractedClasses, selectedBatch, includeBreaks]);

  // Check if a class is an overlap/duplicate with existing timetable
  const checkIsDuplicate = (slot) => {
    return timetable.some((existing) => {
      const sameDay = existing.day?.toLowerCase() === slot.day?.toLowerCase();
      const sameCode = existing.code?.toLowerCase() === slot.code?.toLowerCase();
      const sameTime = existing.time?.replace(/\s+/g, '').toLowerCase() === slot.time?.replace(/\s+/g, '').toLowerCase();
      const sameSubject = existing.subject?.toLowerCase() === slot.subject?.toLowerCase();
      return sameDay && (sameCode || (sameTime && sameSubject));
    });
  };

  // Edit actions
  const startEdit = (originalIndex) => {
    setEditingIndex(originalIndex);
    setEditForm({ ...extractedClasses[originalIndex] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editForm) return;
    setExtractedClasses((prev) =>
      prev.map((item, idx) => (idx === editingIndex ? { ...editForm } : item))
    );
    setEditingIndex(null);
    setEditForm(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const deleteSlot = (originalIndex) => {
    setExtractedClasses((prev) => prev.filter((_, idx) => idx !== originalIndex));
    if (editingIndex === originalIndex) {
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  // Confirm and save to timetable
  const handleConfirmSave = async () => {
    // Save only classes matching selected batch, excluding break rows unless included
    const classesToSave = extractedClasses.filter((item) => {
      if (item.isBreak && !includeBreaks) return false;
      if (selectedBatch === 'All') return true;
      return item.batch === selectedBatch || item.batch === 'All' || !item.batch;
    });

    if (classesToSave.length === 0) {
      setErrorMessage('No classes selected to save. Please select Batch C1, C2 or All.');
      return;
    }

    const res = await addMultipleClasses(classesToSave);
    if (res?.addedCount > 0 || res?.skippedCount >= 0) {
      handleClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Timetable with AI"
      maxWidth="920px"
    >
      <div className="ai-timetable-modal-content">
        {errorMessage && (
          <div className="ai-modal-error-banner">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ================= STEP 1: UPLOAD ================= */}
        {step === 'upload' && (
          <div className="ai-upload-step">
            <p className="ai-upload-intro">
              Upload your college timetable photo, screenshot, or PDF. 
              LearnMate enhances the image, detects table grids, periods 1–7, short/lunch breaks, and C1/C2 lab batches automatically.
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
                      <ImageIcon size={32} color="#4F46E5" />
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
                  <div className="cloud-icon-circle">
                    <UploadCloud size={32} />
                  </div>
                  <h3>Drag & Drop your Timetable Image or PDF</h3>
                  <p>Supports college schedule matrices, screenshots, JPG, PNG and PDF (up to 25MB)</p>
                  <button type="button" className="btn btn-secondary btn-sm browse-btn">
                    Browse Files
                  </button>
                </div>
              )}
            </div>

            <div className="ai-upload-tips">
              <span className="tips-badge">Smart Extraction</span>
              <span>Monday–Saturday • 7 Periods • C1/C2 Lab Batches • Short Break & Lunch Break</span>
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
                <Sparkles size={16} /> Extract Timetable
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PROCESSING ================= */}
        {step === 'processing' && (
          <div className="ai-processing-step">
            <div className="ai-animated-scanner">
              <div className="scanner-glow-circle">
                <Sparkles size={36} className="pulsing-sparkle" />
              </div>
              <div className="ai-shimmer-bar"></div>
            </div>
            <h3>Analyzing Timetable Image</h3>
            <p className="processing-status-text">{processingStatus}</p>
            <div className="processing-steps-indicator">
              <div className="step-dot active"></div>
              <div className="step-dot active"></div>
              <div className="step-dot active"></div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PREVIEW & CONFIRM ================= */}
        {step === 'preview' && (
          <div className="ai-preview-step">
            {/* Header info */}
            <div className="preview-top-banner">
              <div>
                <h4 className="preview-heading">
                  <CheckCircle2 size={18} color="#10B981" />
                  Extracted {displayedClasses.length} Scheduled Classes
                </h4>
                {timetableMeta.institution && (
                  <p className="preview-sub">
                    <strong>{timetableMeta.institution}</strong>
                    {timetableMeta.section && ` • Section ${timetableMeta.section}`}
                    {timetableMeta.semester && ` • Sem ${timetableMeta.semester}`}
                    {timetableMeta.classAdvisor && ` • Advisor: ${timetableMeta.classAdvisor}`}
                    {timetableMeta.defaultRoom && ` • Room: ${timetableMeta.defaultRoom}`}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setStep('upload')}
              >
                <RefreshCw size={14} /> Re-Upload
              </button>
            </div>

            {/* Batch Filter & Controls Bar */}
            <div className="preview-controls-row">
              <div className="batch-selector-box">
                <span className="batch-selector-label">
                  <Users size={14} /> Select Your Batch:
                </span>
                <div className="batch-pill-group">
                  <button
                    type="button"
                    className={`batch-pill ${selectedBatch === 'C1' ? 'active' : ''}`}
                    onClick={() => setSelectedBatch('C1')}
                  >
                    Batch C1
                  </button>
                  <button
                    type="button"
                    className={`batch-pill ${selectedBatch === 'C2' ? 'active' : ''}`}
                    onClick={() => setSelectedBatch('C2')}
                  >
                    Batch C2
                  </button>
                  <button
                    type="button"
                    className={`batch-pill ${selectedBatch === 'All' ? 'active' : ''}`}
                    onClick={() => setSelectedBatch('All')}
                  >
                    All Batches
                  </button>
                </div>
              </div>

              <label className="breaks-toggle-label">
                <input
                  type="checkbox"
                  checked={includeBreaks}
                  onChange={(e) => setIncludeBreaks(e.target.checked)}
                />
                <Coffee size={14} /> Include Short / Lunch Breaks
              </label>
            </div>

            <p className="preview-instructions">
              Review your recognized schedule below. You can click <strong>Edit</strong> to change subjects, codes, or rooms, or <strong>Delete</strong> unwanted slots before saving.
            </p>

            {/* List of classes */}
            <div className="extracted-classes-list">
              {displayedClasses.map((item) => {
                const originalIndex = extractedClasses.findIndex((c) => c.id === item.id);
                const isEditing = editingIndex === originalIndex;
                const isDuplicate = checkIsDuplicate(item);

                if (isEditing && editForm) {
                  return (
                    <div key={item.id} className="class-edit-form-card card">
                      <div className="form-grid-row">
                        <div className="form-group">
                          <label>Subject Name</label>
                          <input
                            type="text"
                            value={editForm.subject}
                            onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Subject Code</label>
                          <input
                            type="text"
                            value={editForm.code}
                            onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-grid-row-3">
                        <div className="form-group">
                          <label>Day</label>
                          <select
                            value={editForm.day}
                            onChange={(e) => setEditForm({ ...editForm, day: e.target.value })}
                          >
                            {DAYS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Period</label>
                          <input
                            type="text"
                            value={editForm.period || ''}
                            placeholder="e.g. 1st, 2nd, 3rd - 4th (Lab)"
                            onChange={(e) => setEditForm({ ...editForm, period: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Time Slot</label>
                          <input
                            type="text"
                            value={editForm.time}
                            onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="form-grid-row-3">
                        <div className="form-group">
                          <label>Room / Venue</label>
                          <input
                            type="text"
                            value={editForm.room}
                            onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Instructor</label>
                          <input
                            type="text"
                            value={editForm.instructor}
                            onChange={(e) => setEditForm({ ...editForm, instructor: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Batch</label>
                          <select
                            value={editForm.batch || 'All'}
                            onChange={(e) => setEditForm({ ...editForm, batch: e.target.value })}
                          >
                            {BATCHES.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="form-grid-row">
                        <div className="form-group">
                          <label>Class Type</label>
                          <select
                            value={editForm.type}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                          >
                            {TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="edit-form-actions">
                        <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit}>
                          <Save size={14} /> Done
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`extracted-slot-row card border-${item.color || 'blue'} ${item.isBreak ? 'is-break-row' : ''}`}
                  >
                    <div className="slot-row-left">
                      <span className="day-badge-pill">{item.day?.slice(0, 3)}</span>
                      {item.period && (
                        <span className="period-badge-tag">{item.period}</span>
                      )}
                      <div className="slot-identity">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="slot-code-tag">{item.code}</span>
                          {item.batch && item.batch !== 'All' && (
                            <span className="batch-pill-badge">{item.batch}</span>
                          )}
                        </div>
                        <h4 className="slot-subject-title">{item.subject}</h4>
                      </div>
                    </div>

                    <div className="slot-row-middle">
                      <div className="meta-item">
                        <Clock size={13} />
                        <span>{item.time}</span>
                      </div>
                      <div className="meta-item">
                        <MapPin size={13} />
                        <span>{item.room || 'TBA'}</span>
                      </div>
                      <div className="meta-item">
                        <User size={13} />
                        <span>{item.instructor || 'Faculty'}</span>
                      </div>
                    </div>

                    <div className="slot-row-right">
                      <span className={`badge badge-${item.color || 'blue'}`}>{item.type || 'Lecture'}</span>
                      {isDuplicate && (
                        <span className="duplicate-warning-badge" title="Already in timetable">
                          Overlap
                        </span>
                      )}
                      <button
                        type="button"
                        className="slot-action-icon-btn"
                        onClick={() => startEdit(originalIndex)}
                        title="Edit slot"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="slot-action-icon-btn delete"
                        onClick={() => deleteSlot(originalIndex)}
                        title="Delete slot"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="ai-modal-footer-actions preview-footer">
              <span className="preview-summary-count">
                Ready to save <strong>{displayedClasses.length}</strong> classes
                {selectedBatch !== 'All' && ` for Batch ${selectedBatch}`} to your timetable
              </span>
              <div className="footer-btn-group">
                <button type="button" className="btn btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmSave}
                  disabled={displayedClasses.length === 0}
                >
                  <CheckCircle2 size={16} /> Confirm & Save to Timetable
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
