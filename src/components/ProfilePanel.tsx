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
  ChevronDown,
  Camera
} from "lucide-react";
import { db, handleFirestoreError, OperationType, firestoreStatus } from "../lib/firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";

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

              {/* Identification Code input box (Read-only status code block) */}
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

  return (
    <div id="profile-management-panel" className="max-w-7xl mx-auto px-4 py-4 font-sans text-stone-100 space-y-6">
      
      {/* Dynamic Alerts Banner */}
      {errorMsg && (
        <div id="alert-error-banner" className="p-4 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-xl animate-scaleUp">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div id="alert-success-banner" className="p-4 bg-green-950/50 border border-green-800 text-green-300 text-xs rounded-xl animate-scaleUp">
          {successMsg}
        </div>
      )}

      {/* Main Grid: Gorgeous Full-Screen Profiling Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ================= ROW 1: MAJESTIC FULL-WIDTH HEADER COVERS BANNER (COL 12) ================= */}
        <div id="full-profile-banner" className="lg:col-span-12 bg-[#FAF9FC] text-[#1E192B] rounded-3xl overflow-hidden shadow-xl border border-stone-200/85">
          
          {/* Cover Photo / Header Banner Backdrop */}
          <div className="h-44 sm:h-56 bg-gradient-to-r from-[#9F5FFE] via-[#7B3FFE] to-[#C884FE] relative overflow-hidden select-none">
            {/* Elegant high-end background graphics vectors */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full border border-white/5 translate-x-1/4 -translate-y-1/4 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-120 h-120 bg-white/5 rounded-full border border-white/5 translate-x-1/5 -translate-y-1/5 pointer-events-none animate-spin-slow"></div>
            
            {/* Header Banner Content Overlays: Level Badge and XP info */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="px-2 py-0.5 bg-white/20 border border-white/30 text-white backdrop-blur-md text-[8px] sm:text-[10px] font-bold uppercase tracking-wider rounded-lg font-mono">
                LV {currentUser.level || 1}
              </span>
              <span className="px-2 py-0.5 bg-amber-500 text-stone-950 text-[8px] sm:text-[10px] font-black uppercase tracking-wider rounded-lg font-mono shadow-sm">
                XP {currentUser.xp || 0} / {currentUser.xpToNextLevel || 100}
              </span>
            </div>
          </div>

          {/* Profile Info Overlay Row */}
          <div className="px-6 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-14 sm:-mt-16">
            
            {/* Left: Avatar + Identity details side-by-side */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              {/* Glowing Premium framed avatar container */}
              <div className="relative shrink-0 select-none group">
                {/* Circle base with active frame class decoration */}
                <div className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center p-0.5 relative transition-all duration-300 ${activeFrame.frameStyleClass}`}>
                  <img
                    src={avatarUrl}
                    alt="User Avatar"
                    referrerPolicy="no-referrer"
                    className="w-[112px] h-[112px] sm:w-[126px] sm:h-[126px] rounded-full object-cover bg-stone-100"
                  />
                </div>

                {/* Camera icon uploader overlay bottom-right */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 p-2 bg-white text-[#9F5FFE] border-2 border-[#FAF9FC] shadow-md rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer"
                  title="Upload photo"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
                    <path fillRule="evenodd" d="M9.344 3.071a2.25 2.25 0 0 1 2.247-2.126h3c1.07 0 1.996.75 2.247 1.83l.23 1.05a2.25 2.25 0 0 0 1.139 1.488l3.111 1.556a3 3 0 0 1 1.683 2.683v8.7a3 3 0 0 1-3 3H3h.001c-1.657 0-3-1.343-3-3v-8.7A3 3 0 0 1 1.684 6.12l3.111-1.556a2.25 2.25 0 0 0 1.14-1.488l.23-1.05v-.012ZM12 7.5a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* User details text labels */}
              <div className="space-y-2 pb-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 items-center">
                  <h3 className="text-2xl sm:text-3xl font-black text-stone-900 font-sans tracking-tight leading-tight">
                    {fullName}
                  </h3>
                  {/* BEAUTIFUL COMPACT CIRCULAR PENCIL EDIT ICON OR TRIGGER */}
                  <button
                    id="edit-profile-icon-btn"
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 bg-purple-100 hover:bg-purple-200 text-[#7B3FFE] rounded-full transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer ml-1 inline-flex items-center justify-center shadow-sm"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  
                  {/* Flags and Gender pills removed as requested */}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 text-stone-600">
                  <p className="text-sm text-[#828291] font-semibold tracking-wide font-sans leading-none">
                    {username.startsWith("@") ? username : `@${username}`}
                  </p>
                  <span className="hidden sm:inline text-stone-300">|</span>
                  <div className="flex items-center gap-1 text-[#828291] font-sans text-xs font-semibold">
                    <span>Unique ID: {displayId}</span>
                    <button
                      onClick={handleCopyId}
                      className="p-1 hover:bg-stone-200/55 rounded-md transition-colors"
                      title="Copy Unique Id"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-[#A4A3B1]" />}
                    </button>
                  </div>
                </div>

                {bio && (
                  <p className="max-w-xl text-stone-700 text-xs sm:text-sm font-medium leading-relaxed italic mx-auto sm:mx-0">
                    "{bio}"
                  </p>
                )}
              </div>
            </div>

            {/* Right: Toggle configuration customizer panel button */}
            <div className="flex justify-center md:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 sm:p-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1E192B] transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs font-extrabold shadow-sm border border-stone-200"
              >
                <Settings className="w-4 h-4 text-[#7B3FFE]" />
                {isEditing ? "Hide Advanced Settings" : "Configure Custom Stats"}
              </button>
            </div>

          </div>

        </div>

        {/* ================= COLUMN 1: ANALYTICS + COIN DOCK + CONTENT SUBTABS (COL 6) ================= */}
        <div id="col-profile-main" className="lg:col-span-6 space-y-6">
          
          {/* WALLET BALANCES GRID (LoopCoins & Diamonds) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* AVAILABLE COIN PURPLE WALLET CARD */}
            <div 
              id="wallet-coin-gradient-card"
              className="bg-gradient-to-tr from-[#9146FF] to-[#713FFD] p-3.5 sm:p-4 rounded-xl text-white relative overflow-hidden shadow-md flex items-center justify-between"
            >
              {/* Fine design concentric loop background patterns */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full border border-white/5 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
              
              {/* Left layout with Coin metadata and triggers */}
              <div className="space-y-1.5 z-10">
                <span className="text-[9px] font-sans font-extrabold text-white/90 uppercase tracking-wider block leading-none">
                  Available LoopCoins
                </span>
                
                <span className="text-lg font-black font-sans tracking-tight block leading-none">
                  {currentUser.coins.toLocaleString()}
                </span>

                <button
                  type="button"
                  onClick={onOpenCoinStore}
                  className="px-2.5 py-1 bg-white text-[#9146FF] hover:bg-stone-50 font-black text-[8px] uppercase rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer"
                >
                  Buy Coins <span className="text-[8px] font-light font-mono">»</span>
                </button>
              </div>

              {/* Right side stellar star coin graphics */}
              <div className="relative shrink-0 z-10 pr-0.5">
                {/* Concentric rotating glowing ring */}
                <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center p-1">
                  <div className="w-full h-full bg-[#FFBC13]/25 rounded-full flex items-center justify-center p-0.5">
                    <div className="w-full h-full bg-[#FFA300] rounded-full border border-white flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5 text-amber-100" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AVAILABLE DIAMONDS CYAN WALLET CARD */}
            <div 
              id="wallet-diamonds-gradient-card"
              className="bg-gradient-to-tr from-[#00A5FF] to-[#0070FF] p-3.5 sm:p-4 rounded-xl text-white relative overflow-hidden shadow-md flex items-center justify-between"
            >
              {/* Fine design concentric loop background patterns */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full border border-white/5 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
              
              {/* Left layout with Diamonds metadata */}
              <div className="space-y-1.5 z-10">
                <span className="text-[9px] font-sans font-extrabold text-white/90 uppercase tracking-wider block leading-none">
                  My Diamonds
                </span>
                
                <span className="text-lg font-black font-sans tracking-tight block leading-none font-mono">
                  {(currentUser.diamonds || 0).toLocaleString()}
                </span>

                <span className="inline-block text-[8px] font-extrabold bg-black/25 text-cyan-200 border border-cyan-400/25 px-1.5 py-0.5 rounded-lg leading-none">
                  ⚡ Livestream Tips
                </span>
              </div>

              {/* Right side stellar anim diamond */}
              <div className="relative shrink-0 z-10 pr-0.5">
                <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center p-1">
                  <div className="w-full h-full bg-cyan-400/25 rounded-full flex items-center justify-center text-center leading-none text-xs select-none animate-pulse">
                    💎
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* DYNAMIC CONTENT SUBTABS (Reels, Feeds, Collections) */}
          <div className="bg-[#FAF9FC] text-[#1E192B] rounded-2xl p-6 shadow-md border border-stone-200/85 space-y-5">
            
            <div id="reels-tabs-nav" className="flex items-center justify-around border-b border-stone-200/60 font-sans select-none">
              
              <button
                type="button"
                onClick={() => setActiveSubTab("reels")}
                className={`pb-3 text-xs font-black uppercase tracking-wider relative transition-all ${
                  activeSubTab === "reels" ? "text-[#7B3FFE]" : "text-[#A4A3B1] hover:text-[#5F5A73]"
                }`}
              >
                Reels
                {activeSubTab === "reels" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7B3FFE] rounded-full animate-scaleUp"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab("feeds")}
                className={`pb-3 text-xs font-black uppercase tracking-wider relative transition-all ${
                  activeSubTab === "feeds" ? "text-[#7B3FFE]" : "text-[#A4A3B1] hover:text-[#5F5A73]"
                }`}
              >
                Feeds
                {activeSubTab === "feeds" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7B3FFE] rounded-full animate-scaleUp"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab("collections")}
                className={`pb-3 text-xs font-black uppercase tracking-wider relative transition-all ${
                  activeSubTab === "collections" ? "text-[#7B3FFE]" : "text-[#A4A3B1] hover:text-[#5F5A73]"
                }`}
              >
                Collections
                {activeSubTab === "collections" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7B3FFE] rounded-full animate-scaleUp"></span>
                )}
              </button>

            </div>

            {/* Custom Tab Content Windows */}
            <div className="py-3 text-center flex flex-col justify-center items-center space-y-4 w-full">
              
              {activeSubTab === "reels" ? (
                reelsList.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {reelsList.map((reel) => (
                      <div key={reel.id} className="aspect-[9/16] bg-stone-100 rounded-2xl flex flex-col justify-end p-4 relative overflow-hidden group shadow-md border border-stone-200/50">
                        {/* Simulated background color/pattern with seed */}
                        <div className="absolute inset-0 bg-stone-900 object-cover" style={{ backgroundImage: `url(${reel.bg})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"></div>
                        
                        {/* Elite Trash Button in top right */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReel(reel.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 border border-stone-850 hover:bg-red-600 hover:border-transparent text-stone-200 hover:text-white transition-all duration-250 cursor-pointer z-20"
                          title="Delete highlight reel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="relative text-left text-white z-10 leading-tight space-y-1">
                          <span className="px-2 py-0.5 bg-[#9F5FFE] text-white text-[8px] font-black uppercase tracking-wider rounded-md">
                            {reel.tag}
                          </span>
                          <h5 className="font-extrabold text-xs truncate">{reel.title}</h5>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-stone-450 text-xs font-medium">
                     🎬 No active Reels remaining.
                  </div>
                )
              ) : activeSubTab === "feeds" ? (
                feedsList.length > 0 ? (
                  <div className="space-y-4 w-full">
                    {feedsList.map((feed) => (
                      <div key={feed.id} className="p-5 bg-white rounded-2xl border border-stone-200/60 shadow-sm text-left leading-normal space-y-3 relative">
                        
                        {/* Elite Trash Button in top right */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFeed(feed.id)}
                          className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-50 border border-stone-200/80 hover:bg-red-500 hover:border-transparent text-stone-400 hover:text-white transition-all cursor-pointer z-10"
                          title="Delete feed post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-2.5">
                          <img src={avatarUrl} alt="Creator Icon" className="w-8 h-8 rounded-full object-cover border border-stone-200" />
                          <div>
                            <span className="text-xs font-black text-stone-800 block leading-none">{fullName}</span>
                            <span className="text-[10px] text-stone-400 mt-1 block">{feed.time}</span>
                          </div>
                        </div>
                        <p className="text-xs text-stone-600 font-medium font-sans pr-8">
                          {feed.content}
                        </p>
                        <div className="flex gap-4 pt-2 text-stone-400 text-[10px] font-black uppercase tracking-wider border-t border-stone-100">
                          <span className="text-[#7B3FFE] font-extrabold">{feed.likes}</span>
                          <span>{feed.comments}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-stone-450 text-xs font-medium">
                     📰 No active feed updates remaining.
                  </div>
                )
              ) : (
                collectionsList.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 w-full">
                    {collectionsList.map((col) => (
                      <div key={col.id} className="p-4 bg-white rounded-2xl border border-stone-200/60 shadow-sm text-left flex items-center justify-between gap-3 relative">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 bg-[#FAF9FC] rounded-xl border border-stone-100 shrink-0">
                            {col.icon}
                          </span>
                          <div className="leading-tight">
                            <h5 className="font-extrabold text-xs text-stone-850">{col.name}</h5>
                            <p className="text-[10px] text-stone-400 mt-1 font-sans">{col.description}</p>
                          </div>
                        </div>

                        {/* Delete Collection Item Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCollection(col.id)}
                          className="p-1.5 rounded-lg bg-stone-50 border border-stone-200 hover:bg-red-500 hover:border-transparent text-stone-400 hover:text-white transition-all cursor-pointer shrink-0"
                          title="Delete collection reward item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center flex flex-col justify-center items-center space-y-3">
                    {/* High-fidelity Vector magnifying glass representation */}
                    <svg className="w-24 h-24 text-[#E2E1EC]" viewBox="0 0 120 120" fill="none">
                      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-40" />
                      <circle cx="85" cy="25" r="8" stroke="currentColor" strokeWidth="1.5" className="opacity-35" />
                      <rect x="35" y="30" width="50" height="60" rx="6" fill="#F1F0F7" stroke="#D1D0DE" strokeWidth="2" />
                      <line x1="45" y1="42" x2="75" y2="42" stroke="#D1D0DE" strokeWidth="2" strokeLinecap="round" />
                      <line x1="45" y1="54" x2="65" y2="54" stroke="#D1D0DE" strokeWidth="2" strokeLinecap="round" />
                      <line x1="45" y1="66" x2="75" y2="66" stroke="#D1D0DE" strokeWidth="2" strokeLinecap="round" />
                      <g className="filter drop-shadow-[0_4px_8px_rgba(159,156,180,0.25)]">
                        <circle cx="65" cy="65" r="18" fill="white" stroke="#9F5FFE" strokeWidth="2.5" />
                        <path d="M59 59L71 71M71 59L59 71" stroke="#9F5FFE" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M78 78L92 92" stroke="#B0AED2" strokeWidth="4.5" strokeLinecap="round" />
                      </g>
                    </svg>
                    <div>
                      <h5 className="text-[#a5a4b5] text-xs font-extrabold uppercase tracking-widest">
                        Empty Collections Wallet
                      </h5>
                      <p className="text-[10px] text-stone-400 max-w-xs mx-auto mt-1 font-sans">
                        No custom directories found! Try publishing stream feeds or completing creator quests.
                      </p>
                    </div>
                  </div>
                )
              )}

            </div>

          </div>

        </div>

        {/* ================= COLUMN 2: CUSTOM BOUTIQUE & METADATA CONTROLLERS (COL 6) ================= */}
        <div id="col-customizer-dashboard" className="lg:col-span-6 space-y-6">
          
          {/* CARD 1: AVATAR FRAME SHOP ("profile add frame" BOUTIQUE) */}
          <div id="avatar-frame-boutique" className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-stone-800/85 pb-3">
              <h4 className="text-md font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C084FC]" />
                Profile Avatar Frame Boutique
              </h4>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 font-mono font-bold px-2.5 py-1 border border-amber-500/25 rounded-md">
                Spend Coins
              </span>
            </div>

            <p className="text-xs text-stone-400">
              Customize your profile! Spend your LoopCoins to claim visual luxury. Your equipped frame updates dynamically in the simulated client preview instantly!
            </p>

            {/* List of frames layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVATAR_FRAMES.map((frm) => {
                const isOwned = unlockedFrames.includes(frm.id);
                const isActive = activeFrameId === frm.id;

                return (
                  <div 
                    key={frm.id}
                    id={`frame-item-${frm.id}`}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isActive 
                        ? "bg-[#C084FC]/5 border-[#C084FC] shadow-inner" 
                        : isOwned 
                          ? "bg-stone-950/40 border-stone-800 hover:border-stone-700" 
                          : "bg-stone-950/70 border-stone-850 opacity-90 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      
                      {/* Mini preview with user's current picture inside this specific frame */}
                      <div className="relative shrink-0 select-none">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center p-0.5 relative ${frm.frameStyleClass}`}>
                          <img
                            src={avatarUrl}
                            alt="Mini frame preview"
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-full object-cover bg-stone-100"
                          />
                        </div>
                      </div>

                      <div className="space-y-0.5 leading-tight">
                        <h5 className="text-sm font-bold text-white flex items-center gap-1">
                          <span>{frm.emoji}</span> {frm.name}
                        </h5>
                        <p className="text-[11px] text-stone-400">
                          {frm.description}
                        </p>
                      </div>

                    </div>

                    <div className="pt-3.5 flex items-center justify-between border-t border-stone-850 mt-3">
                      <div>
                        {frm.cost === 0 ? (
                          <span className="text-[10px] text-stone-500 font-mono uppercase tracking-widest font-bold">Default Option</span>
                        ) : (
                          <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5" /> {frm.cost.toLocaleString()} Coins
                          </span>
                        )}
                      </div>

                      {/* Equip or Purchase Buttons */}
                      <div>
                        {isActive ? (
                          <span className="px-3 py-1 bg-green-500/15 border border-green-500/35 text-green-400 text-[10px] font-mono font-bold uppercase rounded-lg flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Equipped
                          </span>
                        ) : isOwned ? (
                          <button
                            type="button"
                            onClick={() => handleEquipFrame(frm.id)}
                            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            Equip Frame
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePurchaseFrame(frm)}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black rounded-lg transition-all active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
                          >
                            Buy Frame
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* CARD 3: ADMIN CRYPTOGRAPHIC SECURED GATE CONSOLE */}
          <div id="admin-studio-segment" className="bg-stone-900 border border-stone-800/80 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-850 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Lock className={`w-4 h-4 ${isAdminUnlocked ? "text-green-400" : "text-amber-500 animate-pulse"}`} />
                <h4 className="text-sm font-sans font-bold text-stone-300">Admin Control Gate Console</h4>
              </div>

              {!isAdminUnlocked ? (
                <button
                  type="button"
                  onClick={() => setShowAdminGate(!showAdminGate)}
                  className="px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-400 hover:text-white transition-all cursor-pointer font-bold"
                >
                  {showAdminGate ? "Close Verification" : "Enter Password"}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-green-400 font-mono uppercase bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-xl">
                  <Unlock className="w-3.5 h-3.5" /> ACCESS AUTHORIZED
                </div>
              )}
            </div>

            {/* Password Gate authentication */}
            {showAdminGate && !isAdminUnlocked && (
              <form onSubmit={handleAdminVerify} className="max-w-md bg-stone-950 p-4 border border-stone-850 rounded-xl space-y-4 mb-4 animate-scaleUp">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] text-stone-400 font-mono uppercase tracking-wider">
                      Secure Admin Access Password
                    </label>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Enter password..."
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                {adminError && (
                  <p className="text-xs text-red-400 font-mono">{adminError}</p>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Verify Credentials
                </button>
              </form>
            )}

            {/* Authorized Developer features */}
            {isAdminUnlocked && (
              <div className="space-y-6 animate-scaleUp">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Mint LoopCoins Area */}
                  <div className="p-4 bg-[#0a0a0a]/50 border border-stone-850 rounded-xl space-y-4 flex flex-col justify-between">
                    <div>
                      <h5 className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1">
                        <Coins className="w-4 h-4" /> MINT LoopCoins
                      </h5>
                      <p className="text-[10px] text-stone-500 mt-1">
                        Instantly grant or delete LoopCoins from your wallet with custom values. Use these to unlock luxury luxury frames!
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100000}
                        value={customCoinsInput}
                        onChange={(e) => setCustomCoinsInput(Math.max(1, Number(e.target.value)))}
                        className="w-24 px-3 py-1.5 bg-stone-950 border border-stone-850 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleAdminAddCoins}
                        className="flex-1 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> Instant Coins
                      </button>
                    </div>

                    {/* Quick modify sets */}
                    <div className="space-y-2 pt-3 border-t border-stone-800">
                      <div>
                        <span className="block text-[9px] font-mono uppercase text-stone-500 mb-1 font-bold">Quick add options</span>
                        <div className="grid grid-cols-4 gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdminModifyCoins(200)}
                            className="py-1 px-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded text-[10px] font-mono text-center transition-all cursor-pointer"
                          >
                            +200
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdminModifyCoins(600)}
                            className="py-1 px-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded text-[10px] font-mono text-center transition-all cursor-pointer"
                          >
                            +600
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdminModifyCoins(1500)}
                            className="py-1 px-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded text-[10px] font-mono text-center transition-all cursor-pointer"
                          >
                            +1.5K
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdminModifyCoins(5000)}
                            className="py-1 px-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded text-[10px] font-mono text-center transition-all cursor-pointer"
                          >
                            +5K
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[9px] font-mono uppercase text-stone-500 mb-1 font-bold">Quick delete options</span>
                        <div className="grid grid-cols-4 gap-1">
                          <button
                            type="button"
                            disabled={currentUser.coins < 200}
                            onClick={() => handleAdminModifyCoins(-200)}
                            className="py-1 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-20 text-rose-400 border border-rose-500/25 rounded text-[10px] font-mono text-center transition-all cursor-pointer"
                          >
                            -200
                          </button>
                          <button
                            type="button"
                            disabled={currentUser.coins < 600}
                            onClick={() => handleAdminModifyCoins(-600)}
                            className="py-1 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-20 text-rose-400 border border-rose-500/25 rounded text-[10px] font-mono text-center transition-all cursor-pointer"
                          >
                            -600
                          </button>
                          <button
                            type="button"
                            disabled={currentUser.coins < 1500}
                            onClick={() => handleAdminModifyCoins(-1500)}
                            className="py-1 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-20 text-rose-400 border border-rose-500/25 rounded text-[10px] font-mono text-center transition-all cursor-pointer"
                          >
                            -1.5K
                          </button>
                          <button
                            type="button"
                            disabled={currentUser.coins < 5000}
                            onClick={() => handleAdminModifyCoins(-5000)}
                            className="py-1 px-1.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-20 text-rose-400 border border-rose-500/25 rounded text-[10px] font-mono text-center transition-all cursor-pointer"
                          >
                            -5K
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Creator Code Generator */}
                  <form onSubmit={handleCreateCoinCode} className="p-4 bg-[#0a0a0a]/50 border border-stone-850 rounded-xl space-y-3">
                    <h5 className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                      <Ticket className="w-4 h-4" /> CREATOR CODE COUPON MAKER
                    </h5>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[8px] font-mono text-stone-500 uppercase mb-1">Code Name</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="E.G. GEMINI"
                            value={newCodeName}
                            onChange={(e) => setNewCodeName(e.target.value.toUpperCase())}
                            className="flex-1 px-2.5 py-1 bg-stone-950 border border-stone-850 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500 uppercase font-bold"
                          />
                          <button
                            type="button"
                            onClick={generateRandomCode}
                            className="px-2 py-1 bg-stone-900 border border-stone-800 text-[9px] font-bold text-stone-300 rounded hover:text-white"
                          >
                            Random
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] font-mono text-stone-500 uppercase mb-1">Coins Included</label>
                        <select
                          value={newCodeCoins}
                          onChange={(e) => setNewCodeCoins(Number(e.target.value))}
                          className="w-full px-2 py-1 bg-stone-950 border border-stone-850 rounded text-stone-300 font-mono text-xs focus:outline-none"
                        >
                          <option value={500}>500 Coins</option>
                          <option value={1000}>1,000 Coins</option>
                          <option value={5000}>5,000 Coins</option>
                          <option value={10000}>10,000 Coins</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAddingCode}
                      className="w-full py-1.5 bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-stone-300 hover:text-white rounded text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> 
                      {isAddingCode ? "Deploying..." : "Publish Code"}
                    </button>
                  </form>

                </div>

                {/* Sub-item: Active codes list table */}
                <div className="space-y-3 pt-2">
                  <h6 className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                    Published Promo Coupons List ({activeCodes.length})
                  </h6>

                  {activeCodes.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-stone-850 text-center text-xs text-stone-500 font-mono">
                      No active coupon promotional codes are pending.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                      {activeCodes.map((c) => (
                        <div 
                          key={c.id} 
                          className="p-3.5 bg-stone-950 border border-stone-850/80 rounded-xl flex items-start justify-between gap-4 font-mono text-[11px]"
                        >
                          <div>
                            <div className="text-white font-extrabold select-all uppercase tracking-wider">{c.code}</div>
                            <div className="text-amber-400 font-bold font-sans text-xs mt-0.5">{c.coins.toLocaleString()} Coins</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoinCode(c.id)}
                            className="p-1 hover:bg-stone-900 text-stone-500 hover:text-red-400 rounded-md transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
