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

  // State to manage virtual gifts list (to persist custom added premium items)
  const [giftsList, setGiftsList] = useState<Gift[]>(() => {
    try {
      const saved = localStorage.getItem(`custom_virtual_gifts`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return [...VIRTUAL_GIFTS, ...parsed];
      }
    } catch (e) {
      console.warn("Could not load custom gifts:", e);
    }
    return VIRTUAL_GIFTS;
  });

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

  // Temporary video background feed override based on sent gift setting
  const [overrideVideoFeedTheme, setOverrideVideoFeedTheme] = useState<string | null>(null);
  const [overrideVideoUrl, setOverrideVideoUrl] = useState<string | null>(null);

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

  // Floating Gifts Visual Alert Bubble (multiplier responsive)
  const [activeGiftAlert, setActiveGiftAlert] = useState<{
    sender: string;
    gift: Gift;
    timestamp: number;
    avatarUrl?: string;
    multiplier?: number;
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
    ...Array.from({ length: 8 }, (_, i) => ({
      id: i + 2,
      username: "",
      avatarUrl: "",
      isOccupied: false,
      isRequesting: false,
      statusText: "Request",
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

  // Sync state if live is active
  useEffect(() => {
    if ((isLiveActive && isBroadcasting) || (!isBroadcasting && activeStreamer)) {
      // "live my no bot view and no request bot"
      // If we are broadcasting ("live my"), starting viewers starts cleanly at 0 (no bot view), otherwise uses active category viewers count
      const initialViewers = isBroadcasting ? 0 : activeStreamer?.viewersCount || 100;
      setViewersCount(initialViewers);

      if (!isBroadcasting && activeStreamer) {
        // Pre-occupy some guest slots with active co-hosts only for other listed streams (viewer mode)
        setCoHostSlots((prevSlots) => {
          return prevSlots.map((slot) => {
            if (slot.id === 2) {
              return {
                ...slot,
                isOccupied: true,
                username: "neon_rider",
                avatarUrl: "https://picsum.photos/seed/neon_rider/150/150",
                statusText: "On Mic 🎤",
              };
            }
            if (slot.id === 4) {
              return {
                ...slot,
                isOccupied: true,
                username: "cyber_phantom",
                avatarUrl: "https://picsum.photos/seed/cyber_phantom/150/150",
                statusText: "On Mic 🎤",
              };
            }
            if (slot.id === 7) {
              return {
                ...slot,
                isOccupied: true,
                username: "star_sailor",
                avatarUrl: "https://picsum.photos/seed/star_sailor/150/150",
                statusText: "On Mic 🎤",
              };
            }
            return slot;
          });
        });
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
  }, [isLiveActive, activeStreamer, isBroadcasting]);

  // Simulated Comments Feed (DISABLED - Fake delete)
  useEffect(() => {
    /* Simulation disabled by user request
    if (isLiveActive && !isBroadcasting && activeStreamer) {
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
    */

    return () => {
      if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    };
  }, [isLiveActive, activeStreamer, isBroadcasting]);

  // Viewer fluctuation (DISABLED - Fake delete)
  useEffect(() => {
    /* Simulation disabled by user request
    if (isLiveActive && !isBroadcasting && activeStreamer) {
      viewerIntervalRef.current = window.setInterval(() => {
        setViewersCount((prev) => {
          const delta = Math.floor(Math.random() * 5) - 2;
          return Math.max(8, prev + delta);
        });
      }, 5000);
    }
    */

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
    setActiveGiftAlert({
      sender,
      gift,
      timestamp: alertTime,
      avatarUrl: `https://picsum.photos/seed/${sender}/100/100`,
      multiplier,
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
    const quantity = multiplier;
    setTotalGiftsCount((prev) => prev + quantity);
    setTotalCoinsEarned((prev) => prev + (gift.cost * quantity));

    // Pick a random occupied cohost slot or host to receive this simulated gift (adds score to mic users!)
    const occupiedSlots = coHostSlots.filter((s) => s.isOccupied);
    if (occupiedSlots.length > 0) {
      const luckySlot = occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)];
      setCoHostSlots((prevSlots) =>
        prevSlots.map((s) => (s.id === luckySlot.id ? { ...s, score: (s.score || 0) + (gift.cost * quantity) } : s))
      );
    }

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

    // Apply XP to current user
    const xpReward = Math.floor(gift.cost * quantity * 1.5);
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
  const handleSendGiftLocal = (gift: Gift) => {
    // 1. Calculate Multiplier (x1, x2, x3, x4 or Custom inventive selector)
    const multiplier = isCustomMultiplier ? (parseInt(customMultiplier) || 1) : giftMultiplier;
    
    // 2. Determine Recipients
    const isAll = selectedRecipient.username === "all_recipients";
    
    // Targets can be Host (ID 1) and any occupied guest slots (ID 2+)
    const targetSlots = isAll 
      ? coHostSlots.filter(s => s.isOccupied)
      : coHostSlots.filter(s => s.username === selectedRecipient.username);
    
    const targetCount = targetSlots.length || 1;
    const itemCost = gift.cost * multiplier;
    const totalCost = itemCost * targetCount;

    if (currentUser.coins < totalCost) {
      setNotEnoughCoinsMsg(true);
      setTimeout(() => setNotEnoughCoinsMsg(false), 3500);
      return;
    }

    // Deduct coins dynamically (tap sent gift -coin)
    const remaining = currentUser.coins - totalCost;
    onCoinsUpdate(remaining);
    onGiftSent?.();

    // Burst particles animation for high fidelity
    spawnGiftBurst(gift.icon, Math.min(65, 20 * multiplier));

    // Support screen overriding (add video gift screen)
    if ((gift as any).customVideoUrl) {
      setOverrideVideoUrl((gift as any).customVideoUrl);
      setTimeout(() => {
        setOverrideVideoUrl(null);
      }, 8000);
    } else if ((gift as any).videoFeedTheme) {
      setOverrideVideoFeedTheme((gift as any).videoFeedTheme);
      setTimeout(() => {
        setOverrideVideoFeedTheme(null);
      }, 5000);
    }

    // Trigger visual floating gift alert bubble immediately with user's sent name
    const alertTime = Date.now();
    setActiveGiftAlert({
      sender: `${currentUser.username} (You)`,
      gift,
      timestamp: alertTime,
      avatarUrl: currentUser.avatarUrl,
      multiplier,
    });

    // Track for Session Overview
    setTotalGiftsCount((p) => p + (multiplier * targetCount));
    setTotalCoinsEarned((p) => p + totalCost);

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
      username: `${currentUser.username} (You)`,
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
      // "live gift add list user mic tap sent gift" -> Choose Guest on mic and trigger Gift panel
      setSelectedRecipient({
        username: slot.username,
        avatarUrl: slot.avatarUrl,
        slotLabel: `Guest ${slot.id - 1}`,
      });
      setIsGiftDrawerOpen(true);
    } else {
      // "live no tap request" -> Tapping empty guest slots does not launch join/invite requests
    }
  };

  const startBroadcasting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupTitle.trim()) return;
    setIsLiveActive(true);
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
    <div id="live-cohost-arena-parent" className="w-full min-h-screen md:min-h-0 md:max-w-md mx-auto relative font-sans text-stone-100 md:py-3 py-0 md:px-2 px-0">
      
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
          className="relative w-full h-screen md:h-auto md:aspect-[9/16] max-w-md bg-black md:rounded-[36px] md:border-[5px] md:border-stone-800 shadow-2xl overflow-hidden flex flex-col justify-between mx-auto"
          style={{ background: "#0c0816" }}
        >
          {/* Video Takeover Overlay (Front & Sound) */}
          {overrideVideoUrl && (
            <div className="absolute inset-0 z-[60] pointer-events-none select-none overflow-hidden h-full w-full bg-black">
              <video
                autoPlay
                loop
                playsInline
                src={overrideVideoUrl}
                className="w-full h-full object-cover animate-fadeIn"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/90 backdrop-blur rounded-xl shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-bounce">
                <Video className="w-3.5 h-3.5 text-white" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white font-black uppercase tracking-tighter leading-none">PREMIUM VIDEO GIFT</span>
                  <span className="text-[7px] text-rose-100 font-bold uppercase tracking-widest leading-none mt-0.5">Live Takeover Active</span>
                </div>
              </div>
            </div>
          )}

          {/* Simulated Backdrop live video layer */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden h-full w-full">
            {(() => {
              const theme = overrideVideoFeedTheme || activeStreamer?.videoFeedType || "Cosmic Nebula Loop 🌌";
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
                  <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative">
                    <div className="absolute -inset-[10px] bg-gradient-to-tr from-[#2d1264] via-[#090326] to-[#4c0d45] opacity-80" />
                    <div className="absolute w-44 h-44 rounded-full bg-indigo-500/15 blur-3xl animate-pulse" />
                    <div className="absolute w-36 h-36 rounded-full bg-pink-500/10 blur-2xl animate-spin-slow" />
                  </div>
                );
              }
            })()}
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

              {/* Exit streamer button */}
              {isBroadcasting ? (
                <button 
                  type="button"
                  onClick={() => setShowSessionOverview(true)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-rose-500 border border-red-500/30 text-white font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer whitespace-nowrap"
                  title="End My Live Session"
                >
                  <Power className="w-3.5 h-3.5 text-white" /> End & Delete Live
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={() => setShowSessionOverview(true)}
                  className="w-7 h-7 rounded-full bg-black/65 border border-stone-800 flex items-center justify-center text-stone-300 hover:text-white hover:bg-stone-900 hover:scale-105 active:scale-95 transition-all"
                  title="Close Live Area"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ================= STREAM ALERT GESTURES / BURST BANNER ================= */}
          {activeGiftAlert && (
            <div className="absolute top-[18%] left-4 z-40 max-w-[85%] pointer-events-none flex items-center gap-2 animate-scaleUp select-none shadow-xl">
              {/* Compact Sleek Pill */}
              <div className="bg-stone-950/90 backdrop-blur-md border border-[#5C5CFC]/30 pl-1.5 pr-3 py-1 rounded-full flex items-center gap-2">
                {/* 1. Sender Avatar circle */}
                <div className="w-7 h-7 rounded-full overflow-hidden border border-white/15 shrink-0">
                  <img
                    src={activeGiftAlert.avatarUrl || `https://picsum.photos/seed/${activeGiftAlert.sender}/100/100`}
                    alt=""
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://picsum.photos/seed/gift/100/100";
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* 2. Compact text info */}
                <div className="text-left leading-tight min-w-0 pr-1">
                  <p className="text-[10px] font-black text-white truncate max-w-[102px]">
                    {activeGiftAlert.sender.replace(" (You)", "")}
                  </p>
                  <p className="text-[8px] text-purple-300 font-bold leading-none mt-0.5 whitespace-nowrap">
                    sent <span className="text-amber-400 font-extrabold">{activeGiftAlert.gift.name}</span>
                  </p>
                </div>
                {/* 3. Small Animated Gift Logo/icon */}
                <span className="text-xl animate-bounce shrink-0 filter drop-shadow flex items-center justify-center">
                  {activeGiftAlert.gift.icon && (activeGiftAlert.gift.icon.startsWith("blob:") || activeGiftAlert.gift.icon.startsWith("data:") || activeGiftAlert.gift.icon.startsWith("http")) ? (
                    <img src={activeGiftAlert.gift.icon} alt="" className="w-6 h-6 object-contain rounded" />
                  ) : (
                    activeGiftAlert.gift.icon
                  )}
                </span>
              </div>

              {/* 4. Live xMultiplier animated multiplier indicator on the right */}
              <span className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 tracking-tighter drop-shadow-md pr-1 pl-1.5 animate-pulse shrink-0 font-sans">
                x{activeGiftAlert.multiplier || 1}
              </span>
            </div>
          )}

          {/* ================= CO-HOST PODIUMS BOX grid (Screenshot 1 aspect) ================= */}
          <div id="co-hosting-video-arena" className="px-3 flex-1 flex flex-col justify-center select-none pt-4">
            <div className="grid grid-cols-3 gap-2 w-full">
              
              {/* Host / Slot 1 podium box */}
              <div className="aspect-square bg-stone-950 border border-stone-800/80 rounded-xl relative overflow-hidden flex flex-col justify-between p-1.5">
                {/* Audio room host container */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-gradient-to-b from-[#18122B] to-[#0A0712] z-0">
                  {/* Glowing dynamic ring */}
                  <div className="relative w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 via-pink-400 to-amber-300 animate-spin-slow">
                    <div className="w-full h-full rounded-full bg-stone-900 p-[1.5px]">
                      <img 
                        src={isBroadcasting ? currentUser.avatarUrl : activeStreamer?.avatarUrl || "https://picsum.photos/seed/ndnd/120/120"} 
                        alt="Host Avatar"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                  
                  {/* Score badge (live mic add score gift) */}
                  <div className="mt-1.5 flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full scale-90 leading-none">
                    <span className="text-[9px]">⭐</span>
                    <span className="text-[10px] font-mono font-black text-amber-300">
                      {coHostSlots.find(s => s.id === 1)?.score || 0}
                    </span>
                  </div>
                </div>

                <span className="text-[8px] text-stone-300 font-extrabold tracking-wide uppercase px-1 py-0.5 bg-purple-950/80 rounded border border-purple-500/30 z-10 w-fit">
                  Host
                </span>

                <span className="text-[10px] text-stone-200 font-bold truncate z-10 text-left pl-1">
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1 bg-gradient-to-b from-[#110e1f] to-[#06040d] z-0">
                      {/* Guest avatar pulsing ring */}
                      <div className="relative w-10 h-10 rounded-full p-[1.5px] bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500">
                        <div className="w-full h-full rounded-full bg-stone-900 p-[1px]">
                          <img 
                            src={slot.avatarUrl} 
                            alt="" 
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      </div>
                      
                      {/* Live mic score badge (live mic add score gift) */}
                      <div className="mt-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full scale-75 leading-none">
                        <span className="text-[7.5px]">⭐</span>
                        <span className="text-[8.5px] font-mono font-bold text-cyan-300">
                          {slot.score || 0}
                        </span>
                      </div>

                      <span className="text-[9px] text-stone-200 font-extrabold truncate w-[85px] text-center tracking-tight leading-none mt-1">
                        {slot.username}
                      </span>

                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 z-10 shadow-lg animate-pulse" />
                    </div>
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

          {/* USER MIC CONTROL PANEL (One-Tap Request, Back Mic, Voice Off/On) */}
          <div className="px-3.5 py-1 z-20 shrink-0">
            {!isJoinedOnMic ? (
              <button
                type="button"
                onClick={handleOneTapJoinMic}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-stone-950 font-black tracking-tight text-[11px] uppercase rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 animate-pulse"
              >
                <Mic className="w-3.5 h-3.5" /> One-Tap Join Mic
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full bg-stone-900/90 border border-purple-500/30 p-1.5 rounded-xl shadow-lg">
                {/* Voice On/Off toggle */}
                <button
                  type="button"
                  onClick={handleToggleMicVoice}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isMicVoiceOn 
                      ? "bg-purple-600 text-white hover:bg-purple-500" 
                      : "bg-red-950 text-red-400 border border-red-800/50"
                  }`}
                >
                  <span className="text-xs">{isMicVoiceOn ? "🎙️" : "🔇"}</span>
                  Voice {isMicVoiceOn ? "On" : "Off"}
                </button>

                {/* Back Mic button */}
                <button
                  type="button"
                  onClick={handleLeaveMic}
                  className="flex-1 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-stone-700"
                >
                  <span className="text-xs">↩️</span> Back Mic
                </button>
              </div>
            )}
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

              {/* Multiplier Select widget (sent gift tap x1 2 3 4 invente) */}
              <div id="gift-multiplier-controls" className="mb-3 bg-stone-950/80 p-2.5 rounded-2xl border border-stone-900 text-left select-none shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wide font-extrabold text-stone-400">🚀 Select Multiplier:</span>
                  <span className="text-[9px] text-[#A855F7] font-black bg-purple-500/10 px-2 py-0.5 rounded">
                    x{isCustomMultiplier ? (parseInt(customMultiplier) || 1) : giftMultiplier} Multiplier Active
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setIsCustomMultiplier(false);
                        setGiftMultiplier(num);
                      }}
                      className={`px-3 py-1 text-[10px] font-black rounded-xl transition-all border select-none cursor-pointer ${
                        !isCustomMultiplier && giftMultiplier === num
                          ? "bg-[#632890] text-white border-purple-500 shadow-lg scale-95"
                          : "bg-stone-900 text-stone-400 border-stone-850 hover:text-stone-200"
                      }`}
                    >
                      x{num}
                    </button>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMultiplier(true);
                    }}
                    className={`px-3 py-1 text-[10px] font-black rounded-xl transition-all border select-none cursor-pointer ${
                      isCustomMultiplier
                        ? "bg-[#632890] text-white border-purple-500 shadow-lg"
                        : "bg-stone-900 text-stone-400 border-stone-850 hover:text-stone-305"
                    }`}
                  >
                    Custom / Invente ✍️
                  </button>
                  
                  {isCustomMultiplier && (
                    <div className="relative flex items-center bg-stone-900/60 border border-purple-500/40 rounded-xl px-2 py-0.5">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        placeholder="Qty"
                        value={customMultiplier}
                        onChange={(e) => setCustomMultiplier(e.target.value)}
                        className="w-14 bg-transparent text-white text-[10px] font-bold focus:outline-none placeholder-stone-600 font-mono text-center"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings loop */}
              {notEnoughCoinsMsg && (
                <div className="p-2 mb-2 bg-red-950/50 border border-red-850/40 text-red-400 text-[10px] text-center rounded-lg font-bold animate-shake shrink-0">
                  ⚠️ Lower balance! Spend inside profile wallet / add coins to tip.
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
                
                <div className="grid grid-cols-4 gap-2 h-[180px] overflow-y-auto p-0.5 scrollbar-thin scrollbar-thumb-purple-900/40">
                  {giftsList.map((gift) => {
                    const isSelected = selectedGiftId === gift.id;
                    return (
                      <div
                        key={gift.id}
                        onClick={() => setSelectedGiftId(gift.id)}
                        className={`relative p-2 rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer select-none ${
                          isSelected 
                            ? "bg-[#632890]/25 border-2 border-purple-500 scale-95 shadow-md" 
                            : "bg-stone-950 border border-stone-900 hover:border-purple-900"
                        }`}
                      >
                        {/* Animated Floating preview for high fidelity */}
                        <span className="text-2xl mb-1 drop-shadow flex items-center justify-center h-8 w-8">
                          {gift.icon && (gift.icon.startsWith("blob:") || gift.icon.startsWith("data:") || gift.icon.startsWith("http")) ? (
                            <img src={gift.icon} alt="" className="w-8 h-8 object-contain rounded" />
                          ) : (
                            gift.icon
                          )}
                        </span>
                        <span className="text-[9px] font-black text-white text-center truncate w-full mb-0.5 leading-none">
                          {gift.name}
                        </span>
                        <span className="text-[8px] font-extrabold text-amber-500 font-mono tracking-tight flex items-center justify-center gap-0.5">
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
                            className="mt-1 w-full py-1 text-[8px] font-black uppercase text-white bg-gradient-to-r from-purple-600 to-[#923FEF] hover:from-[#A855F7] rounded-md tracking-wider animate-scaleUp cursor-pointer shadow border border-white/5"
                          >
                            Send
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom footer bar: Golden buy coin pill indicator */}
              <div className="mt-3.5 pt-3.5 border-t border-stone-900 flex items-center justify-between shrink-0">
                <div className="text-[11px] text-stone-500 font-medium">
                  Select a premium item and click Send
                </div>

                {/* Coin and Diamond balance static display */}
                <div className="flex items-center gap-2">
                  <div className="py-1.5 px-3 bg-stone-950/40 border border-stone-800 rounded-full flex items-center gap-1.5 text-[11px] font-black text-amber-400 font-mono">
                    <span>🪙</span>
                    <span>{currentUser.coins}</span>
                  </div>
                  <div className="py-1.5 px-3 bg-stone-950/40 border border-stone-800 rounded-full flex items-center gap-1.5 text-[11px] font-black text-cyan-400 font-mono">
                    <span>💎</span>
                    <span>{currentUser.diamonds || 0}</span>
                  </div>
                </div>
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
                        onClick={() => {
                          if (!newGiftName.trim()) return;
                          
                          const customObj: Gift = {
                            id: `gift-custom-${Date.now()}`,
                            name: newGiftName.trim(),
                            icon: newGiftIcon.trim() || "🎁",
                            cost: newGiftCost,
                            category: "premium",
                            animationStyle: "sparkle",
                          };

                          // Attach video theme override properties safely
                          if (newGiftVideoUrl) {
                            (customObj as any).customVideoUrl = newGiftVideoUrl;
                          } else {
                            (customObj as any).videoFeedTheme = newGiftVideoTheme;
                          }

                          // Save to local hooks
                          const updated = [...giftsList.filter(g => g.category === "custom" || g.id.startsWith("gift-custom-")), customObj];
                          try {
                            localStorage.setItem(`custom_virtual_gifts`, JSON.stringify(updated));
                          } catch (e) {
                            console.warn("Could not save to localStorage:", e);
                          }

                          setGiftsList((prev) => [...prev, customObj]);
                          setSelectedGiftId(customObj.id);

                          // Reset states and exit
                          setShowAddGiftPrompt(false);
                          setNewGiftName("");
                          setSimulatedFileName("");
                          setSimulatedGiftVideoFileName("");
                          setNewGiftVideoUrl("");
                          setNewGiftIcon("👑");
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

        </div>
      )}
    </div>
  );
}
