import React, { useState, useEffect } from 'react';
import {
  UserRole,
  ClassWorkspace,
  Subject,
  TimetableClass,
  AcademicMaterial,
  HistoricalPYQ,
  PYQAnalysisItem,
  ExamDateSheetItem,
  ClassAnnouncement,
  AppNotification,
  AcademicAssignment,
  SevenMinutePrep,
  TopicStatus,
} from './types/index';
import {
  SEED_CLASS,
  SEED_SUBJECTS,
  SEED_UNITS,
  SEED_TIMETABLE,
  SEED_MATERIALS,
  SEED_PYQS,
  SEED_EXAMS,
  SEED_ANNOUNCEMENTS,
  SEED_NOTIFICATIONS,
  SEED_ASSIGNMENTS,
} from './server/db/seedData';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveNavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AITutorView } from './components/AITutorView';
import { SyllabusMapView } from './components/SyllabusMapView';
import { MaterialsView } from './components/MaterialsView';
import { PYQLibraryView } from './components/PYQLibraryView';
import { ExamModeView } from './components/ExamModeView';
import { TimetableView } from './components/TimetableView';
import { AssignmentsView } from './components/AssignmentsView';
import { TomorrowPrepModal } from './components/TomorrowPrepModal';
import { SemesterSetupModal } from './components/SemesterSetupModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallPopup } from './components/PWAInstallPopup';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { initTheme } from './utils/themeService';

