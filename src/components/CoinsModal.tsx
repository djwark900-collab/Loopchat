/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ArrowLeft } from "lucide-react";

interface CoinsModalProps {
  onClose: () => void;
  onCoinsPurchased: (amount: number) => void;
}

const WALLET_PACKS = [
  { coins: "5.0k", rawCoins: 5000, price: "$ 0.59" },
  { coins: "10.0k", rawCoins: 10000, price: "$ 1.0" },
  { coins: "25.0k", rawCoins: 25000, price: "$ 2.5" },
  { coins: "100.0k", rawCoins: 100000, price: "$ 10.0" },
  { coins: "500.0k", rawCoins: 500000, price: "$ 50.0" },
  { coins: "1000.0k", rawCoins: 1000000, price: "$ 100.0" },
];

export default function CoinsModal({ onClose, onCoinsPurchased }: CoinsModalProps) {
  return (
    <div id="coins-store-modal" className="fixed inset-0 z-50 flex flex-col bg-[#FDFCFD] font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-purple-50">
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition cursor-pointer">
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <h2 className="text-xl font-bold text-black tracking-tight">Recharge</h2>
        <button className="text-purple-500 font-bold text-sm tracking-wide">
          Restore
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 py-6">
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {WALLET_PACKS.map((pack, idx) => (
            <div 
              key={idx}
              className="bg-white border border-purple-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(200,180,255,0.15)] hover:shadow-[0_4px_24px_rgba(150,100,250,0.2)] transition-shadow cursor-pointer select-none"
              onClick={() => {
                onCoinsPurchased(pack.rawCoins);
                onClose();
              }}
            >
              {/* Star Coin Icon */}
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-amber-300 rounded-full flex flex-col items-center justify-center border-4 border-amber-100 shadow-md mb-3 relative overflow-hidden">
                <div className="absolute inset-0 border-2 border-amber-400 rounded-full m-1"></div>
                <svg className="w-8 h-8 text-white fill-amber-200 z-10" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              
              <span className="text-[#FFBA60] font-black text-sm bg-orange-50 px-3 py-1 rounded-md mb-3 shadow-sm whitespace-nowrap tracking-wide">
                {pack.coins} Coins
              </span>

              <button className="w-full py-2.5 bg-gradient-to-r from-[#9462FF] to-[#D57BFF] hover:opacity-90 text-white rounded-3xl font-semibold text-[15px] shadow-sm active:scale-95 transition-all">
                {pack.price}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
