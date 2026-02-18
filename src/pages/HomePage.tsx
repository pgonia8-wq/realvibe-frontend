import React, { useState } from "react";
import SwipeCard from "../components/SwipeCard";
import SwipeButtons from "../components/SwipeButtons";

// Perfiles demo
const demoProfiles = [
  { id: 1, name: "Alex", age: 25, bio: "Aventurero y amante de la música.", photoUrl: "https://placekitten.com/300/300" },
  { id: 2, name: "Maria", age: 23, bio: "Fan del cine y los viajes.", photoUrl: "https://placekitten.com/301/300" },
  { id: 3, name: "Juan", age: 28, bio: "Apasionado por la tecnología.", photoUrl: "https://placekitten.com/302/300" },
];

const HomePage: React.FC = () => {
  const [profiles, setProfiles] = useState(demoProfiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipesLeft, setSwipesLeft] = useState(10); // 10 swipes gratis diarios
  const [wldBalance, setWldBalance] = useState(0);  // WLD premium

  const handleAction = (type: string, cost: number = 0) => {
    if (swipesLeft <= 0 && cost === 0) {
      alert("Has usado tus 10 swipes gratis diarios.");
      return;
    }
    if (cost > 0 && cost > wldBalance) {
      alert("No tienes suficiente WLD para esta acción.");
      return;
    }

    // Actualiza contadores
    if (cost === 0) setSwipesLeft(swipesLeft - 1);
    else setWldBalance(wldBalance - cost);

    // Siguiente perfil
    if (currentIndex < profiles.length - 1) setCurrentIndex(currentIndex + 1);
    else alert("¡Has llegado al último perfil por ahora!");
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <h1 style={{ marginBottom: "10px" }}>RealVibe 3.0</h1>
      <div className="counter">
        Swipes gratis: {swipesLeft} | WLD: {wldBalance}
      </div>

      {currentProfile ? <SwipeCard profile={currentProfile} /> : <p>No hay perfiles disponibles.</p>}

      <SwipeButtons onAction={(type, cost) => handleAction(type, cost)} />
    </div>
  );
};

export default HomePage;
