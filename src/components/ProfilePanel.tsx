/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { User } from "../types";
import { 
  Copy, 
  Check, 
  Edit2, 
  Save, 
  Upload, 
  Coins, 
  Sparkles, 
  Award, 
  Lock, 
  Unlock, 
  Plus,
  Ticket,
  Trash2,
  Settings,
  Heart,
  UserPlus,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Camera,
  Eye,
  Wallet,
  Box,
  Store,
  Share2,
  HelpCircle
} from "lucide-react";
import { db, handleFirestoreError, OperationType, firestoreStatus } from "../lib/firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { getXpNeededForLevel, LEVEL_REQUIREMENTS } from "../utils/levelUtils";

interface ProfilePanelProps {
  currentUser: User;
  onProfileUpdate: (updatedUser: User) => void;
  onOpenCoinStore: () => void;
}

interface AvatarFrame {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  glowColor: string;
  borderColor: string;
  frameStyleClass: string; // Tailwind borders + glows
  description: string;
}

const AVATAR_FRAMES: AvatarFrame[] = [
  {
    id: "none",
    name: "Classic Frame-Free",
    emoji: "⚪",
    cost: 0,
    glowColor: "transparent",
    borderColor: "#e2e8f0",
    frameStyleClass: "border-2 border-stone-300 shadow-sm",
    description: "Simple, pristine round border"
  },
  {
    id: "neon_purple",
    name: "Glowing Neon Violet",
    emoji: "🔮",
    cost: 50,
    glowColor: "#c084fc",
    borderColor: "#a855f7",
    frameStyleClass: "border-4 border-[#C084FC] shadow-[0_0_15px_rgba(168,85,247,0.85)] animate-pulse",
    description: "Matches the screenshot's luxury violet outline"
  },
  {
    id: "royal_gold",
    name: "Royal Crown Amber",
    emoji: "👑",
    cost: 300,
    glowColor: "#f59e0b",
    borderColor: "#eab308",
    frameStyleClass: "border-4 border-amber-400 bg-gradient-to-tr from-yellow-300 via-amber-500 to-yellow-600 shadow-[0_0_15px_rgba(245,158,11,0.9)]",
    description: "Highly polished golden dual-gradient border"
  },
  {
    id: "cyber_laser",
    name: "Cyber Emerald HUD",
    emoji: "💚",
    cost: 600,
    glowColor: "#10b981",
    borderColor: "#34d399",
    frameStyleClass: "border-[3.5px] border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.9)]",
    description: "Luminescent green terminal grid lines"
  },
  {
    id: "cosmic_fire",
    name: "Cosmic Sun Flare",
    emoji: "🔥",
    cost: 1200,
    glowColor: "#f43f5e",
    borderColor: "#e11d48",
    frameStyleClass: "border-4 border-rose-500 bg-gradient-to-r from-red-500 via-pink-500 to-rose-600 shadow-[0_0_22px_#f43f5e] animate-pulse",
    description: "An ultra-premium crimson-orange flare rotation"
  },
];

const POPULAR_FLAGS = [
  { code: "🇮🇶", name: "Iraq" },
  { code: "🇺🇸", name: "US" },
  { code: "🇬🇧", name: "UK" },
  { code: "🇸🇦", name: "KSA" },
  { code: "🇪🇬", name: "Egypt" },
  { code: "🇹🇷", name: "Turkey" },
  { code: "🇨🇦", name: "Canada" },
  { code: "🇩🇪", name: "Germany" },
  { code: "🇯🇵", name: "Japan" },
  { code: "🇧🇷", name: "Brazil" },
];

