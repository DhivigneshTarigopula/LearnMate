import React, { useState, useRef } from 'react';
import {
  FileText,
  Sparkles,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { extractTextFromPdf } from '../../lib/pdfTextExtractor';
import './PdfQuizGeneratorModal.css';

export const PdfQuizGeneratorModal = ({
  isOpen,
  onClose,
  smartNotePdfs = [],
  onGenerateQuiz,
  getPreviewUrl,
  onQuizReady,
  uploadNoteFiles
}) => {
  // Source tabs: 'upload' | 'smart_notes'
  const [sourceType, setSourceType] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedSmartNote, setSelectedSmartNote] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [saveToNotes, setSaveToNotes] = useState(true);

  // Configuration options
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionType, setQuestionType] = useState('MCQ');
  const [subject, setSubject] = useState('');

  // Extraction Status
  const [extraction, setExtraction] = useState(null); // { loading, text, pageCount, charCount, isScanned, fileBlob }

  // Generation Status
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  const resetState = () => {
    setSelectedFile(null);
    setSelectedSmartNote(null);
    setDragActive(false);
    setNumQuestions(5);
    setDifficulty('Medium');
    setQuestionType('MCQ');
    setSubject('');
    setExtraction(null);
    setSaveToNotes(true);
    setGenerating(false);
    setGenerationStep(1);
    setErrorMessage('');
  };

  const handleClose = () => {
    if (generating) return;
    resetState();
    onClose();
  };

  const handleFileChange = async (file) => {
    setErrorMessage('');
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      setErrorMessage('Please upload a valid PDF document (.pdf).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('PDF file size exceeds the 20MB limit.');
      return;
    }

    setSelectedFile(file);
    setSelectedSmartNote(null);
    setExtraction({ loading: true, fileName: file.name });

    try {
      const extResult = await extractTextFromPdf(file);
      setExtraction({
        loading: false,
        fileName: file.name,
        text: extResult.text,
        pageCount: extResult.pageCount,
        charCount: extResult.charCount,
        isScanned: extResult.isScanned,
      });
    } catch (err) {
      console.warn('[LearnMate Quiz Generator] Client extraction error:', err);
      setExtraction({
        loading: false,
        fileName: file.name,
        text: '',
        pageCount: 1,
        charCount: 0,
        isScanned: false,
      });
    }
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
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSmartNote = async (note) => {
    setSelectedSmartNote(note);
    setSelectedFile(null);
    if (note.subject) {
      setSubject(note.subject);
    }
    setExtraction({ loading: true, fileName: note.fileName || note.title });

    try {
      let downloadUrl = note.previewUrl;
      if (getPreviewUrl) {
        const signed = await getPreviewUrl(note);
        if (signed) downloadUrl = signed;
      }

      if (downloadUrl) {
        const resp = await fetch(downloadUrl);
        const blob = await resp.blob();
        const extResult = await extractTextFromPdf(blob);
        setExtraction({
          loading: false,
          fileName: note.fileName || note.title,
          text: extResult.text,
          pageCount: extResult.pageCount,
          charCount: extResult.charCount,
          isScanned: extResult.isScanned,
          fileBlob: blob
        });
      } else {
        setExtraction({
          loading: false,
          fileName: note.fileName || note.title,
          text: '',
          pageCount: 1,
          charCount: 0,
          isScanned: false
        });
      }
    } catch (err) {
      console.warn('[LearnMate Quiz Generator] Smart note extraction notice:', err);
      setExtraction({
        loading: false,
        fileName: note.fileName || note.title,
        text: '',
        pageCount: 1,
        charCount: 0,
        isScanned: false
      });
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedFile && !selectedSmartNote) {
      setErrorMessage('Please upload a PDF or select an existing document from Smart Notes.');
      return;
    }

    setGenerating(true);
    setGenerationStep(1);

    try {
      let fileToProcess = selectedFile || extraction?.fileBlob;
      let targetName = selectedFile ? selectedFile.name : selectedSmartNote?.fileName || 'Document.pdf';

      // If smart note selected and blob not yet cached, fetch it
      if (selectedSmartNote && !fileToProcess) {
        targetName = selectedSmartNote.fileName || selectedSmartNote.title || 'SmartNote.pdf';
        try {
          let downloadUrl = selectedSmartNote.previewUrl;
          if (getPreviewUrl) {
            const signed = await getPreviewUrl(selectedSmartNote);
            if (signed) downloadUrl = signed;
          }

          if (downloadUrl) {
            const resp = await fetch(downloadUrl);
            const blob = await resp.blob();
            fileToProcess = new File([blob], targetName, { type: 'application/pdf' });
          }
        } catch (fetchErr) {
          console.warn('Smart note fetch error:', fetchErr);
        }
      }

      // If saveToNotes is checked and a new file was uploaded, upload to Smart Notes vault
      if (selectedFile && saveToNotes && uploadNoteFiles) {
        uploadNoteFiles([selectedFile], {
          subject: subject || 'Quiz Material',
          title: selectedFile.name.replace(/\.pdf$/i, ''),
          topic: 'PDF Quiz Source'
        }).catch((upErr) => console.warn('Background note upload notice:', upErr));
      }

      // Step 2: Formulating questions with Gemini
      setGenerationStep(2);

      const result = await onGenerateQuiz({
        file: fileToProcess,
        pdfText: extraction?.text || '',
        fileName: targetName,
        numQuestions,
        difficulty,
        questionType,
        subject: subject || selectedSmartNote?.subject || '',
      });

      if (result?.success && result.quiz) {
        setGenerationStep(3);
        setTimeout(() => {
          if (onQuizReady) {
            onQuizReady(result.quiz);
          }
          handleClose();
        }, 400);
      } else {
        setErrorMessage(result?.error || 'Failed to generate quiz. Please check the document and try again.');
        setGenerating(false);
      }
    } catch (err) {
      console.error('Quiz generation exception:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during quiz generation.');
      setGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Practice Quiz from PDF (Google Gemini)"
      maxWidth="680px"
    >
      <form onSubmit={handleGenerate} className="pdf-quiz-generator-form">
        {/* Error Banner */}
        {errorMessage && (
          <div className="generator-error-banner">
            <AlertCircle size={18} className="error-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Document Source Selection */}
        <div className="generator-source-tabs">
          <button
            type="button"
            className={`source-tab-btn ${sourceType === 'upload' ? 'active' : ''}`}
            onClick={() => setSourceType('upload')}
            disabled={generating}
          >
            <UploadCloud size={16} /> Upload New PDF
          </button>
          <button
            type="button"
            className={`source-tab-btn ${sourceType === 'smart_notes' ? 'active' : ''}`}
            onClick={() => setSourceType('smart_notes')}
            disabled={generating}
          >
            <FolderOpen size={16} /> Select from Smart Notes ({smartNotePdfs.length})
          </button>
        </div>

        {sourceType === 'upload' ? (
          /* Drag & Drop Upload Zone */
          <div
            className={`pdf-dropzone ${dragActive ? 'dropzone-active' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => !generating && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              disabled={generating}
            />

            <div className="pdf-dropzone-icon">
              <FileText size={36} color={selectedFile ? '#10B981' : '#DC2626'} />
            </div>

            {selectedFile ? (
              <div className="selected-pdf-badge-info">
                <span className="selected-pdf-name">{selectedFile.name}</span>
                <span className="selected-pdf-size">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm change-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={generating}
                >
                  Change File
                </button>
              </div>
            ) : (
              <div className="pdf-dropzone-prompt">
                <h4>{dragActive ? 'Drop your study PDF here' : 'Drop your study PDF or click to browse'}</h4>
                <p>Supports lecture slides, textbook chapters, formula sheets & scanned PDFs (up to 20MB).</p>
                <button type="button" className="btn btn-secondary btn-sm" disabled={generating}>
                  Browse PDF
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Select from Smart Notes Vault */
          <div className="smart-notes-picker-container">
            {smartNotePdfs.length > 0 ? (
              <div className="smart-notes-picker-grid">
                {smartNotePdfs.map((note) => {
                  const isSelected = selectedSmartNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      className={`smart-note-pick-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => !generating && handleSelectSmartNote(note)}
                    >
                      <div className="pick-card-icon">
                        <FileText size={20} color="#DC2626" />
                      </div>
                      <div className="pick-card-meta">
                        <span className="pick-card-title" title={note.title || note.fileName}>
                          {note.title || note.fileName}
                        </span>
                        <div className="pick-card-sub">
                          {note.subject && <span>{note.subject}</span>}
                          <span>• {(note.fileSize ? (note.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : 'PDF')}</span>
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 size={18} className="pick-check-icon" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-smart-notes-notice">
                <FolderOpen size={32} color="#94A3B8" />
                <p>No PDFs found in your Smart Notes Vault.</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSourceType('upload')}
                >
                  Upload a PDF from computer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Document Content Extraction Status Card */}
        {extraction && (
          <div className={`extraction-status-card ${extraction.loading ? 'is-loading' : extraction.isScanned ? 'is-scanned' : 'is-ready'}`}>
            <div className="extraction-status-icon">
              {extraction.loading ? (
                <div className="extraction-mini-spinner" />
              ) : extraction.isScanned ? (
                <Sparkles size={18} className="text-amber" />
              ) : (
                <CheckCircle2 size={18} className="text-emerald" />
              )}
            </div>
            <div className="extraction-status-text">
              <span className="status-title">
                {extraction.loading
                  ? 'Extracting PDF content & page structure...'
                  : extraction.isScanned
                  ? 'Scanned / Image-based document detected'
                  : `Successfully extracted ${extraction.pageCount} page${extraction.pageCount > 1 ? 's' : ''} (${extraction.charCount.toLocaleString()} characters)`}
              </span>
              <span className="status-sub">
                {extraction.loading
                  ? 'Parsing text layers and analyzing question viability...'
                  : extraction.isScanned
                  ? 'Gemini vision OCR will process document pages directly.'
                  : 'Document text verified. Questions will be strictly grounded in this material.'}
              </span>
            </div>
          </div>
        )}

        {/* Optional: Save to Smart Notes Vault toggle */}
        {selectedFile && uploadNoteFiles && (
          <div className="save-notes-toggle-row">
            <label className="save-notes-checkbox-label">
              <input
                type="checkbox"
                checked={saveToNotes}
                onChange={(e) => setSaveToNotes(e.target.checked)}
                disabled={generating}
              />
              <span>Also keep a permanent copy of this PDF in my Smart Notes vault</span>
            </label>
          </div>
        )}

        {/* Step 2: Quiz Customisation Parameters */}
        <div className="generator-settings-card">
          <h4 className="settings-section-title">
            <Sparkles size={16} /> Quiz Customisation
          </h4>

          <div className="settings-options-grid">
            {/* Number of Questions */}
            <div className="setting-option-block">
              <label className="setting-label">Number of Questions</label>
              <div className="pill-selector-group">
                {[5, 10, 15, 20].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    className={`pill-choice-btn ${numQuestions === cnt ? 'active' : ''}`}
                    onClick={() => setNumQuestions(cnt)}
                    disabled={generating}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level */}
            <div className="setting-option-block">
              <label className="setting-label">Difficulty Level</label>
              <div className="pill-selector-group">
                {['Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    className={`pill-choice-btn ${difficulty === diff ? 'active' : ''}`}
                    onClick={() => setDifficulty(diff)}
                    disabled={generating}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Type */}
            <div className="setting-option-block">
              <label className="setting-label">Question Format</label>
              <div className="pill-selector-group">
                {[
                  { id: 'MCQ', label: 'Multiple Choice (4 Options)' },
                  { id: 'True/False', label: 'True / False' },
                  { id: 'Mixed', label: 'Mixed Format' }
                ].map((qt) => (
                  <button
                    key={qt.id}
                    type="button"
                    className={`pill-choice-btn ${questionType === qt.id ? 'active' : ''}`}
                    onClick={() => setQuestionType(qt.id)}
                    disabled={generating}
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Course / Subject */}
            <div className="setting-option-block">
              <label className="setting-label">Subject / Topic Tag (Optional)</label>
              <input
                type="text"
                className="form-input form-input-sm"
                placeholder="e.g. Distributed Systems, Calculus III"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={generating}
              />
            </div>
          </div>
        </div>

        {/* Step 3: Generation Progress State */}
        {generating && (
          <div className="generation-progress-box">
            <div className="progress-spinner-ring"></div>
            <div className="progress-step-details">
              <h4>
                {generationStep === 1 && 'Extracting document text & scanned pages...'}
                {generationStep === 2 && 'Generating questions strictly from PDF via Gemini...'}
                {generationStep === 3 && 'Verifying answer explanations & assembling quiz...'}
              </h4>
              <p>Analyzing study material grounded strictly in your uploaded PDF without hallucinations.</p>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="generator-modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={generating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary generate-submit-btn"
            disabled={generating || (!selectedFile && !selectedSmartNote)}
          >
            <Sparkles size={16} />
            {generating ? 'Generating Quiz...' : `Generate ${numQuestions}-Question Quiz`}
          </button>
        </div>
      </form>
    </Modal>
  );
};
