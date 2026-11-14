import React, { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  GraduationCap,
  Clock,
  ArrowRight,
  Plus,
  Calendar,
  Circle,
  Sparkles,
  MapPin,
  User,
  Bot,
  FileText,
  ListTodo
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useApp } from '../context/AppContext';
import { StatCard } from '../components/common/StatCard';
import { AiTimetableUploadModal } from '../components/timetable/AiTimetableUploadModal';
import { AiExamUploadModal } from '../components/exams/AiExamUploadModal';
import './DashboardPage.css';

export const DashboardPage = () => {
  const {
    user,
    timetable = [],
    assignments = [],
    toggleAssignmentStatus,
    exams = [],
    studyTasks = [],
    studySessions = []
  } = useApp();

  const navigate = useNavigate();

  // Modals for AI quick actions
  const [isAiTimetableModalOpen, setIsAiTimetableModalOpen] = useState(false);
  const [isAiExamModalOpen, setIsAiExamModalOpen] = useState(false);

  // Today's day name (e.g. 'Monday')
  const currentDayOfWeek = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long' }), []);
  const [selectedDay, setSelectedDay] = useState(currentDayOfWeek);

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const pendingAssignments = assignments.filter((a) => a.status === 'pending');
  const completedAssignmentsCount = assignments.filter((a) => a.status === 'completed').length;

  const todayClasses = timetable.filter(
    (item) => item.day?.toLowerCase() === selectedDay.toLowerCase()
  );

  // Dynamic calculations based strictly on real user records
  const todayMinutesFromTasks = (studyTasks || [])
    .filter((t) => t.completed)
    .reduce((acc, t) => acc + (Number(t.minutes) || 0), 0);

  const todayCompletedHours = parseFloat(
    ((user.todayCompletedHours || 0) + todayMinutesFromTasks / 60).toFixed(1)
  );

  const dailyGoal = Number(user.dailyGoalHours) || 4.0;
  const goalProgressPct = Math.min(100, Math.round((todayCompletedHours / dailyGoal) * 100));

  // Calculate weekly study hours from actual user study sessions and completed tasks
  const dynamicWeeklyData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hoursMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    (studySessions || []).forEach((sess) => {
      if (sess.startTime) {
        const d = new Date(sess.startTime);
        const name = dayNames[d.getDay()];
        if (hoursMap[name] !== undefined) {
          hoursMap[name] += (Number(sess.duration) || 0) / 60;
        }
      }
    });

    const currentDayName = dayNames[new Date().getDay()];
    (studyTasks || [])
      .filter((t) => t.completed)
      .forEach((t) => {
        hoursMap[currentDayName] += (Number(t.minutes) || 0) / 60;
      });

    return order.map((day) => ({
      day,
      hours: parseFloat(hoursMap[day].toFixed(1)),
      target: dailyGoal
    }));
  }, [studySessions, studyTasks, dailyGoal]);

  // Next upcoming exam days
  const sortedExams = useMemo(() => {
    return [...exams]
      .filter((e) => e.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [exams]);

  const nextExamSub = useMemo(() => {
    if (sortedExams.length === 0) return 'No upcoming exams';
    const next = sortedExams[0];
    const diff = Math.ceil((new Date(next.date) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return `${next.subject} (Today)`;
    if (diff === 1) return `${next.subject} (Tomorrow)`;
    if (diff < 0) return `${next.subject} (Recent)`;
    return `${next.subject} in ${diff} days`;
  }, [sortedExams]);

  const getNextExamSub = () => nextExamSub;

  // AI Study Insight target exam
  const nextExam = sortedExams[0] || null;
  const remainingTopicsCount = nextExam?.topics
    ? nextExam.topics.filter((t) => !t.done).length
    : 3;

  return (
    <div className="dashboard-page">
      {/* ================= HERO GREETING ================= */}
      <div className="dashboard-hero-greeting">
        <div className="greeting-text-wrap">
          <h1 className="greeting-heading">Good morning, {user.name || 'Student'}!</h1>
          <p className="greeting-sub">Welcome back to LearnMate. Let's make today productive.</p>
        </div>

        {/* SECTION F: Quick Actions Bar */}
        <div className="quick-actions-bar">
          <button
            type="button"
            className="quick-action-btn btn-ai-purple"
            onClick={() => setIsAiTimetableModalOpen(true)}
            title="Upload and extract college timetable with AI"
          >
            <Sparkles size={15} /> Upload Timetable
          </button>
          <button
            type="button"
            className="quick-action-btn btn-ai-purple"
            onClick={() => setIsAiExamModalOpen(true)}
            title="Upload exam datesheet with AI"
          >
            <Calendar size={15} /> Upload Exam Schedule
          </button>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => navigate('/assignments')}
            title="Add a coursework task"
          >
            <Plus size={15} /> Add Assignment
          </button>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => navigate('/notes')}
            title="Upload revision notes or materials"
          >
            <FileText size={15} /> Upload Notes
          </button>
          <button
            type="button"
            className="quick-action-btn btn-ai-teal"
            onClick={() => navigate('/doubt-solver')}
            title="Ask AI Doubt Solver"
          >
            <Bot size={15} /> Ask AI
          </button>
        </div>
      </div>

      {/* ================= 4 COLOURFUL STAT CARDS ================= */}
      <div className="dashboard-stat-cards-grid">
        <StatCard
          icon={Calendar}
          title="Today's Classes"
          value={todayClasses.length}
          trend={`${timetable.length} weekly total`}
          subvalue={`Scheduled for ${selectedDay}`}
          color="purple"
          onClick={() => navigate('/timetable')}
        />
        <StatCard
          icon={CheckSquare}
          title="Pending Assignments"
          value={pendingAssignments.length}
          trend={`${completedAssignmentsCount} completed`}
          subvalue="Assignments in progress"
          color="coral"
          onClick={() => navigate('/assignments')}
        />
        <StatCard
          icon={GraduationCap}
          title="Upcoming Exams"
          value={exams.length}
          subvalue={getNextExamSub()}
          color="lavender"
          onClick={() => navigate('/exams')}
        />
        <StatCard
          icon={Clock}
          title="Study Hours"
          value={`${todayCompletedHours}h`}
          trend={`${goalProgressPct}% goal reached`}
          subvalue={`${dailyGoal}h daily target`}
          color="teal"
          onClick={() => navigate('/analytics')}
        />
      </div>

      {/* ================= SECTION E: AI STUDY INSIGHTS CARD ================= */}
      <div className="dashboard-ai-insights-card card">
        <div className="ai-insights-left">
          <div className="ai-sparkle-avatar">
            <Sparkles size={24} />
          </div>
          <div className="ai-insights-text">
            <span className="ai-insights-tag">AI Study Insight & Recommendations</span>
            <h3 className="ai-insights-title">
              {nextExam ? (
                <>Your next <strong>{nextExam.subject}</strong> exam is approaching. You have <strong>{remainingTopicsCount}</strong> topics remaining. Let's prepare a study plan!</>
              ) : (
                <>Upload your class timetable and exam schedule to get personalized AI study roadmaps and schedule reminders.</>
              )}
            </h3>
            <p className="ai-insights-desc">
              Gemini AI automatically breaks down syllabus chapters into manageable 45-minute focus blocks before each test.
            </p>
          </div>
        </div>
        <div className="ai-insights-action">
          <button
            type="button"
            className="btn btn-primary btn-generate-study-plan"
            onClick={() => navigate('/exams')}
          >
            <ListTodo size={16} /> Generate Study Plan
          </button>
        </div>
      </div>

      {/* ================= MAIN DASHBOARD CONTENT GRID ================= */}
      <div className="dashboard-content-columns">
        {/* LEFT COLUMN: Section A & Section D */}
        <div className="dashboard-col-left">
          {/* SECTION A: Today's Schedule */}
          <div className="dashboard-section-card card">
            <div className="section-header-row">
              <div>
                <h3 className="section-heading">Today's Class Schedule</h3>
                <p className="section-sub">Lectures & practicals for {selectedDay}</p>
              </div>
              <div className="day-pills-row">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`dash-day-pill ${selectedDay === d ? 'active' : ''}`}
                    onClick={() => setSelectedDay(d)}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="classes-timeline-list">
              {todayClasses.length > 0 ? (
                todayClasses.map((item, idx) => (
                  <div key={item.id || idx} className={`class-timeline-item border-${item.color || 'purple'}`}>
                    <div className="class-time-block">
                      <Clock size={13} />
                      <span>{item.time || '10:00 AM'}</span>
                    </div>
                    <div className="class-info-block">
                      <div className="class-title-line">
                        <span className="class-code-badge">{item.code}</span>
                        <h4 className="class-title-text">{item.subject}</h4>
                        <span className={`badge badge-sm badge-${item.color || 'purple'}`}>{item.type || 'Lecture'}</span>
                      </div>
                      <div className="class-venue-line">
                        <span className="venue-detail"><MapPin size={12} /> {item.room || 'TBA'}</span>
                        <span className="instructor-detail"><User size={12} /> {item.instructor || 'Faculty'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="dash-empty-box">
                  <Calendar size={32} color="#A5A3B8" />
                  <p>No classes scheduled for {selectedDay}</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/timetable')}
                  >
                    <Plus size={14} /> Add Class to Schedule
                  </button>
                </div>
              )}
            </div>

            <NavLink to="/timetable" className="dash-card-footer-link">
              View Complete Weekly Timetable <ArrowRight size={14} />
            </NavLink>
          </div>

          {/* SECTION D: Weekly Study Progress Chart */}
          <div className="dashboard-section-card card">
            <div className="section-header-row">
              <div>
                <h3 className="section-heading">Weekly Study Progress</h3>
                <p className="section-sub">Daily hours logged vs {dailyGoal}h target</p>
              </div>
              <NavLink to="/analytics" className="view-more-link">
                Full Analytics <ArrowRight size={13} />
              </NavLink>
            </div>

            <div className="chart-container-box">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dynamicWeeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F766E" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9E7F2" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#77758A', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#77758A', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #CCFBF1',
                      boxShadow: '0 4px 14px rgba(15, 118, 110, 0.1)'
                    }}
                    formatter={(val) => [`${val} Hours`, 'Studied']}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#0F766E"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#tealGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Section B & Section C */}
        <div className="dashboard-col-right">
          {/* SECTION B: Upcoming Exams */}
          <div className="dashboard-section-card card">
            <div className="section-header-row">
              <div>
                <h3 className="section-heading">Upcoming Exams</h3>
                <p className="section-sub">Chronological dates & test venues</p>
              </div>
              <NavLink to="/exams" className="view-more-link">
                View Exam Planner <ArrowRight size={13} />
              </NavLink>
            </div>

            <div className="dash-exams-list">
              {sortedExams.length > 0 ? (
                sortedExams.slice(0, 3).map((exam, idx) => {
                  const examD = new Date(exam.date);
                  examD.setHours(0, 0, 0, 0);
                  const diffDays = Math.ceil((examD - todayMidnight) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={exam.id || idx} className="dash-exam-row">
                      <div className="dash-exam-countdown">
                        <span className="exam-countdown-days">
                          {diffDays < 0 ? 'Done' : diffDays === 0 ? 'Today' : `${diffDays}d`}
                        </span>
                        <span className="exam-countdown-sub">
                          {diffDays === 0 ? 'Exam Today' : diffDays === 1 ? 'Tomorrow' : 'Remaining'}
                        </span>
                      </div>
                      <div className="dash-exam-details">
                        <div className="dash-exam-title-line">
                          <span className="dash-exam-code">{exam.code}</span>
                          <h4 className="dash-exam-name">{exam.subject}</h4>
                        </div>
                        <div className="dash-exam-meta-line">
                          <span><Calendar size={12} /> {exam.date}</span>
                          <span><Clock size={12} /> {exam.time || '10:00 AM'}</span>
                          <span><MapPin size={12} /> {exam.venue || exam.room || 'Main Hall'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="dash-empty-box">
                  <GraduationCap size={32} color="#A5A3B8" />
                  <p>No exams currently scheduled</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsAiExamModalOpen(true)}
                  >
                    <Sparkles size={14} /> Upload Schedule (AI)
                  </button>
                </div>
              )}
            </div>

            <NavLink to="/exams" className="dash-card-footer-link">
              Open Full Exam Planner & Roadmap <ArrowRight size={14} />
            </NavLink>
          </div>

          {/* SECTION C: Pending Assignments */}
          <div className="dashboard-section-card card">
            <div className="section-header-row">
              <div>
                <h3 className="section-heading">Pending Assignments</h3>
                <p className="section-sub">{pendingAssignments.length} coursework tasks in progress</p>
              </div>
              <NavLink to="/assignments" className="view-more-link">
                View All <ArrowRight size={13} />
              </NavLink>
            </div>

            <div className="dash-assignments-list">
              {pendingAssignments.length > 0 ? (
                pendingAssignments.slice(0, 4).map((asg) => (
                  <div key={asg.id} className="dash-assignment-row">
                    <button
                      type="button"
                      className="dash-task-check-btn"
                      onClick={() => toggleAssignmentStatus && toggleAssignmentStatus(asg.id)}
                      title="Mark as completed"
                    >
                      <Circle size={18} color="#0F766E" />
                    </button>
                    <div className="dash-assignment-info">
                      <div className="dash-asg-title-row">
                        <h4 className="dash-asg-title">{asg.title}</h4>
                        <span className={`badge badge-sm badge-${asg.priority === 'high' ? 'coral' : asg.priority === 'medium' ? 'warning' : 'teal'}`}>
                          {asg.priority || 'Medium'}
                        </span>
                      </div>
                      <div className="dash-asg-meta-row">
                        <span className="asg-subject-pill">{asg.subject}</span>
                        <span className="asg-due-date">Due: {asg.dueDate || 'Soon'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="dash-empty-box">
                  <CheckSquare size={32} color="#A5A3B8" />
                  <p>Zero pending assignments! All caught up.</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/assignments')}
                  >
                    <Plus size={14} /> Add New Assignment
                  </button>
                </div>
              )}
            </div>

            <NavLink to="/assignments" className="dash-card-footer-link">
              Manage Assignments & Tasks <ArrowRight size={14} />
            </NavLink>
          </div>
        </div>
      </div>

      {/* AI Timetable Modal */}
      <AiTimetableUploadModal
        isOpen={isAiTimetableModalOpen}
        onClose={() => setIsAiTimetableModalOpen(false)}
      />

      {/* AI Exam Modal */}
      <AiExamUploadModal
        isOpen={isAiExamModalOpen}
        onClose={() => setIsAiExamModalOpen(false)}
      />
    </div>
  );
};
