import React, { useState, useEffect } from 'react';
import { Edit3, BookOpen, Layers, Tag, Folder, AlignLeft } from 'lucide-react';
import { Modal } from '../common/Modal';

export const FileRenameModal = ({
  isOpen,
  onClose,
  file,
  folders = [],
  onSave
}) => {
  const [form, setForm] = useState({
    title: '',
    subject: '',
    module: '',
    topic: '',
    folderId: '',
    description: ''
  });

  useEffect(() => {
    if (file) {
      setForm({
        title: file.title || file.fileName || '',
        subject: file.subject || '',
        module: file.module || '',
        topic: file.topic || '',
        folderId: file.folderId || '',
        description: file.description || ''
      });
    }
  }, [file, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(file.id, form);
    onClose();
  };

  if (!file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Note Details"
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        <div className="form-group">
          <label className="form-label">
            <Edit3 size={14} /> Note Title *
          </label>
          <input
            type="text"
            required
            autoFocus
            className="form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <BookOpen size={14} /> Subject / Course
          </label>
          <input
            type="text"
            className="form-input"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">
              <Layers size={14} /> Module
            </label>
            <input
              type="text"
              className="form-input"
              value={form.module}
              onChange={(e) => setForm({ ...form, module: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Tag size={14} /> Topic
            </label>
            <input
              type="text"
              className="form-input"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <Folder size={14} /> Move to Folder
          </label>
          <select
            className="form-select"
            value={form.folderId}
            onChange={(e) => setForm({ ...form, folderId: e.target.value })}
          >
            <option value="">📁 Root / All Notes</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                📁 {f.name} {f.subject ? `(${f.subject})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            <AlignLeft size={14} /> Notes / Summary
          </label>
          <textarea
            rows={3}
            className="form-textarea"
            placeholder="Key concepts, page references..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          ></textarea>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!form.title.trim()}>
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};
