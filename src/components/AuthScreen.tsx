/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { User } from "../types";
import { Sparkles, User as UserIcon, Mail, Lock, Camera, Upload, AlertCircle } from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from "firebase/auth";
import { doc, getDoc, setDoc, getDocFromServer } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType, firestoreStatus } from "../lib/firebase";

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

const PRESET_AVATARS = [
  "https://picsum.photos/seed/neo/150/150",
  "https://picsum.photos/seed/cyber/150/150",
  "https://picsum.photos/seed/clara/150/150",
  "https://picsum.photos/seed/stream/150/150",
  "https://picsum.photos/seed/gamer/150/150",
  "https://picsum.photos/seed/cozy/150/150",
];

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        setErrorMsg("Profile image must be smaller than 1.5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCustomAvatar(reader.result);
          setSelectedAvatar(reader.result);
          setErrorMsg("");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchOrCreateUserProfile = async (
    firebaseUser: any, 
    isInitialSignUp: boolean, 
    details?: { username?: string; fullName?: string; avatarUrl?: string }
  ) => {
    const userRef = doc(db, "users", firebaseUser.uid);
    try {
      const docSnap = await getDocFromServer(userRef);
      if (docSnap.exists()) {
        return docSnap.data() as User;
      } else {
        const emailVal = firebaseUser.email || "";
        const defaultUsername = details?.username || `@${emailVal.split("@")[0].toLowerCase().replace(/[^a-zA-Z0-9_]/g, "")}` || `@user_${Math.floor(1000 + Math.random() * 9000)}`;
        const defaultFullName = details?.fullName || firebaseUser.displayName || emailVal.split("@")[0].replace(/[^a-zA-Z]/g, " ") || "Anonymous Creator";
        const defaultAvatar = details?.avatarUrl || firebaseUser.photoURL || PRESET_AVATARS[0];

        const newUser: User = {
          id: firebaseUser.uid,
          username: defaultUsername,
          fullName: defaultFullName,
          email: emailVal,
          avatarUrl: defaultAvatar,
          bio: "An aspiring LoopChat creator! Tap edit to change this bio. 🎥💖",
          coins: 800, // Initial coin gift
          diamonds: 150, // Starter diamonds balance
          level: 1,
          xp: 0,
          xpToNextLevel: 100,
          followers: 48,
          following: 12,
          createdAt: new Date().toLocaleDateString(),
        };

        try {
          if (firestoreStatus.isQuotaExceeded) {
             console.warn("Quota exceeded: skipping initial user doc creation, returning local object.");
             return newUser;
          }
          await setDoc(userRef, newUser);
          return newUser;
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (!email || !password) {
      setErrorMsg("Please fill in email and password.");
      setLoading(false);
      return;
    }

    if (isSignUp) {
      if (!username || !fullName) {
        setErrorMsg("Please fill in username and full name.");
        setLoading(false);
        return;
      }
      if (!username.startsWith("@")) {
        setErrorMsg("Username must start with @ (e.g., @jane_creator)");
        setLoading(false);
        return;
      }
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const profile = await fetchOrCreateUserProfile(userCredential.user, true, {
          username: username.trim(),
          fullName: fullName.trim(),
          avatarUrl: selectedAvatar,
        });
        if (profile) {
          localStorage.setItem("loopchat_current_user", JSON.stringify(profile));
          onAuthSuccess(profile);
        }
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const profile = await fetchOrCreateUserProfile(userCredential.user, false);
        if (profile) {
          localStorage.setItem("loopchat_current_user", JSON.stringify(profile));
          onAuthSuccess(profile);
        }
      }
    } catch (err: any) {
      console.error("Auth submit error:", err);
      if (err.code === "auth/email-already-in-use") {
        setErrorMsg("This email address is already in use by another account.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("Password should be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setErrorMsg("Please enter a valid email address.");
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setErrorMsg("Invalid email or password credential check. Please try again.");
      } else {
        setErrorMsg(err.message || "An error occurred during authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const profile = await fetchOrCreateUserProfile(result.user, false);
      if (profile) {
        localStorage.setItem("loopchat_current_user", JSON.stringify(profile));
        onAuthSuccess(profile);
      }
    } catch (err: any) {
      console.error("Google auth error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setErrorMsg("Sign-in popup was closed before completing.");
      } else {
        setErrorMsg(err.message || "An error occurred during Google sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="flex flex-col items-center justify-center min-h-[90vh] px-4 py-8 bg-gradient-to-tr from-[#E6E4FA] via-[#F3F1FD] to-[#FCFAFF]">
      <div id="auth-card" className="w-full max-w-[400px] bg-white border border-[#E9E8EE] rounded-[36px] px-8 py-10 shadow-[0_20px_50px_rgba(102,102,153,0.08)] relative overflow-hidden text-stone-800">
        
        {/* Centered Premium Avatar Silhouette with Linear Gradient Rim */}
        <div className="flex justify-center mb-5 relative z-10">
          <div className="w-[102px] h-[102px] rounded-full p-[3px] bg-gradient-to-tr from-[#FB52FF] via-[#B849FF] to-[#3B66FF] flex items-center justify-center shadow-lg">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
              {isSignUp ? (
                <img
                  src={selectedAvatar}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-9 h-9 text-purple-400" />
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Title */}
        <div className="text-center mb-6 relative z-10">
          <h2 className="text-[30px] font-black tracking-tight text-[#1E1535] font-sans leading-tight">
            {isSignUp ? "Sign Up" : "Login"}
          </h2>
          <p className="text-[10px] text-[#A19CAB] font-semibold mt-1 uppercase tracking-widest font-mono">
            LoopChat Creator Portal
          </p>
        </div>

        {errorMsg && (
          <div id="auth-error" className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-[#E11D48] text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E11D48] mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block text-stone-800 mb-0.5">Authentication Issue</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4.5 relative z-10">
          {isSignUp && (
            <div className="flex flex-col items-center mb-4 pt-1 pb-2">
              <div className="flex items-center gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-[#FAF9FC] hover:bg-[#F3F1FD] border border-[#E9E8EE] text-[#5C5CFC] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Custom Picture
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              {/* Presets selection */}
              <div className="w-full">
                <p className="text-[9px] text-[#8C889E] font-bold text-center mb-1.5 uppercase tracking-wide">
                  Or select a premium preset avatar
                </p>
                <div className="flex justify-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  {PRESET_AVATARS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(preset);
                        setCustomAvatar(null);
                      }}
                      className={`w-9 h-9 rounded-full border overflow-hidden shrink-0 transition-transform hover:scale-110 cursor-pointer ${
                        selectedAvatar === preset && !customAvatar
                          ? "border-[#5C5CFC] ring-2 ring-[#5C5CFC]/20"
                          : "border-[#E9E8EE] hover:border-[#BFBAC9]"
                      }`}
                    >
                      <img
                        src={preset}
                        alt={`Preset ${i}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#554F73] mb-1.5 font-sans">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 text-[#A19CAB]" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-[#FAF9FC] border border-[#E9E8EE] focus:border-[#5C5CFC] rounded-2xl text-stone-900 text-sm placeholder-[#BFBAC9] focus:outline-none focus:ring-1 focus:ring-[#5C5CFC]/30 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#554F73] mb-1.5 font-sans">
                  Username (Creator Handle)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5C5CFC] text-sm font-black">@</span>
                  <input
                    type="text"
                    required
                    placeholder="username"
                    value={username.startsWith("@") ? username.slice(1) : username}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                      setUsername(`@${value}`);
                    }}
                    className="w-full pl-8 pr-4 py-3.5 bg-[#FAF9FC] border border-[#E9E8EE] focus:border-[#5C5CFC] rounded-2xl text-stone-950 text-sm placeholder-[#BFBAC9] focus:outline-none focus:ring-1 focus:ring-[#5C5CFC]/30 transition-all font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-[#554F73] font-sans">
                Email
              </label>
              {!isSignUp && (
                <button 
                  type="button" 
                  onClick={() => alert("Please proceed to register of a new creator handle, which offers streamlined sandbox log in keys.")}
                  className="text-xs text-[#5C5CFC] hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A19CAB]" />
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-[#FAF9FC] border border-[#E9E8EE] focus:border-[#5C5CFC] rounded-2xl text-stone-900 text-sm placeholder-[#BFBAC9] focus:outline-none focus:ring-1 focus:ring-[#5C5CFC]/30 transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#554F73] mb-1.5 font-sans">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A19CAB]" />
              <input
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-[#FAF9FC] border border-[#E9E8EE] focus:border-[#5C5CFC] rounded-2xl text-stone-900 text-sm placeholder-[#BFBAC9] focus:outline-none focus:ring-1 focus:ring-[#5C5CFC]/30 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#9B49FF] to-[#4859F5] text-white font-black rounded-3xl shadow-lg shadow-indigo-500/10 hover:opacity-[0.98] active:scale-[0.98] transition-all cursor-pointer font-sans text-sm mt-5 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <div className="flex items-center my-6 relative z-10">
          <div className="flex-1 border-t border-[#ECEBF1]"></div>
          <span className="px-3.5 text-xs text-[#9591A5] font-sans">or continue with</span>
          <div className="flex-1 border-t border-[#ECEBF1]"></div>
        </div>

        {/* Google & Facebook circle buttons */}
        <div className="flex justify-center gap-4 relative z-10">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-14 h-14 rounded-full bg-white border border-[#ECEBF1] shadow-sm flex items-center justify-center hover:bg-[#FAF9FC] active:scale-95 transition-all cursor-pointer"
            title="Google Account"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.29 1.91 15.47.96 12.24.96c-6.085 0-11 4.915-11 11s4.915 11 11 11c6.353 0 10.57-4.47 10.57-10.76 0-.72-.08-1.27-.175-1.815H12.24z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-14 h-14 rounded-full bg-white border border-[#ECEBF1] shadow-sm flex items-center justify-center hover:bg-[#FAF9FC] active:scale-95 transition-all cursor-pointer text-[#3b5998]"
            title="Facebook Account"
          >
            <svg className="w-5 .5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
            </svg>
          </button>
        </div>

        {/* bottom switcher */}
        <div className="mt-8 text-center relative z-10">
          <p className="text-sm text-[#706B89] font-sans">
            {isSignUp ? "Already registered yet?" : "Not registered yet?"}{" "}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
              }}
              className="text-[#5C5CFC] hover:underline font-black transition-colors cursor-pointer"
            >
              {isSignUp ? "Sign In Now" : "Sign Up"} &gt;
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
