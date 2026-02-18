import React from "react";
import { motion } from "framer-motion";

export default function App() {
  const handleLike = () => alert("Like!");
  const handleDislike = () => alert("Dislike!");
  const handleSuper = () => alert("Super!");
  const handlePremium = (tier: string) => alert(`${tier} clicked!`);

  const styles = {
    app: {
      minHeight: "100vh",
      background: "linear-gradient(180deg, #5e1a2b 0%, #2b0a14 100%)",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center" as const,
      padding: "20px",
      color: "#fff",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    card: {
      width: "90%",
      maxWidth: "380px",
      background: "#fff",
      borderRadius: "25px",
      boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
      overflow: "hidden",
      marginTop: "20px",
      cursor: "grab",
    },
    image: {
      width: "100%",
      height: "320px",
      objectFit: "cover" as const,
    },
    cardContent: {
      padding: "20px",
      textAlign: "center" as const,
      color: "#333",
    },
    cardTitle: { fontSize: "1.5rem", fontWeight: 700, margin: "10px 0" },
    cardText: { fontSize: "0.95rem", margin: "10px 0" },
    buttonsContainer: {
      display: "flex",
      justifyContent: "center",
      gap: "12px",
      flexWrap: "wrap" as const,
      marginTop: "20px",
    },
    button: {
      cursor: "pointer",
      fontWeight: 600,
      border: "none",
      padding: "10px 16px",
      borderRadius: "12px",
      transition: "transform 0.15s, box-shadow 0.15s",
    },
    like: { background: "linear-gradient(90deg,#ff69b4,#8a2be2)", color: "#fff" },
    dislike: { background: "linear-gradient(90deg,#a3a3a3,#6b6b6b)", color: "#fff" },
    superlike: { background: "linear-gradient(90deg,#00bfff,#1e90ff)", color: "#fff" },
    premiumContainer: {
      display: "flex",
      flexWrap: "wrap" as const,
      justifyContent: "center",
      gap: "12px",
      marginTop: "25px",
    },
    premiumButton: {
      cursor: "pointer",
      fontWeight: 600,
      border: "none",
      padding: "10px 16px",
      borderRadius: "12px",
      color: "#fff",
      transition: "transform 0.15s, box-shadow 0.15s",
    },
    boost: { background: "linear-gradient(90deg,#ff8c00,#ffa500)" },
    gold: { background: "linear-gradient(90deg,#ffd700,#ffb700)" },
    platinum: { background: "linear-gradient(90deg,#e5e4e2,#c0c0c0)", color: "#333" },
    diamond: { background: "linear-gradient(90deg,#b9f2ff,#00ced1)", color: "#333" },
  };

  return (
    <div style={styles.app}>
      <h1>RealVibe 3.0</h1>
      <p>Swipes gratis: 9 | WLD: 0</p>

      <motion.div
        style={styles.card}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        whileTap={{ cursor: "grabbing" }}
        onDragEnd={(event, info) => {
          if (info.offset.x > 120) handleLike();
          else if (info.offset.x < -120) handleDislike();
        }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.img
          style={styles.image}
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb"
          alt="Demo Profile"
          whileHover={{ scale: 1.03 }}
        />
        <div style={styles.cardContent}>
          <h2 style={styles.cardTitle}>Demo Profile</h2>
          <p style={styles.cardText}>
            Esta es una tarjeta de ejemplo mientras conectamos backend.
          </p>
        </div>
      </motion.div>

      <div style={styles.buttonsContainer}>
        <button
          style={{ ...styles.button, ...styles.dislike }}
          onClick={handleDislike}
        >
          Dislike
        </button>
        <button style={{ ...styles.button, ...styles.like }} onClick={handleLike}>
          Like
        </button>
        <button
          style={{ ...styles.button, ...styles.superlike }}
          onClick={handleSuper}
        >
          Super
        </button>
      </div>

      <h2 style={{ marginTop: "30px" }}>Funciones Premium</h2>
      <div style={styles.premiumContainer}>
        <button
          style={{ ...styles.premiumButton, ...styles.boost }}
          onClick={() => handlePremium("Boost 1 WLD")}
        >
          Boost 1 WLD
        </button>
        <button
          style={{ ...styles.premiumButton, ...styles.gold }}
          onClick={() => handlePremium("Gold 10 WLD")}
        >
          Gold 10 WLD
        </button>
        <button
          style={{ ...styles.premiumButton, ...styles.platinum }}
          onClick={() => handlePremium("Platinum 25 WLD")}
        >
          Platinum 25 WLD
        </button>
        <button
          style={{ ...styles.premiumButton, ...styles.diamond }}
          onClick={() => handlePremium("Diamond 40 WLD")}
        >
          Diamond 40 WLD
        </button>
      </div>
    </div>
  );
}
