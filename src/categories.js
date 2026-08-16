import { Coffee, BookOpen, Bus, Shirt, PartyPopper, Clapperboard, Smartphone, Package, Tag } from "lucide-react";

export const DEFAULT_CATS = [
  { key: "Food", icon: Coffee, color: "#1F7A5C" },
  { key: "Stationery", icon: BookOpen, color: "#4C6B8A" },
  { key: "Transport", icon: Bus, color: "#7A8B6F" },
  { key: "Shopping", icon: Shirt, color: "#E2A63B" },
  { key: "Friends", icon: PartyPopper, color: "#8A5C7A" },
  { key: "Entertainment", icon: Clapperboard, color: "#C1584B" },
  { key: "Recharge", icon: Smartphone, color: "#A69F91" },
  { key: "Other", icon: Package, color: "#D98A7D" },
];

// Palette offered when a user creates a custom category
export const SWATCHES = ["#1F7A5C", "#4C6B8A", "#7A8B6F", "#E2A63B", "#8A5C7A", "#C1584B", "#A69F91", "#D98A7D", "#6B5CA5", "#3D8FB0"];

export function buildCatList(customCategories = []) {
  return [
    ...DEFAULT_CATS,
    ...customCategories.map((c) => ({ key: c.key, icon: Tag, color: c.color || "#6B5CA5", custom: true })),
  ];
}

export function catMetaFrom(list, name) {
  return list.find((c) => c.key === name) || list[list.length - 1];
}