export default function App() {
  const getInitialTab = (): ActiveNavTab => {
    try {
      const hash = window.location.hash.replace('#', '') as ActiveNavTab;
      const validTabs: ActiveNavTab[] = [
        'dashboard',
        'tomorrow',
        'syllabus',
        'timetable',
        'ai-tutor',
        'materials',
        'pyqs',
        'exams',
        'assignments',
        'setup',
      ];
      if (validTabs.includes(hash)) {
        return hash;
      }
    } catch {
      // fallback
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<ActiveNavTab>(getInitialTab);
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [classCode, setClassCode] = useState<string>('BCA-2028');

  // Sync tab with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ActiveNavTab;
      if (hash && hash !== activeTab) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  const handleSelectTab = (tab: ActiveNavTab) => {
    setActiveTab(tab);
    try {
      window.location.hash = tab;
    } catch {
      // ignore
    }
  };

  // Core Academic State
  const [workspace, setWorkspace] = useState<ClassWorkspace>(SEED_CLASS);
  const [subjects, setSubjects] = useState<Subject[]>(SEED_SUBJECTS);
  const [unitsBySubject, setUnitsBySubject] = useState<Record<string, any>>(SEED_UNITS);
  const [timetable, setTimetable] = useState<TimetableClass[]>(SEED_TIMETABLE);
  const [materials, setMaterials] = useState<AcademicMaterial[]>(SEED_MATERIALS);
  const [pyqs, setPyqs] = useState<HistoricalPYQ[]>(SEED_PYQS);
  const [exams, setExams] = useState<ExamDateSheetItem[]>(SEED_EXAMS);
  const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>(SEED_ANNOUNCEMENTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(SEED_NOTIFICATIONS);
  const [assignments, setAssignments] = useState<AcademicAssignment[]>(SEED_ASSIGNMENTS);

  // Modals & Drawers
  const [isTomorrowModalOpen, setIsTomorrowModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initialTutorPrompt, setInitialTutorPrompt] = useState('');

  // Initialize selected UI Mode and Theme
  useEffect(() => {
    initTheme();
  }, []);
  const [calmMode, setCalmMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('syllabus_calm_mode');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_calm_mode', String(calmMode));
    } catch {
      // ignore
    }
  }, [calmMode]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('syllabus_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_sidebar_collapsed', String(isSidebarCollapsed));
    } catch {
      // ignore local storage restrictions if any
    }
  }, [isSidebarCollapsed]);

  // 7-Minute Prep state
  const [tomorrowPrepData, setTomorrowPrepData] = useState<SevenMinutePrep>({
    subjectName: 'Java Programming',
    topicTitle: 'Inheritance & super Keyword',
    room: 'Room 204',
    time: '10:00 AM',
    step1WhatIsIt:
      'Inheritance is an OOP mechanism that allows a subclass to inherit fields and methods from a superclass using the extends keyword.',
    step2WhyUsed:
      'It prevents rewriting boilerplate logic, ensures modular maintenance, and enables runtime polymorphism.',
    step3AnalogyAndExample:
      'Think of a parent giving their car blueprint to their child: the child inherits the engine and wheels, but adds their own customized stereo. class Car extends Vehicle { }',
    step4MiniQuiz: [
      {
        question: 'Which keyword is used to inherit a class in Java?',
        options: ['implements', 'extends', 'inherits', 'import'],
        correctIndex: 1,
        explanation: 'extends connects two classes in Java.',
      },
      {
        question: 'Can a Java class extend multiple classes simultaneously?',
        options: ['Yes', 'No (Disallowed to prevent Diamond Ambiguity)', 'Only in interfaces', 'Only if final'],
        correctIndex: 1,
        explanation: 'Classes only support single and multilevel inheritance; interfaces allow multiple inheritance.',
      },
      {
        question: 'What does the super() method call?',
        options: ['The parent constructor', 'Garbage collection', 'System exit', 'Private variables'],
        correctIndex: 0,
        explanation: 'super() delegates initialization to the immediate superclass constructor.',
      },
    ],
  });

  // Fetch live tomorrow prep from server
  useEffect(() => {
    fetch('/api/tomorrow/class-bca-2028')
      .then((r) => r.json())
      .then((data) => {
        if (data.prep) setTomorrowPrepData(data.prep);
      })
      .catch((err) => console.warn('Using local prep data:', err));
  }, []);

  const handleUpdateTopicStatus = (subjectId: string, topicId: string, status: TopicStatus) => {
    setUnitsBySubject((prev) => {
      const updated = { ...prev };
      const subUnits = updated[subjectId] || [];
      updated[subjectId] = subUnits.map((u: any) => ({
        ...u,
        topics: u.topics.map((t: any) => (t.id === topicId ? { ...t, status } : t)),
      }));
      return updated;
    });

    fetch('/api/syllabus/topic-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId, topicId, status }),
    }).catch(console.error);
  };

  const handleStudyTopic = (topicTitle: string, subjectName: string) => {
    setInitialTutorPrompt(`Explain the core principles and university exam gotchas of "${topicTitle}" in ${subjectName}.`);
    setActiveTab('ai-tutor');
  };

  const handleQuickAIAction = (actionType: string) => {
    switch (actionType) {
      case 'explain':
        setInitialTutorPrompt('Explain Database Normalization (1NF, 2NF, 3NF, BCNF) simply with real-life analogies.');
        setActiveTab('ai-tutor');
        break;
      case 'summarize':
        setActiveTab('materials');
        break;
      case 'mindmap':
        setInitialTutorPrompt('Create a Mermaid mind map and architecture breakdown for Operating System Deadlocks & Banker Algorithm.');
        setActiveTab('ai-tutor');
        break;
      case 'quiz':
        setIsTomorrowModalOpen(true);
        break;
      case 'pyqs':
        setActiveTab('pyqs');
        break;
      case 'revision':
        setActiveTab('exams');
        break;
      default:
        setActiveTab('ai-tutor');
    }
  };

  const handleToggleRevisionDay = (examId: string, dayNumber: number) => {
    setExams((prev) =>
      prev.map((ex) => {
        if (ex.id !== examId) return ex;
        return {
          ...ex,
          revisionDaysPlan: ex.revisionDaysPlan.map((d) =>
            d.dayNumber === dayNumber ? { ...d, completed: !d.completed } : d
          ),
        };
      })
    );

    fetch('/api/exams/toggle-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, dayNumber }),
    }).catch(console.error);
  };

  const handleMaterialUploaded = (newMat: AcademicMaterial) => {
    setMaterials((prev) => [newMat, ...prev]);
  };

  const handleSetupComplete = (classData: any) => {
    if (classData.workspace) {
      setWorkspace(classData.workspace);
      setClassCode(classData.workspace.code);
    }
    if (classData.subjects) {
      setSubjects(classData.subjects);
    }
    if (classData.workspace?.verifiedByCR) {
      setNotifications((prev) => [
        {
          id: `notif-cr-auth-${Date.now()}`,
          title: `CR Verified: ${classData.workspace.code}`,
          message: `Semester ${classData.workspace.semester} subjects and folders authenticated by CR ${classData.workspace.crName || 'Representative'}.`,
          type: 'class_reminder',
          time: 'Just now',
          read: false,
        },
        ...prev,
      ]);
    }
    setActiveTab('dashboard');
  };

  const handleSearchResultClick = (type: string, title: string) => {
    if (type.includes('Topic')) {
      handleStudyTopic(title, 'Computer Science');
    } else if (type.includes('PYQ')) {
      setActiveTab('pyqs');
    } else if (type.includes('Material') || type.includes('PPT')) {
      setActiveTab('materials');
    } else {
      setActiveTab('syllabus');
    }
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/25 selection:text-cyan-100">
      {/* 1. TOP NAVBAR */}
      <Navbar
        classCode={classCode}
        onNavigateHome={() => setActiveTab('dashboard')}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenClassSetup={() => setIsSetupModalOpen(true)}
        unreadNotificationsCount={unreadNotificationsCount}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        calmMode={calmMode}
        onToggleCalmMode={() => setCalmMode((prev) => !prev)}
        onOpenThemeSelector={() => setIsThemeModalOpen(true)}
      />

      {/* 2. MAIN LAYOUT: SIDEBAR + CONTENT WORKSPACE */}
      <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Desktop Sidebar (Collapsible) */}
        <div className="hidden lg:flex h-full shrink-0">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            classCode={classCode}
            semesterNumber={workspace.semester}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
            onOpenClassSetup={() => setIsSetupModalOpen(true)}
          />
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-sm">
            <div className="w-4/5 max-w-xs h-full bg-slate-950 shadow-2xl flex flex-col">
              <Sidebar
                activeTab={activeTab}
                onSelectTab={(tab) => {
                  handleSelectTab(tab);
                  setMobileMenuOpen(false);
                }}
                classCode={classCode}
                semesterNumber={workspace.semester}
                onOpenClassSetup={() => {
                  setIsSetupModalOpen(true);
                  setMobileMenuOpen(false);
                }}
              />
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Workspace Area */}
        <main className="flex-1 h-full overflow-y-auto px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              studentName="Aman Kumar"
              classCode={classCode}
              semesterNumber={workspace.semester}
              todayClasses={timetable.filter((t) => t.day === 'Wednesday')}
              tomorrowClasses={timetable.filter((t) => t.day === 'Thursday')}
              upcomingExams={exams}
              recentMaterials={materials.slice(0, 4)}
              announcements={announcements}
              subjects={subjects}
              assignments={assignments}
              onOpenTomorrowPrep={() => setIsTomorrowModalOpen(true)}
              onNavigateTab={handleSelectTab}
              onTriggerQuickAIAction={handleQuickAIAction}
              calmMode={calmMode}
            />
          )}

          {activeTab === 'tomorrow' && (
            <div className="space-y-4 max-w-3xl mx-auto py-6">
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-medium text-slate-100">Tomorrow's Pre-Class Preparation</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    7-minute intuitive breakdown before your professor walks in.
                  </p>
                </div>
                <button
                  onClick={() => setIsTomorrowModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Start 7-Min Prep →
                </button>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800/80 space-y-2">
                <span className="text-xs font-medium text-slate-400">Class: {tomorrowPrepData.subjectName}</span>
                <h3 className="font-medium text-sm text-slate-200">{tomorrowPrepData.topicTitle}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {tomorrowPrepData.step1WhatIsIt}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'syllabus' && (
            <SyllabusMapView
              subjects={subjects}
              unitsBySubject={unitsBySubject}
              onUpdateTopicStatus={handleUpdateTopicStatus}
              onStudyTopic={handleStudyTopic}
            />
          )}

          {activeTab === 'ai-tutor' && (
            <AITutorView subjects={subjects} initialPrompt={initialTutorPrompt} />
          )}

          {activeTab === 'materials' && (
            <MaterialsView
              materials={materials}
              subjects={subjects}
              currentRole={currentRole}
              onMaterialUploaded={handleMaterialUploaded}
            />
          )}

          {activeTab === 'pyqs' && (
            <PYQLibraryView
              pyqs={pyqs}
              analysisItems={[
                {
                  topicTitle: 'Normalization (1NF, 2NF, 3NF, BCNF)',
                  subjectName: 'Database Management Systems',
                  frequency: 4,
                  yearsAsked: [2021, 2022, 2024, 2025],
                  highestMarks: 10,
                  importanceTier: 'Very High (Must Prepare)',
                },
                {
                  topicTitle: 'ACID Properties & Transaction Schedules',
                  subjectName: 'Database Management Systems',
                  frequency: 3,
                  yearsAsked: [2022, 2023, 2024],
                  highestMarks: 10,
                  importanceTier: 'High',
                },
                {
                  topicTitle: 'Deadlock: Coffman Conditions & Banker Algorithm',
                  subjectName: 'Operating Systems',
                  frequency: 4,
                  yearsAsked: [2021, 2023, 2024, 2025],
                  highestMarks: 10,
                  importanceTier: 'Very High (Must Prepare)',
                },
              ]}
              subjects={subjects}
            />
          )}

          {activeTab === 'exams' && (
            <ExamModeView
              exams={exams}
              onToggleRevisionDay={handleToggleRevisionDay}
              onOpenStudySession={(subName) => handleStudyTopic('End-Term Revision', subName)}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableView timetable={timetable} onStudyTopic={handleStudyTopic} />
          )}

          {activeTab === 'assignments' && (
            <AssignmentsView
              assignments={assignments}
              subjects={subjects}
              onUpdateAssignments={(updated) => setAssignments(updated)}
            />
          )}

          {activeTab === 'setup' && (
            <div className="max-w-2xl mx-auto py-8 text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">Semester Configuration</h2>
              <p className="text-xs text-slate-400">
                Update your class code, add subjects, or re-parse university syllabi.
              </p>
              <button
                onClick={() => setIsSetupModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg cursor-pointer"
              >
                Open Semester Setup Wizard ⚙️
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 3. MODALS & DRAWERS */}
      <TomorrowPrepModal
        isOpen={isTomorrowModalOpen}
        onClose={() => setIsTomorrowModalOpen(false)}
        prep={tomorrowPrepData}
      />

      <SemesterSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onSetupComplete={handleSetupComplete}
      />

      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectResult={handleSearchResultClick}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onActionClick={(url) => {
          setIsNotificationsOpen(false);
          if (url.includes('tomorrow')) setActiveTab('tomorrow');
          else if (url.includes('materials')) setActiveTab('materials');
          else if (url.includes('exams')) setActiveTab('exams');
        }}
      />

      {/* 4. OFFLINE PWA RESILIENCE INDICATOR & FIRST-TIME INSTALL POPUP */}
      <OfflineIndicator />
      <PWAInstallPopup />
    </div>
  );
}
