import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [toast, setToast] = useState<{ message: string; icon: string; color: string } | null>(null);

  const showToast = (message: string, icon: string, color: string) => {
    setToast({ message, icon, color });
    setTimeout(() => setToast(null), 2500);
  };

  const handleLike = () => showToast("Like enviado!", "💖", "#ff69b4");
  const handleDislike = () => showToast("Dislike enviado!", "❌", "#a3a3a3");
  const handleSuper = () => showToast("Super enviado!", "⚡", "#00bfff");
  const handlePremium = (tier: string) => showToast(`${tier} comprado!`, "💎", "#ffd700");

  const styles = {
    app: {
      height: "100vh",
      background: "linear-gradient(180deg, #5e1a2b 0%, #2b0a14 100%)",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      padding: "10px",
      color: "#fff",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: "hidden" as const,
    },
    card: {
      width: "90%",
      maxWidth: "380px",
      height: "55vh",
      background: "#fff",
      borderRadius: "25px",
      boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
      overflow: "hidden",
      cursor: "grab",
      display: "flex",
      flexDirection: "column" as const,
    },
    image: {
      width: "100%",
      height: "75%",
      objectFit: "cover" as const,
    },
    cardContent: {
      padding: "10px 15px",
      textAlign: "center" as const,
      color: "#333",
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center" as const,
    },
    buttonsContainer: { display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" as const },
    button: { cursor: "pointer", fontWeight: 600, border: "none", padding: "8px 14px", borderRadius: "12px", transition: "transform 0.15s, box-shadow 0.15s" },
    premiumContainer: { display: "flex", flexWrap: "wrap" as const, justifyContent: "center", gap: "10px" },
    toast: {
      position: "fixed" as const,
      bottom: "30px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "12px 20px",
      borderRadius: "25px",
      boxShadow: "0 5px 20px rgba(0,0,0,0.4)",
      fontWeight: 600,
      display: "flex",
      alignItems: "center" as const,
      gap: "10px",
      color: "#fff",
      zIndex: 9999,
      backdropFilter: "blur(5px)",
    },
    toastIcon: {
      fontSize: "1.4rem",
    },
  };

  return (
    <div style={styles.app}>
      <div style={{ textAlign: "center" }}>
        <h1>RealVibe 3.0</h1>
        <p>Swipes gratis: 9 | WLD: 0</p>
      </div>

      <motion.div
        style={styles.card}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        whileTap={{ cursor: "grabbing" }}
      >
        <motion.img
          style={styles.image}
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb"
          alt="Demo Profile"
          whileHover={{ scale: 1.03 }}
        />
        <div style={styles.cardContent}>
          <h2>Demo Profile</h2>
          <p>Esta es una tarjeta de ejemplo mientras conectamos backend.</p>
        </div>
      </motion.div>

      <div style={styles.buttonsContainer}>
        <button style={{ ...styles.button, background: "#a3a3a3", color: "#fff" }} onClick={handleDislike}>
          Dislike
        </button>
        <button style={{ ...styles.button, background: "#ff69b4", color: "#fff" }} onClick={handleLike}>
          Like
        </button>
        <button style={{ ...styles.button, background: "#00bfff", color: "#fff" }} onClick={handleSuper}>
          Super
        </button>
      </div>

      <div style={styles.premiumContainer}>
        <button style={{ ...styles.button, background: "#ff8c00" }} onClick={() => handlePremium("Boost 1 WLD")}>
          Boost 1 WLD
        </button>
        <button style={{ ...styles.button, background: "#ffd700" }} onClick={() => handlePremium("Gold 10 WLD")}>
          Gold 10 WLD
        </button>
        <button style={{ ...styles.button, background: "#e5e4e2", color: "#333" }} onClick={() => handlePremium("Platinum 25 WLD")}>
          Platinum 25 WLD
        </button>
        <button style={{ ...styles.button, background: "#b9f2ff", color: "#333" }} onClick={() => handlePremium("Diamond 40 WLD")}>
          Diamond 40 WLD
        </button>
      </div>

      {/* Toast animado tipo Tinder */}
      <AnimatePresence>
        {toast && (
          <motion.div
            style={{ ...styles.toast, background: toast.color }}
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <span style={styles.toastIcon}>{toast.icon}</span>
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
