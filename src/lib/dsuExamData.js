// src/lib/dsuExamData.js
// Authoritative dataset and pattern definitions for DSU Mid-Semester Examination schedule

export const DSU_EXAM_METADATA = {
  institution: 'Dayananda Sagar University - School of Engineering',
  department: 'Department of Computer Science and Engineering',
  circularDate: '06-11-2026',
  examTitle: 'Additional Mid Semester Examination',
  academicYear: '2026-27 (ODD)',
  semester: 'Semester III',
  defaultVenue: 'Test Hall',
  instructions: [
    'Students should report to the test Hall 15 min before the commencement.',
    'QP will have 4 questions of 10 marks each. All questions are COMPULSORY.'
  ]
};

export function getDayOfWeekFromDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return '';
  }
}

export function getVerifiedDsuExamSchedule() {
  return [
    {
      date: '2026-11-16',
      day: 'Monday',
      dayOfWeek: 'Monday',
      code: '25CS2301',
      subject: 'Advanced Probability & Stochastic Processes',
      startTime: '10:45 AM',
      endTime: '12:00 PM',
      time: '10:45 AM - 12:00 PM',
      duration: '1h 15m',
      session: 'Morning',
      examName: 'Mid Semester Exam',
      venue: 'Test Hall',
      weight: '25%',
      semester: 'III',
      topics: [
        { id: 'top_1', title: 'Probability Distributions & Random Variables', done: false },
        { id: 'top_2', title: 'Stochastic Processes & Markov Chains', done: false },
        { id: 'top_3', title: 'Past Question Paper & Problem Sets', done: false }
      ]
    },
    {
      date: '2026-11-16',
      day: 'Monday',
      dayOfWeek: 'Monday',
      code: '25CS2302',
      subject: 'Digital Logic Design & Computer Architecture',
      startTime: '02:45 PM',
      endTime: '04:00 PM',
      time: '02:45 PM - 04:00 PM',
      duration: '1h 15m',
      session: 'Afternoon',
      examName: 'Mid Semester Exam',
      venue: 'Test Hall',
      weight: '25%',
      semester: 'III',
      topics: [
        { id: 'top_4', title: 'Combinational & Sequential Logic Circuits', done: false },
        { id: 'top_5', title: 'CPU Architecture, Registers & ALU Design', done: false },
        { id: 'top_6', title: 'Memory Hierarchy & Instruction Pipelining', done: false }
      ]
    },
    {
      date: '2026-11-17',
      day: 'Tuesday',
      dayOfWeek: 'Tuesday',
      code: '25CS2303',
      subject: 'Database Management Systems',
      startTime: '10:45 AM',
      endTime: '12:00 PM',
      time: '10:45 AM - 12:00 PM',
      duration: '1h 15m',
      session: 'Morning',
      examName: 'Mid Semester Exam',
      venue: 'Test Hall',
      weight: '25%',
      semester: 'III',
      topics: [
        { id: 'top_7', title: 'Relational Model, ER Diagrams & Schema Design', done: false },
        { id: 'top_8', title: 'SQL Queries, Joins & Normalization (1NF to BCNF)', done: false },
        { id: 'top_9', title: 'Transactions, ACID Properties & Concurrency Control', done: false }
      ]
    },
    {
      date: '2026-11-17',
      day: 'Tuesday',
      dayOfWeek: 'Tuesday',
      code: '25CS2304',
      subject: 'Discrete Mathematics and Graph Theory',
      startTime: '02:45 PM',
      endTime: '04:00 PM',
      time: '02:45 PM - 04:00 PM',
      duration: '1h 15m',
      session: 'Afternoon',
      examName: 'Mid Semester Exam',
      venue: 'Test Hall',
      weight: '25%',
      semester: 'III',
      topics: [
        { id: 'top_10', title: 'Propositional Logic, Sets, Relations & Functions', done: false },
        { id: 'top_11', title: 'Graph Theory, Trees & Shortest Path Algorithms', done: false },
        { id: 'top_12', title: 'Recurrence Relations & Combinatorics', done: false }
      ]
    },
    {
      date: '2026-11-18',
      day: 'Wednesday',
      dayOfWeek: 'Wednesday',
      code: '25CS2305',
      subject: 'Data Structures & Algorithms',
      startTime: '10:45 AM',
      endTime: '12:00 PM',
      time: '10:45 AM - 12:00 PM',
      duration: '1h 15m',
      session: 'Morning',
      examName: 'Mid Semester Exam',
      venue: 'Test Hall',
      weight: '25%',
      semester: 'III',
      topics: [
        { id: 'top_13', title: 'Arrays, Linked Lists, Stacks & Queues Implementation', done: false },
        { id: 'top_14', title: 'Binary Trees, BST, AVL Trees & Heaps', done: false },
        { id: 'top_15', title: 'Sorting, Searching & Time Complexity Analysis', done: false }
      ]
    },
    {
      date: '2026-11-18',
      day: 'Wednesday',
      dayOfWeek: 'Wednesday',
      code: '25CS2306',
      subject: 'Foundations of AI & Authentic Intelligence',
      startTime: '02:45 PM',
      endTime: '04:00 PM',
      time: '02:45 PM - 04:00 PM',
      duration: '1h 15m',
      session: 'Afternoon',
      examName: 'Mid Semester Exam',
      venue: 'Test Hall',
      weight: '25%',
      semester: 'III',
      topics: [
        { id: 'top_16', title: 'Intelligent Agents, Search Strategies & Heuristics', done: false },
        { id: 'top_17', title: 'Knowledge Representation, Logic & Reasoning', done: false },
        { id: 'top_18', title: 'Machine Learning Basics & Neural Network Foundations', done: false }
      ]
    },
    {
      date: '2026-11-19',
      day: 'Thursday',
      dayOfWeek: 'Thursday',
      code: '25CS2308',
      subject: 'Skill Enhancement Course-1 (AI powered Full Stack Development)',
      startTime: '10:45 AM',
      endTime: '12:00 PM',
      time: '10:45 AM - 12:00 PM',
      duration: '1h 15m',
      session: 'Morning',
      examName: 'Mid Semester Exam',
      venue: 'Test Hall',
      weight: '25%',
      semester: 'III',
      electiveNotes: 'Tracks: 25CS2308 (AI Full Stack) / 25CS2310 (Linux Scripting) / 25CS2312 (XR & Immersive)',
      topics: [
        { id: 'top_19', title: 'Frontend Architecture, React & Component State', done: false },
        { id: 'top_20', title: 'REST APIs, Backend Integration & Database Models', done: false },
        { id: 'top_21', title: 'AI Integration, Prompts & Web Deployment', done: false }
      ]
    }
  ];
}

