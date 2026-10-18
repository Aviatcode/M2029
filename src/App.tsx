import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, CheckCircle2 } from 'lucide-react';
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
import { SmartDumpView } from './components/SmartDumpView';
import { TomorrowPrepModal } from './components/TomorrowPrepModal';
import { SemesterSetupModal } from './components/SemesterSetupModal';
import { SemesterSetupView } from './components/SemesterSetupView';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallPopup } from './components/PWAInstallPopup';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { AIKeyConfigModal } from './components/AIKeyConfigModal';
import { SettingsView } from './components/SettingsView';
import { LoginModal, UserProfile } from './components/LoginModal';
import { LandingPageView } from './components/LandingPageView';
import { ShareInviteModal } from './components/ShareInviteModal';
import {
  getDefaultSubjectsForClass,
  saveClassLocally,
  getSavedClass,
} from './utils/classManager';
import { initTheme } from './utils/themeService';
import {
  BackgroundConfig,
  getStoredBackgroundConfig,
} from './utils/backgroundService';
import { initClassroomAutoSync } from './utils/classSyncService';
import {
  checkAndRetrieveSharedFiles,
  registerLaunchQueueHandler,
} from './utils/shareTargetService';

const getUrlClassCode = (): string => {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const qCode = searchParams.get('class') || searchParams.get('code');
    if (qCode) return qCode.trim().toUpperCase();
    const hash = window.location.hash;
    const hashMatch = hash.match(/class=([a-zA-Z0-9_-]+)/i) || hash.match(/code=([a-zA-Z0-9_-]+)/i);
    if (hashMatch) return hashMatch[1].trim().toUpperCase();
  } catch {}
  return '';
};

