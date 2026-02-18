import React, { useState, useEffect } from 'react';

type Profile = {
  name: string;
  description: string;
  image: string;
};

export default function App() {
  // ---- Estado principal ----
  const [currentScreen, setCurrentScreen] = useState<'home' | 'profileEdit'>('home');
  const [profile, setProfile] = useState<Profile>({
    name: 'Demo Profile',
    description: 'Esta es una tarjeta de ejemplo mientras conectamos backend.',
    image: 'https://picsum.photos/400/300', // imagen de ejemplo
  });
  const [swipeIndex, setSwipeIndex] = useState(0);

  // ---- Swipe (simulado) ----
  const cards = [profile, profile, profile]; // simula varias tarjetas
  const swipeNext = () => {
    if (swipeIndex < cards.length - 1) setSwipeIndex(swipeIndex + 1);
    else alert('No hay más perfiles');
  };

  // ---- Guardar perfil en localStorage ----
  useEffect(() => {
    const storedProfile = localStorage.getItem('userProfile');
    if (storedProfile) setProfile(JSON.parse(storedProfile));
  }, []);

  const saveProfile = (newProfile: Profile) => {
    setProfile(newProfile);
    localStorage.setItem('userProfile', JSON.stringify(newProfile));
    setCurrentScreen('home');
  };

  return (
    <div style={{
      backgroundColor: '#4B001F', // bordeux
      minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px'
    }}>
      {currentScreen === 'home' && (
        <>
          {/* Header */}
          <div style={{width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <button onClick={() => alert('Salir de la app')} style={{
              background:'transparent',
              color:'#fff',
              fontSize:'1.5rem',
              border:'none',
              cursor:'pointer'
            }}>←</button>
            <h1>RealVibe 3.0</h1>
            <button onClick={() => setCurrentScreen('profileEdit')} style={{
              background:'transparent',
              color:'#fff',
              fontSize:'1.5rem',
              border:'none',
              cursor:'pointer'
            }}>⚙️</button>
          </div>

          <p>Swipes gratis: 9 | WLD: 0</p>

          {/* Tarjeta */}
          <div style={{
            background:'#fff',
            color:'#000',
            borderRadius:'20px',
            width:'90%',
            maxWidth:'400px',
            padding:'10px',
            textAlign:'center',
            marginTop:'10px',
            flexShrink:0
          }}>
            <img 
              src={cards[swipeIndex].image} 
              alt="profile" 
              style={{
                width:'100%',
                height:'250px',
                borderRadius:'15px',
                objectFit:'cover'
              }}
            />
            <h2>{cards[swipeIndex].name}</h2>
            <p>{cards[swipeIndex].description}</p>
          </div>

          {/* Botones de swipe */}
          <div style={{display:'flex', justifyContent:'center', gap:'10px', marginTop:'10px', flexWrap:'wrap'}}>
            <button onClick={swipeNext} style={{background:'#888', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Dislike</button>
            <button onClick={swipeNext} style={{background:'linear-gradient(90deg,#ff69b4,#8a2be2)', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Like</button>
            <button onClick={swipeNext} style={{background:'linear-gradient(90deg,#00bfff,#1e90ff)', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Super</button>
          </div>

          {/* Funciones premium */}
          <h2 style={{marginTop:'20px'}}>Funciones Premium</h2>
          <div style={{display:'flex', justifyContent:'center', gap:'10px', flexWrap:'wrap', marginTop:'10px'}}>
            <button style={{background:'orange', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Boost 1 WLD</button>
            <button style={{background:'gold', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Gold 10 WLD</button>
            <button style={{background:'#C0C0C0', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Platinum 25 WLD</button>
            <button style={{background:'cyan', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Diamond 40 WLD</button>
          </div>
        </>
      )}

      {currentScreen === 'profileEdit' && (
        <div style={{
          background:'#fff',
          color:'#000',
          borderRadius:'20px',
          width:'90%',
          maxWidth:'400px',
          padding:'20px',
          marginTop:'20px',
          textAlign:'center'
        }}>
          <h2>Editar Perfil</h2>
          <label>
            Nombre:
            <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          <label>
            Descripción:
            <textarea value={profile.description} onChange={(e) => setProfile({...profile, description:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          <label>
            URL de imagen:
            <input type="text" value={profile.image} onChange={(e) => setProfile({...profile, image:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px'}}>
            <button onClick={() => setCurrentScreen('home')} style={{padding:'10px 16px', borderRadius:'12px'}}>Cancelar</button>
            <button onClick={() => saveProfile(profile)} style={{padding:'10px 16px', borderRadius:'12px', background:'green', color:'#fff'}}>Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
    }
