import React, { useState, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  Award,
  Sparkles,
  AlertTriangle,
  Flame,
  CheckSquare,
  BookOpen
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import { AiExamUploadModal } from '../components/exams/AiExamUploadModal';
import { getDayOfWeekFromDate } from '../lib/dsuExamData';
import './ExamPlannerPage.css';

const getDefaultExamDate = () => {
  const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
};

export const ExamPlannerPage = () => {
  const {
    exams = [],
    addExam,
    updateExam,
    toggleExamTopic,
    deleteExam,
    studyTasks = [],
    toggleStudyTask
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);

  // Manual Add Form State
  const [form, setForm] = useState({
    subject: '',
    code: '',
    examName: '',
    date: getDefaultExamDate(),
    time: '10:45 AM - 12:00 PM',
    venue: '',
    weight: '30%',
    topicsString: ''
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    subject: '',
    code: '',
    examName: '',
    date: '',
    time: '',
    venue: '',
    weight: '',
    topicsString: ''
  });

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Chronologically sort exams (by date, then by start time/session)
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      if (dateA !== dateB) return dateA - dateB;

      // Same date: Morning papers before Afternoon papers
      const timeA = (a.startTime || a.time || '').toUpperCase();
      const timeB = (b.startTime || b.time || '').toUpperCase();
      if (timeA.includes('AM') && timeB.includes('PM')) return -1;
      if (timeA.includes('PM') && timeB.includes('AM')) return 1;
      return timeA.localeCompare(timeB);
    });
  }, [exams]);

  // Compute Upcoming & Completed examinations
  const { upcomingExams, completedExams, nextExam, countdownInfo } = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const completed = [];

    sortedExams.forEach((exam) => {
      const examDate = new Date(exam.date);
      examDate.setHours(23, 59, 59, 999);
      if (examDate >= now) {
        upcoming.push(exam);
      } else {
        completed.push(exam);
      }
    });

    const next = upcoming.length > 0 ? upcoming[0] : null;

    let countdown = null;
    if (next && next.date) {
      let targetDate = new Date(next.date);
      targetDate.setHours(10, 0, 0, 0);

      // Parse hours if available
      const timeStr = next.startTime || (next.time ? next.time.split('-')[0]?.trim() : '');
      if (timeStr) {
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const isPm = (match[3] || '').toUpperCase() === 'PM';
          if (isPm && h < 12) h += 12;
          if (!isPm && h === 12) h = 0;
          targetDate.setHours(h, m, 0, 0);
        }
      }

      const diffMs = targetDate.getTime() - now.getTime();
      const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const totalHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      let urgency = 'normal';
      let badgeLabel = '';

      if (diffMs <= 0) {
        urgency = 'today';
        badgeLabel = 'Exam in progress or today';
      } else if (totalDays === 0) {
        urgency = 'today';
        badgeLabel = `Today in ${totalHours}h`;
      } else if (totalDays === 1) {
        urgency = 'critical';
        badgeLabel = `Tomorrow (${totalHours}h left)`;
      } else if (totalDays <= 3) {
        urgency = 'critical';
        badgeLabel = `${totalDays}d ${totalHours}h left`;
      } else if (totalDays <= 7) {
        urgency = 'soon';
        badgeLabel = `${totalDays} days left`;
      } else {
        urgency = 'normal';
        badgeLabel = `${totalDays} days left`;
      }

      countdown = {
        days: totalDays,
        hours: totalHours,
        urgency,
        badgeLabel
      };
    }

    return {
      upcomingExams: upcoming,
      completedExams: completed,
      nextExam: next,
      countdownInfo: countdown
    };
  }, [sortedExams]);

  const getDaysRemaining = useCallback((examDate) => {
    if (!examDate) return 0;
    const target = new Date(examDate);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - todayMidnight) / (1000 * 60 * 60 * 24));
  }, [todayMidnight]);

  const getUrgencyClass = (daysLeft) => {
    if (daysLeft < 0) return 'countdown-passed';
    if (daysLeft === 0) return 'countdown-today';
    if (daysLeft <= 3) return 'countdown-critical';
    if (daysLeft <= 7) return 'countdown-soon';
    return 'countdown-normal';
  };

  const handleCreateExam = (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.examName.trim()) return;

    const topicsArray = form.topicsString.trim()
      ? form.topicsString
          .split(',')
          .map((t, index) => ({
            id: `top_${Date.now()}_${index}`,
            title: t.trim(),
            done: false
          }))
          .filter((t) => t.title)
      : [];

    const dayName = getDayOfWeekFromDate(form.date);

    addExam({
      subject: form.subject.trim(),
      code: form.code.trim().toUpperCase(),
      examName: form.examName.trim(),
      date: form.date,
      day: dayName,
      dayOfWeek: dayName,
      time: form.time.trim() || '10:45 AM - 12:00 PM',
      venue: form.venue.trim() || 'Main Exam Hall',
      weight: form.weight.trim() || '30%',
      topics: topicsArray
    });

    setIsModalOpen(false);
    setForm({
      subject: '',
      code: '',
      examName: '',
      date: getDefaultExamDate(),
      time: '10:45 AM - 12:00 PM',
      venue: '',
      weight: '30%',
      topicsString: ''
    });
  };

  const openEditModal = (exam) => {
    setEditingExam(exam);
    setEditForm({
      subject: exam.subject || '',
      code: exam.code || '',
      examName: exam.examName || exam.syllabus || 'Examination',
      date: exam.date || '',
      time: exam.time || '',
      venue: exam.venue || exam.room || '',
      weight: exam.weight || '30%',
      topicsString: (exam.topics || []).map((t) => t.title).join(', ')
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingExam || !editForm.subject.trim()) return;

    const topicsArray = editForm.topicsString.trim()
      ? editForm.topicsString
          .split(',')
          .map((t, idx) => ({
            id: `top_edit_${Date.now()}_${idx}`,
            title: t.trim(),
            done: false
          }))
          .filter((t) => t.title)
      : editingExam.topics || [];

    const dayName = getDayOfWeekFromDate(editForm.date);

    updateExam(editingExam.id, {
      subject: editForm.subject.trim(),
      code: editForm.code.trim().toUpperCase(),
      examName: editForm.examName.trim(),
      date: editForm.date,
      day: dayName,
      dayOfWeek: dayName,
      time: editForm.time.trim() || '10:45 AM - 12:00 PM',
      venue: editForm.venue.trim() || 'Main Exam Hall',
      weight: editForm.weight.trim() || '30%',
      topics: topicsArray
    });

    setEditingExam(null);
  };

  return (
    <div className="exam-planner-page">
      {/* Top Header */}
      <div className="page-header-row">
        <div>
          <h2>Exam Revision Planner</h2>
          <p className="page-sub">Track official examination schedules, countdowns, session timings, and syllabus preparation</p>
        </div>
        <div className="header-action-group">
          <button
            type="button"
            className="btn btn-secondary btn-ai-exam-trigger"
            onClick={() => setIsAiModalOpen(true)}
          >
            <Sparkles size={16} className="sparkle-ai-badge" /> Upload Schedule (AI)
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Schedule Exam
          </button>
        </div>
      </div>

      {/* =========================================================================
          EXAM DASHBOARD SUMMARY CARDS
          ========================================================================= */}
      <div className="exam-dashboard-stats-grid">
        {/* Card 1: Next Examination Focus Card */}
        <div className="dashboard-stat-card card card-next-exam">
          <div className="stat-card-badge">
            <Flame size={14} color="#0F766E" /> Next Examination
          </div>
          {nextExam ? (
            <div className="next-exam-details">
              <div className="next-exam-title-row">
                <span className="next-exam-code">{nextExam.code || 'PAPER'}</span>
                <h3 className="next-exam-subject">{nextExam.subject}</h3>
              </div>
              <div className="next-exam-meta-row">
                <span className="next-exam-date">
                  <Calendar size={14} /> {nextExam.date} ({nextExam.day || getDayOfWeekFromDate(nextExam.date)})
                </span>
                <span className="next-exam-time">
                  <Clock size={14} /> {nextExam.time || nextExam.startTime || '10:45 AM'}
                </span>
                <span className="next-exam-venue">
                  <MapPin size={14} /> {nextExam.venue || nextExam.room || 'Test Hall'}
                </span>
              </div>
              {countdownInfo && (
                <div className={`next-exam-countdown-pill countdown-${countdownInfo.urgency}`}>
                  <Clock size={13} />
                  <strong>{countdownInfo.badgeLabel}</strong>
                </div>
              )}
            </div>
          ) : (
            <div className="no-next-exam-placeholder">
              <GraduationCap size={24} color="#0F766E" />
              <span>All scheduled examinations completed or none planned yet.</span>
            </div>
          )}
        </div>

        {/* Card 2: Upcoming & Remaining Examinations */}
        <div className="dashboard-stat-card card stat-metric-box">
          <div className="stat-metric-icon upcoming-icon">
            <Calendar size={20} />
          </div>
          <div className="stat-metric-info">
            <span className="metric-number">{upcomingExams.length}</span>
            <span className="metric-label">Upcoming / Remaining</span>
            <span className="metric-sub">
              {upcomingExams.length > 0
                ? `${upcomingExams.length} remaining to take`
                : 'All papers completed'}
            </span>
          </div>
        </div>

        {/* Card 3: Completed Examinations */}
        <div className="dashboard-stat-card card stat-metric-box">
          <div className="stat-metric-icon completed-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-metric-info">
            <span className="metric-number">{completedExams.length}</span>
            <span className="metric-label">Completed Exams</span>
            <span className="metric-sub">
              {completedExams.length > 0
                ? `${completedExams.length} papers completed`
                : 'None completed yet'}
            </span>
          </div>
        </div>

        {/* Card 4: Total Number of Examinations */}
        <div className="dashboard-stat-card card stat-metric-box">
          <div className="stat-metric-icon total-icon">
            <CheckSquare size={20} />
          </div>
          <div className="stat-metric-info">
            <span className="metric-number">{sortedExams.length}</span>
            <span className="metric-label">Total Examinations</span>
            <span className="metric-sub">
              {sortedExams.length > 0 ? `${sortedExams.length} papers scheduled` : 'No papers registered'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Personalized Study Plan Roadmap Banner */}
      {studyTasks.length > 0 && sortedExams.length > 0 && (
        <div className="exam-study-plan-card card">
          <div className="study-plan-header">
            <div className="study-plan-title-wrap">
              <span className="plan-sparkle-icon">
                <Sparkles size={18} />
              </span>
              <div>
                <h3 className="study-plan-title">Personalized Revision Roadmap</h3>
                <p className="study-plan-sub">
                  AI-generated milestones prioritized by upcoming exam dates
                </p>
              </div>
            </div>
            <span className="badge badge-emerald">
              {studyTasks.filter((t) => t.completed).length} of {studyTasks.length} Revision Tasks Done
            </span>
          </div>

          <div className="study-plan-tasks-grid">
            {studyTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className={`study-plan-task-pill ${task.completed ? 'task-done' : ''}`}
                onClick={() => toggleStudyTask && toggleStudyTask(task.id)}
              >
                {task.completed ? (
                  <CheckCircle2 size={16} color="#0F766E" />
                ) : (
                  <Circle size={16} color="#94A3B8" />
                )}
                <div className="task-pill-content">
                  <span className="task-subject-tag">{task.subject}</span>
                  <span className="task-name">{task.task}</span>
                </div>
                {task.minutes && (
                  <span className="task-minutes-pill">
                    <Clock size={11} /> {task.minutes}m
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          CHRONOLOGICALLY SORTED EXAM CARDS GRID
          ========================================================================= */}
      {sortedExams.length > 0 ? (
        <div className="exams-grid">
          {sortedExams.map((exam) => {
            const daysLeft = getDaysRemaining(exam.date);
            const urgencyClass = getUrgencyClass(daysLeft);
            const topicsList = exam.topics || [];
            const completedTopics = topicsList.filter((t) => t.done).length;
            const totalTopics = topicsList.length;
            const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
            const isCompleted = daysLeft < 0;

            return (
              <div
                key={exam.id}
                className={`exam-card card card-lift ${isCompleted ? 'card-exam-completed' : ''}`}
              >
                <div className="exam-card-top">
                  <div className="exam-title-meta">
                    <div className="exam-badge-row">
                      {exam.code && <span className="exam-code-tag">{exam.code}</span>}
                      {exam.session && (
                        <span className={`exam-session-tag session-${exam.session.toLowerCase()}`}>
                          {exam.session}
                        </span>
                      )}
                    </div>
                    <h3>{exam.subject}</h3>
                    <span className="exam-paper-name">{exam.examName || 'Examination'}</span>
                  </div>

                  {/* Countdown Badge */}
                  <div className={`exam-countdown-box ${urgencyClass}`}>
                    <span className="countdown-number">
                      {daysLeft < 0 ? 'Passed' : daysLeft === 0 ? 'Today' : daysLeft}
                    </span>
                    <span className="countdown-label">
                      {daysLeft === 0 ? 'Exam Today' : daysLeft === 1 ? 'Day Left' : daysLeft < 0 ? 'Completed' : 'Days Left'}
                    </span>
                  </div>
                </div>

                <div className="exam-info-grid">
                  <div className="exam-info-item">
                    <Calendar size={15} color="#0F766E" />
                    <span>
                      {exam.date || 'TBA'} ({exam.day || getDayOfWeekFromDate(exam.date)})
                    </span>
                  </div>
                  <div className="exam-info-item">
                    <Clock size={15} color="#0F766E" />
                    <span>{exam.time || exam.startTime || '10:45 AM - 12:00 PM'}</span>
                  </div>
                  <div className="exam-info-item">
                    <MapPin size={15} color="#0F766E" />
                    <span>{exam.venue || exam.room || 'Test Hall'}</span>
                  </div>
                  <div className="exam-info-item">
                    <Award size={15} color="#F59E0B" />
                    <span>Weight: {exam.weight || '25%'}</span>
                  </div>
                </div>

                {/* Revision Progress */}
                <div className="revision-section">
                  <div className="revision-header">
                    <span className="revision-title">Syllabus Revision Checklist</span>
                    <span className="revision-pct">
                      {totalTopics > 0 ? `${pct}% Prepared` : 'No checklist'}
                    </span>
                  </div>
                  {totalTopics > 0 && (
                    <div className="progress-track" style={{ marginBottom: '0.75rem' }}>
                      <div
                        className="progress-fill progress-fill-teal"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  )}

                  {/* Topics list */}
                  <div className="topics-checklist">
                    {topicsList.length > 0 ? (
                      topicsList.map((topic) => (
                        <div
                          key={topic.id}
                          className={`topic-item ${topic.done ? 'topic-done' : ''}`}
                          onClick={() => toggleExamTopic(exam.id, topic.id)}
                        >
                          {topic.done ? (
                            <CheckCircle2 size={18} color="#0F766E" className="topic-icon" />
                          ) : (
                            <Circle size={18} color="#94A3B8" className="topic-icon" />
                          )}
                          <span className="topic-text">{topic.title}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8' }}>
                        No revision topics added for this exam.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="exam-card-footer">
                  <span className="footer-status">
                    {totalTopics > 0
                      ? `${completedTopics} of ${totalTopics} topics revised`
                      : 'Scheduled exam'}
                  </span>
                  <div className="card-action-btns">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEditModal(exam)}
                      title="Edit examination"
                    >
                      <Edit2 size={15} color="#0F766E" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteExam(exam.id)}
                      title="Remove exam"
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-exams-state card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <GraduationCap size={48} color="#0F766E" style={{ margin: '0 auto 1rem' }} />
          <h3>No exams scheduled yet</h3>
          <p style={{ maxWidth: 460, margin: '0 auto 1.5rem', color: '#64748B' }}>
            Upload your college exam schedule PDF or photo with AI to accurately extract dates, times, venues, and generate a customized study plan.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAiModalOpen(true)}
            >
              <Sparkles size={16} /> Upload Schedule (AI)
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Schedule Manually
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MANUAL ADD EXAM MODAL
          ========================================================================= */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule New Exam">
        <form onSubmit={handleCreateExam}>
          <div className="form-group">
            <label className="form-label">Subject Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Advanced Probability & Stochastic Processes"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Course Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 25CS2301"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Exam Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Additional Mid Semester Examination"
                value={form.examName}
                onChange={(e) => setForm({ ...form, examName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Exam Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Grade Weight</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 25%"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Time / Period</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 10:45 AM - 12:00 PM"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Venue / Room</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Test Hall"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Revision Topics (comma-separated, optional)</label>
            <textarea
              rows={3}
              className="form-textarea"
              placeholder="e.g. Probability Distributions, Stochastic Modeling, Markov Chains"
              value={form.topicsString}
              onChange={(e) => setForm({ ...form, topicsString: e.target.value })}
            ></textarea>
            <p className="form-helper">Separate each topic with a comma to generate interactive checklist items.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Schedule Exam
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          EDIT EXAM MODAL
          ========================================================================= */}
      {editingExam && (
        <Modal
          isOpen={true}
          onClose={() => setEditingExam(null)}
          title={`Edit Examination: ${editingExam.subject}`}
        >
          <form onSubmit={handleSaveEdit}>
            <div className="form-group">
              <label className="form-label">Subject Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Course Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Exam Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.examName}
                  onChange={(e) => setEditForm({ ...editForm, examName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Exam Date</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Grade Weight</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.weight}
                  onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Time / Period</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Venue / Room</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.venue}
                  onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Revision Topics (comma-separated)</label>
              <textarea
                rows={3}
                className="form-textarea"
                value={editForm.topicsString}
                onChange={(e) => setEditForm({ ...editForm, topicsString: e.target.value })}
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingExam(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* AI Exam Upload Modal */}
      <AiExamUploadModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
};
