import React, { useState, useEffect } from 'react';
import { realBackend as backend } from '../services/realBackend';
import { UserPlus, Lock, Trash2, Save, Edit, X, Check, RotateCcw, Gift, Star, Zap, Trophy, Eye, EyeOff, Sparkles, User, ShieldCheck } from 'lucide-react';
import { ACHIEVEMENTS, LEVELS, AVATAR_ITEMS } from '../data/gameData';
import Avatar3D, { AvatarColorSwatch } from './Avatar3D';

export default function RosterManager({ classId, onStudentAdded }) {
  const [students, setStudents] = useState([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', password: '' });
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Student Avatar & Rewards Inspector State
  const [inspectStudent, setInspectStudent] = useState(null);
  const [inspectAvatar, setInspectAvatar] = useState({ color: 'default', hat: 'none', accessory: 'none', face: 'happy' });
  const [inspectCoins, setInspectCoins] = useState(100);
  const [inspectOwnedItems, setInspectOwnedItems] = useState([]);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [itemToGrant, setItemToGrant] = useState('');

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
    setInspectOwnedItems(student.ownedItems || ['default', 'none', 'happy']);
    setItemToGrant('');
  };

  const handleSaveStudentAvatar = async () => {
    if (!inspectStudent) return;
    setSavingAvatar(true);
    try {
      await backend.updateStudent(inspectStudent.id, {
        avatar: inspectAvatar,
        coins: parseInt(inspectCoins) || 0,
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

  // Reward giving
  const [rewardTarget, setRewardTarget] = useState(null); // student object
  const [rewardType, setRewardType] = useState('xp'); // 'xp', 'coins', 'achievement'
  const [rewardAmount, setRewardAmount] = useState('');
  const [rewardAchievement, setRewardAchievement] = useState('');
  const [givingReward, setGivingReward] = useState(false);

  const handleGiveReward = async () => {
    if (!rewardTarget) return;
    setGivingReward(true);
    try {
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
      setRewardTarget(null);
      setRewardAmount('');
      setRewardAchievement('');
      loadStudents();
    } catch (error) {
      alert('Error giving reward: ' + error.message);
    }
    setGivingReward(false);
  };

  // Bulk upload (simple text area parsing)
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const handleBulkUpload = async () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    setAdding(true);
    let count = 0;
    let errors = [];

    for (const line of lines) {
      // Format: Name, Password
      const parts = line.split(',');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const pass = parts[1].trim();
        try {
          await backend.createStudent(classId, name, pass);
          count++;
        } catch (e) {
          errors.push(`${name}: ${e.message}`);
        }
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
            <label htmlFor="bulk-upload" className="text-xs text-slate-400 mb-2 block">Enter names and passwords, one per line (e.g., "Alice, 1234")</label>
            <textarea
              id="bulk-upload"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              className="w-full h-32 bg-slate-800 text-white p-2 rounded border border-slate-600 text-sm font-mono"
              placeholder="Alice, 1234&#10;Bob, 5678"
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
        <h3 className="text-xl font-bold text-white mb-4">Class Roster ({students.length})</h3>

        {loading ? (
          <p className="text-slate-500" role="status" aria-live="polite">Loading roster...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => (
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
                       <div>
                         <span className="text-slate-400 text-xs uppercase font-bold block">Done</span>
                         <p className="font-mono text-purple-400 font-bold">{(student.completedActivities || []).length}</p>
                       </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {students.length === 0 && <p className="text-slate-500 italic">No students yet.</p>}
          </div>
        )}
      </div>

      {/* Reward Modal */}
      {rewardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={() => setRewardTarget(null)}>
          <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Gift className="w-6 h-6 text-yellow-400" aria-hidden="true" /> Give Reward
              </h3>
              <button onClick={() => setRewardTarget(null)} className="text-slate-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-slate-400 mb-4">Reward for: <span className="font-bold text-white">{rewardTarget.name}</span></p>

            <div className="flex gap-2 mb-4" role="group" aria-label="Reward type">
              <button
                onClick={() => setRewardType('xp')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${rewardType === 'xp' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                <Zap className="w-4 h-4" aria-hidden="true" /> XP
              </button>
              <button
                onClick={() => setRewardType('coins')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${rewardType === 'coins' ? 'bg-yellow-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                <Star className="w-4 h-4" aria-hidden="true" /> Coins
              </button>
              <button
                onClick={() => setRewardType('achievement')}
                className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${rewardType === 'achievement' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                <Trophy className="w-4 h-4" aria-hidden="true" /> Trophy
              </button>
            </div>

            {(rewardType === 'xp' || rewardType === 'coins') && (
              <div className="mb-4">
                <label htmlFor="reward-amount" className="block text-sm text-slate-400 mb-1">
                  Amount of {rewardType === 'xp' ? 'XP' : 'Coins'} to give
                </label>
                <input
                  id="reward-amount"
                  type="number"
                  min="1"
                  value={rewardAmount}
                  onChange={e => setRewardAmount(e.target.value)}
                  placeholder={rewardType === 'xp' ? 'e.g. 100' : 'e.g. 50'}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 outline-none"
                />
              </div>
            )}

            {rewardType === 'achievement' && (
              <div className="mb-4">
                <label htmlFor="reward-achievement" className="block text-sm text-slate-400 mb-1">Select Achievement to unlock</label>
                <select
                  id="reward-achievement"
                  value={rewardAchievement}
                  onChange={e => setRewardAchievement(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-yellow-500 outline-none"
                >
                  <option value="">-- Choose --</option>
                  {ACHIEVEMENTS.filter(a => !(rewardTarget.unlockedAchievements || []).includes(a.id)).map(a => (
                    <option key={a.id} value={a.id}>{a.icon} {a.title} - {a.desc}</option>
                  ))}
                </select>
                {ACHIEVEMENTS.filter(a => !(rewardTarget.unlockedAchievements || []).includes(a.id)).length === 0 && (
                  <p className="text-xs text-green-400 mt-2">This student has unlocked all achievements!</p>
                )}
              </div>
            )}

            <button
              onClick={handleGiveReward}
              disabled={givingReward}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {givingReward ? 'Giving...' : 'Give Reward'}
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
                    <span className="text-slate-400 font-bold uppercase">Total XP:</span>
                    <span className="text-green-400 font-black">{inspectStudent.xp || 0} XP</span>
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
                  <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-xs">
                    <span className="text-slate-400 font-bold uppercase block mb-1">Owned Items ({inspectOwnedItems.length}):</span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {inspectOwnedItems.map(itemId => (
                        <span key={itemId} className="px-2 py-0.5 bg-slate-700 rounded-md text-[10px] text-slate-300 font-mono">
                          {itemId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Equipment Slots & Grant Tool */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-yellow-400">Equipped Gear</h4>
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
    </div>
  );
}
