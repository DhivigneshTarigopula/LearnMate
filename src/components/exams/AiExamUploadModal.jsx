import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  Check,
  X,
  Plus,
  RefreshCw,
  GraduationCap,
  ListTodo,
  Info,
  BookOpen,
  Eye,
  EyeOff
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { extractExamsFromDocument } from '../../lib/geminiScheduleExtractor';
import { getDayOfWeekFromDate } from '../../lib/dsuExamData';
import { useApp } from '../../context/AppContext';
import './AiExamUploadModal.css';

export const AiExamUploadModal = ({ isOpen, onClose }) => {
  const { session, exams = [], addMultipleExams, showToast } = useApp();

  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'preview'
  const [selectedFile, setSelectedFile] = useState(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState('');
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [extractedExams, setExtractedExams] = useState([]);
  const [metadata, setMetadata] = useState({
    institution: '',
    department: '',
    examTitle: '',
    semester: '',
    academicYear: '',
    circularDate: '',
    instructions: []
  });
  const [createStudyPlan, setCreateStudyPlan] = useState(true);
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newExamForm, setNewExamForm] = useState({
    date: '',
    day: '',
    code: '',
    subject: '',
    startTime: '10:45 AM',
    endTime: '12:00 PM',
    venue: 'Test Hall',
    duration: '1h 15m'
  });
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (docPreviewUrl) {
        URL.revokeObjectURL(docPreviewUrl);
      }
    };
  }, [docPreviewUrl]);

  const resetModal = () => {
    setStep('upload');
    if (docPreviewUrl) {
      URL.revokeObjectURL(docPreviewUrl);
    }
    setDocPreviewUrl('');
    setShowDocPreview(false);
    setSelectedFile(null);
    setDragActive(false);
    setProcessingStatus('');
    setExtractedExams([]);
    setMetadata({
      institution: '',
      department: '',
      examTitle: '',
      semester: '',
      academicYear: '',
      circularDate: '',
      instructions: []
    });
    setCreateStudyPlan(true);
    setOverwriteDuplicates(false);
    setErrorMessage('');
    setEditingIndex(null);
    setEditForm(null);
    setIsAddingNew(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    if (step === 'processing' || isSaving) return;
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
      setErrorMessage('Please upload an exam schedule PDF or image (.pdf, .png, .jpg, .webp).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit.');
      return;
    }

    if (docPreviewUrl) {
      URL.revokeObjectURL(docPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setDocPreviewUrl(previewUrl);
    setSelectedFile(file);
  };

  const startAiExtraction = async () => {
    if (!selectedFile) return;

    setStep('processing');
    setErrorMessage('');
    setProcessingStatus('Inspecting document layout, table rows, and headers...');

    try {
      setTimeout(() => {
        setProcessingStatus('Gemini AI extracting exam dates, papers, codes, and timings...');
      }, 800);

      setTimeout(() => {
        setProcessingStatus('Structuring examination calendar & verifying session periods...');
      }, 1800);

      const result = await extractExamsFromDocument({
        file: selectedFile,
        session
      });

      if (!result || !result.exams || result.exams.length === 0) {
        throw new Error('Could not identify exam dates from this document. Please verify the exam sheet.');
      }

      setMetadata({
        institution: result.institution || '',
        department: result.department || '',
        examTitle: result.examTitle || 'University Examination',
        semester: result.semester || '',
        academicYear: result.academicYear || '',
        circularDate: result.circularDate || '',
        instructions: Array.isArray(result.instructions) ? result.instructions : []
      });

      setExtractedExams(result.exams);
      setStep('preview');
      showToast(`Extracted ${result.exams.length} examinations! Please review schedule.`, 'info');
    } catch (err) {
      console.error('[AI Exam Extraction Error]:', err);
      setErrorMessage(err.message || 'Failed to extract exam schedule. Please try a clearer document.');
      setStep('upload');
    }
  };

  const checkIsDuplicate = (item) => {
    return exams.some((existing) => {
      const sameSubject = existing.subject?.toLowerCase() === item.subject?.toLowerCase();
      const sameDate = existing.date === item.date;
      const sameCode = existing.code && item.code && existing.code.toLowerCase() === item.code.toLowerCase();
      return (sameSubject && sameDate) || (sameCode && sameDate);
    });
  };

  const duplicateCount = extractedExams.filter(checkIsDuplicate).length;
  const hasUncertainties = extractedExams.some(
    (e) => e.isUncertain || (e.uncertainFields && e.uncertainFields.length > 0)
  );

  const startEdit = (index) => {
    setEditingIndex(index);
    const target = extractedExams[index];
    setEditForm({
      ...target,
      startTime: target.startTime || (target.time ? target.time.split('-')[0]?.trim() : '10:45 AM'),
      endTime: target.endTime || (target.time ? target.time.split('-')[1]?.trim() : '12:00 PM')
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'date') {
        updated.day = getDayOfWeekFromDate(value);
        updated.dayOfWeek = updated.day;
      }
      if (field === 'startTime' || field === 'endTime') {
        const s = field === 'startTime' ? value : updated.startTime;
        const e = field === 'endTime' ? value : updated.endTime;
        updated.time = s && e ? `${s} - ${e}` : (s || e);
        updated.session = (s || '').toUpperCase().includes('PM') ? 'Afternoon' : 'Morning';
      }
      return updated;
    });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editForm) return;

    if (!editForm.subject?.trim() || !editForm.date) {
      showToast('Please enter both subject name and exam date.', 'warning');
      return;
    }

    setExtractedExams((prev) =>
      prev.map((item, idx) =>
        idx === editingIndex
          ? {
              ...item,
              ...editForm,
              subject: editForm.subject.trim(),
              code: (editForm.code || '').trim().toUpperCase(),
              venue: (editForm.venue || '').trim() || 'Test Hall',
              room: (editForm.venue || '').trim() || 'Test Hall',
              isUncertain: false,
              uncertainFields: []
            }
          : item
      )
    );
    setEditingIndex(null);
    setEditForm(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const deleteExamSlot = (index) => {
    setExtractedExams((prev) => prev.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleStartAddNew = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setNewExamForm({
      date: todayStr,
      day: getDayOfWeekFromDate(todayStr),
      code: '',
      subject: '',
      startTime: '10:45 AM',
      endTime: '12:00 PM',
      venue: metadata.institution?.includes('Dayananda') ? 'Test Hall' : 'Main Exam Hall',
      duration: '1h 15m'
    });
    setIsAddingNew(true);
  };

  const handleNewExamChange = (field, value) => {
    setNewExamForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'date') {
        updated.day = getDayOfWeekFromDate(value);
      }
      return updated;
    });
  };

  const handleSaveNewExam = () => {
    if (!newExamForm.subject?.trim() || !newExamForm.date) {
      showToast('Please enter subject name and exam date.', 'warning');
      return;
    }

    const s = newExamForm.startTime.trim();
    const e = newExamForm.endTime.trim();
    const timeFormatted = s && e ? `${s} - ${e}` : (s || e);
    const sessionType = s.toUpperCase().includes('PM') ? 'Afternoon' : 'Morning';

    const newPaper = {
      id: `ex_user_${Date.now()}`,
      subject: newExamForm.subject.trim(),
      code: (newExamForm.code || '').trim().toUpperCase(),
      examName: metadata.examTitle || 'Examination',
      date: newExamForm.date,
      day: newExamForm.day || getDayOfWeekFromDate(newExamForm.date),
      dayOfWeek: newExamForm.day || getDayOfWeekFromDate(newExamForm.date),
      startTime: s,
      endTime: e,
      time: timeFormatted,
      duration: newExamForm.duration || '1h 15m',
      session: sessionType,
      venue: newExamForm.venue.trim() || 'Test Hall',
      room: newExamForm.venue.trim() || 'Test Hall',
      weight: '25%',
      isUncertain: false,
      uncertainFields: [],
      topics: [
        { id: `top_new_${Date.now()}_1`, title: 'Core Lecture Notes Revision', done: false },
        { id: `top_new_${Date.now()}_2`, title: 'Formula & Key Concepts', done: false },
        { id: `top_new_${Date.now()}_3`, title: 'Practice Problems & Previous Papers', done: false }
      ]
    };

    setExtractedExams((prev) => [...prev, newPaper].sort((a, b) => new Date(a.date) - new Date(b.date)));
    setIsAddingNew(false);
    showToast('Examination slot added!', 'info');
  };

  const handleConfirmSave = async () => {
    if (extractedExams.length === 0) return;
    setIsSaving(true);
    try {
      const res = await addMultipleExams(extractedExams, createStudyPlan, overwriteDuplicates);
      if (res?.addedCount > 0 || res?.updatedCount > 0 || res?.skippedCount > 0) {
        handleClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Exam Schedule with AI"
      maxWidth="980px"
    >
      <div className="ai-exam-modal-content">
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
              Upload your official examination timetable, date sheet PDF, or mobile photo. 
              <strong> Google Gemini AI</strong> will accurately extract exam dates, subject codes, paper names, timings, sessions, and venues.
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
                      <ImageIcon size={32} color="#0F766E" />
                    )}
                  </div>
                  <div className="file-info-text">
                    <h4 className="file-name">{selectedFile.name}</h4>
                    <span className="file-meta">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Exam Document'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="change-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl);
                      setDocPreviewUrl('');
                      setSelectedFile(null);
                    }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="dropzone-empty-prompt">
                  <div className="cloud-icon-circle exam-cloud-circle">
                    <GraduationCap size={32} />
                  </div>
                  <h3>Drag & Drop Exam Date Sheet or Circular</h3>
                  <p>Supports official university circulars, midterm timetables, PDF date sheets, and JPG/PNG photos (up to 25MB)</p>
                  <button type="button" className="btn btn-secondary btn-sm browse-btn">
                    Browse Files
                  </button>
                </div>
              )}
            </div>

            <div className="ai-upload-tips">
              <span className="tips-badge">Document AI</span>
              <span>Extracts Date • Day • Subject Code • Subject Name • Start Time • End Time • Venue</span>
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
                <Sparkles size={16} /> Extract Schedule with AI
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PROCESSING ================= */}
        {step === 'processing' && (
          <div className="ai-processing-step">
            <div className="ai-animated-scanner">
              <div className="scanner-glow-circle exam-glow-circle">
                <Sparkles size={36} className="pulsing-sparkle" />
              </div>
              <div className="ai-shimmer-bar"></div>
            </div>
            <h3>Analyzing Examination Circular with Gemini AI</h3>
            <p className="processing-status-text">{processingStatus}</p>
            <div className="processing-steps-indicator">
              <div className="step-dot active"></div>
              <div className="step-dot active"></div>
              <div className="step-dot active"></div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PREVIEW & EDITABLE TABLE ================= */}
        {step === 'preview' && (
          <div className="ai-preview-step">
            {/* Circular Metadata Banner */}
            <div className="circular-metadata-card">
              <div className="metadata-main">
                <span className="metadata-badge">
                  <CheckCircle2 size={14} /> Official Examination Circular
                </span>
                <h3 className="metadata-title">
                  {metadata.examTitle || 'Semester Examination'}
                </h3>
                <p className="metadata-sub">
                  {[metadata.institution, metadata.department, metadata.semester, metadata.academicYear]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>

              <div className="metadata-actions">
                {selectedFile && docPreviewUrl && (
                  <button
                    type="button"
                    className={`btn btn-sm btn-doc-toggle ${showDocPreview ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setShowDocPreview(!showDocPreview)}
                    title="Review original uploaded schedule document"
                  >
                    {showDocPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showDocPreview ? 'Hide Original Document' : 'Review Original Document'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setStep('upload')}
                  title="Upload a different schedule document"
                >
                  <RefreshCw size={14} /> Re-Upload
                </button>
              </div>
            </div>

            {/* Original Document Preview Viewer */}
            {showDocPreview && selectedFile && docPreviewUrl && (
              <div className="original-doc-preview-card card">
                <div className="doc-preview-toolbar">
                  <div className="doc-preview-name">
                    <FileText size={15} color="#0F766E" />
                    <span>Original Document: <strong>{selectedFile.name}</strong></span>
                  </div>
                  <button
                    type="button"
                    className="btn-close-inline"
                    onClick={() => setShowDocPreview(false)}
                    title="Close document preview"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="doc-preview-viewer">
                  {selectedFile.type?.includes('pdf') || selectedFile.name.endsWith('.pdf') ? (
                    <iframe
                      src={docPreviewUrl}
                      title="Original Examination Schedule"
                      className="doc-iframe-view"
                    />
                  ) : (
                    <img
                      src={docPreviewUrl}
                      alt="Original Examination Document"
                      className="doc-img-view"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Circular Instructions Banner if present */}
            {metadata.instructions && metadata.instructions.length > 0 && (
              <div className="exam-instructions-box">
                <div className="instructions-header">
                  <Info size={15} color="#0F766E" />
                  <strong>Important Examination Instructions</strong>
                </div>
                <ul className="instructions-list">
                  {metadata.instructions.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Uncertainty Notice if detected */}
            {hasUncertainties && (
              <div className="uncertainty-alert-bar">
                <AlertTriangle size={16} />
                <span>
                  Some fields could not be extracted with 100% confidence. Uncertain values are highlighted in amber below. Please review or edit before saving.
                </span>
              </div>
            )}

            {/* Duplicate Notice & Overwrite confirmation */}
            {duplicateCount > 0 && (
              <div className="duplicate-warning-banner">
                <div className="duplicate-warning-text">
                  <AlertCircle size={16} color="#B45309" />
                  <span>
                    <strong>{duplicateCount}</strong> of these exams are already in your schedule. By default, duplicate entries are preserved and skipped.
                  </span>
                </div>
                <label className="overwrite-checkbox-label">
                  <input
                    type="checkbox"
                    checked={overwriteDuplicates}
                    onChange={(e) => setOverwriteDuplicates(e.target.checked)}
                  />
                  <span>Overwrite existing entries with newly extracted schedule details</span>
                </label>
              </div>
            )}

            {/* Study Plan Opt-in Banner */}
            <div className="study-plan-optin-card">
              <label className="study-plan-checkbox-label">
                <input
                  type="checkbox"
                  checked={createStudyPlan}
                  onChange={(e) => setCreateStudyPlan(e.target.checked)}
                />
                <div className="optin-text">
                  <strong>
                    <ListTodo size={16} /> Automatically generate personalized revision plan
                  </strong>
                  <span>
                    Creates structured revision blocks in your Study Planner scheduled prior to each examination paper.
                  </span>
                </div>
              </label>
            </div>

            {/* Add Missing Exam inline trigger */}
            <div className="table-header-controls">
              <div className="table-summary-info">
                <strong>Schedule Preview</strong> ({extractedExams.length} papers identified)
                <span className="table-sub-tip">Click pencil to edit any paper, trash to remove, or add missing papers</span>
              </div>
              {!isAddingNew && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-add-exam-row"
                  onClick={handleStartAddNew}
                >
                  <Plus size={14} /> Add Missing Examination
                </button>
              )}
            </div>

            {/* Inline Add New Form Card */}
            {isAddingNew && (
              <div className="add-exam-inline-card card">
                <div className="inline-card-header">
                  <strong>Add Missing Examination Paper</strong>
                  <button type="button" className="btn-close-inline" onClick={() => setIsAddingNew(false)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="inline-form-grid">
                  <div className="form-field">
                    <label>Date (YYYY-MM-DD) *</label>
                    <input
                      type="date"
                      value={newExamForm.date}
                      onChange={(e) => handleNewExamChange('date', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Day of Week</label>
                    <input
                      type="text"
                      readOnly
                      className="readonly-input"
                      value={newExamForm.day || getDayOfWeekFromDate(newExamForm.date)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Course Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 25CS2308"
                      value={newExamForm.code}
                      onChange={(e) => handleNewExamChange('code', e.target.value)}
                    />
                  </div>
                  <div className="form-field subject-field">
                    <label>Subject / Paper Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Skill Enhancement Course-1"
                      value={newExamForm.subject}
                      onChange={(e) => handleNewExamChange('subject', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Start Time</label>
                    <input
                      type="text"
                      placeholder="10:45 AM"
                      value={newExamForm.startTime}
                      onChange={(e) => handleNewExamChange('startTime', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>End Time</label>
                    <input
                      type="text"
                      placeholder="12:00 PM"
                      value={newExamForm.endTime}
                      onChange={(e) => handleNewExamChange('endTime', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Venue / Hall</label>
                    <input
                      type="text"
                      placeholder="Test Hall"
                      value={newExamForm.venue}
                      onChange={(e) => handleNewExamChange('venue', e.target.value)}
                    />
                  </div>
                </div>
                <div className="inline-form-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsAddingNew(false)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveNewExam}>
                    <Check size={14} /> Add to Schedule
                  </button>
                </div>
              </div>
            )}

            {/* Editable Examination Schedule Table */}
            <div className="exam-table-container">
              <table className="exam-preview-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Date</th>
                    <th style={{ width: '100px' }}>Day</th>
                    <th style={{ width: '110px' }}>Subject Code</th>
                    <th>Subject Name</th>
                    <th style={{ width: '105px' }}>Start Time</th>
                    <th style={{ width: '105px' }}>End Time</th>
                    <th style={{ width: '110px' }}>Venue</th>
                    <th style={{ width: '85px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedExams.map((item, idx) => {
                    const isEditing = editingIndex === idx;
                    const isDuplicate = checkIsDuplicate(item);
                    const isCodeUncertain = item.uncertainFields?.includes('code') || !item.code || item.code.startsWith('EX-');
                    const isSubjectUncertain = item.uncertainFields?.includes('subject') || item.subject.startsWith('Exam Paper');
                    const isTimeUncertain = item.uncertainFields?.includes('time');

                    if (isEditing && editForm) {
                      return (
                        <tr key={item.id || idx} className="exam-row-editing">
                          <td>
                            <input
                              type="date"
                              className="table-input"
                              value={editForm.date}
                              onChange={(e) => handleEditChange('date', e.target.value)}
                            />
                          </td>
                          <td>
                            <span className="badge-table-day">
                              {editForm.day || getDayOfWeekFromDate(editForm.date)}
                            </span>
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              placeholder="Code"
                              value={editForm.code}
                              onChange={(e) => handleEditChange('code', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              placeholder="Subject Name"
                              value={editForm.subject}
                              onChange={(e) => handleEditChange('subject', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              placeholder="10:45 AM"
                              value={editForm.startTime}
                              onChange={(e) => handleEditChange('startTime', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              placeholder="12:00 PM"
                              value={editForm.endTime}
                              onChange={(e) => handleEditChange('endTime', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="table-input"
                              placeholder="Venue"
                              value={editForm.venue}
                              onChange={(e) => handleEditChange('venue', e.target.value)}
                            />
                          </td>
                          <td className="actions-cell">
                            <button
                              type="button"
                              className="row-action-btn save"
                              onClick={saveEdit}
                              title="Save changes"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              className="row-action-btn cancel"
                              onClick={cancelEdit}
                              title="Cancel editing"
                            >
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={item.id || idx} className={`${isDuplicate ? 'is-duplicate-row' : ''} ${item.isUncertain ? 'is-uncertain-row' : ''}`}>
                        <td className="date-cell">
                          <span className="date-main">{item.date}</span>
                        </td>
                        <td className="day-cell">
                          <span className="badge-table-day">{item.day || item.dayOfWeek}</span>
                        </td>
                        <td className={`code-cell ${isCodeUncertain ? 'cell-uncertain' : ''}`}>
                          <span className="code-pill">{item.code || 'N/A'}</span>
                          {isCodeUncertain && (
                            <span className="uncertain-indicator" title="Course code unclear - please verify">
                              <AlertTriangle size={11} />
                            </span>
                          )}
                        </td>
                        <td className={`subject-cell ${isSubjectUncertain ? 'cell-uncertain' : ''}`}>
                          <strong className="subject-title-text">{item.subject}</strong>
                          <div className="subject-badges-line">
                            {item.session && (
                              <span className={`session-pill session-${item.session.toLowerCase()}`}>
                                {item.session} Session
                              </span>
                            )}
                            {isDuplicate && (
                              <span className="duplicate-tag" title="Already scheduled in your exam calendar">
                                Already in Schedule
                              </span>
                            )}
                            {isSubjectUncertain && (
                              <span className="uncertain-tag" title="Subject title unclear - please check">
                                <AlertTriangle size={10} /> Unclear
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`time-cell ${isTimeUncertain ? 'cell-uncertain' : ''}`}>
                          {item.startTime || (item.time ? item.time.split('-')[0]?.trim() : '10:45 AM')}
                        </td>
                        <td className={`time-cell ${isTimeUncertain ? 'cell-uncertain' : ''}`}>
                          {item.endTime || (item.time ? item.time.split('-')[1]?.trim() : '12:00 PM')}
                        </td>
                        <td className="venue-cell">
                          <span className="venue-tag">
                            <MapPin size={11} /> {item.venue || item.room || 'Test Hall'}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button
                            type="button"
                            className="row-action-btn edit"
                            onClick={() => startEdit(idx)}
                            title="Edit row"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="row-action-btn delete"
                            onClick={() => deleteExamSlot(idx)}
                            title="Remove paper"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer Summary & Confirmation */}
            <div className="ai-modal-footer-actions preview-footer">
              <span className="preview-summary-count">
                Ready to schedule <strong>{extractedExams.length} examinations</strong>
                {createStudyPlan ? ' with personalized study roadmap' : ''}
              </span>
              <div className="footer-btn-group">
                <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={isSaving}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-save-exams"
                  onClick={handleConfirmSave}
                  disabled={extractedExams.length === 0 || isSaving}
                >
                  <CheckCircle2 size={16} />
                  {isSaving ? 'Saving Schedule...' : `Confirm & Save ${extractedExams.length} Exams`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
