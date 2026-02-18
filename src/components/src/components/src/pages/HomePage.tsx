import React, { useEffect, useState } from "react";
import axios from "axios";
import SwipeCard from "../components/SwipeCard";
import SwipeButtons from "../components/SwipeButtons";

interface User {
  id: number;
  username: string;
  bio: string;
  photo_url: string;
}

export default function HomePage() {
  const [profiles, setProfiles] = useState<User[]>([]);
  const [swipesLeft, setSwipesLeft] = useState(10); // 10 swipes diarios gratis

  useEffect(() => {
    axios.get("https://vibe-profile--sapag1218.replit.app/api/profiles", { 
      headers: { "x-worldapp-id": 1 } 
    })
    .then(res => setProfiles(res.data.profiles))
    .catch(err => console.log(err));
  }, []);

  const handleAction = (type: string) => {
    if (profiles.length === 0) return;

    if (swipesLeft <= 0 && type === "LIKE") {
      alert("Ya usaste tus 10 swipes diarios gratuitos. Compra WLD para seguir swiping.");
      return;
    }

    const target = profiles[0];

    axios.post("https://vibe-profile--sapag1218.replit.app/api/swipe", 
      { targetId: target.id, actionType: type }, 
      { headers: { "x-worldapp-id": 1 } }
    )
    .then(() => {
      setProfiles(prev => prev.slice(1));
      if (type === "LIKE" || type === "DISLIKE") {
        setSwipesLeft(prev => prev - 1);
      }
    })
    .catch(err => console.log(err));
  };

  return (
    <div className="flex flex-col items-center justify-center mt-10">
      {profiles.length > 0 ? <SwipeCard {...profiles[0]} /> : <p>No hay más perfiles.</p>}
      <SwipeButtons onAction={handleAction} />
      <p className="mt-2 text-gray-600">Swipes gratis restantes: {swipesLeft}</p>
    </div>
  );
            }
