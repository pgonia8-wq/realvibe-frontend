import React, { useState, useEffect, useRef } from 'react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bogcdpwnnjxfgfdcewif.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZ2NkcHdubmp4ZmdmZGNld2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTM2MjgsImV4cCI6MjA4Njg2OTYyOH0.65pFiqgEmjogf73mZCG-yT2BZqx6Q8cbA_Ce9RhnIhQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TREASURY_WALLET = '0xdf4a991bc05945bd0212e773adcff6ea619f4c4b';

const MAX_FREE_SWIPES_PER_DAY = 10;
const TEST_MATCH_ID = '17';

type Message = {
  id: number | string;
  text: string;
  sender: 'me' | 'other';
  time: string;
};

const INITIAL_MESSAGES: Message[] = [
  { id: 1, text: 'Hola! ¿Cómo estás?', sender: 'other', time: '02:45' },
  { id: 2, text: 'Bien, y tú?', sender: 'me', time: '02:46' },
];

export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [boostActive, setBoostActive] = useState(false);
  const [subscriptionLevel, setSubscriptionLevel] = useState<'none' | 'gold' | 'platinum' | 'diamond'>('none');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [freeSwipesLeft, setFreeSwipesLeft] = useState(MAX_FREE_SWIPES_PER_DAY);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'chat'>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Swipes gratis
  useEffect(() => {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('lastSwipeDate');
    const storedSwipes = localStorage.getItem('freeSwipesLeft');

    if (storedDate === today && storedSwipes) {
      setFreeSwipesLeft(Number(storedSwipes));
    } else {
      localStorage.setItem('lastSwipeDate', today);
      localStorage.setItem('freeSwipesLeft', MAX_FREE_SWIPES_PER_DAY.toString());
      setFreeSwipesLeft(MAX_FREE_SWIPES_PER_DAY);
    }
  }, []);

  // Boost expiration
  useEffect(() => {
    if (!boostActive || !walletAddress) return;
    const checkBoost = async () => {
      const { data } = await supabase.from('user_status').select('boost_until').eq('wallet_address', walletAddress).maybeSingle();
      if (data?.boost_until && new Date(data.boost_until) <= new Date()) {
        setBoostActive(false);
        await supabase.from('user_status').update({ boost_until: null }).eq('wallet_address', walletAddress);
      }
    };
    checkBoost();
    const interval = setInterval(checkBoost, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [boostActive, walletAddress]);

  // Load messages + realtime
  useEffect(() => {
    if (currentScreen !== 'chat' || !walletAddress) return;

    const loadMessages = async () => {
      setIsLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', TEST_MATCH_ID)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(error);
        showToast('Error al cargar chat', 'error');
      } else if (data && data.length > 0) {
        const mapped = data.map((msg: any) => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender_id === walletAddress ? 'me' : 'other',
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(mapped);
      }
      // Si no hay mensajes en DB → mantenemos los INITIAL_MESSAGES
      setIsLoadingMessages(false);
    };

    loadMessages();

    const channel = supabase
      .channel(`messages:${TEST_MATCH_ID}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${TEST_MATCH_ID}`
      }, (payload) => {
        const newMsg = payload.new as any;
        setMessages(prev => {
          const alreadyExists = prev.some(m =>
            m.text === newMsg.text &&
            Math.abs(new Date(m.time).getTime() - new Date(newMsg.created_at).getTime()) < 8000
          );
          if (alreadyExists) return prev;

          return [...prev, {
            id: newMsg.id,
            text: newMsg.text,
            sender: newMsg.sender_id === walletAddress ? 'me' : 'other',
            time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }];
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentScreen, walletAddress]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persistencia boost y suscripción
  const saveBoost = async (wallet: string) => {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('user_status').upsert({ wallet_address: wallet, boost_until: expires, updated_at: new Date().toISOString() }, { onConflict: 'wallet_address' });
  };

  const saveSubscription = async (wallet: string, level: 'gold' | 'platinum' | 'diamond') => {
    await supabase.from('user_status').upsert({ wallet_address: wallet, subscription: level, subscription_since: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'wallet_address' });
  };

  const loadUserStatus = async (wallet: string) => {
    const { data } = await supabase.from('user_status').select('subscription, boost_until').eq('wallet_address', wallet).maybeSingle();
    if (!data) return;
    if (data.subscription) setSubscriptionLevel(data.subscription);
    if (data.boost_until && new Date(data.boost_until) > new Date()) setBoostActive(true);
  };

  const connectWallet = async () => {
    if (!MiniKit.isInstalled()) return showToast('Abre esta app dentro de World App', 'error');
    setLoading(true);
    try {
      const nonce = Math.random().toString(36).substring(2);
      const response = await MiniKit.commandsAsync.walletAuth({ nonce, statement: 'Conectar a RealVibe 3.0' });
      if (response.finalPayload.status === 'success') {
        const address = response.finalPayload.address;
        setWalletAddress(address);
        await loadUserStatus(address);
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
    if (type !== 'boost' && subscriptionLevel !== 'none') return showToast('Ya tienes una suscripción activa', 'error');

    try {
      const payload = {
        reference: `\( {type}- \){Date.now()}`,
        to: TREASURY_WALLET,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(amount, Tokens.WLD).toString() }],
        description: `${desc} en RealVibe 3.0`,
      };

      const { finalPayload } = await MiniKit.commandsAsync.pay(payload);
      if (finalPayload.status === 'success') {
        if (type === 'boost') {
          await saveBoost(walletAddress);
          setBoostActive(true);
          showToast('¡Boost activado por 24 horas!');
        } else {
          await saveSubscription(walletAddress, type as any);
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

  // Envío optimista + rollback
  const sendMessage = async () => {
    if (!chatInput.trim() || !walletAddress || isSending) return;

    const messageText = chatInput.trim();
    const optimisticId = 'temp-' + Date.now();
    const optimisticMsg: Message = {
      id: optimisticId,
      text: messageText,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setChatInput('');
    setIsSending(true);

    try {
      const { data, error } = await supabase.from('messages').insert({ match_id: TEST_MATCH_ID, sender_id: walletAddress, text: messageText }).select().single();
      if (error) throw error;

      setMessages(prev => prev.map(m => m.id === optimisticId ? { ...m, id: data.id } : m));
      showToast('Mensaje enviado', 'success');
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      showToast('No se pudo enviar el mensaje', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // ======================= CHAT SCREEN =======================
  if (currentScreen === 'chat') {
    return (
      <div style={{ backgroundColor: '#6C1A36', minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column', padding: '15px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <button onClick={() => setCurrentScreen('home')} style={{ background: 'transparent', color: '#fff', fontSize: '1.5rem', border: 'none' }}>← Volver</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #ff69b4, #8a2be2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>👤</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem' }}>José</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#4ade80' }}>● En línea</p>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', background: 'rgba(0,0,0,0.25)', borderRadius: '16px', marginBottom: '15px' }}>
          {isLoadingMessages ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#aaa' }}>Cargando mensajes...</div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} style={{ margin: '10px 15px', display: 'flex', justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start' }}>
                {msg.sender === 'other' && (
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff69b4, #8a2be2)', marginRight: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>👤</div>
                )}
                <div style={{ maxWidth: '72%', padding: '12px 16px', borderRadius: msg.sender === 'me' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', background: msg.sender === 'me' ? 'linear-gradient(90deg, #ff69b4, #8a2be2)' : 'rgba(255,255,255,0.12)', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                  {msg.text}
                  <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '6px', textAlign: msg.sender === 'me' ? 'right' : 'left' }}>{msg.time}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            style={{ flex: 1, padding: '14px 18px', borderRadius: '50px', border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '1rem', outline: 'none' }}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
            disabled={isSending}
          />
          <button
            onClick={sendMessage}
            disabled={isSending || !chatInput.trim()}
            style={{ padding: '14px 24px', background: isSending ? '#555' : 'linear-gradient(90deg, #ff69b4, #8a2be2)', borderRadius: '50px', border: 'none', color: '#fff', fontWeight: 'bold', cursor: isSending ? 'not-allowed' : 'pointer' }}
          >
            {isSending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    );
  }

  // ======================= HOME SCREEN =======================
  return (
    <div style={{ backgroundColor: '#6C1A36', minHeight: '100vh', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '15px', boxSizing: 'border-box', position: 'relative' }}>
      {toastMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: '50px', background: toastMessage.type === 'success' ? 'rgba(0,200,0,0.9)' : 'rgba(255,80,80,0.9)', color: '#fff', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
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
          {subscriptionLevel !== 'none' && <p style={{ color: '#ffd700', fontWeight: 'bold' }}>Suscripción: {subscriptionLevel.toUpperCase()}</p>}
          {boostActive && <p style={{ color: '#ff8c00', fontWeight: 'bold' }}>Boost activo 24h 🔥</p>}
        </div>
      )}

      {!walletAddress ? (
        <div style={{ textAlign: 'center', marginTop: '120px' }}>
          <p>Conecta tu wallet para empezar</p>
          <button onClick={connectWallet} disabled={loading} style={{ marginTop: '25px', padding: '16px 50px', fontSize: '1.3rem', borderRadius: '50px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Conectando...' : '🔗 Conectar Wallet'}
          </button>
        </div>
      ) : (
        <>
          <div style={{ margin: '20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
            <button onClick={doBoost} disabled={boostActive} style={{ padding: '12px 8px', fontSize: '0.95rem', borderRadius: '12px', background: boostActive ? '#555' : 'linear-gradient(135deg, #ff8c00, #ff4500)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: boostActive ? 'not-allowed' : 'pointer' }}>🔥 Boost 1 WLD</button>
            <button onClick={doGold} disabled={subscriptionLevel !== 'none'} style={{ padding: '12px 8px', fontSize: '0.95rem', borderRadius: '12px', background: subscriptionLevel === 'gold' ? '#555' : 'linear-gradient(135deg, #b8860b, #ffd700)', color: '#000', border: 'none', fontWeight: 'bold', cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer' }}>⭐ Gold 10 WLD</button>
            <button onClick={doPlatinum} disabled={subscriptionLevel !== 'none'} style={{ padding: '12px 8px', fontSize: '0.95rem', borderRadius: '12px', background: subscriptionLevel === 'platinum' ? '#555' : 'linear-gradient(135deg, #a9a9a9, #e0e0e0)', color: '#000', border: 'none', fontWeight: 'bold', cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer' }}>🏆 Platinum 25 WLD</button>
            <button onClick={doDiamond} disabled={subscriptionLevel !== 'none'} style={{ padding: '12px 8px', fontSize: '0.95rem', borderRadius: '12px', background: subscriptionLevel === 'diamond' ? '#555' : 'linear-gradient(135deg, #7b1fa2, #ab47bc)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: subscriptionLevel !== 'none' ? 'not-allowed' : 'pointer' }}>💎 Diamond 40 WLD</button>
          </div>

          {/* Perfil actual */}
          <div style={{ background: 'linear-gradient(135deg, #ff69b4, #8a2be2)', borderRadius: '24px', padding: '20px', margin: '0 auto 30px auto', maxWidth: '420px', boxShadow: '0 12px 35px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            <div style={{ overflow: 'hidden', borderRadius: '18px', marginBottom: '15px' }}>
              <img src="https://placekitten.com/450/600" alt="Perfil" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
            <h2 style={{ margin: '12px 0', fontSize: '1.7rem' }}>José</h2>
            <p style={{ margin: '8px 0', fontSize: '1.15rem' }}>Amante de la música</p>
            <p style={{ fontSize: '0.98rem', opacity: 0.9 }}>CDMX • 24 años</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '25px', marginTop: '30px' }}>
              <button onClick={() => handleAction('dislike')} disabled={freeSwipesLeft <= 0 && !boostActive && subscriptionLevel === 'none'} style={{ padding: '14px 35px', background: '#555', borderRadius: '50px', color: '#fff', border: 'none', fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>Dislike</button>
              <button onClick={() => handleAction('like')} disabled={freeSwipesLeft <= 0 && !boostActive && subscriptionLevel === 'none'} style={{ padding: '14px 45px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', borderRadius: '50px', color: '#fff', border: 'none', fontSize: '1.1rem', boxShadow: '0 4px 12px rgba(255,105,180,0.4)' }}>Like</button>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '20px', opacity: 0.8 }}>Próximamente: más perfiles y matching real</p>
        </>
      )}

      <button onClick={() => setCurrentScreen('chat')} style={{ position: 'fixed', bottom: '25px', right: '25px', background: 'linear-gradient(45deg, pink, #ff69b4)', color: '#000', padding: '16px 24px', borderRadius: '50px', fontWeight: 'bold', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.4)', zIndex: 1000 }}>💬 Chat</button>
    </div>
  );
    }
