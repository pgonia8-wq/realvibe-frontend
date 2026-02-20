import React from 'react';

export default function RealVibeApp() {
  return (
    <div style={{
      background: '#6C1A36',
      minHeight: '100vh',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2rem',
      textAlign: 'center',
      padding: '20px',
    }}>
      <h1>¡APP CARGADA!</h1>
      <p style={{ marginTop: '20px', fontSize: '1.2rem' }}>
        Si ves esto → React está funcionando.<br />
        El problema está en la lógica condicional o en un useEffect que crashea.
      </p>
      <p style={{ marginTop: '40px', opacity: 0.7 }}>
        Abre la consola (F12) y copia cualquier error rojo que veas.
      </p>
    </div>
  );
}
