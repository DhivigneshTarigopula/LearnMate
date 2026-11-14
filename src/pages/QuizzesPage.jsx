import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Play,
  RotateCcw,
  CheckCircle2,
  Award,
  Clock,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  History,
  Check,
  X,
  Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import { PdfQuizGeneratorModal } from '../components/quizzes/PdfQuizGeneratorModal';
import './QuizzesPage.css';

const formatAttemptDate = (dateVal) => {
  if (!dateVal) return 'Recent';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const QuizzesPage = () => {
  const {
    // Manual quizzes
    quizzes = [],
    quizScores = {},
    saveQuizResult,
    addQuiz,
    deleteQuiz,
    // PDF Generated Quizzes & Attempts
    generatedQuizzes = [],
    quizAttempts = [],
    generateQuizFromPdf,
    saveQuizAttempt,
    deleteGeneratedQuiz,
    deleteQuizAttempt,
    // Smart notes (PDFs)
    noteFiles = [],
    getNoteFilePreviewUrl,
    uploadNoteFiles
  } = useApp();

  // Active view tab: 'catalogue' | 'history'
  const [activeTab, setActiveTab] = useState('catalogue');

  // Active quiz session runner state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'incorrect' | 'correct'

  // Modals state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Form State for creating custom manual quizzes (preserved)
  const [form, setForm] = useState({
    title: '',
    category: '',
    difficulty: 'Intermediate',
    questions: [
      {
        id: 'q_1',
        question: '',
        options: ['', '', '', ''],
        answer: 0,
        explanation: ''
      }
    ]
  });

  // Filter smart notes that are PDFs
  const smartNotePdfs = useMemo(() => {
    return (noteFiles || []).filter((f) => f.fileExt?.toLowerCase() === 'pdf' || f.fileType?.includes('pdf'));
  }, [noteFiles]);

  // Combined quizzes list (both manual quizzes and PDF-generated quizzes)
  const allQuizzes = useMemo(() => {
    const formattedManual = (quizzes || []).map((q) => ({
      ...q,
      isGenerated: false,
      questionsCount: q.questions?.length || q.questionsCount || 0,
      sourceType: 'Manual',
    }));

    const formattedGenerated = (generatedQuizzes || []).map((g) => ({
      ...g,
      isGenerated: true,
      category: g.subject || 'PDF Study Material',
      questionsCount: g.questions?.length || g.numQuestions || 0,
      durationMinutes: Math.max(3, Math.round((g.questions?.length || 5) * 1.5)),
      badgeColor: 'lavender',
      sourceType: 'AI Generated (Gemini)',
    }));

    return [...formattedGenerated, ...formattedManual];
  }, [quizzes, generatedQuizzes]);

  // Start quiz session
  const handleStartQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setReviewFilter('all');
  };

  const handleSelectOption = (qId, optionIdx) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optionIdx
    }));
  };

  const calculateScore = () => {
    if (!activeQuiz || !activeQuiz.questions) return 0;
    let score = 0;
    activeQuiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.answer) {
        score += 1;
      }
    });
    return score;
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    setIsSubmitted(true);
    const score = calculateScore();
    const total = activeQuiz.questions.length;

    // Save attempt using new full attempt history
    await saveQuizAttempt({
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      subject: activeQuiz.subject || activeQuiz.category || 'General',
      score,
      total,
      answers: selectedAnswers,
    });

    // Also call legacy saveQuizResult for compatibility
    if (saveQuizResult) {
      saveQuizResult(
        activeQuiz.id,
        score,
        total,
        activeQuiz.title,
        activeQuiz.subject || activeQuiz.category
      );
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setReviewFilter('all');
  };

  // Manual quiz form handlers
  const handleOpenManualModal = () => {
    setForm({
      title: '',
      category: '',
      difficulty: 'Intermediate',
      questions: [
        {
          id: `q_${Date.now()}_1`,
          question: '',
          options: ['', '', '', ''],
          answer: 0,
          explanation: ''
        }
      ]
    });
    setIsManualModalOpen(true);
  };

  const handleAddQuestionRow = () => {
    setForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q_${Date.now()}_${prev.questions.length + 1}`,
          question: '',
          options: ['', '', '', ''],
          answer: 0,
          explanation: ''
        }
      ]
    }));
  };

  const handleRemoveQuestionRow = (idx) => {
    if (form.questions.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx)
    }));
  };

  const handleQuestionFieldChange = (idx, field, value) => {
    setForm((prev) => {
      const updated = [...prev.questions];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, questions: updated };
    });
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    setForm((prev) => {
      const updated = [...prev.questions];
      const opts = [...updated[qIdx].options];
      opts[optIdx] = value;
      updated[qIdx] = { ...updated[qIdx], options: opts };
      return { ...prev, questions: updated };
    });
  };

  const handleCreateManualQuizSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const validQuestions = form.questions.filter((q) => q.question.trim());
    if (validQuestions.length === 0) return;

    addQuiz({
      title: form.title.trim(),
      category: form.category.trim() || 'General',
      difficulty: form.difficulty,
      questions: validQuestions.map((q) => ({
        ...q,
        options: q.options.map((opt, i) => opt.trim() || `Option ${String.fromCharCode(65 + i)}`)
      }))
    });

    setIsManualModalOpen(false);
  };

  const handleDeleteQuizItem = (quiz) => {
    if (!window.confirm(`Delete quiz "${quiz.title}"?`)) return;
    if (quiz.isGenerated) {
      deleteGeneratedQuiz(quiz.id);
    } else {
      deleteQuiz(quiz.id);
    }
  };

  return (
    <div className="quizzes-page">
      {/* Page Header */}
      <div className="page-header-row quizzes-header-row">
        <div>
          <div className="header-badge-row">
            <span className="badge badge-primary">Practice & Mastery</span>
            <span className="header-stats-pill">
              {allQuizzes.length} Quizzes Available • {quizAttempts.length} Attempts Logged
            </span>
          </div>
          <h2>Interactive Revision Quizzes</h2>
          <p className="page-sub">
            Generate quizzes automatically from your study PDFs with Gemini or build manual concept tests.
          </p>
        </div>

        {!activeQuiz && (
          <div className="quizzes-top-actions">
            <button
              className="btn btn-primary pdf-quiz-action-btn"
              onClick={() => setIsPdfModalOpen(true)}
            >
              <Sparkles size={17} /> Generate Quiz from PDF
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleOpenManualModal}
            >
              <Plus size={17} /> Create Manual Quiz
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Switcher (Visible when not actively running a quiz) */}
      {!activeQuiz && (
        <div className="quizzes-tabs-bar">
          <div className="quizzes-tab-group">
            <button
              className={`quizzes-tab-btn ${activeTab === 'catalogue' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalogue')}
            >
              <HelpCircle size={16} /> Quiz Library ({allQuizzes.length})
            </button>
            <button
              className={`quizzes-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={16} /> Attempt History ({quizAttempts.length})
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: QUIZ RUNNER (LIVE ACTIVE QUIZ) */}
      {/* ========================================================================= */}
      {activeQuiz ? (
        <div className="quiz-runner-container">
          <div className="quiz-runner-card card">
            {/* Top Bar */}
            <div className="runner-top-bar">
              <div className="runner-title-group">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm back-to-list-btn"
                  onClick={() => setActiveQuiz(null)}
                >
                  ← Back to Library
                </button>
                <div className="runner-meta-line">
                  <span className="badge badge-primary">
                    {activeQuiz.subject || activeQuiz.category || 'Revision'}
                  </span>
                  <span className="badge badge-neutral">{activeQuiz.difficulty || 'Medium'}</span>
                  {activeQuiz.sourcePdfName && (
                    <span className="badge badge-lavender source-doc-badge">
                      <FileText size={11} /> {activeQuiz.sourcePdfName}
                    </span>
                  )}
                </div>
                <h3 className="runner-quiz-title">{activeQuiz.title}</h3>
              </div>

              <div className="runner-counter-badge">
                Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
              </div>
            </div>

            {/* Progress Tracker Bar */}
            <div className="quiz-progress-section">
              <div className="progress-track runner-track">
                <div
                  className="progress-fill runner-fill"
                  style={{
                    width: `${((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100}%`
                  }}
                ></div>
              </div>

              {/* Question Jump Palette */}
              <div className="question-jump-palette">
                {activeQuiz.questions.map((q, idx) => {
                  const isAnswered = selectedAnswers[q.id] !== undefined;
                  const isCurrent = idx === currentQuestionIdx;
                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      className={`jump-pill ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      title={`Jump to Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {!isSubmitted ? (
              /* Single Question Display */
              <div className="question-interactive-view">
                {(() => {
                  const q = activeQuiz.questions[currentQuestionIdx];
                  if (!q) return null;
                  const chosen = selectedAnswers[q.id];

                  return (
                    <div className="single-question-box">
                      <div className="question-header-row">
                        <span className="question-num-tag">QUESTION {currentQuestionIdx + 1}</span>
                      </div>

                      <h4 className="question-text">{q.question}</h4>

                      <div className="options-list">
                        {(q.options || []).map((opt, optIdx) => {
                          const isSelected = chosen === optIdx;
                          const letter = String.fromCharCode(65 + optIdx);

                          return (
                            <div
                              key={optIdx}
                              className={`quiz-option-row ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectOption(q.id, optIdx)}
                            >
                              <span className="option-marker">{letter}</span>
                              <span className="option-text">{opt}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="question-nav-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={currentQuestionIdx === 0}
                          onClick={() => setCurrentQuestionIdx((prev) => prev - 1)}
                        >
                          <ChevronLeft size={16} /> Previous
                        </button>

                        <div className="nav-right-actions">
                          {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
                            >
                              Next Question <ChevronRight size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary submit-quiz-btn"
                              onClick={handleSubmitQuiz}
                            >
                              <CheckCircle2 size={16} /> Submit Quiz
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Quiz Results & Detailed Review Screen */
              <div className="quiz-result-summary">
                <div className="score-trophy-box">
                  <div className="trophy-circle">
                    <Award size={48} color="#52796F" />
                  </div>
                  <h3>Quiz Completed!</h3>
                  <div className="score-number-display">
                    Score: {calculateScore()} / {activeQuiz.questions.length} (
                    {Math.round((calculateScore() / activeQuiz.questions.length) * 100)}%)
                  </div>
                  <p className="score-feedback">
                    {calculateScore() === activeQuiz.questions.length
                      ? '🌟 Outstanding! You scored 100% on this study material.'
                      : calculateScore() >= activeQuiz.questions.length * 0.7
                      ? '🎉 Great job! You have demonstrated strong conceptual understanding.'
                      : 'Keep going! Review the factual explanations below to master the topic.'}
                  </p>
                </div>

                {/* Review Filter Pills */}
                <div className="review-filters-bar">
                  <span className="review-label">Filter Review:</span>
                  <div className="filter-pills-wrap">
                    <button
                      className={`type-pill ${reviewFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('all')}
                    >
                      All ({activeQuiz.questions.length})
                    </button>
                    <button
                      className={`type-pill ${reviewFilter === 'incorrect' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('incorrect')}
                    >
                      Incorrect ({activeQuiz.questions.filter((q) => selectedAnswers[q.id] !== q.answer).length})
                    </button>
                    <button
                      className={`type-pill ${reviewFilter === 'correct' ? 'active' : ''}`}
                      onClick={() => setReviewFilter('correct')}
                    >
                      Correct ({calculateScore()})
                    </button>
                  </div>
                </div>

                {/* Explanations Review Cards */}
                <div className="answers-review-list">
                  {activeQuiz.questions
                    .filter((q) => {
                      const isCorrect = selectedAnswers[q.id] === q.answer;
                      if (reviewFilter === 'incorrect') return !isCorrect;
                      if (reviewFilter === 'correct') return isCorrect;
                      return true;
                    })
                    .map((q, idx) => {
                      const isCorrect = selectedAnswers[q.id] === q.answer;
                      return (
                        <div
                          key={q.id || idx}
                          className={`review-question-card ${isCorrect ? 'correct' : 'incorrect'}`}
                        >
                          <div className="review-q-header">
                            <span className="review-q-title">
                              {idx + 1}. {q.question}
                            </span>
                            {isCorrect ? (
                              <span className="badge badge-emerald">
                                <Check size={12} /> Correct (+1)
                              </span>
                            ) : (
                              <span className="badge badge-danger">
                                <X size={12} /> Incorrect
                              </span>
                            )}
                          </div>

                          <div className="review-meta">
                            <p className="your-ans-text">
                              <strong>Your Answer:</strong>{' '}
                              {selectedAnswers[q.id] !== undefined
                                ? `${String.fromCharCode(65 + selectedAnswers[q.id])}. ${q.options[selectedAnswers[q.id]]}`
                                : 'Not answered'}
                            </p>
                            {!isCorrect && (
                              <p className="correct-ans-text">
                                <strong>Correct Answer:</strong>{' '}
                                {String.fromCharCode(65 + q.answer)}. {q.options[q.answer]}
                              </p>
                            )}
                            {q.explanation && (
                              <div className="explanation-box">
                                <strong>Document Explanation:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="quiz-result-actions">
                  <button className="btn btn-secondary btn-lg" onClick={handleResetQuiz}>
                    <RotateCcw size={18} /> Retake Quiz
                  </button>
                  <button className="btn btn-primary btn-lg" onClick={() => setActiveQuiz(null)}>
                    Back to All Quizzes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'catalogue' ? (
        /* ========================================================================= */
        /* VIEW 2: QUIZ LIBRARY / CATALOGUE */
        /* ========================================================================= */
        allQuizzes.length > 0 ? (
          <div className="quiz-catalogue-grid">
            {allQuizzes.map((quiz) => {
              const pastResult = quizScores[quiz.id];

              return (
                <div key={quiz.id} className="quiz-card card card-lift">
                  <div className="quiz-card-top">
                    <div className="card-top-left-badges">
                      <span className={`badge badge-${quiz.badgeColor || 'primary'}`}>
                        {quiz.category || quiz.subject}
                      </span>
                      {quiz.isGenerated && (
                        <span className="badge badge-emerald gemini-badge">
                          <Sparkles size={11} /> Gemini
                        </span>
                      )}
                    </div>
                    <div className="card-top-right-actions">
                      <span className="badge badge-neutral">{quiz.difficulty || 'Medium'}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-delete-quiz"
                        onClick={() => handleDeleteQuizItem(quiz)}
                        title="Delete quiz"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="quiz-card-main">
                    <h3 title={quiz.title}>{quiz.title}</h3>
                    {quiz.sourcePdfName && (
                      <div className="source-pdf-tag">
                        <FileText size={12} color="#DC2626" />
                        <span>Source: {quiz.sourcePdfName}</span>
                      </div>
                    )}
                    <div className="quiz-details-row">
                      <span className="quiz-detail">
                        <HelpCircle size={15} /> {quiz.questionsCount || quiz.questions?.length || 0} Questions
                      </span>
                      <span className="quiz-detail">
                        <Clock size={15} /> ~{quiz.durationMinutes || 5} Min
                      </span>
                    </div>
                  </div>

                  {pastResult && (
                    <div className="quiz-score-banner">
                      <Award size={16} color="#10B981" />
                      <span>
                        Best Score: <strong>{pastResult.score}/{pastResult.total}</strong> ({pastResult.percentage}%)
                      </span>
                    </div>
                  )}

                  <div className="quiz-card-footer">
                    <button
                      className="btn btn-primary start-quiz-full-btn"
                      onClick={() => handleStartQuiz(quiz)}
                    >
                      <Play size={16} fill="white" /> {pastResult ? 'Retake Quiz' : 'Start Quiz'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Quizzes State */
          <div className="empty-quiz-state card">
            <div className="empty-quiz-icon-circle">
              <Sparkles size={42} />
            </div>
            <h3>No quizzes created yet</h3>
            <p>
              Upload any lecture PDF or textbook chapter to instantly generate a custom practice quiz using Google Gemini, or create a quiz manually.
            </p>
            <div className="empty-quiz-actions">
              <button
                className="btn btn-primary"
                onClick={() => setIsPdfModalOpen(true)}
              >
                <Sparkles size={16} /> Generate Quiz from PDF
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleOpenManualModal}
              >
                <Plus size={16} /> Create Manual Quiz
              </button>
            </div>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* VIEW 3: QUIZ ATTEMPT HISTORY */
        /* ========================================================================= */
        <div className="quiz-history-section">
          {quizAttempts.length > 0 ? (
            <div className="card history-table-card">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Quiz Title</th>
                    <th>Subject</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizAttempts.map((att) => {
                    const matchedQuiz = allQuizzes.find((q) => q.id === att.quizId);

                    return (
                      <tr key={att.id} className="history-table-row">
                        <td className="history-date-cell">
                          <Calendar size={14} className="cell-date-icon" />
                          <span>
                            {formatAttemptDate(att.completedAt)}
                          </span>
                        </td>
                        <td className="history-title-cell">
                          <strong>{att.quizTitle}</strong>
                        </td>
                        <td>
                          <span className="badge badge-neutral">{att.subject || 'General'}</span>
                        </td>
                        <td className="history-score-cell">
                          {att.score} / {att.totalQuestions}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              att.percentage >= 80
                                ? 'badge-emerald'
                                : att.percentage >= 50
                                ? 'badge-primary'
                                : 'badge-danger'
                            }`}
                          >
                            {att.percentage}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="history-actions-cell">
                            {matchedQuiz && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStartQuiz(matchedQuiz)}
                                title="Retake this quiz"
                              >
                                <RotateCcw size={14} /> Retake
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm btn-delete-history"
                              onClick={() => deleteQuizAttempt(att.id)}
                              title="Delete attempt"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-quiz-state card">
              <History size={48} color="#94A3B8" />
              <h3>No quiz attempts recorded yet</h3>
              <p>Complete a quiz from your library or generate one from a PDF to track your test scores and recall history.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setActiveTab('catalogue');
                  setIsPdfModalOpen(true);
                }}
              >
                <Sparkles size={16} /> Take a Quiz
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. PDF-to-Quiz Generator Modal */}
      <PdfQuizGeneratorModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        smartNotePdfs={smartNotePdfs}
        onGenerateQuiz={generateQuizFromPdf}
        getPreviewUrl={getNoteFilePreviewUrl}
        uploadNoteFiles={uploadNoteFiles}
        onQuizReady={(newQuiz) => {
          setIsPdfModalOpen(false);
          handleStartQuiz(newQuiz);
        }}
      />

      {/* 2. Create Manual Quiz Modal (Preserved) */}
      <Modal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} title="Create Practice Quiz">
        <form onSubmit={handleCreateManualQuizSubmit}>
          <div className="form-group">
            <label className="form-label">Quiz Title *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Data Structures & Hash Tables"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Subject / Topic</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Computer Science"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select
                className="form-select"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Dynamic Questions List */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Questions ({form.questions.length})</label>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddQuestionRow}>
                <Plus size={14} /> Add Question
              </button>
            </div>

            {form.questions.map((q, qIdx) => (
              <div key={q.id} style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Question {qIdx + 1}</span>
                  {form.questions.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#EF4444', padding: '0.2rem' }}
                      onClick={() => handleRemoveQuestionRow(qIdx)}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Enter question text..."
                  value={q.question}
                  onChange={(e) => handleQuestionFieldChange(qIdx, 'question', e.target.value)}
                  style={{ marginBottom: '0.75rem' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {q.options.map((opt, optIdx) => (
                    <input
                      key={optIdx}
                      type="text"
                      className="form-input form-input-sm"
                      placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                    />
                  ))}
                </div>

                <div className="form-row-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Correct Answer Option</label>
                    <select
                      className="form-select form-select-sm"
                      value={q.answer}
                      onChange={(e) => handleQuestionFieldChange(qIdx, 'answer', Number(e.target.value))}
                    >
                      <option value={0}>Option A</option>
                      <option value={1}>Option B</option>
                      <option value={2}>Option C</option>
                      <option value={3}>Option D</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Explanation (optional)</label>
                    <input
                      type="text"
                      className="form-input form-input-sm"
                      placeholder="Why this answer is correct..."
                      value={q.explanation}
                      onChange={(e) => handleQuestionFieldChange(qIdx, 'explanation', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsManualModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save & Publish Quiz
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
