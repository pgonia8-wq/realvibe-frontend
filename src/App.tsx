import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { createClient } from '@supabase/supabase-js';

// 1. CORRECCIÓN: Agregamos valores por defecto ('') para evitar que falle al cargar si no encuentra las variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 2. CORRECCIÓN: Solo inicializamos el cliente si existen las credenciales, previniendo el crasheo de "pantalla en blanco"
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

const TREASURY_WALLET = '0xdf4a991bc05945bd0212e773adcff6ea619f4c4b';
const MAX_FREE_SWIPES_PER_DAY = 10;

type SubscriptionLevel = 'none' | 'gold' | 'platinum' | 'diamond';

type Message = {
  id: number | string;
  text: string;
  sender: 'me' | 'other';
  time: string;
};

type PotentialProfile = {
  id: number;
  name: string;
  age: number;
  bio: string;
  location: string;
  image: string;
  wallet: string;
};

type MyMatch = {
  matchId: number;
  otherName: string;
  otherWallet: string;
  otherImage: string;
};

const POTENTIAL_PROFILES: PotentialProfile[] = [
  // Pon aquí tus perfiles de prueba (los que tenías antes)
  {
    id: 1,
    name: 'José',
    age: 24,
    bio: 'Amante de la música electrónica y los tacos al pastor 🌮',
    location: 'CDMX',
    image: 'https://picsum.photos/id/64/450/600',
    wallet: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  // ... agrega los demás perfiles que tenías
];

export default function RealVibeApp() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [subscriptionLevel, setSubscriptionLevel] = useState<SubscriptionLevel>('none');
  const [boostActive, setBoostActive] = useState(false);
  const [freeSwipesLeft, setFreeSwipesLeft] = useState(MAX_FREE_SWIPES_PER_DAY);

  const [myMatches, setMyMatches] = useState<MyMatch[]>([]);
  const [discoverIndex, setDiscoverIndex] = useState(0);

  const [currentScreen, setCurrentScreen] = useState<'home' | 'chat'>('home');
  const [currentMatchId, setCurrentMatchId] = useState<number | null>(null);
  const [currentOtherName, setCurrentOtherName] = useState('');
  const [currentOtherImage, setCurrentOtherImage] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Swipe states
  const [dragX, setDragX] = useState(0);
  const [dragRot, setDragRot] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showLike, setShowLike] = useState(false);
  const [showDislike, setShowDislike] = useState(false);

  const touchStartX = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const availableProfiles = useMemo(() => {
    const matched = new Set(myMatches.map(m => m.otherWallet));
    return POTENTIAL_PROFILES.filter(p => !matched.has(p.wallet));
  }, [myMatches]);

  const currentProfile = useMemo(() => {
    if (availableProfiles.length === 0) return null;
    return availableProfiles[discoverIndex % availableProfiles.length];
  }, [availableProfiles, discoverIndex]);

  useEffect(() => {
    MiniKit.install();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('walletAddress');
    if (stored) setWalletAddress(stored);
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    // Aquí cargarías loadEverything() si lo tienes
  }, [walletAddress]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2800);
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
        localStorage.setItem('walletAddress', address);
        showToast('Wallet conectada correctamente ✅', 'success');
      } else {
        showToast('Conexión cancelada', 'error');
      }
    } catch (err) {
      showToast('Error al conectar wallet', 'error');
    }
    setLoading(false);
  };

  const handlePayment = async (amount: number, label: string, level?: SubscriptionLevel) => {
    if (!walletAddress) return showToast('Conecta tu wallet primero', 'error');

    try {
      const { finalPayload } = await MiniKit.commandsAsync.pay({
        // 3. CORRECCIÓN: Se corrigió la sintaxis inválida a la correcta de JavaScript: ${...}
        reference: `${label.toLowerCase()}-${Date.now()}`,
        to: TREASURY_WALLET,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(amount, Tokens.WLD).toString() }],
        description: `${label} en RealVibe 3.0`,
      });

      if (finalPayload.status === 'success') {
        if (label === 'Boost') setBoostActive(true);
        else if (level) setSubscriptionLevel(level);
        showToast(`${label} activado correctamente 🎉`, 'success');
      } else {
        showToast('Pago cancelado', 'error');
      }
    } catch (err) {
      showToast('Error en el pago', 'error');
    }
  };

  const doBoost = () => handlePayment(1, 'Boost');
  const doGold = () => handlePayment(10, 'Gold', 'gold');
  const doPlatinum = () => handlePayment(25, 'Platinum', 'platinum');
  const doDiamond = () => handlePayment(40, 'Diamond', 'diamond');

  const sendMessage = async () => {
    if (!chatInput.trim() || !walletAddress || !currentMatchId) return;

    if (!supabase) {
      showToast('Error de conexión a la base de datos', 'error');
      return;
    }

    const text = chatInput.trim();
    setChatInput('');

    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      text,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, optimistic]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: currentMatchId,
          sender_id: walletAddress,
          text,
        })
        .select()
        .single();

      if (error) throw error;

      // Recargamos toda la lista para asegurar persistencia
      const { data: refreshed } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', currentMatchId)
        .order('created_at', { ascending: true });

      if (refreshed) {
        const mapped = refreshed.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender_id === walletAddress ? 'me' : 'other',
          time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(mapped);
      }

      showToast('Mensaje enviado', 'success');
    } catch (err) {
      console.error('Error al enviar:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      showToast('No se pudo enviar el mensaje', 'error');
    }
  };

  // Tu lógica de swipe, handleAction, openChat, etc. se mantiene igual
  // (copia aquí el resto de tu código anterior para handleTouchStart, handleAction, etc.)

  if (currentScreen === 'chat') {
    return (
      <div style={{ backgroundColor: '#6C1A36', minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column', padding: '15px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <button onClick={() => setCurrentScreen('home')} style={{ background: 'transparent', color: '#fff', fontSize: '1.5rem', border: 'none' }}>← Volver</button>
          <h2 style={{ margin: 0 }}>{currentOtherName}</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', background: 'rgba(0,0,0,0.25)', borderRadius: '16px', marginBottom: '15px' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ margin: '10px 15px', display: 'flex', justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start' }}>
              {msg.sender === 'other' && (
                <img src={currentOtherImage} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', marginRight: '12px' }} />
              )}
              <div style={{ maxWidth: '72%', padding: '12px 16px', borderRadius: msg.sender === 'me' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', background: msg.sender === 'me' ? 'linear-gradient(90deg, #ff69b4, #8a2be2)' : 'rgba(255,255,255,0.12)', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                {msg.text}
                <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: '6px', textAlign: msg.sender === 'me' ? 'right' : 'left' }}>{msg.time}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            style={{ flex: 1, padding: '14px 18px', borderRadius: '50px', border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '1rem', outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} style={{ padding: '14px 24px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', borderRadius: '50px', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Enviar</button>
        </div>
      </div>
    );
  }

  // Resto de tu pantalla home (con swipe, botones, etc.) se mantiene igual que tenías
  return (
    <div style={{ backgroundColor: '#6C1A36', minHeight: '100vh', color: '#fff', padding: '15px', position: 'relative' }}>
      {/* Tu código de home aquí (header, botones de pago, swipe stack, etc.) */}
      {/* ... */}
    </div>
  );
}
