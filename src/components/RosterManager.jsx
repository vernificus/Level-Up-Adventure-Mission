import React, { useState, useEffect, useMemo } from 'react';
import { realBackend as backend } from '../services/realBackend';
import { UserPlus, Lock, Trash2, Save, Edit, X, Check, RotateCcw, Gift, Star, Zap, Trophy, Eye, EyeOff, Sparkles, User, ShieldCheck, FileText, Shield, Search, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { ACHIEVEMENTS, LEVELS, AVATAR_ITEMS, GUILDS } from '../data/gameData';
import { parseRosterLines } from '../utils/textUtils';
import Avatar3D, { AvatarColorSwatch } from './Avatar3D';
import StudentSubmissionsModal from './StudentSubmissionsModal';

export default function RosterManager({
  classId,
  className = '',
  onStudentAdded,
  submissions: propSubmissions = [],
  onReview,
  guilds = GUILDS
}) {
  const availableGuilds = guilds && guilds.length > 0 ? guilds : GUILDS;
  const [students, setStudents] = useState([]);
  const [rosterSort, setRosterSort] = useState('alpha-asc'); // 'alpha-asc' | 'alpha-desc' | 'xp-desc' | 'xp-asc'
  const [rosterSearch, setRosterSearch] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', password: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Submissions Portfolio State
  const [internalSubmissions, setInternalSubmissions] = useState(propSubmissions || []);
  const [inspectSubmissionsStudent, setInspectSubmissionsStudent] = useState(null);

  useEffect(() => {
    if (propSubmissions && propSubmissions.length > 0) {
      setInternalSubmissions(propSubmissions);
    } else if (classId) {
      backend.getSubmissions(classId).then(subs => {
        setInternalSubmissions(subs || []);
      }).catch(err => console.error("Error fetching roster submissions:", err));
    }
  }, [classId, propSubmissions]);

  // Student Avatar & Rewards Inspector State
  const [inspectStudent, setInspectStudent] = useState(null);
  const [inspectAvatar, setInspectAvatar] = useState({ color: 'default', hat: 'none', accessory: 'none', face: 'happy' });
  const [inspectCoins, setInspectCoins] = useState(100);
  const [inspectXp, setInspectXp] = useState(0);
  const [inspectGuildXp, setInspectGuildXp] = useState(0);
  const [inspectGuild, setInspectGuild] = useState('');
  const [inspectOwnedItems, setInspectOwnedItems] = useState([]);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [itemToGrant, setItemToGrant] = useState('');

  const handleAssignStudentGuild = async (studentId, guildId) => {
    try {
      await backend.assignStudentGuild(studentId, guildId || null);
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, guild: guildId || null } : s));
      if (onStudentAdded) onStudentAdded();
    } catch (err) {
      alert('Error updating student guild: ' + err.message);
    }
  };

  const handleOpenAvatarInspector = (student) => {
    const normAvatar = {
      color: student.avatar?.color || 'default',
      hat: student.avatar?.hat || 'none',
      accessory: student.avatar?.accessory || student.avatar?.accessorie || 'none',
      face: student.avatar?.face || 'happy'
    };
    setInspectStudent(student);
    setInspectAvatar(normAvatar);
    setInspectCoins(student.coins || 0);
    setInspectXp(student.xp || 0);
    setInspectGuildXp(student.guildXpContributed || 0);
    setInspectGuild(student.guild || '');
    setInspectOwnedItems(student.ownedItems || ['default', 'none', 'happy']);
    setItemToGrant('');
  };

  const handleSaveStudentAvatar = async () => {
    if (!inspectStudent) return;
    setSavingAvatar(true);
    try {
      await backend.updateStudent(inspectStudent.id, {
        avatar: inspectAvatar,
        guild: inspectGuild || null,
        xp: Math.max(0, parseInt(inspectXp) || 0),
        guildXpContributed: Math.max(0, parseInt(inspectGuildXp) || 0),
        coins: Math.max(0, parseInt(inspectCoins) || 0),
        ownedItems: inspectOwnedItems
      });
      alert(`Avatar & rewards updated for ${inspectStudent.name}!`);
      setInspectStudent(null);
      loadStudents();
      if (onStudentAdded) onStudentAdded();
    } catch (err) {
      alert('Error saving student avatar: ' + err.message);
    }
    setSavingAvatar(false);
  };

  const handleRemoveOwnedItem = (itemId) => {
    const defaultBasics = ['default', 'none', 'happy'];
    if (defaultBasics.includes(itemId)) {
      alert('Default basic items cannot be removed.');
      return;
    }
    setInspectOwnedItems(prev => prev.filter(id => id !== itemId));
    // If currently equipped, reset that slot to default
    setInspectAvatar(prev => {
      const next = { ...prev };
      if (next.color === itemId) next.color = 'default';
      if (next.hat === itemId) next.hat = 'none';
      if (next.accessory === itemId) next.accessory = 'none';
      if (next.face === itemId) next.face = 'happy';
      return next;
    });
  };

  const handleResetCosmetics = () => {
    if (!window.confirm(`Reset all cosmetic items for ${inspectStudent.name} back to starting defaults?`)) return;
    setInspectOwnedItems(['default', 'none', 'happy']);
    setInspectAvatar({ color: 'default', hat: 'none', accessory: 'none', face: 'happy' });
  };

  const handleResetExploitXp = () => {
    if (!window.confirm(`Reset XP and Guild Contributed XP for ${inspectStudent.name} back to 0?\n\nThis removes the high-five exploit XP while keeping completed activity records.`)) return;
    setInspectXp(0);
    setInspectGuildXp(0);
  };

  const handleGrantItem = () => {
    if (!itemToGrant) return;
    if (!inspectOwnedItems.includes(itemToGrant)) {
      setInspectOwnedItems(prev => [...prev, itemToGrant]);
    }
    // Auto-equip if applicable
    for (const [catKey, catList] of Object.entries(AVATAR_ITEMS)) {
      if (catList.some(item => item.id === itemToGrant)) {
        const slot = catKey === 'colors' ? 'color' : catKey === 'hats' ? 'hat' : catKey === 'accessories' ? 'accessory' : 'face';
        setInspectAvatar(prev => ({ ...prev, [slot]: itemToGrant }));
        break;
      }
    }
    setItemToGrant('');
  };

  useEffect(() => {
    loadStudents();
  }, [classId]);

  const loadStudents = async () => {
    setLoading(true);
    const data = await backend.getStudents(classId);
    setStudents(data);
    setLoading(false);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentPassword.trim()) return;

    setAdding(true);
    try {
      await backend.createStudent(classId, newStudentName.trim(), newStudentPassword.trim());
      setNewStudentName('');
      setNewStudentPassword('');
      await loadStudents();
      if (onStudentAdded) onStudentAdded();
    } catch (error) {
      alert('Error adding student: ' + error.message);
    }
    setAdding(false);
  };

  const handleEdit = (student) => {
    setEditingId(student.id);
    setEditForm({ name: student.name, password: student.password || '' });
  };

  const handleSaveEdit = async () => {
    try {
      await backend.updateStudent(editingId, editForm);
      setEditingId(null);
      loadStudents();
    } catch (error) {
      alert('Error updating student: ' + error.message);
    }
  };

  const handleResetActivities = async (student) => {
    if (!window.confirm(`Reset activity completion for ${student.name}?\n\nThis lets them redo activities and earn XP again. XP, coins, and achievements are kept.`)) return;
    try {
      await backend.resetStudentActivities(student.id);
      alert(`Activities reset for ${student.name}.`);
      loadStudents();
    } catch (error) {
      alert('Error resetting activities: ' + error.message);
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure? This deletes all progress for this student.')) return;
    try {
      await backend.deleteStudent(studentId, classId);
      loadStudents();
      if (onStudentAdded) onStudentAdded(); // Updates count
    } catch (error) {
      alert('Error deleting student: ' + error.message);
    }
  };

  // Reward giving / penalty adjustment
  const [rewardTarget, setRewardTarget] = useState(null); // student object
  const [rewardMode, setRewardMode] = useState('grant'); // 'grant' | 'deduct'
  const [rewardType, setRewardType] = useState('xp'); // 'xp', 'coins', 'achievement'
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardAchievement, setRewardAchievement] = useState('');
  const [deductGuildXp, setDeductGuildXp] = useState(true);
  const [givingReward, setGivingReward] = useState(false);

  const handleGiveReward = async () => {
    if (!rewardTarget) return;
    setGivingReward(true);
    try {
      if (rewardMode === 'grant') {
        if (rewardType === 'xp') {
          const amount = parseInt(rewardAmount) || 0;
          if (amount <= 0) { alert('Enter a positive XP amount'); setGivingReward(false); return; }
          await backend.updateStudent(rewardTarget.id, { xp: (rewardTarget.xp || 0) + amount });
        } else if (rewardType === 'coins') {
          const amount = parseInt(rewardAmount) || 0;
          if (amount <= 0) { alert('Enter a positive coin amount'); setGivingReward(false); return; }
          await backend.updateStudent(rewardTarget.id, { coins: (rewardTarget.coins || 0) + amount });
        } else if (rewardType === 'achievement') {
          if (!rewardAchievement) { alert('Select an achievement'); setGivingReward(false); return; }
          const current = rewardTarget.unlockedAchievements || [];
          if (current.includes(rewardAchievement)) { alert('Student already has this achievement'); setGivingReward(false); return; }
          await backend.updateStudent(rewardTarget.id, { unlockedAchievements: [...current, rewardAchievement] });
        }
        alert(`Reward given to ${rewardTarget.name}!`);
      } else {
        // DEDUCT / REMOVE EXPLOIT XP & REWARDS
        if (rewardType === 'xp') {
          const amount = parseInt(rewardAmount) || 0;
          if (amount <= 0) { alert('Enter a positive XP amount to deduct'); setGivingReward(false); return; }
          const newXp = Math.max(0, (rewardTarget.xp || 0) - amount);
          const updates = { xp: newXp };
          if (deductGuildXp) {
            updates.guildXpContributed = Math.max(0, (rewardTarget.guildXpContributed || 0) - amount);
          }
          await backend.updateStudent(rewardTarget.id, updates);
          alert(`Deducted ${amount} XP from ${rewardTarget.name}${deductGuildXp ? ' and their guild contribution' : ''}! New XP: ${newXp}`);
        } else if (rewardType === 'coins') {
          const amount = parseInt(rewardAmount) || 0;
          if (amount <= 0) { alert('Enter a positive coin amount to deduct'); setGivingReward(false); return; }
          const newCoins = Math.max(0, (rewardTarget.coins || 0) - amount);
          await backend.updateStudent(rewardTarget.id, { coins: newCoins });
          alert(`Deducted ${amount} coins from ${rewardTarget.name}! New balance: ${newCoins}`);
        } else if (rewardType === 'achievement') {
          if (!rewardAchievement) { alert('Select an achievement to revoke'); setGivingReward(false); return; }
          const current = rewardTarget.unlockedAchievements || [];
          await backend.updateStudent(rewardTarget.id, {
            unlockedAchievements: current.filter(a => a !== rewardAchievement)
          });
          alert(`Revoked achievement from ${rewardTarget.name}!`);
        }
      }
      setRewardTarget(null);
      setRewardAmount('');
      setRewardAchievement('');
      loadStudents();
    } catch (error) {
      alert('Error updating student: ' + error.message);
    }
    setGivingReward(false);
  };

  const [syncingRoster, setSyncingRoster] = useState(false);

  // Identify any students whose approved submissions exceed their current recorded XP
  const studentsWithMissingXp = useMemo(() => {
    return students.filter(student => {
      const stSubs = internalSubmissions.filter(s =>
        s.studentId === student.id ||
        (student.name && s.playerName && s.playerName.trim().toLowerCase() === student.name.trim().toLowerCase())
      );
      const approvedSubs = stSubs.filter(s => s.status === 'approved');
      const approvedXpTotal = approvedSubs.reduce((sum, s) => sum + (Number(s.xp) || (s.isBoss ? 300 : 100)), 0);
      return (student.xp || 0) < approvedXpTotal;
    });
  }, [students, internalSubmissions]);

  // Bulk reconcile all students in this class
  const handleReconcileAllSubmissions = async () => {
    if (!classId) return;
    setSyncingRoster(true);
    try {
      const result = await backend.reconcileClassSubmissions(classId);
      await loadStudents();
      const updatedSubs = await backend.getSubmissions(classId);
      setInternalSubmissions(updatedSubs || []);
      if (result.updatedCount > 0) {
        const studentNames = result.details.map(d => `${d.name} (${d.oldXp} → ${d.newXp} XP)`).join(', ');
        alert(`✅ Tally Complete!\n\nSuccessfully updated and tallied XP for ${result.updatedCount} student(s):\n${studentNames}`);
      } else {
        alert('✅ All student XP balances are already fully tallied and up to date with their approved submissions!');
      }
    } catch (err) {
      alert('Error tallying submissions XP: ' + err.message);
    } finally {
      setSyncingRoster(false);
    }
  };

  // Single-student tally action
  const handleSyncSingleStudent = async (studentId) => {
    try {
      const res = await backend.syncStudentSubmissions(studentId);
      await loadStudents();
      const updatedSubs = await backend.getSubmissions(classId);
      setInternalSubmissions(updatedSubs || []);
      alert(`✅ Successfully tallied submissions! New XP: ${res.newXp} XP.`);
    } catch (err) {
      alert('Error tallying student XP: ' + err.message);
    }
  };

  // Bulk upload (simple text area parsing)
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const handleBulkUpload = async () => {
    const studentsToCreate = parseRosterLines(bulkText);
    setAdding(true);
    let count = 0;
    let errors = [];

    for (const { name, pass } of studentsToCreate) {
      try {
        await backend.createStudent(classId, name, pass);
        count++;
      } catch (e) {
        errors.push(`${name}: ${e.message}`);
      }
    }

    alert(`Added ${count} students.` + (errors.length ? `\nErrors:\n${errors.join('\n')}` : ''));
    setBulkText('');
    setShowBulk(false);
    await loadStudents();
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-green-400" /> Add Student
        </h3>

        <form onSubmit={handleAddStudent} className="flex flex-col md:flex-row gap-4 mb-4" aria-label="Add new student">
          <div className="flex-1">
            <label htmlFor="new-student-name" className="sr-only">Student Name</label>
            <input
              id="new-student-name"
              type="text"
              placeholder="Student Name"
              value={newStudentName}
              onChange={e => setNewStudentName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg text-white border border-slate-600 focus:border-green-500 outline-none"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" aria-hidden="true" />
            <label htmlFor="new-student-password" className="sr-only">Set Password/PIN</label>
            <input
              id="new-student-password"
              type="password"
              placeholder="Set Password/PIN"
              value={newStudentPassword}
              onChange={e => setNewStudentPassword(e.target.value)}
              className="px-4 py-2 pl-10 bg-slate-700 rounded-lg text-white border border-slate-600 focus:border-green-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>

        <button
          onClick={() => setShowBulk(!showBulk)}
          className="text-sm text-blue-400 hover:underline mb-4"
          aria-expanded={showBulk}
        >
          {showBulk ? 'Hide Bulk Upload' : 'Bulk Upload (CSV)'}
        </button>

        {showBulk && (
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 mb-4">
            <label htmlFor="bulk-upload" className="text-xs text-slate-400 mb-2 block">Enter names and passwords, one per line (e.g., "Alice, 1234" or "Alice" defaulting PIN to 1234)</label>
            <textarea
              id="bulk-upload"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              className="w-full h-32 bg-slate-800 text-white p-2 rounded border border-slate-600 text-sm font-mono"
              placeholder="Alice, 1234&#10;Bob&#10;Charlie, 5678"
            />
            <button
              onClick={handleBulkUpload}
              disabled={adding}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold"
            >
              Process Bulk Upload
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        {(() => {
          const sortedStudents = [...students]
            .filter(s => !rosterSearch.trim() || s.name.toLowerCase().includes(rosterSearch.trim().toLowerCase()))
            .sort((a, b) => {
              if (rosterSort === 'alpha-asc') {
                return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
              }
              if (rosterSort === 'alpha-desc') {
                return (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' });
              }
              if (rosterSort === 'xp-desc') {
                return (b.xp || 0) - (a.xp || 0);
              }
              if (rosterSort === 'xp-asc') {
                return (a.xp || 0) - (b.xp || 0);
              }
              return 0;
            });

          return (
            <>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    Class Roster
                    <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {students.length} Students
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Manage student accounts, avatar rewards, and guild placements.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Search */}
                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={rosterSearch}
                      onChange={e => setRosterSearch(e.target.value)}
                      className="w-full pl-9 pr-7 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 outline-none focus:border-purple-500 min-h-[38px]"
                    />
                    {rosterSearch && (
                      <button onClick={() => setRosterSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1 shrink-0">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" /> Sort:
                    </span>
                    <select
                      value={rosterSort}
                      onChange={e => setRosterSort(e.target.value)}
                      className="bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 focus:border-purple-400 outline-none cursor-pointer min-h-[34px]"
                      aria-label="Sort student roster"
                    >
                      <option value="alpha-asc">Name: A → Z (Alphabetical)</option>
                      <option value="alpha-desc">Name: Z → A</option>
                      <option value="xp-desc">XP: Highest → Lowest</option>
                      <option value="xp-asc">XP: Lowest → Highest</option>
                    </select>
                  </div>

                  {/* Tally / Reconcile All Submissions XP Button */}
                  <button
                    type="button"
                    onClick={handleReconcileAllSubmissions}
                    disabled={syncingRoster}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[34px] shadow-sm cursor-pointer ${
                      studentsWithMissingXp.length > 0
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black animate-pulse'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'
                    }`}
                    title={
                      studentsWithMissingXp.length > 0
                        ? `${studentsWithMissingXp.length} student(s) have approved submissions with untallied XP! Click to auto-tally.`
                        : 'Verify and sync all student XP balances with approved choice board submissions'
                    }
                  >
                    <Zap className={`w-3.5 h-3.5 ${studentsWithMissingXp.length > 0 ? 'text-slate-950 fill-slate-950' : 'text-yellow-400'}`} />
                    <span>
                      {syncingRoster ? 'Tallying XP...' : (
                        studentsWithMissingXp.length > 0
                          ? `Tally Submissions XP (${studentsWithMissingXp.length} Unsynced)`
                          : 'Tally Submissions XP'
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {loading ? (
                <p className="text-slate-500" role="status" aria-live="polite">Loading roster...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedStudents.map(student => (
              <div key={student.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600 relative group">
                {editingId === student.id ? (
                   <div className="space-y-2">
                     <label htmlFor={`edit-name-${student.id}`} className="sr-only">Student name</label>
                     <input
                       id={`edit-name-${student.id}`}
                       className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white"
                       value={editForm.name}
                       onChange={e => setEditForm({...editForm, name: e.target.value})}
                     />
                     <label htmlFor={`edit-pass-${student.id}`} className="sr-only">Student password</label>
                     <input
                       id={`edit-pass-${student.id}`}
                       className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white"
                       value={editForm.password}
                       onChange={e => setEditForm({...editForm, password: e.target.value})}
                     />
                     <div className="flex gap-2">
                       <button onClick={handleSaveEdit} className="bg-green-600 px-3 py-1 rounded text-white text-xs font-bold">Save</button>
                       <button onClick={() => setEditingId(null)} className="bg-slate-600 px-3 py-1 rounded text-white text-xs font-bold">Cancel</button>
                     </div>
                   </div>
                ) : (
                  <>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setInspectSubmissionsStudent(student)} className="p-1 text-slate-400 hover:text-green-400" aria-label={`View submissions from ${student.name}`} title="View student submissions"><FileText className="w-4 h-4" aria-hidden="true" /></button>
                      <button onClick={() => { setRewardTarget(student); setRewardType('xp'); setRewardAmount(''); setRewardAchievement(''); }} className="p-1 text-slate-400 hover:text-yellow-400" aria-label={`Give reward to ${student.name}`}><Gift className="w-4 h-4" aria-hidden="true" /></button>
                      <button onClick={() => handleResetActivities(student)} className="p-1 text-slate-400 hover:text-orange-400" aria-label={`Reset activities for ${student.name}`}><RotateCcw className="w-4 h-4" aria-hidden="true" /></button>
                      <button onClick={() => handleEdit(student)} className="p-1 text-slate-400 hover:text-white" aria-label={`Edit ${student.name}`}><Edit className="w-4 h-4" aria-hidden="true" /></button>
                      <button onClick={() => handleDelete(student.id)} className="p-1 text-slate-400 hover:text-red-400" aria-label={`Delete ${student.name}`}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                    </div>

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const studentLevel = LEVELS.reduce((acc, l) => (student.xp || 0) >= l.xpRequired ? l : acc, LEVELS[0]);
                          return (
                            <button
                              type="button"
                              onClick={() => handleOpenAvatarInspector(student)}
                              className="rounded-xl overflow-hidden hover:ring-2 hover:ring-yellow-400 transition-all cursor-pointer flex-shrink-0 bg-slate-900 p-0.5"
                              title={`View & customize ${student.name}'s avatar & rewards`}
                            >
                              <Avatar3D avatar={student.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' }} level={studentLevel.level} size="sm" />
                            </button>
                          );
                        })()}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-white text-lg leading-tight">{student.name}</p>
                            <button
                              type="button"
                              onClick={() => handleOpenAvatarInspector(student)}
                              className="text-[11px] bg-slate-700 hover:bg-yellow-500/20 text-yellow-400 font-semibold px-2 py-0.5 rounded border border-slate-600 hover:border-yellow-500 transition-colors flex items-center gap-1"
                              title="Inspect Avatar & Rewards"
                            >
                              <Sparkles className="w-3 h-3" /> Avatar & Rewards
                            </button>
                            {(() => {
                              const stSubs = internalSubmissions.filter(s =>
                                s.studentId === student.id ||
                                (student.name && s.playerName && s.playerName.trim().toLowerCase() === student.name.trim().toLowerCase())
                              );
                              const pendingCount = stSubs.filter(s => s.status === 'pending').length;
                              return (
                                <button
                                  type="button"
                                  onClick={() => setInspectSubmissionsStudent(student)}
                                  className="text-[11px] bg-slate-700 hover:bg-green-500/20 text-green-400 font-semibold px-2 py-0.5 rounded border border-slate-600 hover:border-green-500 transition-colors flex items-center gap-1"
                                  title={`View all work and assignments submitted by ${student.name}`}
                                >
                                  <FileText className="w-3 h-3 text-green-400" /> Submissions
                                  {stSubs.length > 0 && (
                                    <span className="px-1 bg-green-500/20 text-green-300 rounded font-bold text-[10px]">
                                      {stSubs.length}
                                    </span>
                                  )}
                                  {pendingCount > 0 && (
                                    <span className="px-1 bg-amber-500 text-slate-950 font-black rounded text-[10px] animate-pulse">
                                      {pendingCount}
                                    </span>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1">
                            Pass: <span className="text-yellow-400">{visiblePasswords[student.id] ? (student.password || 'N/A') : '••••••'}</span>
                            <button
                              onClick={() => setVisiblePasswords(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                              className="text-slate-500 hover:text-slate-300 ml-1"
                              aria-label={visiblePasswords[student.id] ? `Hide password for ${student.name}` : `Show password for ${student.name}`}
                            >
                              {visiblePasswords[student.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm border-t border-slate-600 pt-3">
                       <div>
                         <span className="text-slate-400 text-xs uppercase font-bold block">XP</span>
                         <p className="font-mono text-green-400 font-bold">{student.xp || 0}</p>
                       </div>
                       <div>
                         <span className="text-slate-400 text-xs uppercase font-bold block">Coins</span>
                         <p className="font-mono text-yellow-400 font-bold">{student.coins || 0}</p>
                       </div>
                       <div>
                         <span className="text-slate-400 text-xs uppercase font-bold block">Level</span>
                         <p className="font-mono text-blue-400 font-bold">{Math.floor((student.xp || 0)/500)+1}</p>
                       </div>
                       <button
                         type="button"
                         onClick={() => setInspectSubmissionsStudent(student)}
                         className="text-left group/done hover:opacity-80 transition-opacity"
                         title="Click to view student's completed submissions"
                       >
                         <span className="text-slate-400 text-xs uppercase font-bold block group-hover/done:text-green-400">Done</span>
                         <p className="font-mono text-purple-400 group-hover/done:text-green-300 font-bold">{(student.completedActivities || []).length}</p>
                       </button>
                    </div>

                    {/* Unsynced Submissions XP Alert & 1-Click Sync */}
                    {(() => {
                      const stApprovedSubs = internalSubmissions.filter(s =>
                        (s.studentId === student.id || (student.name && s.playerName && s.playerName.trim().toLowerCase() === student.name.trim().toLowerCase())) &&
                        s.status === 'approved'
                      );
                      const stApprovedXp = stApprovedSubs.reduce((sum, s) => sum + (Number(s.xp) || (s.isBoss ? 300 : 100)), 0);
                      if (stApprovedXp > (student.xp || 0)) {
                        return (
                          <button
                            type="button"
                            onClick={() => handleSyncSingleStudent(student.id)}
                            className="mt-2.5 w-full py-1.5 px-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold flex items-center justify-between transition-colors group/sync cursor-pointer"
                            title={`Approved submissions tally to ${stApprovedXp} XP, but ${student.name} currently only has ${student.xp || 0} XP. Click to tally!`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400 group-hover/sync:animate-bounce" />
                              <span>Submissions total <strong>{stApprovedXp} XP</strong></span>
                            </span>
                            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black">
                              Sync (+{stApprovedXp - (student.xp || 0)} XP)
                            </span>
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {/* Guild Alliance Selection */}
                    <div className="mt-3 pt-3 border-t border-slate-600/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Guild:</span>
                      </div>
                      <select
                        value={student.guild || ''}
                        onChange={(e) => handleAssignStudentGuild(student.id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors flex-1 min-w-0 min-h-[36px] ${
                          student.guild
                            ? 'bg-slate-800 text-white border-purple-500/50 hover:border-purple-400'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:border-amber-400'
                        }`}
                        title={`Assign guild for ${student.name}`}
                        aria-label={`Assign guild for ${student.name}`}
                      >
                        <option value="">⚡ No Guild (Unassigned)</option>
                        {availableGuilds.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.emoji || '🛡️'} {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            ))}
            {sortedStudents.length === 0 && (
              <p className="text-slate-500 italic col-span-full py-6 text-center">
                {rosterSearch ? `No students match "${rosterSearch}".` : 'No students in this class yet.'}
              </p>
            )}
          </div>
        )}
      </>
    );
  })()}
</div>

      {/* Reward Modal */}
      {rewardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setRewardTarget(null)}>
          <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Gift className={`w-6 h-6 ${rewardMode === 'grant' ? 'text-yellow-400' : 'text-red-400'}`} aria-hidden="true" />
                {rewardMode === 'grant' ? 'Give Reward' : 'Deduct / Remove Exploit XP'}
              </h3>
              <button onClick={() => setRewardTarget(null)} className="text-slate-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-slate-400 mb-3 text-xs">
              Student: <span className="font-bold text-white text-sm">{rewardTarget.name}</span>
              {' • '}Current: <span className="text-green-400 font-bold">{rewardTarget.xp || 0} XP</span>
              {' • '}<span className="text-yellow-400 font-bold">{rewardTarget.coins || 0} Coins</span>
            </p>

            {/* Mode Toggle: Grant vs Deduct */}
            <div className="flex bg-slate-900 p-1 rounded-xl mb-4 border border-slate-700">
              <button
                type="button"
                onClick={() => setRewardMode('grant')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                  rewardMode === 'grant' ? 'bg-green-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                + Grant Reward
              </button>
              <button
                type="button"
                onClick={() => setRewardMode('deduct')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                  rewardMode === 'deduct' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                - Deduct / Remove Exploit XP
              </button>
            </div>

            <div className="flex gap-2 mb-4" role="group" aria-label="Reward type">
              <button
                onClick={() => setRewardType('xp')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${
                  rewardType === 'xp'
                    ? (rewardMode === 'grant' ? 'bg-green-600 text-white' : 'bg-red-600 text-white')
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Zap className="w-4 h-4" aria-hidden="true" /> XP
              </button>
              <button
                onClick={() => setRewardType('coins')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${
                  rewardType === 'coins'
                    ? (rewardMode === 'grant' ? 'bg-yellow-600 text-white' : 'bg-amber-600 text-white')
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Star className="w-4 h-4" aria-hidden="true" /> Coins
              </button>
              <button
                onClick={() => setRewardType('achievement')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${
                  rewardType === 'achievement'
                    ? (rewardMode === 'grant' ? 'bg-purple-600 text-white' : 'bg-rose-600 text-white')
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                <Trophy className="w-4 h-4" aria-hidden="true" /> Badge
              </button>
            </div>

            {(rewardType === 'xp' || rewardType === 'coins') && (
              <div className="mb-4">
                <label htmlFor="reward-amount" className="block text-xs font-bold text-slate-300 mb-1">
                  Amount of {rewardType === 'xp' ? 'XP' : 'Coins'} to {rewardMode === 'grant' ? 'give' : 'deduct / remove'}
                </label>
                <input
                  id="reward-amount"
                  type="number"
                  min="1"
                  value={rewardAmount}
                  onChange={e => setRewardAmount(e.target.value)}
                  placeholder={rewardMode === 'grant' ? 'e.g. 100' : 'e.g. 11000'}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white font-bold focus:border-yellow-500 outline-none"
                />

                {rewardMode === 'deduct' && rewardType === 'xp' && (
                  <label className="flex items-center gap-2 mt-2.5 text-xs text-slate-300 cursor-pointer bg-slate-900/60 p-2 rounded-lg border border-slate-700">
                    <input
                      type="checkbox"
                      checked={deductGuildXp}
                      onChange={e => setDeductGuildXp(e.target.checked)}
                      className="w-4 h-4 rounded text-red-500 bg-slate-800 border-slate-600"
                    />
                    <span>Also deduct from Guild Contributed XP (fixes guild exploit total)</span>
                  </label>
                )}
              </div>
            )}

            {rewardType === 'achievement' && (
              <div className="mb-4">
                <label htmlFor="reward-achievement" className="block text-xs font-bold text-slate-300 mb-1">
                  Select Badge to {rewardMode === 'grant' ? 'unlock' : 'revoke / remove'}
                </label>
                <select
                  id="reward-achievement"
                  value={rewardAchievement}
                  onChange={e => setRewardAchievement(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 outline-none text-xs"
                >
                  <option value="">-- Choose Badge --</option>
                  {rewardMode === 'grant'
                    ? ACHIEVEMENTS.filter(a => !(rewardTarget.unlockedAchievements || []).includes(a.id)).map(a => (
                        <option key={a.id} value={a.id}>{a.icon} {a.title} - {a.desc}</option>
                      ))
                    : ACHIEVEMENTS.filter(a => (rewardTarget.unlockedAchievements || []).includes(a.id)).map(a => (
                        <option key={a.id} value={a.id}>{a.icon} {a.title} (Currently Unlocked)</option>
                      ))
                  }
                </select>
                {rewardMode === 'deduct' && (rewardTarget.unlockedAchievements || []).length === 0 && (
                  <p className="text-xs text-slate-400 mt-2">This student has no badges to remove.</p>
                )}
              </div>
            )}

            <button
              onClick={handleGiveReward}
              disabled={givingReward}
              className={`w-full py-3 font-black rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 shadow ${
                rewardMode === 'grant'
                  ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-950'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {givingReward
                ? (rewardMode === 'grant' ? 'Giving...' : 'Deducting...')
                : (rewardMode === 'grant' ? 'Give Reward' : 'Confirm Deduction / Remove Exploit XP')}
            </button>
          </div>
        </div>
      )}

      {/* Avatar & Rewards Inspector Modal (Teacher) */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setInspectStudent(null)}>
          <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{inspectStudent.name}'s Avatar & Rewards</h3>
                  <p className="text-xs text-slate-400">View and adjust student cosmetic gear, owned items, and coin rewards.</p>
                </div>
              </div>
              <button onClick={() => setInspectStudent(null)} className="text-slate-400 hover:text-white p-1" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Avatar Preview & Stats */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 rounded-2xl border border-slate-700">
                <Avatar3D
                  avatar={inspectAvatar}
                  level={LEVELS.reduce((acc, l) => (inspectStudent.xp || 0) >= l.xpRequired ? l : acc, LEVELS[0]).level}
                  size="lg"
                  animate={true}
                />
                <div className="w-full mt-4 space-y-3">
                  <div className="flex justify-between items-center bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-xs">
                    <label htmlFor="inspect-xp-input" className="text-slate-400 font-bold uppercase">Total XP:</label>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-green-400" />
                      <input
                        id="inspect-xp-input"
                        type="number"
                        min="0"
                        value={inspectXp}
                        onChange={e => setInspectXp(e.target.value)}
                        className="w-24 px-2 py-0.5 bg-slate-700 text-green-400 font-black rounded border border-slate-600 text-right outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-xs">
                    <label htmlFor="inspect-guild-xp-input" className="text-slate-400 font-bold uppercase">Guild Contributed XP:</label>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-yellow-400" />
                      <input
                        id="inspect-guild-xp-input"
                        type="number"
                        min="0"
                        value={inspectGuildXp}
                        onChange={e => setInspectGuildXp(e.target.value)}
                        className="w-24 px-2 py-0.5 bg-slate-700 text-yellow-400 font-black rounded border border-slate-600 text-right outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-xs">
                    <label htmlFor="inspect-coins-input" className="text-slate-400 font-bold uppercase">Coin Balance:</label>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <input
                        id="inspect-coins-input"
                        type="number"
                        min="0"
                        value={inspectCoins}
                        onChange={e => setInspectCoins(e.target.value)}
                        className="w-20 px-2 py-0.5 bg-slate-700 text-yellow-400 font-black rounded border border-slate-600 text-right outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Exploit Reset Button */}
                  <button
                    type="button"
                    onClick={handleResetExploitXp}
                    className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 transition-colors flex items-center justify-center gap-1.5"
                    title="Sets XP and Guild Contributed XP to 0"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Reset High-Five Exploit XP to 0
                  </button>

                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 font-bold uppercase">Owned Items ({inspectOwnedItems.length}):</span>
                      {inspectOwnedItems.some(id => !['default', 'none', 'happy'].includes(id)) && (
                        <button
                          type="button"
                          onClick={handleResetCosmetics}
                          className="text-[10px] text-red-400 hover:text-red-300 hover:underline"
                        >
                          Clear Cosmetics
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {inspectOwnedItems.map(itemId => {
                        const isDefault = ['default', 'none', 'happy'].includes(itemId);
                        return (
                          <span
                            key={itemId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded-md text-[10px] text-slate-300 font-mono"
                          >
                            {itemId}
                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOwnedItem(itemId)}
                                className="text-slate-400 hover:text-red-400 ml-0.5"
                                title={`Remove ${itemId}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Equipment Slots & Grant Tool */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" /> Guild Alliance
                  </label>
                  <select
                    value={inspectGuild}
                    onChange={e => setInspectGuild(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="">⚡ No Guild (Unassigned)</option>
                    {availableGuilds.map(g => (
                      <option key={g.id} value={g.id}>{g.emoji || '🛡️'} {g.name}</option>
                    ))}
                  </select>
                </div>

                <h4 className="text-xs font-black uppercase tracking-wider text-yellow-400 pt-1">Equipped Gear</h4>
                {/* Skin Color */}
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Skin Tone</label>
                  <select
                    value={inspectAvatar.color}
                    onChange={e => setInspectAvatar(prev => ({ ...prev, color: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white text-xs font-bold outline-none"
                  >
                    {AVATAR_ITEMS.colors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Headgear / Hat */}
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Headgear / Hat</label>
                  <select
                    value={inspectAvatar.hat}
                    onChange={e => setInspectAvatar(prev => ({ ...prev, hat: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white text-xs font-bold outline-none"
                  >
                    {AVATAR_ITEMS.hats.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                {/* Effect / Accessory */}
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Effect / Accessory</label>
                  <select
                    value={inspectAvatar.accessory}
                    onChange={e => setInspectAvatar(prev => ({ ...prev, accessory: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white text-xs font-bold outline-none"
                  >
                    {AVATAR_ITEMS.accessories.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Expression / Face */}
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Face Expression</label>
                  <select
                    value={inspectAvatar.face}
                    onChange={e => setInspectAvatar(prev => ({ ...prev, face: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white text-xs font-bold outline-none"
                  >
                    {AVATAR_ITEMS.faces.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Grant Item Tool */}
                <div className="pt-2 border-t border-slate-700">
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Grant Free Cosmetic to Student</label>
                  <div className="flex gap-2">
                    <select
                      value={itemToGrant}
                      onChange={e => setItemToGrant(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white text-xs outline-none"
                    >
                      <option value="">-- Choose item to unlock --</option>
                      <optgroup label="Skins">
                        {AVATAR_ITEMS.colors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </optgroup>
                      <optgroup label="Hats">
                        {AVATAR_ITEMS.hats.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </optgroup>
                      <optgroup label="Effects & Accessories">
                        {AVATAR_ITEMS.accessories.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </optgroup>
                      <optgroup label="Expressions">
                        {AVATAR_ITEMS.faces.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </optgroup>
                    </select>
                    <button
                      type="button"
                      onClick={handleGrantItem}
                      disabled={!itemToGrant}
                      className="px-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold rounded-xl disabled:opacity-40 transition-colors"
                    >
                      Grant
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-slate-700 mt-6">
              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStudentAvatar}
                disabled={savingAvatar}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-slate-950 rounded-xl font-black text-sm shadow transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {savingAvatar ? 'Saving...' : 'Save Avatar & Rewards'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Submissions Portfolio Modal */}
      {inspectSubmissionsStudent && (
        <StudentSubmissionsModal
          student={inspectSubmissionsStudent}
          classId={classId}
          className={className}
          submissions={internalSubmissions}
          onReview={async (subId, status, feedback) => {
            if (onReview) {
              await onReview(subId, status, feedback);
            } else {
              await backend.reviewSubmission(subId, status, feedback);
            }
            if (classId) {
              const [subs, stList] = await Promise.all([
                backend.getSubmissions(classId),
                backend.getStudents(classId)
              ]);
              setInternalSubmissions(subs || []);
              setStudents(stList || []);
              if (inspectSubmissionsStudent) {
                const refreshed = (stList || []).find(s => s.id === inspectSubmissionsStudent.id);
                if (refreshed) setInspectSubmissionsStudent(refreshed);
              }
            }
          }}
          onClose={() => {
            setInspectSubmissionsStudent(null);
            loadStudents();
          }}
          allStudents={students}
          onSelectStudent={setInspectSubmissionsStudent}
        />
      )}
    </div>
  );
}
