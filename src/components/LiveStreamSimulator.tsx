/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, Streamer, ChatMessage, Gift } from "../types";
import { VIRTUAL_GIFTS, SIMULATED_CHAT_MESSAGES, CHATTER_USERNAMES } from "../utils/mockData";
import { getXpNeededForLevel, LEVEL_REQUIREMENTS } from "../utils/levelUtils";
import { doc, setDoc, collection, onSnapshot, query, serverTimestamp, deleteDoc, updateDoc, increment, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth, firestoreStatus } from "../lib/firebase";
import {
  Power,
  MessageSquare,
  Users,
  Coins,
  ChevronRight,
  X,
  Send,
  Mic,
  Camera,
  Share2,
  Plus,
  Wand2,
  Armchair,
  Video,
  Lock,
  UserPlus,
  Home,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Menu
} from "lucide-react";

const KurdistanFlagSVG = () => (
  <svg viewBox="0 0 100 100" className="w-[30px] h-[30px] rounded-full overflow-hidden border border-amber-500/25 shadow-md shrink-0 select-none">
    {/* Red stripe (top 1/3) */}
    <rect x="0" y="0" width="100" height="33.3" fill="#E31A19" />
    {/* White stripe (middle 1/3) */}
    <rect x="0" y="33.3" width="100" height="33.3" fill="#FFFFFF" />
    {/* Green stripe (bottom 1/3) */}
    <rect x="0" y="66.6" width="100" height="33.4" fill="#0C8E36" />
    {/* Sun in center */}
    <circle cx="50" cy="50" r="14" fill="#FFD700" />
    {/* Sun rays - 21 rays */}
    {Array.from({ length: 21 }).map((_, i) => {
      const angle = (i * 360) / 21;
      return (
        <line
          key={i}
          x1="50"
          y1="50"
          x2={50 + 17 * Math.cos((angle * Math.PI) / 180)}
          y2={50 + 17 * Math.sin((angle * Math.PI) / 180)}
          stroke="#FFD700"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      );
    })}
    {/* Small center circle overlay */}
    <circle cx="50" cy="50" r="7" fill="#FFD700" />
  </svg>
);

const get3DGiftImage = (giftName: string, defaultIcon?: string) => {
  const name = giftName.toLowerCase();
  if (name.includes("teapot") || name.includes("tea set") || name.includes("cup of tea")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Teapot/3D/teapot_3d.png";
  }
  if (name.includes("love box") || name.includes("heart ribbon")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Heart%20with%20ribbon/3D/heart_with_ribbon_3d.png";
  }
  if (name.includes("rosaline") || name.includes("rose")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Rose/3D/rose_3d.png";
  }
  if (name.includes("99 roses") || name.includes("flowers") || name.includes("bouquet") || name.includes("bunch")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bouquet/3D/bouquet_3d.png";
  }
  if (name.includes("jewel") || name.includes("crystal") || name.includes("gem")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Gem%20stone/3D/gem_stone_3d.png";
  }
  if (name.includes("love balloon") || name.includes("balloon")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Balloon/3D/balloon_3d.png";
  }
  if (name.includes("snack bucket") || name.includes("snack") || name.includes("cookie")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cookie/3D/cookie_3d.png";
  }
  if (name.includes("heart shape") || name.includes("heart hands") || name.includes("heart")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Heart%20hands/3D/heart_hands_3d.png";
  }
  if (name.includes("amour balloon") || name.includes("love letter")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Love%20letter/3D/love_letter_3d.png";
  }
  if (name.includes("star jar") || name.includes("star") || name.includes("crystal ball")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Crystal%20ball/3D/crystal_ball_3d.png";
  }
  if (name.includes("tulips") || name.includes("tulip")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Tulip/3D/tulip_3d.png";
  }
  if (name.includes("pearls") || name.includes("pearl") || name.includes("shell")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Spiral%20shell/3D/spiral_shell_3d.png";
  }
  if (name.includes("undersea") || name.includes("ocean")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Water%20wave/3D/water_wave_3d.png";
  }
  if (name.includes("for you") || name.includes("chime")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Wind%20chime/3D/wind_chime_3d.png";
  }
  if (name.includes("mic") || name.includes("microphone")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Microphone/3D/microphone_3d.png";
  }
  if (name.includes("money") || name.includes("mony") || name.includes("pistol") || name.includes("gun")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money%20with%20wings/3D/money_with_wings_3d.png";
  }
  if (name.includes("deer")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Deer/3D/deer_3d.png";
  }
  if (name.includes("lion")) {
    return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Lion/3D/lion_3d.png";
  }
  if (defaultIcon && (defaultIcon.startsWith("http") || defaultIcon.startsWith("data:") || defaultIcon.startsWith("blob:"))) {
    return defaultIcon;
  }
  return "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Wrapped%2520gift/3D/wrapped_gift_3d.png";
};

const getDefaultGiftVideoUrl = (giftName: string): string => {
  const name = giftName.toLowerCase();
  
  if (name.includes("love box") || name.includes("heart shape") || name.includes("amour balloon")) {
    return "https://assets.mixkit.co/videos/preview/mixkit-floating-pink-hearts-background-42171-large.mp4";
  }
  if (name.includes("rosaline") || name.includes("roses") || name.includes("tulips") || name.includes("rose")) {
    return "https://assets.mixkit.co/videos/preview/mixkit-red-rose-petals-falling-on-a-black-background-41484-large.mp4";
  }
  if (name.includes("undersea") || name.includes("pearls") || name.includes("ocean") || name.includes("sea")) {
    return "https://assets.mixkit.co/videos/preview/mixkit-water-under-the-ocean-41619-large.mp4";
  }
  if (name.includes("star jar") || name.includes("balloon")) {
    return "https://assets.mixkit.co/videos/preview/mixkit-nebula-in-space-41223-large.mp4";
  }
  if (name.includes("lion") || name.includes("king lion") || name.includes("snack bucket") || name.includes("fire")) {
    return "https://assets.mixkit.co/videos/preview/mixkit-glowing-particles-of-fire-abstract-background-41133-large.mp4";
  }
  
  // Default: shimmering luxury gold particle loop
  return "https://assets.mixkit.co/videos/preview/mixkit-shimmering-gold-particles-on-a-black-background-41808-large.mp4";
};

const saveVideoToIndexedDB = async (id: string, file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open("GiftVideosDB", 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("videos")) {
          db.createObjectStore("videos", { keyPath: "id" });
        }
      };
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction("videos", "readwrite");
        const store = transaction.objectStore("videos");
        store.put({ id, file, name: file.name, type: file.type });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      request.onerror = () => reject(request.error);
    } catch (e) {
      reject(e);
    }
  });
};

const getVideoFromIndexedDB = async (id: string): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const request = indexedDB.open("GiftVideosDB", 1);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("videos")) {
          db.createObjectStore("videos", { keyPath: "id" });
        }
      };
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("videos")) {
          resolve(null);
          return;
        }
        const transaction = db.transaction("videos", "readonly");
        const store = transaction.objectStore("videos");
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result && getReq.result.file) {
            const url = URL.createObjectURL(getReq.result.file);
            resolve(url);
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
};

interface LiveStreamSimulatorProps {
  currentUser: User;
  activeStreamer: Streamer | null; // null if broadcasting
  onClose: () => void;
  onCoinsUpdate: (newCoins: number) => void;
  onDiamondsUpdate?: (newDiamonds: number) => void;
  onLevelXpUpdate: (newLevel: number, newXp: number) => void;
  onGiftSent?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  char: string;
  alpha: number;
  rotation: number;
  rotSpeed: number;
}

interface CoHostSlot {
  id: number;
  username: string;
  avatarUrl: string;
  isOccupied: boolean;
  isRequesting: boolean;
  statusText: string;
}

