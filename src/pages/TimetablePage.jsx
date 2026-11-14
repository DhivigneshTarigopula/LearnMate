import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Check,
  Sparkles,
  LayoutGrid,
  CalendarDays
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import { AiTimetableUploadModal } from '../components/timetable/AiTimetableUploadModal';
import './TimetablePage.css';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const allWeekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Helper to convert time strings (e.g. "8:30 AM - 9:25 AM") into minutes from midnight for true chronological sorting
const parseTimeToMinutes = (timeStr = '') => {
  if (!timeStr) return 0;
  const startPart = timeStr.split('-')[0]?.trim() || '';
  const match = startPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3] ? match[3].toUpperCase() : null;

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

export const TimetablePage = () => {
  const { timetable, addClass, updateClass, deleteClass } = useApp();
  const [selectedDay, setSelectedDay] = useState('All');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'cards'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    day: 'Monday',
    subject: '',
    code: '',
    time: '10:00 AM - 11:30 AM',
    room: '',
    instructor: '',
    type: 'Lecture',
    color: 'blue'
  });

  const filteredTimetable = selectedDay === 'All'
    ? timetable
    : timetable.filter((item) => item.day === selectedDay);

  // Determine active calendar days (include Sat/Sun if student has classes on weekends)
  const hasWeekendClasses = timetable.some((t) => t.day === 'Saturday' || t.day === 'Sunday');
  const calendarDays = hasWeekendClasses ? allWeekDays : days;

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      day: selectedDay !== 'All' ? selectedDay : 'Monday',
      subject: '',
      code: '',
      time: '10:00 AM - 11:30 AM',
      room: '',
      instructor: '',
      type: 'Lecture',
      color: 'blue'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (slot) => {
    setEditingId(slot.id);
    setForm({
      day: slot.day,
      subject: slot.subject,
      code: slot.code,
      time: slot.time,
      room: slot.room || '',
      instructor: slot.instructor || '',
      type: slot.type || 'Lecture',
      color: slot.color || 'blue'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.subject || !form.code) return;

    if (editingId) {
      updateClass(editingId, form);
    } else {
      addClass(form);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setForm({
      day: 'Monday',
      subject: '',
      code: '',
      time: '10:00 AM - 11:30 AM',
      room: '',
      instructor: '',
      type: 'Lecture',
      color: 'blue'
    });
  };

  const totalClasses = timetable.length;
  const labCount = timetable.filter((c) => c.type === 'Lab').length;

  return (
    <div className="timetable-page">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h2>Weekly Timetable</h2>
          <p className="page-sub">Manage course schedules, venues, and lecture slots</p>
        </div>
        <div className="header-action-group">
          <button
            type="button"
            className="btn btn-secondary btn-ai-timetable-trigger"
            onClick={() => setIsAiModalOpen(true)}
          >
            <Sparkles size={16} className="sparkle-ai-badge" /> Upload Timetable (AI)
          </button>
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} /> Add Class
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="timetable-stats-bar">
        <div className="stat-pill">
          <BookOpen size={16} color="#4F46E5" />
          <span><strong>{totalClasses}</strong> Scheduled Classes</span>
        </div>
        <div className="stat-pill">
          <Clock size={16} color="#8B5CF6" />
          <span><strong>{labCount}</strong> Practical Labs</span>
        </div>
        <div className="stat-pill">
          <Calendar size={16} color="#10B981" />
          <span><strong>{calendarDays.length}</strong> Active Days ({calendarDays[0].slice(0, 3)}-{calendarDays[calendarDays.length - 1].slice(0, 3)})</span>
        </div>
      </div>

      {/* Filter Tabs & View Toggle */}
      <div className="timetable-toolbar-row">
        <div className="day-tabs-container">
          <button
            type="button"
            className={`day-tab ${selectedDay === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedDay('All')}
          >
            All Days
          </button>
          {days.map((day) => (
            <button
              type="button"
              key={day}
              className={`day-tab ${selectedDay === day ? 'active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              {day}
              <span className="day-count-badge">
                {timetable.filter((t) => t.day === day).length}
              </span>
            </button>
          ))}
        </div>

        <div className="view-mode-toggle-group">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
            title="Weekly Calendar View"
          >
            <CalendarDays size={15} /> <span>Calendar</span>
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Card Grid View"
          >
            <LayoutGrid size={15} /> <span>Cards</span>
          </button>
        </div>
      </div>

      {/* ================= VIEW 1: WEEKLY CALENDAR GRID ================= */}
      {viewMode === 'calendar' && (
        <div className="weekly-calendar-matrix-wrap card">
          <div className="calendar-grid-header">
            <h3 className="matrix-title">Weekly Schedule Calendar</h3>
            <span className="matrix-subtitle">Visual week at a glance</span>
          </div>

          <div className="calendar-columns-container">
            {calendarDays.map((day) => {
              const dayClasses = timetable
                .filter((slot) => slot.day === day)
                .sort((a, b) => {
                  const minA = parseTimeToMinutes(a.startTime || a.time);
                  const minB = parseTimeToMinutes(b.startTime || b.time);
                  return minA - minB;
                });

              return (
                <div key={day} className="calendar-day-column">
                  <div className="day-column-header">
                    <span className="day-column-name">{day}</span>
                    <span className="day-column-badge">{dayClasses.length}</span>
                  </div>

                  <div className="day-column-classes">
                    {dayClasses.length > 0 ? (
                      dayClasses.map((slot) => (
                        <div
                          key={slot.id}
                          className={`calendar-class-block border-${slot.color || 'blue'}`}
                        >
                          <div className="class-block-top">
                            <span className="block-time-pill">
                              <Clock size={11} /> {slot.time}
                            </span>
                            <div className="block-actions">
                              <button
                                type="button"
                                className="block-action-btn"
                                onClick={() => handleOpenEdit(slot)}
                                title="Edit"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                className="block-action-btn delete"
                                onClick={() => deleteClass(slot.id)}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <span className="block-code">{slot.code}</span>
                          <h4 className="block-title">{slot.subject}</h4>

                          <div className="block-bottom">
                            <span className="block-room" title={slot.room || 'TBA'}>
                              <MapPin size={11} /> {slot.room || 'TBA'}
                            </span>
                            <span className={`badge badge-sm badge-${slot.color || 'blue'}`}>
                              {slot.type}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-day-state">
                        <span>No classes</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: CARDS GRID ================= */}
      {viewMode === 'cards' && (
        <div className="timetable-cards-grid">
          {filteredTimetable.length > 0 ? (
            filteredTimetable.map((slot) => (
              <div key={slot.id} className={`timetable-slot-card card border-${slot.color}`}>
                <div className="slot-top">
                  <div className="slot-day-time">
                    <span className="slot-day-badge">{slot.day}</span>
                    <div className="slot-time-row">
                      <Clock size={14} />
                      <span>{slot.time}</span>
                    </div>
                  </div>
                  <div className="slot-actions">
                    <span className={`badge badge-${slot.color}`}>{slot.type}</span>
                    <button
                      className="edit-slot-btn"
                      onClick={() => handleOpenEdit(slot)}
                      title="Edit class"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="delete-slot-btn"
                      onClick={() => deleteClass(slot.id)}
                      title="Remove class"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="slot-main">
                  <span className="slot-code">{slot.code}</span>
                  <h3 className="slot-title">{slot.subject}</h3>
                </div>

                <div className="slot-footer">
                  <div className="slot-footer-item">
                    <MapPin size={15} className="footer-icon" />
                    <span>{slot.room || 'TBA'}</span>
                  </div>
                  <div className="slot-footer-item">
                    <User size={15} className="footer-icon" />
                    <span>{slot.instructor || 'TBA'}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-timetable-state card">
              <Calendar size={48} color="#94A3B8" />
              <h3>{timetable.length === 0 ? 'No classes scheduled yet' : 'No classes found'}</h3>
              <p>
                {timetable.length === 0
                  ? 'Your timetable is empty. Upload your timetable PDF with AI or add your lecture, tutorial, and lab schedules manually.'
                  : `You have free time or no classes scheduled for ${selectedDay}.`}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsAiModalOpen(true)}
                >
                  <Sparkles size={14} /> Upload with AI
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
                  <Plus size={16} /> Add a Class
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Add / Edit Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Schedule Slot' : 'Add Schedule Slot'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Subject Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Distributed Systems"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Course Code *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. CS 450"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Day of Week</label>
              <select
                className="form-select"
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
              >
                {allWeekDays.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Class Type</label>
              <select
                className="form-select"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="Lecture">Lecture</option>
                <option value="Lab">Lab / Practical</option>
                <option value="Tutorial">Tutorial / Discussion</option>
                <option value="Seminar">Seminar</option>
                <option value="Studio">Studio</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Time Slot *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. 10:00 AM - 11:30 AM"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Room / Building</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Hall 402 or Lab 3"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Professor / Lecturer</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Dr. Sarah Mitchell"
                value={form.instructor}
                onChange={(e) => setForm({ ...form, instructor: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Card Accent Color</label>
            <div className="color-picker-row">
              {['blue', 'lavender', 'emerald', 'amber', 'rose'].map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`color-circle-btn color-${c} ${form.color === c ? 'selected' : ''}`}
                  onClick={() => setForm({ ...form, color: c })}
                  aria-label={`Select ${c} color`}
                >
                  {form.color === c && <Check size={14} color="white" />}
                </button>
              ))}
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
              {editingId ? 'Save Changes' : 'Save Class Slot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Timetable Upload Modal */}
      <AiTimetableUploadModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
};
