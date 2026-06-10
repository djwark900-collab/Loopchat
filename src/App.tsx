/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User, Streamer } from "./types";
import AuthScreen from "./components/AuthScreen";
import LiveStreamSimulator from "./components/LiveStreamSimulator";
import ProfilePanel from "./components/ProfilePanel";
import CoinsModal from "./components/CoinsModal";
import DailyMissions from "./components/DailyMissions";
import { doc, getDoc, setDoc, collection, onSnapshot, query, serverTimestamp, deleteDoc, increment, updateDoc, getDocFromServer } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType, firestoreStatus } from "./lib/firebase";

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
  Play,
  ArrowLeft,
  Send
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "live" | "chat" | "profile">("home");
  const [selectedStreamer, setSelectedStreamer] = useState<Streamer | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isCoinsModalOpen, setIsCoinsModalOpen] = useState(false);
  const [streamersList, setStreamersList] = useState<Streamer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchBoxOpen, setIsSearchBoxOpen] = useState(false);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);

  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isJoiningLive, setIsJoiningLive] = useState(false);
  const [joiningTarget, setJoiningTarget] = useState<Streamer | null>(null);
  const [isBroadcastingStudio, setIsBroadcastingStudio] = useState(false);

  // Dynamic customization for "add creator live" state
  const [isAddCreatorLiveOpen, setIsAddCreatorLiveOpen] = useState(false);
  const [newLiveTitle, setNewLiveTitle] = useState("PUBG Mobile - Road to Conqueror! 🔫🍗");
  const [newLiveUsername, setNewLiveUsername] = useState("");
  const [newLiveCategory, setNewLiveCategory] = useState("Gaming & Esports");
  const [newLiveLevel, setNewLiveLevel] = useState(1);
  const [newLiveViewers, setNewLiveViewers] = useState(0);
  const [newLiveCoins, setNewLiveCoins] = useState(0); 
  const [newLiveVideoType, setNewLiveVideoType] = useState("Cosmic Nebula Loop 🌌");
  const [newLiveAvatarUrl, setNewLiveAvatarUrl] = useState("");
  const [simulatedFileName, setSimulatedFileName] = useState("");

  const handleAddCreatorLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLiveTitle.trim() || !newLiveUsername.trim() || !auth.currentUser) return;
    if (firestoreStatus.isQuotaExceeded) {
       alert("Daily server limit reached! Your live can start but won't be listed globally right now.");
       setIsAddCreatorLiveOpen(false);
       return;
    }

    const formattedUsername = newLiveUsername.replace(/^@/, '');
    const seed = Math.floor(Math.random() * 1000);
    const finalAvatar = newLiveAvatarUrl.trim() || `https://picsum.photos/seed/custom_${seed}/150/150`;
    
    const streamerId = `streamer-${Date.now()}`;
    const newStreamer: any = {
      id: streamerId,
      username: `@${formattedUsername}`,
      fullName: newLiveUsername.charAt(0).toUpperCase() + newLiveUsername.slice(1),
      avatarUrl: finalAvatar,
      level: Number(newLiveLevel) || 1,
      viewersCount: Number(newLiveViewers) || 0,
      title: newLiveTitle.trim(),
      category: newLiveCategory,
      isLive: true,
      startingCoins: Number(newLiveCoins) || 0,
      videoFeedType: newLiveVideoType,
      creatorId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    };

    try {
      if (firestoreStatus.isQuotaExceeded) {
         alert("Daily server limit reached! Your live will be local-only.");
         setIsAddCreatorLiveOpen(false);
         return;
      }
      await setDoc(doc(db, "streamers", streamerId), newStreamer);
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
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `streamers/${streamerId}`);
    }
  };

  // Sync streams from Firestore
  useEffect(() => {
    const q = query(collection(db, "streamers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const streams = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Streamer));
      setStreamersList(streams);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "streamers");
    });
    return () => unsubscribe();
  }, []);

  // Trigger initial majestic loading screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // Sync with Firebase Auth state on mount/init
  useEffect(() => {
    let syncTimeout: any = null;

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDocFromServer(userRef);
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

    return () => {
      unsubscribe();
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, []);

  // Pre-seed "CVV" creator code - only once per app load
  const [hasAttemptedSeed, setHasAttemptedSeed] = useState(false);
  useEffect(() => {
    if (hasAttemptedSeed || firestoreStatus.isQuotaExceeded) return;

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser || hasAttemptedSeed || firestoreStatus.isQuotaExceeded) return;
      
      setHasAttemptedSeed(true);
      const seedCVVCode = async () => {
        if (firestoreStatus.isQuotaExceeded) return;
        try {
          const codeRef = doc(db, "coin_codes", "CVV");
          const codeSnap = await getDoc(codeRef);
          if (!codeSnap.exists()) {
            if (firestoreStatus.isQuotaExceeded) return;
            await setDoc(codeRef, {
              code: "CVV",
              coins: 5000,
              createdAt: serverTimestamp() 
            });
            console.log("Successfully pre-seeded 'CVV' creator code!");
          }
        } catch (err) {
          // Check for quota or permission errors silently
          if (err instanceof Error && (err.message.includes("quota") || err.message.includes("resource-exhausted"))) {
            console.warn("Firestore quota reached - skipping CVV seed.");
          } else {
            console.warn("Notice: CVV code seeding noted:", err);
          }
        }
      };
      seedCVVCode();
    });
    return () => unsubscribe();
  }, [hasAttemptedSeed]);

  // Ref for debouncing Firestore writes
  const persistenceTimeoutRef = React.useRef<any>(null);

  // Sync user state with local storage & Firestore (DEBOUNCED with optional immediate speed-save)
  const handleUserUpdate = async (updatedUser: User, immediate = false) => {
    // 1. Update local reactive state immediately for snappy UI
    setCurrentUser(updatedUser);
    localStorage.setItem("loopchat_current_user", JSON.stringify(updatedUser));
    
    // 2. Persist to Firestore
    if (firestoreStatus.isQuotaExceeded) {
       return;
    }

    if (persistenceTimeoutRef.current) {
      clearTimeout(persistenceTimeoutRef.current);
    }

    const saveToFirestore = async () => {
      if (firestoreStatus.isQuotaExceeded) return;
      try {
        const userRef = doc(db, "users", updatedUser.id);
        await setDoc(userRef, updatedUser, { merge: true });
        console.debug("User profile successfully synced to Cloud Firestore.");
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${updatedUser.id}`);
      }
    };

    if (immediate) {
      await saveToFirestore();
    } else {
      persistenceTimeoutRef.current = setTimeout(saveToFirestore, 15000);
    }
  };

  const handleCoinsPurchased = (coinsCount: number) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      coins: currentUser.coins + coinsCount
    };
    handleUserUpdate(updated, true); // save coin/balance immediately!
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
    handleUserUpdate(updated, true); // Save coin immediately!
  };

  const handleDiamondsUpdate = (newDiamondsCount: number) => {
    if (!currentUser) return;
    const updated = {
      ...currentUser,
      diamonds: newDiamondsCount
    };
    handleUserUpdate(updated, true); // Save immediately!
  };

  const handleGiftSentNotification = () => {
    if (!currentUser) return;
    const newGiftsSentCount = (currentUser.giftsSentCount || 0) + 1;
    handleUserUpdate({
      ...currentUser,
      giftsSentCount: newGiftsSentCount
    }, true); // Save immediately!
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

  const handleRemoveStreamer = async (streamerId: string) => {
    if (firestoreStatus.isQuotaExceeded) return;
    try {
      await deleteDoc(doc(db, "streamers", streamerId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `streamers/${streamerId}`);
    }
  };

  const handleJoinStreamer = async (streamer: Streamer) => {
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

  if (isAppLoading) {
    return (
      <main id="loader-screen" className="fixed inset-0 z-50 bg-[#0c0816] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1d123a] via-[#090513] to-[#040209] flex flex-col justify-between items-center py-24 px-6 font-sans">
        <div className="flex-1 flex flex-col justify-center items-center">
          {/* Glowing Animated Outer Container */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Outer neon glow loops */}
            <div className="absolute inset-0 bg-[#FB52FF]/10 rounded-full filter blur-2xl animate-pulse duration-2000"></div>
            <div className="absolute inset-2 bg-[#00F0FF]/15 rounded-full filter blur-xl"></div>
            
            {/* Metallic Circle Speech Bubble */}
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-tr from-[#0e0722] via-[#1a1336] to-[#25194f] border-4 border-[#382b6c]/60 shadow-[0_20px_40px_rgba(0,0,0,0.7)] flex items-center justify-center">
              {/* Outer neon line border */}
              <div className="absolute inset-0 rounded-full p-[3px] bg-gradient-to-tr from-[#FB52FF] via-[#7000FF] to-[#00F0FF] opacity-90">
                <div className="w-full h-full rounded-full bg-[#0e0722] flex items-center justify-center">
                  
                  {/* Infinity Loop Symbol */}
                  <svg className="w-20 h-20 text-white filter drop-shadow-[0_6px_12px_rgba(251,82,255,0.4)]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
                    <defs>
                      <linearGradient id="infinityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FB52FF" />
                        <stop offset="50%" stopColor="#AD00FF" />
                        <stop offset="100%" stopColor="#00F0FF" />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M 50 25 C 25 -2, 5 10, 5 25 C 5 40, 25 52, 50 25 C 75 -2, 95 10, 95 25 C 95 40, 75 52, 50 25 Z" 
                      fill="none" 
                      stroke="url(#infinityGrad)" 
                      strokeWidth="9" 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M 50 25 C 25 -2, 5 10, 5 25 C 5 40, 25 52, 50 25 C 75 -2, 95 10, 95 25 C 95 40, 75 52, 50 25 Z" 
                      fill="none" 
                      stroke="#ffffff" 
                      strokeWidth="2.5" 
                      strokeOpacity="0.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  
                </div>
              </div>
              
              {/* Speech bubble tail */}
              <div className="absolute -bottom-2.5 left-[38%] w-0 h-0 border-l-[12px] border-l-transparent border-t-[14px] border-t-[#7000FF] border-r-[12px] border-r-transparent transform rotate-[-8deg]"></div>
            </div>
          </div>

          {/* Glowing brand text */}
          <h2 className="text-4xl font-black tracking-widest mt-8 font-sans drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] animate-scaleUp">
            <span className="text-[#FB52FF] relative">
              Loop
              <span className="absolute -inset-1 bg-[#FB52FF]/25 blur-lg opacity-40"></span>
            </span>
            <span className="text-[#00F0FF] relative ml-0.5">
              Chat
              <span className="absolute -inset-1 bg-[#00F0FF]/25 blur-lg opacity-40"></span>
            </span>
          </h2>
        </div>

        {/* 12 Dots Rotating Progress indicator matching Image 1 */}
        <div className="relative w-12 h-12 flex items-center justify-center mt-auto">
          <svg className="w-10 h-10 text-[#7c66ff] animate-spin" viewBox="0 0 100 100" style={{ animationDuration: "1.2s" }}>
            <circle cx="50" cy="10" r="4.5" fill="currentColor" opacity="1" />
            <circle cx="70" cy="15.4" r="4.5" fill="currentColor" opacity="0.9" />
            <circle cx="84.6" cy="30" r="4.5" fill="currentColor" opacity="0.8" />
            <circle cx="90" cy="50" r="4.5" fill="currentColor" opacity="0.75" />
            <circle cx="84.6" cy="70" r="4.5" fill="currentColor" opacity="0.65" />
            <circle cx="70" cy="84.6" r="4.5" fill="currentColor" opacity="0.55" />
            <circle cx="50" cy="90" r="4.5" fill="currentColor" opacity="0.45" />
            <circle cx="30" cy="84.6" r="4.5" fill="currentColor" opacity="0.35" />
            <circle cx="15.4" cy="70" r="4.5" fill="currentColor" opacity="0.25" />
            <circle cx="10" cy="50" r="4.5" fill="currentColor" opacity="0.2" />
            <circle cx="15.4" cy="30" r="4.5" fill="currentColor" opacity="0.15" />
            <circle cx="30" cy="15.4" r="4.5" fill="currentColor" opacity="0.1" />
          </svg>
        </div>
      </main>
    );
  }

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
            
            {/* Cloud Sync Status Indicator */}
            {firestoreStatus.isQuotaExceeded && (
              <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-[8px] font-black uppercase tracking-widest animate-pulse">
                Offline Mode
              </div>
            )}

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
        /* 
          ENHANCED LIVE DISCOVERY HUB: 
          Provides immersive "all user live" experience with trending and discovery sections.
        */
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0c0816]">
          {/* Immersive Header for Live Discovery - Styled exactly as Image 2 */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#2d2254]/40 bg-black/50 backdrop-blur-xl sticky top-0 z-30">
             <div className="flex items-center gap-2.5">
               <button
                 type="button"
                 onClick={() => {
                   setSelectedStreamer(null);
                   setActiveTab("home");
                 }}
                 className="mr-1.5 p-2 bg-[#1e133c]/80 hover:bg-[#2d1e57] text-[#9366ff] hover:text-white rounded-full transition-all hover:scale-105 active:scale-95 border border-[#2d1c5a]/40 cursor-pointer flex items-center justify-center shadow"
                 title="Back to Explore"
               >
                 <ArrowLeft className="w-4 h-4" />
               </button>
               <div className="relative">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute inset-0 opacity-75"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-red-600 relative"></div>
               </div>
               <div>
                  <h3 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-violet-400 via-[#9366FF] to-fuchsia-400 bg-clip-text text-transparent font-sans tracking-wide">
                     Live Streaming
                  </h3>
               </div>
             </div>

             <div className="flex items-center gap-2">
                {/* 1. Toggleable Search Field */}
                {isSearchBoxOpen ? (
                  <div className="flex items-center gap-1 bg-[#1e153a] border border-[#443180] rounded-full px-2.5 py-1 animate-scaleUp">
                    <Search className="w-3.5 h-3.5 text-[#9366ff]" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search live..."
                      className="bg-transparent border-none text-[10px] text-white font-bold uppercase tracking-wider focus:outline-none w-20 sm:w-32"
                      autoFocus
                    />
                    <button onClick={() => { setSearchTerm(""); setIsSearchBoxOpen(false); }} className="text-stone-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSearchBoxOpen(true)}
                    className="p-2 bg-[#1e133c] hover:bg-[#2d1e57] text-[#9366ff] rounded-full transition-all hover:scale-105 active:scale-95"
                    title="Search streamers"
                  >
                     <Search className="w-4 h-4" />
                  </button>
                )}

                {/* 2. "Go Live" Toggle Capsule/Pill (matches screenshot radio switch) */}
                <button
                  onClick={() => setIsBroadcastingStudio(true)}
                  className="px-3 py-1.5 bg-[#4c31ab] hover:bg-[#5b3bc9] text-white font-extrabold rounded-full text-[11px] font-sans transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-[#6b49eb]"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm block animate-pulse"></span>
                  <span className="tracking-tight pr-1">Go Live</span>
                </button>

                {/* 3. QR Code scanner button (lavender/purple container) */}
                <button
                  onClick={() => setIsQRCodeOpen(true)}
                  className="p-2 bg-[#1e133c] hover:bg-[#2d1e57] text-[#9366ff] rounded-xl transition-all border border-[#2d1c5a] hover:scale-105 active:scale-95"
                  title="Share/Scan QR Code"
                >
                   <QrCode className="w-4 h-4" />
                </button>
             </div>
          </div>



          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-10 pb-32">
             


             {/* 2. DISCOVERY DIRECTORY - ALL USER LIST */}
             <section className="space-y-5">
                <div className="flex items-center justify-between px-1">
                   <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                        <Users className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">All User Live</h4>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl">
                         <Search className="w-3.5 h-3.5 text-stone-500" />
                         <input 
                            type="text"
                            placeholder="SEARCH USERS..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-none text-[9px] text-white font-black uppercase tracking-widest focus:outline-none w-24 sm:w-32"
                         />
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {streamersList.filter(live => {
                    const matchesSearch = live.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      live.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      live.title.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesSearch;
                  }).map((live) => (
                    <div 
                      key={live.id} 
                      onClick={() => setSelectedStreamer(live)}
                      className="bg-[#110d1f]/60 border border-stone-850/50 rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all group cursor-pointer shadow-xl relative"
                    >
                      {/* Live Badge for own content if applicable */}
                      {live.creatorId === auth.currentUser?.uid && (
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-indigo-650 text-white text-[7px] font-black rounded uppercase tracking-wider backdrop-blur-sm shadow">My Live</span>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm("Are you sure you want to stop and delete your live stream?")) {
                                await handleRemoveStreamer(live.id);
                              }
                            }}
                            className="p-1.5 bg-red-650 hover:bg-rose-500 text-white rounded-md transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center shadow-md border border-red-500/20"
                            title="Delete Live Stream"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                      <div className="relative aspect-video">
                         <img src={live.avatarUrl} className="w-full h-full object-cover group-hover:brightness-110 duration-500" />
                         <div className="absolute inset-0 bg-gradient-to-t from-[#0c0816] to-transparent opacity-80" />
                         <div className="absolute bottom-3 left-3 right-3">
                            <p className="text-[10px] font-black text-white truncate leading-tight mb-1">{live.title}</p>
                            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">{live.category.split(' ')[0]}</span>
                         </div>
                      </div>
                      <div className="p-3 flex items-center justify-between border-t border-stone-850/30">
                         <div className="flex items-center gap-2 overflow-hidden">
                           <img src={live.avatarUrl} className="w-7 h-7 rounded-full border border-stone-800 object-cover" />
                           <div className="overflow-hidden">
                              <p className="text-[10px] font-bold text-stone-200 truncate">{live.fullName}</p>
                              <p className="text-[8px] text-stone-500 font-mono truncate">@{live.username}</p>
                           </div>
                         </div>
                         <div className="flex flex-col items-end">
                            <div className="text-[9px] font-black text-stone-300 flex items-center gap-1">
                               <Users className="w-2.5 h-2.5" /> {live.viewersCount}
                            </div>
                         </div>
                      </div>
                    </div>
                  ))}

                    {streamersList.filter(live => {
                      const matchesSearch = live.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        live.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        live.title.toLowerCase().includes(searchTerm.toLowerCase());
                      return matchesSearch;
                    }).length === 0 && (
                     <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                        {/* Gorgeous vector-styled illustration of empty results from Image 2 */}
                        <svg className="w-48 h-48 mx-auto mb-4 opacity-90 animate-pulse duration-4000" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                           {/* Skewed stack of document-like cards in soft lavender & purple */}
                           <rect x="52" y="42" width="75" height="100" rx="10" fill="#1b1236" stroke="#362561" strokeWidth="2.5" transform="rotate(-6 52 42)" opacity="0.6" />
                           <rect x="68" y="32" width="75" height="100" rx="10" fill="#24194a" stroke="#4a358c" strokeWidth="2.5" transform="rotate(3 68 32)" />
                           
                           {/* Decorative document grids */}
                           <line x1="82" y1="52" x2="122" y2="52" stroke="#4a358c" strokeWidth="4.5" strokeLinecap="round" />
                           <line x1="82" y1="67" x2="112" y2="67" stroke="#4a358c" strokeWidth="4.5" strokeLinecap="round" />
                           <line x1="82" y1="82" x2="102" y2="82" stroke="#4a358c" strokeWidth="4.5" strokeLinecap="round" />
                           
                           {/* Secondary decorative elements */}
                           <circle cx="128" cy="82" r="10" fill="#9366ff" opacity="0.15" />
                           <circle cx="48" cy="112" r="6" fill="#9366ff" opacity="0.2" />
                           <circle cx="158" cy="68" r="4.5" fill="#a78bfa" opacity="0.35" />
                           <circle cx="148" cy="132" r="5" fill="#9366ff" opacity="0.1" />

                           {/* Magnifying glass handle with white metallic highlight */}
                           <path d="M 125,125 L 158,158" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" />
                           <path d="M 132,132 L 152,152" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                           
                           {/* Magnifying glass circle frame */}
                           <circle cx="108" cy="108" r="28" fill="#130b2e" stroke="#8b5cf6" strokeWidth="7" />
                           <circle cx="108" cy="108" r="24" fill="#1d1245" />
                           
                           {/* Bold "X" inside magnifying glass */}
                           <path d="M 96,96 L 120,120" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" />
                           <path d="M 120,96 L 96,120" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" />
                        </svg>
                        <p className="text-base text-[#dcd7f5] font-extrabold tracking-wide mt-2">No live streaming found</p>
                        <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">Start your studio loop or modify search criteria</p>
                     </div>
                   )}
                </div>
             </section>
          </div>

          {/* BROADCAST STUDIO OVERLAY */}
          {isBroadcastingStudio && (
            <div className="absolute inset-0 z-50 bg-[#0c0816] flex flex-col h-full w-full">
               <div className="flex-1 overflow-y-auto px-4 py-4">
                 <LiveStreamSimulator
                   currentUser={currentUser}
                   activeStreamer={null}
                   onClose={() => setIsBroadcastingStudio(false)}
                   onCoinsUpdate={handleCoinsUpdateAfterGift}
                   onDiamondsUpdate={handleDiamondsUpdate}
                   onLevelXpUpdate={handleLevelXpUpdate}
                   onGiftSent={handleGiftSentNotification}
                 />
               </div>
            </div>
          )}
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

          {/* TAB 4: PRIVATE MESSAGES CHAT CENTER */}
          {activeTab === "chat" && (
            <div id="messages-hub" className="animate-scaleUp max-w-4xl mx-auto p-4 space-y-4">
              <div className="bg-[#FAF9FC] text-[#1E192B] rounded-3xl border border-[#E2E1EC] p-6 shadow-md shadow-[#ECE8F7]/40 min-h-[520px] flex flex-col">
                
                {/* Header with Settings Gear icon representation */}
                <div className="flex items-center justify-between border-b border-[#F0EEF7] pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-black text-[#1E192B] font-sans tracking-tight">Direct Messages</h2>
                    <p className="text-xs text-[#5C5766] font-medium font-sans mt-0.5">Connect with live stream enthusiasts and creator friends</p>
                  </div>
                  <div className="p-2.5 bg-[#7B3FFE]/10 rounded-full text-[#7B3FFE]">
                    <MessageSquare className="w-5 h-5 stroke-[2.5]" />
                  </div>
                </div>

                {/* Simulated conversations lists / active thread view */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
                  
                  {/* Left sidebar: Threads List */}
                  <div className="md:col-span-12 lg:col-span-5 border-r border-[#F0EEF7]/85 pr-0 lg:pr-4 flex flex-col space-y-3.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input 
                        type="text" 
                        placeholder="Search conversations..." 
                        className="w-full bg-[#FAF9FC]/15 border border-[#E2E1EC] focus:border-[#7B3FFE] rounded-2xl py-2 pl-10 pr-4 text-xs font-semibold focus:outline-none placeholder-stone-400"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 max-h-[380px]">
                      {[
                        { id: "Sarah", name: "Sarah 👑", role: "Streaming Coach", lastMsg: "Check out the new avatar boutiques!", time: "10:42 AM", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80", online: true },
                        { id: "Alex", name: "Alex ⚡", role: "Gamer League", lastMsg: "Awesome streams, let's co-host tomorrow!", time: "Yesterday", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80", online: true },
                        { id: "Maya", name: "Maya ♦", role: "Music Producer", lastMsg: "Loved that ambient loop sound!", time: "June 8", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80", online: false },
                        { id: "Admin", name: "Admin Bot 🤖", role: "System Support", lastMsg: "Congratulations on setting up your loop applet!", time: "June 5", avatar: "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=120&auto=format&fit=crop&q=80", online: true }
                      ].map((thr) => (
                        <div
                          key={thr.id}
                          className="w-full text-left p-2.5 rounded-2xl hover:bg-[#F2EFFC]/60 transition-all flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <img src={thr.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 shadow-sm" />
                              {thr.online && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#FAF9FC]"></span>
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="text-xs font-black text-stone-800 flex items-center gap-1">{thr.name}</h4>
                              <p className="text-[10px] text-[#7B3FFE] font-bold">{thr.role}</p>
                              <p className="text-[10px] text-stone-500 truncate mt-0.5">{thr.lastMsg}</p>
                            </div>
                          </div>
                          <span className="text-[9px] text-stone-400 font-bold shrink-0 self-start mt-1">{thr.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Dynamic active chat simulation panel */}
                  <div className="md:col-span-12 lg:col-span-7 flex flex-col bg-white border border-[#E2E1EC]/60 rounded-2xl p-4 min-h-[385px] relative">
                    <div className="flex items-center justify-between border-b border-[#F0EEF7] pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-black text-stone-800">Sarah 👑</p>
                          <span className="text-[8px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1 leading-none">● Online</span>
                        </div>
                      </div>
                    </div>

                    {/* Chat History Container */}
                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[220px]">
                      <div className="flex justify-center my-1">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-[8px] font-black text-stone-400 uppercase tracking-widest rounded-full">Today at 10:40 AM</span>
                      </div>

                      {/* Received message layout */}
                      <div className="flex items-start gap-2.5 max-w-[85%]">
                        <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80" className="w-6 h-6 rounded-full object-cover mt-0.5" />
                        <div className="bg-[#ECEEFB]/95 text-[#1a142e] rounded-2xl rounded-tl-none p-3 shadow-sm">
                          <p className="text-xs font-medium leading-relaxed">Hey! Welcome to the loop streaming chat arena. Have you checked out the custom avatars frames yet?</p>
                        </div>
                      </div>

                      {/* Outgoing message */}
                      <div className="flex items-start gap-2.5 max-w-[85%] ml-auto justify-end">
                        <div className="bg-[#7B3FFE] text-white rounded-2xl rounded-tr-none p-3 shadow-md">
                          <p className="text-xs font-medium leading-relaxed">Yes I have! This live simulator is extremely responsive, and the loop coins wallet update instantly!</p>
                        </div>
                        <span className="w-6 h-6 rounded-full bg-indigo-150 flex items-center justify-center text-[10px] mt-0.5 select-none">👤</span>
                      </div>

                      {/* Real-time responses array */}
                      <div className="flex items-start gap-2.5 max-w-[85%]">
                        <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80" className="w-6 h-6 rounded-full object-cover mt-0.5" />
                        <div className="bg-[#ECEEFB]/95 text-[#1a142e] rounded-2xl rounded-tl-none p-3 shadow-sm">
                          <p className="text-xs font-medium leading-relaxed">Perfect! Check out the All User Live directory. Launch your own broadcast or interact with others securely anytime! 🌟</p>
                        </div>
                      </div>
                    </div>

                    {/* Input message form in bottom */}
                    <div className="mt-3.5 pt-3 border-t border-[#F0EEF7] flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Type a custom message..." 
                        id="messages-direct-send-input"
                        className="flex-1 bg-stone-50 border border-slate-200 focus:border-[#7B3FFE] rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none placeholder-stone-400 text-stone-850"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById("messages-direct-send-input") as HTMLInputElement;
                          if (input) input.value = "";
                        }}
                        className="p-2 bg-[#7B3FFE] hover:bg-[#6833E0] text-white rounded-xl shadow transition-transform active:scale-95 duration-100 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 fill-white text-white" />
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            </div>
          )}

        </main>
      )}

      {/* DETAILED BOTTOM DOCKED NAVIGATION BUTTON BAR - Matches Image 1 / Image 2 custom tap bar */}
      {selectedStreamer === null && (
        <footer id="loopchat-nav-footer" className="sticky bottom-0 z-40 bg-[#FAF9FC] border-t border-[#F0EEF7] py-2 sm:py-3.5 px-4 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] select-none">
          <div className="max-w-md mx-auto flex items-center justify-between gap-1">
            
            {/* Tab 1: Explore/Home (Play Speech Bubble Gradient Icon) */}
            <button
              onClick={() => {
                setSelectedStreamer(null);
                setActiveTab("home");
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer relative shrink-0 active:scale-95 duration-150"
              title="Explore/Home"
            >
              <svg className="w-8 h-8 sm:w-9 sm:h-9" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="bubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <path 
                  d="M18 6C10.268 6 4 11.373 4 18c0 3.018 1.304 5.77 3.422 7.828l-1.122 3.366a1 1 0 001.296 1.258l4.032-1.728C13.565 29.567 15.717 30 18 30c7.732 0 14-5.373 14-12S25.732 6 18 6z" 
                  fill={activeTab === "home" ? "url(#bubbleGrad)" : "#B2B7D9"} 
                  className="transition-colors duration-250"
                />
                <path d="M15 13.5v9l7.5-4.5-7.5-4.5z" fill="white" />
              </svg>
            </button>

            {/* Tab 2: Go Live/Watch Streams List (TV with twin antennas icon) */}
            <button
              onClick={() => {
                setSelectedStreamer(null);
                setActiveTab("live");
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer relative shrink-0 active:scale-95 duration-150"
              title="Livestreams"
            >
              <svg className="w-8 h-8 sm:w-9 sm:h-9" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 6.5l4 4.5M25 6.5l-4 4.5" stroke={activeTab === "live" ? "#9333EA" : "#B2B7D9"} strokeWidth="2.5" strokeLinecap="round" />
                <rect x="5" y="11" width="26" height="19" rx="6" fill={activeTab === "live" ? "#ECE9FA" : "#D4D9F0"} stroke={activeTab === "live" ? "#8B5CF6" : "#A6AECE"} strokeWidth="2" />
                <path d="M13 20.5a3 3 0 010-4M23 16.5a3 3 0 010 4" stroke={activeTab === "live" ? "#8B5CF6" : "#727BB5"} strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16 16v9l6-4.5-6-4.5z" fill={activeTab === "live" ? "#8B5CF6" : "#727BB5"} />
              </svg>
            </button>

            {/* Tab 3: Central Broadcast Button (Plus action trigger to Add Live) */}
            <button
              onClick={() => {
                setIsAddCreatorLiveOpen(true);
              }}
              className="flex items-center justify-center p-1 cursor-pointer select-none active:scale-90 duration-200 shrink-0 transform -translate-y-1.5"
              title="Add simulated stream to database"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#9366ff] to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/30 relative">
                {/* Dashed outer orbit matching first image */}
                <div className="absolute inset-1 rounded-full border border-dashed border-white/60 animate-spin-slow"></div>
                {/* Inner white circle */}
                <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white flex items-center justify-center shadow-inner">
                  <Plus className="w-4 h-4 text-[#9366ff] stroke-[3]" />
                </div>
              </div>
            </button>

            {/* Tab 4: Messages Overlay / Chat center */}
            <button
              onClick={() => {
                setSelectedStreamer(null);
                setActiveTab("chat");
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer relative shrink-0 active:scale-95 duration-150"
              title="Chat Messages"
            >
              <svg className="w-8 h-8 sm:w-9 sm:h-9" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 13.5c4.694 0 8.5 2.91 8.5 6.5s-3.806 6.5-8.5 6.5c-1.393 0-2.67-.257-3.791-.708L10.5 27.5a.4.4 0 01-.518-.504l.712-2.136C9.524 23.712 9 22.17 9 20c0-3.59 3.806-6.5 8.5-6.5z" fill={activeTab === "chat" ? "#7C3AED" : "#D4D9F0"} />
                <path d="M14 8c4.694 0 8.5 2.91 8.5 6.5a6.007 6.007 0 01-1.353 3.738l.712 2.137a.4.4 0 01-.518.503l-3.791-.708c-1.12.45-2.398.707-3.791.707-4.694 0-8.5-2.91-8.5-6.5S9.306 8 14 8z" fill={activeTab === "chat" ? "#8B5CF6" : "#BAC3EA"} />
                <circle cx="10" cy="14.5" r="1.2" fill="white" />
                <circle cx="14" cy="14.5" r="1.2" fill="white" />
                <circle cx="18" cy="14.5" r="1.2" fill="white" />
              </svg>
            </button>

            {/* Tab 5: Profile Panel (Silhouette circle badge) */}
            <button
              onClick={() => {
                setSelectedStreamer(null);
                setActiveTab("profile");
              }}
              className="flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer relative shrink-0 active:scale-95 duration-150"
              title="Profile"
            >
              <svg className="w-8 h-8 sm:w-9 sm:h-9" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="18" cy="18" r="14" fill={activeTab === "profile" ? "#8B5CF6" : "#BAC3EA"} />
                <mask id="profMask" maskUnits="userSpaceOnUse" x="4" y="4" width="28" height="28">
                  <circle cx="18" cy="18" r="14" fill="white" />
                </mask>
                <g mask="url(#profMask)">
                  <circle cx="18" cy="14.5" r="4.5" fill="white" />
                  <path d="M18 21.5c-5.5 0-10 4.2-10 9.5h20c0-5.3-4.5-9.5-10-9.5z" fill="white" />
                </g>
              </svg>
            </button>

          </div>
        </footer>
      )}

      {/* DYNAMIC SHARING COMPANION QR CODE MODAL SIMULATOR */}
      {isQRCodeOpen && (
        <div id="qrcode-companion-modal" className="fixed inset-0 z-50 bg-[#070412]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#120a2a] border border-[#43239a]/60 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl animate-scaleUp text-center space-y-5">
            
            <button
              onClick={() => setIsQRCodeOpen(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-[#201446] transition-all select-none"
              title="Close Sharing Console"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center space-y-2 border-b border-[#2d1c5c]/40 pb-3">
              <div className="p-2.5 bg-[#9366ff]/10 rounded-2xl text-[#9366ff] mb-1">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-white leading-tight font-sans">
                Stream Sharing Link
              </h3>
              <p className="text-[11px] text-[#9366ff] font-bold uppercase tracking-wider">
                Companion Invite
              </p>
            </div>

            {/* Premium QR Code Container Card */}
            <div className="relative bg-white p-5 rounded-2xl shadow-inner max-w-[210px] mx-auto group overflow-hidden">
               {/* Animated moving green laser line */}
               <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_8px_cyan] animate-[bounce_2.5s_infinite] pointer-events-none z-10" />

               {/* Custom SVG High-Fidelity App QR Grid */}
               <svg className="w-full h-full text-stone-900" viewBox="0 0 100 100" fill="currentColor">
                  {/* Position detection outer boxes */}
                  <rect x="0" y="0" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="5" y="5" width="15" height="15" fill="currentColor" />
                  
                  <rect x="75" y="0" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="80" y="5" width="15" height="15" fill="currentColor" />
                  
                  <rect x="0" y="75" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="5" y="80" width="15" height="15" fill="currentColor" />

                  {/* Simulated standard QR grid structures with high texture density */}
                  <rect x="30" y="2" width="6" height="6" />
                  <rect x="42" y="5" width="6" height="12" />
                  <rect x="54" y="0" width="12" height="6" />
                  <rect x="30" y="14" width="6" height="6" />
                  <rect x="54" y="12" width="6" height="12" />
                  <rect x="66" y="6" width="6" height="6" />

                  <rect x="0" y="32" width="12" height="6" />
                  <rect x="18" y="30" width="12" height="12" />
                  <rect x="36" y="34" width="12" height="6" />
                  <rect x="54" y="30" width="18" height="6" />
                  <rect x="78" y="32" width="12" height="12" />

                  <rect x="4" y="48" width="12" height="6" />
                  <rect x="22" y="44" width="6" height="12" />
                  <rect x="34" y="50" width="12" height="12" />
                  <rect x="52" y="44" width="6" height="6" />
                  <rect x="64" y="48" width="18" height="12" />

                  <rect x="30" y="64" width="12" height="12" />
                  <rect x="48" y="60" width="8" height="8" />
                  <rect x="60" y="64" width="12" height="6" />
                  <rect x="76" y="60" width="6" height="18" />

                  <rect x="30" y="80" width="6" height="12" />
                  <rect x="42" y="84" width="12" height="6" />
                  <rect x="60" y="78" width="12" height="12" />
                  <rect x="84" y="84" width="12" height="6" />

                  {/* Beautiful customized App logo shield in the dead center */}
                  <rect x="38" y="38" width="24" height="24" fill="white" rx="4" />
                  {/* Glowing center speech bubble icon */}
                  <circle cx="50" cy="50" r="9" fill="#9366ff" />
                  {/* Symmetrical white infinity path inside badge */}
                  <path 
                     d="M 50 50 C 45 45, 42 47, 42 50 C 42 53, 45 55, 50 50 C 55 45, 58 47, 58 50 C 58 53, 55 55, 50 50 Z" 
                     fill="none" 
                     stroke="white" 
                     strokeWidth="1.5" 
                  />
               </svg>
            </div>

            <div className="space-y-2">
               <p className="text-[11px] text-stone-300 font-bold leading-normal px-2">
                  Open your camera to scan and share this live lobby with your community instantly!
               </p>
               <p className="text-[9px] text-[#9366ff] uppercase tracking-widest font-mono font-bold">
                  Secure Broadcast Access Key
               </p>
            </div>

            <button
              onClick={() => setIsQRCodeOpen(false)}
              className="w-full py-2.5 bg-gradient-to-r from-[#9366ff] to-[#be2dfc] hover:from-[#8456f5] hover:to-[#ae22eb] text-white rounded-xl text-xs font-black tracking-wider uppercase transition-all shadow-lg shadow-indigo-950/40"
            >
              Done Sharing
            </button>
          </div>
        </div>
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
