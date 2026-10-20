import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { realBackend as backend } from '../services/realBackend';
import {
  Users, Plus, LogOut, BookOpen, ClipboardList, CheckCircle2,
  XCircle, Clock, ChevronRight, GraduationCap, Copy, Trash2, Edit, RefreshCw, RotateCcw, Link, Save, Gift,
  Share2, UserPlus, X, Mail, MessageSquare, Sparkles, Star, Trophy, ChevronDown, ChevronUp, BarChart3, Eye, Zap, Building2, Layers, Shield, ShieldCheck,
  Camera, Upload, Package, ShoppingBag, Swords, Check, Settings, Image as ImageIcon, Award, Crown, Pencil, User, AlertTriangle,
  Filter, Search, FileText, ExternalLink, Printer, GripVertical, UserX, ArrowRightLeft, Lock
} from 'lucide-react';
import {
  LEVELS, ACHIEVEMENTS, GUILDS, DEFAULT_10_GUILDS, DEFAULT_15_GUILDS, GUILD_TROPHIES,
  GUILD_LEVELS, getGuildLevelInfo, LEARNING_PATHS, MAX_CATEGORIES,
  PATH_COLORS, DEFAULT_STEM_SUPPLIES, BOSS_CHALLENGES
} from '../data/gameData';
import { compressImageFile, isValidImageUrl } from '../utils/imageUtils';
import Avatar3D from './Avatar3D';
import { FileViewer } from './FileViewer';
import ActivityEditor from './ActivityEditor';
import RosterManager from './RosterManager';
import ChoiceBoardExport from './ChoiceBoardExport';
import LegalModal from './LegalModal';
import LevelEconomyGuideModal from './LevelEconomyGuideModal';
import StudentSubmissionsModal from './StudentSubmissionsModal';
import ActivityDirectionsCard from './ActivityDirectionsCard';


