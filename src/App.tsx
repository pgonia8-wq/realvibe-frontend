import React, { useState, useEffect } from 'react';

// Perfil de tarjeta
type Profile = {
  name: string;
  description: string;
  image: string;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'profileEdit'>('home');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const [profile, setProfile] = useState<Profile>({
    name: 'Demo Profile',
    description: 'Amante de la música y los viajes',
    image: 'https://picsum.photos/400/400',
  });

  const cards: Profile[] = [
    { name: 'Alex', description: 'Aventurero y divertido', image: 'https://placekitten.com/400/400' },
    { name: 'José', description: 'Amante de la música', image: 'https://placekitten.com/401/400' },
    { name: 'Josesito', description: 'Fan del cine', image: 'https://placekitten.com/402/400' },
  ];

  // Cargar perfil guardado
  useEffect(() => {
    const storedProfile = localStorage.getItem('userProfile');
    if (storedProfile) setProfile(JSON.parse(storedProfile));
  }, []);

  // Guardar perfil
  const saveProfile = (newProfile: Profile) => {
    setProfile(newProfile);
    localStorage.setItem('userProfile', JSON.stringify(newProfile));
    setCurrentScreen('home');
  };

  // Swipe animado
  const handleSwipe = (direction: 'left' | 'right') => {
    if (isSwiping) return; // prevenir doble click
    setSwipeDirection(direction);
    setIsSwiping(true);
    setTimeout(() => {
      setSwipeIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
      setIsSwiping(false);
      setSwipeDirection(null);
    }, 300); // duración animación
  };

  return (
    <div style={{
      backgroundColor: '#6C1A36', // bordeux
      minHeight:'100vh',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color:'#fff',
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      padding:'10px'
    }}>
      {currentScreen === 'home' && (
        <>
          {/* Header */}
          <div style={{width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
            <button onClick={() => alert('Salir de la app')} style={{background:'transparent', color:'#fff', fontSize:'1.5rem', border:'none', cursor:'pointer'}}>←</button>
            <h1 style={{margin:0}}>RealVibe 3.0</h1>
            <button onClick={()=>setCurrentScreen('profileEdit')} style={{background:'transparent', color:'#fff', fontSize:'1.5rem', border:'none', cursor:'pointer'}}>⚙️</button>
          </div>

          <p style={{margin:'5px 0'}}>Swipes gratis: 9 | WLD: 0</p>

          {/* Tarjeta con swipe */}
          <div style={{
            width:'90%',
            maxWidth:'400px',
            minHeight:'480px',
            position:'relative',
            display:'flex',
            justifyContent:'center',
            alignItems:'center'
          }}>
            {cards.slice(swipeIndex).map((card, idx) => {
              const isTop = idx === 0;
              return (
                <div key={card.name} style={{
                  background:'#fff',
                  color:'#000',
                  borderRadius:'20px',
                  width:'100%',
                  padding:'10px',
                  position:isTop ? 'relative' : 'absolute',
                  top:0,
                  left:0,
                  right:0,
                  bottom:0,
                  zIndex: cards.length - idx,
                  textAlign:'center',
                  transition:'transform 0.3s ease',
                  transform: isTop
                    ? swipeDirection === 'left'
                      ? 'translateX(-150%) rotate(-15deg)'
                      : swipeDirection === 'right'
                      ? 'translateX(150%) rotate(15deg)'
                      : 'translateX(0)'
                    : 'scale(0.95)',
                }}>
                  <img 
                    src={card.image || 'https://picsum.photos/400/400'} 
                    alt={card.name} 
                    style={{
                      width:'90%',
                      height:'300px',
                      borderRadius:'15px',
                      objectFit:'cover',
                      margin:'10px auto',
                    }}
                  />
                  <h2>{card.name}</h2>
                  <p>{card.description}</p>

                  {isTop && (
                    <div style={{display:'flex', justifyContent:'center', gap:'10px', flexWrap:'wrap', marginTop:'10px'}}>
                      <button onClick={()=>handleSwipe('left')} style={{background:'#888', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Dislike</button>
                      <button onClick={()=>handleSwipe('right')} style={{background:'linear-gradient(90deg,#ff69b4,#8a2be2)', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Like</button>
                      <button onClick={()=>handleSwipe('right')} style={{background:'linear-gradient(90deg,#00bfff,#1e90ff)', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Super</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Pantalla de edición de perfil */}
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
          <label style={{display:'block', margin:'5px 0'}}>
            Nombre:
            <input type="text" value={profile.name} onChange={(e)=>setProfile({...profile,name:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          <label style={{display:'block', margin:'5px 0'}}>
            Descripción:
            <textarea value={profile.description} onChange={(e)=>setProfile({...profile,description:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          <label style={{display:'block', margin:'5px 0'}}>
            URL de imagen:
            <input type="text" value={profile.image} onChange={(e)=>setProfile({...profile,image:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px'}}>
            <button onClick={()=>setCurrentScreen('home')} style={{padding:'10px 16px', borderRadius:'12px'}}>Cancelar</button>
            <button onClick={()=>saveProfile(profile)} style={{padding:'10px 16px', borderRadius:'12px', background:'green', color:'#fff'}}>Guardar</button>
          </div>
        </div>
      )}
    </div>
  );
}
