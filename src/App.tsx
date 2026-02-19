import React, { useState, useEffect } from 'react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';

// Cambia esto por tu wallet de prueba donde recibirás los pagos
const TREASURY_WALLET = '0xTU_DIRECCION_WALLET_AQUI';

const MAX_FREE_SWIPES_PER_DAY = 10;

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [boostActive, setBoostActive] = useState(false);
  const [subscriptionLevel, setSubscriptionLevel] = useState<'none' | 'gold' | 'platinum' | 'diamond'>('none');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [freeSwipesLeft, setFreeSwipesLeft] = useState(MAX_FREE_SWIPES_PER_DAY);
  const [lastSwipeDate, setLastSwipeDate] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'chat'>('home');

  // Cargar estado de swipes desde localStorage
  useEffect(() => {
    const storedDate = localStorage.getItem('lastSwipeDate');
    const storedSwipes = localStorage.getItem('freeSwipesLeft');

    if (storedDate && storedSwipes) {
      const today = new Date().toDateString();
      if (storedDate === today) {
        setFreeSwipesLeft(Number(storedSwipes));
        setLastSwipeDate(storedDate);
      } else {
        // Nuevo día → reset
        localStorage.setItem('lastSwipeDate', today);
        localStorage.setItem('freeSwipesLeft', MAX_FREE_SWIPES_PER_DAY.toString());
        setFreeSwipesLeft(MAX_FREE_SWIPES_PER_DAY);
        setLastSwipeDate(today);
      }
    } else {
      const today = new Date().toDateString();
      localStorage.setItem('lastSwipeDate', today);
      localStorage.setItem('freeSwipesLeft', MAX_FREE_SWIPES_PER_DAY.toString());
      setLastSwipeDate(today);
    }
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const connectWallet = async () => {
    if (!MiniKit.isInstalled()) {
      showToast('Abre esta app dentro de World App', 'error');
      return;
    }

    setLoading(true);
    try {
      const nonce = Math.random().toString(36).substring(2);
      const response = await MiniKit.commandsAsync.walletAuth({ nonce, statement: 'Conectar a RealVibe 3.0' });

      if (response.finalPayload.status === 'success') {
        const address = response.finalPayload.address;
        setWalletAddress(address);
        showToast('¡Conectado exitosamente!');
      } else {
        showToast('Conexión cancelada', 'error');
      }
    } catch (error) {
      showToast('Error al conectar', 'error');
    }
    setLoading(false);
  };

  const handlePayment = async (amount: number, type: string, desc: string) => {
    if (!walletAddress) return showToast('Conecta tu wallet primero', 'error');

    if (type !== 'boost' && subscriptionLevel !== 'none') {
      return showToast('Ya tienes una suscripción activa', 'error');
    }

    try {
      const payload = {
        reference: `\( {type}- \){Date.now()}`,
        to: TREASURY_WALLET,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(amount, Tokens.WLD).toString() }],
        description: desc + ' en RealVibe 3.0',
      };

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);

      if (finalPayload.status === 'success') {
        if (type === 'boost') {
          setBoostActive(true);
          showToast('¡Boost activado por 24 horas!');
        } else {
          setSubscriptionLevel(type as any);
          showToast(`¡Suscripción ${desc} activada!`);
        }
      } else {
        showToast('Pago cancelado', 'error');
      }
    } catch (error) {
      showToast('Error en el pago', 'error');
    }
  };

  const doBoost = () => handlePayment(1, 'boost', 'Boost 1 WLD');
  const doGold = () => handlePayment(10, 'gold', 'Gold');
  const doPlatinum = () => handlePayment(25, 'platinum', 'Platinum');
  const doDiamond = () => handlePayment(40, 'diamond', 'Diamond');

  const handleAction = (action: 'like' | 'dislike') => {
    if (freeSwipesLeft <= 0 && !boostActive && subscriptionLevel === 'none') {
      return showToast('Límite diario alcanzado. Usa Boost o suscripción', 'error');
    }

    if (!boostActive && subscriptionLevel === 'none') {
      const newSwipes = freeSwipesLeft - 1;
      setFreeSwipesLeft(newSwipes);
      localStorage.setItem('freeSwipesLeft', newSwipes.toString());
      localStorage.setItem('lastSwipeDate', new Date().toDateString());
    }

    showToast(`¡${action.toUpperCase()} enviado!`);
    // Próximo: guardar en Supabase y pasar perfil
  };

  if (currentScreen === 'chat') {
    return (
      <div style={{ backgroundColor: '#6C1A36', minHeight: '100vh', color: '#fff', padding: '20px' }}>
        <h2>Chat</h2>
        <p>Chat en desarrollo. Próximamente mensajes realtime.</p>
        <button 
          onClick={() => setCurrentScreen('home')}
          style={{ marginTop: '20px', padding: '12px 24px', background: 'pink', borderRadius: '50px', border: 'none', color: '#000' }}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#6C1A36',
      minHeight: '100vh',
      color: '#fff',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: '15px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          borderRadius: '50px',
          background: toastMessage.type === 'success' ? 'rgba(0,200,0,0.9)' : 'rgba(255,80,80,0.9)',
          color: '#fff',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}>
          {toastMessage.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button style={{ background: 'transparent', color: '#fff', fontSize: '1.8rem', border: 'none' }}>←</button>
        <h1 style={{ margin: 0, fontSize: '1.8rem' }}>RealVibe 3.0</h1>
        <button style={{ background: 'transparent', color: '#fff', fontSize: '1.8rem', border: 'none' }}>⚙️</button>
      </div>

      {walletAddress && (
        <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '0.95rem' }}>
          <p>Wallet: {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</p>
          <p>Swipes gratis hoy: {freeSwipesLeft} / {MAX_FREE_SWIPES_PER_DAY}</p>
          {subscriptionLevel !== 'none' && (
            <p style={{ color: '#ffd700', fontWeight: 'bold' }}>
              Suscripción activa: {subscriptionLevel.toUpperCase()}
            </p>
          )}
          {boostActive && <p style={{ color: '#ff8c00', fontWeight: 'bold' }}>Boost activo 24h 🔥</p>}
        </div>
      )}

      {!walletAddress ? (
        <div style={{ textAlign: 'center', marginTop: '120px' }}>
          <p>Conecta tu wallet para empezar</p>
          <button 
            onClick={connectWallet}
            disabled={loading}
            style={{
              marginTop: '25px',
              padding: '16px 50px',
              fontSize: '1.3rem',
              borderRadius: '50px',
              background: 'linear-gradient(90deg, #ff69b4, #8a2be2)',
              color: '#fff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Conectando...' : '🔗 Conectar Wallet'}
          </button>
        </div>
      ) : (
        <>
          {/* Botones de pago mejorados con iconos */}
          <div style={{
            margin: '25px 0',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            maxWidth: '380px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <button
              onClick={doBoost}
              disabled={boostActive}
              style={{
                padding: '16px',
                fontSize: '1.1rem',
                borderRadius: '16px',
                background: boostActive ? '#555' : '#ff8c00',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                cursor: boostActive ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(255,140,0,0.4)',
                transition: 'all 0.2s'
              }}
            >
              🔥 Boost 1 WLD
            </button>

            <button
              onClick={doGold}
              disabled={subscriptionLevel !== 'none'}
              style={{
                padding: '16px',
                fontSize: '1.1rem',
                borderRadius: '16px',
                background: subscriptionLevel === 'gold' ? '#555' : '#ffd700',
                color: '#000',
                border: 'none',
                fontWeight: 'bold',
                cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(255,215,0,0.4)',
                transition: 'all 0.2s'
              }}
            >
              ⭐ Gold 10 WLD
            </button>

            <button
              onClick={doPlatinum}
              disabled={subscriptionLevel !== 'none'}
              style={{
                padding: '16px',
                fontSize: '1.1rem',
                borderRadius: '16px',
                background: subscriptionLevel === 'platinum' ? '#555' : '#c0c0c0',
                color: '#000',
                border: 'none',
                fontWeight: 'bold',
                cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(192,192,192,0.4)',
                transition: 'all 0.2s'
              }}
            >
              🏆 Platinum 25 WLD
            </button>

            <button
              onClick={doDiamond}
              disabled={subscriptionLevel !== 'none'}
              style={{
                padding: '16px',
                fontSize: '1.1rem',
                borderRadius: '16px',
                background: subscriptionLevel === 'diamond' ? '#555' : '#00ffff',
                color: '#000',
                border: 'none',
                fontWeight: 'bold',
                cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0,255,255,0.3)',
                transition: 'all 0.2s'
              }}
            >
              💎 Diamond 40 WLD
            </button>
          </div>

          {/* Tarjeta perfil */}
          <div style={{
            background: 'linear-gradient(135deg, #ff69b4, #8a2be2)',
            borderRadius: '24px',
            padding: '20px',
            margin: '0 auto',
            maxWidth: '380px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            textAlign: 'center'
          }}>
            <img 
              src="https://placekitten.com/400/500" 
              alt="Perfil" 
              style={{ width: '100%', borderRadius: '16px', marginBottom: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}
            />
            <h2 style={{ margin: '10px 0', fontSize: '1.6rem' }}>José</h2>
            <p style={{ margin: '8px 0', fontSize: '1.1rem' }}>Amante de la música</p>
            <p style={{ fontSize: '0.95rem', opacity: 0.9 }}>CDMX • 24 años</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '25px' }}>
              <button 
                onClick={() => handleAction('dislike')}
                disabled={freeSwipesLeft <= 0 && !boostActive && subscriptionLevel === 'none'}
                style={{ padding: '14px 30px', background: '#555', borderRadius: '50px', color: '#fff', border: 'none', fontSize: '1.1rem' }}
              >
                Dislike
              </button>
              <button 
                onClick={() => handleAction('like')}
                disabled={freeSwipesLeft <= 0 && !boostActive && subscriptionLevel === 'none'}
                style={{ padding: '14px 40px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', borderRadius: '50px', color: '#fff', border: 'none', fontSize: '1.1rem' }}
              >
                Like
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '30px', opacity: 0.8 }}>Próximamente: más perfiles y chat realtime</p>
        </>
      )}

      {/* Botón Chat */}
      <button 
        onClick={() => setCurrentScreen('chat')}
        style={{
          position: 'fixed',
          bottom: '25px',
          right: '25px',
          background: 'linear-gradient(45deg, pink, #ff69b4)',
          color: '#000',
          padding: '16px 24px',
          borderRadius: '50px',
          fontWeight: 'bold',
          border: 'none',
          boxShadow: '0 5px 15px rgba(0,0,0,0.4)',
          zIndex: 1000
        }}
      >
        Chat
      </button>
    </div>
  );
}
