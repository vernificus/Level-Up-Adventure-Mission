import React, { useState, useEffect } from 'react';
import { realBackend as backend } from '../services/realBackend';
import {
  GUILDS, GUILD_LEVELS, GUILD_BANNERS, GUILD_TROPHIES,
  GUILD_CHALLENGES, DEFAULT_STEM_SUPPLIES, getGuildLevelInfo
} from '../data/gameData';
import {
  Shield, Users, Trophy, Flame, Sparkles, Star, Award,
  ChevronRight, CheckCircle2, ArrowRight, Gift, Lock,
  Unlock, Send, MessageSquare, Edit3, X, Zap, Crown,
  HelpCircle, Swords, Check, Camera, Upload, Link as LinkIcon,
  Package, ShoppingBag, Clock, Image as ImageIcon, AlertCircle
} from 'lucide-react';
import Avatar3D from './Avatar3D';
import { compressImageFile, isValidImageUrl } from '../utils/imageUtils';

export default function GuildPanel({
  currentGuild,
  onJoinGuild,
  guildXp,
  classId,
  gameState,
  onStateUpdate,
  guilds = GUILDS,
  spendCoins
}) {
  const availableGuilds = guilds && guilds.length > 0 ? guilds : GUILDS;

  const [showGuilds, setShowGuilds] = useState(false);
  const [showGuildDetails, setShowGuildDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'quests', 'stem_depot', 'members', 'trophies', 'standings'
  
  const [guildLeaderboard, setGuildLeaderboard] = useState({});
  const [guildHall, setGuildHall] = useState(null);
  const [loadingGuild, setLoadingGuild] = useState(false);
  const [editingHall, setEditingHall] = useState(false);
  
  const [hallDescription, setHallDescription] = useState('');
  const [hallBanner, setHallBanner] = useState('default');
  const [noticeText, setNoticeText] = useState('');
  const [savingHall, setSavingHall] = useState(false);
  
  const [cheeredMembers, setCheeredMembers] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [claimedRewards, setClaimedRewards] = useState({});

  // Bot Picture Modal State
  const [showBotPicModal, setShowBotPicModal] = useState(false);
  const [botPicTab, setBotPicTab] = useState('upload'); // 'upload' | 'url'
  const [botPicUrlInput, setBotPicUrlInput] = useState('');
  const [botPicPreview, setBotPicPreview] = useState(null);
  const [savingBotPic, setSavingBotPic] = useState(false);

  // STEM Supplies Depot State
  const [stemItems, setStemItems] = useState(DEFAULT_STEM_SUPPLIES);
  const [stemPurchases, setStemPurchases] = useState([]);
  const [loadingStem, setLoadingStem] = useState(false);
  const [selectedTierFilter, setSelectedTierFilter] = useState('all'); // 'all' or 1, 2, 3, 4, 5
  const [purchasingItem, setPurchasingItem] = useState(null);
  const [buyingProcess, setBuyingProcess] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadGuildData = async () => {
    if (!classId) return;
    setLoadingGuild(true);
    try {
      const data = await backend.getGuildLeaderboard(classId);
      setGuildLeaderboard(data || {});
      if (currentGuild) {
        const hall = await backend.getGuildHall(classId, currentGuild);
        setGuildHall(hall || {});
        setHallDescription(hall?.description || '');
        setHallBanner(hall?.banner || 'default');
        setNoticeText(hall?.notice?.text || '');
      }

      // Also load STEM shop items & purchases
      const [items, purchases] = await Promise.all([
        backend.getStemShopItems(classId),
        backend.getStemPurchases(classId)
      ]);
      if (items && items.length > 0) setStemItems(items);
      setStemPurchases(purchases || []);
    } catch (e) {
      console.error("Failed to load guild data", e);
    }
    setLoadingGuild(false);
  };

  useEffect(() => {
    if (classId) {
      loadGuildData();
    }
  }, [classId, currentGuild]);

  const handleSaveHall = async () => {
    if (!classId || !currentGuild) return;
    setSavingHall(true);
    try {
      const noticeObj = noticeText.trim()
        ? { text: noticeText.trim(), authorName: gameState?.name || 'Guild Member', updatedAt: new Date().toISOString() }
        : null;

      await backend.updateGuildHall(classId, currentGuild, {
        description: hallDescription.trim(),
        banner: hallBanner,
        notice: noticeObj
      });
      setGuildHall(prev => ({
        ...prev,
        description: hallDescription.trim(),
        banner: hallBanner,
        notice: noticeObj
      }));
      setEditingHall(false);
      showToast('Guild Hall updated successfully!');
    } catch (e) {
      alert('Error saving guild hall: ' + e.message);
    }
    setSavingHall(false);
  };

  const handleSendCheer = async (targetMember) => {
    if (cheeredMembers[targetMember.id]) return;
    try {
      await backend.sendGuildCheer(
        classId,
        gameState?.id,
        gameState?.name || 'Guild Member',
        targetMember.id,
        targetMember.name,
        currentGuild
      );
      setCheeredMembers(prev => ({ ...prev, [targetMember.id]: true }));
      showToast(`⚡ Sent a High-Five to ${targetMember.name}! (+10 XP to you, +15 XP to ${targetMember.name})`);
      if (onStateUpdate) onStateUpdate();
      loadGuildData();
    } catch (e) {
      alert('Error sending cheer: ' + e.message);
    }
  };

  const handleClaimReward = async (challenge) => {
    if (claimedRewards[challenge.id]) return;
    try {
      const res = await backend.claimGuildChallengeReward(
        classId,
        gameState?.id,
        currentGuild,
        challenge.id,
        challenge.reward,
        challenge.coinReward
      );
      if (res.alreadyClaimed) {
        showToast('You have already claimed this guild reward!');
      } else {
        setClaimedRewards(prev => ({ ...prev, [challenge.id]: true }));
        showToast(`🎉 Claimed +${challenge.reward} XP and +${challenge.coinReward} Coins for completing "${challenge.title}"!`);
        if (onStateUpdate) onStateUpdate();
        loadGuildData();
      }
    } catch (e) {
      alert('Error claiming reward: ' + e.message);
    }
  };

  // Bot Picture handlers
  const handleOpenBotPicModal = () => {
    const activeGuildObj = availableGuilds.find(g => g.id === currentGuild);
    const existingPic = guildHall?.botPictureUrl || guildHall?.botPicture || activeGuildObj?.botPictureUrl || '';
    setBotPicPreview(existingPic || null);
    setBotPicUrlInput(existingPic.startsWith('data:') ? '' : existingPic);
    setShowBotPicModal(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUri = await compressImageFile(file, 500, 500, 0.82);
      setBotPicPreview(compressedDataUri);
    } catch (err) {
      alert('Error reading image: ' + err.message);
    }
  };

  const handleSaveBotPicture = async () => {
    if (!classId || !currentGuild) return;
    setSavingBotPic(true);
    try {
      let finalPic = '';
      if (botPicTab === 'upload') {
        finalPic = botPicPreview || '';
      } else {
        finalPic = botPicUrlInput.trim();
        if (finalPic && !isValidImageUrl(finalPic)) {
          alert('Please enter a valid image URL (http/https) or data URI.');
          setSavingBotPic(false);
          return;
        }
      }

      await backend.updateGuildBotPicture(classId, currentGuild, finalPic);
      setGuildHall(prev => ({ ...prev, botPictureUrl: finalPic }));
      setShowBotPicModal(false);
      showToast(finalPic ? '🤖 Guild bot picture updated!' : 'Bot picture removed.');
      if (onStateUpdate) onStateUpdate();
      loadGuildData();
    } catch (err) {
      alert('Error updating bot picture: ' + err.message);
    }
    setSavingBotPic(false);
  };

  // STEM Purchase handlers
  const handleExecuteBuyStemSupply = async () => {
    if (!purchasingItem || !classId || !gameState?.id) return;
    setBuyingProcess(true);
    try {
      const res = await backend.buyStemSupply(classId, gameState.id, purchasingItem.id);
      if (spendCoins) {
        spendCoins(purchasingItem.costCoins);
      }
      showToast(`🎉 You purchased ${purchasingItem.name} for your guild!`);
      setPurchasingItem(null);
      if (onStateUpdate) onStateUpdate();
      loadGuildData();
    } catch (err) {
      alert('Error purchasing STEM supply: ' + err.message);
    }
    setBuyingProcess(false);
  };

  const guild = availableGuilds.find(g => g.id === currentGuild) || GUILDS.find(g => g.id === currentGuild);
  const myGuildData = currentGuild && guildLeaderboard[currentGuild] ? guildLeaderboard[currentGuild] : null;
  const guildTotalXp = myGuildData?.totalXp || guildXp || 0;
  const levelInfo = getGuildLevelInfo(guildTotalXp);

  // Background banner gradients
  const bannerGradients = {
    default: 'from-slate-800 via-slate-700 to-slate-900',
    flames: 'from-red-950 via-orange-900 to-slate-900',
    stars: 'from-indigo-950 via-purple-900 to-slate-900',
    forest: 'from-emerald-950 via-teal-900 to-slate-900',
    ocean: 'from-blue-950 via-cyan-900 to-slate-900',
    crystal: 'from-fuchsia-950 via-pink-900 to-slate-900',
    volcano: 'from-red-950 via-amber-900 to-stone-900',
    cyber: 'from-cyan-950 via-purple-950 to-slate-950',
    celestial: 'from-sky-950 via-indigo-900 to-amber-950',
    mythic: 'from-amber-950 via-yellow-900 to-purple-950',
  };

  // Bot picture resolution
  const activeBotPicture = guildHall?.botPictureUrl || guildHall?.botPicture || guild?.botPictureUrl || null;

  // Filter STEM items by Tier
  const filteredStemItems = selectedTierFilter === 'all'
    ? stemItems
    : stemItems.filter(item => item.tier === parseInt(selectedTierFilter));

  // Guild's specific STEM purchases
  const guildPurchases = stemPurchases.filter(p => p.guildId === currentGuild);

  // If user hasn't joined a guild yet or invalid guild:
  if (!currentGuild || !guild) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setShowGuilds(true)}
          className="w-full p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-2 border-dashed border-yellow-500/60 hover:border-yellow-400 rounded-2xl transition-all shadow-lg hover:shadow-yellow-500/10 group min-h-[44px]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-400 block">Team Adventure</span>
                <p className="font-black text-white text-base">Join a Guild to Collaborate & Level Up Together!</p>
              </div>
            </div>
            <div className="px-3.5 py-1.5 bg-yellow-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow min-h-[44px]">
              Choose Guild <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        {showGuilds && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowGuilds(false)}
          >
            <div
              className="bg-slate-800 border-2 border-yellow-500/80 rounded-3xl max-w-3xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <span className="text-xs font-black uppercase tracking-widest text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/30">
                  Select Your Alliance ({availableGuilds.length} Guilds Available)
                </span>
                <h3 className="text-2xl font-black uppercase italic text-white mt-2">Choose Your Guild</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                  Team up with classmates! Earn collective XP, unlock tiered STEM supplies, and level up your Guild Castle.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableGuilds.map(g => (
                  <div
                    key={g.id}
                    className={`p-5 rounded-2xl bg-gradient-to-br ${g.gradient || 'from-slate-700 to-slate-800'} border-2 border-white/20 hover:scale-[1.02] transition-all flex flex-col justify-between shadow-xl text-white`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-4xl drop-shadow">{g.emoji || '🛡️'}</span>
                        <span className="text-[11px] font-black uppercase tracking-wider bg-black/30 px-2.5 py-0.5 rounded-full border border-white/20">
                          {g.symbol || 'Team'}
                        </span>
                      </div>
                      <h4 className="text-lg font-black">{g.name}</h4>
                      <p className="text-xs opacity-90 italic mt-0.5">"{g.motto || 'Together we rise!'}"</p>
                    </div>

                    <button
                      onClick={() => { onJoinGuild(g.id); setShowGuilds(false); }}
                      className="mt-4 w-full py-2.5 bg-white text-slate-900 hover:bg-yellow-300 font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      Enlist in {g.name} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowGuilds(false)}
                className="w-full mt-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 text-xs font-bold transition-colors min-h-[44px]"
              >
                Close for Now
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Challenge (top challenge)
  const activeChallenge = myGuildData?.challenges?.[0] || GUILD_CHALLENGES[0];

  return (
    <>
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-yellow-300 border-2 border-yellow-500 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-black text-xs animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Guild Widget on Dashboard */}
      <section
        className={`mb-6 p-5 rounded-3xl bg-gradient-to-br ${guild?.gradient || 'from-slate-700 to-slate-800'} border-2 border-white/20 shadow-xl text-white relative overflow-hidden`}
        aria-label={`Your guild: ${guild?.name || 'Guild'}`}
      >
        {/* Subtle background crest */}
        <div className="absolute right-2 -bottom-4 text-8xl opacity-15 pointer-events-none select-none">
          {guild?.emoji || '🛡️'}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 relative z-10">
          <div className="flex items-center gap-3.5">
            {/* Guild Avatar or Bot Picture */}
            {activeBotPicture ? (
              <div className="relative group">
                <img
                  src={activeBotPicture}
                  alt={`${guild?.name || 'Guild'} robot`}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-yellow-400 shadow-xl"
                />
                <span className="absolute -bottom-1 -right-1 bg-slate-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border border-yellow-500/60 text-yellow-300">
                  Bot
                </span>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-black/25 backdrop-blur-sm border border-white/30 flex items-center justify-center text-3xl shadow-inner">
                {guild?.emoji || '🛡️'}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-xl text-white tracking-wide">{guild?.name || 'Guild'}</h3>
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-black/30 border border-white/30">
                  Level {levelInfo.level} • {levelInfo.name}
                </span>
              </div>
              <p className="text-xs opacity-90 italic mt-0.5">"{guild?.motto || ''}"</p>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-black/25 px-3 py-1.5 rounded-xl border border-white/20 text-center">
              <span className="text-[10px] uppercase font-black text-white/70 block">Guild Spirit</span>
              <span className="text-xs font-black text-amber-300 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> {guildHall?.spiritFlame || 0} Cheers
              </span>
            </div>
            <div className="bg-black/25 px-3 py-1.5 rounded-xl border border-white/20 text-center">
              <span className="text-[10px] uppercase font-black text-white/70 block">Your Contribution</span>
              <span className="text-xs font-black text-yellow-300 flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-300" /> {guildXp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Guild Level Progress Bar */}
        <div className="mb-4 bg-black/30 p-3 rounded-2xl border border-white/15 relative z-10">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1.5 text-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              Active Perk: <span className="text-white font-extrabold">{levelInfo.perk}</span>
            </span>
            <span className="text-white/80">
              {levelInfo.isMax ? 'MAX LEVEL' : `${levelInfo.currentXp.toLocaleString()} / ${levelInfo.nextLevelXp.toLocaleString()} XP`}
            </span>
          </div>
          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/20">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 rounded-full transition-all duration-500"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>
        </div>

        {/* Live Guild Quest Quick Tracker */}
        {activeChallenge && (
          <div className="bg-black/25 p-3 rounded-2xl border border-white/15 mb-4 flex items-center justify-between gap-3 relative z-10 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{activeChallenge.emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Live Team Quest</span>
                  {activeChallenge.completed && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Complete!
                    </span>
                  )}
                </div>
                <p className="text-xs font-black text-white">{activeChallenge.title} ({activeChallenge.current}/{activeChallenge.target})</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-yellow-300 bg-black/30 px-2 py-1 rounded-lg">
                +{activeChallenge.reward} XP • +{activeChallenge.coinReward} 🪙
              </span>
            </div>
          </div>
        )}

        {/* Enter Guild HQ Button */}
        <button
          onClick={() => { setShowGuildDetails(true); loadGuildData(); }}
          className="w-full py-3 bg-white hover:bg-yellow-300 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 relative z-10 active:scale-[0.99] min-h-[44px]"
        >
          <Shield className="w-4 h-4 text-slate-900" /> Enter Guild HQ, Bot Showcase & STEM Shop <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* Guild Headquarters Full Modal */}
      {showGuildDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowGuildDetails(false)}
        >
          <div
            className="bg-slate-900 border-2 border-yellow-500/70 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Castle Header Banner with Theme */}
            <div className={`p-6 bg-gradient-to-br ${bannerGradients[guildHall?.banner || 'default']} border-b border-slate-800 relative`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Bot Picture or Guild Emoji */}
                  {activeBotPicture ? (
                    <div className="relative group flex-shrink-0">
                      <img
                        src={activeBotPicture}
                        alt={`${guild?.name || 'Guild'} robot`}
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-yellow-400 shadow-2xl bg-black/40"
                      />
                      <button
                        onClick={handleOpenBotPicModal}
                        className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg shadow-lg transition-transform active:scale-95"
                        title="Update Bot Photo"
                        aria-label="Update Bot Photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex-shrink-0">
                      <div className="w-18 h-18 rounded-2xl bg-black/40 border-2 border-white/30 flex items-center justify-center text-4xl shadow-xl p-3">
                        {guild?.emoji || '🛡️'}
                      </div>
                      <button
                        onClick={handleOpenBotPicModal}
                        className="absolute -bottom-1 -right-1 p-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg shadow font-bold text-[10px] flex items-center gap-1"
                        title="Add Bot Photo"
                      >
                        <Camera className="w-3 h-3" /> +Bot
                      </button>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-2xl font-black uppercase italic text-white">{guild?.name || 'Guild'}</h3>
                      <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-yellow-500 text-slate-950 shadow">
                        Level {levelInfo.level} • {levelInfo.name}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs mt-0.5 italic">"{guild?.motto || ''}"</p>
                    {guildHall?.description && (
                      <p className="text-yellow-300 text-xs font-semibold mt-1">"{guildHall.description}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleOpenBotPicModal}
                    className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-yellow-400 rounded-xl text-xs font-bold border border-yellow-500/40 flex items-center gap-1.5 transition-colors min-h-[36px]"
                  >
                    <Camera className="w-3.5 h-3.5" /> {activeBotPicture ? 'Edit Bot Photo' : 'Add Bot Photo'}
                  </button>

                  <button
                    onClick={() => setEditingHall(!editingHall)}
                    className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors min-h-[36px]"
                    title="Customize Castle Theme & Notice"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-yellow-400" /> Customize Castle
                  </button>

                  <button
                    onClick={() => setShowGuildDetails(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Noticeboard Banner (if present) */}
              {guildHall?.notice && !editingHall && (
                <div className="mt-4 p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center gap-2.5 text-amber-200 text-xs">
                  <MessageSquare className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-amber-300">Noticeboard ({guildHall.notice.authorName}): </span>
                    <span>{guildHall.notice.text}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Customize Guild Hall Drawer */}
            {editingHall && (
              <div className="p-5 bg-slate-800/90 border-b border-slate-700 space-y-4 animate-in slide-in-from-top-2">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-yellow-400" /> Customize Guild Castle & Noticeboard
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold uppercase mb-1">Guild Battle Cry / Description</label>
                    <input
                      type="text"
                      value={hallDescription}
                      onChange={e => setHallDescription(e.target.value)}
                      placeholder="e.g. Conquerors of the 5th Grade Missions!"
                      maxLength={100}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold uppercase mb-1">Noticeboard Announcement</label>
                    <input
                      type="text"
                      value={noticeText}
                      onChange={e => setNoticeText(e.target.value)}
                      placeholder="e.g. Focus on Collaboration activities this Friday!"
                      maxLength={140}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase text-xs mb-2">Castle Banner Theme (Unlock by Leveling Up!)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {GUILD_BANNERS.map(b => {
                      const isUnlocked = levelInfo.level >= b.minLevel;
                      const isSelected = hallBanner === b.id;
                      return (
                        <button
                          key={b.id}
                          disabled={!isUnlocked}
                          onClick={() => setHallBanner(b.id)}
                          className={`p-2 rounded-xl text-xs font-bold transition-all text-left flex flex-col justify-between border min-h-[44px] ${
                            isSelected
                              ? 'bg-yellow-500 text-slate-950 border-yellow-400 shadow-md font-black'
                              : isUnlocked
                              ? 'bg-slate-900 text-slate-300 hover:bg-slate-700 border-slate-700'
                              : 'bg-slate-900/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="truncate">{b.name}</span>
                            {!isUnlocked && <Lock className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                          </div>
                          <span className="text-[10px] opacity-70">
                            {isUnlocked ? 'Unlocked' : `Level ${b.minLevel}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setEditingHall(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl text-xs min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveHall}
                    disabled={savingHall}
                    className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black rounded-xl text-xs transition-colors shadow min-h-[44px]"
                  >
                    {savingHall ? 'Saving...' : 'Save Castle Upgrades'}
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 overflow-x-auto text-xs font-black">
              {[
                { id: 'overview', label: 'Overview & Perks', icon: Sparkles },
                { id: 'stem_depot', label: 'STEM Supplies Depot', icon: Package },
                { id: 'quests', label: `Live Quests (${myGuildData?.challenges?.length || 5})`, icon: Swords },
                { id: 'members', label: `Members (${myGuildData?.memberCount || 0})`, icon: Users },
                { id: 'trophies', label: `Trophies (${guildHall?.trophies?.length || 0})`, icon: Trophy },
                { id: 'standings', label: 'Guild Standings', icon: Crown },
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap min-h-[44px] ${
                      active
                        ? 'border-yellow-400 text-yellow-400 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* TAB 1: OVERVIEW & LEVEL ROADMAP */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Guild Level Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-yellow-950/40 via-amber-950/30 to-slate-800 border border-yellow-500/40 shadow-lg">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-yellow-400">Current Guild Tier</span>
                        <h4 className="text-xl font-black text-white">Level {levelInfo.level} — {levelInfo.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 font-bold block">Guild Total XP</span>
                        <span className="text-lg font-black text-yellow-400">{guildTotalXp.toLocaleString()} XP</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      <div className="flex justify-between text-xs font-bold text-slate-300">
                        <span>Progress to Level {levelInfo.isMax ? 10 : levelInfo.level + 1}</span>
                        <span>{levelInfo.isMax ? 'MAX TIER REACHED' : `${levelInfo.xpNeeded.toLocaleString()} XP needed`}</span>
                      </div>
                      <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-200 rounded-full transition-all duration-500"
                          style={{ width: `${levelInfo.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-black/30 rounded-xl border border-yellow-500/20 flex items-center gap-2.5 text-xs text-yellow-200">
                      <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <div>
                        <span className="font-black text-yellow-300">Active Perk: </span>
                        <span>{levelInfo.perk}</span>
                      </div>
                    </div>
                  </div>

                  {/* 10-Level Roadmap */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-400" /> Guild Level Progression Roadmap
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {GUILD_LEVELS.map(lvl => {
                        const isUnlocked = levelInfo.level >= lvl.level;
                        const isCurrent = levelInfo.level === lvl.level;
                        return (
                          <div
                            key={lvl.level}
                            className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                              isCurrent
                                ? 'bg-yellow-500/10 border-yellow-500 text-white font-bold ring-1 ring-yellow-400/50'
                                : isUnlocked
                                ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                                : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs ${
                                isUnlocked ? 'bg-yellow-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {lvl.level}
                              </span>
                              <div>
                                <p className="font-black text-white">{lvl.name}</p>
                                <p className="text-[11px] text-slate-400">{lvl.perk}</p>
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500">
                              {(lvl.minXp ?? lvl.xpRequired ?? 0).toLocaleString()} XP
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STEM SUPPLIES DEPOT (TIERED SHOP) */}
              {activeTab === 'stem_depot' && (
                <div className="space-y-6">
                  {/* Balance and Info Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-5 h-5 text-emerald-400" />
                        <h4 className="text-lg font-black text-white">Guild STEM Supply Depot</h4>
                      </div>
                      <p className="text-xs text-slate-300 max-w-xl">
                        Purchase hardware, structural components, and field perks for <strong>{guild.name}</strong> using your own coins. Supplies unlock in tiers as your guild levels up!
                      </p>
                    </div>

                    <div className="bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-emerald-500/50 text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Your Coin Balance</span>
                      <span className="text-xl font-black text-yellow-400 flex items-center justify-end gap-1">
                        🪙 {(gameState?.coins || 0).toLocaleString()} Coins
                      </span>
                    </div>
                  </div>

                  {/* Tier Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
                    <span className="text-slate-400 mr-1">Filter Tier:</span>
                    {['all', '1', '2', '3', '4', '5'].map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTierFilter(t)}
                        className={`px-3 py-1.5 rounded-xl border transition-all min-h-[44px] ${
                          selectedTierFilter === t
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {t === 'all' ? 'All Supplies & Perks' : `Tier ${t}`}
                      </button>
                    ))}
                  </div>

                  {/* STEM Items Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredStemItems.map(item => {
                      const isUnlocked = levelInfo.level >= (item.requiredGuildLevel || 1);
                      const hasEnoughCoins = (gameState?.coins || 0) >= item.costCoins;
                      const canBuy = isUnlocked && hasEnoughCoins;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                            !isUnlocked
                              ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-75'
                              : 'bg-slate-850 border-slate-700 hover:border-emerald-500/60 shadow-lg'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <span className="text-3xl p-2 bg-slate-800 rounded-xl border border-slate-700">{item.icon || '⚙️'}</span>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      Tier {item.tier || 1}
                                    </span>
                                    {item.category === 'perk' && (
                                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        Perk
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="font-black text-white text-base mt-1">{item.name}</h5>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-base font-black text-yellow-400">🪙 {item.costCoins}</span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 mb-3">{item.desc}</p>
                          </div>

                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400">
                              {isUnlocked ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <Unlock className="w-3 h-3" /> Unlocked (Req: Lvl {item.requiredGuildLevel})
                                </span>
                              ) : (
                                <span className="text-amber-400 flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Req: Guild Level {item.requiredGuildLevel}
                                </span>
                              )}
                            </span>

                            <button
                              disabled={!canBuy}
                              onClick={() => setPurchasingItem(item)}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow min-h-[44px] ${
                                canBuy
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                                  : !isUnlocked
                                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed'
                              }`}
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              {canBuy
                                ? `Buy for Guild (${item.costCoins} 🪙)`
                                : !isUnlocked
                                ? `Locked (Lvl ${item.requiredGuildLevel})`
                                : `Need ${item.costCoins - (gameState?.coins || 0)} More Coins`}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Guild Purchases & Deliveries Audit */}
                  <div className="mt-8 bg-slate-800/80 rounded-2xl border border-slate-700 p-5">
                    <h4 className="text-sm font-black text-white mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" /> {guild.name} Supply Orders & Deliveries ({guildPurchases.length})
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Items purchased by your team members. Teachers are notified to distribute supplies in class.
                    </p>

                    {guildPurchases.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-4 italic">
                        No STEM supplies purchased yet. Be the first to supply your robot!
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {guildPurchases.map(p => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700 text-xs flex-wrap gap-2"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{p.icon || '⚙️'}</span>
                              <div>
                                <p className="font-bold text-white">{p.itemName}</p>
                                <p className="text-[11px] text-slate-400">
                                  Contributed by <span className="text-yellow-400 font-semibold">{p.studentName}</span> • {new Date(p.timestamp).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-yellow-400 font-bold">🪙 {p.costCoins}</span>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${
                                p.fulfilled
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {p.fulfilled ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Delivered
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-400" /> Order Placed
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: LIVE QUESTS */}
              {activeTab === 'quests' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-black text-white">Guild Team Missions</h4>
                      <p className="text-xs text-slate-400">Work with your guild to complete goals and earn collective rewards!</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(myGuildData?.challenges || GUILD_CHALLENGES).map(ch => {
                      const isComplete = ch.completed;
                      const isClaimed = claimedRewards[ch.id];
                      return (
                        <div
                          key={ch.id}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isComplete
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-slate-800/80 border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{ch.emoji}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-black text-white text-sm">{ch.title}</h5>
                                {isComplete && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                                    COMPLETED!
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{ch.desc}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs font-bold">
                                <span className="text-slate-300">
                                  Progress: {ch.current || 0} / {ch.target}
                                </span>
                                <span className="text-yellow-400">+{ch.reward} XP</span>
                                <span className="text-amber-300">+{ch.coinReward} 🪙</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isComplete && !isClaimed && (
                              <button
                                onClick={() => handleClaimReward(ch)}
                                className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-colors shadow min-h-[44px]"
                              >
                                Claim Reward!
                              </button>
                            )}
                            {isClaimed && (
                              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="w-4 h-4" /> Reward Claimed
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: MEMBERS */}
              {activeTab === 'members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">Active Guild Members ({myGuildData?.memberCount || 0})</h4>
                      <p className="text-xs text-slate-400">Send high-fives to energize your teammates and earn bonus XP!</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(myGuildData?.members || []).map(m => {
                      const isMe = m.id === gameState?.id;
                      const hasCheered = cheeredMembers[m.id];
                      return (
                        <div
                          key={m.id}
                          className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar3D avatar={m.avatar || { color: 'default', hat: 'none', accessory: 'none', face: 'happy' }} level={1} size="sm" />
                            <div>
                              <p className="font-bold text-white text-xs flex items-center gap-1.5">
                                {m.name} {isMe && <span className="text-[10px] bg-yellow-500 text-slate-950 px-1.5 py-0.2 rounded font-black">YOU</span>}
                              </p>
                              <p className="text-[11px] text-yellow-400 font-bold">{m.xp || 0} XP contributed</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isMe && (
                              <button
                                onClick={() => handleSendCheer(m)}
                                disabled={hasCheered}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all min-h-[44px] ${
                                  hasCheered
                                    ? 'bg-slate-700 text-slate-400 cursor-default'
                                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow'
                                }`}
                              >
                                <Zap className="w-3.5 h-3.5" />
                                {hasCheered ? 'High-Fived! ✓' : 'High-Five ⚡'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: TROPHIES */}
              {activeTab === 'trophies' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">Guild Trophy Hall</h4>
                      <p className="text-xs text-slate-400">Honors and awards bestowed upon {guild.name} by your teachers!</p>
                    </div>
                  </div>

                  {(guildHall?.trophies || []).length === 0 ? (
                    <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-700">
                      <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-300">No trophies awarded yet</p>
                      <p className="text-xs text-slate-500 mt-1">Keep completing missions and your teacher can award guild trophies!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {guildHall.trophies.map((tr, idx) => (
                        <div key={idx} className="p-4 bg-gradient-to-b from-yellow-950/30 to-slate-800 rounded-2xl border border-yellow-500/40 text-center shadow-lg">
                          <div className="text-4xl mb-1.5">{tr.icon}</div>
                          <h5 className="font-black text-white text-xs">{tr.title}</h5>
                          {tr.message && <p className="text-[11px] text-yellow-300 italic mt-1">"{tr.message}"</p>}
                          <span className="text-[10px] text-slate-500 block mt-2">{new Date(tr.awardedAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: STANDINGS */}
              {activeTab === 'standings' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-white">Class Guild Rankings ({availableGuilds.length} Guilds)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...availableGuilds]
                      .filter(Boolean)
                      .sort((a, b) => (guildLeaderboard?.[b?.id]?.totalXp || 0) - (guildLeaderboard?.[a?.id]?.totalXp || 0))
                      .map((g, idx) => {
                        const stats = guildLeaderboard?.[g.id];
                        const gLevel = getGuildLevelInfo(stats?.totalXp || 0);
                        const isMyGuild = g.id === currentGuild;
                        return (
                          <div
                            key={g.id || idx}
                            className={`p-4 rounded-2xl border-2 transition-all ${
                              isMyGuild
                                ? `${g.color || 'bg-slate-700'} bg-opacity-30 border-yellow-400 shadow-lg`
                                : 'bg-slate-800/80 border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</span>
                                <span className="text-2xl">{g.emoji || '🛡️'}</span>
                                <div>
                                  <h5 className="font-black text-white text-sm">{g.name || 'Guild'}</h5>
                                  <span className="text-[10px] font-bold text-slate-400">Level {gLevel.level} • {gLevel.name}</span>
                                </div>
                              </div>
                              <span className="text-sm font-black text-yellow-400">{(stats?.totalXp || 0).toLocaleString()} XP</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-white/10">
                              <span>{stats?.memberCount || 0} Members</span>
                              <span>Perk: {gLevel.perk}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Bot Picture Upload / URL Modal */}
      {showBotPicModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowBotPicModal(false)}
        >
          <div
            className="bg-slate-900 border-2 border-yellow-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-yellow-400" /> {guild.name} Bot Picture
              </h3>
              <button
                onClick={() => setShowBotPicModal(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Upload a picture of your guild's robot or paste an image link. Everyone in your class will see your bot!
            </p>

            {/* Tab switch: File Upload vs URL */}
            <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBotPicTab('upload')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 min-h-[44px] ${
                  botPicTab === 'upload' ? 'bg-yellow-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
              <button
                type="button"
                onClick={() => setBotPicTab('url')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 min-h-[44px] ${
                  botPicTab === 'url' ? 'bg-yellow-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" /> Image Link / URL
              </button>
            </div>

            {/* Tab 1: Upload File */}
            {botPicTab === 'upload' && (
              <div className="space-y-3">
                <label className="block p-5 border-2 border-dashed border-slate-700 hover:border-yellow-500/60 rounded-2xl text-center cursor-pointer bg-slate-850 transition-colors">
                  <Upload className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-white block">Click to select photo</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">JPG, PNG, WEBP (auto-compressed)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Tab 2: Image URL */}
            {botPicTab === 'url' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">External Image URL</label>
                <input
                  type="url"
                  value={botPicUrlInput}
                  onChange={e => {
                    setBotPicUrlInput(e.target.value);
                    setBotPicPreview(e.target.value);
                  }}
                  placeholder="https://example.com/robot.jpg"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-yellow-500 min-h-[44px]"
                />
              </div>
            )}

            {/* Preview Box */}
            {botPicPreview && (
              <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-center space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Picture Preview:</span>
                <img
                  src={botPicPreview}
                  alt="Bot Preview"
                  className="w-36 h-36 mx-auto object-cover rounded-xl border border-yellow-500/50 shadow"
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              {activeBotPicture ? (
                <button
                  type="button"
                  onClick={() => {
                    setBotPicPreview('');
                    setBotPicUrlInput('');
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-bold min-h-[44px] px-2"
                >
                  Clear Photo
                </button>
              ) : <span />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBotPicModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBotPicture}
                  disabled={savingBotPic}
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black rounded-xl text-xs transition-colors shadow min-h-[44px]"
                >
                  {savingBotPic ? 'Saving...' : 'Save Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEM Purchase Confirmation Modal */}
      {purchasingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setPurchasingItem(null)}
        >
          <div
            className="bg-slate-900 border-2 border-emerald-500 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" /> Confirm STEM Purchase
              </h3>
              <button
                onClick={() => setPurchasingItem(null)}
                className="text-slate-400 hover:text-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 flex items-center gap-3">
              <span className="text-3xl">{purchasingItem.icon || '⚙️'}</span>
              <div>
                <h4 className="font-black text-white text-base">{purchasingItem.name}</h4>
                <p className="text-xs text-slate-300">{purchasingItem.desc}</p>
                <span className="text-xs font-bold text-yellow-400 mt-1 block">Cost: {purchasingItem.costCoins} Coins</span>
              </div>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/40 p-3 rounded-xl text-xs text-emerald-200">
              💡 <strong>Team Contribution:</strong> You are spending <strong>{purchasingItem.costCoins} of your individual coins</strong> to supply <strong>{guild.name}</strong>. Your teacher will be notified to deliver this item to your team!
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPurchasingItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={buyingProcess}
                onClick={handleExecuteBuyStemSupply}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-colors shadow min-h-[44px]"
              >
                {buyingProcess ? 'Processing...' : `Confirm & Spend ${purchasingItem.costCoins} Coins`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
