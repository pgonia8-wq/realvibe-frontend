/* src/App.tsx */
import React, { useState } from 'react';

interface Profile {
  id: string;
  name: string;
  bio: string;
  photo_url: string;
  tier?: string;
}

const profiles: Profile[] = [
  {
    id: '1',
    name: 'José',
    bio: 'Amante de la música y los viajes',
    photo_url: 'https://placekitten.com/400/400',
  },
  {
    id: '2',
    name: 'Josesito',
    bio: 'Fan del cine y el deporte',
    photo_url: 'https://placekitten.com/401/401',
  },
  // Agrega más perfiles aquí
];

const App: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSwipe = (type: string) => {
    alert(`${profiles[currentIndex].name} ${type}!`);
    const nextIndex = (currentIndex + 1) % profiles.length;
    setCurrentIndex(nextIndex);
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f0f2f5',
      flexDirection: 'column',
      padding: '10px'
    }}>
      {/* Header: Flecha y rueda */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <button style={{
          fontSize: '1.5rem',
          padding: '6px 12px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer'
        }} onClick={() => alert('Salir de la app')}>
          ←
        </button>
        <button style={{
          fontSize: '1.5rem',
          padding: '6px 12px',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer'
        }} onClick={() => alert('Ir al perfil')}>
          ⚙️
        </button>
      </div>

      {/* Tarjeta principal */}
      <div style={{
        width: '90%',
        maxWidth: '350px',
        background: 'linear-gradient(90deg,#ff69b4,#8a2be2)',
        borderRadius: '20px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 15px 25px rgba(0,0,0,0.2)',
      }}>
        <img
          src={currentProfile.photo_url}
          alt={currentProfile.name}
          style={{
            width: '260px',
            height: '260px',
            borderRadius: '15px',
            objectFit: 'cover',
            marginBottom: '10px'
          }}
        />
        <h2 style={{ color: '#fff', marginBottom: '5px' }}>{currentProfile.name}</h2>
        <p style={{ color: '#fff', fontSize: '0.9rem', textAlign: 'center', marginBottom: '15px' }}>{currentProfile.bio}</p>

        {/* Botones */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px',
        }}>
          <button
            style={{ background: 'linear-gradient(90deg,#ff69b4,#8a2be2)', color: '#fff', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => handleSwipe('Liked')}
          >
            Like
          </button>
          <button
            style={{ background: 'linear-gradient(90deg,#a3a3a3,#6b6b6b)', color: '#fff', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => handleSwipe('Disliked')}
          >
            Dislike
          </button>
          <button
            style={{ background: 'linear-gradient(90deg,#00bfff,#1e90ff)', color: '#fff', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => handleSwipe('Superliked')}
          >
            Superlike
          </button>
          <button
            style={{ background: 'linear-gradient(90deg,#ffd700,#ffb700)', color: '#fff', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => handleSwipe('Gold')}
          >
            Gold
          </button>
          <button
            style={{ background: 'linear-gradient(90deg,#e5e4e2,#c0c0c0)', color: '#fff', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => handleSwipe('Platinum')}
          >
            Platinum
          </button>
          <button
            style={{ background: 'linear-gradient(90deg,#b9f2ff,#00ced1)', color: '#fff', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => handleSwipe('Diamond')}
          >
            Diamond
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
