// src/components/SwipeButtons.tsx
import React from "react";

interface SwipeButtonsProps {
  onAction: (type: string) => void;
}

export default function SwipeButtons({ onAction }: SwipeButtonsProps) {
  return (
    <div className="flex flex-wrap justify-center mt-4 gap-2">
      <button className="btn-dislike" onClick={() => onAction("DISLIKE")}>Dislike</button>
      <button className="btn-superlike" onClick={() => onAction("SUPERLIKE")}>Super Like 1 WLD</button>
      <button className="btn-like" onClick={() => onAction("LIKE")}>Like</button>
      <button className="btn-boost" onClick={() => onAction("BOOST")}>Boost 1 WLD</button>
      <button className="btn-boost" onClick={() => onAction("GOLD")}>Gold 10 WLD</button>
      <button className="btn-boost" onClick={() => onAction("PLATINUM")}>Platinum 25 WLD</button>
      <button className="btn-boost" onClick={() => onAction("DIAMOND")}>Diamond 40 WLD</button>
    </div>
  );
        }
