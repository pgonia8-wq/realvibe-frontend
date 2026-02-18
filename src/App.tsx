import { useState } from "react";
import "./index.css";

export default function App() {
  const [swipes] = useState(9);
  const [wld] = useState(0);

  return (
    <div style={{display:"flex", flexDirection:"column", alignItems:"center", paddingTop:"30px"}}>

      <h1 style={{fontSize:"2.5rem", fontWeight:800}}>
        RealVibe 3.0
      </h1>

      <div className="counter">
        Swipes gratis: {swipes} | WLD: {wld}
      </div>

      <div className="card-container" style={{marginTop:"20px"}}>
        <img src="https://picsum.photos/300/300" alt="profile" />
        <h2>Demo Profile</h2>
        <p>Esta es una tarjeta de ejemplo mientras conectamos backend.</p>
      </div>

      <div className="buttons-container">
        <button className="btn-dislike">Dislike</button>
        <button className="btn-like">Like</button>
        <button className="btn-superlike">Super</button>
      </div>

      <h2 style={{marginTop:"30px", fontWeight:700}}>
        Funciones Premium
      </h2>

      <div className="buttons-container">
        <button className="btn-boost">Boost 1 WLD</button>
        <button className="btn-gold">Gold 10 WLD</button>
        <button className="btn-platinum">Platinum 25 WLD</button>
        <button className="btn-diamond">Diamond 40 WLD</button>
      </div>

    </div>
  );
}
