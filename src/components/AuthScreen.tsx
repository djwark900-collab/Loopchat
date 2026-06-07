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
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../utils/firebase";

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
      const docSnap = await getDoc(userRef);
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
          level: 1,
          xp: 0,
          xpToNextLevel: 100,
          followers: 48,
          following: 12,
          createdAt: new Date().toLocaleDateString(),
        };

        try {
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
    <div id="auth-screen-container" className="flex flex-col items-center justify-center min-h-[85vh] px-4">
      <div id="auth-card" className="w-full max-w-md bg-stone-900/90 border border-stone-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-amber-500/10 blur-[80px] rounded-full"></div>
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-pink-500/10 blur-[80px] rounded-full"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl mb-4 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            Loop<span className="text-amber-400">Chat</span>
          </h2>
          <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-mono">
            Creator Live Stream Portal & Community
          </p>
        </div>

        {errorMsg && (
          <div id="auth-error" className="mb-6 p-4 bg-red-950/50 border border-red-800/40 rounded-xl flex items-start gap-3 text-red-300 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-1">Authentication Issue</span>
              <span className="text-xs text-red-200">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Real Interactive Google Actions */}
        <div className="mb-6 relative z-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-3 bg-white text-stone-900 font-bold text-sm rounded-xl select-none hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.107C18.29 1.91 15.47.96 12.24.96c-6.085 0-11 4.915-11 11s4.915 11 11 11c6.353 0 10.57-4.47 10.57-10.76 0-.72-.08-1.27-.175-1.815H12.24z"
              />
            </svg>
            Continue with Google
          </button>
          
          <div className="flex items-center my-2">
            <div className="flex-1 border-t border-stone-850"></div>
            <span className="px-3 text-[10px] text-stone-500 font-mono uppercase tracking-wider">or email credentials</span>
            <div className="flex-1 border-t border-stone-850"></div>
          </div>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-5 relative z-10">
          {isSignUp && (
            <div className="flex flex-col items-center mb-6">
              <label className="text-stone-300 text-sm font-medium mb-2 font-sans">
                Set Profile Picture
              </label>
              
              <div className="relative group">
                <img
                  src={selectedAvatar}
                  alt="Profile Preview"
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-full border-2 border-amber-500 object-cover bg-stone-800 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-amber-500 hover:bg-amber-400 transition-colors text-stone-950 rounded-full cursor-pointer shadow-lg"
                  aria-label="Upload profile photo"
                >
                  <Camera className="w-4 h-4" />
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
              <div className="w-full mt-4">
                <p className="text-[10px] text-stone-400 font-mono text-center mb-1.5 uppercase tracking-wider">
                  Or select a premium preset avatar
                </p>
                <div className="flex justify-center gap-2 overflow-x-auto py-1">
                  {PRESET_AVATARS.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(preset);
                        setCustomAvatar(null);
                      }}
                      className={`w-10 h-10 rounded-full border overflow-hidden shrink-0 transition-transform hover:scale-110 cursor-pointer ${
                        selectedAvatar === preset && !customAvatar
                          ? "border-amber-400 ring-2 ring-amber-500/20"
                          : "border-stone-700 hover:border-stone-500"
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
                <label className="block text-stone-300 text-xs font-mono uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 text-stone-500" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jack Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-800 rounded-xl text-white text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-300 text-xs font-mono uppercase tracking-wider mb-2">
                  Username (Creator Handle)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 text-sm font-mono font-bold">@</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. jack_streams"
                    value={username.startsWith("@") ? username.slice(1) : username}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                      setUsername(`@${value}`);
                    }}
                    className="w-full pl-8 pr-4 py-3 bg-stone-950/60 border border-stone-800 rounded-xl text-white text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1 font-mono">
                  Only letters, numbers, and underscores allowed.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-stone-300 text-xs font-mono uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 text-stone-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-800 rounded-xl text-white text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-300 text-xs font-mono uppercase tracking-wider mb-2 font-sans">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 text-stone-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-950/60 border border-stone-800 rounded-xl text-white text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold rounded-xl shadow-lg shadow-amber-500/15 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer transform hover:translate-y-[-1px] active:translate-y-0 text-sm mt-2 font-sans disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <span className="border-2 border-stone-950 border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
            ) : isSignUp ? (
              "Create Creator Account"
            ) : (
              "Access Live Suite"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-800/60 text-center relative z-10">
          <p className="text-sm text-stone-400 font-sans">
            {isSignUp ? "Already registered on LoopChat?" : "New to the streaming loop?"}{" "}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
              }}
              className="text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSignUp ? "Sign In Now" : "Sign Up and Create ID"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
