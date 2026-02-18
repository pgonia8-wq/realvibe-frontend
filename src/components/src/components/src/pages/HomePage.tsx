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
  const [swipesLeft, setSwipesLeft] = useState(10); // 10 swipes gratis diarios
  const [wldBalance, setWldBalance] = useState(50); // saldo inicial temporal

  // Costos de acciones premium
  const COSTS: Record<string, number> = {
    SUPERLIKE: 1,
    BOOST: 1,
    GOLD: 10,
    PLATINUM: 25,
    DIAMOND: 40
  };

  // Traer perfiles desde backend
  useEffect(() => {
    axios.get("https://vibe-profile--sapag1218.replit.app/api/profiles", {
      headers: { "x-worldapp-id": 1 }
    })
    .then(res => setProfiles(res.data.profiles))
    .catch(err => console.log(err));
  }, []);

  // Función para manejar swipes y acciones premium
  const handleAction = (type: string) => {
    if (profiles.length === 0) return;

    // Validar swipes gratis
    if ((type === "LIKE" || type === "DISLIKE") && swipesLeft <= 0) {
      alert("Ya usaste tus 10 swipes diarios gratis. Compra WLD para seguir swiping.");
      return;
    }

    // Validar saldo WLD para acciones premium
    if (COSTS[type] && COSTS[type] > wldBalance) {
      alert("No tienes suficiente WLD para esta acción.");
      return;
    }

    const target = profiles[0];

    // Enviar acción al backend
    axios.post("https://vibe-profile--sapag1218.replit.app/api/swipe", 
      { targetId: target.id, actionType: type }, 
      { headers: { "x-worldapp-id": 1 } }
    )
    .then(() => {
      // Quitar la tarjeta que se swipeó
      setProfiles(prev => prev.slice(1));

      // Restar swipe gratis si es LIKE o DISLIKE
      if (type === "LIKE" || type === "DISLIKE") {
        setSwipesLeft(prev => prev - 1);
      }

      // Restar WLD si es acción premium
      if (COSTS[type]) {
        setWldBalance(prev => prev - COSTS[type]);
      }
    })
    .catch(err => console.log(err));
  };

  return (
    <div className="flex flex-col items-center justify-center mt-10">
      {profiles.length > 0 ? (
        <SwipeCard {...profiles[0]} />
      ) : (
        <p>No hay más perfiles.</p>
      )}

      <SwipeButtons onAction={handleAction} />

      <p className="mt-2 text-gray-600">Swipes gratis restantes: {swipesLeft}</p>
      <p className="mt-1 text-gray-600">Saldo WLD: {wldBalance}</p>
    </div>
  );
}
