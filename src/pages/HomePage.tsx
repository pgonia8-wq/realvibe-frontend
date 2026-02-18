// src/pages/HomePage.tsx
import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import SwipeCard from "../components/SwipeCard";
import SwipeButtons from "../components/SwipeButtons";

// 🔹 Pega aquí tu URL y anon key de Supabase
const SUPABASE_URL = "https://TU_SUPABASE_URL.supabase.co";
const SUPABASE_KEY = "TU_SUPABASE_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const USER_ID = "11111111-1111-1111-1111-111111111111";

interface Profile {
  id: string;
  name: string;
  bio: string;
  photo_url: string;
}

const HomePage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipesLeft, setSwipesLeft] = useState(10);
  const [wldBalance, setWldBalance] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      // Cargar usuario
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", USER_ID)
        .single();

      if (userData) {
        setSwipesLeft(userData.swipes_left);
        setWldBalance(userData.wld_balance);
        setCurrentIndex(userData.current_index);
      }

      // Cargar perfiles
      const { data: profileData } = await supabase
        .from("profile")
        .select("*");

      if (profileData) setProfiles(profileData);
    };

    loadData();
  }, []);

  const handleAction = async (type: string, cost: number = 0) => {
    if (swipesLeft <= 0 && cost === 0) {
      alert("Has usado tus 10 swipes gratis diarios.");
      return;
    }
    if (cost > 0 && cost > wldBalance) {
      alert("No tienes suficiente WLD para esta acción.");
      return;
    }

    let newSwipes = swipesLeft;
    let newWld = wldBalance;

    if (cost === 0) {
      newSwipes -= 1;
      setSwipesLeft(newSwipes);
    } else {
      newWld -= cost;
      setWldBalance(newWld);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < profiles.length) setCurrentIndex(nextIndex);
    else alert("¡Has llegado al último perfil por ahora!");

    await supabase
      .from("users")
      .update({
        swipes_left: newSwipes,
        wld_balance: newWld,
        current_index: nextIndex
      })
      .eq("id", USER_ID);
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <h1 style={{ marginBottom: "10px" }}>RealVibe 3.0</h1>
      <div className="counter">
        Swipes gratis: {swipesLeft} | WLD: {wldBalance}
      </div>

      {currentProfile ? (
        <SwipeCard
          username={currentProfile.name}
          bio={currentProfile.bio}
          photoUrl={currentProfile.photo_url}
        />
      ) : (
        <p>No hay perfiles disponibles.</p>
      )}

      <div className="buttons-container">
        <SwipeButtons
          onAction={(type: string) => {
            switch(type) {
              case "LIKE":
              case "DISLIKE":
                handleAction(type, 0);
                break;
              case "SUPERLIKE":
              case "BOOST":
                handleAction(type, 1);
                break;
              case "GOLD":
                handleAction(type, 10);
                break;
              case "PLATINUM":
                handleAction(type, 25);
                break;
              case "DIAMOND":
                handleAction(type, 40);
                break;
            }
          }}
        />
      </div>
    </div>
  );
};

export default HomePage;
