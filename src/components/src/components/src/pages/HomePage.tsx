import React, { useEffect, useState } from "react";
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
  const [swipesLeft, setSwipesLeft] = useState(10);
  const [wldBalance, setWldBalance] = useState(50);

  // PERFIL DE PRUEBA
  useEffect(() => {
    setProfiles([
      { id: 1, username: "Demo", bio: "Bio de prueba", photo_url: "https://picsum.photos/300/400" }
    ]);
  }, []);

  const handleAction = (type: string) => {
    if (profiles.length === 0) return;

    alert(`Acción: ${type}`); // solo para probar
    if (type === "LIKE" || type === "DISLIKE") setSwipesLeft(prev => prev - 1);
    // Aquí puedes restar WLD cuando conectemos el backend
  };

  return (
    <div className="flex flex-col items-center justify-center mt-10">
      {profiles.length > 0 ? <SwipeCard {...profiles[0]} /> : <p>No hay más perfiles.</p>}
      <SwipeButtons onAction={handleAction} />
      <p className="mt-2 text-gray-600">Swipes gratis restantes: {swipesLeft}</p>
      <p className="mt-1 text-gray-600">Saldo WLD: {wldBalance}</p>
    </div>
  );
        }
