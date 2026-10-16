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
import { AIKeyConfigModal } from './components/AIKeyConfigModal';
import { SettingsView } from './components/SettingsView';
import { LoginModal, UserProfile } from './components/LoginModal';
import { LandingPageView } from './components/LandingPageView';
import { initTheme } from './utils/themeService';
import {
  BackgroundConfig,
  getStoredBackgroundConfig,
} from './utils/backgroundService';

const DEFAULT_USER: UserProfile = {
  id: 'user-cr-1',
  name: 'Aman Kumar',
  email: 'aman.cr@cs.university.edu',
  rollNumber: 'BCA-2028-042',
  role: 'cr',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  classCode: 'BCA-2028',
  isLoggedIn: true,
};

export default function App() {
  const getInitialTab = (): ActiveNavTab => {
    try {
      const hash = window.location.hash.replace('#', '') as ActiveNavTab;
      const validTabs: ActiveNavTab[] = [
        'landing',
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
        'settings',
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
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(getStoredBackgroundConfig);

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
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('syllabus_notifications');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return SEED_NOTIFICATIONS;
  });
  const [assignments, setAssignments] = useState<AcademicAssignment[]>(SEED_ASSIGNMENTS);

  const handleMarkAllRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem('syllabus_notifications', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    try {
      localStorage.setItem('syllabus_notifications', JSON.stringify([]));
    } catch {
      // ignore
    }
  };

  const handleClearSingleNotification = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        localStorage.setItem('syllabus_notifications', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Modals & Drawers
  const [isTomorrowModalOpen, setIsTomorrowModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isAIKeyModalOpen, setIsAIKeyModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initialTutorPrompt, setInitialTutorPrompt] = useState('');

  // User Profile State (persisted)
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('syllabus_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_USER;
  });

  const handleLogin = (profile: UserProfile) => {
    setCurrentUser(profile);
    setCurrentRole(profile.role);
    try {
      localStorage.setItem('syllabus_user_profile', JSON.stringify(profile));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    const guestProfile: UserProfile = {
      id: 'user-guest',
      name: 'Guest Student',
      email: 'guest@university.edu',
      rollNumber: 'GUEST-001',
      role: 'student',
      classCode: classCode || 'BCA-2028',
      isLoggedIn: false,
    };
    setCurrentUser(guestProfile);
    setCurrentRole('student');
    try {
      localStorage.setItem('syllabus_user_profile', JSON.stringify(guestProfile));
    } catch {
      // ignore
    }
    setActiveTab('landing');
    try {
      window.location.hash = 'landing';
    } catch {
      // ignore
    }
  };

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
    <div className="relative flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-neutral-800 selection:text-white">
      {/* College Doodles / Custom Wallpaper Backdrop Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300"
        style={{
          opacity: bgConfig.opacity,
          filter: bgConfig.blur > 0 ? `blur(${bgConfig.blur}px)` : undefined,
          backgroundImage:
            bgConfig.type === 'college-doodles'
              ? "url('/college-doodles-bg.jpg')"
              : bgConfig.type === 'college-vector'
              ? "url('/college-doodles.svg')"
              : bgConfig.type === 'grid'
              ? 'linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)'
              : bgConfig.type === 'dots'
              ? 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)'
              : bgConfig.type === 'custom' && bgConfig.customUrl
              ? `url('${bgConfig.customUrl}')`
              : 'none',
          backgroundSize:
            bgConfig.type === 'college-vector'
              ? '480px 480px'
              : bgConfig.type === 'grid'
              ? '32px 32px'
              : bgConfig.type === 'dots'
              ? '20px 20px'
              : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat:
            bgConfig.type === 'college-vector' || bgConfig.type === 'grid' || bgConfig.type === 'dots'
              ? 'repeat'
              : 'no-repeat',
        }}
        aria-hidden="true"
      />

      {/* 1. TOP NAVBAR / WORKSPACE vs LANDING PAGE */}
      {activeTab === 'landing' ? (
        <div className="relative z-10 w-full h-full overflow-y-auto">
          <LandingPageView
            currentUser={currentUser}
            classCode={classCode}
            onEnterWorkspace={(profile) => {
              handleLogin(profile);
              setClassCode(profile.classCode);
              setActiveTab('dashboard');
              try {
                window.location.hash = 'dashboard';
              } catch {
                // ignore
              }
            }}
            onGoToDashboard={() => {
              setActiveTab('dashboard');
              try {
                window.location.hash = 'dashboard';
              } catch {
                // ignore
              }
            }}
          />
        </div>
      ) : (
        <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
          <Navbar
            classCode={classCode}
            currentUser={currentUser}
            onNavigateHome={() => setActiveTab('dashboard')}
            onNavigateLanding={() => {
              setActiveTab('landing');
              try {
                window.location.hash = 'landing';
              } catch {
                // ignore
              }
            }}
            onOpenSearch={() => setIsSearchModalOpen(true)}
            onOpenNotifications={() => {
              setIsNotificationsOpen(true);
              handleMarkAllRead();
            }}
            onOpenClassSetup={() => setIsSetupModalOpen(true)}
            onOpenAIKeyConfig={() => setIsAIKeyModalOpen(true)}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
            onNavigateSettings={() => handleSelectTab('settings')}
            unreadNotificationsCount={unreadNotificationsCount}
            totalNotificationsCount={notifications.length}
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
            onOpenAIKeyConfig={() => setIsAIKeyModalOpen(true)}
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
                onOpenAIKeyConfig={() => {
                  setIsAIKeyModalOpen(true);
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
              studentName={currentUser.name}
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
              onOpenAIKeyConfig={() => setIsAIKeyModalOpen(true)}
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

          {activeTab === 'settings' && (
            <SettingsView
              classCode={classCode}
              semesterNumber={workspace.semester}
              subjects={subjects}
              onOpenClassSetup={() => setIsSetupModalOpen(true)}
            />
          )}
        </main>
      </div>
      </div>
      )}

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
        currentBgConfig={bgConfig}
        onBgConfigChanged={(newCfg) => setBgConfig(newCfg)}
      />

      <AIKeyConfigModal
        isOpen={isAIKeyModalOpen}
        onClose={() => setIsAIKeyModalOpen(false)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
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
        onMarkAllRead={handleMarkAllRead}
        onClearAll={handleClearAllNotifications}
        onClearNotification={handleClearSingleNotification}
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
