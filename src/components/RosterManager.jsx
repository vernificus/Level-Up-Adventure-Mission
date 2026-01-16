import React, { useState, useEffect } from 'react';
import { realBackend as backend } from '../services/realBackend';
import { UserPlus, Lock, Trash2, Save, Edit, X, Check } from 'lucide-react';

export default function RosterManager({ classId, onStudentAdded }) {
  const [students, setStudents] = useState([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', password: '' });

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

        <form onSubmit={handleAddStudent} className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Student Name"
            value={newStudentName}
            onChange={e => setNewStudentName(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-700 rounded-lg text-white border border-slate-600 focus:border-green-500 outline-none"
          />
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
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
        >
          {showBulk ? 'Hide Bulk Upload' : 'Bulk Upload (CSV)'}
        </button>

        {showBulk && (
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 mb-4">
            <p className="text-xs text-slate-400 mb-2">Enter names and passwords, one per line (e.g., "Alice, 1234")</p>
            <textarea
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
          <p className="text-slate-500">Loading roster...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => (
              <div key={student.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600 relative group">
                {editingId === student.id ? (
                   <div className="space-y-2">
                     <input
                       className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white"
                       value={editForm.name}
                       onChange={e => setEditForm({...editForm, name: e.target.value})}
                     />
                     <input
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
                      <button onClick={() => handleEdit(student)} className="p-1 text-slate-400 hover:text-white"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(student.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg">
                          👤
                        </div>
                        <div>
                          <p className="font-bold text-white text-lg leading-tight">{student.name}</p>
                          <p className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded inline-block mt-1">
                            Pass: <span className="text-yellow-400">{student.password || 'N/A'}</span>
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
                         <span className="text-slate-400 text-xs uppercase font-bold block">Level</span>
                         <p className="font-mono text-blue-400 font-bold">{Math.floor((student.xp || 0)/500)+1}</p>
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
    </div>
  );
}
