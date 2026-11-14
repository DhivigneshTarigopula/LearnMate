import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FolderPlus,
  Plus,
  Search,
  Star,
  Trash2,
  Edit3,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Folder,
  ChevronRight,
  Home,
  Grid,
  List,
  Layers,
  BookOpen,
  Tag,
  MoreVertical,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/common/Modal';
import { NotePreviewModal } from '../components/notes/NotePreviewModal';
import { FileUploadModal } from '../components/notes/FileUploadModal';
import { FolderModal } from '../components/notes/FolderModal';
import { FileRenameModal } from '../components/notes/FileRenameModal';
import { AiNoteAssistantModal } from '../components/notes/AiNoteAssistantModal';
import { PdfQuizGeneratorModal } from '../components/quizzes/PdfQuizGeneratorModal';
import './NotesPage.css';

export const NotesPage = () => {
  const navigate = useNavigate();
  const {
    // Text notes (backward compatibility)
    notes,
    addNote,
    updateNote,
    deleteNote,
    toggleFavoriteNote,
    // Smart Notes (Files & Folders)
    noteFiles,
    noteFolders,
    uploadNoteFiles,
    deleteNoteFile,
    renameNoteFile,
    toggleFavoriteNoteFile,
    downloadNoteFile,
    getNoteFilePreviewUrl,
    createNoteFolder,
    renameNoteFolder,
    deleteNoteFolder,
    generateQuizFromPdf
  } = useApp();

  // Navigation & View State
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'textNotes'
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = Root
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'pdf' | 'image' | 'starred'
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [activeMenuFileId, setActiveMenuFileId] = useState(null);
  const [activeMenuFolderId, setActiveMenuFolderId] = useState(null);
  const [aiAssistantNote, setAiAssistantNote] = useState(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  // Text Note State (preserved & enhanced)
  const [selectedTextNoteId, setSelectedTextNoteId] = useState(notes[0]?.id || null);
  const [isTextNoteModalOpen, setIsTextNoteModalOpen] = useState(false);
  const [isEditingTextNote, setIsEditingTextNote] = useState(false);
  const [textNoteForm, setTextNoteForm] = useState({
    title: '',
    subject: '',
    tags: '',
    content: ''
  });

  // Current folder object
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return noteFolders.find((f) => f.id === currentFolderId) || null;
  }, [currentFolderId, noteFolders]);

  // Breadcrumbs calculation (recursively find parents)
  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    let curr = currentFolder;
    while (curr) {
      crumbs.unshift(curr);
      curr = curr.parentId ? noteFolders.find((f) => f.id === curr.parentId) : null;
    }
    return crumbs;
  }, [currentFolder, noteFolders]);

  // Subfolders in current folder
  const currentSubfolders = useMemo(() => {
    return noteFolders.filter((f) => {
      if (currentFolderId === null) {
        return !f.parentId;
      }
      return f.parentId === currentFolderId;
    });
  }, [noteFolders, currentFolderId]);

  // Subjects & Modules for dropdown filters
  const allSubjects = useMemo(() => {
    const set = new Set();
    noteFiles.forEach((f) => f.subject && set.add(f.subject));
    noteFolders.forEach((f) => f.subject && set.add(f.subject));
    notes.forEach((n) => n.subject && set.add(n.subject));
    return ['All', ...Array.from(set)];
  }, [noteFiles, noteFolders, notes]);

  const allModules = useMemo(() => {
    const set = new Set();
    noteFiles.forEach((f) => f.module && set.add(f.module));
    noteFolders.forEach((f) => f.module && set.add(f.module));
    return ['All', ...Array.from(set)];
  }, [noteFiles, noteFolders]);

  // Filtered Smart Note Files
  const filteredFiles = useMemo(() => {
    return noteFiles.filter((file) => {
      // Folder scoping: if searching, show matches from all folders; otherwise respect current folder
      const inCurrentFolder = searchQuery.trim() !== '' ? true : (file.folderId || null) === currentFolderId;
      if (!inCurrentFolder) return false;

      // Type Filter
      if (typeFilter === 'pdf' && file.fileExt?.toLowerCase() !== 'pdf') return false;
      if (typeFilter === 'image' && file.fileExt?.toLowerCase() === 'pdf') return false;
      if (typeFilter === 'starred' && !file.favorite) return false;

      // Subject Filter
      if (selectedSubject !== 'All' && file.subject !== selectedSubject) return false;

      // Module Filter
      if (selectedModule !== 'All' && file.module !== selectedModule) return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (file.fileName || '').toLowerCase().includes(q);
        const matchesTitle = (file.title || '').toLowerCase().includes(q);
        const matchesSubject = (file.subject || '').toLowerCase().includes(q);
        const matchesModule = (file.module || '').toLowerCase().includes(q);
        const matchesTopic = (file.topic || '').toLowerCase().includes(q);
        const matchesDesc = (file.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesSubject && !matchesModule && !matchesTopic && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [noteFiles, currentFolderId, typeFilter, selectedSubject, selectedModule, searchQuery]);

  // Format Helpers
  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Text Note Handlers (Preserved)
  const selectedTextNote = notes.find((n) => n.id === selectedTextNoteId) || notes[0];

  const handleCreateTextNote = (e) => {
    e.preventDefault();
    if (!textNoteForm.title) return;

    const tagsArray = textNoteForm.tags
      ? textNoteForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : ['General'];

    addNote({
      title: textNoteForm.title,
      subject: textNoteForm.subject || 'General Studies',
      tags: tagsArray,
      content: textNoteForm.content
    });

    setIsTextNoteModalOpen(false);
    setTextNoteForm({ title: '', subject: '', tags: '', content: '' });
  };

  const handleSaveActiveTextNote = (newContent, newTitle) => {
    if (!selectedTextNote) return;
    updateNote(selectedTextNote.id, {
      content: newContent !== undefined ? newContent : selectedTextNote.content,
      title: newTitle !== undefined ? newTitle : selectedTextNote.title
    });
    setIsEditingTextNote(false);
  };

  // Total stats
  const totalPdfs = noteFiles.filter((f) => f.fileExt?.toLowerCase() === 'pdf').length;
  const totalImages = noteFiles.filter((f) => f.fileExt?.toLowerCase() !== 'pdf').length;

  return (
    <div className="notes-page" onClick={() => { setActiveMenuFileId(null); setActiveMenuFolderId(null); }}>
      {/* Top Header Row */}
      <div className="smart-notes-header">
        <div className="header-title-area">
          <div className="header-badge-row">
            <span className="badge badge-primary">Smart Study Vault</span>
            <span className="header-stats-pill">
              {noteFiles.length} File{noteFiles.length === 1 ? '' : 's'} • {noteFolders.length} Folder{noteFolders.length === 1 ? '' : 's'}
            </span>
          </div>
          <h2>My Notes & Materials</h2>
          <p className="page-sub">
            Upload PDFs, handwritten note photos, lecture slides, and leverage AI to summarize, explain topics, or generate practice questions.
          </p>
        </div>

        <div className="smart-notes-actions">
          <button
            className="btn btn-primary upload-main-btn"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <UploadCloud size={18} /> Upload Files
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setEditingFolder(null);
              setIsFolderModalOpen(true);
            }}
          >
            <FolderPlus size={18} /> New Folder
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setActiveTab('textNotes');
              setIsTextNoteModalOpen(true);
            }}
          >
            <Plus size={18} /> Text Note
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Files & Documents vs Text Notebook */}
      <div className="notes-tab-bar">
        <div className="tab-buttons-group">
          <button
            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <FileSpreadsheet size={16} /> Documents & Photos ({noteFiles.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'textNotes' ? 'active' : ''}`}
            onClick={() => setActiveTab('textNotes')}
          >
            <FileText size={16} /> Text Notebook ({notes.length})
          </button>
        </div>

        {activeTab === 'files' && (
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              aria-label="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: SMART FILES & FOLDERS VIEW */}
      {activeTab === 'files' && (
        <div className="smart-files-workspace">
          {/* Breadcrumb Navigation Bar */}
          <div className="folder-breadcrumbs-card card">
            <div className="breadcrumbs-list">
              <button
                className={`breadcrumb-item ${currentFolderId === null ? 'current' : ''}`}
                onClick={() => setCurrentFolderId(null)}
              >
                <Home size={15} />
                <span>All Notes</span>
              </button>

              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  <ChevronRight size={14} className="breadcrumb-separator" />
                  <button
                    className={`breadcrumb-item ${idx === breadcrumbs.length - 1 ? 'current' : ''}`}
                    onClick={() => setCurrentFolderId(crumb.id)}
                  >
                    <Folder size={15} style={{ color: crumb.color || '#52796F' }} />
                    <span>{crumb.name}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="breadcrumbs-meta">
              {currentFolder && (
                <div className="current-folder-tags">
                  {currentFolder.subject && (
                    <span className="badge badge-lavender">
                      <BookOpen size={11} /> {currentFolder.subject}
                    </span>
                  )}
                  {currentFolder.module && (
                    <span className="badge badge-emerald">
                      <Layers size={11} /> {currentFolder.module}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Subfolders Grid (if any exist in current location) */}
          {currentSubfolders.length > 0 && (
            <div className="subfolders-section">
              <div className="section-label-row">
                <span className="section-title-tag">FOLDERS & MODULES ({currentSubfolders.length})</span>
              </div>
              <div className="subfolders-grid">
                {currentSubfolders.map((folder) => {
                  const folderFileCount = noteFiles.filter((f) => f.folderId === folder.id).length;
                  const isMenuOpen = activeMenuFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      className="subfolder-card"
                      onClick={() => setCurrentFolderId(folder.id)}
                    >
                      <div className="subfolder-icon-wrap" style={{ background: `${folder.color || '#52796F'}18`, color: folder.color || '#52796F' }}>
                        <Folder size={22} fill={folder.color || '#52796F'} />
                      </div>
                      <div className="subfolder-info">
                        <h4 className="subfolder-name" title={folder.name}>
                          {folder.name}
                        </h4>
                        <div className="subfolder-meta">
                          <span>{folderFileCount} file{folderFileCount === 1 ? '' : 's'}</span>
                          {folder.subject && <span>• {folder.subject}</span>}
                        </div>
                      </div>

                      {/* Folder menu */}
                      <div className="subfolder-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="folder-menu-btn"
                          onClick={() => setActiveMenuFolderId(isMenuOpen ? null : folder.id)}
                          aria-label="Folder actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {isMenuOpen && (
                          <div className="folder-dropdown-menu">
                            <button
                              onClick={() => {
                                setActiveMenuFolderId(null);
                                setEditingFolder(folder);
                                setIsFolderModalOpen(true);
                              }}
                            >
                              <Edit3 size={14} /> Rename
                            </button>
                            <button
                              className="menu-danger"
                              onClick={() => {
                                setActiveMenuFolderId(null);
                                if (window.confirm(`Delete folder "${folder.name}" and all contents?`)) {
                                  deleteNoteFolder(folder.id);
                                }
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="files-filter-bar card">
            <div className="search-filter-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by file name, topic, module, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  className="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="filter-controls-group">
              {/* Type Filter Pills */}
              <div className="type-pills-row">
                <button
                  className={`type-pill ${typeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('all')}
                >
                  All ({noteFiles.length})
                </button>
                <button
                  className={`type-pill ${typeFilter === 'pdf' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('pdf')}
                >
                  PDFs ({totalPdfs})
                </button>
                <button
                  className={`type-pill ${typeFilter === 'image' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('image')}
                >
                  Images & Scans ({totalImages})
                </button>
                <button
                  className={`type-pill ${typeFilter === 'starred' ? 'active' : ''}`}
                  onClick={() => setTypeFilter('starred')}
                >
                  <Star size={13} fill={typeFilter === 'starred' ? '#F59E0B' : 'none'} /> Starred
                </button>
              </div>

              {/* Subject dropdown */}
              <div className="filter-select-wrap">
                <select
                  className="form-select filter-select"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="All">All Subjects</option>
                  {allSubjects.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Module dropdown */}
              {allModules.length > 1 && (
                <div className="filter-select-wrap">
                  <select
                    className="form-select filter-select"
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                  >
                    <option value="All">All Modules</option>
                    {allModules.filter((m) => m !== 'All').map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Files List / Grid View */}
          {filteredFiles.length > 0 ? (
            viewMode === 'grid' ? (
              /* GRID VIEW */
              <div className="smart-files-grid">
                {filteredFiles.map((file) => {
                  const ext = (file.fileExt || '').toLowerCase();
                  const isPdf = ext === 'pdf';
                  const isMenuOpen = activeMenuFileId === file.id;

                  return (
                    <div
                      key={file.id}
                      className="smart-file-card card"
                      onClick={() => setPreviewFile(file)}
                    >
                      {/* Card Thumbnail / Preview Hero */}
                      <div className="file-card-preview-hero">
                        {isPdf ? (
                          <div className="pdf-hero-graphic">
                            <FileText size={42} className="pdf-hero-icon" />
                            <span className="pdf-hero-label">PDF DOCUMENT</span>
                          </div>
                        ) : file.previewUrl ? (
                          <img
                            src={file.previewUrl}
                            alt={file.title || file.fileName}
                            className="img-hero-element"
                            loading="lazy"
                          />
                        ) : (
                          <div className="img-hero-graphic">
                            <ImageIcon size={42} color="#52796F" />
                            <span className="img-hero-label">IMAGE / NOTE SCAN</span>
                          </div>
                        )}

                        {/* Top corner actions */}
                        <div className="file-hero-top-bar" onClick={(e) => e.stopPropagation()}>
                          <span className={`file-ext-tag tag-${isPdf ? 'pdf' : 'img'}`}>
                            {ext.toUpperCase()}
                          </span>
                          <button
                            className={`file-star-hero-btn ${file.favorite ? 'starred' : ''}`}
                            onClick={() => toggleFavoriteNoteFile(file.id)}
                            title={file.favorite ? 'Unstar' : 'Star'}
                          >
                            <Star
                              size={15}
                              fill={file.favorite ? '#F59E0B' : 'none'}
                              color={file.favorite ? '#F59E0B' : '#94A3B8'}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Card Content Info */}
                      <div className="file-card-content">
                        <h4 className="file-card-title" title={file.title || file.fileName}>
                          {file.title || file.fileName}
                        </h4>

                        <div className="file-card-pills">
                          {file.subject && (
                            <span className="mini-badge-subject">
                              <BookOpen size={11} /> {file.subject}
                            </span>
                          )}
                          {file.module && (
                            <span className="mini-badge-module">
                              <Layers size={11} /> {file.module}
                            </span>
                          )}
                          {file.topic && (
                            <span className="mini-badge-topic">
                              <Tag size={11} /> {file.topic}
                            </span>
                          )}
                        </div>

                        {file.description && (
                          <p className="file-card-desc" title={file.description}>
                            {file.description}
                          </p>
                        )}

                        <div className="file-ai-shortcut-row" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-ai-card-pill"
                            onClick={() => setAiAssistantNote(file)}
                            title="AI Study Assistant (Summarize, MCQs, Explain, Quiz)"
                          >
                            <Sparkles size={13} />
                            <span>AI Study Assistant</span>
                          </button>
                        </div>

                        <div className="file-card-bottom-row">
                          <span className="file-size-date">
                            {formatFileSize(file.fileSize)} • {formatDate(file.createdAt)}
                          </span>

                          <div className="file-actions-row" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="file-action-icon-btn file-action-ai-btn"
                              onClick={() => setAiAssistantNote(file)}
                              title="AI Study Assistant"
                              aria-label="AI Study Assistant"
                            >
                              <Sparkles size={16} />
                            </button>
                            <button
                              className="file-action-icon-btn"
                              onClick={() => setPreviewFile(file)}
                              title="Preview"
                              aria-label="Preview"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="file-action-icon-btn"
                              onClick={() => downloadNoteFile(file)}
                              title="Download"
                              aria-label="Download"
                            >
                              <Download size={16} />
                            </button>

                            {/* More Options Dropdown */}
                            <div className="file-dropdown-wrapper">
                              <button
                                className="file-action-icon-btn"
                                onClick={() => setActiveMenuFileId(isMenuOpen ? null : file.id)}
                                title="More options"
                                aria-label="More options"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {isMenuOpen && (
                                <div className="file-menu-dropdown">
                                  <button
                                    onClick={() => {
                                      setActiveMenuFileId(null);
                                      setAiAssistantNote(file);
                                    }}
                                  >
                                    <Sparkles size={14} color="#7566D8" /> AI Study Assistant
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuFileId(null);
                                      setEditingFile(file);
                                    }}
                                  >
                                    <Edit3 size={14} /> Edit Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuFileId(null);
                                      downloadNoteFile(file);
                                    }}
                                  >
                                    <Download size={14} /> Download
                                  </button>
                                  <button
                                    className="menu-danger"
                                    onClick={() => {
                                      setActiveMenuFileId(null);
                                      if (window.confirm(`Delete "${file.title || file.fileName}"?`)) {
                                        deleteNoteFile(file.id);
                                      }
                                    }}
                                  >
                                    <Trash2 size={14} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="smart-files-list-card card">
                <table className="files-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Subject / Module</th>
                      <th>Topic</th>
                      <th>Size</th>
                      <th>Uploaded</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => {
                      const ext = (file.fileExt || '').toLowerCase();
                      const isPdf = ext === 'pdf';

                      return (
                        <tr
                          key={file.id}
                          className="file-table-row"
                          onClick={() => setPreviewFile(file)}
                        >
                          <td className="file-cell-name">
                            <div className="file-cell-icon">
                              {isPdf ? (
                                <FileText size={18} color="#DC2626" />
                              ) : (
                                <ImageIcon size={18} color="#52796F" />
                              )}
                            </div>
                            <div className="file-cell-text">
                              <span className="file-primary-name">{file.title || file.fileName}</span>
                              <span className="file-original-name">{file.fileName}</span>
                            </div>
                          </td>
                          <td>
                            <div className="table-subject-stack">
                              <span className="table-subject-name">{file.subject || '—'}</span>
                              {file.module && <span className="table-module-name">{file.module}</span>}
                            </div>
                          </td>
                          <td>
                            {file.topic ? (
                              <span className="badge badge-lavender">{file.topic}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="table-size-cell">{formatFileSize(file.fileSize)}</td>
                          <td className="table-date-cell">{formatDate(file.createdAt)}</td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <div className="table-actions-cell">
                              <button
                                className="table-icon-btn"
                                onClick={() => toggleFavoriteNoteFile(file.id)}
                                title={file.favorite ? 'Unstar' : 'Star'}
                              >
                                <Star
                                  size={15}
                                  fill={file.favorite ? '#F59E0B' : 'none'}
                                  color={file.favorite ? '#F59E0B' : '#94A3B8'}
                                />
                              </button>
                              <button
                                className="table-icon-btn table-ai-btn"
                                onClick={() => setAiAssistantNote(file)}
                                title="AI Study Assistant (Summarize, MCQs, Explain, Quiz)"
                              >
                                <Sparkles size={15} color="#7566D8" />
                              </button>
                              <button
                                className="table-icon-btn"
                                onClick={() => setPreviewFile(file)}
                                title="Preview"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className="table-icon-btn"
                                onClick={() => downloadNoteFile(file)}
                                title="Download"
                              >
                                <Download size={15} />
                              </button>
                              <button
                                className="table-icon-btn"
                                onClick={() => setEditingFile(file)}
                                title="Edit"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                className="table-icon-btn btn-danger-hover"
                                onClick={() => {
                                  if (window.confirm(`Delete "${file.title || file.fileName}"?`)) {
                                    deleteNoteFile(file.id);
                                  }
                                }}
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Empty State */
            <div className="empty-smart-files card">
              <div className="empty-icon-circle">
                <UploadCloud size={42} />
              </div>
              <h3>
                {searchQuery || typeFilter !== 'all' || selectedSubject !== 'All'
                  ? 'No matching files found'
                  : 'No files uploaded yet in this folder'}
              </h3>
              <p>
                {searchQuery || typeFilter !== 'all' || selectedSubject !== 'All'
                  ? 'Try clearing your filters or searching for another topic or course.'
                  : 'Start adding lecture PDFs, photos of handwritten notes, and revision diagrams.'}
              </p>
              <div className="empty-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <UploadCloud size={16} /> Upload Notes
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setEditingFolder(null);
                    setIsFolderModalOpen(true);
                  }}
                >
                  <FolderPlus size={16} /> New Folder
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEXT NOTEBOOK VIEW (Preserved & Fully Functional) */}
      {activeTab === 'textNotes' && (
        <div className="notes-workspace-grid">
          {/* Left Column: Note Browser */}
          <div className="notes-sidebar-card card">
            <div className="notes-search-wrapper">
              <Search size={16} className="notes-search-icon" />
              <input
                type="text"
                placeholder="Search markdown notes..."
                className="notes-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Notes list */}
            <div className="notes-items-list">
              {notes
                .filter(
                  (n) =>
                    !searchQuery ||
                    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    n.content.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((note) => (
                  <div
                    key={note.id}
                    className={`note-preview-item ${selectedTextNote?.id === note.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedTextNoteId(note.id);
                      setIsEditingTextNote(false);
                    }}
                  >
                    <div className="note-preview-header">
                      <span className="note-preview-subject">{note.subject}</span>
                      <button
                        className={`note-star-btn ${note.favorite ? 'starred' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteNote(note.id);
                        }}
                        title={note.favorite ? 'Unstar' : 'Star note'}
                      >
                        <Star
                          size={14}
                          fill={note.favorite ? '#F59E0B' : 'none'}
                          color={note.favorite ? '#F59E0B' : '#94A3B8'}
                        />
                      </button>
                    </div>

                    <h4 className="note-preview-title">{note.title}</h4>

                    <p className="note-preview-snippet">
                      {note.content.slice(0, 95)}...
                    </p>

                    <div className="note-preview-footer">
                      <div className="note-tags-group">
                        {(note.tags || []).slice(0, 2).map((tag, i) => (
                          <span key={i} className="mini-tag">#{tag}</span>
                        ))}
                      </div>
                      <span className="note-date">{note.updatedAt}</span>
                    </div>
                  </div>
                ))}

              {notes.length === 0 && (
                <div className="empty-notes-search" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <FileText size={32} color="#94A3B8" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>No text notes yet.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsTextNoteModalOpen(true)}>
                    <Plus size={14} /> Add Note
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Note Reader & Editor */}
          <div className="note-editor-card card">
            {selectedTextNote ? (
              <div className="active-note-view">
                <div className="active-note-top-bar">
                  <div className="active-note-meta">
                    <span className="badge badge-primary">{selectedTextNote.subject}</span>
                    <span className="active-note-time">Updated: {selectedTextNote.updatedAt}</span>
                  </div>
                  <div className="active-note-actions">
                    <button
                      className="btn btn-ai-purple btn-sm"
                      onClick={() => setAiAssistantNote(selectedTextNote)}
                      title="AI Study Assistant (Summarize, MCQs, Explain, Quiz)"
                    >
                      <Sparkles size={14} /> AI Assistant
                    </button>
                    <button
                      className={`btn btn-sm ${isEditingTextNote ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setIsEditingTextNote(!isEditingTextNote)}
                    >
                      <Edit3 size={15} /> {isEditingTextNote ? 'View Mode' : 'Edit Note'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleFavoriteNote(selectedTextNote.id)}
                    >
                      <Star
                        size={15}
                        fill={selectedTextNote.favorite ? '#F59E0B' : 'none'}
                        color={selectedTextNote.favorite ? '#F59E0B' : 'currentColor'}
                      />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        deleteNote(selectedTextNote.id);
                        setSelectedTextNoteId(null);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {isEditingTextNote ? (
                  <input
                    type="text"
                    className="form-input note-edit-title-input"
                    value={selectedTextNote.title}
                    onChange={(e) => handleSaveActiveTextNote(undefined, e.target.value)}
                  />
                ) : (
                  <h2 className="active-note-heading">{selectedTextNote.title}</h2>
                )}

                <div className="active-note-tags-row">
                  <Tag size={14} color="#64748B" />
                  {(selectedTextNote.tags || []).map((t, i) => (
                    <span key={i} className="badge badge-lavender">
                      {t}
                    </span>
                  ))}
                </div>

                <div className="active-note-content-area">
                  {isEditingTextNote ? (
                    <textarea
                      className="form-textarea note-edit-textarea"
                      rows={16}
                      value={selectedTextNote.content}
                      onChange={(e) => handleSaveActiveTextNote(e.target.value, undefined)}
                      placeholder="Type notes in markdown or plain text..."
                    ></textarea>
                  ) : (
                    <pre className="note-rendered-text">{selectedTextNote.content}</pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="no-note-selected">
                <BookOpen size={48} color="#94A3B8" />
                <h3>No note selected</h3>
                <p>Choose an item from the sidebar or create a new note.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setIsTextNoteModalOpen(true)}>
                  <Plus size={16} /> Create Note
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Multi-File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={uploadNoteFiles}
        folders={noteFolders}
        currentFolderId={currentFolderId}
        existingSubjects={allSubjects.filter((s) => s !== 'All')}
      />

      {/* 2. In-App Document Preview Modal (PDF & Image Viewer) */}
      <NotePreviewModal
        isOpen={Boolean(previewFile)}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={downloadNoteFile}
        getPreviewUrl={getNoteFilePreviewUrl}
        onOpenAiAssistant={(f) => {
          setPreviewFile(null);
          setAiAssistantNote(f);
        }}
      />

      {/* AI Study Assistant Modal */}
      <AiNoteAssistantModal
        isOpen={Boolean(aiAssistantNote)}
        onClose={() => setAiAssistantNote(null)}
        note={aiAssistantNote}
        onLaunchQuiz={() => {
          setIsQuizModalOpen(true);
        }}
        onAskDoubt={(n) => {
          navigate('/doubt-solver', {
            state: {
              initialPrompt: `I am reviewing my notes for "${n.title || n.fileName}" in ${n.subject || 'this course'}. Can you explain the core concepts and help me prepare for questions on this topic?`,
              noteTitle: n.title || n.fileName
            }
          });
        }}
      />

      {/* AI Quiz Generator Modal */}
      <PdfQuizGeneratorModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        smartNotePdfs={noteFiles.filter((f) => (f.fileExt || '').toLowerCase() === 'pdf')}
        onGenerateQuiz={generateQuizFromPdf}
        getPreviewUrl={getNoteFilePreviewUrl}
        uploadNoteFiles={uploadNoteFiles}
      />

      {/* 3. Folder Create/Rename Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
        initialData={editingFolder}
        parentFolder={currentFolder}
        onSubmit={(folderData) => {
          if (editingFolder) {
            renameNoteFolder(editingFolder.id, folderData.name);
          } else {
            createNoteFolder(folderData);
          }
        }}
      />

      {/* 4. File Rename & Metadata Edit Modal */}
      <FileRenameModal
        isOpen={Boolean(editingFile)}
        file={editingFile}
        folders={noteFolders}
        onClose={() => setEditingFile(null)}
        onSave={renameNoteFile}
      />

      {/* 5. Create Text Note Modal */}
      <Modal
        isOpen={isTextNoteModalOpen}
        onClose={() => setIsTextNoteModalOpen(false)}
        title="Create New Text Note"
      >
        <form onSubmit={handleCreateTextNote}>
          <div className="form-group">
            <label className="form-label">Note Title *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Graph Algorithms: Bellman-Ford"
              value={textNoteForm.title}
              onChange={(e) => setTextNoteForm({ ...textNoteForm, title: e.target.value })}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Subject / Course</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Algorithms & Complexity"
                value={textNoteForm.subject}
                onChange={(e) => setTextNoteForm({ ...textNoteForm, subject: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. DP, Graphs, Midterm"
                value={textNoteForm.tags}
                onChange={(e) => setTextNoteForm({ ...textNoteForm, tags: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes Content</label>
            <textarea
              rows={8}
              className="form-textarea"
              placeholder="Write core principles, equations, summaries..."
              value={textNoteForm.content}
              onChange={(e) => setTextNoteForm({ ...textNoteForm, content: e.target.value })}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTextNoteModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
