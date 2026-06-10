/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Gift, Streamer, CoinPackage } from "../types";

export const VIRTUAL_GIFTS: Gift[] = [
  {
    id: "gift-teapot",
    name: "teapot set",
    icon: "🫖",
    cost: 3,
    category: "starter",
    animationStyle: "animate-bounce"
  },
  {
    id: "gift-lovebox",
    name: "love box",
    icon: "🎁",
    cost: 29,
    category: "starter",
    animationStyle: "animate-pulse"
  },
  {
    id: "gift-rosaline",
    name: "Rosaline",
    icon: "🌹",
    cost: 199,
    category: "starter",
    animationStyle: "animate-bounce"
  },
  {
    id: "gift-99roses",
    name: "99 roses",
    icon: "💐",
    cost: 99,
    category: "starter",
    animationStyle: "animate-pulse"
  },
  {
    id: "gift-jewel",
    name: "Jewel",
    icon: "💎",
    cost: 199,
    category: "premium",
    animationStyle: "scale-125 duration-500"
  },
  {
    id: "gift-loveballoon",
    name: "love balloon",
    icon: "🎈",
    cost: 299,
    category: "starter",
    animationStyle: "animate-ping"
  },
  {
    id: "gift-snackbucket",
    name: "Snack bucket",
    icon: "🍪",
    cost: 499,
    category: "premium",
    animationStyle: "scale-110"
  },
  {
    id: "gift-heartshape",
    name: "heart shape",
    icon: "🫶",
    cost: 599,
    category: "starter",
    animationStyle: "animate-ping"
  },
  {
    id: "gift-amourballoon",
    name: "Amour Balloon",
    icon: "💌",
    cost: 699,
    category: "premium",
    animationStyle: "scale-125 duration-500"
  },
  {
    id: "gift-starjar",
    name: "Star Jar",
    icon: "🔮",
    cost: 899,
    category: "premium",
    animationStyle: "scale-125 duration-500"
  },
  {
    id: "gift-tulips",
    name: "tulips",
    icon: "🌷",
    cost: 999,
    category: "legendary",
    animationStyle: "translate-y-[-50px] duration-1000"
  },
  {
    id: "gift-pearls",
    name: "pearls",
    icon: "🐚",
    cost: 1222,
    category: "legendary",
    animationStyle: "translate-y-[-100px] duration-1000"
  },
  {
    id: "gift-undersea",
    name: "Undersea",
    icon: "🌊",
    cost: 1500,
    category: "legendary",
    animationStyle: "translate-x-[20px]"
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
