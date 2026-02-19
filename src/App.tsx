import React, { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);useEffect(() => {
  const checkMiniKit = () => {
    if (MiniKit.isInstalled()) {
      alert('MiniKit DETECTADO correctamente! Puedes conectar.');
    } else {
      alert('MiniKit NO detectado aún... reintentando en 3s');
      setTimeout(checkMiniKit, 3000); // reintenta cada 3 segundos
    }
  };

  checkMiniKit(); // inicia el chequeo
}, []);
  
  

    
  


  // Función para conectar wallet
  const connectWallet = async () => {
    if (!MiniKit.isInstalled()) {
      alert('Abre esta app dentro de World App para conectar tu wallet. ¡Descárgala si no la tienes!');
      return;
    }

    setLoading(true);
    try {
      // Nonce simple para pruebas (en producción usa backend)
      const nonce = Math.random().toString(36).substring(2);

      const response = await MiniKit.commandsAsync.walletAuth({
        nonce: nonce,
        statement: 'Conectar a RealVibe 3.0',
      });

      if (response.finalPayload.status === 'success') {
        const address = response.finalPayload.address;
        setWalletAddress(address);
        alert('¡Conectado! Tu wallet: ' + address.slice(0,6) + '...' + address.slice(-4));
      } else {
        alert('Conexión cancelada o fallida');
      }
    } catch (error) {
      console.error(error);
      alert('Error al conectar: ' + (error instanceof Error ? error.message : 'Desconocido'));
    }
    setLoading(false);
  };

  return (
    <div style={{
      backgroundColor: '#6C1A36',
      minHeight: '100vh',
      color: '#fff',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '10px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div style={{width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
        <button style={{background: 'transparent', color: '#fff', fontSize: '1.5rem', border: 'none'}}>←</button>
        <h1 style={{margin: 0}}>RealVibe 3.0</h1>
        <button style={{background: 'transparent', color: '#fff', fontSize: '1.5rem', border: 'none'}}>⚙️</button>
      </div>

      {!walletAddress ? (
        <div style={{textAlign: 'center', marginTop: '100px'}}>
          <p>Conecta tu wallet de World App para empezar</p>
          <button 
            onClick={connectWallet}
            disabled={loading}
            style={{
              padding: '15px 40px',
              fontSize: '1.2rem',
              borderRadius: '50px',
              background: 'linear-gradient(90deg, #ff69b4, #8a2be2)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            {loading ? 'Conectando...' : '🔗 Conectar Wallet'}
          </button>
        </div>
      ) : (
        <div style={{textAlign: 'center', marginTop: '50px'}}>
          <p>¡Conectado! Wallet: {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</p>
          <p>Ahora puedes swipear perfiles (próximamente con datos reales)</p>

          {/* Tarjeta de ejemplo para que se vea familiar */}
          <div style={{
            background: 'linear-gradient(90deg, #ff69b4, #8a2be2)',
            borderRadius: '20px',
            padding: '20px',
            margin: '30px auto',
            maxWidth: '350px',
            textAlign: 'center'
          }}>
            <img 
              src="https://placekitten.com/300/300" 
              alt="José" 
              style={{width: '100%', borderRadius: '15px', marginBottom: '10px'}}
            />
            <h2>José</h2>
            <p>Amante de la música</p>
            <div style={{display: 'flex', justifyContent: 'center', gap: '10px', margin: '20px 0'}}>
              <button style={{padding: '10px 20px', background: '#888', borderRadius: '12px', color: '#fff', border: 'none'}}>Dislike</button>
              <button style={{padding: '10px 20px', background: 'linear-gradient(#ff69b4,#8a2be2)', borderRadius: '12px', color: '#fff', border: 'none'}}>Like</button>
            </div>
          </div>

          <p>Boost y chat vendrán en el siguiente paso</p>
        </div>
      )}

      {/* Botón Chat flotante como antes */}
      <button style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'pink',
        color: '#000',
        padding: '12px 16px',
        borderRadius: '50px',
        fontWeight: '700',
        border: 'none'
      }}>
        Chat
      </button>
    </div>
  );
}