export default function ProfilePanel({ currentUser, onProfileUpdate, onOpenCoinStore }: ProfilePanelProps) {
  // Current user custom fields with fallback defaults
  const activeFrameId = currentUser.activeFrameId || "none";
  const unlockedFrames = currentUser.unlockedFrames || ["none"];
  const countryFlag = currentUser.countryFlag || "🇮🇶";
  const gender = currentUser.gender || "male";
  const likesCount = currentUser.likesCount !== undefined ? currentUser.likesCount : 0;
  const friendsCount = currentUser.friendsCount !== undefined ? currentUser.friendsCount : 0;

  // Tabs selection in Phone Mockup
  const [activeSubTab, setActiveSubTab] = useState<"reels" | "feeds" | "collections">("reels");

  // Reels, Feeds, and Collections local data states to support deletions
  const [reelsList, setReelsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`reels_list_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [
        { id: "reel-1", tag: "#live_highlight", title: "My Live Stream Moments", bg: "https://picsum.photos/seed/highlight1/300/500" },
        { id: "reel-2", tag: "#gaming_life", title: "Arena Championship Goal", bg: "https://picsum.photos/seed/highlight2/300/500" }
      ];
    } catch {
      return [
        { id: "reel-1", tag: "#live_highlight", title: "My Live Stream Moments", bg: "https://picsum.photos/seed/highlight1/300/500" },
        { id: "reel-2", tag: "#gaming_life", title: "Arena Championship Goal", bg: "https://picsum.photos/seed/highlight2/300/500" }
      ];
    }
  });

  const [feedsList, setFeedsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`feeds_list_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [
        { 
          id: "feed-1", 
          time: "3 hours ago", 
          content: "Proud to showcase my brand-new Creator Profile Studio! Spent loopcoins in the avatar frame shop to get this luminescent border. Grab yours from the boutique! 🔮🎨", 
          likes: "1.2k Likes", 
          comments: "8 Comments" 
        }
      ];
    } catch {
      return [
        { 
          id: "feed-1", 
          time: "3 hours ago", 
          content: "Proud to showcase my brand-new Creator Profile Studio! Spent loopcoins in the avatar frame shop to get this luminescent border. Grab yours from the boutique! 🔮🎨", 
          likes: "1.2k Likes", 
          comments: "8 Comments" 
        }
      ];
    }
  });

  const [collectionsList, setCollectionsList] = useState(() => {
    try {
      const saved = localStorage.getItem(`collections_list_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [
        { id: "col-1", name: "Premium Gift Badge", icon: "💎", description: "Unlocks standard co-host points" },
        { id: "col-2", name: "Cyber Sunset Loop Frame", icon: "🌆", description: "Purchased from Customizer deck" },
        { id: "col-3", name: "Lofi Beats Golden Record", icon: "🎧", description: "Earned from daily activity tasks" }
      ];
    } catch {
      return [
        { id: "col-1", name: "Premium Gift Badge", icon: "💎", description: "Unlocks standard co-host points" },
        { id: "col-2", name: "Cyber Sunset Loop Frame", icon: "🌆", description: "Purchased from Customizer deck" },
        { id: "col-3", name: "Lofi Beats Golden Record", icon: "🎧", description: "Earned from daily activity tasks" }
      ];
    }
  });

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem(`reels_list_${currentUser.id}`, JSON.stringify(reelsList));
  }, [reelsList, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`feeds_list_${currentUser.id}`, JSON.stringify(feedsList));
  }, [feedsList, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`collections_list_${currentUser.id}`, JSON.stringify(collectionsList));
  }, [collectionsList, currentUser.id]);

  const handleDeleteReel = (id: string) => {
    setReelsList(prev => prev.filter(r => r.id !== id));
  };

  const handleDeleteFeed = (id: string) => {
    setFeedsList(prev => prev.filter(f => f.id !== id));
  };

  const handleDeleteCollection = (id: string) => {
    setCollectionsList(prev => prev.filter(c => c.id !== id));
  };

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [selectedFlag, setSelectedFlag] = useState(countryFlag);
  const [selectedGender, setSelectedGender] = useState(gender);
  const [statsLikes, setStatsLikes] = useState(likesCount);
  const [statsFriends, setStatsFriends] = useState(friendsCount);
  const [statsFollowers, setStatsFollowers] = useState(currentUser.followers);
  const [statsFollowing, setStatsFollowing] = useState(currentUser.following);

  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [referralCode, setReferralCode] = useState(currentUser.referralCode || "");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Admin and coupons section logic
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [customCoinsInput, setCustomCoinsInput] = useState(1000);
  const [activeCodes, setActiveCodes] = useState<{ id: string; code: string; coins: number; createdAt: string }[]>([]);
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodeCoins, setNewCodeCoins] = useState(5000);
  const [isAddingCode, setIsAddingCode] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [customLevelInput, setCustomLevelInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state variables whenever currentUser changes (e.g. state synced in background)
  useEffect(() => {
    setFullName(currentUser.fullName);
    setBio(currentUser.bio);
    setUsername(currentUser.username);
    setAvatarUrl(currentUser.avatarUrl);
    setSelectedFlag(currentUser.countryFlag || "🇮🇶");
    setSelectedGender(currentUser.gender || "male");
    setStatsLikes(currentUser.likesCount !== undefined ? currentUser.likesCount : 0);
    setStatsFriends(currentUser.friendsCount !== undefined ? currentUser.friendsCount : 0);
    setStatsFollowers(currentUser.followers);
    setStatsFollowing(currentUser.following);
    setReferralCode(currentUser.referralCode || "");
  }, [currentUser]);

  // Generate deterministic 8-number Unique ID to make it match screenshot's length
  const getNumericId = (idString: string) => {
    let hash = 0;
    for (let i = 0; i < idString.length; i++) {
      hash = (hash << 5) - hash + idString.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    return (80000000 + (positiveHash % 19999999)).toString();
  };

  const displayId = getNumericId(currentUser.id);

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Profile image upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        setErrorMsg("Image size exceeds 1.5MB. Please upload a smaller file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAvatarUrl(reader.result);
          setErrorMsg("");
          
          // Apply changes immediately for a highly interactive feeling
          const updated = {
            ...currentUser,
            avatarUrl: reader.result
          };
          onProfileUpdate(updated);
        }
      };
      reader.onerror = () => {
        setErrorMsg("Failed to process file. Try another image.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Save the full custom fields profile updates
  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!fullName.trim() || !username.trim()) {
      setErrorMsg("Full name and handle are required.");
      return;
    }

    const sanitizedHandle = username.startsWith("@") ? username : `@${username}`;

    const updated: User = {
      ...currentUser,
      fullName: fullName.trim(),
      username: sanitizedHandle.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl,
      countryFlag: selectedFlag,
      gender: selectedGender,
      likesCount: Number(statsLikes) || 0,
      friendsCount: Number(statsFriends) || 0,
      followers: Number(statsFollowers) || 0,
      following: Number(statsFollowing) || 0,
      referralCode: referralCode.trim(),
      identificationCode: displayId
    };

    onProfileUpdate(updated);
    setIsEditing(false);
    setSuccessMsg("Profile details updated successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Avatar frame boutique actions
  const handleEquipFrame = (frameId: string) => {
    setSuccessMsg("");
    setErrorMsg("");

    if (!unlockedFrames.includes(frameId)) {
      setErrorMsg("This frame is locked. Choose another or purchase it first.");
      return;
    }

    const updated: User = {
      ...currentUser,
      activeFrameId: frameId
    };
    onProfileUpdate(updated);
    setSuccessMsg(`Equipped frame: ${AVATAR_FRAMES.find(o => o.id === frameId)?.name}!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handlePurchaseFrame = (frame: AvatarFrame) => {
    setSuccessMsg("");
    setErrorMsg("");

    if (unlockedFrames.includes(frame.id)) {
      // Already owned, equip it
      handleEquipFrame(frame.id);
      return;
    }

    if (currentUser.coins < frame.cost) {
      setErrorMsg(`Insufficient coins. Frame requires ${frame.cost} LoopCoins. Use admin tools or coupons in wallet to unlock coins!`);
      return;
    }

    // Deduct coins and add to unlocked frames list
    const updatedUnlocked = [...unlockedFrames, frame.id];
    const updated: User = {
      ...currentUser,
      coins: currentUser.coins - frame.cost,
      unlockedFrames: updatedUnlocked,
      activeFrameId: frame.id
    };

    onProfileUpdate(updated);
    setSuccessMsg(`Successfully bought and equipped ${frame.name}!`);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Admin system verification
  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    if (adminPassword === "EMAD8912") {
      setIsAdminUnlocked(true);
      setShowAdminGate(false);
      setAdminPassword("");
    } else {
      setAdminError("Invalid Admin Credentials. Ensure password details are exact.");
    }
  };

  // Dynamic coin actions
  const handleAdminAddCoins = () => {
    const updateAmount = Number(customCoinsInput) || 100;
    const updatedUser = {
      ...currentUser,
      coins: currentUser.coins + updateAmount
    };
    onProfileUpdate(updatedUser);
    setSuccessMsg(`Granted +${updateAmount.toLocaleString()} coins via Admin Panel!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAdminModifyCoins = (amount: number) => {
    const newCoins = Math.max(0, currentUser.coins + amount);
    const updatedUser = {
      ...currentUser,
      coins: newCoins
    };
    onProfileUpdate(updatedUser);
    setSuccessMsg(`${amount > 0 ? "Added" : "Deducted"} ${Math.abs(amount)} coins!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Real-time listener for coupon creation
  useEffect(() => {
    if (!isAdminUnlocked) return;

    const codesRef = collection(db, "coin_codes");
    const q = query(codesRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setActiveCodes(list);
    }, (err) => {
      console.error("Failed fetching coin codes:", err);
      handleFirestoreError(err, OperationType.LIST, "coin_codes");
    });

    return () => unsubscribe();
  }, [isAdminUnlocked]);

  const handleCreateCoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (firestoreStatus.isQuotaExceeded) {
       setAdminError("Firestore quota exceeded. Cannot create codes now.");
       return;
    }
    if (!newCodeName.trim()) {
      setAdminError("Please enter or generate a code");
      return;
    }
    setAdminError("");
    setIsAddingCode(true);

    const formattedCode = newCodeName.trim().toUpperCase();

    try {
      const codeRef = doc(db, "coin_codes", formattedCode);
      await setDoc(codeRef, {
        code: formattedCode,
        coins: Number(newCodeCoins) || 1000,
        createdAt: new Date().toISOString()
      });
      setNewCodeName("");
    } catch (err: any) {
      console.error("Error creating coin code:", err);
      setAdminError(`Permission Denied or Code Registration Failed: ${err.message}`);
      handleFirestoreError(err, OperationType.CREATE, `coin_codes/${formattedCode}`);
    } finally {
      setIsAddingCode(false);
    }
  };

  const handleDeleteCoinCode = async (id: string) => {
    if (firestoreStatus.isQuotaExceeded) return;
    try {
      const codeRef = doc(db, "coin_codes", id);
      await deleteDoc(codeRef);
    } catch (err: any) {
      console.error("Error deleting coin code:", err);
      setAdminError(`Failed to delete code: ${err.message}`);
      handleFirestoreError(err, OperationType.DELETE, `coin_codes/${id}`);
    }
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "CREATOR-";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCodeName(result);
  };

  // Get active frame configuration object
  const activeFrame = AVATAR_FRAMES.find(f => f.id === activeFrameId) || AVATAR_FRAMES[0];

  if (isEditing) {
    return (
      <div id="fill-profile-view" className="w-full min-h-screen md:min-h-0 md:max-w-md mx-auto relative font-sans py-0 md:py-3 px-0 md:px-2 animate-scaleUp text-left">
        {/* Responsive profile mockup body wrapper */}
        <div className="bg-[#FAF9FC] text-[#1E192B] w-full min-h-screen md:min-h-[690px] md:rounded-[40px] shadow-2xl md:border-4 md:border-stone-800 overflow-hidden relative flex flex-col justify-between">
          
          {/* Status Bar simulation - only on desktop container mode */}
          <div className="px-6 pt-3 pb-1 hidden md:flex justify-between items-center text-[11px] font-semibold text-[#828291] font-mono select-none shrink-0">
            <span>12:30</span>
            <div className="flex items-center gap-1.5">
              {/* Signal Strength bars */}
              <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17h2v3H3zm4-3h2v6H7zm4-3h2v9h-2zm4-4h2v13h-2zm4-4h2v17h-2z" />
              </svg>
              {/* Wi-Fi Icon */}
              <svg className="w-3.5 h-3.5 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21l-12-14c4-3.5 10.5-5.5 12-5.5s8 2 12 5.5l-12 14z" />
              </svg>
              {/* Battery Indicator */}
              <div className="w-5 h-2.5 border border-[#828291]/70 rounded px-0.5 flex items-center shrink-0">
                <div className="h-full w-4/5 bg-[#828291] rounded-2xs"></div>
              </div>
            </div>
          </div>

          {/* Action Header bar */}
          <div className="px-5 py-3 flex items-center border-b border-stone-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1 hover:bg-stone-100 rounded-full text-stone-850 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              title="Go back"
            >
              <ChevronLeft className="w-6 h-6 text-stone-900 stroke-[2.5]" />
            </button>
            <h2 className="text-md sm:text-lg font-black text-stone-900 tracking-tight leading-none text-center flex-1 pr-6">
              Fill Profile
            </h2>
          </div>

          {/* Scrolling Main Body Form */}
          <div className="px-5 sm:px-6 py-5 flex-1 overflow-y-auto space-y-5">
            
            {/* 1. Center Avatar Frame selection and preview */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative shrink-0 select-none">
                {/* Visual rendering of active frame with image */}
                <div className={`w-28 h-28 rounded-full flex items-center justify-center p-0.5 relative transition-all duration-300 ${activeFrame.frameStyleClass}`}>
                  <img
                    src={avatarUrl}
                    alt="Mutable Profile"
                    referrerPolicy="no-referrer"
                    className="w-[98px] h-[98px] rounded-full object-cover bg-stone-100"
                  />
                </div>
                
                {/* Camera Floating Trigger Circle Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-white text-[#9F5FFE] border border-stone-200/60 shadow-[0_4px_12px_rgba(0,0,0,0.12)] rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Upload profile picture"
                >
                  <Camera className="w-3.5 h-3.5 text-[#9A52FD] stroke-[2.5]" />
                </button>
              </div>
              <span className="text-[10px] text-[#828291] font-bold uppercase tracking-wider">Tap camera to edit image</span>
            </div>

            {/* Inputs list form */}
            <div className="space-y-3.5">
              
              {/* Full Name input box */}
              <div className="relative bg-white border border-stone-200/90 rounded-2xl p-3 shadow-sm">
                <label className="block text-[10px] font-extrabold uppercase text-[#828291] tracking-wider mb-1 select-none">
                  Full Name
                </label>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-transparent text-stone-800 text-xs sm:text-sm font-semibold focus:outline-none pr-8 py-0.5"
                  />
                  <Edit2 className="w-3.5 h-3.5 text-stone-400 absolute right-4 bottom-3.5 select-none pointer-events-none" />
                </div>
              </div>

              {/* User Name input box */}
              <div className="relative bg-white border border-stone-200/90 rounded-2xl p-3 shadow-sm">
                <label className="block text-[10px] font-extrabold uppercase text-[#828291] tracking-wider mb-1 select-none">
                  User Name
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 font-mono text-xs sm:text-sm leading-none mr-0.5 select-none font-bold">@</span>
                  <input
                    type="text"
                    required
                    value={username.replace(/^@/, '')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                      setUsername(`@${val}`);
                    }}
                    placeholder="username"
                    className="w-full bg-transparent text-stone-800 text-xs sm:text-sm font-semibold focus:outline-none pr-8 py-0.5 font-mono"
                  />
                  {/* Green validation checkmark decoration block */}
                  <div className="absolute right-4 bottom-3 flex items-center justify-center bg-green-100/80 rounded-full p-0.5">
                    <Check className="w-3 h-3 text-green-600 stroke-[3.5]" />
                  </div>
                </div>
              </div>

              {/* Identification Code input box */}
              <div className="relative bg-stone-100/60 border border-stone-200/40 rounded-2xl p-3 shadow-sm">
                <label className="block text-[10px] font-extrabold uppercase text-[#828291]/85 tracking-wider mb-1 select-none">
                  Identification Code
                </label>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={displayId}
                    className="w-full bg-transparent text-stone-500 text-xs sm:text-sm font-semibold focus:outline-none font-mono py-0.5 cursor-not-allowed select-all"
                  />
                  <Lock className="w-3 h-3 text-stone-300 absolute right-4 bottom-4" />
                </div>
              </div>

              {/* Referral Code input box */}
              <div className="relative bg-white border border-stone-200/90 rounded-2xl p-3 shadow-sm">
                <label className="block text-[10px] font-extrabold uppercase text-[#828291] tracking-wider mb-1 select-none">
                  Referral Code
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                  placeholder="Enter referral code"
                  className="w-full bg-transparent text-stone-800 text-xs sm:text-sm font-semibold focus:outline-none py-0.5 font-mono"
                />
              </div>

              {/* Country select input box */}
              <div className="relative bg-white border border-[#E2E8F0] rounded-2xl p-3 shadow-sm">
                <label className="block text-[10px] font-extrabold uppercase text-[#828291] tracking-wider mb-1 select-none">
                  Country
                </label>
                
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="w-full text-left bg-transparent text-stone-800 text-xs sm:text-sm font-semibold py-0.5 flex items-center justify-between focus:outline-none cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none shrink-0 select-none">
                      {POPULAR_FLAGS.find(f => f.code === selectedFlag || f.name === selectedFlag)?.code || "🇮🇶"}
                    </span>
                    <span>
                      {POPULAR_FLAGS.find(f => f.code === selectedFlag || f.name === selectedFlag)?.name || "Iraq"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-stone-400 stroke-[2.5]" />
                </button>

                {/* Dropdown Options List */}
                {showCountryDropdown && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-stone-200 shadow-xl rounded-2xl max-h-56 overflow-y-auto z-50 p-1.5 animate-scaleUp">
                    <div className="grid grid-cols-1 gap-0.5">
                      {POPULAR_FLAGS.map((country) => (
                        <button
                          key={country.name}
                          type="button"
                          onClick={() => {
                            setSelectedFlag(country.code);
                            setShowCountryDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-2.5 hover:bg-stone-50 select-none cursor-pointer transition-colors ${
                            selectedFlag === country.code ? "bg-purple-50 text-[#7B3FFE]" : "text-stone-700"
                          }`}
                        >
                          <span className="text-base leading-none shrink-0">{country.code}</span>
                          <span>{country.name}</span>
                          {selectedFlag === country.code && (
                            <Check className="w-3.5 h-3.5 text-[#7B3FFE] ml-auto stroke-[2.5]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Fixed bottom Save action button */}
          <div className="p-5 sm:p-6 bg-white border-t border-stone-100 flex flex-col space-y-2 shrink-0">
            <button
              onClick={() => handleSaveProfile()}
              type="button"
              className="w-full py-3.5 bg-gradient-to-r from-[#9F5FFE] to-[#8042FE] text-white hover:opacity-95 text-xs font-black uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5 text-white" />
              Save Profile
            </button>
          </div>

          {/* Hidden input file inside template markup for instant access */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>
    );
  }

    const renderRowItem = ({ icon, label, rightText, onClick }: {icon: React.ReactNode, label: string, rightText?: string, onClick?: () => void}) => (
    <button 
      onClick={onClick}
      className="flex items-center justify-between px-5 py-4 w-full hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer outline-none"
    >
      <div className="flex items-center gap-4">
        {icon}
        <span className="text-stone-100 text-[15px] font-bold tracking-wide">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {rightText && <span className="text-stone-500 text-[13px] font-semibold">{rightText}</span>}
        <ChevronRight className="w-5 h-5 text-stone-500" strokeWidth={2.5} />
      </div>
    </button>
  );

  return (
    <div id="profile-management-panel" className="w-full min-h-screen bg-[#110D0F] font-sans pb-24 overflow-y-auto animate-fadeIn relative">
      
      {/* Dynamic Alerts Banner */}
      {errorMsg && (
        <div id="alert-error-banner" className="m-4 p-4 bg-red-900 border border-red-700 text-red-100 text-xs rounded-xl animate-scaleUp font-semibold shadow-sm">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div id="alert-success-banner" className="m-4 p-4 bg-green-900 border border-green-700 text-green-100 text-xs rounded-xl animate-scaleUp font-semibold shadow-sm">
          {successMsg}
        </div>
      )}

      {/* Top Header Section */}
      <div className="pt-10 px-6 pb-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img 
              src={avatarUrl} 
              alt="Profile" 
              className="w-[72px] h-[72px] rounded-full object-cover bg-stone-800 border-2 border-stone-800"
              referrerPolicy="no-referrer"
            />
          </div>
          
          {/* Info */}
          <div className="flex-1 flex flex-col justify-center mt-1">
            <div className="flex items-center gap-1.5 mb-1">
              <h2 className="text-[17px] font-black text-white tracking-tight uppercase">
                {fullName || "•ONLY ONE•"}
              </h2>
              {/* Gender icon badge - Blue Mars circle directly matching image */}
              <div className="w-4 h-4 rounded-full bg-[#0099FF] flex items-center justify-center">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 9c0-4.97-4.03-9-9-9s-9 4.03-9 9c0 4.61 3.5 8.44 8 8.94V22h2v-4.06c4.5-.5 8-4.33 8-8.94zm-14 0c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z"/>
                </svg>
              </div>
              {/* Verified badge */}
              <div className="w-4 h-4 rounded-full text-[#4B85FF] flex items-center justify-center ml-0.5">
                 <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-stone-500 font-bold text-[13px] mb-2 select-none">
              <span>ID:{displayId}</span>
              <button onClick={handleCopyId} className="hover:text-white transition-colors cursor-pointer select-none border border-stone-600 rounded-sm p-0.5" title="Copy ID">
                 {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-stone-400" />}
              </button>
            </div>
            
            {/* Stars / badges */}
            <div className="flex items-center gap-1.5">
               <div className="text-[#FFD700] text-[14px]">⭐</div>
               <div className="text-[#FFD700] text-[14px]">⭐</div>
               <div className="w-4 h-4 border-2 border-stone-500 text-stone-400 rounded-full flex items-center justify-center text-[10px] font-bold">?</div>
            </div>
          </div>
          
          {/* Edit Button */}
          <button 
            type="button" 
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-[12px] border border-stone-600/70 text-stone-300 text-[13px] hover:bg-stone-800 transition-colors cursor-pointer select-none font-bold"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      </div>

      {/* Banner / Card */}
      <div className="px-4 mb-2">
        <div className="relative overflow-hidden rounded-[16px] bg-[#1B2130] p-4 flex items-center shadow-lg border border-white/[0.04]">
          <div className="absolute right-0 top-0 bottom-0 w-44 bg-gradient-to-r from-transparent to-[#1D2B44] pointer-events-none"></div>
          
          {/* Decorative geometric patterns matching the tribe card UI */}
          <div className="absolute -right-6 top-[-10%] w-24 h-[120%] bg-[#253147] opacity-60 skew-x-[30deg] pointer-events-none"></div>
          <div className="absolute -right-24 top-[-10%] w-32 h-[120%] bg-[#2C3B53] opacity-60 skew-x-[30deg] pointer-events-none"></div>
          
          <div className="flex bg-gradient-to-br from-[#4Da2ff] to-[#2575fc] rounded-xl mr-4 shrink-0 items-center justify-center w-[52px] h-[52px] shadow-[0_3px_10px_rgba(37,117,252,0.3)] relative z-10 border border-[#8ebcfb]/30">
             <div className="relative flex items-center justify-center w-full h-full">
                {/* Custom Tribe Premium Icon Box */}
                <div className="w-7 h-7 bg-[#A6CFFF] rounded-sm flex items-center justify-center">
                    <div className="text-[#0E49B5] text-[15px]">⭐</div>
                </div>
                <div className="absolute -bottom-1 -right-0.5 bg-[#4Da2ff] rounded-full p-[1px]">
                   <div className="text-[6px]">⭐</div>
                </div>
             </div>
          </div>
          <div className="flex-1 relative z-10 p-0.5">
             <div className="text-white font-extrabold text-[16px] mb-0.5 tracking-tight drop-shadow-sm">Join a Tribe</div>
             <div className="text-[#8B98A9] text-sm tracking-tight font-semibold">Meet friends and get bonus</div>
          </div>
          <button className="relative z-10 px-6 py-2 bg-[#3B82F6] hover:bg-[#2563EB] active:scale-95 transition-all text-white font-extrabold text-[13px] rounded-[10px] shadow-[0_2px_12px_rgba(59,130,246,0.3)] cursor-pointer tracking-wide mr-1">
            Go
          </button>
        </div>
      </div>

      {/* List Items Grid Space */}
      <div className="mt-4 flex flex-col space-y-0.5 w-full">
        
        {renderRowItem({
          icon: <div className="w-6 h-6 flex items-center justify-center"><Eye className="w-5 h-5 text-[#00E5FF] fill-[#00E5FF]/20" /></div>,
          label: "Viewed me"
        })}

        <div className="h-[1px] bg-[#221C1D] my-1 ml-[52px] mr-4"></div>

        {renderRowItem({
          icon: <div className="w-6 h-6 flex items-center justify-center"><Wallet className="w-5 h-5 text-[#FF9500] fill-[#FF9500]/20" /></div>,
          label: "My wallet",
          onClick: onOpenCoinStore
        })}

        <div className="h-[1px] bg-[#221C1D] my-1 ml-[52px] mr-4"></div>

        {renderRowItem({
          icon: <div className="w-6 h-6 flex items-center justify-center"><Ticket className="w-5 h-5 text-[#FF4281] fill-[#FF4281]/20" transform="rotate(-45)" /></div>,
          label: "Offer Center",
          rightText: "To be activated: 0"
        })}

        <div className="h-[1px] bg-[#221C1D] my-1 ml-[52px] mr-4"></div>

        {renderRowItem({
          icon: <div className="w-6 h-6 flex items-center justify-center"><Award className="w-5 h-5 text-[#FFCC00] fill-[#FFCC00]/20" /></div>,
          label: "VIP",
          rightText: "Not VIP yet"
        })}

        <div className="h-[1px] bg-[#221C1D] my-1 ml-[52px] mr-4"></div>

        {renderRowItem({
          icon: <div className="w-6 h-6 flex items-center justify-center"><Box className="w-5 h-5 text-[#FF9500] fill-[#FF9500]/20" /></div>,
          label: "Mine Investment",
          rightText: "Not Invested"
        })}

        <div className="h-[1px] bg-[#221C1D] my-1 ml-[52px] mr-4"></div>

        {renderRowItem({
          icon: <div className="w-6 h-6 flex items-center justify-center"><Store className="w-5 h-5 text-[#FF4281] fill-[#FF4281]/20" /></div>,
          label: "Shop"
        })}

        <div className="h-[1px] bg-[#221C1D] my-1 ml-[52px] mr-4"></div>

        {renderRowItem({
          icon: <div className="w-6 h-6 flex items-center justify-center"><Share2 className="w-5 h-5 text-[#00E5FF] fill-[#00E5FF]/20" /></div>,
          label: "Invite Friends"
        })}

        <div className="h-[1px] bg-[#221C1D] my-4 ml-4 mr-4"></div>

        {renderRowItem({
          icon: <div className="w-6 h-6 flex items-center justify-center"><HelpCircle className="w-5 h-5 text-[#999999]" /></div>,
          label: "Help"
        })}

        <div className="h-[1px] bg-[#221C1D] my-1 ml-[52px] mr-4"></div>

        {renderRowItem({
          icon: <div className="w-6 h-6 flex items-center justify-center"><Settings className="w-5 h-5 text-[#999999]" /></div>,
          label: "Settings",
          onClick: () => setIsEditing(true)
        })}
        
      </div>
      
    </div>
  );
}
