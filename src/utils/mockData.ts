/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Gift, Streamer, CoinPackage } from "../types";

export const VIRTUAL_GIFTS: Gift[] = [
  {
    id: "gift-rose",
    name: "Rose",
    icon: "🌹",
    cost: 50,
    category: "starter",
    animationStyle: "animate-bounce"
  },
  {
    id: "gift-flowers",
    name: "Flowers",
    icon: "💐",
    cost: 70,
    category: "starter",
    animationStyle: "animate-pulse"
  },
  {
    id: "gift-foryou",
    name: "For you",
    icon: "🎐",
    cost: 100,
    category: "starter",
    animationStyle: "animate-ping"
  },
  {
    id: "gift-heart",
    name: "Heart",
    icon: "❤️",
    cost: 500,
    category: "starter",
    animationStyle: "animate-ping"
  },
  {
    id: "gift-mic",
    name: "Singing Mic",
    icon: "🎤",
    cost: 999,
    category: "premium",
    animationStyle: "scale-125 duration-500"
  },
  {
    id: "gift-mony",
    name: "Mony Loop",
    icon: "🔫",
    cost: 1000,
    category: "premium",
    animationStyle: "translate-y-[-10px]"
  },
  {
    id: "gift-deer",
    name: "Baby deer",
    icon: "🦌",
    cost: 1000,
    category: "premium",
    animationStyle: "scale-110"
  },
  {
    id: "gift-rocket-new",
    name: "Rocket",
    icon: "🚀",
    cost: 2000,
    category: "legendary",
    animationStyle: "translate-y-[-100px] duration-1000"
  },
  {
    id: "gift-ball",
    name: "Ball",
    icon: "⚽",
    cost: 2000,
    category: "legendary",
    animationStyle: "animate-spin"
  },
  {
    id: "gift-gold-flower",
    name: "Golden flower",
    icon: "🌻",
    cost: 2000,
    category: "legendary",
    animationStyle: "scale-125 transition-transform"
  },
  {
    id: "gift-cruise",
    name: "Cruise Ship",
    icon: "🚢",
    cost: 3000,
    category: "legendary",
    animationStyle: "translate-x-[20px]"
  },
  {
    id: "gift-gold-watch",
    name: "Gold Watch",
    icon: "⌚",
    cost: 3000,
    category: "legendary",
    animationStyle: "rotate-12"
  },
  {
    id: "gift-lion",
    name: "King Lion",
    icon: "🦁",
    cost: 5000,
    category: "legendary",
    animationStyle: "scale-125 duration-1000"
  }
];

export const COIN_PACKAGES: CoinPackage[] = [
  {
    id: "coin-pack-starter",
    coinsCount: 200,
    priceUSD: 1.99,
    bonusPercentage: 0
  },
  {
    id: "coin-pack-standard",
    coinsCount: 600,
    priceUSD: 4.99,
    bonusPercentage: 10,
    isPopular: true
  },
  {
    id: "coin-pack-premium",
    coinsCount: 1500,
    priceUSD: 11.99,
    bonusPercentage: 25
  },
  {
    id: "coin-pack-whale",
    coinsCount: 5000,
    priceUSD: 29.99,
    bonusPercentage: 40
  }
];

export const SIMULATED_CHAT_MESSAGES = [
  "Wow! This stream is amazing!",
  "Great setup! Love the lighting.",
  "Can you share what mic you're using?",
  "Greetings from Tokyo! 🇯🇵",
  "This is extremely helpful, thanks!",
  "OMG 🚀🚀🚀 Awesome!",
  "Let's gooo loopers!",
  "Absolute fire content today!",
  "Is the code open source?",
  "That level 35 badge is legendary!",
  "Just downloaded the App! Best social portal ever.",
  "What is your advice for starting creators?",
  "Can you say hello to my friend Leo?",
  "Love the energy on LoopChat right now! 🔥💎",
  "Unreal skills displayed here."
];

export const CHATTER_USERNAMES = [
  "cyber_phantom",
  "neon_rider",
  "spark_plug",
  "code_ninja",
  "beat_blaster",
  "retro_wave",
  "cozy_cooter",
  "giga_coder",
  "zen_master",
  "pixel_pusher",
  "sound_scaper",
  "java_junkie",
  "star_sailor",
  "luna_vibe",
  "loop_lover"
];
