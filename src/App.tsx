import React, { useState, useEffect } from 'react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';

// Cambia esto por tu wallet de prueba donde recibirás los pagos (crea una nueva si no quieres usar la principal)
const TREASURY_WALLET = '0xTU_DIRECCION_WALLET_AQUI'; // Ejemplo: '0x1234567890abcdef1234567890abcdef12345678'

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [boostActive, setBoostActive] = useState(false);
  const [subscriptionLevel, setSubscriptionLevel] = useState<'none' | 'gold' | 'platinum' | 'diamond'>('none');

  // Función para conectar wallet
  const connectWallet = async () => {
    if (!MiniKit.isInstalled()) {
      alert('Abre esta app dentro de World App para conectar tu wallet. ¡Descárgala si no la tienes!');
      return;
    }

    setLoading(true);
    try {
      // Nonce simple para pruebas
      const nonce = Math.random().toString(36).substring(2);

      const response = await MiniKit.commandsAsync.walletAuth({
        nonce,
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
      alert('Error al conectar: ' + (error instanceof Error ? error.message : 'Desconocido'));
      console.error(error);
    }
    setLoading(false);
  };

  // Función común para todos los pagos
  const handlePayment = async (amount: number, type: string, desc: string) => {
    if (!walletAddress) return alert('Conecta tu wallet primero');

    // Para Boost no bloqueamos por suscripción, pero para Gold/Platinum/Diamond sí
    if (type !== 'boost' && subscriptionLevel !== 'none') {
      return alert('Ya tienes una suscripción activa');
    }

    try {
      const payload = {
        reference: `\( {type}- \){Date.now()}`,
        to: TREASURY_WALLET,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(amount, Tokens.WLD).toString(),
          },
        ],
        description: desc + ' en RealVibe 3.0',
      };

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);

      if (finalPayload.status === 'success') {
        if (type === 'boost') {
          setBoostActive(true);
          alert('¡Pago exitoso! Boost activado por 24 horas 🎉');
        } else {
          setSubscriptionLevel(type as 'gold' | 'platinum' | 'diamond');
          alert(`¡Pago exitoso! Suscripción ${desc} activada 💎`);
        }
        // Más adelante: guardar en Supabase
      } else {
        alert('Pago cancelado o fallido');
      }
    } catch (error) {
      alert('Error en el pago: ' + (error instanceof Error ? error.message : 'Desconocido'));
      console.error(error);
    }
  };

  const doBoost = () => handlePayment(1, 'boost', 'Boost 1 WLD');
  const doGold = () => handlePayment(10, 'gold', 'Gold');
  const doPlatinum = () => handlePayment(25, 'platinum', 'Platinum');
  const doDiamond = () => handlePayment(40, 'diamond', 'Diamond');

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
        <div style={{textAlign: 'center', marginTop: '50px', width: '100%', maxWidth: '400px'}}>
          <p>¡Conectado! Wallet: {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</p>

          {/* Botones de pago */}
          <div style={{ marginTop: '30px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px' }}>
            <button
              onClick={doBoost}
              disabled={boostActive}
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                borderRadius: '50px',
                background: boostActive ? '#888' : 'orange',
                color: boostActive ? '#fff' : '#000',
                border: 'none',
                cursor: boostActive ? 'not-allowed' : 'pointer'
              }}
            >
              {boostActive ? 'Boost Activo 24h' : 'Boost 1 WLD'}
            </button>

            <button
              onClick={doGold}
              disabled={subscriptionLevel !== 'none'}
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                borderRadius: '50px',
                background: subscriptionLevel === 'gold' ? '#888' : 'gold',
                color: '#000',
                border: 'none',
                cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer'
              }}
            >
              {subscriptionLevel === 'gold' ? 'Gold Activo' : 'Gold 10 WLD'}
            </button>

            <button
              onClick={doPlatinum}
              disabled={subscriptionLevel !== 'none'}
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                borderRadius: '50px',
                background: subscriptionLevel === 'platinum' ? '#888' : 'silver',
                color: '#000',
                border: 'none',
                cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer'
              }}
            >
              {subscriptionLevel === 'platinum' ? 'Platinum Activo' : 'Platinum 25 WLD'}
            </button>

            <button
              onClick={doDiamond}
              disabled={subscriptionLevel !== 'none'}
              style={{
                padding: '12px 24px',
                fontSize: '1rem',
                borderRadius: '50px',
                background: subscriptionLevel === 'diamond' ? '#888' : 'cyan',
                color: '#000',
                border: 'none',
                cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer'
              }}
            >
              {subscriptionLevel === 'diamond' ? 'Diamond Activo' : 'Diamond 40 WLD'}
            </button>
          </div>

          {/* Tarjeta de ejemplo */}
          <div style={{
            background: 'linear-gradient(90deg, #ff69b4, #8a2be2)',
            borderRadius: '20px',
            padding: '20px',
            margin: '30px auto',
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

          <p>Próximamente: perfiles reales, swipe y chat</p>
        </div>
      )}

      {/* Botón Chat flotante */}
      <button style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'pink',
        color: '#000',
        padding: '12px 16px',
        borderRadius: '50px',
        fontWeight: '700',
        border: 'none',
        zIndex: 1000
      }}>
        Chat
      </button>
    </div>
  );
}
