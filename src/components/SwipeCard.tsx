// src/components/SwipeCard.tsx
import React from "react";
import { motion } from "framer-motion";

interface SwipeCardProps {
  username: string;
  bio: string;
  photoUrl: string;
}

export default function SwipeCard({ username, bio, photoUrl }: SwipeCardProps) {
  return (
    <motion.div 
      className="card-container"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
    >
      <img src={photoUrl} className="w-full h-full object-cover"/>
      <div className="absolute bottom-0 bg-black bg-opacity-50 w-full p-4 text-white">
        <h2 className="font-bold text-lg">{username}</h2>
        <p>{bio}</p>
      </div>
    </motion.div>
  );
      }
