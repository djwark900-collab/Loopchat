/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { User, Streamer } from "./types";
import { MOCK_STREAMERS } from "./utils/mockData";
import AuthScreen from "./components/AuthScreen";
import LiveStreamSimulator from "./components/LiveStreamSimulator";
import ProfilePanel from "./components/ProfilePanel";
import CoinsModal from "./components/CoinsModal";
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
  Tv
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "live" | "profile">("home");
  const [selectedStreamer, setSelectedStreamer] = useState<Streamer | null>(null);
  const [isCoinsModalOpen, setIsCoinsModalOpen] = useState(false);
  const [streamersList, setStreamersList] = useState<Streamer[]>(MOCK_STREAMERS);

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
      
      {/* GLOBAL HIGH-FIDELITY APP HEADER */}
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
          <div className="bg-stone-950/40 border border-stone-800/80 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <div className="text-left leading-none sm:block">
              <span className="text-[9px] text-stone-400 block font-mono">My level</span>
              <span className="text-xs font-black text-white font-mono">LVL {currentUser.level}</span>
            </div>
          </div>

          {/* Coin Wallet Button trigger */}
          <button
            onClick={() => setIsCoinsModalOpen(true)}
            className="bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/35 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 group"
          >
            <Coins className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
            <div className="text-left leading-none">
              <span className="text-[9px] text-amber-500/80 font-mono block">Coins balance</span>
              <span className="text-xs font-black text-amber-300 font-mono">{currentUser.coins.toLocaleString()}</span>
            </div>
            <span className="text-amber-400 text-xs font-bold pl-1 sm:block hidden">+ add</span>
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

      {/* DETAILED ROOT STREAMER VIEW ROUTING */}
      {selectedStreamer !== null ? (
        /* WATCHING MODE LIVESTREAM ARENA */
        <main className="flex-1 py-4">
          <LiveStreamSimulator
            currentUser={currentUser}
            activeStreamer={selectedStreamer}
            onClose={() => setSelectedStreamer(null)}
            onCoinsUpdate={handleCoinsUpdateAfterGift}
            onLevelXpUpdate={handleLevelXpUpdate}
          />
        </main>
      ) : (
        /* STANDARD DOCK LAYOUT */
        <main className="flex-1 py-6 px-4 sm:px-6">
          
          {/* TAB 1: HOME EXPLORE STREAMERS LIST */}
          {activeTab === "home" && (
            <div id="home-view" className="space-y-8 max-w-6xl mx-auto">
              
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

              {/* Grid of streamers online */}
              <div id="creators-directory-deck" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                    <Tv className="w-4 h-4 text-amber-500" />
                    LIVE Active Creators
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 font-mono">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Online Simulator
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {streamersList.map((streamer) => (
                    <div
                      key={streamer.id}
                      className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-amber-500/40 transition-all duration-300 shadow-lg flex flex-col justify-between group"
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
                          <h4 className="text-sm font-bold text-white mt-1 group-hover:text-amber-400 duration-200 truncate truncate-3-dots">
                            {streamer.title}
                          </h4>
                        </div>

                        <button
                          onClick={() => setSelectedStreamer(streamer)}
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

          {/* TAB 2: LIVE BROADCASTER SETUP & PORTAL */}
          {activeTab === "live" && (
            <div id="broadcaster-room" className="animate-scaleUp">
              <LiveStreamSimulator
                currentUser={currentUser}
                activeStreamer={null}
                onClose={() => setActiveTab("home")}
                onCoinsUpdate={handleCoinsUpdateAfterGift}
                onLevelXpUpdate={handleLevelXpUpdate}
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

        </main>
      )}

      {/* DETAILED BOTTOM DOCKED NAVIGATION BUTTON BAR */}
      {selectedStreamer === null && (
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

    </div>
  );
}