const DEFAULT_USER: UserProfile = {
  id: '',
  name: '',
  email: '',
  rollNumber: '',
  role: 'student',
  avatarUrl: '',
  classCode: '',
  isLoggedIn: false,
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

    // Purge previous hardcoded demo state (Aman Kumar, BCA-2028) so new users get a clean slate
    try {
      const isPurged = localStorage.getItem('syllabus_demo_purged_v2');
      if (!isPurged) {
        const savedUser = localStorage.getItem('syllabus_user_profile');
        if (savedUser && (savedUser.includes('Aman Kumar') || savedUser.includes('user-cr-1'))) {
          localStorage.removeItem('syllabus_user_profile');
          localStorage.removeItem('syllabus_workspace');
          localStorage.removeItem('syllabus_subjects');
          localStorage.removeItem('syllabus_units');
          localStorage.removeItem('syllabus_timetable');
          localStorage.removeItem('syllabus_materials');
          localStorage.removeItem('syllabus_pyqs');
          localStorage.removeItem('syllabus_exams');
          localStorage.removeItem('syllabus_announcements');
          localStorage.removeItem('syllabus_assignments');
          localStorage.removeItem('syllabus_notifications');
          localStorage.removeItem('syllabus_semester_setup_done');
        }
        localStorage.setItem('syllabus_demo_purged_v2', 'true');
      }
    } catch {
      // ignore
    }

    // Check if user has an existing active session in localStorage
    try {
      const saved = localStorage.getItem('syllabus_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.isLoggedIn) {
          return 'dashboard';
        }
      }
    } catch {
      // ignore
    }

    return 'landing';
  };

  const [activeTab, setActiveTab] = useState<ActiveNavTab>(getInitialTab);
  const [currentRole, setCurrentRole] = useState<UserRole>('student');
  const [classCode, setClassCode] = useState<string>(() => {
    const fromUrl = getUrlClassCode();
    if (fromUrl) return fromUrl;
    try {
      const saved = localStorage.getItem('syllabus_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.classCode) return parsed.classCode;
      }
      const savedWs = localStorage.getItem('syllabus_workspace');
      if (savedWs) {
        const parsedWs = JSON.parse(savedWs);
        if (parsedWs?.code) return parsedWs.code;
      }
    } catch {
      // ignore
    }
    return 'BCA-2028';
  });
  const [bgConfig, setBgConfig] = useState<BackgroundConfig>(getStoredBackgroundConfig);

  // Sync tab with URL hash and listen for #class= invite links
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace('#', '');
      const classMatch = rawHash.match(/class=([a-zA-Z0-9_-]+)/i) || rawHash.match(/code=([a-zA-Z0-9_-]+)/i);
      if (classMatch) {
        const newCode = classMatch[1].trim().toUpperCase();
        if (newCode && newCode !== classCode) {
          setClassCode(newCode);
          const saved = getSavedClass(newCode);
          if (saved) {
            setWorkspace(saved.workspace);
            setSubjects(saved.subjects);
          } else {
            setWorkspace((prev) => ({
              ...prev,
              code: newCode,
              name: `${newCode} Workspace`,
            }));
          }
          setShareToast(`🎓 Switched to class: ${newCode}`);
          setTimeout(() => setShareToast(''), 4000);
        }
        return;
      }

      const hash = rawHash as ActiveNavTab;
      if (hash && hash !== activeTab) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab, classCode]);

  const handleSelectTab = (tab: ActiveNavTab) => {
    setActiveTab(tab);
    try {
      window.location.hash = tab;
    } catch {
      // ignore
    }
  };

  // Files queued for AI auto-sorting (from PC Drag & Drop or Mobile Share Sheet)
  const [pendingIngestFiles, setPendingIngestFiles] = useState<File[]>([]);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [shareToast, setShareToast] = useState<string>('');

  // 1. PC Global Drag & Drop: Drag files anywhere on PC to trigger AI auto-sort
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        const types = Array.from(e.dataTransfer.types || []);
        if (types.includes('Files') || types.includes('public.file-url') || types.length === 0) {
          dragCounterRef.current++;
          setIsGlobalDragging(true);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsGlobalDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsGlobalDragging(false);

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const filesArray = Array.from(e.dataTransfer.files);
        setPendingIngestFiles(filesArray);
        setActiveTab('dump');
        try {
          window.location.hash = 'dump';
        } catch {}
        setShareToast(`📥 Dropped ${filesArray.length} file(s) from PC. AI auto-sorting into syllabus folders...`);
        setTimeout(() => setShareToast(''), 4500);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // 2. Phone Share Target & Web File Handling API: Ingest files shared from phone apps
  useEffect(() => {
    const checkShares = async () => {
      const payload = await checkAndRetrieveSharedFiles();
      if (payload && payload.files.length > 0) {
        setPendingIngestFiles(payload.files);
        handleSelectTab('dump');
        setShareToast(`📱 Received ${payload.files.length} file(s) via Phone Share Sheet. Auto-sorting with AI...`);
        setTimeout(() => setShareToast(''), 5000);
      }
    };

    checkShares();

    // Register File Handling API for direct "Open with..." file launches on phone / PC
    registerLaunchQueueHandler((files) => {
      if (files.length > 0) {
        setPendingIngestFiles(files);
        handleSelectTab('dump');
        setShareToast(`📂 Opened ${files.length} file(s). Auto-sorting with AI...`);
        setTimeout(() => setShareToast(''), 5000);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkShares();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Core Academic State (Clean slate with localStorage persistence for real student use)
  const [workspace, setWorkspace] = useState<ClassWorkspace>(() => {
    const fromUrl = getUrlClassCode();
    if (fromUrl) {
      const savedClass = getSavedClass(fromUrl);
      if (savedClass) return savedClass.workspace;
      return {
        id: `class-${fromUrl.toLowerCase()}`,
        code: fromUrl,
        name: `${fromUrl} Workspace`,
        university: 'Affiliated University',
        semester: 1,
        academicYear: '2026-2027',
        memberCount: 1,
        adminId: 'user-admin',
      };
    }
    try {
      const saved = localStorage.getItem('syllabus_workspace');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.code) return parsed;
      }
    } catch {}
    return {
      id: 'class-bca-2028',
      code: 'BCA-2028',
      name: 'BCA 2028 Batch',
      university: 'Affiliated University',
      semester: 1,
      academicYear: '2026-2027',
      memberCount: 1,
      adminId: 'user-admin',
    };
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const fromUrl = getUrlClassCode();
    if (fromUrl) {
      const savedClass = getSavedClass(fromUrl);
      if (savedClass && savedClass.subjects && savedClass.subjects.length > 0) {
        return savedClass.subjects;
      }
    }
    try {
      const saved = localStorage.getItem('syllabus_subjects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return getDefaultSubjectsForClass('BCA-2028', 1);
  });

  // Google Classroom Style Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ code: string; name: string }>({
    code: 'BCA-2028',
    name: 'BCA 2028',
  });

  const handleOpenShareModal = (code?: string, name?: string) => {
    const c = code || classCode || workspace.code || 'BCA-2028';
    const n = name || workspace.name || `${c} Workspace`;
    setShareModalData({ code: c, name: n });
    setIsShareModalOpen(true);
  };
  const [unitsBySubject, setUnitsBySubject] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem('syllabus_units');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_UNITS;
  });
  const [timetable, setTimetable] = useState<TimetableClass[]>(() => {
    try {
      const saved = localStorage.getItem('syllabus_timetable');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_TIMETABLE;
  });
  const [materials, setMaterials] = useState<AcademicMaterial[]>(() => {
    try {
      const saved = localStorage.getItem('syllabus_materials');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_MATERIALS;
  });
  const [pyqs, setPyqs] = useState<HistoricalPYQ[]>(() => {
    try {
      const saved = localStorage.getItem('syllabus_pyqs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_PYQS;
  });
  const [exams, setExams] = useState<ExamDateSheetItem[]>(() => {
    try {
      const saved = localStorage.getItem('syllabus_exams');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_EXAMS;
  });
  const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>(() => {
    try {
      const saved = localStorage.getItem('syllabus_announcements');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_ANNOUNCEMENTS;
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('syllabus_notifications');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return SEED_NOTIFICATIONS;
  });
  const [assignments, setAssignments] = useState<AcademicAssignment[]>(() => {
    try {
      const saved = localStorage.getItem('syllabus_assignments');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_ASSIGNMENTS;
  });
  const [isSemesterSetupDone, setIsSemesterSetupDone] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('syllabus_semester_setup_done');
      if (stored !== null) return stored === 'true';
      return false;
    } catch {
      return false;
    }
  });

  // LocalStorage Persistence Sync
  useEffect(() => {
    try {
      localStorage.setItem('syllabus_workspace', JSON.stringify(workspace));
    } catch {}
  }, [workspace]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_subjects', JSON.stringify(subjects));
    } catch {}
  }, [subjects]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_units', JSON.stringify(unitsBySubject));
    } catch {}
  }, [unitsBySubject]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_timetable', JSON.stringify(timetable));
    } catch {}
  }, [timetable]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_materials', JSON.stringify(materials));
    } catch {}
  }, [materials]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_pyqs', JSON.stringify(pyqs));
    } catch {}
  }, [pyqs]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_exams', JSON.stringify(exams));
    } catch {}
  }, [exams]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_announcements', JSON.stringify(announcements));
    } catch {}
  }, [announcements]);

  useEffect(() => {
    try {
      localStorage.setItem('syllabus_assignments', JSON.stringify(assignments));
    } catch {}
  }, [assignments]);

  // Continuous Multi-Device Classroom Sync Engine (0 AI Tokens Consumed)
  useEffect(() => {
    const unsub = initClassroomAutoSync(classCode, (syncData) => {
      if (syncData.materials && syncData.materials.length > 0) {
        setMaterials((prev) => {
          const serverIds = new Set(syncData.materials.map((m) => m.id));
          const serverTitles = new Set(syncData.materials.map((m) => (m.title || m.fileName || '').toLowerCase()));
          const localOnly = prev.filter(
            (m) => !serverIds.has(m.id) && !serverTitles.has((m.title || m.fileName || '').toLowerCase())
          );
          const merged = [...localOnly, ...syncData.materials];
          try {
            localStorage.setItem('syllabus_materials', JSON.stringify(merged));
          } catch {}
          return merged;
        });
      }
      if (syncData.assignments && syncData.assignments.length > 0) {
        setAssignments((prev) => {
          const serverIds = new Set(syncData.assignments.map((a) => a.id));
          const localOnly = prev.filter((a) => !serverIds.has(a.id));
          return [...localOnly, ...syncData.assignments];
        });
      }
      if (syncData.units) {
        setUnitsBySubject(syncData.units);
      }
      if (syncData.exams && syncData.exams.length > 0) {
        setExams((prev) => {
          const serverIds = new Set(syncData.exams.map((e) => e.id));
          const localOnly = prev.filter((e) => !serverIds.has(e.id));
          return [...localOnly, ...syncData.exams];
        });
      }
      if (syncData.announcements && syncData.announcements.length > 0) {
        setAnnouncements((prev) => {
          const serverIds = new Set(syncData.announcements.map((a) => a.id));
          const localOnly = prev.filter((a) => !serverIds.has(a.id));
          return [...localOnly, ...syncData.announcements];
        });
      }
      if (syncData.notifications && syncData.notifications.length > 0) {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newItems = syncData.notifications.filter((n) => !existingIds.has(n.id));
          return [...newItems, ...prev];
        });
      }
      if (syncData.timetable && syncData.timetable.length > 0) {
        setTimetable(syncData.timetable);
      }
    });

    return () => {
      unsub();
    };
  }, [classCode]);

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
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (isNotificationsOpen) setIsNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, isNotificationsOpen]);

  // Lock body scroll when mobile drawer or notifications are open
  useEffect(() => {
    if (mobileMenuOpen || isNotificationsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, isNotificationsOpen]);

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

  const handleUpdateUsername = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCurrentUser((prev) => {
      const updated = { ...prev, name: trimmed };
      try {
        localStorage.setItem('syllabus_user_profile', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
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
    subjectName: 'Upcoming Lecture',
    topicTitle: 'Lecture Preparation',
    room: 'Classroom',
    time: 'Next Lecture',
    step1WhatIsIt:
      'Enter your timetable lectures and subjects to generate 7-minute intuition primers before class.',
    step2WhyUsed:
      'Pre-class review improves conceptual retention and exam readiness.',
    step3AnalogyAndExample:
      'AI will formulate real-world analogies based on your actual syllabus topics.',
    step4MiniQuiz: [],
  });

  // Fetch live tomorrow prep from server
  useEffect(() => {
    if (!classCode) return;
    fetch(`/api/tomorrow/${classCode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.prep) setTomorrowPrepData(data.prep);
      })
      .catch((err) => console.warn('Using local prep data:', err));
  }, [classCode]);

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
        setInitialTutorPrompt(
          subjects[0]
            ? `Explain the core concepts and high-yield exam questions for ${subjects[0].name} simply with real-life analogies.`
            : 'Explain the core concepts and high-yield exam questions for our syllabus simply with real-life analogies.'
        );
        setActiveTab('ai-tutor');
        break;
      case 'summarize':
        setActiveTab('materials');
        break;
      case 'mindmap':
        setInitialTutorPrompt(
          subjects[0]
            ? `Create a Mermaid mind map and architecture breakdown for ${subjects[0].name}.`
            : 'Create a Mermaid mind map and architecture breakdown for our syllabus topics.'
        );
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
    setActiveMaterialId(newMat.id);
    setMaterials((prev) => {
      const filtered = prev.filter((m) => m.id !== newMat.id && m.fileName !== newMat.fileName);
      const updated = [newMat, ...filtered];
      try {
        localStorage.setItem('syllabus_materials', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed saving materials to localStorage:', err);
      }
      return updated;
    });

    try {
      const SYNC_CACHE_KEY = 'm2029_class_sync_cache_v1';
      const cached = localStorage.getItem(SYNC_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.materials)) {
          parsed.materials = [newMat, ...parsed.materials.filter((m: any) => m.id !== newMat.id)];
          localStorage.setItem(SYNC_CACHE_KEY, JSON.stringify(parsed));
        }
      }
    } catch {}

    setShareToast(`✓ "${newMat.title}" saved to ${newMat.subjectName}! AI Notes, Mindmap & 10-Marker ready.`);
    setTimeout(() => setShareToast(''), 4500);
  };

  const handleOpenMaterial = (mat: AcademicMaterial) => {
    setActiveMaterialId(mat.id);
    handleSelectTab('dump');
  };

  const handleSetupComplete = (classData: any) => {
    if (classData.workspace) {
      setWorkspace(classData.workspace);
      setClassCode(classData.workspace.code);
    }
    if (classData.subjects) {
      setSubjects(classData.subjects);
    }
    setIsSemesterSetupDone(true);
    try {
      localStorage.setItem('syllabus_semester_setup_done', 'true');
    } catch {
      // ignore
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
    handleSelectTab('setup');
    if (classData.workspace?.code) {
      setTimeout(() => {
        handleOpenShareModal(classData.workspace.code, classData.workspace.name);
      }, 400);
    }
  };

  const handleSearchResultClick = (type: string, title: string) => {
    if (type.includes('Topic') || type.includes('Syllabus')) {
      handleStudyTopic(title, 'Computer Science');
    } else if (type.includes('PYQ')) {
      setActiveTab('pyqs');
    } else if (type.includes('Note') || type.includes('Material') || type.includes('PPT')) {
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
      {activeTab === 'landing' || !currentUser.isLoggedIn ? (
        <div className="relative z-10 w-full h-full overflow-y-auto">
          <LandingPageView
            currentUser={currentUser}
            classCode={classCode}
            onEnterWorkspace={(profile, classData) => {
              handleLogin(profile);
              setClassCode(profile.classCode);
              if (classData) {
                setWorkspace(classData.workspace);
                setSubjects(classData.subjects);
                setIsSemesterSetupDone(true);
              } else {
                setWorkspace((prev) => ({
                  ...prev,
                  code: profile.classCode,
                  name: prev.name || `${profile.classCode} Workspace`,
                }));
              }
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
            onShowInvite={(code, name) => handleOpenShareModal(code, name)}
          />
        </div>
      ) : (
        <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
          <Navbar
            classCode={classCode}
            currentUser={currentUser}
            onUpdateUsername={handleUpdateUsername}
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
            currentUser={currentUser}
            onLogout={handleLogout}
            isSetupDone={isSemesterSetupDone}
          />
        </div>

        {/* Mobile Drawer (Phone & Tablet) */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-sm cursor-pointer transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            <div
              className="w-4/5 max-w-xs h-full bg-slate-950 shadow-2xl flex flex-col cursor-default border-r border-slate-850 animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header with Home link & Close Button */}
              <div className="h-13 px-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950">
                <button
                  onClick={() => {
                    handleSelectTab('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2.5 text-left cursor-pointer group focus:outline-none"
                  title="Return to Today (Home)"
                >
                  <img
                    src="./am-logo.png"
                    alt="AM Logo"
                    className="w-7 h-7 rounded-md object-contain border border-slate-800"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-100 font-sans tracking-tight block">
                      SyllabusOS
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">
                      {classCode} • Sem {workspace.semester}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer"
                  aria-label="Close menu"
                  title="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-hidden">
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
                  currentUser={currentUser}
                  onLogout={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  isSetupDone={isSemesterSetupDone}
                />
              </div>
            </div>
          </div>
        )}

        {/* Content Workspace Area (Responsive across Phone, Tablet & Laptop) */}
        <main className="flex-1 h-full overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 max-w-5xl xl:max-w-6xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              studentName={currentUser.name}
              classCode={classCode}
              semesterNumber={workspace.semester}
              todayClasses={timetable.filter((t) => t.day === 'Wednesday')}
              tomorrowClasses={timetable.filter((t) => t.day === 'Thursday')}
              upcomingExams={exams}
              recentMaterials={materials}
              announcements={announcements}
              subjects={subjects}
              assignments={assignments}
              onOpenTomorrowPrep={() => setIsTomorrowModalOpen(true)}
              onNavigateTab={handleSelectTab}
              onTriggerQuickAIAction={handleQuickAIAction}
              onOpenAIKeyConfig={() => setIsAIKeyModalOpen(true)}
              onOpenMaterial={handleOpenMaterial}
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

          {activeTab === 'dump' && (
            <SmartDumpView
              materials={materials}
              subjects={subjects}
              unitsBySubject={unitsBySubject}
              currentRole={currentRole}
              classCode={classCode}
              activeMaterialId={activeMaterialId}
              onSelectActiveMaterialId={setActiveMaterialId}
              onMaterialUploaded={handleMaterialUploaded}
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
              pendingFiles={pendingIngestFiles}
              onClearPendingFiles={() => setPendingIngestFiles([])}
            />
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
              analysisItems={pyqs.map((p) => ({
                topicTitle: p.topicTitle,
                subjectName: p.subjectName,
                frequency: p.frequencyCount || 1,
                yearsAsked: [p.year],
                highestMarks: p.marks,
                importanceTier: (p.frequencyCount || 1) >= 3 ? 'Very High (Must Prepare)' : 'High',
              }))}
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
            <SemesterSetupView
              workspace={workspace}
              subjects={subjects}
              onOpenClassSetup={() => setIsSetupModalOpen(true)}
              onNavigateTab={(tab) => handleSelectTab(tab)}
              onOpenInvite={() => handleOpenShareModal()}
              onAddRecommendedSubjects={() => {
                const rec = getDefaultSubjectsForClass(workspace.code || 'BCA-2028', workspace.semester || 1);
                setSubjects(rec);
                saveClassLocally(workspace, rec);
                setShareToast('✓ Loaded BCA Semester 1 subjects!');
                setTimeout(() => setShareToast(''), 3000);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              classCode={classCode}
              semesterNumber={workspace.semester}
              subjects={subjects}
              onOpenClassSetup={() => setIsSetupModalOpen(true)}
              currentUser={currentUser}
              onUpdateUsername={handleUpdateUsername}
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
        initialWorkspace={workspace}
        initialSubjects={subjects}
      />

      <ShareInviteModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        classCode={shareModalData.code}
        className={shareModalData.name}
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

      {/* 5. PC FULL-SCREEN DRAG & DROP OVERLAY */}
      {isGlobalDragging && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounterRef.current = 0;
            setIsGlobalDragging(false);
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const filesArray = Array.from(e.dataTransfer.files);
              setPendingIngestFiles(filesArray);
              setActiveTab('dump');
              try {
                window.location.hash = 'dump';
              } catch {}
              setShareToast(`📥 Dropped ${filesArray.length} file(s) from PC. AI auto-sorting into syllabus folders...`);
              setTimeout(() => setShareToast(''), 4500);
            }
          }}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 border-4 border-dashed border-slate-500 animate-fade-in cursor-copy"
        >
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-100 shadow-md">
              <UploadCloud className="w-8 h-8 animate-pulse text-slate-300" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white tracking-tight">
                Drop Files to Auto-Sort with AI
              </h3>
              <p className="text-xs text-slate-400">
                Release your PDF, DOCX, PowerPoint, or Notes anywhere to categorize into syllabus units.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono text-slate-300">
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">.PDF</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">.DOCX</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">.PPTX</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">.TXT / .MD</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">IMAGES</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              ⚡ Auto-generates visual mindmaps, mnemonics & 10-marker answers
            </p>
          </div>
        </div>
      )}

      {/* 6. TOAST FOR DRAG & DROP / PHONE SHARE CONFIRMATION */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-100 text-xs font-medium shadow-2xl flex items-center gap-2.5 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareToast}</span>
        </div>
      )}
    </div>
  );
}
