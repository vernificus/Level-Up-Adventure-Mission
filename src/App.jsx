import React, { useState } from 'react';
import {
  Gamepad2,
  Mic,
  BarChart3,
  Palette,
  CheckCircle2,
  Trophy,
  Rocket,
  Info,
} from 'lucide-react';

const LEARNING_PATHS = [
  {
    id: 'path1',
    title: 'The Wordsmith',
    subtitle: 'Vocabulary Quest',
    icon: Mic,
    color: 'bg-blue-600',
    options: [
      {
        id: '1a',
        title: 'Voice Battle',
        desc: 'Record yourself defining 5 unit words. No typing allowed!',
        type: 'High Tech',
      },
      {
        id: '1b',
        title: 'Word Sketch',
        desc: 'Draw a visual representation of 3 complex terms.',
        type: 'Low Tech',
      },
    ],
  },
  {
    id: 'path2',
    title: 'The Data Scientist',
    subtitle: 'Progress Mission',
    icon: BarChart3,
    color: 'bg-purple-600',
    options: [
      {
        id: '2a',
        title: 'Goal Tracker',
        desc: 'Update your Lexia/Math chart. What is your "Power Move"?',
        type: 'Self-Reflection',
      },
      {
        id: '2b',
        title: 'Peer Interview',
        desc: 'Ask a friend how they beat a hard level today.',
        type: 'Collaboration',
      },
    ],
  },
  {
    id: 'path3',
    title: 'The Creator',
    subtitle: 'Expression Boss',
    icon: Palette,
    color: 'bg-orange-600',
    options: [
      {
        id: '3a',
        title: 'Tutorial Video',
        desc: 'Film a 60-second "How-To" for a 4th grader.',
        type: 'High Tech',
      },
      {
        id: '3b',
        title: 'Boss Map',
        desc: 'Sketch a map showing the steps to solve a big problem.',
        type: 'Low Tech',
      },
    ],
  },
];

function Header({ completedCount }) {
  return (
    <div className="max-w-4xl mx-auto text-center mb-10">
      <div className="inline-flex items-center justify-center p-3 bg-yellow-500 rounded-full mb-4 shadow-lg shadow-yellow-500/20">
        <Gamepad2 className="w-8 h-8 text-slate-900" />
      </div>

      <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase mb-2">
        Level Up: 5th Grade Mission
      </h1>

      <p className="text-slate-400 text-lg">
        Choose your path. Master the content. Own the game.
      </p>

      <ProgressBar completedCount={completedCount} total={3} />
    </div>
  );
}

function ProgressBar({ completedCount, total }) {
  const percentage = (completedCount / total) * 100;

  return (
    <div className="mt-8">
      <div className="bg-slate-800 h-4 rounded-full overflow-hidden max-w-md mx-auto border border-slate-700">
        <div
          className="bg-yellow-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-2 text-sm font-bold text-yellow-500 uppercase tracking-widest">
        {completedCount}/{total} Objectives Selected
      </p>
    </div>
  );
}

function PathCard({ path, selectedOption, onSelect }) {
  const IconComponent = path.icon;

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex items-center gap-3 p-4 rounded-t-xl ${path.color}`}>
        <IconComponent className="w-6 h-6" />
        <div>
          <h2 className="font-black uppercase italic leading-none">
            {path.title}
          </h2>
          <span className="text-xs opacity-80 font-bold">{path.subtitle}</span>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-b-xl border-x border-b border-slate-700 flex-1 flex flex-col gap-4">
        {path.options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            isSelected={selectedOption === option.id}
            onSelect={() => onSelect(path.id, option.id)}
          />
        ))}
      </div>
    </div>
  );
}

function OptionButton({ option, isSelected, onSelect }) {
  const baseClasses =
    'text-left p-4 rounded-lg border-2 transition-all group relative overflow-hidden';
  const selectedClasses = isSelected
    ? 'border-yellow-500 bg-slate-700'
    : 'border-slate-700 bg-slate-800 hover:border-slate-500';

  return (
    <button onClick={onSelect} className={`${baseClasses} ${selectedClasses}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-black uppercase text-slate-400 group-hover:text-yellow-500">
          {option.type}
        </span>
        {isSelected && <CheckCircle2 className="w-5 h-5 text-yellow-500" />}
      </div>
      <h3 className="font-bold text-lg mb-1">{option.title}</h3>
      <p className="text-sm text-slate-400 leading-snug">{option.desc}</p>
    </button>
  );
}

function PedagogicalInfo({ isVisible, onToggle }) {
  return (
    <div className="max-w-4xl mx-auto mt-12 text-center">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Info className="w-4 h-4" />
        {isVisible
          ? 'Hide Pedagogical Connections'
          : 'Show Pedagogical Connections'}
      </button>

      {isVisible && (
        <div className="mt-6 p-6 bg-slate-800/50 rounded-xl border border-slate-700 text-left animate-in">
          <h4 className="text-yellow-500 font-bold uppercase mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Why this works (The Innovating for Access Connection)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-bold text-slate-300 underline mb-1">
                Removing Barriers (UDL)
              </p>
              <p className="text-slate-400 italic">
                "By offering 'Low Tech' options like sketching, we ensure that
                students who are blocked by typing or digital navigation can
                still show mastery of the core standard."
              </p>
            </div>
            <div>
              <p className="font-bold text-slate-300 underline mb-1">
                Establishing Agency (Phase 2)
              </p>
              <p className="text-slate-400 italic text-xs leading-relaxed">
                "This board moves the classroom from whole-group lockstep to
                student-led paths. It rewards 'Craftsmanship' (Leonard's goal)
                and 'Active Verbal Response' (Thomas's goal)."
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MissionComplete() {
  return (
    <div className="mt-8 p-6 bg-yellow-500 text-slate-900 rounded-xl font-black uppercase italic animate-bounce shadow-xl shadow-yellow-500/20">
      <div className="flex items-center justify-center gap-3">
        <Rocket className="w-8 h-8" />
        Mission Accepted! Let's get to work.
      </div>
    </div>
  );
}

export default function App() {
  const [selections, setSelections] = useState({
    path1: null,
    path2: null,
    path3: null,
  });
  const [showInfo, setShowInfo] = useState(false);

  const handleSelect = (pathId, optionId) => {
    setSelections((prev) => ({ ...prev, [pathId]: optionId }));
  };

  const completedCount = Object.values(selections).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <Header completedCount={completedCount} />

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {LEARNING_PATHS.map((path) => (
          <PathCard
            key={path.id}
            path={path}
            selectedOption={selections[path.id]}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <PedagogicalInfo
        isVisible={showInfo}
        onToggle={() => setShowInfo(!showInfo)}
      />

      {completedCount === 3 && <MissionComplete />}
    </div>
  );
}