export default function LiveStreamSimulator({
  currentUser,
  activeStreamer,
  onClose,
  onCoinsUpdate,
  onDiamondsUpdate,
  onLevelXpUpdate,
  onGiftSent,
}: LiveStreamSimulatorProps) {
  const isBroadcasting = activeStreamer === null;
  const [isMuted, setIsMuted] = useState(false);

  // Stream States
  const [setupTitle, setSetupTitle] = useState("PUBG Mobile - Road to Conqueror! 🔫🍗");
  const [setupCategory, setSetupCategory] = useState("Gaming & Esports");
  const [setupVideoFeed, setSetupVideoFeed] = useState("Battlefield High-Action Warzone 🧨");
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [currentStreamerDocId, setCurrentStreamerDocId] = useState<string | null>(null);
  const [viewersCount, setViewersCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [currentLevel, setCurrentLevel] = useState(currentUser.level);
  const [currentXp, setCurrentXp] = useState(currentUser.xp);
  
  // Custom Live-Stream settings requested
  const [isMicSmall, setIsMicSmall] = useState(true); // default to true to implement "live mic small"
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false); // under "tap level"
  const [customLevelInput, setCustomLevelInput] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // User Tap Menu Drawer for "Tools & Interactive Features" (matching mockup screenshot 1)
  const [isTapMenuOpen, setIsTapMenuOpen] = useState(false);
  const [luckyBagActive, setLuckyBagActive] = useState(false);
  const [luckyBagCountdown, setLuckyBagCountdown] = useState(5);
  const [luckyBagClaimed, setLuckyBagClaimed] = useState(false);
  
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [isRollingDice, setIsRollingDice] = useState(false);
  
  const [luckyNumber, setLuckyNumber] = useState<number | null>(7);
  const [showLuckyNumberBadge, setShowLuckyNumberBadge] = useState(false);
  
  const [isMusicSynthPlaying, setIsMusicSynthPlaying] = useState(false);
  const [synthBeatType, setSynthBeatType] = useState("Lofi Beat ☕");
  
  const [activeVfxFilter, setActiveVfxFilter] = useState<string | null>(null);
  
  const [currentDrawLot, setCurrentDrawLot] = useState<string | null>(null);
  
  const [activePoll, setActivePoll] = useState<{ question: string; options: { text: string; votes: number }[]; totalVotes: number } | null>(null);
  const [isLotteryBoxPresent, setIsLotteryBoxPresent] = useState(false);
  const [lotteryBoxState, setLotteryBoxState] = useState<"closed" | "opening" | "opened">("closed");
  const [isFeedbackCardOpen, setIsFeedbackCardOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  
  const [activeAuction, setActiveAuction] = useState<{ itemName: string; currentBid: number; highBidder: string; timeSecs: number; isActive: boolean } | null>(null);
  const [pkBattle, setPkBattle] = useState<{ player1Score: number; player2Score: number; timeLeft: number; isActive: boolean; opponent: { name: string; avatar: string; level: number } } | null>(null);
  const [liveScore, setLiveScore] = useState<{ teamRed: number; teamBlue: number; active: boolean } | null>(null);
  const [isSpinningWheel, setIsSpinningWheel] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [wheelResult, setWheelResult] = useState<string | null>(null);

  // Audio Synth Player Loop References
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthIntervalRef = useRef<any>(null);

  const startSynthLoop = (beatType: string) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      if (synthIntervalRef.current) {
        clearInterval(synthIntervalRef.current);
      }

      let step = 0;
      const freqsMap: Record<string, number[]> = {
        "Lofi Beat ☕": [196.00, 220.00, 261.63, 293.66, 329.63, 392.00], // G3, A3, C4, D4, E4, G4
        "Festival EDM 🎸": [220.00, 261.63, 293.66, 349.23, 392.00, 440.00], // A3, C4, D4, F4, G4, A4
        "Ambient Chill 🌌": [130.81, 164.81, 196.00, 246.94, 293.66, 392.00]  // C3, E3, G3, B3, D4, G4
      };

      const notes = freqsMap[beatType] || freqsMap["Lofi Beat ☕"];

      const playNote = (freq: number, duration: number, type: "sine" | "triangle" | "sawtooth" = "sine") => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05); // low volume proxy
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
      };

      synthIntervalRef.current = setInterval(() => {
        if (beatType === "Festival EDM 🎸") {
          if (step % 4 === 0) {
            playNote(notes[0] / 2, 0.4, "triangle"); // bass
          }
          const randomNoteIdx = Math.floor(Math.random() * notes.length);
          playNote(notes[randomNoteIdx], 0.25, "sine");
        } else if (beatType === "Ambient Chill 🌌") {
          if (step % 8 === 0) {
            const chord = [notes[0], notes[2], notes[4]];
            chord.forEach(n => playNote(n, 1.8, "sine"));
          }
        } else {
          if (step % 4 === 0) {
            playNote(notes[1] / 2, 0.6, "triangle"); // low A
          }
          if (step % 2 === 1) {
            const randomNoteIdx = Math.floor(Math.random() * 3) + 2; // C4, D4, E4
            playNote(notes[randomNoteIdx], 0.35, "sine");
          }
        }
        step++;
      }, beatType === "Festival EDM 🎸" ? 220 : beatType === "Ambient Chill 🌌" ? 800 : 450);

    } catch (err) {
      console.warn("Synthesizer failed to spin up due to browser audio locks:", err);
    }
  };

  const stopSynthLoop = () => {
    if (synthIntervalRef.current) {
      clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  useEffect(() => {
    if (isMusicSynthPlaying) {
      startSynthLoop(synthBeatType);
    } else {
      stopSynthLoop();
    }
    return () => stopSynthLoop();
  }, [isMusicSynthPlaying, synthBeatType]);

  // Real-time Simulation Engine for active stream interactive features
  useEffect(() => {
    let timer: any;
    if (luckyBagActive && luckyBagCountdown > 0 && !luckyBagClaimed) {
      timer = setInterval(() => {
        setLuckyBagCountdown(prev => {
          if (prev <= 1) {
            setLuckyBagActive(false);
            setChatMessages(c => [...c, {
              id: `system-lucky-bag-end-${Date.now()}`,
              username: "📢 SYSTEM",
              text: "Lucky Bag Coin Drop has expired! Claim yours faster next time 🧧",
              isSystem: true,
              avatarUrl: "",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }]);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [luckyBagActive, luckyBagCountdown, luckyBagClaimed]);

  // PK Battle progress timer
  useEffect(() => {
    let timer: any;
    if (pkBattle && pkBattle.isActive) {
      timer = setInterval(() => {
        setPkBattle(prev => {
          if (!prev) return null;
          if (prev.timeLeft <= 1) {
            const won = prev.player1Score >= prev.player2Score;
            const resultMsg = won 
              ? `🏆 CONGRATULATIONS! You won the PK battle against @${prev.opponent.name}! 🌟 Score: ${prev.player1Score} vs ${prev.player2Score}`
              : `💔 PK BATTLE COMPLETED. @${prev.opponent.name} won! 🛡️ Score: ${prev.player2Score} vs ${prev.player1Score}`;
            
            setChatMessages(c => [...c, {
              id: `system-pk-end-${Date.now()}`,
              username: "🏆 PK REFEREE",
              text: resultMsg,
              isSystem: true,
              avatarUrl: "",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }]);

            return { ...prev, timeLeft: 0, isActive: false };
          }

          const p2Gain = Math.floor(Math.random() * 150) + 20;
          const p1Gain = Math.floor(Math.random() * 120) + 15;
          return {
            ...prev,
            player1Score: prev.player1Score + p1Gain,
            player2Score: prev.player2Score + p2Gain,
            timeLeft: prev.timeLeft - 1
          };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [pkBattle?.isActive, pkBattle?.timeLeft]);

  // Auction simulation timer
  useEffect(() => {
    let timer: any;
    if (activeAuction && activeAuction.isActive) {
      timer = setInterval(() => {
        setActiveAuction(prev => {
          if (!prev) return null;
          if (prev.timeSecs <= 1) {
            const finalBidderMsg = `🔨 GAVEL DOWN! Item [${prev.itemName}] sold to @${prev.highBidder} for ${prev.currentBid.toLocaleString()} Coins! 🥳`;
            setChatMessages(c => [...c, {
              id: `system-auction-end-${Date.now()}`,
              username: "📢 AUCTIONEER",
              text: finalBidderMsg,
              isSystem: true,
              avatarUrl: "",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }]);
            return { ...prev, timeSecs: 0, isActive: false };
          }

          if (Math.random() > 0.65) {
            const randomUser = CHATTER_USERNAMES[Math.floor(Math.random() * CHATTER_USERNAMES.length)];
            const newBid = prev.currentBid + (Math.floor(Math.random() * 3) + 1) * 50;
            
            setChatMessages(c => [...c, {
              id: `chatbot-bid-${Date.now()}`,
              username: `@${randomUser}`,
              text: `🙋‍♂️ Just placed a bid of ${newBid.toLocaleString()} Coins on the ${prev.itemName}!`,
              avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${randomUser}`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }]);

            return {
              ...prev,
              currentBid: newBid,
              highBidder: randomUser,
              timeSecs: prev.timeSecs - 1
            };
          }

          return {
            ...prev,
            timeSecs: prev.timeSecs - 1
          };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeAuction?.isActive, activeAuction?.timeSecs]);

  // Poll simulator voters increment
  useEffect(() => {
    let timer: any;
    if (activePoll) {
      timer = setInterval(() => {
        setActivePoll(prev => {
          if (!prev) return null;
          const optIndex = Math.random() > 0.55 ? 0 : 1;
          const updatedOptions = prev.options.map((opt, i) => i === optIndex ? { ...opt, votes: opt.votes + 1 } : opt);
          return {
            ...prev,
            options: updatedOptions,
            totalVotes: prev.totalVotes + 1
          };
        });
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [activePoll]);

  // Auto scroll to bottom of comments
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Sync profile level updates
  useEffect(() => {
    setCurrentLevel(currentUser.level);
    setCurrentXp(currentUser.xp);
  }, [currentUser.level, currentUser.xp]);

  // Bottom "Send Gift" drawer states
  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string>("gift-rose");
  const [notEnoughCoinsMsg, setNotEnoughCoinsMsg] = useState(false);

  // State to manage virtual gifts list (to persist custom added premium items)
  const [giftsList, setGiftsList] = useState<Gift[]>(VIRTUAL_GIFTS);

  // Sync gifts from Firestore
  useEffect(() => {
    const q = query(collection(db, "gifts"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fbGifts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Gift));
      // Merge with default gifts, avoiding duplicates by ID
      setGiftsList((prev) => {
        const defaultIds = VIRTUAL_GIFTS.map(g => g.id);
        const uniqueFB = fbGifts.filter(fg => !defaultIds.includes(fg.id));
        return [...VIRTUAL_GIFTS, ...uniqueFB];
      });
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "gifts");
    });
    return () => unsubscribe();
  }, []);

  // Gift multiplier counters (x1, x2, x3, x4 + Custom invente)
  const [giftMultiplier, setGiftMultiplier] = useState<number>(1);
  const [customMultiplier, setCustomMultiplier] = useState<string>("");
  const [isCustomMultiplier, setIsCustomMultiplier] = useState<boolean>(false);

  // Add Custom Gift portal states (password EMAD8912 protection)
  const [showAddGiftPrompt, setShowAddGiftPrompt] = useState(false);
  const [addGiftStep, setAddGiftStep] = useState<"password" | "form">("password");
  const [addGiftPassword, setAddGiftPassword] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [addGiftError, setAddGiftError] = useState("");

  const [newGiftName, setNewGiftName] = useState("");
  const [newGiftIcon, setNewGiftIcon] = useState("👑");
  const [newGiftCost, setNewGiftCost] = useState(150);
  const [newGiftEffect, setNewGiftEffect] = useState("animate-bounce");
  const [newGiftVideoTheme, setNewGiftVideoTheme] = useState("Cosmic Nebula Loop 🌌");
  const [newGiftVideoUrl, setNewGiftVideoUrl] = useState("");
  const [simulatedFileName, setSimulatedFileName] = useState("");
  const [simulatedGiftVideoFileName, setSimulatedGiftVideoFileName] = useState("");
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);

  // Temporary video background feed override based on sent gift setting
  const [overrideVideoFeedTheme, setOverrideVideoFeedTheme] = useState<string | null>(null);
  const [overrideVideoUrl, setOverrideVideoUrl] = useState<string | null>(null);

  // Combo and Animation states
  const [comboCount, setComboCount] = useState<number>(0);
  const [comboPulse, setComboPulse] = useState<boolean>(false);
  const [comboCompletionMsg, setComboCompletionMsg] = useState<string>("");
  const comboTimerRef = useRef<any>(null);
  const [roseShowerActive, setRoseShowerActive] = useState<boolean>(false);
  const [lionActive, setLionActive] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [showSubscriptionAlert, setShowSubscriptionAlert] = useState<boolean>(false);

  // States for tracking Stream Session Statistics (Session Overview)
  const [showSessionOverview, setShowSessionOverview] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [totalUniqueUsers, setTotalUniqueUsers] = useState(0);
  const [totalGiftsCount, setTotalGiftsCount] = useState(0);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  const [sessionFollowCount, setSessionFollowCount] = useState(0);

  // Mic, Camera toggle states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false); // Default false (deleting camera)
  const [sharesCount, setSharesCount] = useState(0);

  // CUSTOM USER UPDATES FOR SCREEN TAKEOVERS & BOTS DISABLE
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [noBotComments, setNoBotComments] = useState(true);
  const [noBotGuests, setNoBotGuests] = useState(true);
  const [directGiftRedeemCode, setDirectGiftRedeemCode] = useState("");
  const [giftPaymentMethod, setGiftPaymentMethod] = useState<"coin" | "diamond">("coin");
  const [redeemAlert, setRedeemAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // High fidelity "Video Gift Front Overlay" Trigger
  const [activeSuperVideoGift, setActiveSuperVideoGift] = useState<{
    id: string;
    sender: string;
    name: string;
    icon: string;
    multiplier: number;
    timestamp: number;
  } | null>(null);

  // Manual Invite/Add Real Guest (No Bot) Dialogs
  const [showAddRealGuestModal, setShowAddRealGuestModal] = useState(false);
  const [selectedSlotForRealGuest, setSelectedSlotForRealGuest] = useState<number | null>(null);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestAvatar, setNewGuestAvatar] = useState("");

  // Floating Gifts Visual Alert Bubble (multiplier responsive)
  const [activeGiftAlert, setActiveGiftAlert] = useState<{
    sender: string;
    gift: Gift;
    timestamp: number;
    avatarUrl?: string;
    multiplier?: number;
    recipientUsername?: string;
    recipientAvatarUrl?: string;
  } | null>(null);

  // Default Host recipient static details
  const hostRecipient = {
    username: isBroadcasting ? currentUser.username : activeStreamer?.username || "Host",
    avatarUrl: isBroadcasting ? currentUser.avatarUrl : activeStreamer?.avatarUrl || "https://picsum.photos/seed/ndnd/150/150",
    slotLabel: "Host",
  };

  const allRecipient = {
    username: "all_recipients",
    avatarUrl: "👥",
    slotLabel: "All on Mic",
  };

  const [selectedRecipient, setSelectedRecipient] = useState<{
    username: string;
    avatarUrl: string;
    slotLabel: string;
  }>(hostRecipient);

  // 9 Co-hosting/Request Slots (Slots 2 to 9 start as empty requests, Slot 1 is Host)
  const [coHostSlots, setCoHostSlots] = useState<CoHostSlot[]>([
    {
      id: 1,
      username: isBroadcasting ? currentUser.username : activeStreamer?.username || "ndnd",
      avatarUrl: isBroadcasting ? currentUser.avatarUrl : activeStreamer?.avatarUrl || "https://picsum.photos/seed/ndnd/150/150",
      isOccupied: true,
      isRequesting: false,
      statusText: "Host",
    },
    ...Array.from({ length: 15 }, (_, i) => ({
      id: i + 2,
      username: "",
      avatarUrl: "",
      isOccupied: false,
      isRequesting: false,
      score: 0,
      statusText: "",
    })),
  ]);

  // Real-time viewer mic slots status states
  const [isJoinedOnMic, setIsJoinedOnMic] = useState(false);
  const [isMicVoiceOn, setIsMicVoiceOn] = useState(true);

  // Helper handler for One-Tap Request to Join Mic
  const handleOneTapJoinMic = () => {
    if (isJoinedOnMic) return;

    // Find first empty cohost slot
    const emptySlotIndex = coHostSlots.findIndex((s) => s.id > 1 && !s.isOccupied && !s.isRequesting);
    if (emptySlotIndex === -1) {
      alert("All slots are taken! Click on any cohost guest slot to disconnect it first.");
      return;
    }

    const slotId = coHostSlots[emptySlotIndex].id;

    // Connecting state transition
    setCoHostSlots((prevSlots) =>
      prevSlots.map((s) => (s.id === slotId ? { ...s, isRequesting: true, statusText: "Connecting..." } : s))
    );

    // Simulated short 500ms delay to connect
    setTimeout(() => {
      setCoHostSlots((prevSlots) =>
        prevSlots.map((s) =>
          s.id === slotId
            ? {
                ...s,
                isOccupied: true,
                isRequesting: false,
                username: `${currentUser.username} (You)`,
                avatarUrl: currentUser.avatarUrl,
                statusText: "On Mic 🎤",
              }
            : s
        )
      );
      setIsJoinedOnMic(true);
      setIsMicVoiceOn(true);

      // Instant chat comment feedback
      setChatMessages((messages) => [
        ...messages,
        {
          id: `cohost-ann-user-${Date.now()}-${Math.random()}`,
          username: `${currentUser.username} (You)`,
          text: `requested and joined Guest Microphone Slot #${slotId - 1}! 🎙️🔥`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 500);
  };

  // Helper handler for "Back Mic" (leave co-host mic spot and return to audience)
  const handleLeaveMic = () => {
    if (!isJoinedOnMic) return;

    // Reset user slot
    setCoHostSlots((prevSlots) =>
      prevSlots.map((s) =>
        s.username === `${currentUser.username} (You)`
          ? {
              ...s,
              isOccupied: false,
              isRequesting: false,
              username: "",
              avatarUrl: "",
              statusText: "Request",
            }
          : s
      )
    );

    setIsJoinedOnMic(false);

    // Send chat message
    setChatMessages((messages) => [
      ...messages,
      {
        id: `cohost-leave-user-${Date.now()}-${Math.random()}`,
        username: `${currentUser.username} (You)`,
        text: `left the mic and returned to standard audience. 👁️`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Helper handler for toggling voice / mic mute state (Voice Off/On)
  const handleToggleMicVoice = () => {
    const nextVoiceState = !isMicVoiceOn;
    setIsMicVoiceOn(nextVoiceState);

    // Update status text inside slot dynamically
    setCoHostSlots((prevSlots) =>
      prevSlots.map((s) =>
        s.username === `${currentUser.username} (You)`
          ? {
              ...s,
              statusText: nextVoiceState ? "On Mic 🎤" : "Muted 🔇",
            }
          : s
      )
    );
  };

  // Timers and Canvas Refs
  const chatIntervalRef = useRef<number | null>(null);
  const giftIntervalRef = useRef<number | null>(null);
  const viewerIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Prevent any global body scrolling when the simulator is active
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // Sync other lives for community list in setup
  const [otherLives, setOtherLives] = useState<Streamer[]>([]);
  useEffect(() => {
    if (isBroadcasting && !isLiveActive) {
      const q = query(collection(db, "streamers"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const streams = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Streamer));
        setOtherLives(streams.filter(s => s.creatorId !== auth.currentUser?.uid));
      }, (err) => {
        console.warn("Failed syncing other lives for setup:", err);
      });
      return () => unsubscribe();
    }
  }, [isBroadcasting, isLiveActive]);

  // Sync state if live is active
  useEffect(() => {
    let incrementTimeout: any = null;

    if ((isLiveActive && isBroadcasting) || (!isBroadcasting && activeStreamer)) {
      // "live my no bot view and no request bot"
      // If we are broadcasting ("live my"), starting viewers starts cleanly at 0 (no bot view), otherwise uses active category viewers count
      const initialViewers = isBroadcasting ? 0 : activeStreamer?.viewersCount || 0;
      setViewersCount(initialViewers);

      // Persist viewer increment to Firestore only if user stays for at least 3 seconds
      if (!isBroadcasting && activeStreamer) {
        incrementTimeout = setTimeout(async () => {
          try {
            if (firestoreStatus.isQuotaExceeded) return;
            const streamerRef = doc(db, "streamers", activeStreamer.id);
            // double check existence to avoid errors if stream ended
            const snap = await getDoc(streamerRef);
            if (snap.exists() && snap.data().isLive) {
               await updateDoc(streamerRef, { viewersCount: increment(1) });
               console.debug("Viewer count incremented in Firestore after stable session");
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `streamers/${activeStreamer.id}`);
          }
        }, 10000); // 10-second grace period for "stable" viewers only

        // Keep viewer slots cleanly empty to support real multi-user co-hosting loops
        setCoHostSlots((prevSlots) =>
          prevSlots.map((slot) =>
            slot.id > 1
              ? {
                  ...slot,
                  isOccupied: false,
                  isRequesting: false,
                  username: "",
                  avatarUrl: "",
                  statusText: "Request",
                }
              : slot
          )
        );
      } else {
        // Start live my with all mic guest slots completely empty of bots
        setCoHostSlots((prevSlots) =>
          prevSlots.map((slot) =>
            slot.id > 1
              ? {
                  ...slot,
                  isOccupied: false,
                  isRequesting: false,
                  username: "",
                  avatarUrl: "",
                  statusText: "Request",
                }
              : slot
          )
        );
      }

      setChatMessages([
        {
          id: "sys-1",
          username: "System",
          text: isBroadcasting
            ? "Your broadcaster panel is live! Tap empty guest slots to manage requests."
            : `Welcome to ${activeStreamer?.fullName || "Stream's"} live loop channel. Click 'Gift' to tip!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isSystem: true,
        },
      ]);
    }

    return () => {
      if (incrementTimeout) clearTimeout(incrementTimeout);
    };
  }, [isLiveActive, activeStreamer, isBroadcasting]);

  // Simulated Comments Feed (Conditioned on noBotComments being false)
  useEffect(() => {
    if (isLiveActive && !noBotComments) {
      chatIntervalRef.current = window.setInterval(() => {
        const randomUser = CHATTER_USERNAMES[Math.floor(Math.random() * CHATTER_USERNAMES.length)];
        const randomComment = SIMULATED_CHAT_MESSAGES[Math.floor(Math.random() * SIMULATED_CHAT_MESSAGES.length)];

        const newMessage: ChatMessage = {
          id: `chat-${Date.now()}-${Math.random()}`,
          username: randomUser,
          text: randomComment,
          avatarUrl: `https://picsum.photos/seed/${randomUser}/60/60`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setChatMessages((prev) => [...prev.slice(-25), newMessage]);
      }, 3000);
    }

    return () => {
      if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    };
  }, [isLiveActive, noBotComments]);

  // Viewer fluctuation (Conditioned on noBotComments being false)
  useEffect(() => {
    if (isLiveActive && !noBotComments) {
      viewerIntervalRef.current = window.setInterval(() => {
        setViewersCount((prev) => {
          const delta = Math.floor(Math.random() * 5) - 2;
          return Math.max(12, prev + delta);
        });
      }, 5000);
    }

    return () => {
      if (viewerIntervalRef.current) clearInterval(viewerIntervalRef.current);
    };
  }, [isLiveActive, noBotComments]);

  // Particle Engine Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = canvas.parentElement?.clientWidth || 360;
        canvas.height = canvas.parentElement?.clientHeight || 640;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const updateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.alpha -= 0.015;

        if (p.alpha <= 0 || p.y < -50 || p.x < -50 || p.x > canvas.width + 50) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.char && (p.char.startsWith("blob:") || p.char.startsWith("data:") || p.char.startsWith("http"))) {
          let cachedImg = (window as any)[`pref_img_${p.char}`];
          if (!cachedImg) {
            cachedImg = new Image();
            cachedImg.src = p.char;
            (window as any)[`pref_img_${p.char}`] = cachedImg;
          }
          if (cachedImg.complete) {
            ctx.drawImage(cachedImg, -p.size / 2, -p.size / 2, p.size, p.size);
          } else {
            ctx.font = `${p.size}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("🎁", 0, 0);
          }
        } else {
          ctx.font = `${p.size}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.char, 0, 0);
        }

        ctx.restore();
      }

      animationFrameId.current = requestAnimationFrame(updateParticles);
    };

    updateParticles();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isLiveActive, activeStreamer]);

  // Burst Floating Emojis
  const spawnGiftBurst = (char: string, count = 18) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x: canvas.width / 2 + (Math.random() * 60 - 30),
        y: canvas.height - 120,
        vx: Math.random() * 5 - 2.5,
        vy: -Math.random() * 5 - 4,
        size: Math.random() * 12 + 22,
        char: char,
        alpha: 1.0,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: Math.random() * 0.04 - 0.02,
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  // Process alert visual banner 
  const triggerIncomingGift = (sender: string, gift: Gift, multiplier = 1) => {
    const alertTime = Date.now();
    const quantity = multiplier;

    // Pick a random occupied cohost slot or host to receive this simulated gift (adds score to mic users!)
    const occupiedSlots = coHostSlots.filter((s) => s.isOccupied);
    let recUsername = "Host";
    let recAvatarUrl = isBroadcasting ? currentUser.avatarUrl : activeStreamer?.avatarUrl || "https://picsum.photos/seed/host/100/100";

    if (occupiedSlots.length > 0) {
      const luckySlot = occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)];
      recUsername = luckySlot.username;
      recAvatarUrl = luckySlot.avatarUrl;
      setCoHostSlots((prevSlots) =>
        prevSlots.map((s) => (s.id === luckySlot.id ? { ...s, score: (s.score || 0) + (gift.cost * quantity) } : s))
      );
    }

    setActiveGiftAlert({
      sender,
      gift,
      timestamp: alertTime,
      avatarUrl: `https://picsum.photos/seed/${sender}/100/100`,
      multiplier,
      recipientUsername: recUsername,
      recipientAvatarUrl: recAvatarUrl,
    });

    spawnGiftBurst(gift.icon, Math.min(60, 18 * multiplier));

    // Support screen theme override (add video gift screen)
    if ((gift as any).videoFeedTheme) {
      setOverrideVideoFeedTheme((gift as any).videoFeedTheme);
      setTimeout(() => {
        setOverrideVideoFeedTheme(null);
      }, 5000);
    }

    // Track for Session Overview
    setTotalGiftsCount((prev) => prev + quantity);
    setTotalCoinsEarned((prev) => prev + (gift.cost * quantity));

    const systemGiftMsg: ChatMessage = {
      id: `chat-gift-${Date.now()}-${Math.random()}`,
      username: sender,
      text: `sent ${gift.name} ${gift.icon} x${quantity}!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      gift: {
        name: gift.name,
        icon: gift.icon,
        cost: gift.cost,
      },
    };
    setChatMessages((prev) => [...prev, systemGiftMsg]);

    // Apply XP to current user (level gift)
    const xpReward = Math.floor(gift.cost * quantity * 1.5) || 5;
    let nextXp = currentXp + xpReward;
    let nextLevel = currentLevel;
    let xpTarget = getXpNeededForLevel(nextLevel);

    while (nextXp >= xpTarget) {
      nextXp -= xpTarget;
      nextLevel += 1;
      xpTarget = getXpNeededForLevel(nextLevel);
      setTimeout(() => {
        spawnGiftBurst("⭐", 25);
      }, 300);
    }

    setCurrentLevel(nextLevel);
    setCurrentXp(nextXp);
    onLevelXpUpdate(nextLevel, nextXp);

    // Streamer gets tipped balance: If user is broadcasting (broadcaster), they earn diamonds!
    if (isBroadcasting) {
      const updatedDiamonds = (currentUser.diamonds || 0) + (gift.cost * quantity);
      onDiamondsUpdate?.(updatedDiamonds);
    }

    // Hide after exactly 5 seconds
    setTimeout(() => {
      setActiveGiftAlert((prev) => (prev?.timestamp === alertTime ? null : prev));
    }, 5000);
  };

  // Periodic simulated gifts from other view chatters (DISABLED - Fake delete)
  useEffect(() => {
    /* Simulation disabled by user request
    if (isLiveActive && !isBroadcasting && activeStreamer) {
      giftIntervalRef.current = window.setInterval(() => {
        const randomGift = VIRTUAL_GIFTS[Math.floor(Math.random() * VIRTUAL_GIFTS.length)];
        const randomChatter = CHATTER_USERNAMES[Math.floor(Math.random() * CHATTER_USERNAMES.length)];
        triggerIncomingGift(randomChatter, randomGift);
      }, 10000); // Trigger every 10 seconds
    }
    */

    return () => {
      if (giftIntervalRef.current) clearInterval(giftIntervalRef.current);
    };
  }, [isLiveActive, activeStreamer, isBroadcasting]);

  // Session duration elapsed counter and ambient audience scale timer
  useEffect(() => {
    let secondTimer: number;
    let statsTimer: number;

    if (isLiveActive) {
      secondTimer = window.setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);

      /* Stats fluctuation disabled by user request
      statsTimer = window.setInterval(() => {
        setTotalUniqueUsers((prev) => prev + Math.floor(Math.random() * 3) - 1);
        if (Math.random() > 0.8) {
          setSessionFollowCount((prev) => prev + 1);
        }
      }, 6000);
      */
    }

    return () => {
      if (secondTimer) clearInterval(secondTimer);
      if (statsTimer) clearInterval(statsTimer);
    };
  }, [isLiveActive]);

  // Submit Comments
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const val = inputMessage;
    setInputMessage("");

    const newMsg: ChatMessage = {
      id: `chat-usr-${Date.now()}-${Math.random()}`,
      username: `${currentUser.username} (You)`,
      text: val,
      avatarUrl: currentUser.avatarUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Simulated reply
    setTimeout(() => {
      const creatorName = isBroadcasting ? "CoHost" : activeStreamer?.fullName.split(" ")[0] || "ndnd";
      const backTalks = [
        `Thanks for joining the chat! ❤️`,
        `Amazing support, appreciate that! 🙌`,
        `Let me know if you want cohost too!`,
        `Haha crazy times on stream!`,
        `Welcome in loopers!`,
      ];
      const randomBack = backTalks[Math.floor(Math.random() * backTalks.length)];

      setChatMessages((prev) => [
        ...prev,
        {
          id: `chat-reply-${Date.now()}-${Math.random()}`,
          username: isBroadcasting ? "chat_mod" : activeStreamer?.username || "ndnd",
          text: randomBack,
          avatarUrl: `https://picsum.photos/seed/${creatorName}/60/60`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1500);
  };

  // Handle active purchase / sending from Bottom Drawer Sheet
  const handleSendGiftLocal = (gift: Gift, overrideMultiplier?: number) => {
    // 1. Calculate Multiplier (defaults to 1 or uses active successive combo count)
    const multiplier = overrideMultiplier !== undefined 
      ? overrideMultiplier 
      : 1;
    
    // 2. Determine Recipients
    const isAll = selectedRecipient.username === "all_recipients";
    
    // Targets can be Host (ID 1) and any occupied guest slots (ID 2+)
    const targetSlots = isAll 
      ? coHostSlots.filter(s => s.isOccupied)
      : coHostSlots.filter(s => s.username === selectedRecipient.username);
    
    const targetCount = targetSlots.length || 1;
    // For extreme combo-tapping, each tap represents a single gift (or multiple if multiplier selected). Let's use 1 * cost for single successive combo increments to be coin-friendly!
    const effectiveCostPerInstance = overrideMultiplier !== undefined ? gift.cost : (gift.cost * multiplier);
    const totalCost = effectiveCostPerInstance * targetCount;
    const finalCost = giftPaymentMethod === "coin" ? totalCost : Math.ceil(totalCost / 10);

    if (giftPaymentMethod === "coin") {
      if (currentUser.coins < finalCost) {
        setNotEnoughCoinsMsg(true);
        setTimeout(() => setNotEnoughCoinsMsg(false), 3500);
        return;
      }
      // Deduct coins dynamically (tap sent gift -coin)
      const remaining = currentUser.coins - finalCost;
      onCoinsUpdate(remaining);
    } else {
      const currentDiamonds = currentUser.diamonds || 0;
      if (currentDiamonds < finalCost) {
        setNotEnoughCoinsMsg(true);
        setTimeout(() => setNotEnoughCoinsMsg(false), 3500);
        return;
      }
      onDiamondsUpdate?.(currentDiamonds - finalCost);
    }

    onGiftSent?.();

    // Trigger premium FRONT-SCREEN video gift visual effect
    const superGiftTimestamp = Date.now();
    setActiveSuperVideoGift({
      id: `svg-${Date.now()}-${Math.random()}`,
      sender: `${currentUser.username} (You)`,
      name: gift.name,
      icon: gift.icon,
      multiplier,
      timestamp: superGiftTimestamp
    });
    setTimeout(() => {
      setActiveSuperVideoGift((prev) => prev?.timestamp === superGiftTimestamp ? null : prev);
    }, 5000);

    // Burst particles animation for high fidelity
    spawnGiftBurst(gift.icon, Math.min(65, 20 * multiplier));

    // Special Gift Animations Trigger
    if (gift.id === "gift-rose") {
      setRoseShowerActive(true);
      setTimeout(() => setRoseShowerActive(false), 4500);
    }
    if (gift.id === "gift-lion") {
      setLionActive(true);
      setTimeout(() => setLionActive(false), 7000);
    }

    // Support screen overriding (add video gift screen)
    const playVideoOverride = async () => {
      const dbVideoUrl = await getVideoFromIndexedDB(gift.id);
      if (dbVideoUrl) {
        setOverrideVideoUrl(dbVideoUrl);
        setTimeout(() => {
          setOverrideVideoUrl(null);
        }, 8000);
      } else if ((gift as any).customVideoUrl) {
        setOverrideVideoUrl((gift as any).customVideoUrl);
        setTimeout(() => {
          setOverrideVideoUrl(null);
        }, 8000);
      } else {
        // Fallback to gorgeous default high-fidelity video loop for sent gift!
        const defaultVideo = getDefaultGiftVideoUrl(gift.name);
        setOverrideVideoUrl(defaultVideo);
        setTimeout(() => {
          setOverrideVideoUrl(null);
        }, 8000);
      }

      if ((gift as any).videoFeedTheme) {
        setOverrideVideoFeedTheme((gift as any).videoFeedTheme);
        setTimeout(() => {
          setOverrideVideoFeedTheme(null);
        }, 8000);
      }
    };
    playVideoOverride();

    // Trigger visual floating gift alert bubble immediately with user's sent name
    const alertTime = Date.now();
    const recUsername = isAll ? "All Guest Mics" : selectedRecipient.username;
    const recAvatarUrl = isAll ? "https://picsum.photos/seed/all/100/100" : (selectedRecipient.avatarUrl || "https://picsum.photos/seed/rec/100/100");

    setActiveGiftAlert({
      sender: currentUser.username,
      gift,
      timestamp: alertTime,
      avatarUrl: currentUser.avatarUrl,
      multiplier,
      recipientUsername: recUsername,
      recipientAvatarUrl: recAvatarUrl,
    });

    // Track for Session Overview
    setTotalGiftsCount((p) => p + (multiplier * targetCount));
    setTotalCoinsEarned((p) => p + totalCost);

    const itemCost = effectiveCostPerInstance;

    // Increment recipient slot scores (for all targets)
    setCoHostSlots((prevSlots) =>
      prevSlots.map((s) => {
        const isMatched = isAll 
          ? s.isOccupied 
          : (s.isOccupied && s.username === selectedRecipient.username);
        if (isMatched) {
          return { ...s, score: (s.score || 0) + itemCost };
        }
        return s;
      })
    );

    // Hide precisely after 5 seconds
    setTimeout(() => {
      setActiveGiftAlert((prev) => (prev?.timestamp === alertTime ? null : prev));
    }, 5000);

    const recipientText = isAll ? "All on Mic" : `@${selectedRecipient.username}`;
    // Message
    const giftMessage: ChatMessage = {
      id: `usr-gift-${Date.now()}-${Math.random()}`,
      username: currentUser.username,
      text: `sent ${gift.name} ${gift.icon} x${multiplier} to ${recipientText}!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      gift: {
        name: gift.name,
        icon: gift.icon,
        cost: gift.cost,
      },
    };
    setChatMessages((prev) => [...prev, giftMessage]);

    // Send XP rewards
    const viewReward = Math.floor(totalCost * 1.5) || 5;
    let nextXp = currentXp + viewReward;
    let nextLevel = currentLevel;
    let xpTarget = getXpNeededForLevel(nextLevel);

    while (nextXp >= xpTarget) {
      nextXp -= xpTarget;
      nextLevel += 1;
      xpTarget = getXpNeededForLevel(nextLevel);
      spawnGiftBurst("⭐", 15);
    }

    setCurrentLevel(nextLevel);
    setCurrentXp(nextXp);
    onLevelXpUpdate(nextLevel, nextXp);

    // Response alert
    setTimeout(() => {
      const resp = [
        `OMG! Thank you so much for the ${gift.name} ${gift.icon}!`,
        `WOW!! Support is amazing! Appreciate the ${gift.name}!`,
        `That is huge! Thanks a lot @${currentUser.username}! ❤️`,
        `LoopCoins well spent! Thank you so much!`,
      ];
      const selectedResp = resp[Math.floor(Math.random() * resp.length)];

      const responderName = isAll 
        ? (targetSlots.length > 0 ? targetSlots[Math.floor(Math.random() * targetSlots.length)].username : "CoHost")
        : selectedRecipient.username;

      const responderAvatar = isAll
        ? (targetSlots.length > 0 ? targetSlots[Math.floor(Math.random() * targetSlots.length)].avatarUrl : "👥")
        : selectedRecipient.avatarUrl;

      setChatMessages((prev) => [
        ...prev,
        {
          id: `chat-streamer-rc-${Date.now()}-${Math.random()}`,
          username: responderName,
          text: selectedResp,
          avatarUrl: responderAvatar,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1200);
  };

  // Cohost Grid Slot Activation Interaction
  const handleInteractSlot = (slotId: number) => {
    if (slotId === 1) return; // Keep Host slot locked

    const slot = coHostSlots.find((s) => s.id === slotId);
    if (!slot) return;

    if (slot.isOccupied) {
      // Choose Guest on mic and trigger Gift panel
      setSelectedRecipient({
        username: slot.username,
        avatarUrl: slot.avatarUrl,
        slotLabel: `Guest ${slot.id - 1}`,
      });
      setIsGiftDrawerOpen(true);
    } else {
      if (isBroadcasting) {
        // Tapping empty slot as host triggers manual Real Guest setup modal (Add User No Bot)
        setSelectedSlotForRealGuest(slotId);
        setNewGuestName("");
        setNewGuestAvatar(`https://api.dicebear.com/7.x/adventurer/svg?seed=Guest-${slotId}`);
        setShowAddRealGuestModal(true);
      } else {
        // Otherwise connect the actual user (You) to the tapped slot so no bot joins automatically
        if (isJoinedOnMic) {
          alert("You are already on a microphone slot!");
          return;
        }

        setCoHostSlots((prevSlots) =>
          prevSlots.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  username: `${currentUser.username} (You)`,
                  avatarUrl: currentUser.avatarUrl,
                  isOccupied: true,
                  isRequesting: false,
                  score: 0,
                  statusText: "On Mic 🎤",
                  statusTextExtra: "REAL"
                }
              : s
          )
        );

        setIsJoinedOnMic(true);
        setIsMicVoiceOn(true);

        const joinMsg: ChatMessage = {
          id: `chat-join-mic-user-${Date.now()}-${Math.random()}`,
          username: `${currentUser.username} (You)`,
          text: `joined Guest Slot #${slotId - 1}! 🎤⚡`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, joinMsg]);
      }
    }
  };

  const handleAddRealGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotForRealGuest) return;

    const guestNameInput = newGuestName.trim() || `Guest_${selectedSlotForRealGuest - 1}`;
    const formattedUsername = guestNameInput.startsWith("@") ? guestNameInput : `@${guestNameInput}`;

    setCoHostSlots((prevSlots) =>
      prevSlots.map((s) =>
        s.id === selectedSlotForRealGuest
          ? {
              ...s,
              username: formattedUsername,
              avatarUrl: newGuestAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${guestNameInput}`,
              isOccupied: true,
              isRequesting: false,
              score: 0,
              statusText: "REAL"
            }
          : s
      )
    );

    const joinMsg: ChatMessage = {
      id: `chat-real-join-${Date.now()}-${Math.random()}`,
      username: formattedUsername,
      text: "joined on microphone live! 🎤 (REAL USER)",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, joinMsg]);

    setShowAddRealGuestModal(false);
    setSelectedSlotForRealGuest(null);
    setNewGuestName("");
  };

  const startBroadcasting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupTitle.trim() || !auth.currentUser) return;

    const streamerId = `streamer-${Date.now()}`;
    if (firestoreStatus.isQuotaExceeded) {
       // Allow "local-only" start if quota hit
       setIsLiveActive(true);
       return;
    }

    const newStreamer: any = {
      id: streamerId,
      username: `@${currentUser.username}`,
      fullName: currentUser.fullName,
      avatarUrl: currentUser.avatarUrl,
      level: currentUser.level,
      viewersCount: 0,
      title: setupTitle.trim(),
      category: setupCategory,
      isLive: true,
      startingCoins: 0,
      videoFeedType: setupVideoFeed,
      creatorId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "streamers", streamerId), newStreamer);
      setCurrentStreamerDocId(streamerId);
      setIsLiveActive(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `streamers/${streamerId}`);
    }
  };

  const activeSelectedGift = VIRTUAL_GIFTS.find((g) => g.id === selectedGiftId) || VIRTUAL_GIFTS[0];

  const formatDurationHorizontal = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0")
    ].join(":");
  };

  if (showSessionOverview) {
    return (
      <div 
        id="session-overview-screen" 
        className="w-full h-screen bg-gradient-to-b from-[#160D2E] via-[#0E0820] to-[#070412] flex flex-col justify-between p-6 px-8 select-none text-center font-sans relative overflow-hidden"
      >
        {/* Glow ambient meshes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-purple-600/10 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-44 h-44 rounded-full bg-indigo-600/5 blur-[70px] pointer-events-none" />

        {/* Section 1: Title and circular profile */}
        <div className="pt-8">
          <h2 className="text-white text-2xl font-black tracking-wide mb-6">
            Session Overview
          </h2>

          {/* Glowing Avatar Border match Screenshot */}
          <div className="relative w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-[#FB52FF] via-[#B849FF] to-[#3B66FF] flex items-center justify-center mx-auto shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <div className="w-full h-full rounded-full bg-[#160D2E] p-[1.5px] overflow-hidden">
              <img 
                src={isBroadcasting ? currentUser.avatarUrl : activeStreamer?.avatarUrl || "https://picsum.photos/seed/ndnd/150/150"} 
                alt="Creator avatar" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>

          <h3 className="text-[#F4E3FF] font-black text-lg mt-3.5 tracking-tight leading-none">
            {isBroadcasting ? currentUser.fullName || "ndnd" : activeStreamer?.fullName || "ndnd"}
          </h3>
          <p className="text-[#A49CC2] text-xs font-bold mt-1.5 opacity-85">
            @{isBroadcasting ? currentUser.username : activeStreamer?.username || "dnsn"}
          </p>
          <p className="text-[#8174AB] text-[9px] font-mono font-bold tracking-widest mt-1.5 uppercase">
            ID: 87444055
          </p>
        </div>

        {/* Section 2: Precise 3 columns x 2 rows grid matches Screenshot */}
        <div className="grid grid-cols-3 gap-y-7 gap-x-2 w-full max-w-sm mx-auto my-6 border border-[#2B1B48]/40 rounded-2xl bg-[#140D25]/75 p-5 shadow-2xl relative z-10">
          
          <div className="flex flex-col items-center justify-center text-center p-1 border-r border-[#2B1B48]/20">
            <span className="text-white font-black text-lg font-sans drop-shadow-sm">
              {totalUniqueUsers}
            </span>
            <span className="text-[#A49CC2] text-[10px] font-bold mt-1 tracking-tight leading-none whitespace-nowrap">
              Total Users
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-1 border-r border-[#2B1B48]/20">
            <span className="text-white font-black text-lg font-sans drop-shadow-sm">
              {totalGiftsCount}
            </span>
            <span className="text-[#A49CC2] text-[10px] font-bold mt-1 tracking-tight leading-none whitespace-nowrap">
              Total Gift
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-1">
            <span className="text-white font-black text-lg font-sans drop-shadow-sm">
              {chatMessages.length}
            </span>
            <span className="text-[#A49CC2] text-[10px] font-bold mt-1 tracking-tight leading-none whitespace-nowrap">
              Total Live Chat
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-1 border-t border-r border-[#2B1B48]/20 pt-4">
            <span className="text-white font-black text-lg font-sans drop-shadow-sm">
              {sessionFollowCount}
            </span>
            <span className="text-[#A49CC2] text-[10px] font-bold mt-1 tracking-tight leading-none whitespace-nowrap">
              Follow Count
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-1 border-t border-r border-[#2B1B48]/20 pt-4">
            <span className="text-white font-black text-[#FCD34D] text-lg font-sans drop-shadow-sm">
              {totalCoinsEarned}
            </span>
            <span className="text-[#A49CC2] text-[10px] font-bold mt-1 tracking-tight leading-none whitespace-nowrap">
              Coins Earned
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-1 border-t border-[#2B1B48]/20 pt-4">
            <span className="text-white font-black text-md font-mono mt-0.5 tracking-tight drop-shadow-sm">
              {formatDurationHorizontal(durationSeconds)}
            </span>
            <span className="text-[#A49CC2] text-[10px] font-bold mt-1 tracking-tight leading-none whitespace-nowrap">
              Duration
            </span>
          </div>

        </div>

        {/* Section 3: Pill action button */}
        <div className="pb-8">
          <button
            onClick={onClose}
            className="w-full max-w-[240px] mx-auto py-3 rounded-full bg-gradient-to-r from-[#9E5DFF] to-[#B76EFC] text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-purple-900/40 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
          >
            Back To Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="live-cohost-arena-parent" 
      className={
        isFullscreen 
          ? "fixed inset-0 z-[65] w-screen h-screen bg-black font-sans text-stone-100 flex flex-col justify-between overflow-hidden p-0 m-0 border-0 rounded-none shadow-none"
          : "w-full min-h-screen md:min-h-0 md:max-w-md mx-auto relative font-sans text-stone-100 md:py-3 py-0 md:px-2 px-0"
      }
    >
      
      {/* 1. SETUP OVERLAY DIALOG IF UNINITIALIZED BROADCASTER */}
      {isBroadcasting && !isLiveActive ? (
        <div id="broadcaster-setup-card-mobile" className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 blur-[60px] pointer-events-none"></div>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-xl">
              <Video className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Start Creator Live Stream</h2>
              <p className="text-xs text-stone-400">Launch a multi-guest co-hosting grid</p>
            </div>
          </div>

          <form onSubmit={startBroadcasting} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono uppercase text-stone-400 tracking-wider mb-2 font-bold">
                Broadcast Theme / Title
              </label>
              <input
                type="text"
                required
                maxLength={50}
                placeholder="Going Live! Co-hosting with loop fans 🎤🔥"
                value={setupTitle}
                onChange={(e) => setSetupTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-950/70 border border-stone-850 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500 font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 tracking-wider mb-2 font-bold">
                  Format Category
                </label>
                <select
                  value={setupCategory}
                  onChange={(e) => setSetupCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-950/70 border border-stone-850 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="Gaming & Esports">Gaming & Esports 🎮</option>
                  <option value="IRL Talk">IRL Talk & Chat</option>
                  <option value="Tech Loop">Coding & Projects</option>
                  <option value="Music Box">DJ & Music Codes</option>
                  <option value="Boutique">Showcase Boutique</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 tracking-wider mb-2 font-bold">
                  Video Feed Background
                </label>
                <select
                  value={setupVideoFeed}
                  onChange={(e) => setSetupVideoFeed(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-950/70 border border-stone-850 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="Battlefield High-Action Warzone 🧨">Battlefield Warzone 🧨</option>
                  <option value="Cosmic Nebula Loop 🌌">Cosmic Nebula 🌌</option>
                  <option value="Neon Cybercity Sunset 🌆">Cybercity Sunset 🌆</option>
                  <option value="Techno Beats Music Deck 🎧">Techno Beats 🎧</option>
                  <option value="Retro Cozy Anime Study 🏮">Anime Study 🏮</option>
                  <option value="Matrix Grid Code Flow 📟">Matrix Flow 📟</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-400 tracking-wider mb-2 font-bold">
                  Host Handle
                </label>
                <div className="px-3.5 py-2.5 bg-stone-950/35 border border-stone-850 rounded-xl text-stone-400 text-xs truncate font-mono">
                  @{currentUser.username}
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-950/50 rounded-xl border border-stone-850/80 text-[11px] text-stone-400 leading-relaxed">
              <span className="font-extrabold text-amber-400 text-[10px] uppercase block tracking-wider mb-1">
                🎧 Co-Hosting Guidelines
              </span>
              Click interactive co-host squares during your stream to let chat fans join your podium. Live viewers can tip you flowers, crown rewards and premium gifts at any stage!
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-stone-800 text-stone-300 font-bold rounded-xl hover:bg-stone-850 transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-purple-500 text-white font-black rounded-xl shadow-lg hover:from-red-400 hover:to-purple-400 transition-all cursor-pointer text-xs"
              >
                Go Live Now
              </button>
            </div>

            {/* LIVE COMMUNITY DIRECTORY SECTION - "list live all user" requested */}
            <div className="space-y-3 pt-4 border-t border-stone-850 mt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5 font-sans">
                  <Users className="w-3.5 h-3.5" /> Discovery Directory
                </h4>
                <div className="flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                   <span className="text-[8px] text-stone-500 font-mono font-bold uppercase">{otherLives.length} Online</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1 overflow-x-hidden">
                {otherLives.length > 0 ? (
                  otherLives.map(live => (
                    <div 
                      key={live.id} 
                      onClick={() => {
                        // In setup mode, allow joining directly if they decide not to stream
                        onClose(); // Close setup
                        // This would require a parent callback to "setSelectedStreamer(live)"
                        // Since we don't have it direct, we'll just show it for now as info
                        // unless we want to enhance the onJoin props.
                      }}
                      className="flex items-center justify-between p-3 bg-stone-950/40 border border-stone-850/60 rounded-2xl group transition-all hover:border-indigo-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={live.avatarUrl} className="w-10 h-10 rounded-full border border-stone-800 object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-600 border-2 border-stone-900 animate-pulse"></div>
                        </div>
                        <div className="max-w-[120px]">
                          <p className="text-[11px] font-black text-white leading-none truncate">{live.fullName}</p>
                          <p className="text-[9px] text-stone-500 font-mono mt-1">@{live.username}</p>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-lg uppercase tracking-widest border border-indigo-500/10">{live.category.split(' ')[0]}</div>
                         <div className="text-[9px] text-stone-400 font-mono mt-1.5 flex items-center gap-1 justify-end font-bold">
                           <Users className="w-2.5 h-2.5 text-stone-500" /> {live.viewersCount}
                         </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border border-dashed border-stone-850 rounded-2xl">
                    <p className="text-[10px] text-stone-500 font-medium italic">Your loop will be the first active channel!</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* 2. THE MAIN STREAMING WINDOW EMULATOR BEZEL SCREEN */
        <div 
          id="live-bezel-wrapper" 
          className="relative w-full h-[100dvh] md:h-auto md:aspect-[9/16] max-w-md bg-black md:rounded-[36px] md:border-[5px] md:border-stone-800 shadow-2xl overflow-hidden flex flex-col justify-between mx-auto"
          style={{ background: "#0c0816" }}
        >
          {/* Custom style injection for high performance CSS animations */}
          <style>{`
            @keyframes fallAndSpin {
              0% {
                transform: translateY(0px) rotate(0deg);
                opacity: 0;
              }
              10% {
                opacity: 1;
              }
              90% {
                opacity: 1;
              }
              100% {
                transform: translateY(450px) rotate(720deg);
                opacity: 0;
              }
            }
            @keyframes walkLion {
              0% {
                transform: translateX(120%) scaleX(-1);
              }
              15% {
                transform: translateX(70%) scaleX(-1);
              }
              45% {
                transform: translateX(10%) scaleX(-1);
              }
              65% {
                transform: translateX(-30%) scaleX(-1);
              }
              90% {
                transform: translateX(-80%) scaleX(-1);
              }
              100% {
                transform: translateX(-155%) scaleX(-1);
              }
            }
            @keyframes wiggleTail {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(22deg); }
            }
            @keyframes strideLegLeft {
              0%, 100% { transform: rotate(-22deg); }
              50% { transform: rotate(26deg); }
            }
            @keyframes strideLegRight {
              0%, 100% { transform: rotate(26deg); }
              50% { transform: rotate(-22deg); }
            }
            @keyframes bounceMane {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-4px); }
            }
          `}</style>

          {/* Rose Shower overlay */}
          {roseShowerActive && (
            <div className="absolute inset-x-0 top-0 bottom-24 z-[45] pointer-events-none overflow-hidden h-full w-full">
              {[...Array(35)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute select-none text-2xl filter drop-shadow-md text-red-500"
                  style={{
                    top: `-10%`,
                    left: `${Math.random() * 100}%`,
                    animation: `fallAndSpin ${2.8 + Math.random() * 2.5}s linear infinite`,
                    animationDelay: `${Math.random() * 2.2}s`,
                    transform: `scale(${0.6 + Math.random() * 0.7})`
                  }}
                >
                  🌹
                </div>
              ))}
            </div>
          )}

          {/* Subscribe star overlay bubble alert */}
          {showSubscriptionAlert && (
            <div className="absolute inset-x-4 top-20 z-[48] pointer-events-none flex justify-center animate-bounce">
              <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 px-4 py-2 rounded-2xl border border-yellow-300 shadow-xl flex items-center gap-2">
                <span className="text-xl">🌟</span>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider leading-none">VIP SUBSCRIBER GAINED!</span>
                  <span className="text-[8px] font-bold text-stone-900 leading-none mt-1">Thank you for supporting this creator loop</span>
                </div>
                <span className="text-xl">🌟</span>
              </div>
            </div>
          )}

          {/* Majestic Walking Lion Graphic Overlay */}
          {lionActive && (
            <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden select-none flex flex-col justify-between p-4 bg-gradient-to-t from-amber-650/10 via-transparent to-transparent">
              {/* Top Banner announcing the summon */}
              <div className="w-full flex justify-center mt-20 animate-[bounce_2s_infinite]">
                <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-2 border-yellow-300 text-stone-950 px-4 py-1.5 rounded-full shadow-lg shadow-yellow-900/50 flex items-center gap-2 animate-scaleUp">
                  <span className="text-lg">👑</span>
                  <span className="text-[10px] font-black uppercase tracking-wider font-sans leading-none">
                    PRESTIGIOUS KING LION GIFT SUMMONED!
                  </span>
                  <span className="text-lg">🦁</span>
                </div>
              </div>

              {/* Glittering sparkles trailing */}
              {[...Array(15)].map((_, i) => (
                <div
                  key={`sparkle-${i}`}
                  className="absolute text-yellow-300 text-xs animate-ping"
                  style={{
                    top: `${30 + Math.random() * 50}%`,
                    left: `${10 + Math.random() * 80}%`,
                    animationDelay: `${i * 150}ms`,
                    animationDuration: `${1.2 + Math.random() * 1.8}s`
                  }}
                >
                  ✨
                </div>
              ))}

              {/* Majestic Walking Lion Graphic (Animated via css keyframe walkLion) */}
              <div 
                className="absolute bottom-24 left-0 w-44 h-32 flex items-end justify-center"
                style={{
                  animation: "walkLion 7s linear forwards",
                }}
              >
                <svg
                  viewBox="0 0 100 80"
                  className="w-full h-full filter drop-shadow-[0_4px_12px_rgba(217,119,6,0.6)]"
                >
                  {/* Main Body */}
                  <path d="M 30,35 Q 45,30 65,37 L 72,40 L 72,52 L 28,48 Z" fill="#D97706" />
                  
                  {/* Back Mane or Neck */}
                  <path d="M 22,25 Q 35,28 35,42 Q 22,48 18,35 Z" fill="#92400E" />

                  {/* Under Belly */}
                  <path d="M 32,48 L 65,51 L 62,55 L 35,53 Z" fill="#F59E0B" />

                  {/* Head & Crown */}
                  <g style={{ animation: "bounceMane 0.8s ease-in-out infinite" }}>
                    {/* Majestic Crown */}
                    <path d="M 12,8 L 14,14 L 18,10 L 22,14 L 24,8 L 22,18 L 14,18 Z" fill="#FBBF24" stroke="#FFF" strokeWidth="0.5" />
                    <circle cx="12" cy="7" r="0.8" fill="#FFF" />
                    <circle cx="18" cy="9" r="0.8" fill="#FFF" />
                    <circle cx="24" cy="7" r="0.8" fill="#FFF" />

                    {/* Thick Fluffy Mane */}
                    <path d="M 10,22 Q 25,12 32,25 Q 34,42 22,46 Q 5,42 10,22 Z" fill="#78350F" />
                    
                    {/* Golden Face */}
                    <path d="M 12,24 Q 18,20 22,25 L 20,34 L 14,34 Z" fill="#F59E0B" />
                    
                    {/* Proud snout */}
                    <path d="M 12,30 L 8,32 L 12,36 Z" fill="#92400E" />
                    <circle cx="11" cy="31" r="1.5" fill="#312E81" />
                    
                    {/* Focused white highlight Eye */}
                    <circle cx="17" cy="27" r="1.2" fill="#FFFFFF" />
                    <circle cx="17" cy="27" r="0.6" fill="#000000" />
                    
                    {/* Determined brow */}
                    <path d="M 15,24 L 19,25" stroke="#451A03" strokeWidth="1" strokeLinecap="round" />
                  </g>

                  {/* Golden majestic tail */}
                  <g style={{ transformOrigin: "68px 40px", animation: "wiggleTail 1.2s ease-in-out infinite" }}>
                    <path d="M 70,40 Q 82,45 80,62" fill="none" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
                    {/* Extra thick tuft clump at end */}
                    <circle cx="80" cy="62" r="5" fill="#78350F" className="animate-pulse" />
                  </g>

                  {/* Front Left Leg */}
                  <g style={{ transformOrigin: "35px 48px", animation: "strideLegLeft 0.8s ease-in-out infinite" }}>
                    <rect x="32" y="47" width="6" height="15" rx="2" fill="#D97706" />
                    <rect x="31" y="61" width="8" height="5" rx="1.5" fill="#78350F" />
                  </g>

                  {/* Rear Left Leg */}
                  <g style={{ transformOrigin: "62px 48px", animation: "strideLegLeft 0.8s ease-in-out infinite" }}>
                    <rect x="60" y="47" width="6" height="15" rx="2" fill="#D97706" />
                    <rect x="59" y="61" width="8" height="5" rx="1.5" fill="#78350F" />
                  </g>

                  {/* Front Right Leg */}
                  <g style={{ transformOrigin: "42px 48px", animation: "strideLegRight 0.8s ease-in-out infinite" }}>
                    <rect x="39" y="47" width="5.5" height="15" rx="2" fill="#B45309" />
                    <rect x="38" y="61" width="7.5" height="5" rx="1.5" fill="#451A03" />
                  </g>

                  {/* Rear Right Leg */}
                  <g style={{ transformOrigin: "67px 48px", animation: "strideLegRight 0.8s ease-in-out infinite" }}>
                    <rect x="65" y="47" width="5.5" height="15" rx="2" fill="#B45309" />
                    <rect x="64" y="61" width="7.5" height="5" rx="1.5" fill="#451A03" />
                  </g>
                </svg>
              </div>
            </div>
          )}


          {/* Simulated Backdrop live video layer */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden h-full w-full">
            {overrideVideoUrl ? (
              <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                <video
                  src={overrideVideoUrl}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {/* Immersive real-time gift video takeover tag */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/75 border border-[#FE2C55]/60 text-[10px] font-black tracking-widest text-[#FE2C55] px-3.5 py-1.5 rounded-full uppercase z-30 animate-pulse shadow-lg flex items-center gap-2 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-[#FE2C55] animate-ping" />
                  <span>🌟 LIVE GIFT VIDEO SCREEN INCOMING</span>
                </div>
              </div>
            ) : (() => {
              const theme = overrideVideoFeedTheme || activeStreamer?.videoFeedType || setupVideoFeed || "Cosmic Nebula Loop 🌌";
              if (theme.includes("Battlefield High-Action Warzone")) {
                return (
                  <div className="w-full h-full relative overflow-hidden bg-[#0A0D08]">
                    {/* Dark smoke/warzone layer */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-stone-950 via-stone-900/40 to-stone-950" />
                    <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-orange-600/10 blur-[100px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-800/20 blur-[120px]" />
                    
                    {/* Simulated debris/particles for warzone feel */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                       <div className="w-full h-full relative">
                         {[...Array(20)].map((_, i) => (
                           <div 
                             key={i}
                             className="absolute w-1 h-1 bg-amber-500/40 rounded-full animate-float"
                             style={{
                               top: `${Math.random() * 100}%`,
                               left: `${Math.random() * 100}%`,
                               animationDelay: `${Math.random() * 5}s`,
                               animationDuration: `${5 + Math.random() * 10}s`
                             }}
                           />
                         ))}
                       </div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center p-8 opacity-20">
                      <Video className="w-48 h-48 text-stone-700/50 rotate-12" />
                    </div>
                  </div>
                );
              }
              if (theme.includes("Neon Cybercity")) {
                return (
                  <div className="w-full h-full bg-gradient-to-b from-[#ff2e93]/35 via-[#260e52] to-[#040114] flex flex-col items-center justify-center relative">
                    <div className="absolute top-[25%] w-36 h-36 rounded-full bg-gradient-to-t from-yellow-300 via-pink-500 to-transparent blur-sm animate-pulse opacity-85" />
                    <div className="absolute bottom-0 inset-x-0 h-[40%] bg-[linear-gradient(0deg,transparent_24%,rgba(251,82,255,0.15)_25%,rgba(251,82,255,0.15)_26%,transparent_27%,transparent_74%,rgba(251,82,255,0.15)_75%,rgba(251,82,255,0.15)_76%,transparent_77%)] bg-[size:28px_28px] opacity-60" />
                  </div>
                );
              } else if (theme.includes("Techno Beats")) {
                return (
                  <div className="w-full h-full bg-[#0a0014] flex flex-col items-center justify-center gap-1.5 relative">
                    <div className="flex items-end gap-1 px-4 opacity-50">
                      {[14, 30, 48, 22, 40, 18, 44, 26, 36, 12, 19].map((h, i) => (
                        <div 
                          key={i} 
                          className="w-2.5 bg-gradient-to-t from-pink-500 to-indigo-500 rounded-t animate-pulse" 
                          style={{ 
                            height: `${h}px`,
                            animationDelay: `${i * 100}ms`,
                            animationDuration: `${400 + (i % 3) * 200}ms`
                          }} 
                        />
                      ))}
                    </div>
                    <span className="text-[9px] text-purple-400 font-mono tracking-widest font-black uppercase text-center mt-2">SIMULATING_TECHNO_STAGE_DECK</span>
                  </div>
                );
              } else if (theme.includes("Retro Cozy")) {
                return (
                  <div className="w-full h-full bg-gradient-to-br from-[#2e1d11] via-[#1a0e1b] to-[#0d0711] flex flex-col items-center justify-center relative">
                    <span className="text-3xl animate-bounce mb-2">🏮</span>
                    <div className="w-44 h-24 bg-amber-500/10 rounded-2xl border border-amber-550/20 backdrop-blur-sm p-3.5 flex flex-col justify-between text-left">
                      <div className="w-full h-1 bg-amber-500/25 rounded" />
                      <div className="text-[8px] text-amber-300 font-mono leading-relaxed uppercase">
                        ☕ Lofi chill beats corner ... simulated screen active
                      </div>
                    </div>
                  </div>
                );
              } else if (theme.includes("Matrix Grid")) {
                return (
                  <div className="w-full h-full bg-stone-950 flex flex-col items-center justify-center font-mono relative overflow-hidden select-none">
                    <div className="absolute inset-0 grid grid-cols-6 gap-2 text-green-500/20 text-[9px] p-4 text-center select-none font-bold leading-none opacity-80">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <span key={i} className="animate-pulse" style={{ animationDelay: `${i * 120}ms` }}>
                          {(Math.random() > 0.4 ? "1" : "0")}
                        </span>
                      ))}
                    </div>
                    <span className="text-green-500 text-[10px] font-bold uppercase tracking-wider block border border-green-500/30 px-3 py-1 rounded bg-black/60 z-10 font-mono scale-95">
                      CODE_STREAM_ONLINE
                    </span>
                  </div>
                );
              } else if (theme.includes("Golden") || theme.includes("Wave") || theme.includes("✨") || theme.includes("Royal")) {
                return (
                  <div className="w-full h-full bg-gradient-to-b from-amber-950/40 via-yellow-950/30 to-stone-950 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent animate-pulse" />
                    <div className="absolute -top-10 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl opacity-80" />
                    <span className="text-4xl animate-pulse filter drop-shadow">✨👑🌟</span>
                    <span className="text-[9px] font-black font-mono tracking-wider text-[#FCD34D] mt-2 uppercase">GOLDEN_ROYALTY_WAVE_ACTIVE</span>
                  </div>
                );
              } else {
                // Default: Cosmic Nebula Loop
                return (
                  <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#6b0f1a] to-[#2a040b]">
                    {/* Red Carpet / Stage Simulation */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574267432553-4b4628081524?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40"></div>
                    
                    {/* Spotlight effects */}
                    <div className="absolute top-0 left-1/4 w-96 h-[800px] bg-yellow-500/10 blur-[100px] -rotate-12 transform origin-top pointer-events-none"></div>
                    <div className="absolute top-0 right-1/4 w-96 h-[800px] bg-yellow-500/10 blur-[100px] rotate-12 transform origin-top pointer-events-none"></div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-[#8E0916]/80 via-transparent to-black/60"></div>
                  </div>
                );
              }
            })()}

            {/* Active VFX Overlay Video Filter */}
            {activeVfxFilter && (
              <div 
                className={`absolute inset-0 pointer-events-none z-1 overflow-hidden h-full w-full ${
                  activeVfxFilter === "retro-crt" 
                    ? "bg-amber-500/[0.03] before:absolute before:inset-0 before:bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.18)_50%)] before:bg-[length:100%_4px] animate-pulse" 
                    : activeVfxFilter === "neon-rainbow"
                      ? "bg-gradient-to-tr from-pink-500/10 via-purple-500/10 to-cyan-500/10 mix-blend-color-dodge animate-pulse"
                      : activeVfxFilter === "vhs-snow"
                        ? "bg-zinc-800/[0.04] skew-x-1"
                        : activeVfxFilter === "sparkling-stars"
                          ? "bg-indigo-950/10"
                          : ""
                }`}
              >
                {activeVfxFilter === "vhs-snow" && (
                  <div className="absolute inset-0 bg-transparent opacity-[0.06] pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] before:from-transparent before:via-stone-900 before:to-stone-900 animate-pulse bg-cover" 
                       style={{ backgroundImage: "url('https://media.giphy.com/media/oEI9uBXS9geNq/giphy.gif')" }} />
                )}
                {activeVfxFilter === "sparkling-stars" && (
                  <div className="absolute inset-0 overflow-hidden">
                    {[...Array(12)].map((_, idx) => (
                      <div 
                        key={idx} 
                        className="absolute text-[10px] text-yellow-250 animate-ping"
                        style={{
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          animationDelay: `${idx * 200}ms`,
                          animationDuration: `${1 + Math.random() * 2}s`
                        }}
                      >
                        ✨
                      </div>
                    ))}
                  </div>
                )}
                {/* Highlight scanning line */}
                {activeVfxFilter === "retro-crt" && (
                  <div className="absolute w-full h-1 bg-white/10 top-0 left-0 animate-[fallAndSpin_4s_linear_infinite]" />
                )}
              </div>
            )}
          </div>

          {/* Canvas Floating Gifts Particles Layer */}
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />

          {/* ================= HEADER WATERMARK (Top layout bar of stream) ================= */}
          <div className="relative z-20 px-4 pt-4 flex items-center justify-between pointer-events-none">
            
            {/* Host Tag and wave live block */}
            <div className="flex items-center gap-1.5 bg-black/45 backdrop-blur-md px-2 py-1 rounded-full border border-stone-800/40 pointer-events-auto">
              <img
                src={isBroadcasting ? currentUser.avatarUrl : activeStreamer?.avatarUrl || "https://picsum.photos/seed/ndnd/60/60"}
                alt="host user info"
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full border border-purple-500 object-cover bg-stone-900"
              />
              <div className="text-left shrink-0 max-w-[80px]">
                <h5 className="text-[10px] font-black text-white truncate leading-none">
                  {isBroadcasting ? currentUser.username : activeStreamer?.username || "ndnd"}
                </h5>
                <div className="flex items-center gap-1 mt-1">
                  <div
                    className="px-2 py-0.5 bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#F59E0B] border border-white/20 text-white text-[7px] font-black uppercase rounded-lg font-mono flex items-center gap-0.5 select-none"
                  >
                    ⭐ LV {isBroadcasting ? currentLevel : activeStreamer?.level || 1}
                  </div>
                </div>
              </div>

              {/* Dynamic status count loop views */}
              <div className="pl-1.5 flex items-center gap-1 text-stone-200 border-l border-white/10 ml-1.5">
                <span className="text-[9px] font-black uppercase text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/20 leading-none tracking-wider font-sans select-none scale-90">
                  LIVE
                </span>
                <span className="text-[10px] font-bold font-mono tracking-tight flex items-center gap-0.5 pr-0.5">
                  👁️ {viewersCount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Actions circular tray */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Sofa option list */}
              <button 
                type="button"
                className="w-8 h-8 rounded-full bg-purple-600 border border-purple-500 flex items-center justify-center text-white text-xs hover:scale-105 active:scale-95 transition-transform"
                title="Viewers Seats"
              >
                <Armchair className="w-4 h-4" />
              </button>

              {/* Filter magic wand item */}
              <button 
                type="button"
                className="w-8 h-8 rounded-full bg-[#A855F7] border border-stone-800 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
                title="Beauty Effects Menu"
              >
                <Wand2 className="w-4 h-4" />
              </button>

              {/* Fullscreen Toggle Switch (live fall screen setup) */}
              <button 
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 border cursor-pointer ${
                  isFullscreen 
                    ? "bg-rose-600 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]" 
                    : "bg-stone-900 border-stone-800 hover:border-purple-500"
                }`}
                title={isFullscreen ? "Exit Immersive Full Screen" : "Immersive Fall Screen / Full Screen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Exit streamer button */}
              {isBroadcasting ? (
                <button 
                  type="button"
                  onClick={async () => {
                    if (currentStreamerDocId && !firestoreStatus.isQuotaExceeded) {
                      try {
                        await deleteDoc(doc(db, "streamers", currentStreamerDocId));
                      } catch (err) {
                        console.error("Failed to delete streamer doc:", err);
                      }
                    }
                    setShowSessionOverview(true);
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-rose-500 border border-red-500/30 text-white font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer whitespace-nowrap"
                  title="End My Live Session"
                >
                  <Power className="w-3.5 h-3.5 text-white" /> End & Delete Live
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1.5 rounded-xl bg-black/65 border border-stone-800 flex items-center gap-1.5 text-stone-300 hover:text-white hover:bg-stone-900 hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer"
                  title="Back Home"
                >
                  <Home className="w-3.5 h-3.5 text-teal-400" /> Home
                </button>
              )}
            </div>
          </div>

          {/* ================= STREAM ALERT GESTURES / BURST BANNER ================= */}
          {activeGiftAlert && (
            <div id="custom-gift-alert-container" className="absolute top-[18%] left-4 z-40 max-w-[90%] pointer-events-none flex items-center gap-3 animate-scaleUp select-none shadow-xl">
              {/* Left Part: Compact Sleek Pill (Capsule) */}
              <div className="bg-black/95 backdrop-blur-md border border-[#5C5CFC]/40 pl-1.5 pr-8 py-1 rounded-full flex items-center gap-2.5 relative shadow-2xl min-w-[170px] h-[38px]">
                {/* 1. Flag of Kurdistan or Circular Avatar with Flag theme */}
                <div className="w-[30px] h-[30px] rounded-full overflow-hidden shrink-0 border border-emerald-500/20 flex items-center justify-center bg-stone-900 shadow">
                  {activeGiftAlert.sender.toLowerCase().includes("pitop6988") || activeGiftAlert.sender.toLowerCase().includes("you") || currentUser.username.toLowerCase().includes("pitop6988") ? (
                    <KurdistanFlagSVG />
                  ) : (
                    <img
                      src={activeGiftAlert.avatarUrl || `https://picsum.photos/seed/${activeGiftAlert.sender}/100/100`}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://picsum.photos/seed/gift/100/100";
                      }}
                      className="w-full h-full object-cover rounded-full"
                    />
                  )}
                </div>

                {/* 2. Compact Text Info */}
                <div className="text-left leading-tight min-w-0 pr-2">
                  {/* Username line */}
                  <span className="block text-[11px] font-black text-white truncate tracking-wider">
                    @{activeGiftAlert.sender.replace(" (You)", "")}
                  </span>
                  {/* Sent gift line */}
                  <span className="block text-[9px] font-medium mt-0.5 whitespace-nowrap">
                    <span className="text-purple-300">sent </span>
                    <span className="text-amber-400 font-black">{activeGiftAlert.gift.name}</span>
                  </span>
                </div>

                {/* 3. Small Animated Gift Logo/icon overlapping on the right side of the pill */}
                <div className="absolute right-[-14px] top-1/2 -translate-y-1/2 z-10 select-none pointer-events-none w-11 h-11 flex items-center justify-center animate-bounce duration-700">
                  {get3DGiftImage(activeGiftAlert.gift.name, activeGiftAlert.gift.icon) ? (
                    <img
                      src={get3DGiftImage(activeGiftAlert.gift.name, activeGiftAlert.gift.icon)!}
                      alt={activeGiftAlert.gift.name}
                      onError={(e) => {
                        // fallback to text/emoji if loading fails
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      className="w-9 h-9 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
                    />
                  ) : (
                    <span className="text-2xl filter drop-shadow font-sans">
                      {activeGiftAlert.gift.icon}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Part: Recipient Avatar with Glowing Border, angled yellow Multiplier overlay, and star pill score */}
              <div className="flex flex-col items-center gap-0.5 shrink-0 ml-1">
                {/* 4. Avatar circle of the recipient */}
                <div className="relative">
                  <div className="w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-amber-400 p-[1px] bg-black/80 shadow-lg relative shrink-0">
                    <img
                      src={activeGiftAlert.recipientAvatarUrl || "https://picsum.photos/seed/recipient/100/100"}
                      alt="Recipient"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://picsum.photos/seed/all/100/100";
                      }}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>

                  {/* 5. Angled yellow combo multiplier count over the top of the avatar */}
                  <div className="absolute -top-1.5 -right-3.5 z-20 select-none transform rotate-[-12deg] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter">
                    <span className="text-xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 tracking-tighter uppercase font-sans pr-1">
                      x{activeGiftAlert.multiplier || 1}
                    </span>
                  </div>
                </div>

                {/* Star pill score below */}
                <div className="bg-black/75 border border-amber-500/25 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 justify-center shadow min-w-[34px]">
                  <span className="text-[7px]">⭐</span>
                  <span className="text-[7px] font-mono font-black text-amber-300">
                    {activeGiftAlert.gift.cost * (activeGiftAlert.multiplier || 1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= CO-HOST PODIUMS BOX grid (Screenshot 1 aspect) ================= */}
          <div id="co-hosting-video-arena" className="px-3 flex-1 flex flex-col justify-center select-none pt-4">
            
            {/* Header with size toggle button for live mic small request */}
            <div className="flex items-center justify-between gap-1 mb-2 px-1">
              <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider flex items-center gap-1">
                🎤 Co-Host Mics ({coHostSlots.filter(s=>s.isOccupied).length}/16)
              </span>
              <button
                type="button"
                onClick={() => setIsMicSmall(!isMicSmall)}
                className="py-1 px-2.5 bg-purple-950/55 hover:bg-purple-900/40 border border-purple-500/30 rounded-full text-[8.5px] text-purple-300 font-extrabold uppercase transition-all tracking-wide cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
                title="Toggle Mic Grid Size"
              >
                <span>{isMicSmall ? "🔍 Compact Mode" : "🔎 Normal Mode"}</span>
              </button>
            </div>

            <div className={`grid grid-cols-4 ${isMicSmall ? 'gap-1.5' : 'gap-2'} w-full transition-all`}>
              
              {/* Host / Slot 1 podium box */}
              <div className={`${isMicSmall ? 'aspect-[1.3/1]' : 'aspect-square'} bg-stone-950 border border-stone-800/80 rounded-xl relative overflow-hidden flex flex-col justify-between p-1 transition-all duration-300`}>
                {/* Audio room host container */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1.5 bg-gradient-to-b from-[#18122B] to-[#0A0712] z-0">
                  {/* Glowing dynamic ring */}
                  <div className={`relative ${isMicSmall ? 'w-8 h-8' : 'w-12 h-12'} rounded-full p-[2px] bg-gradient-to-tr from-purple-500 via-pink-400 to-amber-300 animate-spin-slow transition-all`}>
                    <div className="w-full h-full rounded-full bg-stone-900 p-[1.5px]">
                      <img 
                        src={isBroadcasting ? currentUser.avatarUrl : activeStreamer?.avatarUrl || "https://picsum.photos/seed/ndnd/120/120"} 
                        alt="Host Avatar"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                  
                  {/* Score badge (live mic add score gift) */}
                  <div className={`mt-1 flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full ${isMicSmall ? 'scale-75' : 'scale-90'} leading-none`}>
                    <span className="text-[7.5px]">⭐</span>
                    <span className="text-[8.5px] font-mono font-black text-amber-300">
                      {coHostSlots.find(s => s.id === 1)?.score || 0}
                    </span>
                  </div>
                </div>

                <span className="text-[7px] text-stone-300 font-extrabold tracking-wide uppercase px-1 py-0.5 bg-purple-950/80 rounded border border-purple-500/30 z-10 w-fit">
                  Host
                </span>

                <span className="text-[8.5px] text-stone-200 font-bold truncate z-10 text-left pl-1">
                  {isBroadcasting ? currentUser.username : activeStreamer?.username || "ndnd"}
                </span>
              </div>

              {/* Slots 2 to 9 co-host grid requests box */}
              {coHostSlots.slice(1).map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => {
                     handleInteractSlot(slot.id);
                  }}
                  className={`${isMicSmall ? 'aspect-[1.3/1]' : 'aspect-square'} border rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-1 transition-all duration-300 ${
                    slot.isOccupied
                      ? "bg-purple-950/15 border-purple-500/40 cursor-pointer"
                      : slot.isRequesting
                        ? "bg-stone-900 border-amber-500/40"
                        : "bg-[#20202F] border-transparent cursor-pointer hover:bg-stone-800"
                  }`}
                >
                  {slot.isOccupied ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1 bg-gradient-to-b from-[#110e1f] to-[#06040d] z-0">
                      {/* Guest avatar pulsing ring */}
                      <div className={`relative ${isMicSmall ? 'w-7 h-7' : 'w-10 h-10'} rounded-full p-[1.5px] bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 transition-all`}>
                        <div className="w-full h-full rounded-full bg-stone-900 p-[1px]">
                          <img 
                            src={slot.avatarUrl} 
                            alt="" 
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                        {slot.statusText === "REAL" && (
                          <span className="absolute -top-1 -left-1 px-1 py-0.5 bg-emerald-500 text-stone-950 font-sans text-[5.5px] rounded-md font-black tracking-wider uppercase shadow scale-90 z-20">
                            🌐 REAL
                          </span>
                        )}
                      </div>
                      
                      {/* Live mic score badge (live mic add score gift) */}
                      <div className={`mt-0.5 flex items-center gap-0.5 px-1 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full ${isMicSmall ? 'scale-[0.65]' : 'scale-75'} leading-none`}>
                        <span className="text-[6.5px]">⭐</span>
                        <span className="text-[7.5px] font-mono font-bold text-cyan-300">
                          {slot.score || 0}
                        </span>
                      </div>

                      <span className="text-[8px] text-stone-200 font-extrabold truncate w-[75px] text-center tracking-tight leading-none mt-0.5">
                        {slot.username}
                      </span>

                      {/* Active bouncing audio sound waves (live audio microphone streaming feedback) */}
                      <div className="flex gap-[1.5px] items-end justify-center pointer-events-none mt-0.5 min-h-[6px] shrink-0 z-10 opacity-85">
                        <span className="w-[1.5px] h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
                        <span className="w-[1.5px] h-2.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.8s" }} />
                        <span className="w-[1.5px] h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.5s" }} />
                        <span className="w-[1.5px] h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "450ms", animationDuration: "0.7s" }} />
                      </div>

                      {isBroadcasting ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid triggering slot select/open drawer
                            setCoHostSlots((prevSlots) =>
                              prevSlots.map((s) =>
                                s.id === slot.id
                                  ? {
                                      ...s,
                                      username: "",
                                      avatarUrl: "",
                                      isOccupied: false,
                                      isRequesting: false,
                                      score: 0,
                                      statusText: "Request"
                                    }
                                  : s
                              )
                            );
                            
                            // Log chat disconnection
                            const leaveMsg: ChatMessage = {
                              id: `chat-leave-${Date.now()}-${Math.random()}`,
                              username: slot.username,
                              text: `disconnected from Guest Slot ${slot.id - 1}. 👋`,
                              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            };
                            setChatMessages((prev) => [...prev, leaveMsg]);
                          }}
                          className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-[7px] font-black cursor-pointer shadow z-30 transition-transform active:scale-95"
                          title="Disconnect Cohost"
                        >
                          ✕
                        </button>
                      ) : (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500 z-10 shadow-lg animate-pulse" />
                      )}
                    </div>
                  ) : slot.isRequesting ? (
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                      <span className="text-[7px] font-black text-amber-400 font-mono tracking-wider uppercase scale-90">
                        Pending
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 select-none text-center">
                      {isBroadcasting ? (
                        <>
                          <span className={`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 transition-colors`}>
                            <Plus className="w-4 h-4" />
                          </span>
                          <span className="text-[10px] text-white/60 font-bold tracking-tight mt-1">
                            {slot.id}
                          </span>
                        </>
                      ) : (
                        // Standard viewer style:
                        <>
                          <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 transition-colors">
                            <Plus className="w-4 h-4" />
                          </span>
                          <span className="text-[10px] text-white/60 font-bold tracking-tight mt-1">
                            {slot.id}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </button>
              ))}

            </div>
          </div>

          {/* USER MIC CONTROL PANEL (One-Tap Request, Back Mic, Voice Off/On) - Hidden for active Host */}
          {!isBroadcasting && (
            <div className="px-3.5 py-1 z-20 shrink-0">
            </div>
          )}

          {/* ================= COMMENTS STREAM FLOATING (Middle Overlap) ================= */}
          <div 
            id="stream-comments-dock" 
            className="px-3 max-h-[135px] overflow-y-auto space-y-1.5 text-left select-none relative z-10 w-[85%] mb-2 scrollbar-none scroll-smooth"
            style={{ scrollbarWidth: "none" }}
          >
            {chatMessages.slice(-15).map((item) => (
              <div 
                key={item.id} 
                className={`p-1.5 rounded-lg text-[10px] inline-flex items-start max-w-full backdrop-blur-md gap-1.5 ${
                  item.isSystem 
                    ? "bg-amber-600/20 border border-amber-500/10 text-amber-300 font-bold animate-pulse"
                    : item.gift
                      ? "bg-gradient-to-r from-purple-500/30 to-purple-800/10 border border-purple-500/20 text-purple-200 font-medium"
                      : "bg-black/55 text-stone-200 border border-stone-900/40"
                }`}
              >
                {!item.isSystem && item.avatarUrl && (
                   <img 
                      src={item.avatarUrl} 
                      alt={item.username} 
                      className="w-4 h-4 rounded-full object-cover shrink-0 block border border-white/20 shadow-sm mt-0.5" 
                   />
                )}
                <div className="flex-1 break-words">
                  <span className="font-bold text-amber-400 mr-1">{item.username}:</span>
                  <span className="break-all">{item.text}</span>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* Real-time Bot Filter and Settings Control Panel Bar */}
          <div className="px-3 mb-2 flex items-center justify-between gap-2 select-none relative z-10 text-[9px] shrink-0">
            <div className="flex gap-1.5 items-center">
              <span className="text-stone-400 font-extrabold uppercase tracking-wider text-[8px]">Filters:</span>
              <button
                type="button"
                onClick={() => setNoBotComments((prev) => !prev)}
                className={`py-1 px-2.5 rounded-full border text-[8px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                  noBotComments 
                    ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-400" 
                    : "bg-stone-900 border-stone-800 text-stone-400"
                }`}
                title={noBotComments ? "Authentication active: Simulated bot comments disabled." : "Simulation enabled"}
              >
                <span>{noBotComments ? "🌐 No Bot Chat" : "🤖 Bots Posting"}</span>
              </button>
              
              {isBroadcasting && (
                <button
                  type="button"
                  onClick={() => setNoBotGuests((prev) => !prev)}
                  className={`py-1 px-2.5 rounded-full border text-[8px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                    noBotGuests 
                      ? "bg-sky-950/80 border-sky-500/40 text-sky-400" 
                      : "bg-stone-900 border-stone-800 text-stone-400"
                  }`}
                  title={noBotGuests ? "Guest mic slots will only connect manually added real user profiles" : "Auto connect active"}
                >
                  <span>{noBotGuests ? "🎤 No Bot Mic Slots" : "🤖 Mic Bots"}</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-0.5" />
              <span className="text-stone-300 font-mono text-[7px] uppercase font-bold tracking-wider">ROOM ENGAGED</span>
            </div>
          </div>

          {/* Quick preset live comments taps */}
          <div className="px-3 mb-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none relative z-10">
            {["🔥 WoW!", "Nice Stream! 🎮", "Hype! 🎉", "Support! ❤️", "Go Streamer! 🚀", "Legendary! 👑", "Amazing! ✨"].map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => {
                  const newMsg: ChatMessage = {
                    id: `chat-preset-${Date.now()}-${Math.random()}`,
                    username: `${currentUser.username} (You)`,
                    text: text,
                    avatarUrl: currentUser.avatarUrl,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  };
                  setChatMessages((prev) => [...prev, newMsg]);
                }}
                className="py-1 px-2.5 bg-black/60 hover:bg-purple-950/80 backdrop-blur-sm border border-stone-800 hover:border-purple-500 text-stone-300 hover:text-white rounded-full text-[9px] font-extrabold tracking-tight shrink-0 transition-all active:scale-95 cursor-pointer leading-none"
              >
                {text}
              </button>
            ))}
          </div>

          {/* ================= BOTTOM COMMAND CONTROLS BAR (Screenshot 2 premium tap bar layout) ================= */}
          <div id="stream-footer-pane" className="relative z-20 px-4 py-3 bg-black/40 border-t border-white/5 backdrop-blur-md flex items-center justify-between gap-3">
            
            {/* Audio Volume / Speaker Mute Icon with active ripple indicator */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 hover:scale-105 active:scale-95 transition-all text-white cursor-pointer"
              title={isMuted ? "Unmute Stream Audio" : "Mute Stream Audio"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-red-400 stroke-[2.5]" />
              ) : (
                <Volume2 className="w-5 h-5 text-white stroke-[2.5] animate-pulse" />
              )}
            </button>

            {/* Spacious "Say something..." input container */}
            <form onSubmit={handleSendMessage} className="flex-1">
              <div className="relative flex items-center bg-black/35 hover:bg-black/55 border border-white/10 rounded-full py-2.5 px-4 transition-all">
                <input
                  id="chat-field-input"
                  type="text"
                  placeholder="Say something..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  maxLength={60}
                  className="w-full bg-transparent text-white text-[13px] placeholder-stone-400 font-medium focus:outline-none min-w-0"
                />
                {inputMessage.trim() && (
                  <button 
                    type="submit" 
                    className="text-purple-400 hover:text-white shrink-0 ml-1.5 cursor-pointer transition-colors"
                    title="Send Comment"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Hamburger Menu toggle icon opens the newly built premium Stream Tools Tap Menu UI matching mockup */}
            {isBroadcasting && (
              <button
                id="stream-tools-menu-btn"
                type="button"
                onClick={() => setIsTapMenuOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#7B3FFE]/10 border border-[#7B3FFE]/30 hover:bg-[#7B3FFE]/20 hover:scale-105 active:scale-95 transition-all text-[#C884FE] cursor-pointer"
                title="Stream Tools & Features Menu"
              >
                <Menu className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}

            {/* Premium Magnificent 3D Pink Gift Box with red ribbon (loads from Microsoft Fluent 3D Emoji) */}
            <button
              type="button"
              onClick={() => setIsGiftDrawerOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 hover:scale-110 active:scale-95 transition-all cursor-pointer relative group"
              title="Open Virtual Gifts Selector"
            >
              <img 
                src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Wrapped%20gift/3D/wrapped_gift_3d.png" 
                alt="3D virtual gift" 
                referrerPolicy="no-referrer"
                className="w-7 h-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform duration-350"
              />
            </button>

            {/* Interactive Comment notification badge with a red "5" bubble indicator */}
            <button
              type="button"
              onClick={() => {
                // Focus the text comment input field directly
                const chatField = document.getElementById("chat-field-input");
                if (chatField) {
                  chatField.focus();
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 hover:scale-105 active:scale-95 transition-all text-white cursor-pointer relative"
              title="Add Interactive Discussion Thread"
            >
              <MessageSquare className="w-5 h-5 text-white stroke-[2.5]" />
              <span className="absolute -top-1 -right-1 bg-red-650 text-white font-sans font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-black/80 shadow-md">
                5
              </span>
            </button>

          </div>

          {/* ========================================================================================
              3. "SEND GIFT" HIGHEST-FIDELITY BOTTOM SHEET OVERLAY PANEL (Matches Screenshot 2 layout)
              ======================================================================================== */}
          {isGiftDrawerOpen && (
            <div 
              id="send-gift-side-sheet" 
              className="absolute inset-x-0 bottom-0 z-40 bg-black/95 rounded-t-[32px] border-t-2 border-purple-500/25 p-4 flex flex-col justify-between"
              style={{ minHeight: "65%" }}
            >
              
              {/* Header handle and title of Sheet */}
              <div className="flex items-center justify-between border-b border-stone-900 pb-3 mb-3 shrink-0">
                
                {/* Visual swipe indicator handle bar */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-stone-800 rounded-full"></div>
 
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎁</span>
                  <h4 className="text-sm font-black uppercase tracking-wider text-stone-200">
                    Send Gift
                  </h4>
                </div>
 
                {/* Close modal circle icon */}
                <button
                  type="button"
                  onClick={() => setIsGiftDrawerOpen(false)}
                  className="p-1.5 bg-stone-900 border border-stone-800 rounded-full text-stone-400 hover:text-white hover:scale-105 active:scale-95 transition cursor-pointer"
                  title="Close Selector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target recipient list selector widget (live gift add list user mic tap sent gift) */}
              <div className="mb-3 bg-stone-950 p-2.5 rounded-2xl border border-stone-900 shrink-0 select-none text-left">
                <div className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wide mb-1.5 text-left flex items-center justify-between">
                  <span>Send Gift To:</span>
                  <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded tracking-normal">
                    @{selectedRecipient?.username} ({selectedRecipient?.slotLabel || "In Live"})
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {/* Host */}
                  <button
                    type="button"
                    onClick={() => setSelectedRecipient(hostRecipient)}
                    className={`px-3 py-1 bg-stone-900 border text-[10px] font-bold rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedRecipient?.username === hostRecipient.username
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white shadow-lg"
                        : "border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <img src={hostRecipient.avatarUrl} alt="" className="w-4 h-4 rounded-full bg-stone-950 object-cover" />
                    <span>{hostRecipient.username} (Host)</span>
                  </button>

                  {/* All on Mic Option (live sent gift to add all) */}
                  <button
                    type="button"
                    onClick={() => setSelectedRecipient(allRecipient)}
                    className={`px-3 py-1 bg-stone-900 border text-[10px] font-bold rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      selectedRecipient?.username === "all_recipients"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white shadow-lg"
                        : "border-stone-800 text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    <span className="text-xs">👥</span>
                    <span>All on Mic (Host + Guests)</span>
                  </button>

                  {/* Occupied guests */}
                  {coHostSlots.slice(1).filter((s) => s.isOccupied).map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedRecipient({
                        username: slot.username,
                        avatarUrl: slot.avatarUrl,
                        slotLabel: `Guest ${slot.id - 1}`,
                      })}
                      className={`px-3 py-1 bg-stone-900 border text-[10px] font-bold rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        selectedRecipient?.username === slot.username
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500 text-white shadow-lg"
                          : "border-stone-800 text-stone-400 hover:text-stone-250"
                    }`}
                    >
                      <img src={slot.avatarUrl} alt="" className="w-4 h-4 rounded-full bg-stone-950 object-cover" />
                      <span>{slot.username} (Guest {slot.id - 1})</span>
                    </button>
                  ))}
                </div>
              </div>



               {/* Warnings loop */}
              {notEnoughCoinsMsg && (
                <div className="p-2.5 mb-2 bg-red-950/70 border border-red-500/30 text-red-300 text-[10px] text-center rounded-xl font-bold animate-shake shrink-0 flex flex-col items-center justify-center gap-1.5 shadow-lg">
                  <div>⚠️ Low balance! Tap to add more, or use the quick button below:</div>
                  <button
                    type="button"
                    onClick={() => {
                      onCoinsUpdate(currentUser.coins + 5000);
                      setNotEnoughCoinsMsg(false);
                    }}
                    className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-stone-950 text-[9px] font-black uppercase rounded-lg tracking-wider transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer shadow border border-white/10"
                  >
                    🪙 Add +5,000 Coins Instantly
                  </button>
                </div>
              )}

              {/* 12 Grid Virtual gifts list (Highly styled with scrollable action) */}
              <div className="relative border border-stone-900 bg-[#0c0a12]/80 rounded-2xl p-2 mb-2 shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-purple-400 font-extrabold mb-1.5 flex items-center justify-between px-1">
                  <span>✨ Gift Collection</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAddGiftStep("password");
                        setAddGiftPassword("");
                        setAddGiftError("");
                        setShowAddGiftPrompt(true);
                      }}
                      className="text-[9px] text-amber-400 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-md font-black hover:bg-amber-500/20 transition-all select-none cursor-pointer"
                    >
                      🧬 Add Gift
                    </button>
                    <span className="text-[9px] text-stone-500 font-medium font-mono">Scroll👇</span>
                  </div>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-2 mb-2 scrollbar-none border-b border-stone-800 shrink-0">
                  <button className="text-[12px] font-bold text-white border-b-2 border-[#FE2C55] px-1 pb-1 whitespace-nowrap shrink-0">
                    ⭐ Classic
                  </button>
                  <button className="text-[12px] font-bold text-stone-500 hover:text-stone-300 px-1 pb-1 whitespace-nowrap shrink-0">
                    Premium
                  </button>
                  <button className="text-[12px] font-bold text-stone-500 hover:text-stone-300 px-1 pb-1 whitespace-nowrap shrink-0">
                    Exclusive
                  </button>
                  <button className="text-[12px] font-bold text-stone-500 hover:text-stone-300 px-1 pb-1 whitespace-nowrap shrink-0">
                    Fun
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 h-[180px] overflow-y-auto p-0.5 scrollbar-thin scrollbar-thumb-purple-900/40">
                  {giftsList.map((gift) => {
                    const isSelected = selectedGiftId === gift.id;
                    return (
                      <div
                        key={gift.id}
                        onClick={() => setSelectedGiftId(gift.id)}
                        className={`relative p-1.5 min-h-[96px] rounded-2xl flex flex-col items-center justify-between transition-all duration-300 cursor-pointer select-none ${
                          isSelected 
                            ? "bg-[#632890]/15 border-2 border-[#FE2C55]/90 scale-95 shadow-md" 
                            : "bg-stone-950/90 border border-stone-900 hover:border-purple-900/50"
                        }`}
                      >
                        {/* Animated Floating preview for high-resolution 3D images */}
                        <div className="w-12 h-12 flex items-center justify-center shrink-0">
                          {get3DGiftImage(gift.name, gift.icon) ? (
                            <img 
                              src={get3DGiftImage(gift.name, gift.icon)!} 
                              alt={gift.name} 
                              referrerPolicy="no-referrer"
                              className="w-[42px] h-[42px] object-contain drop-shadow"
                            />
                          ) : (
                            <span className="text-2xl filter drop-shadow">{gift.icon}</span>
                          )}
                        </div>

                        {isSelected ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendGiftLocal(gift);
                            }}
                            className="w-full py-1 text-[10px] font-black uppercase text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 rounded-lg tracking-wider transition-all scale-100 active:scale-95 cursor-pointer shadow-md mt-1 animate-scaleUp"
                          >
                            Send
                          </button>
                        ) : (
                          <div className="w-full flex flex-col items-center">
                            <span className="text-[10px] font-bold text-stone-200 text-center truncate w-full px-1 leading-none">
                              {gift.name}
                            </span>
                            <span className="text-[8.5px] font-extrabold text-[#ECC94B] tracking-tight flex items-center justify-center gap-0.5 mt-0.5">
                              🪙 {gift.cost < 1000 ? gift.cost : `${(gift.cost / 1000).toFixed(1)}k`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
            </div>

            {/* Bottom footer bar: Golden buy coin pill indicator with Combo action */}
              <div className="mt-3 py-3 border-t border-stone-900 flex items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/5 rounded p-1 transition-colors" onClick={() => onCoinsUpdate(currentUser.coins)}>
                    <div className="flex items-center gap-1 text-[12px] font-black text-amber-400">
                      <span>🪙</span>
                      <span>{currentUser.coins}</span>
                    </div>
                    <span className="text-[12px] font-bold text-amber-500 flex items-center">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* MAGNIFICENT COMBO BUTTON FOR TAP EXTREME EXPERIENCE - MATCHES SCREENSHOT 3 */}
                {selectedGiftId && (
                  <div className="relative flex items-center justify-center pr-2 shrink-0">
                    {/* Combo completion floaty reward banner text */}
                    {comboCompletionMsg && (
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-amber-400 animate-bounce bg-stone-950/90 border border-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap shadow-md">
                        {comboCompletionMsg}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const activeGift = giftsList.find(g => g.id === selectedGiftId);
                        if (activeGift) {
                          setComboPulse(true);
                          setTimeout(() => setComboPulse(false), 120);

                          const nextCount = comboCount + 1;
                          setComboCount(nextCount);

                          // Instantly trigger gift billing/visuals with this combo count
                          handleSendGiftLocal(activeGift, nextCount);

                          // Manage combo timeout loop
                          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
                          comboTimerRef.current = setTimeout(() => {
                            setComboCompletionMsg(`Combo x${nextCount} Sent! ✨`);
                            setComboCount(0);
                            setTimeout(() => setComboCompletionMsg(""), 2000);
                          }, 2500);
                        }
                      }}
                      className={`relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF1E6D] via-[#f43f5e] to-[#ec4899] hover:brightness-110 active:scale-90 transition-all flex flex-col items-center justify-center border-2 border-white/20 shadow-lg shadow-pink-900/40 select-none cursor-pointer ${
                        comboPulse ? "scale-110 rotate-3" : "scale-100"
                      }`}
                      style={{ touchAction: "manipulation" }}
                      title="Tap repeatedly for custom Gift Combo hits!"
                    >
                      {/* Interactive timing circular border spin */}
                      {comboCount > 0 && (
                        <div className="absolute inset-0 rounded-full border border-dashed border-yellow-300 animate-[spin_8s_linear_infinite]" />
                      )}
                      
                      <span className="text-white font-sans font-black italic text-[11px] uppercase tracking-wide">
                        Combo
                      </span>

                      {/* Overlap active multiplier counter container - MATCHES SCREENSHOT 3 RED badge */}
                      {comboCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-[#FF1E6D] border border-white rounded-full min-w-5 h-5 px-1 py-0.5 flex items-center justify-center shadow-md animate-[bounce_0.3s_ease] leading-none">
                          <span className="text-[9px] font-black font-sans italic text-white text-center">
                            {comboCount}
                          </span>
                        </div>
                      )}
                    </button>
                    {comboCount === 0 && (
                      <span className="absolute -left-12 text-[8px] font-mono font-bold text-stone-500 uppercase tracking-widest pointer-events-none animate-pulse">
                        Tap here 👉
                      </span>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ==========================================================
              ADMIN PASSWORD PORTAL & ADD CUSTOM GIFT DIALOG SCREEN
              ========================================================== */}
          {showAddGiftPrompt && (
            <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 animate-fadeIn">
              <div className="w-full bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-2xl relative max-w-[340px]">
                
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowAddGiftPrompt(false)}
                  className="absolute top-3 right-3 p-1.5 bg-stone-950 border border-stone-850 rounded-full text-stone-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* --- step 1: Enter Password "EMAD8912" --- */}
                {addGiftStep === "password" ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <span className="text-2xl">🔐</span>
                      <h4 className="text-sm font-black text-stone-100 uppercase tracking-widest mt-2">
                        Admin Creator Portal
                      </h4>
                      <p className="text-[9px] text-stone-400">Unlock password protection to customize gift configurations.</p>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="block text-[9px] font-mono uppercase text-stone-400 font-extrabold">Enter Password</label>
                      <div className="relative flex items-center bg-stone-950 rounded-xl px-3 py-2 border border-stone-850">
                        <input
                          type={showPasswordText ? "text" : "password"}
                          placeholder="••••••••"
                          value={addGiftPassword}
                          onChange={(e) => setAddGiftPassword(e.target.value)}
                          className="w-full bg-transparent text-white text-xs focus:outline-none min-w-0 font-mono tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordText(!showPasswordText)}
                          className="text-stone-400 hover:text-stone-200 text-xs shrink-0 pl-1 select-none cursor-pointer font-bold font-mono"
                        >
                          {showPasswordText ? "HIDE" : "SHOW"}
                        </button>
                      </div>
                      {addGiftError && (
                        <p className="text-[9px] text-red-500 font-bold font-mono animate-pulse">❌ {addGiftError}</p>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (addGiftPassword === "EMAD8912") {
                            setAddGiftStep("form");
                            setAddGiftError("");
                          } else {
                            setAddGiftError("Invalid password! Retry or Close.");
                          }
                        }}
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black uppercase rounded-xl shadow-lg border border-white/5 active:scale-95 transition-all text-center cursor-pointer"
                      >
                        Verify & Unlock
                      </button>
                    </div>
                  </div>
                ) : (
                  /* --- step 2: Custom Gift Form --- */
                  <div className="space-y-3.5 text-left">
                    <div className="text-center">
                      <span className="text-2xl">🎨</span>
                      <h4 className="text-sm font-black text-stone-200 uppercase tracking-wide mt-1">Add Premium Gift Custom</h4>
                    </div>

                    <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                      {/* Name input */}
                      <div>
                        <label className="block text-[8px] font-mono text-stone-400 uppercase tracking-widest mb-1">Gift Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Diamond Sword"
                          value={newGiftName}
                          onChange={(e) => setNewGiftName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-850 rounded-lg text-white text-xs focus:outline-none"
                        />
                      </div>

                      {/* Icon Emojis or SIMULATED IMAGE FILE UPLOAD */}
                      <div>
                        <label className="block text-[8px] font-mono text-stone-400 uppercase tracking-widest mb-1">Gift Image File or Emoji</label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Emoji e.g. ⚔️"
                            value={newGiftIcon}
                            onChange={(e) => setNewGiftIcon(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-850 rounded-lg text-white text-xs focus:outline-none"
                          />
                          
                          {/* File input (add gift image file) */}
                          <div className="border border-stone-800 hover:border-purple-500/50 bg-stone-950/40 p-2 rounded-lg relative flex flex-col items-center cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setSimulatedFileName(file.name);
                                  const localUrl = URL.createObjectURL(file);
                                  setNewGiftIcon(localUrl); // Sets image preview URL safely
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            />
                            <div className="text-center">
                              <span className="text-xs text-purple-400 font-bold block">📂 Select image file</span>
                              <span className="text-[7px] text-stone-500 block leading-normal mt-0.5">Loads PNG, JPG or GIF</span>
                              {simulatedFileName && (
                                <span className="text-[8px] text-green-400 font-mono font-bold mt-1 block truncate">
                                  ✔️ {simulatedFileName} Loaded
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Coin cost input */}
                      <div>
                        <label className="block text-[8px] font-mono text-stone-400 uppercase tracking-widest mb-1">Gold Coins Cost</label>
                        <input
                          type="number"
                          min="1"
                          max="99999"
                          placeholder="Coin amount"
                          value={newGiftCost}
                          onChange={(e) => setNewGiftCost(parseInt(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-stone-950 border border-stone-850 rounded-lg text-white text-xs focus:outline-none font-mono"
                        />
                      </div>

                        {/* Video feedback screen setting selection */}
                        <div>
                          <label className="block text-[8px] font-mono text-stone-400 uppercase tracking-widest mb-1">Video Gift Screen Override</label>
                          <div className="space-y-2">
                            <select
                              value={newGiftVideoTheme}
                              onChange={(e) => setNewGiftVideoTheme(e.target.value)}
                              className="w-full px-2 py-1.5 bg-stone-950 border border-stone-850 rounded-lg text-stone-300 text-xs focus:outline-none focus:border-purple-500 outline-none cursor-pointer"
                            >
                              <option value="Cosmic Nebula Loop 🌌">Cosmic Nebula Loop 🌌</option>
                              <option value="Neon Cybercity 🌆">Neon Cybercity Sunset 🌆</option>
                              <option value="Techno Beats 🎵">Techno Stage Pulsing 🎵</option>
                              <option value="Retro Cozy 🏮">Retro Cozy Lantern corner 🏮</option>
                              <option value="Matrix Grid 📟">Digital Hacker Matrix Grid 📟</option>
                              <option value="Golden Wave ✨">Golden Royalty Sparkle ✨</option>
                            </select>

                            {/* File input (add gift video file override) */}
                            <div className="border border-stone-800 hover:border-blue-500/50 bg-stone-950/40 p-2 rounded-lg relative flex flex-col items-center cursor-pointer group">
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setSimulatedGiftVideoFileName(file.name);
                                    setSelectedVideoFile(file);
                                    const localUrl = URL.createObjectURL(file);
                                    setNewGiftVideoUrl(localUrl);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                              />
                              <div className="text-center">
                                <span className="text-[9px] text-blue-400 font-bold block group-hover:text-blue-300 transition-colors">🎞️ ADD GIFT VIDEO FILE</span>
                                <span className="text-[7px] text-stone-500 block leading-normal mt-0.5 uppercase tracking-tighter">Overrides host background screen</span>
                                {simulatedGiftVideoFileName && (
                                  <span className="text-[8px] text-blue-400 font-mono font-bold mt-1 block truncate">
                                    ✔️ VIDEO: {simulatedGiftVideoFileName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[8px] text-purple-400/90 leading-tight block mt-1">Sends golden overlays and temporarily replaces host stream template.</span>
                        </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAddGiftStep("password")}
                        className="flex-1 py-2 border border-stone-800 text-stone-405 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!newGiftName.trim() || !auth.currentUser) return;
                          
                          const giftId = `gift-custom-${Date.now()}`;
                          const customObj: any = {
                            id: giftId,
                            name: newGiftName.trim(),
                            icon: newGiftIcon.trim() || "🎁",
                            cost: newGiftCost,
                            category: "premium",
                            animationStyle: "sparkle",
                            creatorId: auth.currentUser.uid,
                            createdAt: serverTimestamp()
                          };

                          // Attach video theme override properties safely
                          if (newGiftVideoUrl) {
                            customObj.customVideoUrl = newGiftVideoUrl;
                          } else {
                            customObj.videoFeedTheme = newGiftVideoTheme;
                          }

                          if (selectedVideoFile) {
                            try {
                              await saveVideoToIndexedDB(giftId, selectedVideoFile);
                            } catch (e) {
                              console.error("IndexedDB error writing video:", e);
                            }
                          }

                          try {
                            if (firestoreStatus.isQuotaExceeded) {
                               setAddGiftError("Quota exceeded. Gift added locally only.");
                               setGiftsList(prev => [...prev, customObj]);
                               setAddGiftStep("password");
                               setShowAddGiftPrompt(false);
                               return;
                            }
                            await setDoc(doc(db, "gifts", giftId), customObj);
                            setSelectedGiftId(giftId);
                            
                            // Reset states and exit
                            setShowAddGiftPrompt(false);
                            setNewGiftName("");
                            setSimulatedFileName("");
                            setSimulatedGiftVideoFileName("");
                            setNewGiftVideoUrl("");
                            setSelectedVideoFile(null);
                            setNewGiftIcon("👑");
                          } catch (err) {
                            handleFirestoreError(err, OperationType.WRITE, `gifts/${giftId}`);
                          }
                        }}
                        className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-yellow-550 hover:from-amber-400 text-stone-950 text-xs font-black uppercase rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Create Gift
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ========================================================================================
              ACTIVE FLOATING CHANNELS & INTERACTIVE FEATURES WIDGETS
              ======================================================================================== */}

          {/* A. Lucky Bag / Red Envelope Claim widget */}
          {luckyBagActive && !luckyBagClaimed && (
            <div className="px-3.5 mb-2 relative z-30">
              <div className="bg-gradient-to-r from-red-650 to-rose-550 border border-red-500 rounded-2xl p-3 shadow-xl flex items-center justify-between text-left animate-bounce select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shadow-inner">
                    🧧
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-white uppercase tracking-wider">Lucky Bag Coin Drop!</h5>
                    <p className="text-[9px] text-amber-200 font-bold leading-none mt-1">Claim free gift coins before expire!</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const winCoins = Math.floor(Math.random() * 320) + 120;
                    setLuckyBagClaimed(true);
                    setLuckyBagActive(false);
                    onCoinsUpdate(currentUser.coins + winCoins);
                    
                    setChatMessages(c => [...c, {
                      id: `system-luckybag-${Date.now()}`,
                      username: "🎉 CONGRATS",
                      text: `You just opened the stream Lucky Bag and claimed ${winCoins} free coins! 🪙🎁`,
                      isSystem: true,
                      avatarUrl: "",
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    }]);

                    try {
                      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.type = "sine";
                      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
                      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
                      gain.gain.setValueAtTime(0.06, ctx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.start();
                      osc.stop(ctx.currentTime + 0.6);
                    } catch (e) {}
                  }}
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-stone-950 text-[10px] font-black uppercase rounded-lg shadow-md tracking-wider active:scale-95 transition-all cursor-pointer leading-none flex items-center gap-1"
                >
                  <span>CLAIM ({luckyBagCountdown}s)</span>
                </button>
              </div>
            </div>
          )}

          {/* B. Rolling Dice Shake Simulation Overlay */}
          {isRollingDice && (
            <div className="absolute inset-x-4 top-[35%] z-[47] flex justify-center pointer-events-none select-none">
              <div className="bg-black/85 border border-purple-500/40 p-4 rounded-full flex items-center gap-3 shadow-2xl animate-pulse">
                <span className="text-3xl animate-bounce">🎲</span>
                <span className="text-[11px] text-white font-mono uppercase tracking-widest font-black">Shaking Live Dice Loops...</span>
              </div>
            </div>
          )}

          {/* Dice Result Badge Card */}
          {diceResult !== null && (
            <div className="px-3.5 mb-2 relative z-30">
              <div className="bg-stone-900 border border-purple-500 p-2.5 rounded-2xl flex items-center justify-between text-left shadow-lg scale-95 select-none font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎲</span>
                  <div>
                    <span className="block text-[8px] text-purple-400 font-extrabold uppercase">DICE ROLL SETTLED</span>
                    <span className="block text-[11.5px] text-white font-black">Rolled Score: {diceResult}</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setDiceResult(null)} 
                  className="p-1 text-stone-400 hover:text-white font-black text-xs cursor-pointer"
                >
                  X
                </button>
              </div>
            </div>
          )}

          {/* C. Lucky Number Badge Card overlay */}
          {showLuckyNumberBadge && luckyNumber !== null && (
            <div className="px-3.5 mb-2 relative z-30">
              <div 
                onClick={() => {
                  const num = Math.floor(Math.random() * 99) + 1;
                  setLuckyNumber(num);
                  setChatMessages(c => [...c, {
                    id: `lucky-num-change-${Date.now()}`,
                    username: "🍀 LUCKY REF",
                    text: `Broadcaster re-rolled the daily lucky number to ${num}! 🎉 Double tap to claim luck!`,
                    isSystem: true,
                    avatarUrl: "",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  }]);
                }}
                className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl py-2 px-3.5 flex items-center justify-between text-left shadow-lg scale-95 hover:border-emerald-400 cursor-pointer active:scale-95 transition-all select-none"
                title="Tap to re-roll lucky stream number!"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🍀</span>
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest leading-none">
                    LUCKY NUMBER ACTIVE
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-black py-0.5 px-2.5 bg-emerald-500 text-stone-950 rounded-full animate-pulse shadow-md">
                    {luckyNumber}
                  </span>
                  <span className="text-[8px] text-stone-400">Tap to reroll</span>
                </div>
              </div>
            </div>
          )}

          {/* D. Synthesizer Beat Track play bar */}
          {isMusicSynthPlaying && (
            <div className="px-3.5 mb-2 relative z-30">
              <div className="bg-[#1a0f30]/90 border border-[#8B5CF6]/30 rounded-2xl p-2 flex items-center justify-between shadow-lg select-none text-left font-sans">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#8B5CF6]/15 rounded-full flex items-center justify-center p-[1px] border border-[#8B5CF6]/35 animate-spin">
                    <span className="text-sm select-none">💿</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-purple-300 font-black uppercase tracking-widest leading-none">STREAM SYNTH ACTIVE</span>
                    <span className="block text-[10px] text-white font-extrabold mt-0.5 whitespace-nowrap">{synthBeatType} Loop</span>
                  </div>
                </div>

                <div className="flex gap-1">
                  {["Lofi Beat ☕", "Festival EDM 🎸", "Ambient Chill 🌌"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSynthBeatType(type)}
                      className={`px-1.5 py-1 text-[7.5px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                        synthBeatType === type 
                          ? "bg-[#8B5CF6] text-white shadow-md border border-[#a78bfa]" 
                          : "bg-stone-900 border border-stone-800 text-stone-400 hover:text-white"
                      }`}
                    >
                      {type.split(' ')[0]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsMusicSynthPlaying(false)}
                    className="p-1 text-red-400 bg-red-950/25 border border-red-800/35 rounded-lg hover:bg-red-900/10 transition-colors cursor-pointer"
                    title="Stop Synthesizer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* E. Active Stream Poll Widget */}
          {activePoll && (
            <div className="px-3.5 mb-2 relative z-35 text-left font-sans">
              <div className="bg-gradient-to-tr from-[#020617] to-[#0f172a] border border-[#3b82f6]/30 rounded-2xl p-3 shadow-xl select-none text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#3b82f6]/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-center justify-between mb-1.5 border-b border-[#1e293b] pb-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs animate-pulse">📊</span>
                    <span className="text-[9px] font-black uppercase text-[#3b82f6] tracking-wider leading-none">Active Channel Poll</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePoll(null)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition"
                    title="Close Poll"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <h6 className="text-[11px] font-extrabold text-[#edf2f7] mb-2 leading-tight">
                  {activePoll.question}
                </h6>

                <div className="space-y-1.5">
                  {activePoll.options.map((opt, i) => {
                    const percent = activePoll.totalVotes > 0 ? Math.round((opt.votes / activePoll.totalVotes) * 100) : 0;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const updated = activePoll.options.map((o, idx) => idx === i ? { ...o, votes: o.votes + 1 } : o);
                          setActivePoll({
                            ...activePoll,
                            options: updated,
                            totalVotes: activePoll.totalVotes + 1
                          });
                        }}
                        className="w-full relative py-1.5 px-3 bg-[#1e293b]/55 hover:bg-[#1e293b]/85 rounded-xl border border-[#334155] text-left overflow-hidden cursor-pointer transition-all active:scale-[0.98] focus:outline-none flex items-center justify-between text-[10px] font-bold text-white shadow-sm"
                      >
                        <div 
                          className="absolute inset-y-0 left-0 bg-[#3b82f6]/20 transition-all duration-500 rounded-l-xl animate-pulse" 
                          style={{ width: `${percent}%` }}
                        />
                        <span className="relative z-10 font-bold truncate pr-3">{opt.text}</span>
                        <span className="relative z-10 font-mono text-[9px] font-black text-[#60a5fa]">{opt.votes} ({percent}%)</span>
                      </button>
                    );
                  })}
                </div>
                
                <span className="block text-[7px] text-slate-500 font-bold text-right mt-1.5 uppercase font-mono tracking-widest">
                  Total votes polled: {activePoll.totalVotes}
                </span>
              </div>
            </div>
          )}

          {/* F. Draw Lots Result Overlay popover */}
          {currentDrawLot && (
            <div className="absolute inset-x-4 top-[30%] z-[48] flex justify-center animate-scaleUp text-left select-none font-sans pointer-events-auto">
              <div className="bg-gradient-to-tr from-[#1E2511] to-[#0D1204] border border-[#84cc16]/40 p-4.5 rounded-3xl w-[85%] text-center shadow-2xl">
                <span className="text-3xl animate-spin-slow inline-block">🔮</span>
                <h4 className="text-[11px] font-black text-lime-400 uppercase tracking-widest mt-2">Your Fortune Draw settled!</h4>
                <p className="text-xs font-semibold text-white mt-2.5 leading-relaxed bg-black/45 p-2 rounded-xl border border-lime-500/10">
                   "{currentDrawLot}"
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentDrawLot(null)}
                  className="mt-3.5 w-full py-1.5 bg-lime-500 hover:bg-lime-400 text-stone-950 font-black text-[10px] uppercase rounded-xl transition cursor-pointer"
                >
                  REDEEM GOOD LUCK
                </button>
              </div>
            </div>
          )}

          {/* G. Broadcaster Stream Auction Widget */}
          {activeAuction && activeAuction.isActive && (
            <div className="px-3.5 mb-2 relative z-30 text-left font-sans">
              <div className="bg-gradient-to-tr from-[#1c1917] to-[#292524] border border-[#f59e0b]/40 rounded-2xl p-3 shadow-xl select-none text-left relative">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-880">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">🔨</span>
                    <span className="text-[9px] font-black uppercase text-[#e7a221] tracking-wider leading-none">Interactive Auction</span>
                  </div>
                  <div className="text-[8.5px] font-bold text-red-400 tracking-wider bg-red-950/40 border border-red-900/30 py-0.5 px-2 rounded-full font-mono animate-pulse">
                     TIME LEFT: {activeAuction.timeSecs}s
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8 space-y-0.5 text-left">
                    <span className="text-[8px] text-stone-500 font-extrabold uppercase">STREAMER NO. 1 EXCLUSIVE ITEM:</span>
                    <h5 className="text-[11px] font-black text-amber-250 uppercase tracking-wide leading-none">{activeAuction.itemName}</h5>
                    <p className="text-[10px] font-semibold text-stone-300 mt-1">
                      Highest Bidder: <span className="font-bold text-[#FCD34D] bg-[#FCD34D]/10 px-1.5 py-0.5 rounded">@{activeAuction.highBidder}</span>
                    </p>
                  </div>

                  <div className="col-span-4 text-right">
                    <span className="block text-[8px] text-stone-500 font-extrabold uppercase">CURRENT BID</span>
                    <span className="text-sm font-black text-amber-400 font-mono tracking-tight leading-none">
                       {activeAuction.currentBid.toLocaleString()}
                    </span>
                    <span className="block text-[7px] text-amber-500/70 font-semibold uppercase">coins</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 text-[10px] font-black shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const newBid = activeAuction.currentBid + 100;
                      setActiveAuction({
                        ...activeAuction,
                        currentBid: newBid,
                        highBidder: "You"
                      });
                      
                      setChatMessages(c => [...c, {
                        id: `self-bid-${Date.now()}`,
                        username: `${currentUser.username} (You)`,
                        text: `🙋‍♂️ Bid ${newBid.toLocaleString()} Coins on the ${activeAuction.itemName}! Let's win!`,
                        avatarUrl: currentUser.avatarUrl,
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);

                      try {
                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        osc.frequency.setValueAtTime(440, ctx.currentTime);
                        osc.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.1);
                      } catch (e) {}
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-stone-950 rounded-xl transition duration-200 uppercase cursor-pointer text-center leading-none flex items-center justify-center font-extrabold border border-[#fef08a]"
                  >
                     BID +100 Coins
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveAuction(prev => {
                        if (!prev) return null;
                        const finalBidderMsg = `🔨 SOLD! Broadcaster ended the auction. Item [${prev.itemName}] was awarded to @${prev.highBidder} for ${prev.currentBid.toLocaleString()} Coins! 🎉🥳`;
                        setChatMessages(c => [...c, {
                          id: `system-auction-finish-${Date.now()}`,
                          username: "📢 AUCTIONEER",
                          text: finalBidderMsg,
                          isSystem: true,
                          avatarUrl: "",
                          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        }]);
                        return { ...prev, timeSecs: 0, isActive: false };
                      });
                      
                      setRoseShowerActive(true);
                      setTimeout(() => setRoseShowerActive(false), 400);
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-rose-650 hover:bg-rose-500 border border-red-800 text-white font-extrabold rounded-r-xl transition duration-200 uppercase cursor-pointer text-center leading-none"
                  >
                     🔨 HAMMER DOWN
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* H. PK Battle Arena score dashboard */}
          {pkBattle && pkBattle.isActive && (
            <div className="px-3.5 mb-2 relative z-30 text-left font-sans">
              <div className="bg-gradient-to-r from-red-950/80 via-black/85 to-indigo-950/80 border border-purple-500/30 rounded-2xl p-2.5 shadow-xl select-none">
                <div className="flex items-center justify-between text-[8px] font-black uppercase text-purple-300 tracking-widest mb-1 leading-none font-mono">
                  <span>🔴 TEAM US (Lv{currentLevel})</span>
                  <span className="text-amber-400 animate-pulse text-[9px]">⚔️ PK BATTLE TIMEOUT: {pkBattle.timeLeft}s ⚔️</span>
                  <span>🔵 OPPONENT (Lv{pkBattle.opponent.level})</span>
                </div>

                <div className="h-4 bg-stone-900 border border-stone-800 rounded-full overflow-hidden flex relative shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-red-650 to-rose-550 transition-all duration-300 shadow-md relative"
                    style={{ width: `${Math.max(10, Math.min(90, (pkBattle.player1Score / (pkBattle.player1Score + pkBattle.player2Score || 1)) * 100))}%` }}
                  >
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-black text-white italic tracking-wider">
                       {pkBattle.player1Score} XP
                    </span>
                  </div>

                  <div className="h-full bg-gradient-to-l from-indigo-650 to-sky-550 transition-all duration-300 shadow-md flex-1 relative">
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-black text-white italic tracking-wider">
                       {pkBattle.player2Score} XP
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 select-none">
                  <div className="flex items-center gap-1 font-sans">
                    <span className="text-xs">🛡️</span>
                    <span className="text-[9.5px] font-extrabold text-stone-200">@You</span>
                  </div>

                  <div className="flex items-center gap-2 select-none">
                    <button
                      type="button"
                      onClick={() => {
                        setPkBattle(p => p ? { ...p, player1Score: p.player1Score + 180 } : null);
                        try {
                          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                          const osc = ctx.createOscillator();
                          osc.frequency.setValueAtTime(800, ctx.currentTime);
                          osc.connect(ctx.destination);
                          osc.start();
                          osc.stop(ctx.currentTime + 0.08);
                        } catch (e) {}
                      }}
                      className="py-1 px-3 bg-red-600 hover:bg-red-500 border border-red-550/40 text-white font-black uppercase text-[9px] rounded-lg tracking-wider transition active:scale-95 cursor-pointer leading-none"
                    >
                      ✊ Push Red! (+180)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPkBattle(p => p ? { ...p, player2Score: p.player2Score + 190 } : null);
                      }}
                      className="py-1 px-3 bg-indigo-650 hover:bg-indigo-550 border border-indigo-550/40 text-white font-black uppercase text-[9px] rounded-lg tracking-wider transition active:scale-95 cursor-pointer leading-none"
                    >
                      🙌 Push Opponent
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-extrabold text-[#7B3FFE]">@Legend_PK</span>
                    <img src={pkBattle.opponent.avatar} className="w-5.5 h-5.5 rounded-full object-cover border border-purple-500/35 bg-indigo-900" alt="" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* I. Interactive Matches Scoreboard Display Tally */}
          {liveScore && liveScore.active && (
            <div className="px-3.5 mb-2 relative z-30 text-left font-sans">
              <div className="bg-gradient-to-tr from-[#3f2512] to-[#513017] border-2 border-[#b57d42] p-2.5 rounded-2xl shadow-xl flex items-center justify-between select-none">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xl">🏆</span>
                  <div className="text-left font-sans">
                    <span className="block text-[8px] text-amber-200 font-extrabold tracking-widest uppercase leading-none">STREAM SCOREBOARD</span>
                    <span className="block text-[10.5px] text-white font-black mt-0.5 whitespace-nowrap">Interactive Tally</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-center">
                  <div className="flex items-center gap-1.5 bg-black/45 py-1 px-2 rounded-xl border border-red-900/30">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-0.5" />
                    <span className="text-[9px] text-[#FF4D4D] font-extrabold">RED:</span>
                    <span className="text-xs font-mono font-black text-white">{liveScore.teamRed}</span>
                    <div className="flex flex-col gap-0.5 ml-1 select-none leading-none">
                      <button 
                        type="button" 
                        onClick={() => setLiveScore(p => p ? { ...p, teamRed: p.teamRed + 1 } : null)}
                        className="p-0.5 bg-red-500/25 text-red-300 hover:text-white rounded text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center leading-none"
                      >+</button>
                      <button 
                        type="button" 
                        onClick={() => setLiveScore(p => p ? { ...p, teamRed: Math.max(0, p.teamRed - 1) } : null)}
                        className="p-0.5 bg-red-950/40 text-red-400 hover:text-white rounded text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center leading-none"
                      >-</button>
                    </div>
                  </div>

                  <span className="text-stone-300 font-black text-[9px] font-mono select-none">VS</span>

                  <div className="flex items-center gap-1.5 bg-black/45 py-1 px-2 rounded-xl border border-sky-900/30">
                    <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse mr-0.5" />
                    <span className="text-[9px] text-[#4D94FF] font-extrabold font-sans">BLUE:</span>
                    <span className="text-xs font-mono font-black text-white">{liveScore.teamBlue}</span>
                    <div className="flex flex-col gap-0.5 ml-1 select-none leading-none">
                      <button 
                        type="button" 
                        onClick={() => setLiveScore(p => p ? { ...p, teamBlue: p.teamBlue + 1 } : null)}
                        className="p-0.5 bg-sky-500/25 text-sky-400 hover:text-white rounded text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center leading-none"
                      >+</button>
                      <button 
                        type="button" 
                        onClick={() => setLiveScore(p => p ? { ...p, teamBlue: Math.max(0, p.teamBlue - 1) } : null)}
                        className="p-0.5 bg-sky-950/40 text-sky-400 hover:text-white rounded text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center leading-none"
                      >-</button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLiveScore(null)}
                  className="p-1 px-1.5 bg-amber-950/40 text-amber-400 hover:text-white rounded-lg hover:scale-105 active:scale-95 font-black text-[9px] uppercase cursor-pointer"
                  title="Close Tally Board"
                >
                  X
                </button>
              </div>
            </div>
          )}

          {/* J. Special Lottery Box chests dropped on feed */}
          {isLotteryBoxPresent && (
            <div className="absolute inset-0 z-[46] bg-black/65 backdrop-blur-[2px] flex items-center justify-center animate-fadeIn p-4 pointer-events-auto">
              <div className="bg-gradient-to-tr from-[#1E112A] to-[#0D041A] border-2 border-purple-500/40 p-5 rounded-3xl w-[80%] text-center shadow-xl select-none font-sans">
                <div className="text-center space-y-2">
                  <span className="text-[8px] uppercase tracking-widest text-purple-400 font-extrabold bg-purple-900/30 px-2.5 py-1 rounded-full border border-purple-500/25">
                     🎁 STREAM CHANNELS TREASURE BOX 
                  </span>
                  
                  <div className="py-4 flex flex-col items-center justify-center">
                    <img
                      src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Chest/3D/chest_3d.png"
                      alt="Treasures chest"
                      className={`w-28 h-28 object-contain drop-shadow-[0_8px_16px_rgba(139,92,246,0.3)] select-none ${
                        lotteryBoxState === "opening" 
                          ? "animate-ping opacity-80 duration-1000" 
                          : "animate-bounce"
                      }`}
                    />
                    
                    {lotteryBoxState === "closed" && (
                      <p className="text-[10px] text-stone-300 font-medium leading-normal max-w-xs mt-3">
                         Broadcaster dropped a lucky chest treasure! Standard viewers can unlock for free and capture premium loot!
                      </p>
                    )}

                    {lotteryBoxState === "opened" && (
                      <div className="mt-4 bg-[#8b5cf6]/10 p-3 rounded-2xl border border-purple-500/25 animate-scaleUp text-center w-full">
                        <span className="block text-[8px] text-purple-300 font-black">TREASURE BOX UNLOCKED!</span>
                        <span className="text-xs font-black text-yellow-300 block mt-1">💎 Claimed 1,500 FREE Coins + 10x multiplier voucher! 🎉</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 leading-none">
                    {lotteryBoxState === "closed" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLotteryBoxState("opening");
                          try {
                            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const osc = ctx.createOscillator();
                            osc.frequency.setValueAtTime(440, ctx.currentTime);
                            osc.connect(ctx.destination);
                            osc.start();
                            osc.stop(ctx.currentTime + 0.4);
                          } catch (e) {}

                          setTimeout(() => {
                            setLotteryBoxState("opened");
                            onCoinsUpdate(currentUser.coins + 1500);
                            
                            setChatMessages(c => [...c, {
                              id: `chest-redeem-${Date.now()}`,
                              username: `${currentUser.username} (You)`,
                              text: `🪙 just unlocked the stream lucky lottery chest and collected 1,500 free Coins! 🎁💎`,
                              avatarUrl: currentUser.avatarUrl,
                              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            }]);
                          }, 1200);
                        }}
                        className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-stone-950 text-[10px] font-black uppercase rounded-2xl shadow-md cursor-pointer transition active:scale-95 leading-none"
                      >
                         🔓 UNLOCK BOX
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setIsLotteryBoxPresent(false);
                        setLotteryBoxState("closed");
                      }}
                      className="flex-1 py-2.5 bg-stone-900 border border-stone-850 text-stone-300 text-[10px] uppercase font-bold rounded-2xl cursor-pointer hover:bg-stone-800"
                    >
                       CLOSE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* K. Interactive Wheel of Fortune spin overlay popup (Super Winner) */}
          {isSpinningWheel && (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center animate-fadeIn p-4 pointer-events-auto">
              <div className="bg-gradient-to-b from-[#1b083b] to-[#0d0321] border-2 border-purple-500 rounded-[32px] p-5 w-[85%] relative overflow-hidden text-center shadow-[0_12px_44px_rgba(139,92,246,0.3)] font-sans">
                <div className="absolute -top-12 -left-12 w-44 h-44 bg-purple-500/15 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute top-2 right-2 flex items-center justify-end z-25">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSpinningWheel(false);
                      setWheelResult(null);
                    }}
                    className="p-1.5 bg-purple-950 text-purple-300 hover:text-white border border-purple-800 rounded-full cursor-pointer hover:scale-105 active:scale-95 transition"
                    title="Close Spinner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  <div className="text-center space-y-1">
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-purple-500/20">
                      🎯 Super Winner Daily Loot
                    </span>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mt-1.5">
                       Wheel of Fortune
                    </h4>
                    <p className="text-[10px] text-stone-400 leading-tight">Spin to gain free gift coins, badges, and multipliers!</p>
                  </div>

                  {/* Visual Spinning Wheel UI representation */}
                  <div className="relative select-none my-2">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 z-20 text-xl select-none filter drop-shadow animate-bounce">
                      👇
                    </div>

                    <div 
                      className="w-36 h-36 rounded-full border-[6px] border-[#FFA300] bg-gradient-to-tr from-[#2A054F] via-[#3a0670] to-[#6d13ab] shadow-2xl relative flex items-center justify-center overflow-hidden transition-transform ease-out duration-3500"
                      style={{ transform: `rotate(${wheelAngle}deg)` }}
                    >
                      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-85">
                        <div className="border border-purple-500/15 flex flex-col items-center justify-center p-2 pt-4 bg-[#7B3FFE]/10 text-center">
                          <span className="text-sm">🪙</span>
                          <span className="text-[7px] font-black text-white mt-1 uppercase">150 Coins</span>
                        </div>
                        <div className="border border-purple-500/15 flex flex-col items-center justify-center p-2 pt-4 bg-pink-500/10 text-center">
                          <span className="text-sm">👑</span>
                          <span className="text-[7px] font-black text-white mt-1 uppercase">Star Badge</span>
                        </div>
                        <div className="border border-purple-500/15 flex flex-col items-center justify-center p-2 pb-4 bg-cyan-500/10 text-center">
                          <span className="text-sm">⚡</span>
                          <span className="text-[7px] font-black text-white mt-1 uppercase">2X Multi</span>
                        </div>
                        <div className="border border-purple-500/15 flex flex-col items-center justify-center p-2 pb-4 bg-emerald-500/10 text-center">
                          <span className="text-sm">💎</span>
                          <span className="text-[7px] font-black text-white mt-1 uppercase text-rose-350">50 Gems</span>
                        </div>
                      </div>

                      <div className="absolute w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-[#FF8C00] border-2 border-white flex items-center justify-center shadow-lg font-sans font-black text-[8px] text-[#2c0500] uppercase tracking-tighter">
                         LUCKY
                      </div>
                    </div>
                  </div>

                  {wheelResult ? (
                    <div className="bg-purple-950/60 border border-purple-500/40 p-2 text-center animate-scaleUp rounded-2xl w-full">
                      <span className="block text-[8px] text-purple-300 font-extrabold uppercase">CONGRATULATIONS REDEEMED!</span>
                      <span className="text-xs font-black text-yellow-350 block mt-1">{wheelResult}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const outcomes = [
                          { text: "💰 150 Gift Coins credited! 🪙", coins: 150 },
                          { text: "👑 VIP Star Badge Trophy awarded! ⭐", coins: 0 },
                          { text: "⚡ 2X Gift Multiplier voucher unlocked! 💎", coins: 0 },
                          { text: "💎 50 Premium Stream Diamonds awarded! 🎉", coins: 0 }
                        ];
                        const rand = Math.floor(Math.random() * outcomes.length);
                        const targetAngle = 1800 + rand * 90;
                        setWheelAngle(targetAngle);
                        
                        setTimeout(() => {
                          const item = outcomes[rand];
                          setWheelResult(item.text);
                          
                          if (item.coins > 0) {
                            onCoinsUpdate(currentUser.coins + item.coins);
                          }
                          
                          setChatMessages(c => [...c, {
                            id: `wheel-loot-${Date.now()}`,
                            username: "🎯 SUPER WINNER",
                            text: `Broadcaster rolled the Wheel of fortune loot: ${item.text}! 🥳`,
                            isSystem: true,
                            avatarUrl: "",
                            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          }]);
                          
                          try {
                            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                            const osc = ctx.createOscillator();
                            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                            osc.connect(ctx.destination);
                            osc.start();
                            osc.stop(ctx.currentTime + 0.15);
                          } catch (e) {}

                        }, 3600);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-[#FFA300] to-[#E31A19] hover:from-amber-400 hover:to-rose-500 rounded-2xl text-white font-black uppercase text-[10px] tracking-wider transition active:scale-95 cursor-pointer shadow-lg leading-none"
                    >
                      🚀 Spin the Lucky Wheel!
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* L. Feedback submissions form model overlay */}
          {isFeedbackCardOpen && (
            <div className="absolute inset-x-4 top-[25%] z-50 bg-[#140E24]/95 border-2 border-purple-500/35 rounded-[28px] p-5 shadow-2xl animate-scaleUp text-left font-sans pointer-events-auto">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2 mb-3">
                <span className="text-xs">📮</span>
                <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest leading-none">Stream Feedback & report</span>
                <button type="button" onClick={() => setIsFeedbackCardOpen(false)} className="text-stone-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <h5 className="text-[11px] font-black text-stone-100 mb-2 leading-tight">Help improve our livestream simulator platform!</h5>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Type your feedback message here..."
                rows={3}
                className="w-full p-2.5 bg-black/45 hover:bg-black/60 border border-purple-500/20 rounded-xl focus:outline-none focus:border-purple-400 text-xs text-white placeholder-stone-400 mb-3"
              />
              <button
                type="button"
                onClick={() => {
                  if (!feedbackText.trim()) return;
                  setFeedbackText("");
                  setIsFeedbackCardOpen(false);
                  
                  setChatMessages(c => [...c, {
                    id: `feedback-success-${Date.now()}`,
                    username: "📢 SYSTEM",
                    text: "Thank you for your feedback! It was delivered successfully to development servers 📬✨",
                    isSystem: true,
                    avatarUrl: "",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  }]);
                }}
                className="w-full py-2 bg-gradient-to-r from-[#7B3FFE] to-[#C884FE] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer leading-none text-center"
              >
                Submit Feedback Loop
              </button>
            </div>
          )}

          {/* ========================================================================================
              4. "TOOLS & INTERACTIVE MENU" HIGHEST-FIDELITY BOTTOM SHEET OVERLAY PANEL (Matches Mockup exact item layout)
              ======================================================================================== */}
          {isTapMenuOpen && (
            <div 
              id="stream-tools-tap-sheet" 
              className="absolute inset-x-0 bottom-0 z-50 bg-white rounded-t-[36px] p-5 shadow-[0_-12px_44px_rgba(139,92,246,0.18)] flex flex-col justify-between font-sans text-slate-800 pointer-events-auto"
              style={{ maxHeight: "75dvh", overflowY: "auto" }}
            >
              
              {/* Swipe handle indicator */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-14 h-1 bg-slate-200 rounded-full"></div>

              {/* Header Title styled with supreme elegance */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛠️</span>
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#2A2633]">
                     Stream Actions
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTapMenuOpen(false)}
                  className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md cursor-pointer hover:scale-105 active:scale-95 transition-all text-[10px] font-bold"
                  title="Close Menu"
                >
                  X
                </button>
              </div>

              {/* SECTION 1: Tools Grid (9 elements) */}
              <div className="text-left shrink-0">
                <h5 className="text-[11px] font-black uppercase text-[#9290A6] tracking-wider mb-2.5">
                   Tools
                </h5>

                <div className="grid grid-cols-4 gap-y-4 gap-x-2 pb-4 border-b border-slate-100 select-none">
                  
                  {/* Item 1: Lucky bag */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setLuckyBagActive(true);
                      setLuckyBagCountdown(6);
                      setLuckyBagClaimed(false);
                      
                      setChatMessages(c => [...c, {
                        id: `system-lucky-bag-start-${Date.now()}`,
                        username: "🧧 LUCKY DROP",
                        text: `@You just threw a Lucky Bag into the stream! Tap CLAIM inside live feed to receive Gold Coins! 🪙🎉`,
                        isSystem: true,
                        avatarUrl: "",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF9FC] hover:bg-purple-100/50 flex flex-center items-center justify-center border border-slate-200/50 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20envelope/3D/red_envelope_3d.png" 
                        alt="Lucky bag" 
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 text-center leading-none">
                      Lucky bag
                    </span>
                  </button>

                  {/* Item 2: Dice */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setIsRollingDice(true);
                      setDiceResult(null);
                      
                      try {
                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        osc.frequency.setValueAtTime(400, ctx.currentTime);
                        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
                        osc.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.3);
                      } catch (e) {}

                      setTimeout(() => {
                        const res = Math.floor(Math.random() * 6) + 1;
                        setIsRollingDice(false);
                        setDiceResult(res);
                        
                        setChatMessages(c => [...c, {
                          id: `dice-roll-${Date.now()}`,
                          username: `${currentUser.username} (You)`,
                          text: `🎲 rolled the Live-Stream Dice and scored a ${res}! 🤩🔥`,
                          avatarUrl: currentUser.avatarUrl,
                          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        }]);

                        setTimeout(() => setDiceResult(null), 4000);
                      }, 1500);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF9FC] hover:bg-purple-100/50 flex flex-center items-center justify-center border border-slate-200/50 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Game%20die/3D/game_die_3d.png" 
                        alt="Dice" 
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 text-center leading-none">
                      Dice
                    </span>
                  </button>

                  {/* Item 3: lucky number */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      const num = Math.floor(Math.random() * 98) + 1;
                      setLuckyNumber(num);
                      setShowLuckyNumberBadge(true);
                      
                      setChatMessages(c => [...c, {
                        id: `lucky-number-set-${Date.now()}`,
                        username: "🍀 LUCKY REF",
                        text: `@You pulled clover lucky stream index number ${num}! Viewers can support in real-time!`,
                        isSystem: true,
                        avatarUrl: "",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF9FC] hover:bg-purple-100/50 flex flex-center items-center justify-center border border-slate-200/50 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Four%20leaf%20clover/3D/four_leaf_clover_3d.png" 
                        alt="lucky number" 
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 text-center leading-none">
                      lucky number
                    </span>
                  </button>

                  {/* Item 4: Music */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setIsMusicSynthPlaying(!isMusicSynthPlaying);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF9FC] hover:bg-purple-100/50 flex flex-center items-center justify-center border border-slate-200/50 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Optical%20disk/3D/optical_disk_3d.png" 
                        alt="Music" 
                        className="w-7 h-7 object-contain animate-spin"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 text-center leading-none">
                      Music
                    </span>
                  </button>

                  {/* Item 5: Effect */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      const filters = ["retro-crt", "neon-rainbow", "vhs-snow", "sparkling-stars", null];
                      const currentIdx = filters.indexOf(activeVfxFilter as any);
                      const nextFilter = filters[(currentIdx + 1) % filters.length];
                      setActiveVfxFilter(nextFilter);
                      
                      setChatMessages(c => [...c, {
                        id: `vfx-change-${Date.now()}`,
                        username: "📽️ CAMERA",
                        text: nextFilter 
                          ? `Broadcaster applied camera filter: [${nextFilter.toUpperCase()}]!` 
                          : "Broadcaster reset camera filters.",
                        isSystem: true,
                        avatarUrl: "",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF9FC] hover:bg-purple-100/50 flex flex-center items-center justify-center border border-slate-200/50 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Gear/3D/gear_3d.png" 
                        alt="Effect" 
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 text-center leading-none">
                      Effect
                    </span>
                  </button>

                  {/* Item 6: Draw Lots */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      const fortunePool = [
                        "🔥 Legendary Streak: Views spike 200%!",
                        "🪙 Treasure Rain: Double Gold coin tips incoming!",
                        "🦄 Unicorn Vibe: Extreme stream rating!",
                        "💎 Diamond Chest: A fan sends a Castle gift!",
                        "⭐ Golden Aura: Beautiful vibes active!"
                      ];
                      const pickedLot = fortunePool[Math.floor(Math.random() * fortunePool.length)];
                      setCurrentDrawLot(pickedLot);
                      
                      setChatMessages(c => [...c, {
                        id: `lots-drawn-${Date.now()}`,
                        username: `${currentUser.username} (You)`,
                        text: `🔮 Drew live fortune: [${pickedLot}]! 🎉`,
                        avatarUrl: currentUser.avatarUrl,
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);

                      try {
                        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        osc.frequency.setValueAtTime(600, ctx.currentTime);
                        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
                        osc.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.2);
                      } catch (e) {}
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF9FC] hover:bg-purple-100/50 flex flex-center items-center justify-center border border-slate-200/50 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Memo/3D/memo_3d.png" 
                        alt="Draw Lots" 
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 text-center leading-none">
                      Draw Lots
                    </span>
                  </button>

                  {/* Item 7: Vote */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setActivePoll({
                        question: "Should we extend today's live stream by 2 more hours? 🕰️🎮",
                        options: [
                          { text: "Option A: Absolutely YES! 😍", votes: 12 },
                          { text: "Option B: Standard wrap up 😴", votes: 8 }
                        ],
                        totalVotes: 20
                      });

                      setChatMessages(c => [...c, {
                        id: `poll-start-${Date.now()}`,
                        username: "📊 BOT CHECK",
                        text: `📢 LIVE STREAM POLL INITIATED: 'Should we extend hours?' Tap options inside floating Poll card to vote live!`,
                        isSystem: true,
                        avatarUrl: "",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF9FC] hover:bg-purple-100/50 flex flex-center items-center justify-center border border-slate-200/50 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Clipboard/3D/clipboard_3d.png" 
                        alt="Vote" 
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 text-center leading-none">
                      Vote
                    </span>
                  </button>

                  {/* Item 8: Lottery Gift */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setIsLotteryBoxPresent(true);
                      setLotteryBoxState("closed");

                      setChatMessages(c => [...c, {
                        id: `lottery-gift-init-${Date.now()}`,
                        username: "📢 SYSTEM",
                        text: `🎁 Broadcaster dropped a Golden Mystery Chest onto stream screen! Click the chest in the arena to open it!`,
                        isSystem: true,
                        avatarUrl: "",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF9FC] hover:bg-purple-100/50 flex flex-center items-center justify-center border border-slate-200/50 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Chest/3D/chest_3d.png" 
                        alt="Lottery Gift" 
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 text-center leading-none">
                      Lottery Gift
                    </span>
                  </button>

                  {/* Item 9: Feedback */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setIsFeedbackCardOpen(true);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FAF9FC] hover:bg-purple-100/50 flex flex-center items-center justify-center border border-slate-200/50 shadow-sm transition-all group-hover:scale-105 active:scale-95">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Envelope%20with%20arrow/3D/envelope_with_arrow_3d.png" 
                        alt="Feedback" 
                        className="w-7 h-7 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 text-center leading-none">
                      Feedback
                    </span>
                  </button>

                </div>
              </div>

              {/* SECTION 2: Interactive Features */}
              <div className="text-left mt-5 shrink-0 select-none pb-2">
                <h5 className="text-[11px] font-black uppercase text-[#9290A6] tracking-wider mb-2.5">
                   Interactive Features
                </h5>

                <div className="grid grid-cols-4 gap-y-5 gap-x-2 text-center select-none">
                  
                  {/* Choice 1: Auction */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setActiveAuction({
                        itemName: "Golden Broadcaster Crown 👑✨",
                        currentBid: 500,
                        highBidder: "Alex99",
                        timeSecs: 25,
                        isActive: true
                      });

                      setChatMessages(c => [...c, {
                        id: `system-auction-start-${Date.now()}`,
                        username: "📢 AUCTIONEER",
                        text: `🔮 INTERACTIVE LIVE STREAM BIDDING INITIATED! Item: [Golden Broadcaster Crown] is active! Starting Bid: 500 Coins. Join and place bids live!`,
                        isSystem: true,
                        avatarUrl: "",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center cursor-pointer shadow-md mx-auto group-hover:scale-105 active:scale-95 transition-all">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Hammer/3D/hammer_3d.png" 
                        alt="Auction" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 leading-none text-center">
                      Auction
                    </span>
                  </button>

                  {/* Choice 2: PK Battle */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setPkBattle({
                        player1Score: 400,
                        player2Score: 450,
                        timeLeft: 35,
                        isActive: true,
                        opponent: {
                          name: "KurdishLegend_PK 👑",
                          avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=KurdishLegend",
                          level: 48
                        }
                      });

                      setChatMessages(c => [...c, {
                        id: `system-pk-start-${Date.now()}`,
                        username: "🏆 PK REFEREE",
                        text: `⚔️ PK BATTLE DETECTED! You vs @KurdishLegend_PK! Support your Team by sending gifts or pushing the RED progress bar!`,
                        isSystem: true,
                        avatarUrl: "",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FE2C55] to-[#EC4899] flex items-center justify-center cursor-pointer shadow-md mx-auto group-hover:scale-105 active:scale-95 transition-all">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Shield/3D/shield_3d.png" 
                        alt="PK" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 leading-none text-center">
                      PK
                    </span>
                  </button>

                  {/* Choice 3: Scoreboard */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setLiveScore({
                        teamRed: 0,
                        teamBlue: 0,
                        active: true
                      });

                      setChatMessages(c => [...c, {
                        id: `system-scoreboard-${Date.now()}`,
                        username: "📢 SCOREKEEPER",
                        text: `📊 Interactive Match Scoreboard overlay activated on screen! Tally points for Team Red (🔴) and Team Blue (🔵) on fly.`,
                        isSystem: true,
                        avatarUrl: "",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center cursor-pointer shadow-md mx-auto group-hover:scale-105 active:scale-95 transition-all">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Chequered%20flag/3D/chequered_flag_3d.png" 
                        alt="Scoreboard" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 leading-none text-center">
                      Scoreboard
                    </span>
                  </button>

                  {/* Choice 4: Super Winner */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      setIsSpinningWheel(true);
                      setWheelResult(null);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center cursor-pointer shadow-md mx-auto group-hover:scale-105 active:scale-95 transition-all">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bullseye/3D/bullseye_3d.png" 
                        alt="Super Winner" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 leading-none text-center">
                      Super Winner
                    </span>
                  </button>

                  {/* Choice 5: Simulate TV */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      const themes = ["Techno Beats Stream 🎵", "Neon Cybercity Sunset 🌆", "Retro Cozy Lantern 🏮", "Battlefield High-Action Warzone 🧨", "Matrix Grid Code Flow 📟"];
                      const currentIdx = themes.indexOf(setupVideoFeed);
                      const nextTheme = themes[(currentIdx + 1) % themes.length];
                      setSetupVideoFeed(nextTheme);
                      setOverrideVideoFeedTheme(nextTheme);

                      setChatMessages(c => [...c, {
                        id: `msg-tv-setup-${Date.now()}`,
                        username: "📺 VIDEO ENG",
                        text: `Overrided stream video template background simulation feed to [${nextTheme}] successfully!`,
                        isSystem: true,
                        avatarUrl: "",
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      }]);
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-650 flex items-center justify-center cursor-pointer shadow-md mx-auto group-hover:scale-105 active:scale-95 transition-all">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Television/3D/television_3d.png" 
                        alt="Simulate TV" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 leading-none text-center">
                       Simulate TV
                    </span>
                  </button>

                  {/* Choice 6: Boutique Castle */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTapMenuOpen(false);
                      const customizerDashboardEl = document.getElementById("profile-management-panel") || document.getElementById("col-customizer-dashboard");
                      if (customizerDashboardEl) {
                        customizerDashboardEl.scrollIntoView({ behavior: "smooth" });
                      } else {
                        setChatMessages(c => [...c, {
                          id: `msg-castle-setup-${Date.now()}`,
                          username: "🏰 BOUTIQUE",
                          text: "Exclusive Boutique Castle loaded! Head to your Profile panel to configure avatar level and frame decorations.",
                          isSystem: true,
                          avatarUrl: "",
                          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        }]);
                      }
                    }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-[#FE2C55] flex items-center justify-center cursor-pointer shadow-md mx-auto group-hover:scale-105 active:scale-95 transition-all">
                      <img 
                        src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Castle/3D/castle_3d.png" 
                        alt="Boutique Castle" 
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <span className="text-[9.5px] text-[#A4A3B1] font-bold block mt-1 leading-none text-center">
                       Boutique Castle
                    </span>
                  </button>

                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ====================================================================================
          LEVEL & XP SYSTEM HIGH-FIDELITY ACTIVE ROOM MODAL - IMPLEMENTS "tap level" & THE LEVEL CHART
          ==================================================================================== */}
    </div>
  );
}
