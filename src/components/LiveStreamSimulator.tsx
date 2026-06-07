/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { User, Streamer, ChatMessage, Gift } from "../types";
import { VIRTUAL_GIFTS, SIMULATED_CHAT_MESSAGES, CHATTER_USERNAMES } from "../utils/mockData";
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
  Video
} from "lucide-react";

interface LiveStreamSimulatorProps {
  currentUser: User;
  activeStreamer: Streamer | null; // null if broadcasting
  onClose: () => void;
  onCoinsUpdate: (newCoins: number) => void;
  onLevelXpUpdate: (newLevel: number, newXp: number) => void;
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
  onLevelXpUpdate,
}: LiveStreamSimulatorProps) {
  const isBroadcasting = activeStreamer === null;

  // Stream States
  const [setupTitle, setSetupTitle] = useState("");
  const [setupCategory, setSetupCategory] = useState("IRL Chatting");
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [currentLevel, setCurrentLevel] = useState(currentUser.level);
  const [currentXp, setCurrentXp] = useState(currentUser.xp);

  // Bottom "Send Gift" drawer states
  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState(false);
  const [selectedGiftId, setSelectedGiftId] = useState<string>("gift-rose");
  const [notEnoughCoinsMsg, setNotEnoughCoinsMsg] = useState(false);

  // Mic, Camera toggle states
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [sharesCount, setSharesCount] = useState(0);

  // Floating Gifts Visual Alert Bubble
  const [activeGiftAlert, setActiveGiftAlert] = useState<{
    sender: string;
    gift: Gift;
    timestamp: number;
  } | null>(null);

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
    ...Array.from({ length: 8 }, (_, i) => ({
      id: i + 2,
      username: "",
      avatarUrl: "",
      isOccupied: false,
      isRequesting: false,
      statusText: "Request",
    })),
  ]);

  // Timers and Canvas Refs
  const chatIntervalRef = useRef<number | null>(null);
  const giftIntervalRef = useRef<number | null>(null);
  const viewerIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Sync state if live is active
  useEffect(() => {
    if ((isLiveActive && isBroadcasting) || (!isBroadcasting && activeStreamer)) {
      const initialViewers = isBroadcasting ? 24 : activeStreamer?.viewersCount || 100;
      setViewersCount(initialViewers);

      setChatMessages([
        {
          id: "sys-1",
          username: "System",
          text: isBroadcasting
            ? "Your co-host streaming panel is active! Tap any slot to invite guests."
            : `Welcome to ${activeStreamer?.fullName || "Stream's"} live loop channel. Click 'Gift' to tip!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isSystem: true,
        },
      ]);
    }
  }, [isLiveActive, activeStreamer, isBroadcasting]);

  // Simulated Comments Feed
  useEffect(() => {
    if ((isLiveActive && isBroadcasting) || (!isBroadcasting && activeStreamer)) {
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
      }, 2500);
    }

    return () => {
      if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    };
  }, [isLiveActive, activeStreamer, isBroadcasting]);

  // Viewer fluctuation
  useEffect(() => {
    if ((isLiveActive && isBroadcasting) || (!isBroadcasting && activeStreamer)) {
      viewerIntervalRef.current = window.setInterval(() => {
        setViewersCount((prev) => {
          const delta = Math.floor(Math.random() * 5) - 2;
          return Math.max(isBroadcasting ? 5 : 8, prev + delta);
        });
      }, 5000);
    }

    return () => {
      if (viewerIntervalRef.current) clearInterval(viewerIntervalRef.current);
    };
  }, [isLiveActive, activeStreamer, isBroadcasting]);

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

        ctx.font = `${p.size}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.char, 0, 0);

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
  const triggerIncomingGift = (sender: string, gift: Gift) => {
    setActiveGiftAlert({
      sender,
      gift,
      timestamp: Date.now(),
    });

    spawnGiftBurst(gift.icon, 20);

    const systemGiftMsg: ChatMessage = {
      id: `chat-gift-${Date.now()}-${Math.random()}`,
      username: sender,
      text: `sent ${gift.name} ${gift.icon}!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      gift: {
        name: gift.name,
        icon: gift.icon,
        cost: gift.cost,
      },
    };
    setChatMessages((prev) => [...prev, systemGiftMsg]);

    // Apply XP to current user
    const xpReward = Math.floor(gift.cost * 1.5);
    let nextXp = currentXp + xpReward;
    let nextLevel = currentLevel;
    let xpTarget = currentUser.xpToNextLevel;

    if (nextXp >= xpTarget) {
      nextXp -= xpTarget;
      nextLevel += 1;
      setTimeout(() => {
        spawnGiftBurst("⭐", 25);
      }, 300);
    }

    setCurrentLevel(nextLevel);
    setCurrentXp(nextXp);
    onLevelXpUpdate(nextLevel, nextXp);

    // Streamer gets tipped balance
    const updatedCoins = currentUser.coins + gift.cost;
    onCoinsUpdate(updatedCoins);

    setTimeout(() => {
      setActiveGiftAlert((prev) => (prev?.timestamp === activeGiftAlert?.timestamp ? null : prev));
    }, 4000);
  };

  // Submit Comments
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const val = inputMessage;
    setInputMessage("");

    const newMsg: ChatMessage = {
      id: `chat-usr-${Date.now()}`,
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
          id: `chat-reply-${Date.now()}`,
          username: isBroadcasting ? "chat_mod" : activeStreamer?.username || "ndnd",
          text: randomBack,
          avatarUrl: `https://picsum.photos/seed/${creatorName}/60/60`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1500);
  };

  // Handle active purchase / sending from Bottom Drawer Sheet
  const handleSendGiftLocal = (gift: Gift) => {
    if (currentUser.coins < gift.cost) {
      setNotEnoughCoinsMsg(true);
      setTimeout(() => setNotEnoughCoinsMsg(false), 3500);
      return;
    }

    // Deduct
    const remaining = currentUser.coins - gift.cost;
    onCoinsUpdate(remaining);

    // Burst
    spawnGiftBurst(gift.icon, 22);

    // Message
    const giftMessage: ChatMessage = {
      id: `usr-gift-${Date.now()}`,
      username: `${currentUser.username} (You)`,
      text: `sent ${gift.name} ${gift.icon}!`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      gift: {
        name: gift.name,
        icon: gift.icon,
        cost: gift.cost,
      },
    };
    setChatMessages((prev) => [...prev, giftMessage]);

    // Send XP rewards
    const viewReward = Math.floor(gift.cost / 2) || 5;
    let nextXp = currentXp + viewReward;
    let nextLevel = currentLevel;
    let xpTarget = currentUser.xpToNextLevel;

    if (nextXp >= xpTarget) {
      nextXp -= xpTarget;
      nextLevel += 1;
      spawnGiftBurst("⭐", 15);
    }

    setCurrentLevel(nextLevel);
    setCurrentXp(nextXp);
    onLevelXpUpdate(nextLevel, nextXp);

    // Response alert
    setTimeout(() => {
      const resp = [
        `OH MY GOD! Thank you so much for the ${gift.name} ${gift.icon}!`,
        `WOW!! Support is amazing! Appreciate the ${gift.name}!`,
        `That is huge! Thanks a lot @${currentUser.username}! ❤️`,
        `LoopCoins well spent! Thank you so much!`,
      ];
      const selectedResp = resp[Math.floor(Math.random() * resp.length)];

      setChatMessages((prev) => [
        ...prev,
        {
          id: `chat-streamer-rc-${Date.now()}`,
          username: isBroadcasting ? "System" : activeStreamer?.username || "ndnd",
          text: selectedResp,
          avatarUrl: isBroadcasting ? currentUser.avatarUrl : activeStreamer?.avatarUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1200);
  };

  // Cohost Grid Slot Activation Interaction
  const handleInteractSlot = (slotId: number) => {
    if (slotId === 1) return; // Keep Host slot locked

    setCoHostSlots((prevSlots) => {
      return prevSlots.map((slot) => {
        if (slot.id === slotId) {
          if (slot.isOccupied) {
            // Click occupied slot -> Disconnect cohost
            return {
              ...slot,
              isOccupied: false,
              isRequesting: false,
              username: "",
              avatarUrl: "",
              statusText: "Request",
            };
          } else if (slot.isRequesting) {
            // Cancel request
            return {
              ...slot,
              isRequesting: false,
              statusText: "Request",
            };
          } else {
            // Trigger automatic requesting simulation
            setTimeout(() => {
              // Simulated accept cohosting spot after 1.5 seconds delay!
              setCoHostSlots((currentSlots) => {
                return currentSlots.map((s) => {
                  if (s.id === slotId && s.isRequesting) {
                    const randomName = CHATTER_USERNAMES[s.id % CHATTER_USERNAMES.length];
                    return {
                      ...s,
                      isOccupied: true,
                      isRequesting: false,
                      username: randomName,
                      avatarUrl: `https://picsum.photos/seed/${randomName}/120/120`,
                      statusText: `Guest ${s.id - 1}`,
                    };
                  }
                  return s;
                });
              });

              // Send chat feedback message
              const visitor = CHATTER_USERNAMES[slotId % CHATTER_USERNAMES.length];
              setChatMessages((messages) => [
                ...messages,
                {
                  id: `cohost-ann-${Date.now()}`,
                  username: visitor,
                  text: `joined Guest Slot #${slotId - 1}! Hello stream! 👋🎤`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ]);
            }, 1500);

            return {
              ...slot,
              isRequesting: true,
              statusText: "Connecting...",
            };
          }
        }
        return slot;
      });
    });
  };

  const startBroadcasting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupTitle.trim()) return;
    setIsLiveActive(true);
  };

  const activeSelectedGift = VIRTUAL_GIFTS.find((g) => g.id === selectedGiftId) || VIRTUAL_GIFTS[0];

  return (
    <div id="live-cohost-arena-parent" className="max-w-md mx-auto relative font-sans text-stone-100 py-3 px-2">
      
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
                  <option value="IRL Talk">IRL Talk & Chat</option>
                  <option value="Tech Loop">Coding & Projects</option>
                  <option value="Music Box">DJ & Music Codes</option>
                  <option value="Boutique">Showcase Boutique</option>
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
          </form>
        </div>
      ) : (
        /* 2. THE MAIN STREAMING WINDOW EMULATOR BEZEL SCREEN */
        <div 
          id="live-bezel-wrapper" 
          className="relative w-full aspect-[9/16] bg-black rounded-[36px] border-[5px] border-stone-800 shadow-2xl overflow-hidden flex flex-col justify-between"
          style={{ background: "linear-gradient(to bottom, #000000 0%, #151419 100%)" }}
        >
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
              <div className="text-left shrink-0 max-w-[70px]">
                <h5 className="text-[10px] font-black text-white truncate leading-none">
                  {isBroadcasting ? currentUser.username : activeStreamer?.username || "ndnd"}
                </h5>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <span className="flex gap-0.5 items-end justify-center h-2 overflow-hidden shrink-0">
                    <span className="w-0.5 bg-green-400 rounded-full animate-soundBar1 h-1.5" />
                    <span className="w-0.5 bg-green-400 rounded-full animate-soundBar2 h-2" />
                    <span className="w-0.5 bg-green-400 rounded-full animate-soundBar3 h-1" />
                  </span>
                  <span className="text-[7px] text-stone-300 leading-none scale-90 origin-left">dnsn</span>
                </div>
              </div>

              {/* Dynamic status count loop views */}
              <div className="pl-1 flex items-center gap-0.5 text-stone-200 border-l border-stone-800 ml-1">
                <span className="text-[9px] font-mono font-bold flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse shrink-0"></span>
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

              {/* Exit streamer button */}
              <button 
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-black/65 border border-stone-800 flex items-center justify-center text-stone-300 hover:text-white"
                title="Close Live Area"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ================= STREAM ALERT GESTURES / BURST BANNER ================= */}
          {activeGiftAlert && (
            <div className="absolute top-[12%] left-1/2 -translate-x-1/2 z-30 w-[90%] bg-stone-900/90 border border-purple-500/30 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-2xl animate-shake pointer-events-none">
              <span className="text-2xl animate-bounce shrink-0">{activeGiftAlert.gift.icon}</span>
              <div className="text-left min-w-0">
                <p className="text-[8px] uppercase tracking-wider text-purple-400 font-mono font-extrabold leading-none">
                  Superfan Trigger!
                </p>
                <p className="text-xs font-bold text-white leading-tight truncate">
                  {activeGiftAlert.sender}
                </p>
                <p className="text-[10px] text-stone-300 leading-none">
                  sent <span className="text-amber-400">{activeGiftAlert.gift.name}</span> tip!
                </p>
              </div>
            </div>
          )}

          {/* ================= CO-HOST PODIUMS BOX grid (Screenshot 1 aspect) ================= */}
          <div id="co-hosting-video-arena" className="px-3 flex-1 flex flex-col justify-center select-none pt-4">
            <div className="grid grid-cols-3 gap-2 w-full">
              
              {/* Host / Slot 1 podium box */}
              <div className="aspect-square bg-stone-950 border border-stone-800/80 rounded-xl relative overflow-hidden flex flex-col justify-between p-1.5">
                <span className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-black/40 z-0"></span>
                
                {/* Simulated webcam wave filter effect */}
                {isCameraOn ? (
                  <div className="absolute inset-0 z-0 bg-gradient-to-tr from-[#901a5e]/15 to-[#3b1c6e]/30 scale-105">
                    <div className="absolute w-2 h-2 rounded-full bg-red-500 top-2 right-2 animate-ping" />
                    <img 
                      src={isBroadcasting ? currentUser.avatarUrl : activeStreamer?.avatarUrl || "https://picsum.photos/seed/ndnd/120/120"} 
                      alt="Stream Video"
                      className="w-full h-full object-cover opacity-80"
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 z-0 bg-stone-950 flex items-center justify-center">
                    <span className="text-[9px] font-mono text-stone-500 uppercase">Camera Off</span>
                  </div>
                )}

                <span className="text-[9px] text-stone-300 font-black tracking-wide uppercase px-1.5 py-0.5 bg-black/40 rounded border border-white/5 z-10 w-fit">
                  Host
                </span>

                <span className="text-[10px] text-white font-black truncate z-10 text-left pl-1">
                  {isBroadcasting ? currentUser.username : activeStreamer?.username || "ndnd"}
                </span>
              </div>

              {/* Slots 2 to 9 co-host grid requests box */}
              {coHostSlots.slice(1).map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => handleInteractSlot(slot.id)}
                  className={`aspect-square border rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-1 cursor-pointer transition-all ${
                    slot.isOccupied
                      ? "bg-purple-950/15 border-purple-500/40"
                      : slot.isRequesting
                        ? "bg-stone-900 border-amber-500/40"
                        : "bg-[#20202F] border-transparent"
                  }`}
                >
                  {slot.isOccupied ? (
                    <>
                      <div className="absolute inset-0 z-0">
                        <img 
                          src={slot.avatarUrl} 
                          alt="Cohost video stream pointer" 
                          className="w-full h-full object-cover opacity-85"
                        />
                        <span className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black via-transparent to-transparent"></span>
                      </div>
                      
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 z-15" />
                      <span className="text-[8px] text-stone-300 px-1 py-0.5 bg-black/45 rounded font-bold uppercase tracking-wider absolute top-1 left-1 z-15">
                        Guest {slot.id - 1}
                      </span>
                      <span className="text-[9px] text-white font-bold truncate z-10 mt-auto drop-shadow-md w-full text-center">
                        {slot.username}
                      </span>
                    </>
                  ) : slot.isRequesting ? (
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
                      <span className="text-[8px] font-black text-amber-400 font-mono tracking-wider uppercase scale-90">
                        Pending
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1">
                      {/* Standard "+" inside circle */}
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                        <Plus className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] text-stone-300 font-bold tracking-tight">
                        Request
                      </span>
                    </div>
                  )}
                </button>
              ))}

            </div>
          </div>

          {/* ================= COMMENTS STREAM FLOATING (Middle Overlap) ================= */}
          <div id="stream-comments-dock" className="px-3 max-h-[110px] overflow-y-auto space-y-1.5 pointer-events-none text-left select-none relative z-10 w-[85%] mb-2">
            {chatMessages.slice(-3).map((item) => (
              <div 
                key={item.id} 
                className={`p-1.5 rounded-lg text-[10px] inline-block max-w-full backdrop-blur-md ${
                  item.isSystem 
                    ? "bg-amber-600/20 border border-amber-500/10 text-amber-300 font-bold"
                    : item.gift
                      ? "bg-gradient-to-r from-purple-500/30 to-purple-800/10 border border-purple-500/20 text-purple-200 font-medium"
                      : "bg-black/45 text-stone-200 border border-stone-900/40"
                }`}
              >
                <span className="font-bold text-amber-400 mr-1 shrink-0">{item.username}:</span>
                <span className="break-all">{item.text}</span>
              </div>
            ))}
          </div>

          {/* ================= BOTTOM COMMAND CONTROLS BAR (Screenshot 1 bottom) ================= */}
          <div id="stream-footer-pane" className="relative z-20 px-3 pb-4 pt-2 bg-black/60 border-t border-stone-850/60 backdrop-blur-md flex items-center justify-between gap-1.5">
            
            {/* Type Comments box (Rounded white styling with icons inside) */}
            <form onSubmit={handleSendMessage} className="flex-1 max-w-[40%]">
              <div className="relative flex items-center bg-white/10 border border-stone-800 rounded-full py-1.5 px-3">
                <span className="text-[#A78BFA] shrink-0 pointer-events-none mr-1">💬</span>
                <input
                  type="text"
                  placeholder="Type C..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  maxLength={60}
                  className="w-full bg-transparent text-white text-[11px] placeholder-stone-500 font-semibold focus:outline-none min-w-0"
                />
                <button 
                  type="submit" 
                  className="text-stone-300 hover:text-white shrink-0 ml-1 cursor-pointer"
                  title="Send Comment"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Quick Action buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              
              {/* Present / Gift Box toggle */}
              <button
                type="button"
                onClick={() => setIsGiftDrawerOpen(true)}
                className="flex flex-col items-center gap-0.5 hover:scale-110 active:scale-95 transition-all text-white cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-red-600 border border-red-500 flex items-center justify-center text-xs shadow">
                  🎁
                </div>
                <span className="text-[8px] font-bold text-stone-400">Gift</span>
              </button>

              {/* Guest invitations button */}
              <button
                type="button"
                onClick={() => handleInteractSlot(2)}
                className="flex flex-col items-center gap-0.5 hover:scale-110 active:scale-95 transition-all text-stone-300 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-purple-700/80 hover:bg-purple-750 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-purple-200" />
                </div>
                <span className="text-[8px] font-bold text-stone-400">Guest</span>
              </button>

              {/* Mic mute switch */}
              <button
                type="button"
                onClick={() => setIsMicOn(!isMicOn)}
                className={`flex flex-col items-center gap-0.5 hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                  isMicOn ? "text-stone-300" : "text-red-500"
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                  isMicOn ? "bg-stone-800 border-stone-700" : "bg-red-950 border-red-800"
                }`}>
                  <Mic className="w-3.5 h-3.5" />
                </div>
                <span className="text-[8px] font-bold text-stone-400">Mic</span>
              </button>

              {/* Camera shut switch */}
              <button
                type="button"
                onClick={() => setIsCameraOn(!isCameraOn)}
                className={`flex flex-col items-center gap-0.5 hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                  isCameraOn ? "text-stone-300" : "text-amber-500"
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                  isCameraOn ? "bg-stone-800 border-stone-700" : "bg-amber-950 border-amber-800"
                }`}>
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <span className="text-[8px] font-bold text-stone-400">Camera</span>
              </button>

              {/* Share count option */}
              <button
                type="button"
                onClick={() => setSharesCount(prev => prev + 1)}
                className="flex flex-col items-center gap-0.5 hover:scale-110 active:scale-95 transition-all text-stone-300 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center">
                  <Share2 className="w-3.5 h-3.5 text-stone-200" />
                </div>
                <span className="text-[8px] font-bold text-stone-500 font-mono">{sharesCount}</span>
              </button>

            </div>

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
                  className="p-1.5 bg-stone-900 border border-stone-800 rounded-full text-stone-400 hover:text-white hover:scale-105 active:scale-95 transition"
                  title="Close Selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Warnings loop */}
              {notEnoughCoinsMsg && (
                <div className="p-2 mb-2 bg-red-950/50 border border-red-850/40 text-red-400 text-[10px] text-center rounded-lg font-bold animate-shake shrink-0">
                  ⚠️ Lower balance! Spend inside profile wallet / add coins to tip.
                </div>
              )}

              {/* 12 Grid Virtual gifts list (Highly styled matching Screenshot 2) */}
              <div className="grid grid-cols-4 gap-2 flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-stone-900 pr-1">
                {VIRTUAL_GIFTS.map((gift) => {
                  const isSelected = selectedGiftId === gift.id;
                  return (
                    <div
                      key={gift.id}
                      onClick={() => setSelectedGiftId(gift.id)}
                      className={`relative p-2.5 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer select-none ${
                        isSelected 
                          ? "bg-[#632890]/25 border-2 border-purple-500 scale-95 shadow-md" 
                          : "bg-stone-950 border border-stone-900 hover:border-purple-900"
                      }`}
                    >
                      {/* Animated Floating preview for high fidelity */}
                      <span className="text-3xl mb-1.5 drop-shadow">
                        {gift.icon}
                      </span>
                      <span className="text-[10px] font-black text-white text-center truncate w-full mb-0.5 leading-none">
                        {gift.name}
                      </span>
                      <span className="text-[9px] font-extrabold text-amber-500 font-mono tracking-tight flex items-center justify-center gap-0.5">
                        ⭐ {gift.cost < 1000 ? gift.cost : `${(gift.cost / 1000).toFixed(1)}k`}
                      </span>

                      {/* Display dedicated PURPLE "Send" button block inside selected tile - MATCHES SCREENSHOT 2 */}
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendGiftLocal(gift);
                          }}
                          className="mt-2 w-full py-1 text-[9px] font-black uppercase text-white bg-gradient-to-r from-purple-600 to-[#923FEF] hover:from-[#A855F7] rounded-lg tracking-wider animate-scaleUp cursor-pointer shadow border border-white/10"
                        >
                          Send
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom footer bar: Golden buy coin pill indicator */}
              <div className="mt-3.5 pt-3.5 border-t border-stone-900 flex items-center justify-between shrink-0">
                <div className="text-[11px] text-stone-500 font-medium">
                  Select a premium item and click Send
                </div>

                {/* Coin balance buy pill exactly matching screenshot */}
                <button
                  type="button"
                  onClick={() => {
                    setIsGiftDrawerOpen(false);
                    onClose(); // Exit to go to profile store
                  }}
                  className="py-1.5 px-3 bg-indigo-950/50 border border-purple-500/35 hover:border-purple-400 rounded-full flex items-center gap-1.5 cursor-pointer text-xs font-black text-amber-400 font-mono hover:scale-105 duration-200"
                  title="Buy more Coins"
                >
                  ⭐ {currentUser.coins} <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </button>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
