import React, { useState, useEffect } from 'react';
import { Folder, BookOpen, Layers, Tag, Palette } from 'lucide-react';
import { Modal } from '../common/Modal';

const FOLDER_COLORS = [
  { label: 'Sage Green', value: '#52796F' },
  { label: 'Forest Teal', value: '#354F52' },
  { label: 'Amber Warmth', value: '#D97706' },
  { label: 'Royal Blue', value: '#2563EB' },
  { label: 'Purple Lavender', value: '#7C3AED' },
  { label: 'Rose Pink', value: '#E11D48' },
  { label: 'Emerald Mint', value: '#059669' },
];

export const FolderModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  parentFolder = null
}) => {
  const [form, setForm] = useState({
    name: '',
    subject: '',
    module: '',
    topic: '',
    color: '#52796F'
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        subject: initialData.subject || '',
        module: initialData.module || '',
        topic: initialData.topic || '',
        color: initialData.color || '#52796F'
      });
    } else {
      setForm({
        name: '',
        subject: parentFolder?.subject || '',
        module: parentFolder?.module || '',
        topic: '',
        color: parentFolder?.color || '#52796F'
      });
    }
  }, [initialData, parentFolder, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({
      ...form,
      parentId: parentFolder ? parentFolder.id : null
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Rename Folder' : parentFolder ? `Create Subfolder in "${parentFolder.name}"` : 'Create New Notes Folder'}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
        <div className="form-group">
          <label className="form-label">
            <Folder size={14} /> Folder Name *
          </label>
          <input
            type="text"
            required
            autoFocus
            className="form-input"
            placeholder="e.g. Unit 2 - Dynamic Programming"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            <BookOpen size={14} /> Subject / Course
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Computer Science"
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
              placeholder="e.g. Module 3"
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
              placeholder="e.g. Graph Theory"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            <Palette size={14} /> Folder Color
          </label>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            {FOLDER_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, color: c.value })}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: c.value,
                  border: form.color === c.value ? '3px solid #1E293B' : '2px solid transparent',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  transform: form.color === c.value ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.15s ease'
                }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!form.name.trim()}>
            {initialData ? 'Save Changes' : 'Create Folder'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
