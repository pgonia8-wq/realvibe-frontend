import React, { useState, useEffect } from 'react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';

// Cambia esto por tu wallet de prueba
const TREASURY_WALLET = '0xTU_DIRECCION_WALLET_AQUI';

const MAX_FREE_SWIPES_PER_DAY = 10;

type Message = {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
};

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [boostActive, setBoostActive] = useState(false);
  const [subscriptionLevel, setSubscriptionLevel] = useState<'none' | 'gold' | 'platinum' | 'diamond'>('none');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [freeSwipesLeft, setFreeSwipesLeft] = useState(MAX_FREE_SWIPES_PER_DAY);
  const [lastSwipeDate, setLastSwipeDate] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'chat'>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Hola! ¿Cómo estás?', sender: 'other', time: '02:45' },
    { id: 2, text: 'Bien, y tú?', sender: 'me', time: '02:46' },
  ]);

  // Cargar swipes desde localStorage
  useEffect(() => {
    const storedDate = localStorage.getItem('lastSwipeDate');
    const storedSwipes = localStorage.getItem('freeSwipesLeft');

    if (storedDate && storedSwipes) {
      const today = new Date().toDateString();
      if (storedDate === today) {
        setFreeSwipesLeft(Number(storedSwipes));
        setLastSwipeDate(storedDate);
      } else {
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
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;

    const newMsg: Message = {
      id: messages.length + 1,
      text: chatInput,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMsg]);
    setChatInput('');

    // Simular respuesta del otro (opcional, para testing)
    setTimeout(() => {
      const reply: Message = {
        id: messages.length + 2,
        text: '¡Genial! ¿Y tú qué tal?',
        sender: 'other',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, reply]);
    }, 1500);
  };

  if (currentScreen === 'chat') {
    return (
      <div style={{ 
        backgroundColor: '#6C1A36', 
        minHeight: '100vh', 
        color: '#fff', 
        display: 'flex', 
        flexDirection: 'column',
        padding: '15px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <button 
            onClick={() => setCurrentScreen('home')}
            style={{ background: 'transparent', color: '#fff', fontSize: '1.5rem', border: 'none' }}
          >
            ← Volver
          </button>
          <h2 style={{ margin: 0 }}>Chat con José</h2>
        </div>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '10px', 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '16px',
          marginBottom: '15px'
        }}>
          {messages.map(msg => (
            <div 
              key={msg.id}
              style={{
                marginBottom: '12px',
                display: 'flex',
                justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '20px',
                background: msg.sender === 'me' ? 'linear-gradient(90deg, #ff69b4, #8a2be2)' : '#444',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                {msg.text}
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: '50px',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '1rem'
            }}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            style={{
              padding: '14px 24px',
              background: 'linear-gradient(90deg, #ff69b4, #8a2be2)',
              borderRadius: '50px',
              border: 'none',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Enviar
          </button>
        </div>
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
          {/* Botones de pago - pequeños y con degradados */}
          <div style={{
            margin: '20px 0',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            maxWidth: '380px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <button
              onClick={doBoost}
              disabled={boostActive}
              style={{
                padding: '12px 8px',
                fontSize: '0.95rem',
                borderRadius: '12px',
                background: boostActive ? '#555' : 'linear-gradient(135deg, #ff8c00, #ff4500)',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                cursor: boostActive ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 10px rgba(255,140,0,0.3)'
              }}
            >
              🔥 Boost 1 WLD
            </button>

            <button
              onClick={doGold}
              disabled={subscriptionLevel !== 'none'}
              style={{
                padding: '12px 8px',
                fontSize: '0.95rem',
                borderRadius: '12px',
                background: subscriptionLevel === 'gold' ? '#555' : 'linear-gradient(135deg, #b8860b, #ffd700)',
                color: '#000',
                border: 'none',
                fontWeight: 'bold',
                cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 10px rgba(184,134,11,0.4)'
              }}
            >
              ⭐ Gold 10 WLD
            </button>

            <button
              onClick={doPlatinum}
              disabled={subscriptionLevel !== 'none'}
              style={{
                padding: '12px 8px',
                fontSize: '0.95rem',
                borderRadius: '12px',
                background: subscriptionLevel === 'platinum' ? '#555' : 'linear-gradient(135deg, #a9a9a9, #e0e0e0)',
                color: '#000',
                border: 'none',
                fontWeight: 'bold',
                cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 10px rgba(169,169,169,0.4)'
              }}
            >
              🏆 Platinum 25 WLD
            </button>

            <button
              onClick={doDiamond}
              disabled={subscriptionLevel !== 'none'}
              style={{
                padding: '12px 8px',
                fontSize: '0.95rem',
                borderRadius: '12px',
                background: subscriptionLevel === 'diamond' ? '#555' : 'linear-gradient(135deg, #7b1fa2, #ab47bc)',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer',
                boxShadow: '0 3px 10px rgba(123,31,162,0.4)'
              }}
            >
              💎 Diamond 40 WLD
            </button>
          </div>

          {/* Tarjeta perfil - grande */}
          <div style={{
            background: 'linear-gradient(135deg, #ff69b4, #8a2be2)',
            borderRadius: '24px',
            padding: '20px',
            margin: '0 auto 30px auto',
            maxWidth: '420px',
            boxShadow: '0 12px 35px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{ overflow: 'hidden', borderRadius: '18px', marginBottom: '15px' }}>
              <img 
                src="https://placekitten.com/450/600" 
                alt="Perfil" 
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            <h2 style={{ margin: '12px 0', fontSize: '1.7rem' }}>José</h2>
            <p style={{ margin: '8px 0', fontSize: '1.15rem' }}>Amante de la música</p>
            <p style={{ fontSize: '0.98rem', opacity: 0.9 }}>CDMX • 24 años</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '25px', marginTop: '30px' }}>
              <button 
                onClick={() => handleAction('dislike')}
                disabled={freeSwipesLeft <= 0 && !boostActive && subscriptionLevel === 'none'}
                style={{ 
                  padding: '14px 35px', 
                  background: '#555', 
                  borderRadius: '50px', 
                  color: '#fff', 
                  border: 'none', 
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
              >
                Dislike
              </button>
              <button 
                onClick={() => handleAction('like')}
                disabled={freeSwipesLeft <= 0 && !boostActive && subscriptionLevel === 'none'}
                style={{ 
                  padding: '14px 45px', 
                  background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', 
                  borderRadius: '50px', 
                  color: '#fff', 
                  border: 'none', 
                  fontSize: '1.1rem',
                  boxShadow: '0 4px 12px rgba(255,105,180,0.4)'
                }}
              >
                Like
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '20px', opacity: 0.8 }}>Próximamente: más perfiles y chat realtime</p>
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
