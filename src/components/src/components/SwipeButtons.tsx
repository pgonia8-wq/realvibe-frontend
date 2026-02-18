import React from "react";

interface SwipeButtonsProps {
  onAction: (type: string) => void;
}

export default function SwipeButtons({ onAction }: SwipeButtonsProps) {
  return (
    <div className="flex justify-around mt-4">
      <button className="btn-dislike" onClick={() => onAction("DISLIKE")}>Dislike</button>
      <button className="btn-superlike" onClick={() => onAction("SUPERLIKE")}>Super Like</button>
      <button className="btn-like" onClick={() => onAction("LIKE")}>Like</button>
    </div>
  );
}
