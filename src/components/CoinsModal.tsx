/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ArrowLeft, ChevronRight, History } from "lucide-react";

interface CoinsModalProps {
  onClose: () => void;
  onCoinsPurchased: (amount: number) => void;
  currentCoins?: number; // Passed from parent if needed
}

const WALLET_PACKS = [
  { coins: "1,200", rawCoins: 1200, price: "$ 1.99", bonus: "+50" },
  { coins: "6,500", rawCoins: 6500, price: "$ 9.99", bonus: "+300" },
  { coins: "14,000", rawCoins: 14000, price: "$ 19.99", bonus: "+800" },
  { coins: "35,000", rawCoins: 35000, price: "$ 49.99", bonus: "+2000", isPopular: true },
  { coins: "75,000", rawCoins: 75000, price: "$ 99.99", bonus: "+5000" },
  { coins: "150,000", rawCoins: 150000, price: "$ 199.99", bonus: "+12000" },
];

export default function CoinsModal({ onClose, onCoinsPurchased, currentCoins = 0 }: CoinsModalProps) {
  return (
    <div id="wallet-store-modal" className="fixed inset-0 z-50 flex flex-col bg-[#070412] font-sans text-white animate-scaleUp">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0 bg-[#070412]">
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition cursor-pointer text-white">
          <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <h2 className="text-[17px] font-black tracking-wide">My Wallet</h2>
        <button className="p-2 text-[#9366ff] hover:bg-[#9366ff]/10 rounded-full transition-colors">
          <History className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full max-w-md mx-auto pb-10">
        
        {/* CURRENT BALANCE BANNER */}
        <div className="px-5 mb-8 mt-2">
            <div className="bg-gradient-to-br from-[#2D1B50] to-[#120A2A] border border-[#52309C] rounded-[24px] p-6 relative overflow-hidden shadow-[0_12px_44px_rgba(111,58,230,0.18)]">
                {/* Visual patterns */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-[#9366ff]/20 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                <div className="absolute left-0 bottom-0 w-24 h-24 bg-[#FF6A3A]/10 blur-[40px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
                
                <div className="flex justify-between items-center relative z-10">
                    <div className="space-y-1">
                        <span className="text-[#A499C8] text-xs font-black uppercase tracking-widest">Available Balance</span>
                        <div className="flex items-center gap-2">
                            <span className="text-4xl font-black">{currentCoins.toLocaleString()}</span>
                            <div className="w-6 h-6 bg-gradient-to-tr from-[#FEC96E] to-[#FF813A] rounded-full p-0.5 shadow-lg relative flex items-center justify-center">
                                <span className="bg-[#120A2A] rounded-full w-full h-full border border-[#FF813A]"></span>
                                <span className="absolute text-[#FF813A] text-xs font-black">¢</span>
                            </div>
                        </div>
                    </div>
                    <button className="h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md transition-colors border border-white/10 cursor-pointer">
                        <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                </div>
            </div>
        </div>

        {/* RECHARGE STORE GRID */}
        <div className="px-5 space-y-4">
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest px-1">Top Up Packages</h3>
            
            <div className="grid grid-cols-2 gap-3.5">
                {WALLET_PACKS.map((pack, idx) => (
                    <div 
                        key={idx}
                        className="bg-[#181325] hover:bg-[#201832] border border-[#2B233C] hover:border-[#6F3AE6] rounded-[20px] p-4 flex flex-col justify-between relative transition-all cursor-pointer group active:scale-95"
                        onClick={() => {
                            onCoinsPurchased(pack.rawCoins);
                            onClose();
                        }}
                    >
                        {pack.isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gradient-to-r from-[#FF6A3A] to-[#FF3A85] text-white text-[9px] font-black tracking-widest uppercase rounded-full shadow-lg">
                                Popular
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2 mb-4 mt-2">
                            <div className="w-7 h-7 bg-gradient-to-tr from-[#FEC96E] to-[#FF813A] rounded-full p-0.5 shadow-lg relative flex items-center justify-center">
                                <span className="bg-[#181325] group-hover:bg-[#201832] rounded-full w-full h-full border border-[#FF813A] transition-colors"></span>
                                <span className="absolute text-[#FF813A] text-[10px] sm:text-xs font-black">¢</span>
                            </div>
                            <span className="text-white font-black text-lg tracking-tight">{pack.coins}</span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            {pack.bonus && (
                                <span className="text-[#FF813A] text-[10px] font-black uppercase tracking-wider">
                                    {pack.bonus} Bonus
                                </span>
                            )}
                            <button className="w-full py-2 bg-[#9366ff]/10 group-hover:bg-[#9366ff] text-[#9366ff] group-hover:text-white rounded-[12px] font-black text-sm transition-all">
                                {pack.price}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <p className="text-center text-[10px] text-stone-600 font-semibold px-4 pt-6">
                Recharge coins to send premium gifts to your favorite broadcasters. Transactions are simulated for demo mode.
            </p>
        </div>
      </div>
    </div>
  );
}
