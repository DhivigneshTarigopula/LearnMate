import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  Brain,
  ListOrdered,
  Layers,
  MessageSquare,
  Copy,
  Check,
  Download,
  RotateCcw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { generateNoteStudyMaterial } from '../../lib/geminiScheduleExtractor';
import { useApp } from '../../context/AppContext';
import './AiNoteAssistantModal.css';

export const AiNoteAssistantModal = ({
  isOpen,
  onClose,
  note,
  onLaunchQuiz,
  onAskDoubt
}) => {
  const { session } = useApp();
  const [activeAction, setActiveAction] = useState('summarize');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const noteTitle = note?.title || note?.fileName || 'Untitled Note';
  const noteSubject = note?.subject || 'General Studies';
  const noteContent = note?.content || note?.description || '';

  const handleGenerate = useCallback(async (actionType) => {
    setActiveAction(actionType);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await generateNoteStudyMaterial({
        action: actionType,
        noteTitle,
        noteSubject,
        noteContent,
        file: note?.fileBlob || null,
        session
      });
      setResult(res);
    } catch (err) {
      console.error('Note AI Generation failed:', err);
      setError('Unable to analyze note with Gemini AI. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [noteTitle, noteSubject, noteContent, note?.fileBlob, session]);

  // Reset state and generate initial summary when modal opens with a valid note
  useEffect(() => {
    if (isOpen && note) {
      setCopied(false);
      handleGenerate('summarize');
    }
  }, [isOpen, note, handleGenerate]);

  if (!isOpen || !note) return null;

  const handleCopy = () => {
    if (!result?.markdown) return;
    navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.markdown) return;
    const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${noteTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${activeAction}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const actions = [
    {
      id: 'summarize',
      label: 'Summarize Notes',
      icon: BookOpen,
      desc: 'Concise takeaways, formulas & key concepts'
    },
    {
      id: 'explain',
      label: 'Explain Topics',
      icon: Brain,
      desc: 'Simple analogies & intuitive deep-dives'
    },
    {
      id: 'mcqs',
      label: 'Generate MCQs',
      icon: ListOrdered,
      desc: '5 practice questions with explanations'
    },
    {
      id: 'important_questions',
      label: 'Important Questions',
      icon: HelpCircle,
      desc: 'High-yield exam questions & model answers'
    },
    {
      id: 'quiz',
      label: 'Create Quiz',
      icon: Sparkles,
      desc: 'Interactive quiz based on this document',
      isExternal: true
    },
    {
      id: 'doubt',
      label: 'Ask Doubt Solver',
      icon: MessageSquare,
      desc: 'Chat & solve doubts with note context',
      isExternal: true
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
    >
      <div className="ai-note-modal-wrap">
        {/* Header with Title and Subject */}
        <div className="ai-note-header">
          <div className="ai-note-badge">
            <Sparkles size={16} />
            <span>AI Study Assistant</span>
          </div>
          <h2 className="ai-note-title">{noteTitle}</h2>
          <div className="ai-note-meta">
            <span className="badge-subject"><BookOpen size={13} /> {noteSubject}</span>
            {note.module && <span className="badge-module"><Layers size={13} /> {note.module}</span>}
            <span className="badge-type">{note.fileExt ? note.fileExt.toUpperCase() : 'NOTE'}</span>
          </div>
        </div>

        {/* Action Selection Grid */}
        <div className="ai-actions-grid">
          {actions.map((act) => {
            const Icon = act.icon;
            const isActive = activeAction === act.id;
            return (
              <button
                key={act.id}
                type="button"
                className={`ai-action-card ${isActive ? 'active' : ''} ${act.isExternal ? 'action-nav' : ''}`}
                onClick={() => {
                  if (act.id === 'quiz') {
                    onClose();
                    if (onLaunchQuiz) onLaunchQuiz(note);
                  } else if (act.id === 'doubt') {
                    onClose();
                    if (onAskDoubt) onAskDoubt(note);
                  } else {
                    handleGenerate(act.id);
                  }
                }}
              >
                <div className="action-icon-wrap">
                  <Icon size={18} />
                </div>
                <div className="action-text-wrap">
                  <span className="action-label">
                    {act.label}
                    {act.isExternal && <ExternalLink size={12} className="nav-arrow" />}
                  </span>
                  <span className="action-desc">{act.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="ai-note-body">
          {loading ? (
            <div className="ai-note-loading">
              <div className="ai-pulse-scanner">
                <div className="scanner-line"></div>
                <Sparkles size={36} className="scanner-sparkle" />
              </div>
              <h4>Analyzing notes with Gemini AI...</h4>
              <p>Extracting key concepts, formulas, and high-yield insights for your study session</p>
            </div>
          ) : error ? (
            <div className="ai-note-error">
              <AlertCircle size={32} color="#DC6666" />
              <h4>Processing Issue</h4>
              <p>{error}</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleGenerate(activeAction)}
              >
                <RotateCcw size={14} /> Try Again
              </button>
            </div>
          ) : result ? (
            <div className="ai-note-result-container">
              <div className="result-toolbar">
                <span className="result-heading">{result.title}</span>
                <div className="result-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopy}
                    title="Copy markdown content"
                  >
                    {copied ? <Check size={14} color="#32A889" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDownload}
                    title="Download as markdown file"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleGenerate(activeAction)}
                    title="Regenerate response"
                  >
                    <RotateCcw size={14} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              <div className="result-markdown-body">
                <MarkdownRenderer content={result.markdown} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="ai-note-footer">
          <span className="footer-ai-note">Powered by Gemini AI • LearnMate Vault</span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

