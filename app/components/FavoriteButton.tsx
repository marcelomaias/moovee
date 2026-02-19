"use client";

import { Heart } from "lucide-react";

interface Props {
  isFavorite: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}

export default function FavoriteButton({
  isFavorite,
  onToggle,
  size = "sm",
}: Props) {
  const iconSize = size === "md" ? 28 : 24;

  return (
    <button
      onClick={onToggle}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className="transition-all duration-150 hover:scale-110 active:scale-95 focus:outline-none drop-shadow-lg"
    >
      <Heart
        size={iconSize}
        fill={isFavorite ? "var(--accent)" : "none"}
        stroke={isFavorite ? "var(--accent)" : "white"}
        strokeWidth={2}
      />
    </button>
  );
}
