/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Streamer } from "./types";
import { MOCK_STREAMERS } from "./utils/mockData";
import AuthScreen from "./components/AuthScreen";
import LiveStreamSimulator from "./components/LiveStreamSimulator";
import ProfilePanel from "./components/ProfilePanel";
import CoinsModal from "./components/CoinsModal";
import DailyMissions from "./components/DailyMissions";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "./utils/firebase";

import { 
  Sparkles, 
  Home, 
  Video, 
  User as UserIcon, 
  LogOut, 
  Coins, 
  Award, 
  Users, 
  Flame, 
  ChevronRight,
  Tv,
  Plus,
  X,
  Trash2,
  Search,
  QrCode,
  MessageSquare,
  Play
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "live" | "profile">("home");
  const [selectedStreamer, setSelectedStreamer] = useState<Streamer | null>(null);
  const [isCoinsModalOpen, setIsCoinsModalOpen] = useState(false);
  const [streamersList, setStreamersList] = useState<Streamer[]>(MOCK_STREAMERS);

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isJoiningLive, setIsJoiningLive] = useState(false);
  const [joiningTarget, setJoiningTarget] = useState<Streamer | null>(null);

  // Dynamic customization for "add creator live" state
  const [isAddCreatorLiveOpen, setIsAddCreatorLiveOpen] = useState(false);
  const [newLiveTitle, setNewLiveTitle] = useState("");
  const [newLiveUsername, setNewLiveUsername] = useState("");
  const [newLiveCategory, setNewLiveCategory] = useState("IRL Chatting");
  const [newLiveLevel, setNewLiveLevel] = useState(1);
  const [newLiveViewers, setNewLiveViewers] = useState(0);
  const [newLiveCoins, setNewLiveCoins] = useState(0); 
  const [newLiveVideoType, setNewLiveVideoType] = useState("Cosmic Nebula Loop 🌌");
  const [newLiveAvatarUrl, setNewLiveAvatarUrl] = useState("");
  const [simulatedFileName, setSimulatedFileName] = useState("");

  const handleAddCreatorLive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLiveTitle.trim() || !newLiveUsername.trim()) return;

    const formattedUsername = newLiveUsername.replace(/^@/, '');
    const seed = Math.floor(Math.random() * 1000);
    const finalAvatar = newLiveAvatarUrl.trim() || `https://picsum.photos/seed/custom_${seed}/150/150`;
    
    const newStreamer: Streamer = {
      id: `custom-streamer-${Date.now()}`,
      username: `@${formattedUsername}`,
      fullName: newLiveUsername.charAt(0).toUpperCase() + newLiveUsername.slice(1),
      avatarUrl: finalAvatar,
      level: Number(newLiveLevel) || 1,
      viewersCount: Number(newLiveViewers) || 0,
      title: newLiveTitle.trim(),
      category: newLiveCategory,
      isLive: true,
      startingCoins: Number(newLiveCoins) || 0,
      videoFeedType: newLiveVideoType
    };

    setStreamersList((prev) => [newStreamer, ...prev]);
    setIsAddCreatorLiveOpen(false);
    
    // reset form fields
    setNewLiveTitle("");
    setNewLiveUsername("");
    setNewLiveCategory("IRL Chatting");
    setNewLiveLevel(1);
    setNewLiveViewers(0);
    setNewLiveCoins(0);
    setNewLiveVideoType("Cosmic Nebula Loop 🌌");
    setNewLiveAvatarUrl("");
    setSimulatedFileName("");
  };

  // Sync with Firebase Auth state on mount/init
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data() as User;
            setCurrentUser(profileData);
            localStorage.setItem("loopchat_current_user", JSON.stringify(profileData));
          } else {
            // Profile entry doesn't exist yet, try to load from local storage as safety net
            const savedUser = localStorage.getItem("loopchat_current_user");
            if (savedUser) {
              try {
                const parsed = JSON.parse(savedUser);
                if (parsed.id === firebaseUser.uid) {
                  setCurrentUser(parsed);
                }
              } catch (e) {}
            }
          }
        } catch (err) {
          console.error("Error loaded firebase user profile:", err);
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem("loopchat_current_user");
      }
    });
    return () => unsubscribe();
  }, []);

  // Pre-seed "CVV" creator code if it doesn't exist in Firestore
  useEffect(() => {
    const seedCVVCode = async () => {
      try {
        const codeRef = doc(db, "coin_codes", "CVV");
        const codeSnap = await getDoc(codeRef);
        if (!codeSnap.exists()) {
          await setDoc(codeRef, {
            code: "CVV",
            coins: 5000,
            createdAt: new Date().toISOString()
          });
          console.log("Successfully pre-seeded 'CVV' creator code!");
        }
      } catch (err) {
        console.error("Failed to seed CVV creator code:", err);
      }
    };
    seedCVVCode();
  }, []);

  // Sync user state with local storage & Firestore
  const handleUserUpdate = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("loopchat_current_user", JSON.stringify(updatedUser));
    try {
      const userRef = doc(db, "users", updatedUser.id);
      await setDoc(userRef, updatedUser, { merge: true });
    } catch (err) {
      console.error("Failed syncing updated profile with Firestore:", err);
      handleFirestoreError(err, OperationType.WRITE, `users/${updatedUser.id}`);
    }
  };

  const handleCoinsPurchased = (coinsCount: number) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      coins: currentUser.coins + coinsCount
    };
    handleUserUpdate(updated);
  };

  const handleLevelXpUpdate = (newLevel: number, newXp: number) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      level: newLevel,
      xp: newXp
    };
    handleUserUpdate(updated);
  };

  const handleCoinsUpdateAfterGift = (newCoinsCount: number) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      coins: newCoinsCount
    };
    handleUserUpdate(updated);
  };

  const handleDiamondsUpdate = (newDiamondsCount: number) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      diamonds: newDiamondsCount
    };
    handleUserUpdate(updated);
  };

  const handleGiftSentNotification = () => {
    if (!currentUser) return;
    const newGiftsSentCount = (currentUser.giftsSentCount || 0) + 1;
    handleUserUpdate({
      ...currentUser,
      giftsSentCount: newGiftsSentCount
    });
  };

  const handleClaimReward = (missionId: string, coinsGold: number, diamondsCyan: number) => {
    if (!currentUser) return;
    const currentClaimed = currentUser.claimedMissions || [];
    if (currentClaimed.includes(missionId)) return;

    const updated = {
      ...currentUser,
      coins: currentUser.coins + coinsGold,
      diamonds: (currentUser.diamonds || 0) + diamondsCyan,
      claimedMissions: [...currentClaimed, missionId]
    };
    handleUserUpdate(updated);
  };

  const handleRemoveStreamer = (streamerId: string) => {
    setStreamersList(prev => prev.filter(s => s.id !== streamerId));
  };

  const handleJoinStreamer = (streamer: Streamer) => {
    setSelectedStreamer(streamer);
    if (!currentUser) return;

    // Track distinct watch channels dynamically in local storage
    const watchedChannelsKey = `watched_channels_${currentUser.id}`;
    let watchedList: string[] = [];
    try {
      const saved = localStorage.getItem(watchedChannelsKey);
      watchedList = saved ? JSON.parse(saved) : [];
    } catch {
      watchedList = [];
    }

    if (!watchedList.includes(streamer.id)) {
      watchedList.push(streamer.id);
      localStorage.setItem(watchedChannelsKey, JSON.stringify(watchedList));
      const newCount = watchedList.length;
      handleUserUpdate({
        ...currentUser,
        watchedCount: newCount
      });
    }
  };

  // Automated synchronization of equipped count mission status
  useEffect(() => {
    if (currentUser && currentUser.activeFrameId && (currentUser.equippedCount || 0) === 0) {
      handleUserUpdate({
        ...currentUser,
        equippedCount: 1
      });
    }
  }, [currentUser?.activeFrameId]);

  const handleLogOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Signout error", e);
    }
    localStorage.removeItem("loopchat_current_user");
    setCurrentUser(null);
    setActiveTab("home");
    setSelectedStreamer(null);
  };

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-stone-950 flex flex-col justify-center py-10">
        <AuthScreen onAuthSuccess={(user) => setCurrentUser(user)} />
      </main>
    );
  }

  return (
    <div id="app-root-shell" className="min-h-screen bg-stone-950 font-sans text-stone-100 flex flex-col justify-between selection:bg-amber-500 selection:text-stone-950">
      
      {/* GLOBAL HIGH-FIDELITY APP HEADER - Hidden in Live experiences */}
      {selectedStreamer === null && activeTab !== "live" && (
        <header id="loopchat-header" className="sticky top-0 z-40 bg-stone-900/90 border-b border-stone-800/80 backdrop-blur-md px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          
          {/* Logo Branding */}
          <div 
            onClick={() => {
              setSelectedStreamer(null);
              setActiveTab("home");
            }}
            className="flex items-center gap-2 cursor-pointer transition-transform active:scale-95 shrink-0"
          >
            <div className="p-2 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-xl text-stone-950 shadow-md animate-pulse">
              <Flame className="w-5 h-5 text-stone-950" />
            </div>
            <span className="text-xl font-black tracking-tight text-white font-sans sm:block hidden">
              Loop<span className="text-amber-400">Chat</span>
            </span>
          </div>

          {/* Dynamic Global Wallet & Stats Badges */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            
            {/* Level indicators */}
            <div className="bg-stone-950/60 border border-stone-800/60 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="text-left leading-none font-sans">
                <span className="text-[8px] text-stone-500 font-bold block uppercase tracking-wider">Level</span>
                <span className="text-[10px] font-black text-stone-200 font-mono">LVL {currentUser.level}</span>
              </div>
            </div>

            {/* Coin Wallet Button trigger */}
            <button
              onClick={() => setIsCoinsModalOpen(true)}
              className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/25 px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 group shrink-0"
              title="Add LoopCoins"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform duration-300 shrink-0" />
              <div className="text-left leading-none font-sans">
                <span className="text-[8px] text-amber-500/60 font-bold block uppercase tracking-wider">Coins</span>
                <span className="text-[10px] font-black text-amber-300 font-mono">{currentUser.coins.toLocaleString()}</span>
              </div>
              <span className="text-amber-400 text-[10px] font-black pl-0.5 select-none">+</span>
            </button>

            {/* Miniature header profile widget */}
            <div 
              onClick={() => {
                setSelectedStreamer(null);
                setActiveTab("profile");
              }}
              className="flex items-center gap-2 pr-1 cursor-pointer hover:opacity-85"
            >
              <img
                src={currentUser.avatarUrl}
                alt="Avatar avatar"
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-stone-700 object-cover bg-stone-900"
              />
              <span className="text-xs font-bold text-stone-300 truncate tracking-wide hidden sm:block max-w-[80px]">
                {currentUser.fullName.split(" ")[0]}
              </span>
            </div>

            {/* Quick exit sign-out */}
            <button
              onClick={handleLogOut}
              className="p-2 border border-stone-800 hover:border-red-500/30 bg-stone-950/20 text-stone-400 hover:text-red-400 rounded-xl transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </header>
      )}

      {/* DETAILED ROOT STREAMER VIEW ROUTING */}
      {selectedStreamer !== null ? (
        /* WATCHING MODE LIVESTREAM ARENA (Adaptive Full Screen Window) */
        <main className="flex-1">
          <LiveStreamSimulator
            currentUser={currentUser}
            activeStreamer={selectedStreamer}
            onClose={() => setSelectedStreamer(null)}
            onCoinsUpdate={handleCoinsUpdateAfterGift}
            onDiamondsUpdate={handleDiamondsUpdate}
            onLevelXpUpdate={handleLevelXpUpdate}
            onGiftSent={handleGiftSentNotification}
          />
        </main>
      ) : activeTab === "live" ? (
        /* BROADCASTING GO LIVE MODE LIVESTREAM ARENA (Adaptive Full Screen Window) */
        <main className="flex-1">
          <LiveStreamSimulator
            currentUser={currentUser}
            activeStreamer={null}
            onClose={() => setActiveTab("home")}
            onCoinsUpdate={handleCoinsUpdateAfterGift}
            onDiamondsUpdate={handleDiamondsUpdate}
            onLevelXpUpdate={handleLevelXpUpdate}
            onGiftSent={handleGiftSentNotification}
          />
        </main>
      ) : (
        /* STANDARD DOCK LAYOUT font */
        <main className="flex-1 py-6 px-4 sm:px-6">
          
          {/* TAB 1: HOME EXPLORE STREAMERS LIST */}
          {activeTab === "home" && (
            <div id="home-view" className="space-y-8 max-w-full sm:px-4 px-2 mx-auto">
              
              {/* Promo Banner Board */}
              <div className="relative bg-gradient-to-r from-stone-900 via-stone-900/40 to-stone-900 border border-stone-800/80 rounded-2xl p-6 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-amber-500/5 blur-[80px]"></div>
                
                <div className="space-y-2 text-center md:text-left">
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] uppercase font-mono tracking-widest rounded-full font-bold">
                    Interactive Live Engine
                  </span>
                  <h2 className="text-2xl font-black text-white leading-tight">
                    Welcome to the Creator Loop!
                  </h2>
                  <p className="text-sm text-stone-400 max-w-xl">
                    Interact, post real comments, and send animated premium gifts to streamers below! Or launch your own personalized broadcast channel to earn coins directly!
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab("live")}
                  className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-stone-950 font-black rounded-xl text-sm transition-all shadow-lg hover:scale-105 select-none shrink-0 cursor-pointer"
                >
                  Start My Live Loop
                </button>
              </div>

              {/* Daily Missions Center Dashboard */}
              <DailyMissions
                watchedCount={currentUser.watchedCount || 0}
                giftsSentCount={currentUser.giftsSentCount || 0}
                equippedCount={currentUser.equippedCount || 0}
                claimedMissions={currentUser.claimedMissions || []}
                onClaimReward={handleClaimReward}
              />

               {/* Grid of streamers online */}
              <div id="creators-directory-deck" className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0"></span>
                    <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                      <Tv className="w-5 h-5 text-red-500" />
                      Creator Live List
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Add Creator Live Button Option */}
                    <button
                      onClick={() => setIsAddCreatorLiveOpen(true)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-550 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" /> Add Creator Live
                    </button>

                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono font-bold bg-amber-500/15 border border-amber-500/25 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      SI-ROOM ACTIVE
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 animate-scaleUp">
                  
                  {/* DYNAMIC OWN LIVE CARD - "live my and standard user lives side-by-side" */}
                  <div
                    className="bg-gradient-to-br from-[#1c1236]/90 via-stone-900 to-[#0e0722] border-2 border-indigo-500/40 rounded-2xl overflow-hidden hover:border-[#FB52FF]/60 transition-all duration-300 shadow-xl flex flex-col justify-between group relative"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="relative aspect-video w-full overflow-hidden bg-[#070412]">
                      <img
                        src={currentUser.avatarUrl}
                        alt="My profile stream banner"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 duration-500"
                      />
                      {/* Live broadcasting label */}
                      <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-650 border border-purple-400/30 text-white font-mono text-[9px] px-2 py-0.5 rounded flex items-center gap-1 font-bold shadow-md animate-pulse">
                        <Video className="w-3 h-3 text-red-100" />
                        LIVE MY (Host)
                      </div>
                      
                      <div className="absolute bottom-2.5 left-2.5 bg-indigo-950/90 text-indigo-300 font-mono text-[9px] px-2 py-0.5 rounded border border-indigo-500/20">
                        My Own Broadcast
                      </div>
                    </div>

                    {/* Description Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <p className="text-xs text-indigo-400 font-mono flex items-center justify-between">
                          {currentUser.username}
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded px-1 font-bold">
                            LVL {currentUser.level}
                          </span>
                        </p>
                        <h4 className="text-sm font-bold text-white mt-1 group-hover:text-amber-400 duration-200 truncate leading-snug">
                          Launch My Live Broadcast Studio! 🎙️⚡
                        </h4>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedStreamer(null);
                          setActiveTab("live");
                        }}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                      >
                        Start Broadcast <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />
                      </button>
                    </div>
                  </div>

                  {streamersList.map((streamer) => (
                    <div
                      key={streamer.id}
                      className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-amber-500/40 transition-all duration-300 shadow-lg flex flex-col justify-between group relative"
                    >
                      {/* Image header banner */}
                      <div className="relative aspect-video w-full overflow-hidden bg-stone-950">
                        <img
                          src={streamer.avatarUrl}
                          alt={streamer.fullName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 duration-500"
                        />
                        {/* Live viewer pill */}
                        <div className="absolute top-2.5 left-2.5 bg-red-600/95 border border-red-500/40 text-white font-mono text-[9px] px-2 py-0.5 rounded flex items-center gap-1 font-bold shadow-md">
                          <Users className="w-3 h-3" />
                          {streamer.viewersCount.toLocaleString()}
                        </div>

                        {/* Elite Bot/Streamer Delete Option ("list live bot delete") */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStreamer(streamer.id);
                          }}
                          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 border border-stone-800 text-stone-300 hover:text-white hover:bg-red-650 hover:border-transparent transition-all cursor-pointer z-10 hover:scale-110 active:scale-90"
                          title="Remove Streamer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Stream tag indicator */}
                        <div className="absolute bottom-2.5 left-2.5 bg-stone-950/80 text-stone-300 font-mono text-[9px] px-2 py-0.5 rounded">
                          {streamer.category}
                        </div>
                      </div>

                      {/* Bio Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <p className="text-xs text-stone-500 font-mono flex items-center justify-between">
                            {streamer.username}
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1 font-bold">
                              LVL {streamer.level}
                            </span>
                          </p>
                          <h4 className="text-sm font-bold text-white mt-1 group-hover:text-amber-400 duration-200 truncate truncate-3-dots font-sans">
                            {streamer.title}
                          </h4>
                        </div>

                        <button
                          onClick={() => handleJoinStreamer(streamer)}
                          className="w-full py-2 bg-stone-950/70 hover:bg-stone-950 group-hover:bg-amber-500 text-stone-300 group-hover:text-stone-950 border border-stone-850/80 group-hover:border-transparent rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Join Live Loop <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: USER PROFILE STUDIO & DETAILS EDITOR */}
          {activeTab === "profile" && (
            <div id="profile-room" className="animate-scaleUp">
              <ProfilePanel
                currentUser={currentUser}
                onProfileUpdate={handleUserUpdate}
                onOpenCoinStore={() => setIsCoinsModalOpen(true)}
              />
            </div>
          )}

        </main>
      )}

      {/* DETAILED BOTTOM DOCKED NAVIGATION BUTTON BAR - Hidden in Live experiences */}
      {selectedStreamer === null && activeTab !== "live" && (
        <footer id="loopchat-nav-footer" className="sticky bottom-0 z-40 bg-stone-900 border-t border-stone-800/80 p-3 sm:p-4 backdrop-blur-md">
          <div className="max-w-md mx-auto flex items-center justify-around gap-2">
            
            <button
              onClick={() => {
                setSelectedStreamer(null);
                setActiveTab("home");
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer flex-1 select-none ${
                activeTab === "home"
                  ? "text-amber-400 bg-amber-500/5"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-850/40"
              }`}
            >
              <Home className="w-5 h-5 mb-1.5" />
              <span className="text-[10px] font-bold tracking-wider font-sans uppercase">Explore</span>
            </button>

            <button
              onClick={() => {
                setSelectedStreamer(null);
                setActiveTab("live");
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer flex-1 select-none ${
                activeTab === "live"
                  ? "text-amber-400 bg-amber-500/5"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-850/40"
              }`}
            >
              <Video className="w-5 h-5 mb-1.5" />
              <span className="text-[10px] font-bold tracking-wider font-sans uppercase">Go Live</span>
            </button>

            <button
              onClick={() => {
                setSelectedStreamer(null);
                setActiveTab("profile");
              }}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer flex-1 select-none ${
                activeTab === "profile"
                  ? "text-amber-400 bg-amber-500/5"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-850/40"
              }`}
            >
              <UserIcon className="w-5 h-5 mb-1.5" />
              <span className="text-[10px] font-bold tracking-wider font-sans uppercase">Profile</span>
            </button>

          </div>
        </footer>
      )}

      {/* GLOBAL COINS modal STORE FRONT */}
      {isCoinsModalOpen && (
        <CoinsModal
          onClose={() => setIsCoinsModalOpen(false)}
          onCoinsPurchased={handleCoinsPurchased}
        />
      )}

      {/* ADD CREATOR LIVE MODAL DIALOG */}
      {isAddCreatorLiveOpen && (
        <div id="add-creator-live-overlay" className="fixed inset-0 z-50 bg-[#070412]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 relative shadow-2xl animate-scaleUp text-left space-y-4 my-8">
            
            <button
              onClick={() => setIsAddCreatorLiveOpen(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-all select-none"
              title="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-stone-850 pb-3">
              <span className="p-2 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-xl text-stone-950">
                <Video className="w-5 h-5 text-stone-950" />
              </span>
              <div>
                <h3 className="text-base font-black text-white leading-tight font-sans">
                  Creator Administration Console
                </h3>
                <p className="text-[11px] text-stone-400 font-medium">Add a simulator studio channel to the livestream database</p>
              </div>
            </div>

            <form onSubmit={handleAddCreatorLive} className="space-y-4 font-sans text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-stone-400 tracking-wider mb-1 select-none">
                    Creator Name / Handle
                  </label>
                  <div className="flex items-center bg-stone-950 border border-stone-800 rounded-xl px-3 py-2">
                    <span className="text-stone-500 mr-1 font-mono font-bold">@</span>
                    <input
                      type="text"
                      required
                      value={newLiveUsername}
                      onChange={(e) => setNewLiveUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      placeholder="e.g. speed_racer"
                      className="w-full bg-transparent text-white text-xs font-semibold focus:outline-none placeholder:text-stone-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-stone-400 tracking-wider mb-1 select-none">
                    Live Stream Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newLiveTitle}
                    onChange={(e) => setNewLiveTitle(e.target.value)}
                    placeholder="e.g. Gaming Cup Championship Finals! 🎮🏆"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-white text-xs font-semibold focus:outline-none placeholder:text-stone-600"
                  />
                </div>
              </div>

              {/* ADMIN: ADD IMAGE FILE & AVATAR SELECTION SYSTEM */}
              <div className="space-y-2 bg-stone-950/40 p-3 rounded-2xl border border-stone-850">
                <div className="flex items-center justify-between">
                  <label className="block text-[9px] font-black uppercase text-amber-400 tracking-wider select-none">
                    🖼️ Admin Creator Gift: Add Image File / Avatar
                  </label>
                  {newLiveAvatarUrl && (
                    <span className="text-[8px] text-green-400 font-mono font-bold bg-green-500/10 px-1.5 py-0.5 rounded uppercase">Avatar Selected</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
                  
                  {/* File Loader simulation */}
                  <div className="relative border-2 border-dashed border-stone-800 hover:border-purple-500/40 rounded-xl p-3 text-center cursor-pointer bg-stone-950 hover:bg-stone-900/60 transition-all group">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSimulatedFileName(file.name);
                          const randVal = Math.floor(Math.random() * 900) + 100;
                          setNewLiveAvatarUrl(`https://picsum.photos/seed/attachment_${randVal}/200/200`);
                        }
                      }}
                    />
                    <div className="space-y-1">
                      <div className="text-lg">📁</div>
                      <span className="text-[10px] font-bold text-stone-200 block truncate max-w-full">
                        {simulatedFileName ? `Attached: ${simulatedFileName}` : "Drag & Drop Image File"}
                      </span>
                      <span className="text-[8px] text-stone-500 block leading-tight">
                        Simulates attachment upload
                      </span>
                    </div>
                  </div>

                  {/* Manual custom avatar URL Input */}
                  <div className="space-y-2">
                    <div>
                      <span className="text-[8px] text-stone-400 block font-bold mb-1 uppercase">Or Paste Direct URL</span>
                      <input
                        type="url"
                        value={newLiveAvatarUrl}
                        onChange={(e) => {
                          setNewLiveAvatarUrl(e.target.value);
                          setSimulatedFileName("");
                        }}
                        placeholder="e.g. https://example.com/avatar.jpg"
                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 text-white text-[10px] font-mono focus:outline-none focus:border-purple-600 placeholder:text-stone-700"
                      />
                    </div>

                    {/* Pre-configured Presets Row */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
                      {[
                        { label: "Gamer Blue", seed: "cyberblue" },
                        { label: "Synth", seed: "sunsets" },
                        { label: "Anime study", seed: "animest" },
                        { label: "Matrix Hacker", seed: "hackers" },
                      ].map((preset) => (
                        <button
                          key={preset.seed}
                          type="button"
                          onClick={() => {
                            setNewLiveAvatarUrl(`https://picsum.photos/seed/${preset.seed}/200/200`);
                            setSimulatedFileName(`${preset.seed}_preset.jpg`);
                          }}
                          className="px-1.5 py-0.5 bg-stone-800 text-[8px] rounded border border-stone-750 text-stone-300 hover:text-white transition-all whitespace-nowrap"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                  </div>

                </div>

                {/* Micro preview card element */}
                {newLiveAvatarUrl && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-stone-950/70 rounded-xl border border-stone-850/80">
                    <img 
                      src={newLiveAvatarUrl} 
                      alt="Creator Avatar Preview" 
                      className="w-8 h-8 rounded-full border border-purple-500/50 object-cover bg-stone-900" 
                    />
                    <div className="text-left font-sans">
                      <div className="text-[8px] uppercase tracking-wider text-stone-500 font-bold leading-none">Avatar Live Link</div>
                      <span className="text-[9px] text-stone-300 truncate block max-w-[280px] font-mono mt-0.5">{newLiveAvatarUrl}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ADMIN: OTHER CONFIGURATION CONTROLLERS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-stone-400 tracking-wider mb-1 select-none">
                    Category Tag
                  </label>
                  <select
                    value={newLiveCategory}
                    onChange={(e) => setNewLiveCategory(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2 py-2 text-white text-xs font-bold focus:outline-none"
                  >
                    <option value="IRL Chatting">IRL Chatting</option>
                    <option value="Music & Beats">Music & Beats</option>
                    <option value="Gaming & Esports">Gaming & Esports</option>
                    <option value="Creative & Art">Creative & Art</option>
                    <option value="Tech & Coding">Tech & Coding</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-stone-400 tracking-wider mb-1 select-none">
                    Creator Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newLiveLevel}
                    onChange={(e) => setNewLiveLevel(Number(e.target.value) || 1)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-white text-xs font-semibold focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* ADMIN: ADD VIDEO SCREEN CONTROLLER & ADD COIN STAT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-950/20 p-3 rounded-2xl border border-stone-850/60">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase text-purple-400 tracking-wider select-none">
                    📺 Add Video Screen Theme
                  </label>
                  <select
                    value={newLiveVideoType}
                    onChange={(e) => setNewLiveVideoType(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-white text-[10px] font-bold focus:outline-none"
                  >
                    <option value="Cosmic Nebula Loop 🌌">Cosmic Nebula Loop 🌌</option>
                    <option value="Neon Cybercity Sunset 🌆">Neon Cybercity Sunset 🌆</option>
                    <option value="Techno Beats Music Deck 🎧">Techno Beats Music Deck 🎧</option>
                    <option value="Retro Cozy Anime Study 🏮">Retro Cozy Anime Study 🏮</option>
                    <option value="Matrix Grid Code Flow 📟">Matrix Grid Code Flow 📟</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase text-amber-400 tracking-wider select-none">
                    🪙 Add Starting Coins Balance
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={newLiveCoins}
                    onChange={(e) => setNewLiveCoins(Math.max(0, Number(e.target.value)))}
                    placeholder="e.g. 5000"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-white text-[10px] font-semibold focus:outline-none font-mono"
                  />
                  <span className="text-[8px] text-stone-500 block leading-none pt-0.5">Displays coins received in screen stats</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-stone-400 tracking-wider mb-1 select-none">
                    Starting Viewers Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={newLiveViewers}
                    onChange={(e) => setNewLiveViewers(Number(e.target.value) || 0)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-white text-xs font-semibold focus:outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-purple-500 hover:to-pink-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer block text-center"
                  >
                    Add Live Creator Studio
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
