import React, { useState } from 'react';
import { Gamepad2, Mic, BarChart3, Palette, CheckCircle2, Trophy, Rocket, Info, X, PlayCircle } from 'lucide-react';

const App = () => {
  const [selectedPath, setSelectedPath] = useState({ path1: null, path2: null, path3: null });
  const [showInfo, setShowInfo] = useState(false);
  const [activeInstruction, setActiveInstruction] = useState(null);

  const paths = [
    {
      id: 'path1',
      title: 'The Wordsmith',
      subtitle: 'Vocabulary Quest',
      icon: <Mic className="w-6 h-6" />,
      color: 'bg-blue-600',
      options: [
        {
          id: '1a',
          title: 'Voice Battle',
          desc: 'Record yourself defining 5 unit words.',
          type: 'High Tech',
          steps: [
            "Open your voice recording tool (like Vocaroo or Mote).",
            "Read the word clearly, then explain it in your own words.",
            "Use the 'Pro Tip' below to earn extra XP!",
            "Submit the link to your teacher."
          ],
          proTip: "Try to use the word in a sentence about your favorite video game for a bonus!"
        },
        {
          id: '1b',
          title: 'Word Sketch',
          desc: 'Draw a visual representation of 3 complex terms.',
          type: 'Low Tech',
          steps: [
            "Grab a blank piece of paper and divide it into three sections.",
            "Write the vocabulary word at the top of each section.",
            "Draw a picture that shows the word's meaning without using letters.",
            "Write one sentence underneath explaining your drawing."
          ],
          proTip: "Use colors that match the 'mood' of the word (e.g., bright colors for 'energetic')."
        }
      ]
    },
    {
      id: 'path2',
      title: 'The Data Scientist',
      subtitle: 'Progress Mission',
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'bg-purple-600',
      options: [
        {
          id: '2a',
          title: 'Goal Tracker',
          desc: 'Update your Lexia/Math chart.',
          type: 'Self-Reflection',
          steps: [
            "Open your data folder and find your progress chart.",
            "Check your minutes/units for this week.",
            "Color in your progress bar to show where you are.",
            "Identify one 'Power Move' (a specific action) to reach your goal by Friday."
          ],
          proTip: "A Power Move is specific, like 'I will complete 2 units before lunch.'"
        },
        {
          id: '2b',
          title: 'Peer Interview',
          desc: 'Ask a friend how they beat a hard level today.',
          type: 'Collaboration',
          steps: [
            "Find a partner who has finished their 'Must-Do' work.",
            "Ask: 'What was the hardest part of your work today, and how did you push through?'",
            "Write down or record their strategy.",
            "Thank your partner for the 'Pro Tip'!"
          ],
          proTip: "Listen for 'Growth Mindset' words like 'practiced,' 'tried again,' or 'focused.'"
        }
      ]
    },
    {
      id: 'path3',
      title: 'The Creator',
      subtitle: 'Expression Boss',
      icon: <Palette className="w-6 h-6" />,
      color: 'bg-orange-600',
      options: [
        {
          id: '3a',
          title: 'Tutorial Video',
          desc: 'Film a 60-second "How-To" for a 4th grader.',
          type: 'High Tech',
          steps: [
            "Choose a topic from today's lesson that you understand well.",
            "Write a 3-sentence script: Hook, Explanation, and Summary.",
            "Record your video using a camera or screen-recording tool.",
            "Make sure your voice is clear and you show examples!"
          ],
          proTip: "Imagine you are a YouTuber! Start with an exciting intro."
        },
        {
          id: '3b',
          title: 'Boss Map',
          desc: 'Sketch the steps to solve a big problem.',
          type: 'Low Tech',
          steps: [
            "Identify the 'Final Boss' (the hardest problem in the unit).",
            "Draw a 'Map' that shows the path to solving it.",
            "Include 'Checkpoints' for each step of the work.",
            "Label any 'Traps' (common mistakes) to avoid!"
          ],
          proTip: "Make it look like a real game map with start and finish lines."
        }
      ]
    }
  ];

  const handleSelect = (pathId, optionId) => {
    setSelectedPath(prev => ({ ...prev, [pathId]: optionId }));
    const path = paths.find(p => p.id === pathId);
    const option = path.options.find(o => o.id === optionId);
    setActiveInstruction(option);
  };

  const completedCount = Object.values(selectedPath).filter(v => v !== null).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans relative">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-yellow-500 rounded-full mb-4 shadow-lg shadow-yellow-500/20">
          <Gamepad2 className="w-8 h-8 text-slate-900" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase mb-2">
          Level Up: 5th Grade Mission
        </h1>
        <p className="text-slate-400 text-lg">Choose your path. Master the content. Own the game.</p>

        {/* Progress Bar */}
        <div className="mt-8 bg-slate-800 h-4 rounded-full overflow-hidden max-w-md mx-auto border border-slate-700">
          <div
            className="bg-yellow-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-bold text-yellow-500 uppercase tracking-widest">
          {completedCount}/3 Objectives Selected
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {paths.map((path) => (
          <div key={path.id} className="flex flex-col gap-4">
            <div className={`flex items-center gap-3 p-4 rounded-t-xl ${path.color}`}>
              {path.icon}
              <div>
                <h2 className="font-black uppercase italic leading-none">{path.title}</h2>
                <span className="text-xs opacity-80 font-bold">{path.subtitle}</span>
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-b-xl border-x border-b border-slate-700 flex-1 flex flex-col gap-4">
              {path.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(path.id, opt.id)}
                  className={`text-left p-4 rounded-lg border-2 transition-all group relative overflow-hidden ${
                    selectedPath[path.id] === opt.id
                    ? 'border-yellow-500 bg-slate-700'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black uppercase text-slate-400 group-hover:text-yellow-500">
                      {opt.type}
                    </span>
                    {selectedPath[path.id] === opt.id && <CheckCircle2 className="w-5 h-5 text-yellow-500" />}
                  </div>
                  <h3 className="font-bold text-lg mb-1">{opt.title}</h3>
                  <p className="text-sm text-slate-400 leading-snug">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Instruction Modal */}
      {activeInstruction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-800 border-2 border-yellow-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setActiveInstruction(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <PlayCircle className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase italic">{activeInstruction.title}</h3>
                <p className="text-yellow-500 text-sm font-bold uppercase tracking-widest">Active Objective</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="font-bold text-slate-300 uppercase text-xs tracking-widest">How to Play:</h4>
              <ol className="space-y-3">
                {activeInstruction.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-slate-300">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700 text-yellow-500 flex items-center justify-center text-xs font-bold border border-slate-600">
                      {idx + 1}
                    </span>
                    <span className="text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-blue-600/20 border border-blue-500/30 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-1 text-blue-400">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Pro Tip</span>
              </div>
              <p className="text-sm text-blue-100">{activeInstruction.proTip}</p>
            </div>

            <button
              onClick={() => setActiveInstruction(null)}
              className="w-full mt-6 py-3 bg-yellow-500 text-slate-900 font-black uppercase italic rounded-xl hover:bg-yellow-400 transition-colors"
            >
              Start Mission
            </button>
          </div>
        </div>
      )}

      {/* Footer / Teacher Info */}
      <div className="max-w-4xl mx-auto mt-12 text-center pb-20">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Info className="w-4 h-4" />
          {showInfo ? 'Hide Pedagogical Connections' : 'Show Pedagogical Connections'}
        </button>

        {showInfo && (
          <div className="mt-6 p-6 bg-slate-800/50 rounded-xl border border-slate-700 text-left animate-in fade-in slide-in-from-bottom-4">
            <h4 className="text-yellow-500 font-bold uppercase mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Why this works (The Innovating for Access Connection)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="font-bold text-slate-300 underline mb-1">Removing Barriers (UDL)</p>
                <p className="text-slate-400 italic">"By offering 'Low Tech' options like sketching, we ensure that students who are blocked by typing or digital navigation can still show mastery of the core standard."</p>
              </div>
              <div>
                <p className="font-bold text-slate-300 underline mb-1">Establishing Agency (Phase 2)</p>
                <p className="text-slate-400 italic text-xs leading-relaxed">"This board moves the classroom from whole-group lockstep to student-led paths. It rewards 'Craftsmanship' (Leonard's goal) and 'Active Verbal Response' (Thomas's goal)."</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
