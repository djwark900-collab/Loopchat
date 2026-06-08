/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { CoinPackage } from "../types";
import { COIN_PACKAGES } from "../utils/mockData";
import { X, Sparkles, Shield, CreditCard, CheckCircle, Coins, Ticket } from "lucide-react";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType, isFirestoreQuotaExceeded } from "../lib/firebase";

interface CoinsModalProps {
  onClose: () => void;
  onCoinsPurchased: (amount: number) => void;
}

export default function CoinsModal({ onClose, onCoinsPurchased }: CoinsModalProps) {
  const [selectedPack, setSelectedPack] = useState<CoinPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [payError, setPayError] = useState("");
  
  // Payment card info inputs
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  // Coupon / Creator code redemption state
  const [enteredCode, setEnteredCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredCode.trim()) return;
    setRedeemError("");
    setRedeemSuccess("");
    setIsRedeeming(true);

    const codeId = enteredCode.trim().toUpperCase();
    if (isFirestoreQuotaExceeded) {
       setRedeemError("Daily server limit reached! Please try again tomorrow.");
       setIsRedeeming(false);
       return;
    }

    try {
      // 1. Fetch the code document
      const codeRef = doc(db, "coin_codes", codeId);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        setRedeemError("Error: Invalid code, or it has already been redeemed.");
        setIsRedeeming(false);
        return;
      }

      const codeData = codeSnap.data();
      const coinsCount = Number(codeData.coins) || 0;

      // 2. Perform a robust Firestore Batch to safely update user coins and delete the single-use code
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setRedeemError("Error: You must be logged in to redeem a code.");
        setIsRedeeming(false);
        return;
      }

      // Fetch latest user document to be consistent
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setRedeemError("Error: User profile not found.");
        setIsRedeeming(false);
        return;
      }

      const currentCoins = Number(userSnap.data().coins) || 0;
      const batch = writeBatch(db);
      
      // Update coins
      batch.update(userRef, { coins: currentCoins + coinsCount });
      
      // Delete single-use code
      batch.delete(codeRef);

      await batch.commit();

      // Clear code input and indicate success
      setEnteredCode("");
      setRedeemSuccess(`🎉 Successfully redeemed! Added ${coinsCount.toLocaleString()} LoopCoins to your wallet.`);
      onCoinsPurchased(coinsCount); // Trigger state update in parent App
    } catch (err: any) {
      console.error("Failed to redeem coin code:", err);
      setRedeemError(`Redeem Failed: Permission Denied or network issues. Details: ${err.message}`);
      handleFirestoreError(err, OperationType.WRITE, `coin_codes/${codeId}`);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPack) return;
    setPayError("");

    const code = cvv.trim().toLowerCase();
    if (code !== "admin" && cvv.trim() !== "EMAD8912") {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setPayError("Transaction Error: Incorrect security authentication code. Admin authorization required to process transactions.");
      }, 700);
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment transaction validation
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      
      // Call parent payload action
      onCoinsPurchased(selectedPack.coinsCount);
    }, 1500);
  };

  const resetForm = () => {
    setSelectedPack(null);
    setIsProcessing(false);
    setIsSuccess(false);
    setCardNumber("");
    setCardName("");
    setExpiry("");
    setCvv("");
    setPayError("");
  };

  return (
    <div id="coins-store-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-950/80 backdrop-blur-md"
        onClick={onClose}
      ></div>

      <div id="coin-store-box" className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl z-10 font-sans text-stone-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-800 bg-stone-950/40">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400 animate-bounce" />
            <h3 className="text-xl font-bold">LoopCoin Store</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-stone-850 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrolling Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedPack ? (
            <>
              {/* Introduction Text banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20">
                <p className="text-sm text-amber-300 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  Simulate live coins addition immediately below!
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Coins represent virtual values inside LoopChat. They allow you to send premium animated gifts to streamers to help them level up.
                </p>
              </div>

              {/* Grid of Packages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COIN_PACKAGES.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack)}
                    className={`relative p-5 rounded-xl border text-left transition-all duration-250 cursor-pointer transform hover:translate-y-[-2px] hover:shadow-lg focus:outline-none flex flex-col justify-between ${
                      pack.isPopular
                        ? "bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/10"
                        : "bg-stone-950/45 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    {pack.isPopular && (
                      <span className="absolute -top-2 px-2.5 py-0.5 right-4 bg-amber-500 text-stone-950 text-[10px] font-mono font-bold uppercase rounded-full tracking-wide shadow-sm">
                        Best Value
                      </span>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Coins className="w-6 h-6 text-amber-400" />
                        <span className="text-2xl font-black text-white">{pack.coinsCount}</span>
                      </div>
                      <p className="text-stone-400 text-xs mt-1 font-mono">
                        + {pack.bonusPercentage || 0}% bonus credits
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-850/60 flex items-center justify-between w-full">
                      <span className="text-xs text-stone-400">Total Price</span>
                      <span className="text-base font-bold text-amber-400 font-mono">${pack.priceUSD}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Redeem Coupon/Creator Codes Area */}
              <div className="bg-stone-950/40 border border-stone-850/80 rounded-xl p-4.5 space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4" /> Redeem Single-Use Creator Code
                </h4>
                <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                  Have a creator coupon code? Enter it below to instantly boost your global LoopCoins balance! Each code can only be used once.
                </p>

                <form onSubmit={handleRedeemCode} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER CREATOR CODE (E.G. CREATOR-XXXXXX)"
                      required
                      value={enteredCode}
                      onChange={(e) => {
                        setEnteredCode(e.target.value);
                        setRedeemError("");
                        setRedeemSuccess("");
                      }}
                      className="flex-1 px-3.5 py-2 bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-xl text-xs font-mono text-white placeholder-stone-600 focus:outline-none uppercase"
                    />
                    <button
                      type="submit"
                      disabled={isRedeeming || !enteredCode.trim()}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-sans font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      {isRedeeming ? "Redeeming..." : "Redeem"}
                    </button>
                  </div>

                  {redeemError && (
                    <p className="text-xs text-red-400 font-mono text-left animate-slideUp">⚠️ {redeemError}</p>
                  )}

                  {redeemSuccess && (
                    <p className="text-xs text-green-400 font-sans font-medium text-left animate-slideUp">{redeemSuccess}</p>
                  )}
                </form>
              </div>
            </>
          ) : isSuccess ? (
            /* SUCCESS PANEL */
            <div className="py-8 text-center space-y-4 animate-scaleUp">
              <div className="inline-flex p-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h4 className="text-2xl font-extrabold text-white">Purchase Confirmed!</h4>
              <p className="text-sm text-stone-400 max-w-sm mx-auto">
                Successfully credited <span className="text-amber-400 font-bold">{selectedPack.coinsCount} LoopCoins</span> to your global creator wallet.
              </p>
              
              <div className="pt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white font-medium rounded-xl transition-all cursor-pointer"
                >
                  Purchase More Coins
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT FORM */
            <form onSubmit={handleCheckout} className="space-y-6 animate-scaleUp">
              <div className="flex items-center justify-between p-4 bg-stone-950/80 rounded-xl border border-stone-800">
                <div className="flex items-center gap-2.5">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-stone-300 text-xs block font-mono uppercase tracking-wider">Package Selected</span>
                    <span className="text-white text-base font-bold">{selectedPack.coinsCount} Coins</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-stone-300 text-xs block font-mono uppercase">Price</span>
                  <span className="text-amber-400 text-base font-mono font-bold">${selectedPack.priceUSD}</span>
                </div>
              </div>

              {payError && (
                <div className="p-3.5 bg-red-950/60 border border-red-800/40 rounded-xl text-red-300 text-xs font-mono leading-relaxed">
                  ⚠️ {payError}
                </div>
              )}

              {/* Secure simulated card checkout details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-stone-400" />
                    Simulated Sandbox Payment Info
                  </h4>
                </div>

                <div>
                  <label className="block text-stone-400 text-xs mb-1.5 font-mono">
                    NAME ON CARD
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-950/50 border border-stone-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 text-xs mb-1.5 font-mono">
                    CREDIT CARD NUMBER
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 text-stone-500" />
                    <input
                      type="text"
                      required
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => {
                        // Formats number to have spaces
                        let val = e.target.value.replace(/\s?/g, '').replace(/[^0-9]/g, '');
                        let matches = val.match(/\d{4,16}/g);
                        let match = matches && matches[0] || '';
                        let parts = [];
                        for (let i=0, len=match.length; i<len; i+=4) {
                          parts.push(match.substring(i, i+4));
                        }
                        if (parts.length > 0) {
                          setCardNumber(parts.join(' '));
                        } else {
                          setCardNumber(val);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-950/50 border border-stone-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-400 text-xs mb-1.5 font-mono">
                      EXPIRY
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length >= 2) {
                          setExpiry(`${val.slice(0, 2)}/${val.slice(2, 4)}`);
                        } else {
                          setExpiry(val);
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-stone-950/50 border border-stone-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-400 text-xs mb-1.5 font-mono">
                      CVV / SECURITY CODE
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      placeholder="***"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      className="w-full px-4 py-2.5 bg-stone-950/50 border border-stone-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPack(null)}
                  className="flex-1 py-3 border border-stone-700 text-stone-300 font-medium rounded-xl hover:bg-stone-850 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold rounded-xl shadow-lg shadow-amber-500/10 hover:from-amber-400 hover:to-amber-500 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-65"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-stone-950 border-t-transparent animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    `Complete Transaction`
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info badge */}
        <div className="p-4 bg-stone-950/70 border-t border-stone-800 text-center flex items-center justify-center gap-1 text-[10px] text-stone-500 font-mono uppercase tracking-wider">
          <Shield className="w-3.5 h-3.5 text-stone-500" />
          End-to-End Encrypted Simulation
        </div>
      </div>
    </div>
  );
}
