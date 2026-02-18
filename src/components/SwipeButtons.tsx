import React from "react";

interface SwipeButtonsProps {
  onAction: (type: string, cost?: number) => void;
}

export default function SwipeButtons({ onAction }: SwipeButtonsProps) {
  return (
    <div className="flex flex-wrap justify-center mt-4 gap-2">
      <button className="btn-dislike" onClick={() => onAction("DISLIKE")}>Dislike</button>
      <button className="btn-superlike" onClick={() => onAction("SUPERLIKE", 1)}>Super Like 1 WLD</button>
      <button className="btn-like" onClick={() => onAction("LIKE")}>Like</button>
      <button className="btn-boost" onClick={() => onAction("BOOST", 1)}>Boost 1 WLD</button>
      <button className="btn-gold" onClick={() => onAction("GOLD", 10)}>Gold 10 WLD</button>
      <button className="btn-platinum" onClick={() => onAction("PLATINUM", 25)}>Platinum 25 WLD</button>
      <button className="btn-diamond" onClick={() => onAction("DIAMOND", 40)}>Diamond 40 WLD</button>
    </div>
  );
                                                                                      }