export default function TeacherPortal({
  onSwitchToAdmin,
  onSwitchToStudent,
  initialClassId,
  initialTab,
  onClearInitialClassId
}) {
  const { user, logout } = useAuth();
  const isAdmin = user && (
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    user.role === 'super admin' ||
    user.email?.toLowerCase() === 'matthew.harbert@lcps.org' ||
    user.email?.toLowerCase() === 'propellevelup@lcps.org'
  );

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [adminOrgs, setAdminOrgs] = useState([]);
  // For super admins: 'mine' (only my personal classes) vs 'org' (all organization classes)
  const [adminViewScope, setAdminViewScope] = useState(() => {
    return localStorage.getItem('lvlup_admin_view_scope') || 'mine';
  });
  const [adminOrgFilter, setAdminOrgFilter] = useState(() => {
    return sessionStorage.getItem('lvlup_admin_selected_org') || user?.organizationId || 'all';
  });

  // Rename class state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingClass, setRenamingClass] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  // Move class organization state
  const [showMoveOrgModal, setShowMoveOrgModal] = useState(false);
  const [movingClass, setMovingClass] = useState(null);
  const [selectedMoveOrgId, setSelectedMoveOrgId] = useState('none');
  const [savingMoveOrg, setSavingMoveOrg] = useState(false);
  const [newClassOrgId, setNewClassOrgId] = useState('none');

  const [submissions, setSubmissions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab || 'submissions'); // 'submissions', 'students', 'activities', 'categories'
  const [submissionsViewMode, setSubmissionsViewMode] = useState('queue'); // 'queue' | 'by_student'
  const [selectedStudentFilterId, setSelectedStudentFilterId] = useState('all');
  const [inspectingStudentSubmissions, setInspectingStudentSubmissions] = useState(null);
  const [studentDirectorySearch, setStudentDirectorySearch] = useState('');
  const [studentDirectoryFilter, setStudentDirectoryFilter] = useState('all'); // 'all', 'pending', 'has_submissions', 'no_submissions'
  const [classActivities, setClassActivities] = useState([]);
  const [activeBoss, setActiveBoss] = useState(null);
  const [globalExpandDirections, setGlobalExpandDirections] = useState(true);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('privacy');
  const [categoryNames, setCategoryNames] = useState({});
  const [categorySubtitles, setCategorySubtitles] = useState({});
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [categoriesPerRow, setCategoriesPerRow] = useState('auto');
  const [savingCategories, setSavingCategories] = useState(false);

  // Co-teacher state
  const [coTeachers, setCoTeachers] = useState([]);
  const [coTeacherEmail, setCoTeacherEmail] = useState('');
  const [addingCoTeacher, setAddingCoTeacher] = useState(false);

  // Spotlight state
  const [spotlight, setSpotlight] = useState(null);
  const [spotlightMessage, setSpotlightMessage] = useState('');
  const [spotlightCategory, setSpotlightCategory] = useState('star_student');
  const [savingSpotlight, setSavingSpotlight] = useState(false);

  // Org Choice Board Template state
  const [orgTemplates, setOrgTemplates] = useState([]);
  const [showOrgTemplatesModal, setShowOrgTemplatesModal] = useState(false);
  const [selectedTemplateToApply, setSelectedTemplateToApply] = useState(null);
  const [targetClassIdsToApply, setTargetClassIdsToApply] = useState([]);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [inspectingTemplate, setInspectingTemplate] = useState(null);
  const [importingSingleActivityId, setImportingSingleActivityId] = useState(null);
  const [templateForImport, setTemplateForImport] = useState(null);
  const [importOptionTab, setImportOptionTab] = useState('menu'); // 'menu' | 'selective'
  const [selectiveActivities, setSelectiveActivities] = useState(new Set());
  const [showGuideModal, setShowGuideModal] = useState(false);

  const loadOrgTemplates = async () => {
    if (!user.organizationId) return;
    try {
      const tmps = await backend.getOrgTemplates(user.organizationId);
      setOrgTemplates(tmps);
    } catch (e) {
      console.error("Failed to load organization templates:", e);
    }
  };

  const handleImportSingleActivity = async (template, pathId, activity) => {
    if (!selectedClass) {
      alert('Please select a class first.');
      return;
    }
    setImportingSingleActivityId(activity.id);
    try {
      const singleActivityPath = [{
        id: pathId,
        title: template.categoryNames?.[pathId] || '',
        subtitle: template.categorySubtitles?.[pathId] || '',
        options: [activity]
      }];
      await backend.importTemplateActivitiesToClass(
        selectedClass.id,
        singleActivityPath,
        template.categoryNames || {},
        template.categorySubtitles || {}
      );
      alert(`Imported "${activity.title}" into "${selectedClass.name}" without removing existing activities!`);
      const updatedClass = await backend.getClass(selectedClass.id);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
      }
    } catch (err) {
      alert('Error importing activity: ' + err.message);
    }
    setImportingSingleActivityId(null);
  };

  const handleOpenImportModal = (template) => {
    if (!selectedClass) {
      alert('Please select a class first.');
      return;
    }
    setTemplateForImport(template);
    setImportOptionTab('menu');
    const allIds = new Set();
    (template.activities || []).forEach(path => {
      (path.options || []).forEach(opt => {
        allIds.add(`${path.id}:${opt.id}`);
      });
    });
    setSelectiveActivities(allIds);
  };

  const handleExecuteOverwrite = async () => {
    if (!selectedClass || !templateForImport) return;
    if (!window.confirm(`⚠️ WARNING: OVERWRITE CHOICE BOARD\n\nThis will replace all current activities and categories in "${selectedClass.name}" with the contents of "${templateForImport.title}".\n\nExisting activity configuration will be overwritten. Proceed?`)) return;
    setApplyingTemplate(true);
    try {
      await backend.importTemplateActivitiesToClass(
        selectedClass.id,
        templateForImport.activities || [],
        templateForImport.categoryNames || {},
        templateForImport.categorySubtitles || {},
        'overwrite'
      );
      alert(`Choice board overwritten successfully with "${templateForImport.title}"!`);
      setTemplateForImport(null);
      setShowOrgTemplatesModal(false);
      const updatedClass = await backend.getClass(selectedClass.id);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
      }
    } catch (err) {
      alert('Error overwriting template: ' + err.message);
    }
    setApplyingTemplate(false);
  };

  const handleExecuteMerge = async () => {
    if (!selectedClass || !templateForImport) return;
    setApplyingTemplate(true);
    try {
      await backend.importTemplateActivitiesToClass(
        selectedClass.id,
        templateForImport.activities || [],
        templateForImport.categoryNames || {},
        templateForImport.categorySubtitles || {},
        'merge'
      );
      alert(`Successfully merged all activities from "${templateForImport.title}" into "${selectedClass.name}"! Existing activities were preserved.`);
      setTemplateForImport(null);
      setShowOrgTemplatesModal(false);
      const updatedClass = await backend.getClass(selectedClass.id);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
      }
    } catch (err) {
      alert('Error merging template: ' + err.message);
    }
    setApplyingTemplate(false);
  };

  const handleExecuteSelective = async () => {
    if (!selectedClass || !templateForImport) return;
    if (selectiveActivities.size === 0) {
      alert('Please select at least one activity to import.');
      return;
    }
    setApplyingTemplate(true);
    try {
      const filteredPaths = (templateForImport.activities || []).map(path => {
        const filteredOptions = (path.options || []).filter(opt => selectiveActivities.has(`${path.id}:${opt.id}`));
        return {
          ...path,
          options: filteredOptions
        };
      }).filter(path => path.options.length > 0);

      await backend.importTemplateActivitiesToClass(
        selectedClass.id,
        filteredPaths,
        templateForImport.categoryNames || {},
        templateForImport.categorySubtitles || {},
        'merge'
      );
      alert(`Successfully imported ${selectiveActivities.size} selected activity(ies) into "${selectedClass.name}"!`);
      setTemplateForImport(null);
      setShowOrgTemplatesModal(false);
      const updatedClass = await backend.getClass(selectedClass.id);
      if (updatedClass) {
        setSelectedClass(updatedClass);
        setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
      }
    } catch (err) {
      alert('Error importing selective activities: ' + err.message);
    }
    setApplyingTemplate(false);
  };

  const handleImportAllTemplateActivities = async (template) => {
    handleOpenImportModal(template);
  };

  const handleApplyOrgTemplate = async () => {
    if (!selectedTemplateToApply || targetClassIdsToApply.length === 0) {
      alert('Please select a template and at least one class.');
      return;
    }
    setApplyingTemplate(true);
    try {
      await backend.applyTemplateToClasses(selectedTemplateToApply.id, targetClassIdsToApply);
      alert(`Applied "${selectedTemplateToApply.title}" to ${targetClassIdsToApply.length} class(es)!`);
      setShowOrgTemplatesModal(false);
      setSelectedTemplateToApply(null);
      handleRefresh();
    } catch (e) {
      alert('Error applying template: ' + e.message);
    }
    setApplyingTemplate(false);
  };

  useEffect(() => {
    if (isAdmin) {
      backend.getOrganizations().then(orgs => {
        setAdminOrgs(orgs || []);
      }).catch(e => console.error("Error loading organizations:", e));
    }
    loadClasses(adminViewScope, adminOrgFilter);
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (initialClassId) {
      const match = classes.find(c => c.id === initialClassId);
      if (match) {
        setSelectedClass(match);
        if (onClearInitialClassId) onClearInitialClassId();
      } else {
        backend.getClass(initialClassId).then(cls => {
          if (cls) {
            if (isAdmin && cls.teacherId !== user?.id && adminViewScope === 'mine') {
              setAdminViewScope('org');
              localStorage.setItem('lvlup_admin_view_scope', 'org');
            }
            setSelectedClass(cls);
            setClasses(prev => prev.some(c => c.id === cls.id) ? prev : [cls, ...prev]);
            if (onClearInitialClassId) onClearInitialClassId();
          }
        });
      }
    }
  }, [initialClassId, classes]);

  useEffect(() => {
    let unsubscribe;
    if (selectedClass) {
      setLoading(true);

      // Load Students
      backend.getStudents(selectedClass.id).then(data => {
        setStudents(data);
      });

      // Subscribe to Submissions (Real-time)
      unsubscribe = backend.subscribeToSubmissions(selectedClass.id, (data) => {
        setSubmissions(data);
        setLoading(false);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedClass]);

  // Load class activities and active boss for submission review context
  useEffect(() => {
    if (selectedClass) {
      if (selectedClass.activities && selectedClass.activities.length > 0) {
        setClassActivities(selectedClass.activities);
      } else {
        backend.getClassActivities(selectedClass.id).then(acts => {
          setClassActivities(acts || LEARNING_PATHS);
        }).catch(() => {
          setClassActivities(LEARNING_PATHS);
        });
      }

      backend.getActiveBoss(selectedClass.id, selectedClass.organizationId).then(boss => {
        setActiveBoss(boss);
      }).catch(() => {});
    } else {
      setClassActivities(LEARNING_PATHS);
      setActiveBoss(null);
    }
  }, [selectedClass]);

  const loadClasses = async (scope = adminViewScope, targetOrg = adminOrgFilter) => {
    setLoading(true);
    try {
      let data = [];
      if (isAdmin) {
        if (scope === 'mine' || targetOrg === 'personal') {
          data = await backend.getClasses(user.id);
        } else if (targetOrg === 'all') {
          data = await backend.getAllClasses();
        } else if (targetOrg) {
          data = await backend.getAllClassesByOrg(targetOrg);
        } else {
          data = await backend.getClasses(user.id);
        }
      } else {
        data = await backend.getClasses(user.id);
      }
      setClasses(data);

      if (initialClassId) {
        const found = data.find(c => c.id === initialClassId);
        if (found) {
          setSelectedClass(found);
          if (onClearInitialClassId) onClearInitialClassId();
        } else {
          backend.getClass(initialClassId).then(cls => {
            if (cls) {
              if (isAdmin && cls.teacherId !== user?.id && scope === 'mine') {
                setAdminViewScope('org');
                localStorage.setItem('lvlup_admin_view_scope', 'org');
              }
              setSelectedClass(cls);
              setClasses(prev => prev.some(c => c.id === cls.id) ? prev : [cls, ...prev]);
              if (onClearInitialClassId) onClearInitialClassId();
            }
          });
        }
      } else if (selectedClass) {
        const refreshed = data.find(c => c.id === selectedClass.id);
        if (refreshed) {
          setSelectedClass(refreshed);
        }
      }
    } catch (err) {
      console.error("Error loading classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      const orgForClass = isAdmin
        ? (newClassOrgId === 'none' ? 'none' : newClassOrgId)
        : (user.organizationId || null);
      await backend.createClass(user.id, newClassName.trim(), orgForClass);
      setNewClassName('');
      setCreatingClass(false);
      loadClasses(adminViewScope, adminOrgFilter);
    } catch (error) {
      console.error(error);
      alert('Failed to create class: ' + error.message + '\n\nMake sure Firestore is enabled and Security Rules allow writes.');
    }
  };

  const handleStartMoveClassOrg = (cls) => {
    setMovingClass(cls);
    setSelectedMoveOrgId(cls.organizationId || 'none');
    setShowMoveOrgModal(true);
  };

  const handleSaveMoveClassOrg = async (e) => {
    e.preventDefault();
    if (!movingClass) return;

    setSavingMoveOrg(true);
    try {
      await backend.updateClassOrganization(movingClass.id, selectedMoveOrgId);
      const targetOrgName = selectedMoveOrgId === 'none'
        ? 'Personal (No Organization)'
        : (adminOrgs.find(o => o.id === selectedMoveOrgId)?.name || 'the new organization');

      const updatedOrgId = selectedMoveOrgId === 'none' ? null : selectedMoveOrgId;
      setClasses(prev => prev.map(c => c.id === movingClass.id ? { ...c, organizationId: updatedOrgId } : c));
      if (selectedClass?.id === movingClass.id) {
        setSelectedClass(prev => ({ ...prev, organizationId: updatedOrgId }));
      }

      alert(`Successfully moved "${movingClass.name}" to ${targetOrgName}!`);
      setShowMoveOrgModal(false);
      setMovingClass(null);
      loadClasses(adminViewScope, adminOrgFilter);
    } catch (err) {
      console.error("Error moving class organization:", err);
      alert("Failed to move class organization: " + err.message);
    } finally {
      setSavingMoveOrg(false);
    }
  };

  const handleDeleteClass = async (classId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this class? This cannot be undone.')) {
      try {
        await backend.deleteClass(classId);
        if (selectedClass?.id === classId) setSelectedClass(null);
        loadClasses(adminViewScope, adminOrgFilter);
      } catch (error) {
        alert('Error deleting class: ' + error.message);
      }
    }
  };

  const handleStartRenameClass = (cls) => {
    setRenamingClass(cls);
    setRenameInput(cls.name || '');
    setShowRenameModal(true);
  };

  const handleSaveRenameClass = async (e) => {
    e.preventDefault();
    if (!renamingClass || !renameInput.trim()) return;

    setSavingRename(true);
    try {
      const trimmed = renameInput.trim();
      await backend.updateClassName(renamingClass.id, trimmed);

      // Update in local state
      setClasses(prev => prev.map(c => c.id === renamingClass.id ? { ...c, name: trimmed } : c));
      if (selectedClass?.id === renamingClass.id) {
        setSelectedClass(prev => ({ ...prev, name: trimmed }));
      }

      setShowRenameModal(false);
      setRenamingClass(null);
      setRenameInput('');
    } catch (err) {
      console.error("Error renaming class:", err);
      alert("Failed to rename class: " + err.message);
    } finally {
      setSavingRename(false);
    }
  };

  const handleReview = async (submissionId, status, feedback) => {
    await backend.reviewSubmission(submissionId, status, feedback);
    // No need to reload, subscription handles it
  };

  const handleRefresh = () => {
    loadClasses(adminViewScope, adminOrgFilter);
    if (selectedClass) {
      backend.getStudents(selectedClass.id).then(setStudents);
      backend.getCoTeachers(selectedClass.id).then(setCoTeachers);
    }
  };

  // Load co-teachers when class changes
  useEffect(() => {
    if (selectedClass) {
      backend.getCoTeachers(selectedClass.id).then(setCoTeachers);
    } else {
      setCoTeachers([]);
    }
  }, [selectedClass]);

  const handleAddCoTeacher = async (e) => {
    e.preventDefault();
    if (!coTeacherEmail.trim()) return;
    setAddingCoTeacher(true);
    try {
      await backend.addCoTeacher(selectedClass.id, coTeacherEmail.trim().toLowerCase());
      setCoTeacherEmail('');
      const updated = await backend.getCoTeachers(selectedClass.id);
      setCoTeachers(updated);
      alert('Co-teacher added!');
    } catch (error) {
      alert(error.message);
    }
    setAddingCoTeacher(false);
  };

  const handleRemoveCoTeacher = async (coTeacherId, coTeacherName) => {
    if (!window.confirm(`Remove ${coTeacherName} as co-teacher?`)) return;
    try {
      await backend.removeCoTeacher(selectedClass.id, coTeacherId);
      setCoTeachers(prev => prev.filter(t => t.id !== coTeacherId));
    } catch (error) {
      alert(error.message);
    }
  };

  // Load spotlight when class changes
  useEffect(() => {
    if (selectedClass) {
      setSpotlight(selectedClass.spotlight || null);
    } else {
      setSpotlight(null);
    }
  }, [selectedClass]);

  const handleSetSpotlight = async (student) => {
    if (!selectedClass) return;
    setSavingSpotlight(true);
    try {
      const spotlightData = {
        studentId: student.id,
        studentName: student.name,
        avatar: student.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' },
        xp: student.xp || 0,
        message: spotlightMessage || 'Keep up the great work!',
        category: spotlightCategory,
        setAt: new Date().toISOString(),
        setBy: user.name,
      };
      await backend.setStudentSpotlight(selectedClass.id, spotlightData);
      setSpotlight(spotlightData);
      setSelectedClass(prev => ({ ...prev, spotlight: spotlightData }));
      setSpotlightMessage('');
      alert(`${student.name} is now the class spotlight!`);
    } catch (error) {
      alert('Error setting spotlight: ' + error.message);
    }
    setSavingSpotlight(false);
  };

  const handleClearSpotlight = async () => {
    if (!selectedClass) return;
    if (!window.confirm('Remove the current spotlight?')) return;
    try {
      await backend.clearStudentSpotlight(selectedClass.id);
      setSpotlight(null);
      setSelectedClass(prev => ({ ...prev, spotlight: null }));
    } catch (error) {
      alert('Error clearing spotlight: ' + error.message);
    }
  };

  // Load category names & order when class changes
  useEffect(() => {
    if (selectedClass) {
      const names = {};
      const subs = {};
      let order = Array.isArray(selectedClass.categoryOrder) ? [...selectedClass.categoryOrder] : [];

      if (selectedClass.categoryNames && Object.keys(selectedClass.categoryNames).length > 0) {
        // Teacher has customized category names! Respect exact keys saved without resurrecting deleted defaults
        const savedKeys = Object.keys(selectedClass.categoryNames);
        order = [...new Set([...order.filter(k => savedKeys.includes(k)), ...savedKeys])];
        order.forEach(k => {
          names[k] = selectedClass.categoryNames[k];
          subs[k] = selectedClass.categorySubtitles?.[k] || '';
        });
      } else {
        // Fallback to defaults from LEARNING_PATHS
        LEARNING_PATHS.forEach(p => {
          names[p.id] = p.title;
          subs[p.id] = p.subtitle || '';
        });
        order = LEARNING_PATHS.map(p => p.id);
      }

      setCategoryNames(names);
      setCategorySubtitles(subs);
      setCategoryOrder(order);
      setCategoriesPerRow(selectedClass.categoriesPerRow || 'auto');
    }
  }, [selectedClass]);

  const handleMoveCategory = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categoryOrder.length) return;
    const newOrder = [...categoryOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;
    setCategoryOrder(newOrder);
  };

  const handleRemoveCategory = (key) => {
    if (categoryOrder.length <= 1) {
      alert('You must have at least 1 category on the choice board.');
      return;
    }
    const name = categoryNames[key] || key;
    if (!window.confirm(`Remove category "${name}"? Any activities in this category will not be displayed until reassigned.`)) return;
    setCategoryNames(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setCategorySubtitles(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setCategoryOrder(prev => prev.filter(k => k !== key));
  };

  const handleAddCategory = () => {
    if (categoryOrder.length >= MAX_CATEGORIES) {
      alert(`Maximum ${MAX_CATEGORIES} categories reached.`);
      return;
    }
    const nextNum = categoryOrder.length + 1;
    let key = `path${nextNum}`;
    let counter = nextNum;
    while (key in categoryNames) {
      counter++;
      key = `path${counter}`;
    }
    const newTitle = `Category ${counter}`;
    setCategoryNames(prev => ({ ...prev, [key]: newTitle }));
    setCategorySubtitles(prev => ({ ...prev, [key]: '' }));
    setCategoryOrder(prev => [...prev, key]);
  };

  const handleSaveCategories = async () => {
    if (!selectedClass) return;
    setSavingCategories(true);
    try {
      await backend.updateClass(selectedClass.id, {
        categoryNames,
        categorySubtitles,
        categoryOrder,
        categoriesPerRow
      });
      // Update local class data
      setSelectedClass(prev => ({ ...prev, categoryNames, categorySubtitles, categoryOrder, categoriesPerRow }));
      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, categoryNames, categorySubtitles, categoryOrder, categoriesPerRow } : c));
      alert('Category settings & layout saved!');
    } catch (error) {
      alert('Error saving categories: ' + error.message);
    }
    setSavingCategories(false);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Class code copied!');
  };

  const copyJoinLink = (code) => {
    const url = `https://level-up-choice-board-game.web.app/?code=${code}`;
    navigator.clipboard.writeText(url);
    alert('Join link copied!');
  };

  const handleResetClassActivities = async () => {
    if (!selectedClass) return;
    if (!window.confirm(
      `Reset all activity completion status for "${selectedClass.name}"?\n\n` +
      'This lets all students redo activities and earn XP again.\n' +
      'XP, coins, achievements, and streaks are NOT affected.'
    )) return;
    try {
      const count = await backend.resetClassActivities(selectedClass.id);
      alert(`Activities reset for ${count} student${count !== 1 ? 's' : ''}. They can now redo all activities.`);
      backend.getStudents(selectedClass.id).then(setStudents);
    } catch (error) {
      alert('Error resetting activities: ' + error.message);
    }
  };

  const handleToggleAutoReset = async () => {
    if (!selectedClass) return;
    const current = selectedClass.autoResetWeekly !== false;
    const next = !current;
    try {
      await backend.updateClass(selectedClass.id, { autoResetWeekly: next });
      setSelectedClass(prev => ({ ...prev, autoResetWeekly: next }));
      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, autoResetWeekly: next } : c));
    } catch (err) {
      alert("Failed to update auto-reset setting: " + err.message);
    }
  };

  // Filter submissions (supports filtering by individual student)
  const activeSubmissions = useMemo(() => {
    if (selectedStudentFilterId === 'all') return submissions;
    const targetStudent = students.find(s => s.id === selectedStudentFilterId);
    return submissions.filter(s =>
      s.studentId === selectedStudentFilterId ||
      (targetStudent?.name && s.playerName && s.playerName.trim().toLowerCase() === targetStudent.name.trim().toLowerCase())
    );
  }, [submissions, selectedStudentFilterId, students]);

  const pending = activeSubmissions.filter(s => s.status === 'pending');
  const reviewed = activeSubmissions.filter(s => s.status !== 'pending');

  const selectedStudentObj = useMemo(() => {
    if (selectedStudentFilterId === 'all') return null;
    return students.find(s => s.id === selectedStudentFilterId) || null;
  }, [selectedStudentFilterId, students]);

  const handleInspectStudentFromSubmission = (sub) => {
    const foundStudent = students.find(s =>
      s.id === sub.studentId ||
      (s.name && sub.playerName && s.name.trim().toLowerCase() === sub.playerName.trim().toLowerCase())
    ) || { id: sub.studentId, name: sub.playerName || 'Student' };
    setInspectingStudentSubmissions(foundStudent);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-[1920px] mx-auto">

        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-8 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-600 rounded-lg" aria-hidden="true">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black uppercase italic">Teacher Portal</h1>
                {user.organizationName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-950/60 text-blue-300 border border-blue-800/40 rounded-lg text-xs font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    {user.organizationName}
                  </span>
                )}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-lg text-xs font-bold">
                    <Crown className="w-3.5 h-3.5 text-yellow-400" />
                    Super Admin Access
                  </span>
                )}
              </div>
              <p className="text-slate-400">Welcome, {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && onSwitchToAdmin && (
              <button
                onClick={onSwitchToAdmin}
                className="flex items-center gap-2 px-3.5 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-lg text-xs font-bold transition-all shadow-md"
              >
                <Crown className="w-4 h-4 text-yellow-400" />
                <span>Admin Dashboard</span>
              </button>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors text-xs font-semibold"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" /> Logout
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          {/* Sidebar: Class List */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Super Admin View Scope Switcher: My Classes vs All Org Classes */}
            {isAdmin && (
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 shadow-md space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                    <Crown className="w-3.5 h-3.5 text-amber-400" /> Admin Scope
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                    {classes.length} {classes.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>

                {/* Scope Toggle: My Classes vs All Org Classes */}
                <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-lg border border-slate-800 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (adminViewScope !== 'mine') {
                        setAdminViewScope('mine');
                        localStorage.setItem('lvlup_admin_view_scope', 'mine');
                        loadClasses('mine', adminOrgFilter);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-bold transition-all ${
                      adminViewScope === 'mine'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Classes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (adminViewScope !== 'org') {
                        setAdminViewScope('org');
                        localStorage.setItem('lvlup_admin_view_scope', 'org');
                        loadClasses('org', adminOrgFilter);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-bold transition-all ${
                      adminViewScope === 'org'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>All Org</span>
                  </button>
                </div>

                {/* Sub-filter when Org scope is active */}
                {adminViewScope === 'org' && (
                  <div className="space-y-1 pt-1 border-t border-slate-800/80">
                    <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Organization Filter
                    </label>
                    <select
                      value={adminOrgFilter}
                      onChange={e => {
                        const val = e.target.value;
                        setAdminOrgFilter(val);
                        sessionStorage.setItem('lvlup_admin_selected_org', val);
                        loadClasses('org', val);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-medium outline-none focus:border-amber-400 transition-colors"
                    >
                      <option value="all">🌐 All Organizations ({adminOrgs.length})</option>
                      {adminOrgs.map(o => (
                        <option key={o.id} value={o.id}>🏫 {o.name} ({o.code})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-slate-400 uppercase text-xs tracking-widest">
                {isAdmin ? (adminViewScope === 'mine' ? 'My Personal Classes' : 'Organization Classes') : 'Your Classes'}
              </h2>
              <button
                onClick={() => {
                  setNewClassOrgId(adminViewScope === 'org' && adminOrgFilter !== 'all' && adminOrgFilter !== 'personal' ? adminOrgFilter : 'none');
                  setCreatingClass(true);
                }}
                className="text-green-400 hover:text-green-300"
                aria-label="Create new class"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {creatingClass && (
              <form onSubmit={handleCreateClass} className="mb-4 bg-slate-800 p-3 rounded-lg border border-slate-600" aria-label="Create new class">
                <label htmlFor="new-class-name" className="sr-only">Class Name</label>
                <input
                  id="new-class-name"
                  autoFocus
                  type="text"
                  placeholder="Class Name"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 rounded text-sm text-white mb-2"
                />
                {isAdmin && (
                  <div className="mb-2">
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Organization
                    </label>
                    <select
                      value={newClassOrgId}
                      onChange={e => setNewClassOrgId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white outline-none focus:border-amber-400"
                    >
                      <option value="none">🌟 Personal (No Organization)</option>
                      {adminOrgs.map(o => (
                        <option key={o.id} value={o.id}>🏫 {o.name} ({o.code})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-600 text-xs font-bold py-1 rounded">Create</button>
                  <button type="button" onClick={() => setCreatingClass(false)} className="flex-1 bg-slate-600 text-xs font-bold py-1 rounded">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-2" role="listbox" aria-label="Your classes">
              {classes.map(cls => (
                <div
                  key={cls.id}
                  role="option"
                  aria-selected={selectedClass?.id === cls.id}
                  tabIndex={0}
                  onClick={() => setSelectedClass(cls)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedClass(cls)}
                  className={`w-full p-4 rounded-xl text-left transition-all cursor-pointer relative group ${selectedClass?.id === cls.id ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  <div className="font-bold text-lg pr-14 truncate">{cls.name}</div>
                  {cls.teacherName && cls.teacherId !== user.id && (
                    <div className="text-xs text-yellow-300/90 font-medium flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-yellow-400" />
                      <span>Teacher: {cls.teacherName}</span>
                    </div>
                  )}
                  {isAdmin && cls.organizationId && (
                    <div className="text-[11px] text-amber-300/80 font-medium flex items-center gap-1 mt-0.5 truncate">
                      <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{adminOrgs.find(o => o.id === cls.organizationId)?.name || 'Assigned Org'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 text-sm opacity-80">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" aria-hidden="true" /> {cls.studentCount || 0} Students</span>
                    <span className="font-mono bg-black/20 px-2 rounded text-xs">Code: {cls.code}</span>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartMoveClassOrg(cls);
                        }}
                        className="p-1.5 text-amber-300 hover:text-white hover:bg-black/20 rounded"
                        title="Move to another organization"
                        aria-label={`Move class ${cls.name} to another organization`}
                      >
                        <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRenameClass(cls);
                      }}
                      className="p-1.5 text-slate-300 hover:text-white hover:bg-black/20 rounded"
                      title="Rename class"
                      aria-label={`Rename class ${cls.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClass(cls.id, e)}
                      className="p-1.5 text-red-300 hover:text-white hover:bg-red-900/40 rounded"
                      title="Delete class"
                      aria-label={`Delete class ${cls.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
              {classes.length === 0 && !creatingClass && (
                <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl px-4 text-xs">
                  {isAdmin && adminViewScope === 'mine' ? (
                    <>
                      <p className="font-semibold text-slate-400 mb-1">No personal classes yet.</p>
                      <p className="text-slate-500">
                        Click <strong className="text-green-400">+</strong> above to create your own class, or switch to <strong className="text-amber-400">All Org</strong> to oversee all school classes.
                      </p>
                    </>
                  ) : (
                    <>
                      No classes yet.<br/>Click + to create one.
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 xl:col-span-9">
            {selectedClass ? (
              <div>
                {/* Super Admin Oversight Banner */}
                {isAdmin && (
                  <div className="bg-gradient-to-r from-yellow-950/40 via-slate-900 to-slate-900 border border-yellow-500/30 rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-2 text-xs text-yellow-300">
                      <Crown className="w-4 h-4 text-yellow-400 shrink-0" />
                      <span>
                        {selectedClass.teacherId === user.id ? (
                          <>
                            <strong>Your Personal Class:</strong> Managing <strong className="text-white">{selectedClass.name}</strong> with full teacher privileges.
                          </>
                        ) : (
                          <>
                            <strong>Super Admin Oversight:</strong> Managing <strong className="text-white">{selectedClass.name}</strong>
                            {selectedClass.teacherName ? ` (Teacher: ${selectedClass.teacherName})` : ''} as a Super Admin with full teacher privileges.
                          </>
                        )}
                      </span>
                    </div>
                    {onSwitchToAdmin && (
                      <button
                        onClick={onSwitchToAdmin}
                        className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <span>Admin Dashboard</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div className="bg-slate-800 p-6 rounded-2xl mb-6 border border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-2xl font-black text-white">{selectedClass.name}</h2>
                        <button
                          onClick={() => handleStartRenameClass(selectedClass)}
                          className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold bg-slate-800/80 border border-slate-700"
                          title="Rename class"
                          aria-label={`Rename class ${selectedClass.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Rename Class</span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleStartMoveClassOrg(selectedClass)}
                            className="px-2.5 py-1 text-amber-300 hover:text-white hover:bg-amber-950/40 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold bg-slate-900/90 border border-amber-500/40"
                            title="Move class to another organization"
                            aria-label={`Move class ${selectedClass.name} to another organization`}
                          >
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Move Organization</span>
                          </button>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Organization:</span>
                          {selectedClass.organizationId ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Building2 className="w-3 h-3 text-amber-400" />
                              {adminOrgs.find(o => o.id === selectedClass.organizationId)?.name || 'Assigned Org'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-700/60 text-slate-300 border border-slate-600">
                              <User className="w-3 h-3 text-slate-400" />
                              Personal Class (No Organization)
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Class Code:</span>
                        <code className="text-xl font-mono font-bold text-green-400 tracking-widest">{selectedClass.code}</code>
                        <button onClick={() => copyCode(selectedClass.code)} className="text-slate-500 hover:text-white" aria-label="Copy class code">
                          <Copy className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button onClick={() => copyJoinLink(selectedClass.code)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white ml-2" aria-label="Copy join link">
                          <Link className="w-4 h-4" aria-hidden="true" /> Copy Join Link
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                        aria-label={loading ? 'Refreshing data...' : 'Refresh data'}
                      >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                      </button>
                      <div className="text-right">
                        <p className="text-3xl font-black text-white">{pending.length}</p>
                        <p className="text-slate-400 text-xs uppercase font-bold">Pending Reviews</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="text-right">
                      <p className="text-3xl font-black text-white">{students.length}</p>
                      <p className="text-slate-400 text-xs uppercase font-bold">Students</p>
                    </div>
                    <div className="text-right border-l border-slate-600 pl-4">
                      <p className="text-3xl font-black text-white">{pending.length}</p>
                      <p className="text-slate-400 text-xs uppercase font-bold">Pending</p>
                    </div>
                    <div className="text-right border-l border-slate-600 pl-4">
                      <p className="text-3xl font-black text-white">{reviewed.filter(s => s.status === 'approved').length}</p>
                      <p className="text-slate-400 text-xs uppercase font-bold">Approved</p>
                    </div>
                    <div className="text-right border-l border-slate-600 pl-4">
                      <p className="text-3xl font-black text-white">{reviewed.filter(s => s.status === 'rejected').length}</p>
                      <p className="text-slate-400 text-xs uppercase font-bold">Rejected</p>
                    </div>
                    <div className="text-right border-l border-slate-600 pl-4">
                      <p className="text-3xl font-black text-green-400">{students.length > 0 ? Math.round(students.reduce((sum, s) => sum + (s.xp || 0), 0) / students.length) : 0}</p>
                      <p className="text-slate-400 text-xs uppercase font-bold">Avg XP</p>
                    </div>
                    <div className="ml-auto flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setShowGuideModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-sm font-bold transition-colors"
                        title="View Level XP Requirements & Gold Economy Guide"
                      >
                        <Award className="w-4 h-4" /> Levels & Gold Guide
                      </button>
                      <ChoiceBoardExport classId={selectedClass.id} className={selectedClass.name} />
                      <div>
                        <button
                          onClick={handleResetClassActivities}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/50 text-orange-300 rounded-lg text-sm font-bold transition-colors"
                          aria-label="Reset activity completion for all students"
                        >
                          <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reset Activities
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleAutoReset}
                          className="text-xs text-slate-400 hover:text-white mt-1.5 flex items-center gap-1 transition-colors group cursor-pointer"
                          title="Click to toggle automatic weekly reset on Mondays at 7am"
                        >
                          <span>Auto-resets Mondays:</span>
                          <span className={`font-bold underline decoration-dotted ${selectedClass.autoResetWeekly !== false ? 'text-green-400' : 'text-amber-400'}`}>
                            {selectedClass.autoResetWeekly !== false ? 'ON (7am)' : 'OFF (Manual)'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-700" role="tablist" aria-label="Class management">
                  <button
                    role="tab"
                    aria-selected={activeTab === 'submissions'}
                    aria-controls="tabpanel-submissions"
                    id="tab-submissions"
                    onClick={() => setActiveTab('submissions')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'submissions' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    Submissions
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'students'}
                    aria-controls="tabpanel-students"
                    id="tab-students"
                    onClick={() => setActiveTab('students')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'students' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    Students
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'activities'}
                    aria-controls="tabpanel-activities"
                    id="tab-activities"
                    onClick={() => setActiveTab('activities')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'activities' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    Activities
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'categories'}
                    aria-controls="tabpanel-categories"
                    id="tab-categories"
                    onClick={() => setActiveTab('categories')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'categories' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    Categories
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'spotlight'}
                    aria-controls="tabpanel-spotlight"
                    id="tab-spotlight"
                    onClick={() => setActiveTab('spotlight')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'spotlight' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-1"><Sparkles className="w-4 h-4" aria-hidden="true" /> Spotlight</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'guilds'}
                    aria-controls="tabpanel-guilds"
                    id="tab-guilds"
                    onClick={() => setActiveTab('guilds')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'guilds' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" aria-hidden="true" /> Guilds</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'sharing'}
                    aria-controls="tabpanel-sharing"
                    id="tab-sharing"
                    onClick={() => setActiveTab('sharing')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'sharing' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    Sharing
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'rewards'}
                    aria-controls="tabpanel-rewards"
                    id="tab-rewards"
                    onClick={() => setActiveTab('rewards')}
                    className={`pb-4 px-2 font-bold ${activeTab === 'rewards' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-1"><Gift className="w-4 h-4" aria-hidden="true" /> Rewards</span>
                  </button>
                </div>

                {activeTab === 'activities' && (
                  <div role="tabpanel" id="tabpanel-activities" aria-labelledby="tab-activities">
                    {user.organizationId && (
                      <div className="mb-6 p-4 bg-slate-800 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-4 shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-purple-950/80 text-purple-400 border border-purple-800/40 rounded-xl">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">Organization Choice Board Templates</h4>
                            <p className="text-xs text-slate-400">Import master choice boards configured for {user.organizationName || 'your organization'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            loadOrgTemplates();
                            if (selectedClass) setTargetClassIdsToApply([selectedClass.id]);
                            setShowOrgTemplatesModal(true);
                          }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
                        >
                          <Layers className="w-4 h-4" /> Browse Org Templates
                        </button>
                      </div>
                    )}
                    <ActivityEditor
                      classId={selectedClass.id}
                      organizationId={selectedClass?.organizationId || user?.organizationId || null}
                      organizationName={user?.organizationName || ''}
                      onSave={(updatedPaths) => {
                        if (updatedPaths) setClassActivities(updatedPaths);
                        alert('Activities updated!');
                      }}
                    />
                  </div>
                )}

                {activeTab === 'categories' && (
                  <div role="tabpanel" id="tabpanel-categories" aria-labelledby="tab-categories">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">Categories & Layout</h3>
                          <p className="text-slate-400 text-sm">Customize learning path category names, reorder them, and select column layout on the student choice board. You can have 1 to {MAX_CATEGORIES} categories.</p>
                        </div>
                        <button
                          onClick={handleSaveCategories}
                          disabled={savingCategories}
                          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 shadow"
                        >
                          <Save className="w-4 h-4" aria-hidden="true" /> {savingCategories ? 'Saving...' : 'Save Settings'}
                        </button>
                      </div>

                      {/* Layout Settings Card */}
                      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
                        <div className="max-w-md">
                          <label htmlFor="categories-per-row" className="block text-sm font-bold text-white mb-1">
                            Choice Board Columns (Student View)
                          </label>
                          <p className="text-xs text-slate-400">
                            Configure how many category columns appear per row. Content wraps responsively on mobile displays to ensure accessibility (min 44×44px touch targets).
                          </p>
                        </div>
                        <select
                          id="categories-per-row"
                          value={categoriesPerRow}
                          onChange={e => setCategoriesPerRow(e.target.value)}
                          className="px-3.5 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white font-semibold focus:border-green-500 outline-none text-sm cursor-pointer"
                        >
                          <option value="auto">Auto / Responsive (Recommended)</option>
                          <option value="1">1 Column (Single Flow)</option>
                          <option value="2">2 Columns</option>
                          <option value="3">3 Columns</option>
                          <option value="4">4 Columns</option>
                          <option value="5">5 Columns</option>
                          <option value="6">6 Columns</option>
                        </select>
                      </div>

                      {/* Categories List */}
                      <div className="space-y-4">
                        {categoryOrder.map((key, idx) => {
                          const borderColors = ['border-blue-500', 'border-purple-500', 'border-orange-500', 'border-green-500', 'border-pink-500', 'border-teal-500'];
                          const color = borderColors[idx % borderColors.length];
                          return (
                            <div key={key} className={`p-4 bg-slate-700/90 rounded-xl border-l-4 ${color} shadow`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono">{key}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveCategory(idx, -1)}
                                    disabled={idx === 0}
                                    title="Move Up"
                                    aria-label={`Move ${categoryNames[key] || key} up`}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-600 text-slate-300 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] flex items-center justify-center"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveCategory(idx, 1)}
                                    disabled={idx === categoryOrder.length - 1}
                                    title="Move Down"
                                    aria-label={`Move ${categoryNames[key] || key} down`}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-600 text-slate-300 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] flex items-center justify-center"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCategory(key)}
                                    disabled={categoryOrder.length <= 1}
                                    title="Remove Category"
                                    aria-label={`Remove category ${categoryNames[key] || key}`}
                                    className="px-2.5 py-1.5 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-300 text-xs rounded transition-colors flex items-center gap-1 min-h-[36px] disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Remove
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label htmlFor={`cat-name-${key}`} className="block text-xs text-slate-400 font-bold uppercase mb-1">Category Name</label>
                                  <input
                                    id={`cat-name-${key}`}
                                    type="text"
                                    value={categoryNames[key] || ''}
                                    onChange={e => setCategoryNames(prev => ({ ...prev, [key]: e.target.value }))}
                                    placeholder="Category name"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-green-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label htmlFor={`cat-sub-${key}`} className="block text-xs text-slate-400 font-bold uppercase mb-1">Subtitle</label>
                                  <input
                                    id={`cat-sub-${key}`}
                                    type="text"
                                    value={categorySubtitles[key] || ''}
                                    onChange={e => setCategorySubtitles(prev => ({ ...prev, [key]: e.target.value }))}
                                    placeholder="Subtitle"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-green-500 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {categoryOrder.length < MAX_CATEGORIES ? (
                          <button
                            type="button"
                            onClick={handleAddCategory}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-600 hover:border-green-500 text-slate-300 hover:text-green-400 rounded-lg transition-colors font-medium text-sm"
                          >
                            <Plus className="w-4 h-4" /> Add Category
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Maximum {MAX_CATEGORIES} categories configured</span>
                        )}

                        <button
                          type="button"
                          onClick={handleSaveCategories}
                          disabled={savingCategories}
                          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" aria-hidden="true" /> {savingCategories ? 'Saving...' : 'Save Settings'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'sharing' && (
                  <div role="tabpanel" id="tabpanel-sharing" aria-labelledby="tab-sharing">
                    <div className="space-y-6">
                      {/* Student Join Link */}
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                          <Link className="w-5 h-5 text-blue-400" aria-hidden="true" /> Student Join Link
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">
                          Share this link with students. They can create their own account and join the class directly.
                        </p>
                        <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-lg border border-slate-700">
                          <code className="flex-1 text-blue-400 text-sm break-all">
                            {`${window.location.origin}/?code=${selectedClass.code}`}
                          </code>
                          <button
                            onClick={() => copyJoinLink(selectedClass.code)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm whitespace-nowrap"
                          >
                            <Copy className="w-4 h-4" aria-hidden="true" /> Copy Link
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Students who use this link can sign up with their own name and password. You can edit their info from the Students tab.
                        </p>
                      </div>

                      {/* Co-Teacher Management */}
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                          <Share2 className="w-5 h-5 text-purple-400" aria-hidden="true" /> Co-Teachers
                        </h3>
                        <p className="text-slate-400 text-sm mb-4">
                          Add other teachers to help manage this class. They'll see it in their dashboard and can review submissions, manage students, and edit activities.
                        </p>

                        {!selectedClass.isCoTeacher && (
                          <form onSubmit={handleAddCoTeacher} className="flex gap-3 mb-6" aria-label="Add co-teacher">
                            <div className="flex-1 relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" aria-hidden="true" />
                              <label htmlFor="co-teacher-email" className="sr-only">Co-teacher email</label>
                              <input
                                id="co-teacher-email"
                                type="email"
                                placeholder="Enter teacher's email address"
                                value={coTeacherEmail}
                                onChange={e => setCoTeacherEmail(e.target.value)}
                                className="w-full px-4 py-2 pl-10 bg-slate-700 rounded-lg text-white border border-slate-600 focus:border-purple-500 outline-none"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={addingCoTeacher}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                            >
                              <UserPlus className="w-4 h-4" aria-hidden="true" /> {addingCoTeacher ? 'Adding...' : 'Add'}
                            </button>
                          </form>
                        )}

                        {selectedClass.isCoTeacher && (
                          <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg text-purple-300 text-sm">
                            You are a co-teacher on this class. Only the class owner can add or remove co-teachers.
                          </div>
                        )}

                        {coTeachers.length > 0 ? (
                          <div className="space-y-2">
                            {coTeachers.map(ct => (
                              <div key={ct.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white" aria-hidden="true">
                                    {ct.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white text-sm">{ct.name}</p>
                                    <p className="text-xs text-slate-400">{ct.email}</p>
                                  </div>
                                </div>
                                {!selectedClass.isCoTeacher && (
                                  <button
                                    onClick={() => handleRemoveCoTeacher(ct.id, ct.name)}
                                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                    aria-label={`Remove ${ct.name} as co-teacher`}
                                  >
                                    <X className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm italic">No co-teachers added yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'spotlight' && (
                  <div role="tabpanel" id="tabpanel-spotlight" aria-labelledby="tab-spotlight">
                    <div className="space-y-6">
                      {/* Current Spotlight */}
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-yellow-400" aria-hidden="true" /> Current Spotlight
                        </h3>
                        {spotlight ? (
                          <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-2 border-yellow-500/50 rounded-xl p-6">
                            <div className="flex items-center gap-4">
                              <Avatar3D avatar={spotlight.avatar} level={(() => {
                                let lvl = 1;
                                for (const l of LEVELS) { if (spotlight.xp >= l.xpRequired) lvl = l.level; else break; }
                                return lvl;
                              })()} size="md" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">
                                    {spotlight.category === 'star_student' && '⭐'}
                                    {spotlight.category === 'most_improved' && '📈'}
                                    {spotlight.category === 'team_player' && '🤝'}
                                    {spotlight.category === 'creative_genius' && '🎨'}
                                  </span>
                                  <span className="text-xs font-bold uppercase tracking-widest text-yellow-400">
                                    {spotlight.category === 'star_student' && 'Star Student'}
                                    {spotlight.category === 'most_improved' && 'Most Improved'}
                                    {spotlight.category === 'team_player' && 'Team Player'}
                                    {spotlight.category === 'creative_genius' && 'Creative Genius'}
                                  </span>
                                </div>
                                <p className="text-2xl font-black text-white">{spotlight.studentName}</p>
                                <p className="text-slate-300 italic mt-1">"{spotlight.message}"</p>
                                <p className="text-xs text-slate-500 mt-2">Set by {spotlight.setBy} on {new Date(spotlight.setAt).toLocaleDateString()}</p>
                              </div>
                              <button
                                onClick={handleClearSpotlight}
                                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                aria-label="Remove spotlight"
                              >
                                <X className="w-5 h-5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                            <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-20" aria-hidden="true" />
                            No student spotlight set. Select a student below to highlight them for the class!
                          </div>
                        )}
                      </div>

                      {/* Set Spotlight */}
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <Star className="w-5 h-5 text-yellow-400" aria-hidden="true" /> Highlight a Student
                        </h3>

                        {/* Category Selection */}
                        <div className="mb-4">
                          <label className="block text-xs text-slate-400 font-bold uppercase mb-2">Spotlight Category</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                              { id: 'star_student', label: 'Star Student', emoji: '⭐' },
                              { id: 'most_improved', label: 'Most Improved', emoji: '📈' },
                              { id: 'team_player', label: 'Team Player', emoji: '🤝' },
                              { id: 'creative_genius', label: 'Creative Genius', emoji: '🎨' },
                            ].map(cat => (
                              <button
                                key={cat.id}
                                onClick={() => setSpotlightCategory(cat.id)}
                                className={`p-2 rounded-lg text-sm font-bold transition-colors ${
                                  spotlightCategory === cat.id
                                    ? 'bg-yellow-500 text-slate-900'
                                    : 'bg-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                {cat.emoji} {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Message */}
                        <div className="mb-4">
                          <label htmlFor="spotlight-message" className="block text-xs text-slate-400 font-bold uppercase mb-1">Custom Message</label>
                          <input
                            id="spotlight-message"
                            type="text"
                            value={spotlightMessage}
                            onChange={e => setSpotlightMessage(e.target.value)}
                            placeholder="Keep up the great work!"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 outline-none"
                            maxLength={100}
                          />
                        </div>

                        {/* Student List */}
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {students.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">No students in this class.</p>
                          ) : (
                            students
                              .sort((a, b) => (b.xp || 0) - (a.xp || 0))
                              .map(student => {
                                const level = LEVELS.reduce((acc, l) => (student.xp || 0) >= l.xpRequired ? l : acc, LEVELS[0]);
                                return (
                                  <div
                                    key={student.id}
                                    className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                                  >
                                    <Avatar3D avatar={student.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' }} level={level.level} size="sm" />
                                    <div className="flex-1">
                                      <p className="font-bold text-white text-sm">{student.name}</p>
                                      <p className={`text-xs ${level.color}`}>Lv.{level.level} {level.title} - {student.xp || 0} XP</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400">
                                        {(student.unlockedAchievements || []).length} <Trophy className="w-3 h-3 inline" aria-hidden="true" />
                                      </span>
                                      <button
                                        onClick={() => handleSetSpotlight(student)}
                                        disabled={savingSpotlight}
                                        className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                      >
                                        <Sparkles className="w-3 h-3 inline mr-1" aria-hidden="true" />
                                        Spotlight
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'guilds' && (
                  <div role="tabpanel" id="tabpanel-guilds" aria-labelledby="tab-guilds">
                    <GuildManagement
                      classId={selectedClass.id}
                      selectedClass={selectedClass}
                      onClassUpdated={(updated) => {
                        setSelectedClass(updated);
                        setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
                      }}
                      students={students}
                      onStudentsUpdated={() => backend.getStudents(selectedClass.id).then(setStudents)}
                    />
                  </div>
                )}

                {activeTab === 'rewards' && (
                  <div role="tabpanel" id="tabpanel-rewards" aria-labelledby="tab-rewards">
                    <RewardsManager classId={selectedClass.id} />
                  </div>
                )}

                {activeTab === 'students' && (
                  <div role="tabpanel" id="tabpanel-students" aria-labelledby="tab-students">
                    <RosterManager
                      classId={selectedClass.id}
                      className={selectedClass.name}
                      onStudentAdded={() => backend.getStudents(selectedClass.id).then(setStudents)}
                      submissions={submissions}
                      onReview={handleReview}
                      guilds={selectedClass?.guilds && selectedClass.guilds.length > 0 ? selectedClass.guilds : GUILDS}
                    />
                  </div>
                )}

                {activeTab === 'submissions' && (
                  <div role="tabpanel" id="tabpanel-submissions" aria-labelledby="tab-submissions" className="space-y-6">
                    {loading ? (
                      <div className="text-center py-12 text-slate-500" role="status" aria-live="polite">Loading submissions...</div>
                    ) : (
                      <>
                        {/* ── SUBMISSIONS VIEW CONTROLS ── */}
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-sm">
                          {/* View Mode Toggle: Queue vs By Student */}
                          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setSubmissionsViewMode('queue')}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
                                submissionsViewMode === 'queue'
                                  ? 'bg-slate-800 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Clock className="w-4 h-4 text-amber-400" />
                              <span>Activity Queue</span>
                              {pending.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                                  {pending.length}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setSubmissionsViewMode('by_student')}
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
                                submissionsViewMode === 'by_student'
                                  ? 'bg-green-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Users className="w-4 h-4" />
                              <span>Organized By Student</span>
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                                {students.length}
                              </span>
                            </button>
                          </div>

                          {/* Quick Actions / Filter by Student */}
                          {submissionsViewMode === 'queue' && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                <Filter className="w-3.5 h-3.5 text-green-400" /> Filter Student:
                              </span>
                              <select
                                value={selectedStudentFilterId}
                                onChange={(e) => setSelectedStudentFilterId(e.target.value)}
                                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold focus:border-green-500 focus:outline-none max-w-[240px]"
                                aria-label="Filter submissions by student"
                              >
                                <option value="all">All Students ({submissions.length} submissions)</option>
                                {students.map(s => {
                                  const sTotal = submissions.filter(sub =>
                                    sub.studentId === s.id ||
                                    (sub.playerName && sub.playerName.toLowerCase() === s.name.toLowerCase())
                                  ).length;
                                  const sPending = submissions.filter(sub =>
                                    (sub.studentId === s.id || (sub.playerName && sub.playerName.toLowerCase() === s.name.toLowerCase())) &&
                                    sub.status === 'pending'
                                  ).length;
                                  return (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({sTotal} total{sPending > 0 ? ` • ${sPending} pending` : ''})
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* ── FILTERED STUDENT BANNER (IF FILTERED IN QUEUE) ── */}
                        {submissionsViewMode === 'queue' && selectedStudentObj && (
                          <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-green-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
                            <div className="flex items-center gap-3">
                              <div className="rounded-xl overflow-hidden bg-slate-950 p-1 border border-slate-700 flex-shrink-0">
                                <Avatar3D
                                  avatar={selectedStudentObj.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' }}
                                  level={(() => {
                                    const lvl = LEVELS.reduce((acc, l) => (selectedStudentObj.xp || 0) >= l.xpRequired ? l : acc, LEVELS[0]);
                                    return lvl.level;
                                  })()}
                                  size="sm"
                                />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-white text-base">{selectedStudentObj.name}</h4>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                                    Filtered View
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {activeSubmissions.length} Total &bull; {pending.length} Pending &bull; {reviewed.filter(s => s.status === 'approved').length} Approved
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setInspectingStudentSubmissions(selectedStudentObj)}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Open Full Portfolio</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedStudentFilterId('all')}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                              >
                                Show All Students
                              </button>
                            </div>
                          </div>
                        )}

                        {/* ── VIEW MODE: QUEUE ── */}
                        {submissionsViewMode === 'queue' ? (
                          <>
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                              <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
                                Pending Reviews ({pending.length})
                                {selectedStudentObj && <span className="text-slate-500 lowercase">for {selectedStudentObj.name}</span>}
                              </h3>
                              {pending.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setGlobalExpandDirections(prev => !prev)}
                                  className="text-xs text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition-all shadow-sm"
                                  title={globalExpandDirections ? 'Collapse directions on all cards' : 'Expand directions on all cards'}
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{globalExpandDirections ? 'Collapse All Directions' : 'Expand All Directions'}</span>
                                </button>
                              )}
                            </div>

                            {pending.length === 0 ? (
                              <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-500 mb-8">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20 text-green-400" aria-hidden="true" />
                                {selectedStudentObj
                                  ? `No pending submissions for ${selectedStudentObj.name}. All caught up!`
                                  : "No pending submissions. You're all caught up!"}
                              </div>
                            ) : (
                              <div className="space-y-4 mb-8">
                                {pending.map(sub => (
                                  <SubmissionCard
                                    key={sub.id}
                                    submission={sub}
                                    onReview={handleReview}
                                    onInspectStudent={handleInspectStudentFromSubmission}
                                    classActivities={classActivities}
                                    activeBoss={activeBoss}
                                    forceExpanded={globalExpandDirections}
                                  />
                                ))}
                              </div>
                            )}

                            {reviewed.length > 0 ? (
                              <ReviewedSubmissions
                                reviewed={reviewed}
                                onReview={handleReview}
                                onInspectStudent={handleInspectStudentFromSubmission}
                                classActivities={classActivities}
                                activeBoss={activeBoss}
                              />
                            ) : selectedStudentObj && (
                              <div className="bg-slate-800/30 rounded-xl p-6 text-center text-slate-500 border border-slate-800">
                                No reviewed submissions found for {selectedStudentObj.name} yet.
                              </div>
                            )}
                          </>
                        ) : (
                          /* ── VIEW MODE: ORGANIZED BY STUDENT DIRECTORY ── */
                          <div className="space-y-5">
                            {/* Student Directory Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                              <div className="relative flex-1 min-w-[240px] max-w-md">
                                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder="Search students in this class..."
                                  value={studentDirectorySearch}
                                  onChange={e => setStudentDirectorySearch(e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:border-green-500 focus:outline-none"
                                />
                                {studentDirectorySearch && (
                                  <button
                                    type="button"
                                    onClick={() => setStudentDirectorySearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                {(() => {
                                  const pendingCount = students.filter(st => {
                                    return submissions.some(s =>
                                      (s.studentId === st.id || (st.name && s.playerName && s.playerName.trim().toLowerCase() === st.name.trim().toLowerCase())) &&
                                      s.status === 'pending'
                                    );
                                  }).length;

                                  const withSubsCount = students.filter(st => {
                                    return submissions.some(s =>
                                      s.studentId === st.id ||
                                      (st.name && s.playerName && s.playerName.trim().toLowerCase() === st.name.trim().toLowerCase())
                                    );
                                  }).length;

                                  const noSubsCount = students.length - withSubsCount;

                                  return [
                                    { id: 'all', label: `All (${students.length})` },
                                    { id: 'pending', label: `Needs Review (${pendingCount})`, isAlert: pendingCount > 0 },
                                    { id: 'has_submissions', label: `With Submissions (${withSubsCount})` },
                                    { id: 'no_submissions', label: `No Submissions (${noSubsCount})` }
                                  ].map(pill => (
                                    <button
                                      key={pill.id}
                                      type="button"
                                      onClick={() => setStudentDirectoryFilter(pill.id)}
                                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                        studentDirectoryFilter === pill.id
                                          ? 'bg-green-600 text-white shadow-sm'
                                          : pill.isAlert
                                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/40 hover:bg-amber-500/20'
                                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700/60'
                                      }`}
                                    >
                                      {pill.label}
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>

                            {/* Student Cards Directory Grid */}
                            {(() => {
                              const filteredList = students
                                .filter(st => {
                                  // Directory search
                                  if (studentDirectorySearch.trim()) {
                                    const q = studentDirectorySearch.toLowerCase().trim();
                                    if (!st.name?.toLowerCase().includes(q)) return false;
                                  }

                                  const stSubs = submissions.filter(s =>
                                    s.studentId === st.id ||
                                    (st.name && s.playerName && s.playerName.trim().toLowerCase() === st.name.trim().toLowerCase())
                                  );

                                  if (studentDirectoryFilter === 'pending') {
                                    return stSubs.some(s => s.status === 'pending');
                                  }
                                  if (studentDirectoryFilter === 'has_submissions') {
                                    return stSubs.length > 0;
                                  }
                                  if (studentDirectoryFilter === 'no_submissions') {
                                    return stSubs.length === 0;
                                  }
                                  return true;
                                });

                              if (filteredList.length === 0) {
                                return (
                                  <div className="bg-slate-800/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
                                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-40" />
                                    <h4 className="text-base font-bold text-white mb-1">No Students Found</h4>
                                    <p className="text-xs text-slate-400">No students match your directory filter or search term.</p>
                                  </div>
                                );
                              }

                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                  {filteredList.map(st => {
                                    const stSubs = submissions.filter(s =>
                                      s.studentId === st.id ||
                                      (st.name && s.playerName && s.playerName.trim().toLowerCase() === st.name.trim().toLowerCase())
                                    );
                                    const stPending = stSubs.filter(s => s.status === 'pending');
                                    const stApproved = stSubs.filter(s => s.status === 'approved');
                                    const stRejected = stSubs.filter(s => s.status === 'rejected');
                                    const stXp = stApproved.reduce((acc, s) => acc + (parseInt(s.xp) || 0), 0);

                                    const lvl = LEVELS.reduce((acc, l) => (st.xp || 0) >= l.xpRequired ? l : acc, LEVELS[0]);
                                    const sortedSubs = [...stSubs].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
                                    const latestSub = sortedSubs[0];

                                    return (
                                      <div
                                        key={st.id}
                                        className={`bg-slate-800 rounded-2xl p-5 border transition-all shadow-md flex flex-col justify-between group hover:border-slate-600 ${
                                          stPending.length > 0 ? 'border-amber-500/50 bg-gradient-to-br from-slate-800 to-amber-950/20' : 'border-slate-700/80'
                                        }`}
                                      >
                                        <div>
                                          <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                              <button
                                                type="button"
                                                onClick={() => setInspectingStudentSubmissions(st)}
                                                className="rounded-xl overflow-hidden bg-slate-950 p-1 border border-slate-700 flex-shrink-0 hover:ring-2 hover:ring-green-400 transition-all cursor-pointer"
                                                title={`View ${st.name}'s submission portfolio`}
                                              >
                                                <Avatar3D
                                                  avatar={st.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' }}
                                                  level={lvl.level}
                                                  size="sm"
                                                />
                                              </button>
                                              <div>
                                                <button
                                                  type="button"
                                                  onClick={() => setInspectingStudentSubmissions(st)}
                                                  className="font-bold text-white text-base leading-tight hover:text-green-400 transition-colors text-left"
                                                >
                                                  {st.name}
                                                </button>
                                                <p className={`text-xs font-semibold ${lvl.color}`}>
                                                  Lvl {lvl.level} - {lvl.title}
                                                </p>
                                              </div>
                                            </div>

                                            {stPending.length > 0 ? (
                                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {stPending.length} Pending
                                              </span>
                                            ) : stSubs.length > 0 ? (
                                              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/40 rounded-full text-[10px] font-bold">
                                                {stApproved.length} Approved
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 bg-slate-900 text-slate-500 rounded-full text-[10px]">
                                                No work yet
                                              </span>
                                            )}
                                          </div>

                                          {/* Metrics Breakdown */}
                                          <div className="grid grid-cols-3 gap-2 my-3 p-2.5 bg-slate-900/70 rounded-xl border border-slate-800 text-center text-xs">
                                            <div>
                                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total</span>
                                              <strong className="text-white font-mono text-sm">{stSubs.length}</strong>
                                            </div>
                                            <div>
                                              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Approved</span>
                                              <strong className="text-emerald-300 font-mono text-sm">{stApproved.length}</strong>
                                            </div>
                                            <div>
                                              <span className="text-[10px] text-yellow-400 uppercase font-bold block">XP Won</span>
                                              <strong className="text-yellow-400 font-mono text-sm">+{stXp}</strong>
                                            </div>
                                          </div>

                                          {/* Most recent submission */}
                                          <div className="text-[11px] text-slate-400 mb-4 truncate">
                                            {latestSub ? (
                                              <span title={`Latest: ${latestSub.activityTitle}`}>
                                                <strong className="text-slate-300">Latest:</strong> {latestSub.activityTitle} ({new Date(latestSub.submittedAt || Date.now()).toLocaleDateString()})
                                              </span>
                                            ) : (
                                              <span className="text-slate-500 italic">No submissions submitted yet.</span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                                          <button
                                            type="button"
                                            onClick={() => setInspectingStudentSubmissions(st)}
                                            className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>View Submissions ({stSubs.length})</span>
                                          </button>
                                          {stSubs.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSelectedStudentFilterId(st.id);
                                                setSubmissionsViewMode('queue');
                                              }}
                                              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-600"
                                              title="Filter activity queue to this student"
                                              aria-label="Filter activity queue to this student"
                                            >
                                              <Filter className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl min-h-[400px]">
                <BookOpen className="w-16 h-16 mb-4 opacity-20" aria-hidden="true" />
                <p>Select a class to view dashboard</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ================= MODAL: BROWSE & APPLY ORG TEMPLATES ================= */}
      {showOrgTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="browse-templates-title">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Organization Choice Boards</span>
                <h3 id="browse-templates-title" className="text-xl font-bold text-white">{user.organizationName || 'Organization'} Master Templates</h3>
              </div>
              <button onClick={() => setShowOrgTemplatesModal(false)} aria-label="Close templates modal" className="text-slate-400 hover:text-white text-xl font-bold p-1">✕</button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-1">
              <p className="text-xs text-slate-400">
                Browse master choice board templates configured for your organization. You can choose specific individual activities to import into <strong>{selectedClass?.name || 'your class'}</strong> without removing any of your current activities!
              </p>

              {orgTemplates.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-slate-800 rounded-xl">
                  No organization templates found for {user.organizationName || 'your organization'}.
                </div>
              ) : (
                <div className="space-y-4">
                  {orgTemplates.map(tmp => {
                    const isInspecting = inspectingTemplate?.id === tmp.id;
                    const isSelectedFull = selectedTemplateToApply?.id === tmp.id;

                    return (
                      <div key={tmp.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                              <Layers className="w-5 h-5 text-purple-400" />
                              {tmp.title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">{tmp.description || 'No description provided.'}</p>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                              <span>Created by: {tmp.createdBy || 'Admin'}</span>
                              <span>&middot;</span>
                              <span>{tmp.activities?.length || 0} Categories</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => setInspectingTemplate(isInspecting ? null : tmp)}
                              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-lg transition-colors border border-slate-600 flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {isInspecting ? 'Hide Preview' : 'Inspect Activities'}
                            </button>
                            <button
                              onClick={() => handleOpenImportModal(tmp)}
                              disabled={applyingTemplate}
                              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              Import to Class...
                            </button>
                          </div>
                        </div>

                        {/* Selective Activity Inspector */}
                        {isInspecting && (
                          <div className="mt-4 pt-4 border-t border-slate-700/80 space-y-4 bg-slate-900/60 p-4 rounded-xl">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                                Activities in "{tmp.title}"
                              </h5>
                              <button
                                onClick={() => handleOpenImportModal(tmp)}
                                className="text-xs text-purple-400 hover:text-purple-300 font-bold underline"
                              >
                                Open 3-Way Import Options →
                              </button>
                            </div>

                            <div className="space-y-4">
                              {(tmp.activities || []).map(path => {
                                const categoryName = tmp.categoryNames?.[path.id] || path.title;
                                const categorySub = tmp.categorySubtitles?.[path.id] || path.subtitle;

                                return (
                                  <div key={path.id} className="bg-slate-800 rounded-lg border border-slate-700 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="font-bold text-sm text-white">{categoryName}</span>
                                        {categorySub && <span className="text-xs text-slate-400 ml-2 italic">({categorySub})</span>}
                                      </div>
                                      <span className="text-[11px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                                        {path.options?.length || 0} activities
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                      {(path.options || []).map(opt => (
                                        <div key={opt.id} className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <div className="font-bold text-xs text-white truncate">{opt.title}</div>
                                            <div className="text-[11px] text-slate-400 line-clamp-1">{opt.desc}</div>
                                            <div className="text-[10px] text-yellow-400 font-semibold mt-0.5">{opt.type} &middot; {opt.xp} XP</div>
                                          </div>
                                          <button
                                            onClick={() => handleImportSingleActivity(tmp, path.id, opt)}
                                            disabled={importingSingleActivityId === opt.id}
                                            className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white font-bold text-[11px] rounded transition-colors whitespace-nowrap flex items-center gap-1 disabled:opacity-50 flex-shrink-0"
                                          >
                                            <Plus className="w-3 h-3" />
                                            {importingSingleActivityId === opt.id ? 'Importing...' : 'Import'}
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setShowOrgTemplatesModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: 3-WAY CHOICE BOARD TEMPLATE IMPORTER ================= */}
      {templateForImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="template-importer-title">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Import Choice Board Template</span>
                <h3 id="template-importer-title" className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  {templateForImport.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target Class: <strong className="text-green-400">{selectedClass?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setTemplateForImport(null)}
                aria-label="Close import dialog"
                className="text-slate-400 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {importOptionTab === 'menu' ? (
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                <p className="text-xs text-slate-300 mb-3">
                  How would you like to apply this template to <strong>{selectedClass?.name}</strong>? Choose one of the 3 options below:
                </p>

                {/* Option 1: Overwrite */}
                <div className="p-5 bg-red-950/30 border-2 border-red-600/50 rounded-xl hover:border-red-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <h4 className="font-bold text-white text-base">Option 1: Overwrite Current Choice Board</h4>
                    </div>
                    <p className="text-xs text-red-200/80">
                      Replaces all current activities and categories in {selectedClass?.name} with this template.
                    </p>
                    <span className="inline-block text-[11px] bg-red-900/60 text-red-300 px-2 py-0.5 rounded font-semibold">
                      ⚠️ Replaces current activities
                    </span>
                  </div>
                  <button
                    onClick={handleExecuteOverwrite}
                    disabled={applyingTemplate}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-colors shadow flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Overwrite Board
                  </button>
                </div>

                {/* Option 2: Merge / Keep Existing */}
                <div className="p-5 bg-purple-950/30 border-2 border-purple-600/50 rounded-xl hover:border-purple-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      <h4 className="font-bold text-white text-base">Option 2: Merge & Keep Existing</h4>
                    </div>
                    <p className="text-xs text-purple-200/80">
                      Appends all activities from this template into your class. Your current activities and categories will NOT be deleted.
                    </p>
                    <span className="inline-block text-[11px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded font-semibold">
                      ✨ Safe: keeps existing activities
                    </span>
                  </div>
                  <button
                    onClick={handleExecuteMerge}
                    disabled={applyingTemplate}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors shadow flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Merge All Activities
                  </button>
                </div>

                {/* Option 3: Select Specific Activities */}
                <div className="p-5 bg-emerald-950/30 border-2 border-emerald-600/50 rounded-xl hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <h4 className="font-bold text-white text-base">Option 3: Select Specific Activities</h4>
                    </div>
                    <p className="text-xs text-emerald-200/80">
                      Cherry-pick only the specific activities and categories you want to import into your class.
                    </p>
                    <span className="inline-block text-[11px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                      🎯 Custom activity selection
                    </span>
                  </div>
                  <button
                    onClick={() => setImportOptionTab('selective')}
                    disabled={applyingTemplate}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors shadow flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Choose Activities →
                  </button>
                </div>
              </div>
            ) : (
              /* Selective Mode Checklist */
              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setImportOptionTab('menu')}
                    className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1"
                  >
                    ← Back to Options
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-yellow-400 font-bold">
                      {selectiveActivities.size} Selected
                    </span>
                    <button
                      onClick={() => {
                        const allIds = new Set();
                        (templateForImport.activities || []).forEach(path => {
                          (path.options || []).forEach(opt => allIds.add(`${path.id}:${opt.id}`));
                        });
                        setSelectiveActivities(allIds);
                      }}
                      className="text-[11px] px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-semibold"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectiveActivities(new Set())}
                      className="text-[11px] px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-semibold"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {(templateForImport.activities || []).map(path => {
                    const categoryName = templateForImport.categoryNames?.[path.id] || path.title;
                    const pathActivityKeys = (path.options || []).map(opt => `${path.id}:${opt.id}`);
                    const allCategorySelected = pathActivityKeys.length > 0 && pathActivityKeys.every(k => selectiveActivities.has(k));

                    return (
                      <div key={path.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allCategorySelected}
                              onChange={() => {
                                setSelectiveActivities(prev => {
                                  const next = new Set(prev);
                                  if (allCategorySelected) {
                                    pathActivityKeys.forEach(k => next.delete(k));
                                  } else {
                                    pathActivityKeys.forEach(k => next.add(k));
                                  }
                                  return next;
                                });
                              }}
                              className="w-4 h-4 rounded text-green-500 focus:ring-0 cursor-pointer"
                            />
                            <span className="font-bold text-white text-sm">{categoryName}</span>
                          </label>
                          <span className="text-[11px] text-slate-400">
                            {path.options?.length || 0} activities
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(path.options || []).map(opt => {
                            const key = `${path.id}:${opt.id}`;
                            const isChecked = selectiveActivities.has(key);
                            return (
                              <label
                                key={opt.id}
                                className={`p-3 rounded-lg border text-left cursor-pointer transition-colors flex items-start gap-2.5 ${
                                  isChecked
                                    ? 'bg-slate-700/90 border-green-500/80 shadow-sm'
                                    : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectiveActivities(prev => {
                                      const next = new Set(prev);
                                      if (next.has(key)) next.delete(key);
                                      else next.add(key);
                                      return next;
                                    });
                                  }}
                                  className="mt-0.5 w-4 h-4 rounded text-green-500 focus:ring-0 cursor-pointer flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-xs text-white truncate">{opt.title}</div>
                                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{opt.desc}</div>
                                  <div className="text-[10px] text-yellow-400 font-semibold mt-1">
                                    {opt.type} &middot; {opt.xp} XP
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setTemplateForImport(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>

              {importOptionTab === 'selective' && (
                <button
                  type="button"
                  onClick={handleExecuteSelective}
                  disabled={applyingTemplate || selectiveActivities.size === 0}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {applyingTemplate ? 'Importing...' : `Import ${selectiveActivities.size} Selected Activities`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Legal & Student Data Privacy Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2 print:hidden">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <button
              onClick={() => { setLegalTab('privacy'); setLegalModalOpen(true); }}
              className="hover:text-blue-400 transition-colors underline underline-offset-2"
            >
              Privacy Policy
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => { setLegalTab('terms'); setLegalModalOpen(true); }}
              className="hover:text-blue-400 transition-colors underline underline-offset-2"
            >
              Terms of Service
            </button>
            <span className="text-slate-700">•</span>
            <button
              onClick={() => { setLegalTab('compliance'); setLegalModalOpen(true); }}
              className="hover:text-emerald-400 transition-colors flex items-center gap-1 inline-flex"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Student Data Privacy & FERPA / COPPA
            </button>
          </div>
          <p className="text-[11px] text-slate-600">
            Protected under Federal & State Student Privacy Laws. Zero ads & zero data selling.
          </p>
        </footer>

        <LegalModal
          isOpen={legalModalOpen}
          onClose={() => setLegalModalOpen(false)}
          initialTab={legalTab}
        />

        {/* ================= MODAL: RENAME CLASS ================= */}
        {showRenameModal && renamingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-yellow-400" /> Rename Class
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Updating name for <strong className="text-slate-300">{renamingClass.name}</strong> (Code: {renamingClass.code})
                  </p>
                </div>
                <button
                  onClick={() => { setShowRenameModal(false); setRenamingClass(null); }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRenameClass} className="space-y-4">
                <div>
                  <label htmlFor="teacher-rename-input" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    New Class Name *
                  </label>
                  <input
                    id="teacher-rename-input"
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    placeholder="e.g. 5th Grade Science & Robotics"
                    required
                    autoFocus
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-yellow-400"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowRenameModal(false); setRenamingClass(null); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRename || !renameInput.trim()}
                    className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-bold flex items-center gap-2"
                  >
                    {savingRename ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: MOVE CLASS ORGANIZATION ================= */}
        {showMoveOrgModal && movingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-400" /> Move Class Organization
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Reassign <strong className="text-slate-200">{movingClass.name}</strong> (Code: {movingClass.code}) to another organization.
                  </p>
                </div>
                <button
                  onClick={() => { setShowMoveOrgModal(false); setMovingClass(null); }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMoveClassOrg} className="space-y-4">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400">Current Organization:</div>
                  <div className="font-bold text-amber-300">
                    {movingClass.organizationId
                      ? (adminOrgs.find(o => o.id === movingClass.organizationId)?.name || movingClass.organizationId)
                      : '🌟 Personal Class (No Organization)'}
                  </div>
                </div>

                <div>
                  <label htmlFor="teacher-target-org-select" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Destination Organization *
                  </label>
                  <select
                    id="teacher-target-org-select"
                    value={selectedMoveOrgId}
                    onChange={(e) => setSelectedMoveOrgId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-amber-400"
                  >
                    <option value="none">🌟 Personal (No Organization)</option>
                    {adminOrgs.map(o => (
                      <option key={o.id} value={o.id}>🏫 {o.name} ({o.code})</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/80 leading-relaxed">
                  Moving this class will update its registered organization without altering your overall Super Admin designation or privileges.
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowMoveOrgModal(false); setMovingClass(null); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingMoveOrg}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-bold flex items-center gap-2"
                  >
                    {savingMoveOrg ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Moving...</span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-4 h-4" />
                        <span>Move Class</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <LevelEconomyGuideModal
          isOpen={showGuideModal}
          onClose={() => setShowGuideModal(false)}
        />

        {/* Student Submissions Portfolio Modal */}
        {inspectingStudentSubmissions && (
          <StudentSubmissionsModal
            student={inspectingStudentSubmissions}
            classId={selectedClass?.id}
            className={selectedClass?.name}
            submissions={submissions}
            onReview={handleReview}
            onClose={() => setInspectingStudentSubmissions(null)}
            allStudents={students}
            onSelectStudent={setInspectingStudentSubmissions}
            classActivities={classActivities}
            activeBoss={activeBoss}
          />
        )}
      </div>
  );
}

// ============== GUILD MANAGEMENT (TEACHER) ==============
function GuildManagement({ classId, selectedClass, onClassUpdated, students, onStudentsUpdated }) {
  const [subTab, setSubTab] = useState('roster'); // 'roster', 'standings', 'setup', 'stem_orders', 'boss'
  const [guildData, setGuildData] = useState({});
  const [loading, setLoading] = useState(true);
  const [rewardGuild, setRewardGuild] = useState(null);
  const [rewardType, setRewardType] = useState('xp');
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardAchievement, setRewardAchievement] = useState('');
  const [rewardMode, setRewardMode] = useState('grant'); // 'grant' | 'deduct'
  const [highFiveLimit, setHighFiveLimit] = useState(selectedClass?.highFiveLimit || 'daily'); // 'daily' | 'weekly' | 'disabled'
  const [allowStudentGuildSelect, setAllowStudentGuildSelect] = useState(selectedClass?.allowStudentGuildSelect !== false);
  const [givingReward, setGivingReward] = useState(false);
  const [trophyGuild, setTrophyGuild] = useState(null);
  const [selectedTrophy, setSelectedTrophy] = useState('');
  const [trophyMessage, setTrophyMessage] = useState('');
  const [awardingTrophy, setAwardingTrophy] = useState(false);
  const [guildHalls, setGuildHalls] = useState({});

  // Drag and Drop & Assignment State
  const [rosterSearch, setRosterSearch] = useState('');
  const [studentSortOrder, setStudentSortOrder] = useState('alpha-asc'); // 'alpha-asc' | 'alpha-desc' | 'xp-desc' | 'xp-asc'
  const [draggingStudentId, setDraggingStudentId] = useState(null);
  const [dragOverGuildId, setDragOverGuildId] = useState(null); // guildId or 'unassigned'
  const [movingStudentId, setMovingStudentId] = useState(null);
  const [rosterToast, setRosterToast] = useState(null);

  // Guild Customizer State (2 to 15 Guilds)
  const [activeGuilds, setActiveGuilds] = useState(
    selectedClass?.guilds && selectedClass.guilds.length > 0 ? selectedClass.guilds : GUILDS
  );
  const [savingGuilds, setSavingGuilds] = useState(false);
  const [showAddGuildModal, setShowAddGuildModal] = useState(false);

  // STEM Supplies Audit State
  const [stemPurchases, setStemPurchases] = useState([]);
  const [stemFilter, setStemFilter] = useState('all'); // 'all', 'pending', 'fulfilled'
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [stemCatalog, setStemCatalog] = useState(DEFAULT_STEM_SUPPLIES);
  const [showCatalogEditor, setShowCatalogEditor] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);

  // Boss Battle State
  const [activeBossInfo, setActiveBossInfo] = useState(null);
  const [bossForm, setBossForm] = useState({
    name: '',
    title: '',
    icon: '🤖',
    desc: '',
    steps: ['', '', ''],
    reward: 500,
    coinReward: 100,
  });
  const [savingBoss, setSavingBoss] = useState(false);

  const GUILD_COLOR_THEMES = [
    { name: 'Red / Crimson', color: 'bg-red-600', gradient: 'from-red-600 to-amber-500', border: 'border-red-400' },
    { name: 'Blue / Azure', color: 'bg-blue-600', gradient: 'from-blue-600 to-indigo-500', border: 'border-blue-400' },
    { name: 'Purple / Amethyst', color: 'bg-purple-600', gradient: 'from-purple-600 to-pink-500', border: 'border-purple-400' },
    { name: 'Green / Emerald', color: 'bg-emerald-600', gradient: 'from-emerald-600 to-teal-500', border: 'border-emerald-400' },
    { name: 'Amber / Gold', color: 'bg-amber-600', gradient: 'from-amber-600 to-yellow-500', border: 'border-amber-400' },
    { name: 'Cyan / Laser', color: 'bg-cyan-600', gradient: 'from-cyan-600 to-blue-500', border: 'border-cyan-400' },
    { name: 'Slate / Titanium', color: 'bg-slate-600', gradient: 'from-slate-600 to-zinc-500', border: 'border-slate-400' },
    { name: 'Rose / Pink', color: 'bg-pink-600', gradient: 'from-pink-600 to-rose-500', border: 'border-pink-400' },
    { name: 'Teal / Astro', color: 'bg-teal-600', gradient: 'from-teal-600 to-emerald-500', border: 'border-teal-400' },
    { name: 'Indigo / Cosmic', color: 'bg-indigo-600', gradient: 'from-indigo-600 to-purple-500', border: 'border-indigo-400' },
    { name: 'Orange / Nebula', color: 'bg-orange-600', gradient: 'from-orange-600 to-amber-500', border: 'border-orange-400' },
    { name: 'Sky / Abyss', color: 'bg-sky-600', gradient: 'from-sky-600 to-indigo-500', border: 'border-sky-400' },
    { name: 'Lime / Cyber', color: 'bg-lime-600', gradient: 'from-lime-600 to-emerald-500', border: 'border-lime-400' },
    { name: 'Fuchsia / Astral', color: 'bg-fuchsia-600', gradient: 'from-fuchsia-600 to-purple-500', border: 'border-fuchsia-400' },
    { name: 'Violet / Mystic', color: 'bg-violet-600', gradient: 'from-violet-600 to-pink-500', border: 'border-violet-400' },
  ];

  useEffect(() => {
    if (selectedClass?.guilds && selectedClass.guilds.length > 0) {
      setActiveGuilds(selectedClass.guilds);
    } else {
      setActiveGuilds(GUILDS);
    }
    setHighFiveLimit(selectedClass?.highFiveLimit || 'daily');
    setAllowStudentGuildSelect(selectedClass?.allowStudentGuildSelect !== false);
  }, [selectedClass]);

  useEffect(() => {
    loadGuildData();
    loadStemData();
    loadBossData();
  }, [classId]);

  const loadGuildData = async () => {
    setLoading(true);
    try {
      const data = await backend.getGuildLeaderboard(classId);
      setGuildData(data);
      const guildsToLoad = selectedClass?.guilds && selectedClass.guilds.length > 0 ? selectedClass.guilds : GUILDS;
      const halls = {};
      for (const g of guildsToLoad) {
        halls[g.id] = await backend.getGuildHall(classId, g.id);
      }
      setGuildHalls(halls);
    } catch (e) {
      console.error("Failed to load guild data", e);
    }
    setLoading(false);
  };

  const loadStemData = async () => {
    setLoadingPurchases(true);
    try {
      const [purchases, catalog] = await Promise.all([
        backend.getStemPurchases(classId),
        backend.getStemShopItems(classId),
      ]);
      setStemPurchases(purchases || []);
      if (catalog && catalog.length > 0) setStemCatalog(catalog);
    } catch (e) {
      console.error("Failed to load STEM data", e);
    }
    setLoadingPurchases(false);
  };

  const loadBossData = async () => {
    try {
      const boss = await backend.getActiveBoss(classId, selectedClass?.organizationId);
      setActiveBossInfo(boss);
      if (selectedClass?.customBoss) {
        setBossForm({
          name: selectedClass.customBoss.name || '',
          title: selectedClass.customBoss.title || '',
          icon: selectedClass.customBoss.icon || '🤖',
          desc: selectedClass.customBoss.desc || '',
          steps: selectedClass.customBoss.steps || ['', '', ''],
          reward: selectedClass.customBoss.reward || 500,
          coinReward: selectedClass.customBoss.coinReward || 100,
        });
      }
    } catch (e) {
      console.error("Failed to load boss data", e);
    }
  };

  const handleUpdateHighFiveLimit = async (newLimit) => {
    try {
      setHighFiveLimit(newLimit);
      await backend.updateClass(classId, { highFiveLimit: newLimit });
      if (onClassUpdated) {
        onClassUpdated({ ...selectedClass, highFiveLimit: newLimit });
      }
    } catch (err) {
      alert('Error updating high-five limit: ' + err.message);
    }
  };

  const handleToggleAllowStudentGuildSelect = async () => {
    const nextVal = !allowStudentGuildSelect;
    setAllowStudentGuildSelect(nextVal);
    try {
      await backend.updateClass(classId, { allowStudentGuildSelect: nextVal });
      if (onClassUpdated) {
        onClassUpdated({ ...selectedClass, allowStudentGuildSelect: nextVal });
      }
    } catch (err) {
      alert('Error updating guild policy: ' + err.message);
      setAllowStudentGuildSelect(!nextVal);
    }
  };

  const handleMoveStudentToGuild = async (studentId, targetGuildId) => {
    if (!studentId) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const newGuildId = targetGuildId && targetGuildId !== 'unassigned' ? targetGuildId : null;
    if ((student.guild || null) === newGuildId) return;

    const targetGuildName = newGuildId
      ? (activeGuilds.find(g => g.id === newGuildId)?.name || 'Guild')
      : 'Unassigned';

    setMovingStudentId(studentId);
    try {
      await backend.assignStudentGuild(studentId, newGuildId);
      if (onStudentsUpdated) await onStudentsUpdated();
      await loadGuildData();

      setRosterToast(`Moved ${student.name} to ${targetGuildName}!`);
      setTimeout(() => setRosterToast(null), 3000);
    } catch (err) {
      alert('Error moving student to guild: ' + err.message);
    } finally {
      setMovingStudentId(null);
      setDraggingStudentId(null);
      setDragOverGuildId(null);
    }
  };

  const handleResetGuildExploit = async (guildId, guildName) => {
    const confirmMsg = `Reset high-five exploit XP for ALL members in "${guildName}"?\n\nThis will reset each member's XP and Guild Contributed XP to 0.\n(If you prefer to deduct a specific amount, click the Gift icon and choose "Deduct / Exploit Penalty" instead).`;
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await backend.resetGuildMembersXp(classId, guildId, { resetTotalXp: true });
      alert(`Exploit XP reset to 0 for ${res.updatedCount} members of ${guildName}!`);
      loadGuildData();
      if (onStudentsUpdated) onStudentsUpdated();
    } catch (err) {
      alert('Error resetting guild exploit XP: ' + err.message);
    }
  };

  const handleGuildReward = async () => {
    if (!rewardGuild) return;
    setGivingReward(true);
    try {
      let value;
      if (rewardType === 'xp' || rewardType === 'coins') {
        const rawAmount = parseInt(rewardAmount) || 0;
        if (rawAmount <= 0) { alert('Enter a positive amount'); setGivingReward(false); return; }
        value = rewardMode === 'deduct' ? -rawAmount : rawAmount;
      } else {
        if (!rewardAchievement) { alert('Select an achievement'); setGivingReward(false); return; }
        value = rewardAchievement;
      }
      const count = await backend.rewardGuild(classId, rewardGuild, rewardType, value);
      const guildName = activeGuilds.find(g => g.id === rewardGuild)?.name || rewardGuild;
      const actionVerb = rewardMode === 'deduct' ? 'deducted from' : 'given to';
      alert(`${Math.abs(value)} ${rewardType.toUpperCase()} ${actionVerb} ${count} members of ${guildName}!`);
      setRewardGuild(null);
      setRewardAmount('');
      setRewardAchievement('');
      setRewardMode('grant');
      loadGuildData();
      if (onStudentsUpdated) onStudentsUpdated();
    } catch (error) {
      alert('Error processing guild reward/penalty: ' + error.message);
    }
    setGivingReward(false);
  };

  const handleAwardTrophy = async () => {
    if (!trophyGuild || !selectedTrophy) return;
    setAwardingTrophy(true);
    try {
      const trophy = GUILD_TROPHIES.find(t => t.id === selectedTrophy);
      await backend.addGuildHallTrophy(classId, trophyGuild, {
        ...trophy,
        message: trophyMessage || '',
      });
      const guildName = activeGuilds.find(g => g.id === trophyGuild)?.name || trophyGuild;
      alert(`${trophy.title} awarded to ${guildName}!`);
      setTrophyGuild(null);
      setSelectedTrophy('');
      setTrophyMessage('');
      loadGuildData();
    } catch (error) {
      alert('Error awarding trophy: ' + error.message);
    }
    setAwardingTrophy(false);
  };

  const handleAutoBalance = async (mode = 'unassigned') => {
    const msg = mode === 'all'
      ? `Rebalance ALL students evenly across the ${activeGuilds.length} guilds?`
      : `Auto-assign all unassigned students evenly across the ${activeGuilds.length} guilds?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await backend.autoBalanceGuilds(classId, mode);
      alert(`Successfully distributed ${res.updatedCount} students across guilds!`);
      loadGuildData();
      if (onStudentsUpdated) onStudentsUpdated();
    } catch (e) {
      alert('Error auto-balancing: ' + e.message);
    }
  };

  // Guild Customizer Handlers
  const handleUpdateGuildField = (guildId, field, value) => {
    setActiveGuilds(prev => prev.map(g => g.id === guildId ? { ...g, [field]: value } : g));
  };

  const handleGuildPhotoUpload = async (guildId, file) => {
    if (!file) return;
    try {
      const dataUri = await compressImageFile(file, 500, 500, 0.82);
      setActiveGuilds(prev => prev.map(g => g.id === guildId ? { ...g, botPictureUrl: dataUri } : g));
    } catch (err) {
      alert('Error reading image: ' + err.message);
    }
  };

  const handleSaveGuilds = async () => {
    if (activeGuilds.length < 2) {
      alert('You must have at least 2 guilds in a class.');
      return;
    }
    if (activeGuilds.length > 15) {
      alert('You cannot have more than 15 guilds in a class.');
      return;
    }
    setSavingGuilds(true);
    try {
      await backend.updateClassGuilds(classId, activeGuilds);
      alert('Guild configuration saved successfully!');
      if (onClassUpdated) {
        onClassUpdated({ ...selectedClass, guilds: activeGuilds });
      }
      loadGuildData();
    } catch (err) {
      alert('Error saving guilds: ' + err.message);
    }
    setSavingGuilds(false);
  };

  const handleRemoveGuild = (guildId, guildName) => {
    if (activeGuilds.length <= 2) {
      alert('Classes must have at least 2 guilds.');
      return;
    }
    const studentCount = students.filter(s => s.guild === guildId).length;
    const confirmMsg = studentCount > 0
      ? `Remove "${guildName}"? ${studentCount} students are currently in this guild and will become unassigned.`
      : `Remove "${guildName}" from this class?`;
    if (!window.confirm(confirmMsg)) return;

    setActiveGuilds(prev => prev.filter(g => g.id !== guildId));
  };

  const handleAddPresetGuild = (preset) => {
    if (activeGuilds.length >= 15) {
      alert('Maximum of 15 guilds reached.');
      return;
    }
    setActiveGuilds(prev => [...prev, { ...preset, botPictureUrl: '' }]);
    setShowAddGuildModal(false);
  };

  const handleAddCustomGuild = () => {
    if (activeGuilds.length >= 15) {
      alert('Maximum of 15 guilds reached.');
      return;
    }
    const newId = 'guild_' + Date.now();
    const newGuild = {
      id: newId,
      name: `Guild ${activeGuilds.length + 1}`,
      emoji: '⚡',
      motto: 'Strive for excellence!',
      color: 'bg-indigo-600',
      borderColor: 'border-indigo-400',
      gradient: 'from-indigo-600 to-purple-500',
      symbol: 'Valor',
      botPictureUrl: '',
    };
    setActiveGuilds(prev => [...prev, newGuild]);
    setShowAddGuildModal(false);
  };

  // STEM Purchase fulfillment
  const handleToggleFulfill = async (purchaseId, currentStatus) => {
    try {
      await backend.markStemPurchaseFulfilled(purchaseId, !currentStatus);
      setStemPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, fulfilled: !currentStatus } : p));
    } catch (err) {
      alert('Error updating purchase status: ' + err.message);
    }
  };

  const handleDeleteStemPurchase = async (purchaseId, itemName, studentName) => {
    if (!window.confirm(`Delete STEM order "${itemName}" by ${studentName}?\n\nThis will remove the order from the guild purchase log.`)) return;
    try {
      await backend.deleteStemPurchase(purchaseId);
      setStemPurchases(prev => prev.filter(p => p.id !== purchaseId));
      alert(`Order for "${itemName}" removed.`);
    } catch (err) {
      alert('Error removing STEM order: ' + err.message);
    }
  };

  const handleSaveStemCatalog = async () => {
    setSavingCatalog(true);
    try {
      await backend.updateStemShopItems(classId, stemCatalog);
      alert('STEM Shop catalog & prices saved!');
      setShowCatalogEditor(false);
    } catch (err) {
      alert('Error saving STEM catalog: ' + err.message);
    }
    setSavingCatalog(false);
  };

  // Boss Battle Handlers
  const handleSaveClassBoss = async (e) => {
    e.preventDefault();
    if (!bossForm.name.trim()) {
      alert('Please enter a boss name');
      return;
    }
    setSavingBoss(true);
    try {
      const bossData = {
        id: selectedClass?.customBoss?.id || 'boss_custom_' + Date.now(),
        name: bossForm.name.trim(),
        title: bossForm.title.trim(),
        icon: bossForm.icon.trim() || '🤖',
        desc: bossForm.desc.trim(),
        steps: bossForm.steps.filter(s => s && s.trim()),
        reward: parseInt(bossForm.reward) || 500,
        coinReward: parseInt(bossForm.coinReward) || 100,
        updatedAt: new Date().toISOString(),
      };
      await backend.setClassCustomBoss(classId, bossData);
      alert(`Class custom boss "${bossData.name}" activated! Students will now see this weekly boss.`);
      if (onClassUpdated) {
        onClassUpdated({ ...selectedClass, customBoss: bossData });
      }
      loadBossData();
    } catch (err) {
      alert('Error saving class boss: ' + err.message);
    }
    setSavingBoss(false);
  };

  const handleClearClassBoss = async () => {
    if (!window.confirm('Reset to organization weekly boss or default boss rotation?')) return;
    try {
      await backend.clearClassCustomBoss(classId);
      alert('Class custom boss cleared. Class will now follow district/default rotation.');
      if (onClassUpdated) {
        onClassUpdated({ ...selectedClass, customBoss: null });
      }
      setBossForm({
        name: '',
        title: '',
        icon: '🤖',
        desc: '',
        steps: ['', '', ''],
        reward: 500,
        coinReward: 100,
      });
      loadBossData();
    } catch (err) {
      alert('Error clearing class boss: ' + err.message);
    }
  };

  // Sort guilds by total XP for leaderboard
  const sortedGuilds = [...activeGuilds].sort((a, b) => {
    const aXp = guildData[a.id]?.totalXp || 0;
    const bXp = guildData[b.id]?.totalXp || 0;
    return bXp - aXp;
  });

  const sortStudentsList = (list) => {
    return [...list].sort((a, b) => {
      if (studentSortOrder === 'alpha-asc') {
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      }
      if (studentSortOrder === 'alpha-desc') {
        return (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' });
      }
      if (studentSortOrder === 'xp-desc') {
        return (b.xp || 0) - (a.xp || 0);
      }
      if (studentSortOrder === 'xp-asc') {
        return (a.xp || 0) - (b.xp || 0);
      }
      return 0;
    });
  };

  const unassigned = students.filter(s => !s.guild || !activeGuilds.some(g => g.id === s.guild));
  const filteredUnassigned = sortStudentsList(
    unassigned.filter(s =>
      !rosterSearch.trim() || s.name.toLowerCase().includes(rosterSearch.trim().toLowerCase())
    )
  );

  const getGuildMembers = (guildId) => {
    const members = students.filter(s => s.guild === guildId);
    const filtered = !rosterSearch.trim()
      ? members
      : members.filter(s => s.name.toLowerCase().includes(rosterSearch.trim().toLowerCase()));
    return sortStudentsList(filtered);
  };

  // Filter STEM purchases
  const filteredStemPurchases = stemFilter === 'all'
    ? stemPurchases
    : stemFilter === 'pending'
    ? stemPurchases.filter(p => !p.fulfilled)
    : stemPurchases.filter(p => p.fulfilled);

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-700 pb-3 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setSubTab('roster')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all min-h-[44px] ${
            subTab === 'roster' ? 'bg-purple-600 text-white font-black shadow' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Guild Rosters & Drag-and-Drop
          {unassigned.length > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {unassigned.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('standings')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all min-h-[44px] ${
            subTab === 'standings' ? 'bg-yellow-500 text-slate-950 font-black shadow' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" /> Leaderboard & Spirits
        </button>

        <button
          onClick={() => setSubTab('setup')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all min-h-[44px] ${
            subTab === 'setup' ? 'bg-indigo-600 text-white font-black shadow' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" /> Guild Customizer ({activeGuilds.length}/15)
        </button>

        <button
          onClick={() => setSubTab('stem_orders')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all min-h-[44px] relative ${
            subTab === 'stem_orders' ? 'bg-emerald-600 text-white font-black shadow' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> STEM Supplies Audit
          {stemPurchases.filter(p => !p.fulfilled).length > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {stemPurchases.filter(p => !p.fulfilled).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('boss')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all min-h-[44px] ${
            subTab === 'boss' ? 'bg-red-600 text-white font-black shadow' : 'bg-slate-800 text-slate-300 hover:text-white'
          }`}
        >
          <Swords className="w-4 h-4" /> Class Weekly Boss
        </button>
      </div>

      {/* SUB-TAB 0: DRAG & DROP GUILD ROSTERS */}
      {subTab === 'roster' && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-400" aria-hidden="true" />
                  Guild Rosters & Drag-and-Drop
                </h3>
                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {students.length - unassigned.length} / {students.length} Assigned
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Drag and drop student cards between guilds or unassigned, or use the 1-click guild picker on any card.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {unassigned.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleAutoBalance('unassigned')}
                  className="px-3.5 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition-all min-h-[44px]"
                  title="Automatically distribute all unassigned students evenly"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-Assign ({unassigned.length}) Unassigned
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAutoBalance('all')}
                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-600 transition-colors min-h-[44px]"
                title={`Evenly rebalance all students across the ${activeGuilds.length} guilds`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Rebalance All {activeGuilds.length} Guilds
              </button>
            </div>
          </div>

          {/* Search, Alphabetical Sort & Student Self-Selection Policy Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/80 rounded-xl border border-slate-700/80">
            {/* Real-time Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search students in guilds..."
                value={rosterSearch}
                onChange={e => setRosterSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 outline-none focus:border-purple-500 transition-colors min-h-[38px]"
              />
              {rosterSearch && (
                <button
                  onClick={() => setRosterSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Alphabetical & XP Sort Control */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider shrink-0">
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" /> Sort Students:
              </span>
              <select
                value={studentSortOrder}
                onChange={e => setStudentSortOrder(e.target.value)}
                className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 focus:border-purple-400 outline-none cursor-pointer min-h-[34px]"
                aria-label="Sort student roster"
              >
                <option value="alpha-asc">Name: A → Z (Alphabetical)</option>
                <option value="alpha-desc">Name: Z → A</option>
                <option value="xp-desc">XP: Highest → Lowest</option>
                <option value="xp-asc">XP: Lowest → Highest</option>
              </select>
            </div>

            {/* Student Guild Choice Policy Toggle */}
            <div className="flex items-center gap-2.5 bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                {allowStudentGuildSelect ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-400" />
                )}
                Student Self-Selection:
              </span>
              <button
                type="button"
                onClick={handleToggleAllowStudentGuildSelect}
                className={`px-2.5 py-1 rounded-lg font-black text-[11px] uppercase transition-all ${
                  allowStudentGuildSelect
                    ? 'bg-green-600 text-white shadow-sm hover:bg-green-500'
                    : 'bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-400'
                }`}
                title="Click to toggle whether students can choose/switch their own guild"
              >
                {allowStudentGuildSelect ? 'Allowed' : 'Locked (Teacher Only)'}
              </button>
            </div>
          </div>

          {/* UNASSIGNED STUDENTS TRAY / DROP ZONE */}
          <div
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDragEnter={(e) => { e.preventDefault(); setDragOverGuildId('unassigned'); }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget)) return;
              if (dragOverGuildId === 'unassigned') setDragOverGuildId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const sId = e.dataTransfer.getData('text/plain') || draggingStudentId;
              handleMoveStudentToGuild(sId, null);
            }}
            className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
              dragOverGuildId === 'unassigned'
                ? 'border-amber-400 bg-amber-500/15 shadow-xl ring-2 ring-amber-400/50 scale-[1.01]'
                : unassigned.length > 0
                ? 'border-dashed border-amber-500/50 bg-amber-500/5'
                : 'border-dashed border-slate-700 bg-slate-900/40'
            }`}
          >
            <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                  ⚡
                </span>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  Unassigned Students
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {unassigned.length}
                  </span>
                </h4>
                <span className="text-[11px] text-slate-400 italic hidden sm:inline">
                  (Drag students here or into any guild column below)
                </span>
              </div>

              {unassigned.length > 0 && (
                <span className="text-[11px] font-bold text-amber-300/80">
                  {filteredUnassigned.length} showing {rosterSearch ? `(matching "${rosterSearch}")` : ''}
                </span>
              )}
            </div>

            {filteredUnassigned.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {filteredUnassigned.map(student => {
                  const level = LEVELS.reduce((acc, l) => (student.xp || 0) >= l.xpRequired ? l : acc, LEVELS[0]);
                  const isDragging = draggingStudentId === student.id;
                  const isMoving = movingStudentId === student.id;

                  return (
                    <div
                      key={student.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', student.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggingStudentId(student.id);
                      }}
                      onDragEnd={() => {
                        setDraggingStudentId(null);
                        setDragOverGuildId(null);
                      }}
                      className={`p-3 rounded-2xl border flex flex-col justify-between bg-slate-900/95 text-white transition-all cursor-grab active:cursor-grabbing hover:border-amber-400 hover:shadow-lg ${
                        isDragging ? 'opacity-40 border-amber-400 ring-2 ring-amber-400 scale-95' : 'border-slate-700'
                      } ${isMoving ? 'animate-pulse' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <GripVertical className="w-4 h-4 text-slate-500 hover:text-slate-300 flex-shrink-0 mt-1 cursor-grab" />
                        <Avatar3D avatar={student.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' }} level={level.level} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-white leading-snug break-words" title={student.name}>
                            {student.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] mt-0.5 flex-wrap">
                            <span className={`font-semibold ${level.color}`}>Lv.{level.level}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-yellow-400 font-bold">{student.xp || 0} XP</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-800">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleMoveStudentToGuild(student.id, e.target.value);
                          }}
                          className="w-full text-xs font-bold px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-yellow-300 rounded-xl border border-slate-700 hover:border-amber-400 focus:border-amber-400 outline-none cursor-pointer transition-colors min-h-[36px]"
                          title={`Assign ${student.name} to a guild`}
                          aria-label={`Assign ${student.name} to a guild`}
                        >
                          <option value="" disabled>+ Choose Guild...</option>
                          {activeGuilds.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.emoji || '🛡️'} {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : unassigned.length > 0 && rosterSearch ? (
              <p className="text-xs text-slate-500 italic py-2">No unassigned students match "{rosterSearch}".</p>
            ) : (
              <div className="py-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span>All students are assigned to guilds! Drag any student here to remove them from their guild.</span>
              </div>
            )}
          </div>

          {/* GUILD KANBAN COLUMNS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {activeGuilds.map(guild => {
              const members = getGuildMembers(guild.id);
              const stats = guildData[guild.id];
              const levelInfo = getGuildLevelInfo(stats?.totalXp || 0);
              const isOver = dragOverGuildId === guild.id;
              const botPic = guild.botPictureUrl || guildHalls[guild.id]?.botPictureUrl || null;

              return (
                <div
                  key={guild.id}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDragEnter={(e) => { e.preventDefault(); setDragOverGuildId(guild.id); }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    if (dragOverGuildId === guild.id) setDragOverGuildId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const sId = e.dataTransfer.getData('text/plain') || draggingStudentId;
                    handleMoveStudentToGuild(sId, guild.id);
                  }}
                  className={`flex flex-col rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-lg ${
                    isOver
                      ? 'border-yellow-400 bg-yellow-500/15 shadow-2xl ring-2 ring-yellow-400/50 scale-[1.02]'
                      : 'border-slate-700 bg-slate-900/80 hover:border-slate-600'
                  }`}
                >
                  {/* Guild Column Header - Full Name and Clear Badges */}
                  <div className={`p-4 bg-gradient-to-r ${guild.gradient || 'from-slate-800 to-slate-700'} border-b border-white/10 text-white`}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {botPic ? (
                          <img
                            src={botPic}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-white/30 flex-shrink-0 mt-0.5 shadow"
                          />
                        ) : (
                          <span className="text-2xl flex-shrink-0 drop-shadow mt-0.5" aria-hidden="true">
                            {guild.emoji || '🛡️'}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-sm text-white leading-snug break-words drop-shadow-sm">
                            {guild.name}
                          </h4>
                          <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5 font-medium">
                            {guild.motto || guild.symbol || 'Alliance'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-black/40 text-yellow-300 border border-white/20 shrink-0 whitespace-nowrap shadow-sm">
                        {members.length} {members.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-white/95 mt-2.5 pt-2 border-t border-white/15">
                      <span>Lvl {levelInfo.level} • {levelInfo.name}</span>
                      <span className="text-yellow-300 font-black">{(stats?.totalXp || 0).toLocaleString()} XP</span>
                    </div>
                  </div>

                  {/* Drop Indicator */}
                  {isOver && (
                    <div className="p-3 mx-2 mt-2 rounded-xl border-2 border-dashed border-yellow-400 bg-yellow-500/20 text-yellow-300 text-xs font-black text-center animate-pulse">
                      + Drop student here to assign to {guild.name}
                    </div>
                  )}

                  {/* Member Cards List */}
                  <div className="p-3 space-y-2.5 flex-1 min-h-[140px] max-h-[500px] overflow-y-auto">
                    {members.length > 0 ? (
                      members.map(member => {
                        const level = LEVELS.reduce((acc, l) => (member.xp || 0) >= l.xpRequired ? l : acc, LEVELS[0]);
                        const isDragging = draggingStudentId === member.id;
                        const isMoving = movingStudentId === member.id;

                        return (
                          <div
                            key={member.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', member.id);
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggingStudentId(member.id);
                            }}
                            onDragEnd={() => {
                              setDraggingStudentId(null);
                              setDragOverGuildId(null);
                            }}
                            className={`p-3 rounded-xl border flex flex-col justify-between bg-slate-800/95 text-white transition-all cursor-grab active:cursor-grabbing hover:border-purple-400 hover:shadow-md group ${
                              isDragging ? 'opacity-40 border-purple-400 ring-2 ring-purple-400 scale-95' : 'border-slate-700/80'
                            } ${isMoving ? 'animate-pulse' : ''}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-slate-300 flex-shrink-0 mt-1 cursor-grab" />
                              <Avatar3D avatar={member.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' }} level={level.level} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-white leading-snug break-words" title={member.name}>
                                  {member.name}
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] mt-0.5 flex-wrap">
                                  <span className={`font-semibold ${level.color}`}>Lv.{level.level}</span>
                                  <span className="text-slate-500">•</span>
                                  <span className="text-yellow-400 font-bold">{member.xp || 0} XP</span>
                                </div>
                              </div>
                            </div>

                            {/* Guild Selector Footer */}
                            <div className="mt-2.5 pt-2 border-t border-slate-700/70 flex items-center justify-between gap-1.5">
                              <select
                                value={guild.id}
                                onChange={(e) => handleMoveStudentToGuild(member.id, e.target.value)}
                                className="flex-1 text-xs font-bold px-2 py-1.5 bg-slate-900 text-slate-200 hover:text-white rounded-lg border border-slate-700 hover:border-purple-400 outline-none cursor-pointer transition-colors min-h-[34px]"
                                title={`Change ${member.name}'s guild`}
                                aria-label={`Change ${member.name}'s guild`}
                              >
                                <option value="unassigned">⚡ Unassign</option>
                                {activeGuilds.map(g => (
                                  <option key={g.id} value={g.id}>
                                    {g.emoji || '🛡️'} {g.name}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => handleMoveStudentToGuild(member.id, 'unassigned')}
                                className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/30 transition-colors min-h-[34px] min-w-[34px] flex items-center justify-center shrink-0"
                                title={`Unassign ${member.name} from ${guild.name}`}
                                aria-label={`Unassign ${member.name}`}
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full min-h-[120px] flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-800 rounded-xl text-center">
                        <span className="text-2xl opacity-40 mb-1">{guild.emoji || '🛡️'}</span>
                        <p className="text-xs text-slate-500 font-bold">No members yet</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">Drag students here or select from dropdown</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 1: STANDINGS & LEADERBOARD */}
      {subTab === 'standings' && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" aria-hidden="true" /> Guild Hub & Leaderboard
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitor team progression, guild perks, bot showcase, award trophies, and auto-balance student rosters.
              </p>
            </div>

            {/* Auto-Balance Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {unassigned.length > 0 && (
                <button
                  onClick={() => handleAutoBalance('unassigned')}
                  className="px-3.5 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition-all min-h-[44px]"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Auto-Assign ({unassigned.length}) Unassigned
                </button>
              )}
              <button
                onClick={() => handleAutoBalance('all')}
                className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-600 transition-colors min-h-[44px]"
                title={`Evenly rebalance all students across the ${activeGuilds.length} guilds`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> Rebalance All {activeGuilds.length} Guilds
              </button>
            </div>
          </div>

          {/* High-Five Cooldown Policy / Exploit Limiter */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Teammate High-Five Policy</h4>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Spam Limiter
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Controls how often students can cheer guildmates in the Members tab (+10 XP sender, +15 XP teammate). Prevents class period spam.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => handleUpdateHighFiveLimit('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  highFiveLimit === 'daily'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Once Per Day
              </button>
              <button
                type="button"
                onClick={() => handleUpdateHighFiveLimit('weekly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  highFiveLimit === 'weekly'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Once Per Week
              </button>
              <button
                type="button"
                onClick={() => handleUpdateHighFiveLimit('disabled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  highFiveLimit === 'disabled'
                    ? 'bg-red-600 text-white font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Disabled
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-500 text-center py-4" role="status">Loading guild data...</p>
          ) : (
            <div className="space-y-3">
              {sortedGuilds.map((guild, idx) => {
                const stats = guildData[guild.id];
                const hallTrophies = guildHalls[guild.id]?.trophies || [];
                const levelInfo = getGuildLevelInfo(stats?.totalXp || 0);
                const botPic = guild.botPictureUrl || guildHalls[guild.id]?.botPictureUrl || null;

                return (
                  <div
                    key={guild.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverGuildId !== guild.id) setDragOverGuildId(guild.id);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverGuildId(guild.id);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget)) return;
                      if (dragOverGuildId === guild.id) setDragOverGuildId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverGuildId(null);
                      const studentId = e.dataTransfer.getData('text/plain') || draggingStudentId;
                      if (studentId) {
                        handleMoveStudentToGuild(studentId, guild.id);
                      }
                    }}
                    className={`p-5 rounded-2xl border-2 transition-all ${
                      dragOverGuildId === guild.id
                        ? 'border-yellow-400 bg-yellow-500/15 shadow-2xl ring-2 ring-yellow-400/50 scale-[1.005]'
                        : idx === 0
                        ? 'border-yellow-500/50 bg-yellow-500/5 shadow-lg'
                        : 'border-slate-700 bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                      <div className="w-8 text-center flex-shrink-0">
                        {idx === 0 && <span className="text-2xl" aria-hidden="true">🥇</span>}
                        {idx === 1 && <span className="text-2xl" aria-hidden="true">🥈</span>}
                        {idx === 2 && <span className="text-2xl" aria-hidden="true">🥉</span>}
                        {idx >= 3 && <span className="text-lg font-bold text-slate-500">#{idx + 1}</span>}
                      </div>

                      {/* Bot picture or Guild Avatar */}
                      {botPic ? (
                        <div className="relative flex-shrink-0">
                          <img
                            src={botPic}
                            alt={`${guild.name} robot`}
                            className="w-12 h-12 rounded-xl object-cover border border-yellow-400 shadow"
                          />
                          <span className="absolute -bottom-1 -right-1 bg-slate-950 text-[8px] font-black uppercase px-1 rounded text-yellow-300 border border-yellow-500/50">
                            Bot
                          </span>
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-2xl ${guild.color || 'bg-slate-700'} flex items-center justify-center shadow flex-shrink-0`}>
                          <span className="text-2xl" aria-hidden="true">{guild.emoji || '🛡️'}</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-white text-lg">{guild.name}</p>
                          <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            Level {levelInfo.level} • {levelInfo.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Perk: <span className="text-slate-300 font-semibold">{levelInfo.perk}</span></p>
                      </div>

                      <div className="text-right px-2">
                        <p className="text-xl font-black text-yellow-400">{(stats?.totalXp || 0).toLocaleString()} XP</p>
                        <p className="text-[11px] text-slate-400">{levelInfo.isMax ? 'Max Level' : `${levelInfo.xpNeeded.toLocaleString()} to Lvl ${levelInfo.level + 1}`}</p>
                      </div>

                      <div className="text-right px-2">
                        <p className="text-lg font-bold text-blue-400">{stats?.memberCount || 0}</p>
                        <p className="text-xs text-slate-400">Members</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => { setRewardGuild(guild.id); setRewardType('xp'); setRewardAmount(''); setRewardMode('grant'); }}
                          className="p-2.5 bg-slate-800 hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-400 rounded-xl border border-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title={`Give direct reward drop or penalty to ${guild.name}`}
                          aria-label={`Give reward to ${guild.name}`}
                        >
                          <Gift className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => { setTrophyGuild(guild.id); setSelectedTrophy(''); setTrophyMessage(''); }}
                          className="p-2.5 bg-slate-800 hover:bg-purple-500/20 text-slate-400 hover:text-purple-400 rounded-xl border border-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title={`Award trophy to ${guild.name}`}
                          aria-label={`Award trophy to ${guild.name}`}
                        >
                          <Trophy className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleResetGuildExploit(guild.id, guild.name)}
                          className="p-2.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title={`Reset exploit XP for ${guild.name} (sets all member XP & Guild XP to 0)`}
                          aria-label={`Reset exploit XP for ${guild.name}`}
                        >
                          <RotateCcw className="w-4 h-4 text-red-400" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Level Progress Bar */}
                    <div className="mt-3 w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full transition-all duration-500"
                        style={{ width: `${levelInfo.progress}%` }}
                      />
                    </div>

                    {/* Guild Hall Trophies Preview */}
                    {hallTrophies.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-600/50 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-400 uppercase font-black">Hall Trophies:</span>
                        {hallTrophies.map((t, i) => (
                          <span key={i} className="text-lg bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700" title={`${t.title}${t.message ? ': ' + t.message : ''}`} aria-label={t.title}>
                            {t.icon} <span className="text-xs font-bold text-slate-300 ml-1">{t.title}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Member List */}
                    {stats && stats.members.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-600/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {stats.members.map(member => {
                            const level = LEVELS.reduce((acc, l) => member.totalXp >= l.xpRequired ? l : acc, LEVELS[0]);
                            const isDragging = draggingStudentId === member.id;
                            return (
                              <div
                                key={member.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', member.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDraggingStudentId(member.id);
                                }}
                                onDragEnd={() => {
                                  setDraggingStudentId(null);
                                  setDragOverGuildId(null);
                                }}
                                className={`flex items-center gap-2 p-2 bg-slate-800/80 rounded-xl border text-sm transition-all cursor-grab active:cursor-grabbing hover:border-slate-500 ${
                                  isDragging ? 'opacity-40 border-yellow-400 scale-95' : 'border-slate-700/50'
                                }`}
                              >
                                <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0 hover:text-slate-300" aria-hidden="true" />
                                <Avatar3D avatar={member.avatar} level={level.level} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-white truncate text-xs">{member.name}</p>
                                  <p className={`text-[10px] ${level.color}`}>Lv.{level.level} • {member.currentStreak || 0}d streak</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-yellow-400 font-black text-xs block">{member.xp} XP</span>
                                  <span className="text-[10px] text-slate-400 block font-medium">{member.guildXpContributed || 0} Guild XP</span>
                                </div>
                                <select
                                  value={guild.id}
                                  onChange={(e) => handleMoveStudentToGuild(member.id, e.target.value)}
                                  disabled={movingStudentId === member.id}
                                  className="bg-slate-900 border border-slate-700 hover:border-purple-400 text-slate-300 text-[10px] font-bold rounded-lg px-1.5 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-purple-400 transition-colors min-h-[32px] shrink-0"
                                  title="Move student to another guild or unassign"
                                  aria-label={`Assign guild for ${member.name}`}
                                >
                                  <option value="">Unassign</option>
                                  {activeGuilds.map(g => (
                                    <option key={g.id} value={g.id}>
                                      {g.emoji || '🛡️'} {g.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Unassigned students section */}
          {unassigned.length > 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverGuildId !== 'unassigned') setDragOverGuildId('unassigned');
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOverGuildId('unassigned');
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget)) return;
                if (dragOverGuildId === 'unassigned') setDragOverGuildId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverGuildId(null);
                const studentId = e.dataTransfer.getData('text/plain') || draggingStudentId;
                if (studentId) {
                  handleMoveStudentToGuild(studentId, '');
                }
              }}
              className={`mt-6 p-5 rounded-2xl border-2 border-dashed transition-all ${
                dragOverGuildId === 'unassigned'
                  ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/50'
                  : 'border-amber-500/40 bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> Students Without a Guild ({unassigned.length})
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Drag to any guild card above or select a guild below to place them.</p>
                </div>
                <button
                  onClick={() => handleAutoBalance('unassigned')}
                  className="px-3 py-1 bg-yellow-500 text-slate-950 font-black rounded-lg text-xs hover:bg-yellow-400 transition-colors min-h-[44px]"
                >
                  Auto-Distribute Now
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {unassigned.map(s => {
                  const isDragging = draggingStudentId === s.id;
                  return (
                    <div
                      key={s.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', s.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggingStudentId(s.id);
                      }}
                      onDragEnd={() => {
                        setDraggingStudentId(null);
                        setDragOverGuildId(null);
                      }}
                      className={`px-3 py-1.5 bg-slate-800 border rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-amber-400/60 transition-all ${
                        isDragging ? 'opacity-40 border-amber-400 scale-95' : 'border-slate-700'
                      }`}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                      <span className="truncate max-w-[120px]">{s.name}</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleMoveStudentToGuild(s.id, e.target.value);
                        }}
                        disabled={movingStudentId === s.id}
                        className="bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 text-[10px] font-bold rounded-md px-1.5 py-0.5 outline-none cursor-pointer min-h-[30px]"
                        title={`Assign ${s.name} to a guild`}
                        aria-label={`Assign ${s.name} to a guild`}
                      >
                        <option value="" disabled>+ Assign</option>
                        {activeGuilds.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.emoji || '🛡️'} {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: GUILD CUSTOMIZER (UP TO 15 GUILDS & BOT PHOTOS) */}
      {subTab === 'setup' && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">Class Guild Customizer</h3>
                <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {activeGuilds.length} / 15 Guilds Active
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Customize guild names, robot photos, team colors, and add up to 15 guilds per class.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activeGuilds.length < 15 && (
                <button
                  type="button"
                  onClick={() => setShowAddGuildModal(true)}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors min-h-[44px]"
                >
                  <Plus className="w-4 h-4" /> Add Guild ({15 - activeGuilds.length} slots left)
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveGuilds}
                disabled={savingGuilds}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition-colors disabled:opacity-50 min-h-[44px]"
              >
                <Save className="w-4 h-4" /> {savingGuilds ? 'Saving Guilds...' : 'Save Guild Configuration'}
              </button>
            </div>
          </div>

          {/* Guilds List Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeGuilds.map((g, idx) => (
              <div
                key={g.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-700 p-4 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={g.emoji || '🛡️'}
                      onChange={e => handleUpdateGuildField(g.id, 'emoji', e.target.value)}
                      className="w-10 text-center py-1 bg-slate-800 border border-slate-700 rounded-lg text-lg outline-none focus:border-purple-500"
                      title="Guild Emoji"
                      maxLength={4}
                    />
                    <input
                      type="text"
                      value={g.name}
                      onChange={e => handleUpdateGuildField(g.id, 'name', e.target.value)}
                      placeholder="Guild Name"
                      className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-sm outline-none focus:border-purple-500 flex-1 min-w-[140px]"
                    />
                  </div>

                  {activeGuilds.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGuild(g.id, g.name)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Remove Guild"
                      aria-label={`Remove guild ${g.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Motto & Symbol */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Motto</label>
                    <input
                      type="text"
                      value={g.motto || ''}
                      onChange={e => handleUpdateGuildField(g.id, 'motto', e.target.value)}
                      placeholder="e.g. Together we build!"
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-purple-500 min-h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Theme Color</label>
                    <select
                      value={g.color || 'bg-slate-600'}
                      onChange={e => {
                        const theme = GUILD_COLOR_THEMES.find(t => t.color === e.target.value);
                        if (theme) {
                          setActiveGuilds(prev => prev.map(item => item.id === g.id ? {
                            ...item,
                            color: theme.color,
                            gradient: theme.gradient,
                            borderColor: theme.border
                          } : item));
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-purple-500 min-h-[36px] cursor-pointer"
                    >
                      {GUILD_COLOR_THEMES.map(t => (
                        <option key={t.color} value={t.color}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bot Picture Section */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-[11px] font-black text-yellow-400 uppercase mb-1 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Guild Robot Picture
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {g.botPictureUrl ? (
                      <div className="relative flex-shrink-0">
                        <img
                          src={g.botPictureUrl}
                          alt="Bot"
                          className="w-14 h-14 rounded-xl object-cover border border-yellow-400 shadow"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateGuildField(g.id, 'botPictureUrl', '')}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-500 shadow"
                          title="Remove Photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-800 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0 text-[10px]">
                        <ImageIcon className="w-4 h-4 mb-0.5 opacity-50" /> No Photo
                      </div>
                    )}

                    <div className="flex-1 min-w-[180px] space-y-1.5">
                      <input
                        type="url"
                        value={g.botPictureUrl && !g.botPictureUrl.startsWith('data:') ? g.botPictureUrl : ''}
                        onChange={e => handleUpdateGuildField(g.id, 'botPictureUrl', e.target.value)}
                        placeholder="Paste image link URL..."
                        className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-[11px] outline-none focus:border-yellow-500 min-h-[32px]"
                      />
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold border border-slate-700 cursor-pointer transition-colors min-h-[32px]">
                        <Upload className="w-3 h-3 text-yellow-400" /> Upload Image File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleGuildPhotoUpload(g.id, e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Guild Modal */}
          {showAddGuildModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              onClick={() => setShowAddGuildModal(false)}
            >
              <div
                className="bg-slate-900 border-2 border-purple-500 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-purple-400" /> Add Guild to Class
                  </h3>
                  <button onClick={() => setShowAddGuildModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-300">
                  Select a themed preset or create a custom guild for this class. You can have up to 15 guilds.
                </p>

                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-400">Available Themed Presets</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DEFAULT_15_GUILDS.filter(p => !activeGuilds.some(g => g.id === p.id)).map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => handleAddPresetGuild(preset)}
                        className={`p-3 rounded-xl border border-white/20 bg-gradient-to-br ${preset.gradient} text-left flex items-center gap-3 hover:scale-[1.02] transition-transform min-h-[44px] shadow text-white`}
                      >
                        <span className="text-2xl">{preset.emoji}</span>
                        <div>
                          <p className="font-bold text-sm">{preset.name}</p>
                          <p className="text-[10px] opacity-80 italic">"{preset.motto}"</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleAddCustomGuild}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold rounded-xl text-xs border border-purple-500/40 flex items-center gap-1.5 min-h-[44px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Blank Custom Guild
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddGuildModal(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: STEM SUPPLIES AUDIT & CATALOG */}
      {subTab === 'stem_orders' && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Package className="w-6 h-6 text-emerald-400" /> STEM Supplies & Guild Orders Audit
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Track all student coin expenditures for guild STEM hardware and extra VEX Pitch time. Mark orders fulfilled as you deliver materials in class.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowCatalogEditor(!showCatalogEditor)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-600 transition-colors min-h-[44px]"
              >
                <Settings className="w-4 h-4 text-emerald-400" /> {showCatalogEditor ? 'Hide Catalog Editor' : 'Edit Catalog & Pricing'}
              </button>
            </div>
          </div>

          {/* Catalog Editor Accordion */}
          {showCatalogEditor && (
            <div className="p-5 bg-slate-900/90 rounded-2xl border border-emerald-500/40 space-y-4 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-400" /> Customize STEM Supplies Shop & Prices
                </h4>
                <button
                  type="button"
                  onClick={handleSaveStemCatalog}
                  disabled={savingCatalog}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-colors shadow min-h-[36px]"
                >
                  {savingCatalog ? 'Saving...' : 'Save Catalog Changes'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stemCatalog.map(item => (
                  <div key={item.id} className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl">{item.icon || '⚙️'}</span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => {
                          const val = e.target.value;
                          setStemCatalog(prev => prev.map(i => i.id === item.id ? { ...i, name: val } : i));
                        }}
                        className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold flex-1 text-xs"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400 font-bold">🪙</span>
                        <input
                          type="number"
                          min="1"
                          value={item.costCoins}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            setStemCatalog(prev => prev.map(i => i.id === item.id ? { ...i, costCoins: val } : i));
                          }}
                          className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-yellow-400 font-bold text-center text-xs"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={item.desc}
                      onChange={e => {
                        const val = e.target.value;
                        setStemCatalog(prev => prev.map(i => i.id === item.id ? { ...i, desc: val } : i));
                      }}
                      placeholder="Item description"
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-[11px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Filter Status:</span>
              {[
                { id: 'all', label: `All (${stemPurchases.length})` },
                { id: 'pending', label: `Pending (${stemPurchases.filter(p => !p.fulfilled).length})` },
                { id: 'fulfilled', label: `Delivered (${stemPurchases.filter(p => p.fulfilled).length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStemFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] ${
                    stemFilter === tab.id
                      ? 'bg-emerald-500 text-slate-950 font-black shadow'
                      : 'bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadStemData}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Refresh Purchases"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Purchases List */}
          {loadingPurchases ? (
            <p className="text-slate-500 text-center py-6 text-xs">Loading purchase log...</p>
          ) : filteredStemPurchases.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-700">
              <Package className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">No STEM supply orders match this filter</p>
              <p className="text-xs text-slate-500 mt-1">Student supply purchases made with their coins will appear here instantly.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStemPurchases.map(p => (
                <div
                  key={p.id}
                  className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-slate-800 rounded-xl border border-slate-700">{p.icon || '⚙️'}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-sm">{p.itemName}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Tier {p.tier || 1}
                        </span>
                        <span className="text-xs font-bold text-yellow-400">🪙 {p.costCoins}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Purchased by <strong className="text-white">{p.studentName}</strong> for <strong className="text-yellow-300">{p.guildEmoji} {p.guildName}</strong>
                      </p>
                      <p className="text-[11px] text-slate-500">{new Date(p.timestamp).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleFulfill(p.id, p.fulfilled)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow min-h-[44px] ${
                        p.fulfilled
                          ? 'bg-slate-800 hover:bg-amber-500/20 text-emerald-400 hover:text-amber-400 border border-emerald-500/40'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                      }`}
                    >
                      {p.fulfilled ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Delivered (Tap to Undo)
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Mark Delivered to Guild
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteStemPurchase(p.id, p.itemName, p.studentName)}
                      className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Delete / Cancel order (Exploit Removal)"
                      aria-label={`Delete order ${p.itemName}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: CLASS WEEKLY BOSS BATTLE */}
      {subTab === 'boss' && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Swords className="w-6 h-6 text-red-400" /> Class Weekly Boss Challenge
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure a custom weekly boss for this class, or inherit the district/school-wide boss challenge.
            </p>
          </div>

          {/* Active Boss Status Card */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl p-2 bg-slate-800 rounded-xl border border-slate-700">{activeBossInfo?.icon || '👹'}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-white text-base">{activeBossInfo?.name || 'Weekly Boss'}</h4>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    activeBossInfo?.source === 'class'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : activeBossInfo?.source === 'org'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {activeBossInfo?.source === 'class' ? 'Class Custom' : activeBossInfo?.source === 'org' ? 'District / Org' : 'Default Rotation'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{activeBossInfo?.desc}</p>
                <p className="text-[11px] text-yellow-400 mt-1 font-bold">Reward: +{activeBossInfo?.reward || 500} XP • +{activeBossInfo?.coinReward || 100} Coins</p>
              </div>
            </div>

            {selectedClass?.customBoss && (
              <button
                type="button"
                onClick={handleClearClassBoss}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold border border-red-500/30 transition-colors min-h-[44px]"
              >
                Reset to Org / Default Boss
              </button>
            )}
          </div>

          {/* Custom Boss Form */}
          <form onSubmit={handleSaveClassBoss} className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wider text-red-400">
              {selectedClass?.customBoss ? 'Edit Class Custom Boss' : 'Create Class Custom Boss'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Boss Name</label>
                <input
                  type="text"
                  required
                  value={bossForm.name}
                  onChange={e => setBossForm({ ...bossForm, name: e.target.value })}
                  placeholder="e.g. The Quantum Drake"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-red-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Title / Subtitle</label>
                <input
                  type="text"
                  value={bossForm.title}
                  onChange={e => setBossForm({ ...bossForm, title: e.target.value })}
                  placeholder="e.g. Master of Algorithmic Mazes"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-red-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Boss Icon / Emoji</label>
                <input
                  type="text"
                  value={bossForm.icon}
                  onChange={e => setBossForm({ ...bossForm, icon: e.target.value })}
                  placeholder="🤖, 🐉, 👾"
                  className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-red-500 min-h-[44px]"
                  maxLength={4}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Lore / Battle Description</label>
              <textarea
                rows={2}
                value={bossForm.desc}
                onChange={e => setBossForm({ ...bossForm, desc: e.target.value })}
                placeholder="Describe this week's mission challenge..."
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Battle Plan Steps</label>
              <div className="space-y-2">
                {bossForm.steps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-950 text-red-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {sIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={e => {
                        const newSteps = [...bossForm.steps];
                        newSteps[sIdx] = e.target.value;
                        setBossForm({ ...bossForm, steps: newSteps });
                      }}
                      placeholder={`Step ${sIdx + 1} requirement`}
                      className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-red-500 min-h-[36px]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">XP Reward</label>
                <input
                  type="number"
                  min="50"
                  value={bossForm.reward}
                  onChange={e => setBossForm({ ...bossForm, reward: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-yellow-400 font-bold text-xs outline-none focus:border-red-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Coin Reward</label>
                <input
                  type="number"
                  min="10"
                  value={bossForm.coinReward}
                  onChange={e => setBossForm({ ...bossForm, coinReward: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-yellow-400 font-bold text-xs outline-none focus:border-red-500 min-h-[44px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingBoss}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow min-h-[44px]"
            >
              {savingBoss ? 'Saving Boss Challenge...' : 'Publish Class Boss Challenge'}
            </button>
          </form>
        </div>
      )}

      {/* Guild Reward Modal */}
      {rewardGuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => { setRewardGuild(null); setRewardMode('grant'); }}>
          <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {rewardMode === 'deduct' ? (
                  <>
                    <AlertTriangle className="w-6 h-6 text-red-400" aria-hidden="true" /> Guild Exploit Deduction
                  </>
                ) : (
                  <>
                    <Gift className="w-6 h-6 text-yellow-400" aria-hidden="true" /> Guild Reward Drop
                  </>
                )}
              </h3>
              <button onClick={() => { setRewardGuild(null); setRewardMode('grant'); }} className="text-slate-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Award vs Deduct Mode Toggle */}
            <div className="flex gap-2 mb-4 bg-slate-900/60 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setRewardMode('grant')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                  rewardMode === 'grant' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                + Award Reward
              </button>
              <button
                type="button"
                onClick={() => {
                  setRewardMode('deduct');
                  if (rewardType === 'achievement') setRewardType('xp');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                  rewardMode === 'deduct' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                - Deduct / Exploit Penalty
              </button>
            </div>

            {(() => {
              const guild = activeGuilds.find(g => g.id === rewardGuild) || GUILDS.find(g => g.id === rewardGuild);
              const stats = guildData[rewardGuild];
              return (
                <div className={`p-3 rounded-xl ${guild?.color || 'bg-slate-700'} bg-opacity-30 mb-4 flex items-center gap-3`}>
                  <span className="text-3xl" aria-hidden="true">{guild?.emoji || '🛡️'}</span>
                  <div>
                    <p className="font-bold text-white">{guild?.name}</p>
                    <p className="text-xs text-slate-300">
                      {stats?.memberCount || 0} members will be affected
                    </p>
                  </div>
                </div>
              );
            })()}

            {rewardMode === 'deduct' && (
              <div className="p-3 mb-4 rounded-xl bg-red-950/40 border border-red-700/50 flex items-start gap-2.5 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Exploit Penalty Mode:</strong> This will subtract the specified amount from each member's total XP and contributed Guild XP (minimum 0).
                </span>
              </div>
            )}

            <div className="flex gap-2 mb-4" role="group" aria-label="Reward type">
              <button onClick={() => setRewardType('xp')} className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 min-h-[44px] ${rewardType === 'xp' ? (rewardMode === 'deduct' ? 'bg-red-600 text-white' : 'bg-green-600 text-white') : 'bg-slate-700 text-slate-300'}`}>
                <Zap className="w-4 h-4" aria-hidden="true" /> XP
              </button>
              <button onClick={() => setRewardType('coins')} className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 min-h-[44px] ${rewardType === 'coins' ? (rewardMode === 'deduct' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white') : 'bg-slate-700 text-slate-300'}`}>
                <Star className="w-4 h-4" aria-hidden="true" /> Coins
              </button>
              {rewardMode === 'grant' && (
                <button onClick={() => setRewardType('achievement')} className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 min-h-[44px] ${rewardType === 'achievement' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  <Trophy className="w-4 h-4" aria-hidden="true" /> Trophy
                </button>
              )}
            </div>

            {(rewardType === 'xp' || rewardType === 'coins') && (
              <div className="mb-4">
                <label htmlFor="guild-reward-amount" className="block text-sm text-slate-400 mb-1">
                  {rewardMode === 'deduct' ? 'Amount to DEDUCT per member' : `Amount of ${rewardType === 'xp' ? 'XP' : 'Coins'} per member`}
                </label>
                <input
                  id="guild-reward-amount"
                  type="number"
                  min="1"
                  value={rewardAmount}
                  onChange={e => setRewardAmount(e.target.value)}
                  placeholder={rewardType === 'xp' ? 'e.g. 500' : 'e.g. 50'}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 outline-none min-h-[44px]"
                />
              </div>
            )}

            {rewardType === 'achievement' && rewardMode === 'grant' && (
              <div className="mb-4">
                <label htmlFor="guild-reward-achievement" className="block text-sm text-slate-400 mb-1">Select Achievement to unlock for all members</label>
                <select
                  id="guild-reward-achievement"
                  value={rewardAchievement}
                  onChange={e => setRewardAchievement(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 outline-none min-h-[44px] cursor-pointer"
                >
                  <option value="">-- Choose --</option>
                  {ACHIEVEMENTS.map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.title} - {a.desc}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleGuildReward}
              disabled={givingReward}
              className={`w-full py-3 font-bold rounded-lg transition-colors disabled:opacity-50 min-h-[44px] ${
                rewardMode === 'deduct'
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
              }`}
            >
              {givingReward
                ? 'Processing...'
                : rewardMode === 'deduct'
                ? 'Deduct Penalty from Entire Guild'
                : 'Give Reward to Entire Guild'}
            </button>
          </div>
        </div>
      )}

      {/* Award Trophy to Guild Hall Modal */}
      {trophyGuild && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setTrophyGuild(null)}>
          <div className="bg-slate-800 border-2 border-purple-500 rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-purple-400" aria-hidden="true" /> Award Guild Hall Trophy
              </h3>
              <button onClick={() => setTrophyGuild(null)} className="text-slate-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {(() => {
              const guild = activeGuilds.find(g => g.id === trophyGuild) || GUILDS.find(g => g.id === trophyGuild);
              return (
                <div className={`p-3 rounded-xl ${guild?.color || 'bg-slate-700'} bg-opacity-30 mb-4 flex items-center gap-3`}>
                  <span className="text-3xl" aria-hidden="true">{guild?.emoji || '🛡️'}</span>
                  <div>
                    <p className="font-bold text-white">{guild?.name} Guild Hall</p>
                    <p className="text-xs text-slate-300">This trophy will be displayed in their Guild Hall</p>
                  </div>
                </div>
              );
            })()}

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Select Trophy</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {GUILD_TROPHIES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTrophy(t.id)}
                    className={`p-3 rounded-lg text-left transition-colors min-h-[44px] ${selectedTrophy === t.id ? 'bg-purple-600/30 border-2 border-purple-500' : 'bg-slate-700 border-2 border-transparent hover:border-slate-500'}`}
                  >
                    <span className="text-2xl" aria-hidden="true">{t.icon}</span>
                    <p className="font-bold text-white text-xs mt-1">{t.title}</p>
                    <p className="text-xs text-slate-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="trophy-message" className="block text-sm text-slate-400 mb-1">Trophy Message (optional)</label>
              <input
                id="trophy-message"
                type="text"
                value={trophyMessage}
                onChange={e => setTrophyMessage(e.target.value)}
                placeholder="e.g. Great teamwork this week!"
                maxLength={100}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 outline-none min-h-[44px]"
              />
            </div>

            <button
              onClick={handleAwardTrophy}
              disabled={awardingTrophy || !selectedTrophy}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {awardingTrophy ? 'Awarding...' : 'Award Trophy to Guild Hall'}
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Toast */}
      {rosterToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-yellow-400 text-yellow-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs animate-in slide-in-from-bottom-3 backdrop-blur-md"
        >
          <Check className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
          <span>{rosterToast}</span>
        </div>
      )}
    </div>
  );
}

// ============== REWARDS MANAGER (TEACHER) ==============
function RewardsManager({ classId }) {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', cost: '', directions: '' });

  useEffect(() => {
    loadData();
    const unsub = backend.subscribeToRedemptions(classId, (data) => {
      setRedemptions(data);
    });
    return () => unsub();
  }, [classId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await backend.getCustomRewards(classId);
      setRewards(items);
    } catch (e) {
      console.error("Failed to load rewards", e);
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.cost) return;
    try {
      if (editingReward) {
        await backend.updateCustomReward(classId, editingReward.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          cost: parseInt(form.cost),
          directions: form.directions.trim(),
        });
      } else {
        await backend.createCustomReward(classId, {
          name: form.name.trim(),
          description: form.description.trim(),
          cost: parseInt(form.cost),
          directions: form.directions.trim(),
        });
      }
      setForm({ name: '', description: '', cost: '', directions: '' });
      setShowCreateForm(false);
      setEditingReward(null);
      loadData();
    } catch (error) {
      alert('Error saving reward: ' + error.message);
    }
  };

  const handleDelete = async (rewardId) => {
    if (!window.confirm('Delete this reward item?')) return;
    try {
      await backend.deleteCustomReward(classId, rewardId);
      loadData();
    } catch (error) {
      alert('Error deleting reward: ' + error.message);
    }
  };

  const handleToggleActive = async (reward) => {
    try {
      await backend.updateCustomReward(classId, reward.id, { active: !reward.active });
      loadData();
    } catch (error) {
      alert('Error updating reward: ' + error.message);
    }
  };

  const handleFulfill = async (redemptionId) => {
    try {
      await backend.updateRedemption(classId, redemptionId, { status: 'fulfilled' });
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  const fulfilledRedemptions = redemptions.filter(r => r.status === 'fulfilled');

  if (loading) return <p className="text-slate-500 text-center py-8">Loading rewards...</p>;

  return (
    <div className="space-y-6">
      {/* Pending Redemptions Alert */}
      {pendingRedemptions.length > 0 && (
        <div className="bg-green-900/30 border-2 border-green-500/50 rounded-xl p-4">
          <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5" aria-hidden="true" /> Pending Redemptions ({pendingRedemptions.length})
          </h3>
          <p className="text-sm text-slate-400 mb-4">Students have redeemed these rewards and are waiting for fulfillment.</p>
          <div className="space-y-3">
            {pendingRedemptions.map(r => (
              <div key={r.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 border-2 border-green-500 rounded-lg flex items-center justify-center text-xl">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">{r.studentName} redeemed <span className="text-green-400">{r.itemName}</span></p>
                  <p className="text-xs text-slate-400">Cost: {r.cost} coins</p>
                  {r.directions && <p className="text-xs text-yellow-400 mt-1">Directions: {r.directions}</p>}
                  <p className="text-xs text-slate-500 mt-1">
                    {r.redeemedAt?.toDate ? new Date(r.redeemedAt.toDate()).toLocaleString() : r.redeemedAt ? new Date(r.redeemedAt).toLocaleString() : 'Just now'}
                  </p>
                </div>
                <button
                  onClick={() => handleFulfill(r.id)}
                  className="px-4 py-2 bg-green-500 text-slate-900 rounded-lg font-bold text-sm hover:bg-green-400"
                >
                  Mark Fulfilled
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manage Reward Items */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-green-400" aria-hidden="true" /> Custom Reward Items
          </h3>
          <button
            onClick={() => { setShowCreateForm(true); setEditingReward(null); setForm({ name: '', description: '', cost: '', directions: '' }); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-sm"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Add Reward
          </button>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Create real-world reward items that students can purchase with their coins. You'll be notified when a student redeems one.
        </p>

        {showCreateForm && (
          <form onSubmit={handleCreate} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 mb-4 space-y-3">
            <h4 className="font-bold text-white text-sm">{editingReward ? 'Edit Reward' : 'New Reward Item'}</h4>
            <div>
              <label htmlFor="reward-name" className="block text-xs text-slate-400 mb-1">Reward Name *</label>
              <input
                id="reward-name"
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Homework Pass, Extra Credit, Lunch with Teacher"
                maxLength={60}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-green-500 outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="reward-desc" className="block text-xs text-slate-400 mb-1">Description</label>
              <input
                id="reward-desc"
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description students will see"
                maxLength={120}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-green-500 outline-none"
              />
            </div>
            <div>
              <label htmlFor="reward-cost" className="block text-xs text-slate-400 mb-1">Coin Cost *</label>
              <input
                id="reward-cost"
                type="number"
                min="1"
                value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                placeholder="e.g. 200"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-green-500 outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="reward-directions" className="block text-xs text-slate-400 mb-1">Redemption Directions</label>
              <textarea
                id="reward-directions"
                value={form.directions}
                onChange={e => setForm(f => ({ ...f, directions: e.target.value }))}
                placeholder="Instructions for the student on how to redeem this reward (e.g. 'Show this to your teacher during class')"
                maxLength={300}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:border-green-500 outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowCreateForm(false); setEditingReward(null); }} className="flex-1 py-2 bg-slate-600 text-white rounded-lg font-bold text-sm">
                Cancel
              </button>
              <button type="submit" className="flex-1 py-2 bg-green-500 text-slate-900 rounded-lg font-bold text-sm">
                {editingReward ? 'Save Changes' : 'Create Reward'}
              </button>
            </div>
          </form>
        )}

        {rewards.length === 0 && !showCreateForm ? (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
            <Gift className="w-12 h-12 mx-auto mb-2 opacity-20" aria-hidden="true" />
            No custom rewards yet. Add one to let students spend coins on real-world items!
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map(reward => (
              <div key={reward.id} className={`rounded-xl p-4 border flex items-center gap-4 ${reward.active !== false ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-800/50 border-slate-700 opacity-60'}`}>
                <div className="flex-shrink-0 w-12 h-12 bg-green-500/20 border-2 border-green-500/50 rounded-lg flex items-center justify-center text-2xl">
                  🎁
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">{reward.name} {reward.active === false && <span className="text-xs text-red-400">(Inactive)</span>}</p>
                  {reward.description && <p className="text-xs text-slate-400">{reward.description}</p>}
                  {reward.directions && <p className="text-xs text-yellow-400/70 mt-0.5">Directions: {reward.directions}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-yellow-400 font-bold">{reward.cost} coins</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditingReward(reward);
                      setForm({ name: reward.name, description: reward.description || '', cost: String(reward.cost), directions: reward.directions || '' });
                      setShowCreateForm(true);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                    aria-label={`Edit ${reward.name}`}
                  >
                    <Edit className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(reward)}
                    className={`p-2 transition-colors ${reward.active !== false ? 'text-green-400 hover:text-red-400' : 'text-slate-500 hover:text-green-400'}`}
                    aria-label={reward.active !== false ? `Deactivate ${reward.name}` : `Activate ${reward.name}`}
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    aria-label={`Delete ${reward.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fulfilled History */}
      {fulfilledRedemptions.length > 0 && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" aria-hidden="true" /> Fulfilled Redemptions ({fulfilledRedemptions.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {fulfilledRedemptions.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg text-sm">
                <span className="text-green-400">✓</span>
                <span className="text-white font-bold">{r.studentName}</span>
                <span className="text-slate-400">redeemed</span>
                <span className="text-green-400">{r.itemName}</span>
                <span className="text-slate-500 ml-auto text-xs">
                  {r.updatedAt?.toDate ? new Date(r.updatedAt.toDate()).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ submission, onReview, onInspectStudent, classActivities, activeBoss, forceExpanded }) {
  const [feedback, setFeedback] = useState('');
  const feedbackId = `feedback-${submission.id}`;

  return (
    <article className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 hover:border-blue-500 transition-colors" aria-label={`Submission from ${submission.playerName}: ${submission.activityTitle}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-lg text-white">{submission.activityTitle}</h4>
            {submission.isBoss && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Boss Challenge
              </span>
            )}
            {submission.activityType && !submission.isBoss && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-700 text-slate-300">
                {submission.activityType}
              </span>
            )}
          </div>
          {onInspectStudent ? (
            <button
              type="button"
              onClick={() => onInspectStudent(submission)}
              className="text-blue-400 hover:text-blue-300 font-bold hover:underline flex items-center gap-1.5 text-left transition-colors mt-0.5"
              title={`Click to view all submissions from ${submission.playerName}`}
            >
              <span>{submission.playerName}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>
          ) : (
            <p className="text-blue-400 font-bold mt-0.5">{submission.playerName}</p>
          )}
        </div>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
          {new Date(submission.submittedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Activity Directions for Teacher Reference */}
      <ActivityDirectionsCard
        submission={submission}
        classActivities={classActivities}
        activeBoss={activeBoss}
        defaultExpanded={true}
        forceExpanded={forceExpanded}
      />

      <div className="bg-slate-900/50 p-4 rounded-lg mb-4 border border-slate-800">
        <p className="text-xs text-slate-400 uppercase font-bold mb-2 flex items-center gap-1.5">
          {submission.submissionType === 'text' && <><MessageSquare className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" /> Student Written Response:</>}
          {submission.submissionType === 'link' && <><ExternalLink className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" /> Student Submission Link:</>}
          {submission.submissionType === 'file' && <><FileText className="w-3.5 h-3.5 text-green-400" aria-hidden="true" /> Attached File:</>}
          {!['text', 'link', 'file'].includes(submission.submissionType) && <>Student Submitted Work:</>}
        </p>
        {submission.submissionType === 'link' ? (
          <a href={submission.submissionContent} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all block p-2 bg-slate-800 rounded">
            {submission.submissionContent}
          </a>
        ) : submission.submissionType === 'text' ? (
          <div className="p-3 bg-slate-800 rounded-lg text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
            {submission.submissionContent}
          </div>
        ) : (
          <div className="p-2 bg-slate-800 rounded">
            {submission.submissionContent ? (
               <div className="text-blue-400">
                 <FileViewer content={submission.submissionContent} fileName={submission.fileName} fileType={submission.fileType} />
               </div>
            ) : (
              <span className="text-slate-500 italic">No content?</span>
            )}
          </div>
        )}

        {submission.submissionNote && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Student Note:</p>
            <p className="text-slate-300 text-sm italic">"{submission.submissionNote}"</p>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label htmlFor={feedbackId} className="text-xs text-slate-400 font-bold uppercase mb-1 block">Feedback</label>
          <input
            id={feedbackId}
            type="text"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Nice work!"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => onReview(submission.id, 'rejected', feedback)}
          className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
        >
          Reject
        </button>
        <button
          onClick={() => onReview(submission.id, 'approved', feedback)}
          className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
        >
          Approve (+{submission.xp} XP)
        </button>
      </div>
    </article>
  );
}

function ReviewedSubmissions({ reviewed, onReview, onInspectStudent, classActivities, activeBoss }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'approved', 'rejected'
  const [changingStatus, setChangingStatus] = useState(null);
  const [newFeedback, setNewFeedback] = useState('');

  const filtered = filter === 'all' ? reviewed : reviewed.filter(s => s.status === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.reviewedAt || b.submittedAt) - new Date(a.reviewedAt || a.submittedAt));
  const displayed = showAll ? sorted : sorted.slice(0, 10);

  const handleChangeStatus = async (sub, newStatus) => {
    setChangingStatus(sub.id);
    await onReview(sub.id, newStatus, newFeedback || sub.teacherFeedback || '');
    setChangingStatus(null);
    setExpandedId(null);
    setNewFeedback('');
  };

  return (
    <>
      <div className="flex items-center justify-between border-t border-slate-700 pt-8 mb-4">
        <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Reviewed History ({filtered.length})
        </h3>
        <div className="flex gap-2" role="group" aria-label="Filter reviewed submissions">
          {[
            { key: 'all', label: 'All' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                filter === f.key
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {displayed.map(sub => (
          <div key={sub.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => { setExpandedId(expandedId === sub.id ? null : sub.id); setNewFeedback(''); }}
              className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-750 transition-colors"
              aria-expanded={expandedId === sub.id}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sub.status === 'approved' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="min-w-0">
                  {onInspectStudent ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectStudent(sub);
                      }}
                      className="font-bold text-white hover:text-green-400 hover:underline inline-flex items-center gap-1 truncate text-left transition-colors cursor-pointer"
                      title={`Click to view all submissions from ${sub.playerName}`}
                    >
                      <span className="truncate">{sub.playerName}</span>
                      <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
                    </span>
                  ) : (
                    <p className="font-bold text-white truncate">{sub.playerName}</p>
                  )}
                  <p className="text-sm text-slate-400 truncate">{sub.activityTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {sub.teacherFeedback && (
                  <span className="text-xs text-slate-500 hidden sm:inline max-w-[200px] truncate italic">"{sub.teacherFeedback}"</span>
                )}
                <span className="text-xs text-slate-500">{new Date(sub.reviewedAt || sub.submittedAt).toLocaleDateString()}</span>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${sub.status === 'approved' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {sub.status.toUpperCase()}
                </div>
                {expandedId === sub.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedId === sub.id && (
              <div className="px-4 pb-4 border-t border-slate-700">
                {/* Activity Directions for Teacher Reference */}
                <div className="mt-3">
                  <ActivityDirectionsCard
                    submission={sub}
                    classActivities={classActivities}
                    activeBoss={activeBoss}
                    defaultExpanded={false}
                  />
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg mt-3 border border-slate-800">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-2 flex items-center gap-1.5">
                    {sub.submissionType === 'text' && <><MessageSquare className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" /> Student Written Response:</>}
                    {sub.submissionType === 'link' && <><ExternalLink className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" /> Student Submission Link:</>}
                    {sub.submissionType === 'file' && <><FileText className="w-3.5 h-3.5 text-green-400" aria-hidden="true" /> Attached File:</>}
                    {!['text', 'link', 'file'].includes(sub.submissionType) && <>Student Submitted Work:</>}
                  </p>
                  {sub.submissionType === 'link' ? (
                    <a href={sub.submissionContent} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all block p-2 bg-slate-800 rounded">
                      {sub.submissionContent}
                    </a>
                  ) : sub.submissionType === 'text' ? (
                    <div className="p-3 bg-slate-800 rounded-lg text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {sub.submissionContent}
                    </div>
                  ) : (
                    <div className="p-2 bg-slate-800 rounded">
                      {sub.submissionContent ? (
                        <div className="text-blue-400">
                          <FileViewer content={sub.submissionContent} fileName={sub.fileName} fileType={sub.fileType} />
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No content</span>
                      )}
                    </div>
                  )}

                  {sub.submissionNote && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">Student Note:</p>
                      <p className="text-slate-300 text-sm italic">"{sub.submissionNote}"</p>
                    </div>
                  )}
                </div>

                {sub.teacherFeedback && (
                  <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Your Feedback:</p>
                    <p className="text-slate-300 text-sm">"{sub.teacherFeedback}"</p>
                  </div>
                )}

                <div className="mt-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                  <p className="text-xs text-slate-400 font-bold uppercase mb-2">Change Decision</p>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label htmlFor={`revised-feedback-${sub.id}`} className="sr-only">Updated feedback</label>
                      <input
                        id={`revised-feedback-${sub.id}`}
                        type="text"
                        value={newFeedback}
                        onChange={e => setNewFeedback(e.target.value)}
                        placeholder={sub.teacherFeedback || 'Update feedback (optional)'}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    {sub.status === 'approved' ? (
                      <button
                        onClick={() => handleChangeStatus(sub, 'rejected')}
                        disabled={changingStatus === sub.id}
                        className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                      >
                        {changingStatus === sub.id ? 'Updating...' : 'Change to Rejected'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleChangeStatus(sub, 'approved')}
                        disabled={changingStatus === sub.id}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                      >
                        {changingStatus === sub.id ? 'Updating...' : `Change to Approved (+${sub.xp} XP)`}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex gap-4 flex-wrap">
                    <span>Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                    {sub.reviewedAt && <span>Reviewed: {new Date(sub.reviewedAt).toLocaleString()}</span>}
                    <span>XP: {sub.xp}</span>
                    {sub.isBoss && <span className="text-orange-400 font-bold">Boss Challenge</span>}
                  </div>
                  {onInspectStudent && (
                    <button
                      type="button"
                      onClick={() => onInspectStudent(sub)}
                      className="text-green-400 hover:text-green-300 font-bold hover:underline flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View All {sub.playerName}'s Work</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {sorted.length > 10 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-sm font-bold transition-colors"
        >
          Show All ({sorted.length - 10} more)
        </button>
      )}
      {showAll && sorted.length > 10 && (
        <button
          onClick={() => setShowAll(false)}
          className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-sm font-bold transition-colors"
        >
          Show Less
        </button>
      )}
    </>
  );
}
