import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Circle,
  Plus,
  Flame,
  Clock,
  Sparkles,
  Coffee,
  Brain,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import './StudyPlannerPage.css';

export const StudyPlannerPage = () => {
  const {
    user,
    studyTasks = [],
    toggleStudyTask,
    addStudyTask,
    deleteStudyTask,
    addStudySession,
    showToast,
    timetable = []
  } = useApp();

  // Pomodoro Modes
  const [mode, setMode] = useState('focus'); // 'focus' | 'shortBreak' | 'longBreak'
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New session block form
  const [form, setForm] = useState({
    task: '',
    subject: timetable[0]?.subject || 'General Study',
    minutes: 30
  });

  // Switch mode helper
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setIsRunning(false);
    if (newMode === 'focus') setTimeLeft(25 * 60);
    else if (newMode === 'shortBreak') setTimeLeft(5 * 60);
    else if (newMode === 'longBreak') setTimeLeft(15 * 60);
  };

  // Timer Tick Effect
  useEffect(() => {
    let timer = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (mode === 'focus') {
        setCompletedSessions((prev) => prev + 1);
        if (addStudySession) {
          addStudySession({ subject: 'Pomodoro Focus Block', duration: 25 });
        }
        showToast('🎉 Focus session completed! Time for a short break.');
        handleModeChange('shortBreak');
      } else {
        showToast('Break finished! Ready for next focus block?');
        handleModeChange('focus');
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode, addStudySession, showToast]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === 'focus') setTimeLeft(25 * 60);
    else if (mode === 'shortBreak') setTimeLeft(5 * 60);
    else if (mode === 'longBreak') setTimeLeft(15 * 60);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!form.task.trim()) return;
    addStudyTask({
      task: form.task.trim(),
      subject: form.subject.trim() || 'General Study',
      minutes: Number(form.minutes) || 30
    });
    setIsModalOpen(false);
    setForm({
      task: '',
      subject: timetable[0]?.subject || 'General Study',
      minutes: 30
    });
  };

  return (
    <div className="study-planner-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h2>Study Planner & Focus Timer</h2>
          <p className="page-sub">Deep work Pomodoro intervals, study blocks, and daily discipline</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Schedule Study Block
        </button>
      </div>

      <div className="study-layout-grid">
        {/* Left Column: Interactive Pomodoro Timer */}
        <div className="pomodoro-card card">
          <div className="pomodoro-mode-switch">
            <button
              className={`mode-btn ${mode === 'focus' ? 'active' : ''}`}
              onClick={() => handleModeChange('focus')}
            >
              <Brain size={16} /> Focus (25m)
            </button>
            <button
              className={`mode-btn ${mode === 'shortBreak' ? 'active' : ''}`}
              onClick={() => handleModeChange('shortBreak')}
            >
              <Coffee size={16} /> Short Break (5m)
            </button>
            <button
              className={`mode-btn ${mode === 'longBreak' ? 'active' : ''}`}
              onClick={() => handleModeChange('longBreak')}
            >
              <Sparkles size={16} /> Long Break (15m)
            </button>
          </div>

          <div className="timer-display-box">
            <div className="timer-circle">
              <span className="timer-digits">{formatTime(timeLeft)}</span>
              <span className="timer-sublabel">
                {mode === 'focus' ? 'Deep Focus Session' : 'Rest & Recharge'}
              </span>
            </div>
          </div>

          <div className="timer-controls">
            <button
              className={`btn btn-lg ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} fill="white" />}
              {isRunning ? 'Pause' : 'Start Focus'}
            </button>
            <button className="btn btn-secondary btn-lg" onClick={handleReset} title="Reset timer">
              <RotateCcw size={20} /> Reset
            </button>
          </div>

          <div className="pomodoro-session-stats">
            <div className="session-stat-pill">
              <span>Completed Cycles:</span>
              <strong>{completedSessions} Pomodoros</strong>
            </div>
            <div className="session-stat-pill">
              <span>Today's Focus:</span>
              <strong>
                {(completedSessions * 25) / 60 >= 1
                  ? `${((completedSessions * 25) / 60).toFixed(1)} hrs`
                  : `${completedSessions * 25} mins`}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Column: Daily Study Sessions & Goals */}
        <div className="study-goals-column card">
          <div className="card-header-row">
            <div>
              <h3>Today's Study Plan</h3>
              <p className="card-sub">Daily target: {user.dailyGoalHours || 4.0} hours</p>
            </div>
            <span className="badge badge-primary">
              {studyTasks.filter((t) => t.completed).length}/{studyTasks.length} Done
            </span>
          </div>

          {/* Quick task checklist */}
          <div className="planned-tasks-list">
            {studyTasks.length > 0 ? (
              studyTasks.map((item) => (
                <div
                  key={item.id}
                  className={`study-plan-item ${item.completed ? 'plan-done' : ''}`}
                  onClick={() => toggleStudyTask(item.id)}
                >
                  <button className="plan-checkbox-btn" aria-label="Toggle task">
                    {item.completed ? (
                      <CheckCircle2 size={20} color="#10B981" />
                    ) : (
                      <Circle size={20} color="#94A3B8" />
                    )}
                  </button>
                  <div className="plan-info">
                    <span className="plan-title">{item.task}</span>
                    <div className="plan-meta">
                      <span className="badge badge-neutral">{item.subject}</span>
                      <span className="plan-duration">
                        <Clock size={13} /> {item.minutes} minutes
                      </span>
                    </div>
                  </div>
                  {deleteStudyTask && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.25rem', color: '#EF4444', marginLeft: 'auto' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStudyTask(item.id);
                      }}
                      title="Remove task"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                <CheckCircle2 size={36} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
                <h4>No study tasks yet</h4>
                <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.875rem' }}>
                  Schedule your first focus block to organize your daily study routine.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
                  <Plus size={14} /> Schedule Block
                </button>
              </div>
            )}
          </div>

          {/* Productivity Tip Box */}
          <div className="productivity-tip-box">
            <div className="tip-header">
              <Flame size={16} color="#F59E0B" />
              <strong>Study Tip of the Day</strong>
            </div>
            <p>
              "Active recall and spaced intervals yield 2.5x better memory retention than passive re-reading. Try explaining the concept to an empty room after each 25-minute Pomodoro."
            </p>
          </div>
        </div>
      </div>

      {/* Add Study Block Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Study Block">
        <form onSubmit={handleAddTask}>
          <div className="form-group">
            <label className="form-label">Study Task / Objective *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Read Chapter 6 and write summary notes"
              value={form.task}
              onChange={(e) => setForm({ ...form, task: e.target.value })}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Operating Systems"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Planned Minutes</label>
              <input
                type="number"
                min="10"
                max="180"
                className="form-input"
                value={form.minutes}
                onChange={(e) => setForm({ ...form, minutes: e.target.value })}
              />
            </div>
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
              Add to Plan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
