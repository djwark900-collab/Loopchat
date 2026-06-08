import React from "react";
import { CheckCircle, Award, Sparkles, Flame, Coins, ShieldCheck, PlayCircle, Eye, Gift } from "lucide-react";

interface DailyMissionsProps {
  watchedCount: number;
  giftsSentCount: number;
  equippedCount: number;
  claimedMissions: string[];
  onClaimReward: (missionId: string, coinsGold: number, diamondsCyan: number) => void;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardType: "coins" | "diamonds";
  rewardValue: number;
  icon: React.ReactNode;
}

export default function DailyMissions({
  watchedCount,
  giftsSentCount,
  equippedCount,
  claimedMissions,
  onClaimReward
}: DailyMissionsProps) {
  
  const missionsList: Mission[] = [
    {
      id: "mission-watch",
      title: "Stream Surfer",
      description: "Join and watch 3 different live stream channels",
      target: 3,
      rewardType: "coins",
      rewardValue: 500,
      icon: <Eye className="w-5 h-5 text-purple-400" />
    },
    {
      id: "mission-gift",
      title: "Generous Giver",
      description: "Send 1 virtual gift to any livestreamer",
      target: 1,
      rewardType: "coins",
      rewardValue: 300,
      icon: <Gift className="w-5 h-5 text-pink-400" />
    },
    {
      id: "mission-frame",
      title: "Boutique Fashionist",
      description: "Equip any avatar profile frame from the Customizer boutique",
      target: 1,
      rewardType: "diamonds",
      rewardValue: 15,
      icon: <Sparkles className="w-5 h-5 text-cyan-400" />
    }
  ];

  const getProgress = (missionId: string): number => {
    switch (missionId) {
      case "mission-watch":
        return Math.min(watchedCount, 3);
      case "mission-gift":
        return Math.min(giftsSentCount, 1);
      case "mission-frame":
        return Math.min(equippedCount, 1);
      default:
        return 0;
    }
  };

  const handleClaim = (mission: Mission) => {
    const coins = mission.rewardType === "coins" ? mission.rewardValue : 0;
    const diamonds = mission.rewardType === "diamonds" ? mission.rewardValue : 0;
    onClaimReward(mission.id, coins, diamonds);
  };

  // Find percentage of missions completed
  const completedCount = missionsList.filter(m => getProgress(m.id) >= m.target).length;
  const progressPercent = Math.round((completedCount / missionsList.length) * 100);

  return (
    <div id="daily-missions-card" className="bg-[#150f24] border border-stone-800/80 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl text-stone-950 shrink-0">
            <Award className="w-4 h-4 text-stone-950" />
          </span>
          <div className="text-left font-sans">
            <h3 className="text-sm font-black text-white leading-tight uppercase tracking-wider flex items-center gap-1.5">
              Daily Mission Center
              <span className="text-[10px] bg-red-500 text-white font-mono font-bold px-1.5 py-0.5 rounded-full animate-pulse decoration-none normal-case">
                RESET DAILY
              </span>
            </h3>
            <p className="text-[10px] text-stone-400 font-medium">Earn additional coins & diamonds every 24 hours</p>
          </div>
        </div>

        {/* General Progress Meter */}
        <div className="flex items-center gap-3 bg-stone-950/40 px-3 py-1.5 rounded-xl border border-stone-850/60 self-start sm:self-auto shrink-0 leading-none">
          <div className="text-right font-sans">
            <span className="text-[9px] text-stone-500 font-bold block uppercase tracking-wider">Missions Complete</span>
            <span className="text-xs font-black text-amber-400 font-mono">{completedCount} / {missionsList.length}</span>
          </div>
          <div className="w-12 bg-stone-900 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lists of tasks */}
      <div className="mt-4 space-y-3 font-sans text-xs">
        {missionsList.map((mission) => {
          const progress = getProgress(mission.id);
          const isCompleted = progress >= mission.target;
          const isClaimed = claimedMissions.includes(mission.id);
          const progressPercentSingle = Math.min(Math.round((progress / mission.target) * 100), 100);

          return (
            <div 
              key={mission.id}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 transition-all duration-300 ${
                isClaimed
                  ? "bg-stone-950/20 border-stone-900/60 opacity-60"
                  : isCompleted
                  ? "bg-purple-950/15 border-purple-500/20 shadow-[0_4px_12px_rgba(159,95,254,0.04)]"
                  : "bg-stone-950/50 border-stone-850/70 hover:border-stone-800"
              }`}
            >
              {/* Left description */}
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-xl shrink-0 ${
                  isClaimed 
                    ? "bg-stone-900 text-stone-600" 
                    : isCompleted 
                    ? "bg-purple-500/10 text-purple-400" 
                    : "bg-stone-900 text-stone-300"
                }`}>
                  {mission.icon}
                </div>
                <div className="text-left leading-snug space-y-1">
                  <h4 className={`text-xs font-black tracking-wide ${isClaimed ? "text-stone-500" : "text-stone-200"}`}>
                    {mission.title}
                  </h4>
                  <p className="text-[10px] text-stone-400 leading-normal max-w-sm sm:max-w-md font-medium">
                    {mission.description}
                  </p>
                  
                  {/* Progress Info layout and bar */}
                  <div className="flex items-center gap-2 pt-1 font-mono">
                    <span className={`text-[9px] font-black tracking-tight ${isCompleted ? "text-green-400" : "text-amber-400"}`}>
                      {progress} / {mission.target}
                    </span>
                    <div className="w-20 bg-stone-900 rounded-full h-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-green-500" : "bg-purple-500"}`}
                        style={{ width: `${progressPercentSingle}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle rewards block */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-stone-900 pt-2.5 sm:pt-0 shrink-0 select-none">
                <span className="text-[8px] text-stone-500 sm:block font-bold uppercase tracking-wider leading-none mb-1">
                  Daily Bonus
                </span>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-950/60 rounded-lg border border-stone-850">
                  {mission.rewardType === "coins" ? (
                    <>
                      <span className="text-[10px] font-black text-amber-400 font-mono">+{mission.rewardValue}</span>
                      <Coins className="w-3.5 h-3.5 text-amber-400 animate-spin-slow shrink-0" />
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-black text-cyan-400 font-mono">+{mission.rewardValue}</span>
                      <span className="text-[11px] animate-pulse shrink-0 leading-none">💎</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right claim button */}
              <div className="flex items-center justify-end shrink-0 leading-none">
                {isClaimed ? (
                  <span className="px-3.5 py-1.5 bg-stone-900/40 text-stone-500 border border-stone-900 font-black text-[9px] uppercase tracking-wider rounded-xl select-none flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-600" /> Claimed
                  </span>
                ) : isCompleted ? (
                  <button
                    onClick={() => handleClaim(mission)}
                    className="px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] hover:from-[#7C3AED] hover:to-[#DB2777] text-white font-black text-[9px] uppercase tracking-wider rounded-xl shadow-md cursor-pointer animate-pulse active:scale-95 transition-all whitespace-nowrap"
                  >
                    🚀 Claim Reward
                  </button>
                ) : (
                  <span className="px-3.5 py-1.5 bg-stone-900/60 text-stone-400 border border-stone-850 font-black text-[9px] uppercase tracking-wider rounded-xl select-none">
                    Locked
                  </span>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
