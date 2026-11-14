import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Search,
  Sparkles,
  BookOpen,
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import { AiAssignmentUploadModal } from '../components/assignments/AiAssignmentUploadModal';
import './AssignmentsPage.css';

export const AssignmentsPage = () => {
  const {
    assignments,
    addAssignment,
    updateAssignment,
    toggleAssignmentStatus,
    deleteAssignment
  } = useApp();

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form State
  const [form, setForm] = useState(() => ({
    title: '',
    subject: '',
    courseCode: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    description: ''
  }));

  const enrichedAssignments = assignments.map((asg) => {
    const isOverdue = asg.dueDate && asg.dueDate < todayStr && asg.status !== 'completed';
    return {
      ...asg,
      isOverdue
    };
  });

  const filteredAssignments = enrichedAssignments.filter((asg) => {
    let matchesStatus = true;
    if (filterStatus === 'pending') {
      matchesStatus = asg.status === 'pending' && !asg.isOverdue;
    } else if (filterStatus === 'completed') {
      matchesStatus = asg.status === 'completed';
    } else if (filterStatus === 'overdue') {
      matchesStatus = asg.isOverdue;
    }

    const matchesPriority = filterPriority === 'all' || asg.priority === filterPriority;
    const matchesSearch =
      asg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asg.courseCode && asg.courseCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const pendingCount = enrichedAssignments.filter((a) => a.status === 'pending' && !a.isOverdue).length;
  const completedCount = enrichedAssignments.filter((a) => a.status === 'completed').length;
  const overdueCount = enrichedAssignments.filter((a) => a.isOverdue).length;

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      subject: '',
      courseCode: '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'medium',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (asg) => {
    setEditingId(asg.id);
    setForm({
      title: asg.title,
      subject: asg.subject,
      courseCode: asg.courseCode || '',
      dueDate: asg.dueDate || new Date().toISOString().split('T')[0],
      priority: asg.priority || 'medium',
      description: asg.description || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.subject) return;

    if (editingId) {
      updateAssignment(editingId, form);
    } else {
      addAssignment(form);
    }

    setIsModalOpen(false);
    setEditingId(null);
  };

  return (
    <div className="assignments-page">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h2>My Assignments</h2>
          <p className="page-sub">Track homework, problem sets, submissions, and deadlines with AI assistance</p>
        </div>
        <div className="header-action-group">
          <button
            className="btn btn-ai-purple"
            onClick={() => setIsAiModalOpen(true)}
          >
            <Sparkles size={18} />
            <span>Upload Assignment (AI)</span>
          </button>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>New Assignment</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="asg-stats-grid">
        <div className="asg-summary-card card card-coral">
          <div className="summary-icon coral-bg">
            <Clock size={20} />
          </div>
          <div className="summary-details">
            <span className="summary-num">{pendingCount}</span>
            <span className="summary-label">Pending Assignments</span>
          </div>
        </div>

        <div className="asg-summary-card card card-teal">
          <div className="summary-icon teal-bg">
            <CheckCircle2 size={20} />
          </div>
          <div className="summary-details">
            <span className="summary-num">{completedCount}</span>
            <span className="summary-label">Completed & Done</span>
          </div>
        </div>

        <div className="asg-summary-card card card-warning">
          <div className="summary-icon warning-bg">
            <AlertTriangle size={20} />
          </div>
          <div className="summary-details">
            <span className="summary-num">{overdueCount}</span>
            <span className="summary-label">Overdue Items</span>
          </div>
        </div>

        <div className="asg-summary-card card card-purple">
          <div className="summary-icon purple-bg">
            <BookOpen size={20} />
          </div>
          <div className="summary-details">
            <span className="summary-num">{assignments.length}</span>
            <span className="summary-label">Total Courseworks</span>
          </div>
        </div>
      </div>

      {/* Top Filter and Search Bar */}
      <div className="assignment-toolbar card">
        <div className="toolbar-search">
          <Search size={18} className="toolbar-search-icon" />
          <input
            type="text"
            className="toolbar-search-input"
            placeholder="Search assignments by title, subject, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <div className="filter-group">
            <span className="filter-label"><Filter size={14} /> Status:</span>
            <div className="filter-pills">
              {[
                { id: 'all', label: 'All', count: assignments.length },
                { id: 'pending', label: 'Pending', count: pendingCount },
                { id: 'completed', label: 'Completed', count: completedCount },
                { id: 'overdue', label: 'Overdue', count: overdueCount }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`filter-pill ${filterStatus === tab.id ? 'active' : ''}`}
                  onClick={() => setFilterStatus(tab.id)}
                >
                  {tab.label}
                  <span className="pill-badge">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Priority:</span>
            <select
              className="filter-select"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="assignments-list">
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map((asg) => {
            const isDone = asg.status === 'completed';
            return (
              <div
                key={asg.id}
                className={`assignment-card card ${isDone ? 'completed-card' : ''} ${asg.isOverdue ? 'overdue-card' : ''}`}
              >
                <div className="asg-left-col">
                  <button
                    className={`asg-status-btn ${isDone ? 'done' : ''}`}
                    onClick={() => toggleAssignmentStatus(asg.id)}
                    title={isDone ? 'Mark as Pending' : 'Mark as Completed'}
                  >
                    {isDone ? (
                      <CheckCircle2 size={24} className="icon-completed" />
                    ) : (
                      <Circle size={24} className="icon-pending" />
                    )}
                  </button>
                </div>

                <div className="asg-center-col">
                  <div className="asg-header-row">
                    <div className="asg-course-tags">
                      {asg.courseCode && <span className="asg-code">{asg.courseCode}</span>}
                      <span className="asg-subject">{asg.subject}</span>
                    </div>
                    <div className="asg-badges">
                      <span className={`badge-priority priority-${asg.priority || 'medium'}`}>
                        {(asg.priority || 'medium').toUpperCase()}
                      </span>
                      {asg.isOverdue && (
                        <span className="badge-status status-overdue">OVERDUE</span>
                      )}
                      {isDone && (
                        <span className="badge-status status-completed">COMPLETED</span>
                      )}
                      {!isDone && !asg.isOverdue && (
                        <span className="badge-status status-pending">PENDING</span>
                      )}
                    </div>
                  </div>

                  <h3 className="asg-title">{asg.title}</h3>
                  {asg.description && <p className="asg-desc">{asg.description}</p>}

                  <div className="asg-meta-row">
                    <div className="asg-due">
                      <Calendar size={15} />
                      <span>Due: <strong>{asg.dueDate}</strong></span>
                      {asg.daysLeft !== undefined && (
                        <span className={`due-countdown ${asg.isOverdue ? 'urgent' : asg.daysLeft <= 2 ? 'warning' : ''}`}>
                          {asg.isOverdue
                            ? '(Past due)'
                            : asg.daysLeft === 0
                            ? '(Due today!)'
                            : `(${asg.daysLeft} days left)`}
                        </span>
                      )}
                    </div>

                    <div className="asg-progress-item">
                      <span className="progress-text">{isDone ? '100% Done' : `${asg.progress || 0}% Progress`}</span>
                      <div className="progress-track" style={{ width: 90 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: isDone ? '100%' : `${asg.progress || 0}%`,
                            background: isDone ? '#40B8A5' : '#7566D8'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="asg-right-col">
                  <button
                    className="asg-action-btn"
                    onClick={() => handleOpenEdit(asg)}
                    title="Edit assignment"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="asg-delete-btn"
                    onClick={() => deleteAssignment(asg.id)}
                    title="Delete assignment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-asg-card card">
            <div className="empty-asg-icon-wrap">
              <CheckSquare size={44} color="#7566D8" />
            </div>
            <h3>{assignments.length === 0 ? 'No assignments yet' : 'No assignments match your filter'}</h3>
            <p>
              {assignments.length === 0
                ? "You haven't added any assignments yet. Keep track of deadlines by uploading coursework with AI or adding it manually."
                : 'Try clearing your search query or selecting a different status filter.'}
            </p>
            <div className="empty-actions">
              <button className="btn btn-ai-purple" onClick={() => setIsAiModalOpen(true)}>
                <Sparkles size={16} /> Upload with AI
              </button>
              <button className="btn btn-primary" onClick={handleOpenCreate}>
                <Plus size={16} /> Add Manually
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Add / Edit Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Assignment' : 'Create New Assignment'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Assignment Title *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Graph Traversal Benchmark"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Subject Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Algorithms & Complexity"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Course Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CS 301"
                value={form.courseCode}
                onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                required
                className="form-input"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Instructions</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Add key objectives, rubric details, or file submission requirements..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save Changes' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Assignment Upload Modal */}
      <AiAssignmentUploadModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onSaveAssignment={(newAsg) => {
          addAssignment(newAsg);
        }}
      />
    </div>
  );
};
