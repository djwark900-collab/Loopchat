/**
 * LEVEL AND XP PROGRESSION UTILS
 * Maps user-specific level target thresholds as requested:
 * level 1 -> xp500
 * level 2 -> xp2500
 * level 3 -> xp6500 (and support 10000)
 * level 4 -> xp10400
 * level 5 -> xp12500
 * level 6 -> xp15000
 * level 7 -> xp25000
 * level 8 to 50 -> xp29000
 */

export function getXpNeededForLevel(level: number): number {
  switch (level) {
    case 1:
      return 500;
    case 2:
      return 2500;
    case 3:
      return 6500;
    case 4:
      return 10400;
    case 5:
      return 12500;
    case 6:
      return 15000;
    case 7:
      return 25000;
    default:
      // Level 8-50 target is 29,000 XP
      return 29000;
  }
}

export const LEVEL_REQUIREMENTS = [
  { level: 1, xp: 500, label: "Starter Live Level" },
  { level: 2, xp: 2500, label: "Bronze Creator Level" },
  { level: 3, xp: 6500, label: "Silver Star Level" },
  { level: 3, xp: 10000, label: "Gold Star (Tier Alt)" },
  { level: 4, xp: 10400, label: "Ruby Influencer" },
  { level: 5, xp: 12500, label: "Emerald Partner" },
  { level: 6, xp: 15000, label: "Diamond Ambassador" },
  { level: 7, xp: 25000, label: "Platinum Legend" },
  { level: "8-50", xp: 29000, label: "Master of LoopChat" }
];
