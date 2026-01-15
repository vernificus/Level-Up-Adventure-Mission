import React, { useState, useEffect } from 'react';
import { realBackend as backend } from '../services/realBackend';
import { UserPlus, Lock, Trash2, Save } from 'lucide-react';

export default function RosterManager({ classId, onStudentAdded }) {
  const [students, setStudents] = useState([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

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
              <div key={student.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-lg border border-slate-600">
                <div>
                  <p className="font-bold text-white">{student.name}</p>
                  <p className="text-xs text-slate-400 font-mono">Pass: {student.password || 'N/A'}</p>
                </div>
                {/* Future: Add delete/edit buttons here */}
              </div>
            ))}
            {students.length === 0 && <p className="text-slate-500 italic">No students yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
