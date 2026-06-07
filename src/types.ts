/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string; // The Creator ID (e.g., "LC-493820")
  username: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  bio: string;
  coins: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  followers: number;
  following: number;
  createdAt: string;
  activeFrameId?: string;
  unlockedFrames?: string[];
  countryFlag?: string;
  gender?: "male" | "female" | "other";
  likesCount?: number;
  friendsCount?: number;
  referralCode?: string;
  identificationCode?: string;
}

export interface Streamer {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  level: number;
  viewersCount: number;
  title: string;
  category: string;
  isLive: boolean;
}

export interface Gift {
  id: string;
  name: string;
  icon: string;
  cost: number;
  category: "starter" | "premium" | "legendary";
  animationStyle: string; // Tailwind animation styling
}

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  avatarUrl?: string;
  gift?: {
    name: string;
    icon: string;
    cost: number;
  };
  isSystem?: boolean;
}

export interface CoinPackage {
  id: string;
  coinsCount: number;
  priceUSD: number;
  bonusPercentage?: number;
  isPopular?: boolean;
}

export interface SavedCard {
  id: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

