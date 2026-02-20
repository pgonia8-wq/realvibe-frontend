import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { createClient } from '@supabase/supabase-js';

const MAX_FREE_SWIPES_PER_DAY = 10;
const MAX_MESSAGE_LENGTH = 500;
const VISIBLE_CARDS = 3;

// Tipos
type SubscriptionLevel = 'none' | 'gold' | 'platinum' | 'diamond';

type Message = {
  id: number | string;
  text: string;
  sender: 'me' | 'other';
  time: string;
};

type Profile = {
  id: number;
  name: string;
  age: number;
  bio: string;
  location: string;
  image: string;           // ← asumimos que es 'image' en la DB (no image_url)
  wallet: string;
};

type Match = {
  id: number;
  otherWallet: string;
  otherName: string;
  otherImage: string;
};

// ────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────
export default function RealVibeApp() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [subscriptionLevel, setSubscriptionLevel] = useState<SubscriptionLevel>('none');
  const [boostActive, setBoostActive] = useState(false);
  const [freeSwipesLeft, setFreeSwipesLeft] = useState(MAX_FREE_SWIPES_PER_DAY);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [seenWallets, setSeenWallets] = useState<Set<string>>(new Set());
  const [discoverIndex, setDiscoverIndex] = useState(0);

  const [currentScreen, setCurrentScreen] = useState<'home' | 'chat'>('home');
  const [currentMatchId, setCurrentMatchId] = useState<number | null>(null);
  const [currentOtherName, setCurrentOtherName] = useState('');
  const [currentOtherImage, setCurrentOtherImage] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Formulario de perfil
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    age: 0,
    bio: '',
    location: '',
  });

  // Swipe states
  const [dragX, setDragX] = useState(0);
  const [dragRot, setDragRot] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showLike, setShowLike] = useState(false);
  const [showDislike, setShowDislike] = useState(false);

  const touchStartX = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ────────────────────────────────────────────────
  // Supabase client (solo si las env vars existen)
  // ────────────────────────────────────────────────
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#000', 
        color: '#ff4444', 
        padding: '40px', 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <h1>❌ Error de configuración</h1>
        <p style={{ fontSize: '1.2rem', margin: '20px 0' }}>
          Faltan las variables de entorno en Vercel:
        </p>
        <ul style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
          <li><code>VITE_SUPABASE_URL</code></li>
          <li><code>VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p style={{ marginTop: '30px' }}>Agrégalas en Vercel → Settings → Environment Variables y redeploy.</p>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ────────────────────────────────────────────────
  // Computed
  // ────────────────────────────────────────────────
  const availableProfiles = useMemo(() => {
    const matched = new Set(myMatches.map(m => m.otherWallet));
    return profiles.filter(p => 
      !matched.has(p.wallet) && !seenWallets.has(p.wallet)
    );
  }, [profiles, myMatches, seenWallets]);

  const visibleProfiles = useMemo(() => {
    return availableProfiles.slice(discoverIndex, discoverIndex + VISIBLE_CARDS);
  }, [availableProfiles, discoverIndex]);

  const topProfile = visibleProfiles[0] || null;

  // ────────────────────────────────────────────────
  // Inicialización
  // ────────────────────────────────────────────────
  useEffect(() => {
    MiniKit.install();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('walletAddress');
    if (stored) setWalletAddress(stored);
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    loadEverything();
  }, [walletAddress]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2800);
  };

  const loadEverything = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProfile(),
        loadSwipes(),
        loadMyMatches(),
        loadProfiles(),
        loadSeenWallets(),
      ]);
    } catch (err) {
      console.error('Error en loadEverything:', err);
      showToast('Error al cargar datos iniciales', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // Carga de datos (resto igual, solo corregí la query .or)
  // ────────────────────────────────────────────────
  const loadProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription, boost_until')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) console.error('loadProfile error:', error);
    setSubscriptionLevel((data?.subscription as SubscriptionLevel) || 'none');
    const until = data?.boost_until ? new Date(data.boost_until) : null;
    setBoostActive(!!until && until > new Date());
  };

  const loadSwipes = async () => {
    const today = new Date().toDateString();
    const { data, error } = await supabase
      .from('profiles')
      .select('free_swipes_left, last_swipe_date')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) console.error('loadSwipes error:', error);

    if (data?.last_swipe_date === today) {
      setFreeSwipesLeft(data.free_swipes_left ?? MAX_FREE_SWIPES_PER_DAY);
    } else {
      await supabase
        .from('profiles')
        .update({ free_swipes_left: MAX_FREE_SWIPES_PER_DAY, last_swipe_date: today })
        .eq('wallet_address', walletAddress);
      setFreeSwipesLeft(MAX_FREE_SWIPES_PER_DAY);
    }
  };

  const decrementSwipes = async () => {
    const newCount = Math.max(0, freeSwipesLeft - 1);
    setFreeSwipesLeft(newCount);
    const today = new Date().toDateString();
    await supabase
      .from('profiles')
      .update({ free_swipes_left: newCount, last_swipe_date: today })
      .eq('wallet_address', walletAddress);
  };

  const loadMyMatches = async () => {
    if (!walletAddress) return;

    const { data, error } = await supabase
      .from('matches')
      .select('id, user1_wallet, user2_wallet, created_at')
      .or(`user1_wallet.eq.\( {walletAddress},user2_wallet.eq. \){walletAddress}`);

    if (error) {
      console.error('Error cargando matches:', error);
      showToast('No se pudieron cargar los matches', 'error');
      return;
    }

    const formatted = (data || []).map(m => {
      const otherWallet = m.user1_wallet === walletAddress ? m.user2_wallet : m.user1_wallet;
      const profile = profiles.find(p => p.wallet === otherWallet);
      return {
        id: m.id,
        otherWallet,
        otherName: profile?.name || 'Usuario',
        otherImage: profile?.image || 'https://picsum.photos/80',
      };
    });

    setMyMatches(formatted);
  };

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles_public')
      .select('*')
      .neq('wallet', walletAddress!);

    if (error) {
      console.error('Error cargando perfiles:', error);
      showToast('No se pudieron cargar perfiles', 'error');
      return;
    }

    setProfiles(data || []);
  };

  const loadSeenWallets = async () => {
    if (!walletAddress) return;

    const { data, error } = await supabase
      .from('swipes')
      .select('to_profile')
      .eq('from_user', walletAddress);

    if (error) return console.error('Error cargando vistos:', error);

    setSeenWallets(new Set(data?.map(s => s.to_profile) || []));
  };

  // ────────────────────────────────────────────────
  // Conectar wallet
  // ────────────────────────────────────────────────
  const connectWallet = async () => {
    if (!MiniKit.isInstalled()) {
      return showToast('Abre esta app dentro de World App', 'error');
    }

    try {
      const nonce = Date.now().toString() + Math.random().toString(36).slice(2);
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: 'Conectar a RealVibe',
      });

      if (finalPayload.status !== 'success') return showToast('Conexión cancelada', 'error');

      const address = MiniKit.walletAddress || (finalPayload as any).address;
      if (!address) return;

      setWalletAddress(address);
      localStorage.setItem('walletAddress', address);

      showToast('Wallet conectada ✅', 'success');
    } catch (err) {
      console.error('Error connectWallet:', err);
      showToast('Error al conectar wallet', 'error');
    }
  };

  // ────────────────────────────────────────────────
  // Subir foto de perfil
  // ────────────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !walletAddress) return showToast('Selecciona una foto', 'error');

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `\( {walletAddress}. \){fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) return showToast('Error subiendo foto', 'error');

    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('profiles_public')
      .upsert({
        wallet: walletAddress,
        image: publicUrl,          // ← asumiendo que el campo se llama 'image'
      }, { onConflict: 'wallet' });

    if (updateError) return showToast('Foto subida pero no se actualizó perfil', 'error');

    showToast('Foto de perfil actualizada', 'success');
    loadProfiles();
  };

  // ────────────────────────────────────────────────
  // Guardar / actualizar mi perfil
  // ────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!walletAddress) return showToast('Conecta wallet primero', 'error');

    const { error } = await supabase
      .from('profiles_public')
      .upsert({
        wallet: walletAddress,
        name: profileForm.name || 'Usuario',
        age: profileForm.age || null,
        bio: profileForm.bio,
        location: profileForm.location,
      }, { onConflict: 'wallet' });

    if (error) {
      showToast('Error al guardar perfil', 'error');
      return;
    }

    showToast('Perfil guardado', 'success');
    setShowProfileForm(false);
    loadProfiles();
  };

  // ────────────────────────────────────────────────
  // Swipe + Match (el resto sin cambios importantes)
  // ────────────────────────────────────────────────
  const handleAction = async (action: 'like' | 'dislike') => {
    if (!topProfile) return;

    const isLimited = subscriptionLevel === 'none' && !boostActive;
    if (isLimited && freeSwipesLeft <= 0) {
      showToast('Swipes gratis agotados', 'error');
      return;
    }

    const { error: swipeError } = await supabase
      .from('swipes')
      .insert({
        from_user: walletAddress!,
        to_profile: topProfile.wallet,
        action,
      });

    if (swipeError) {
      showToast('Error al registrar swipe', 'error');
      return;
    }

    setSeenWallets(prev => new Set([...prev, topProfile.wallet]));

    if (action === 'like') {
      const { error: likeError } = await supabase
        .from('likes')
        .insert({
          from_wallet: walletAddress!,
          to_wallet: topProfile.wallet,
        });

      if (likeError && likeError.code !== '23505') {
        showToast('Error al enviar like', 'error');
        return;
      }

      const { data: mutual } = await supabase
        .from('likes')
        .select('id')
        .eq('from_wallet', topProfile.wallet)
        .eq('to_wallet', walletAddress!)
        .maybeSingle();

      if (mutual) {
        const sorted = [walletAddress!, topProfile.wallet].sort();
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            user1_wallet: sorted[0],
            user2_wallet: sorted[1],
          })
          .select()
          .single();

        if (matchError) {
          showToast('Error al crear match', 'error');
        } else if (match) {
          setMyMatches(prev => [...prev, {
            id: match.id,
            otherWallet: topProfile.wallet,
            otherName: topProfile.name,
            otherImage: topProfile.image,
          }]);
          showToast(`¡Match con ${topProfile.name}! 💕`, 'success');
        }
      } else {
        showToast(`Like enviado a ${topProfile.name}`, 'success');
      }
    } else {
      showToast('Dislike registrado', 'success');
    }

    if (isLimited) {
      await decrementSwipes();
    }

    setDiscoverIndex(prev => prev + 1);
    resetCard();
  };

  // ────────────────────────────────────────────────
  // Gestos
  // ────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    touchStartX.current = e.clientX;
    setIsDragging(true);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - touchStartX.current;
    setDragX(deltaX);
    setDragRot(deltaX / 12);
    setShowLike(deltaX > 60);
    setShowDislike(deltaX < -60);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      const threshold = 120;

      if (Math.abs(dragX) > threshold && topProfile) {
        const isLike = dragX > 0;
        setDragX(isLike ? window.innerWidth : -window.innerWidth);
        setDragRot(isLike ? 45 : -45);

        setTimeout(() => {
          handleAction(isLike ? 'like' : 'dislike');
        }, 300);
      } else {
        resetCard();
      }
    }
  };

  const resetCard = () => {
    setDragX(0);
    setDragRot(0);
    setShowLike(false);
    setShowDislike(false);
    setIsDragging(false);
  };

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  if (currentScreen === 'chat' && currentMatchId) {
    return (
      <div style={{ background: '#6C1A36', minHeight: '100vh', color: '#fff', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        {/* ... el chat completo igual que antes ... */}
        {/* (lo dejé sin cambios porque no era el problema principal) */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={() => setCurrentScreen('home')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.8rem', marginRight: '16px' }}>← Volver</button>
          <img src={currentOtherImage} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }} />
          <h2>{currentOtherName}</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '16px', marginBottom: '16px' }}>
          {chatLoading ? (
            <p>Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa' }}>Di hola para empezar</p>
          ) : (
            messages.map(msg => (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                margin: '12px 0',
              }}>
                <div style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'me' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: msg.sender === 'me' ? 'linear-gradient(90deg, #ff69b4, #8a2be2)' : 'rgba(255,255,255,0.15)',
                }}>
                  {msg.text}
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px', textAlign: msg.sender === 'me' ? 'right' : 'left' }}>
                    {msg.time}
                  </div>
                </div>
              </div>
            ))
          )}

          {isOtherTyping && (
            <p style={{ color: '#aaa', fontStyle: 'italic' }}>{currentOtherName} está escribiendo...</p>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            maxLength={MAX_MESSAGE_LENGTH}
            style={{ flex: 1, padding: '12px 16px', borderRadius: '999px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
          <button
            onClick={() => { /* Implementa aquí el envío real de mensajes */ showToast('Mensaje enviado (demo)', 'success'); setChatInput(''); }}
            style={{ padding: '12px 24px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', borderRadius: '999px', color: 'white', border: 'none' }}
          >
            Enviar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#6C1A36', minHeight: '100vh', color: '#fff', padding: '16px' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          borderRadius: '999px',
          background: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: 'white',
          zIndex: 1000,
        }}>
          {toast.text}
        </div>
      )}

      {!walletAddress ? (
        <div style={{ textAlign: 'center', marginTop: '200px' }}>
          <h2>Bienvenido a RealVibe</h2>
          <button 
            onClick={connectWallet}
            style={{ 
              padding: '16px 32px', 
              fontSize: '1.2rem', 
              marginTop: '20px',
              background: 'linear-gradient(90deg, #ff69b4, #8a2be2)',
              border: 'none',
              borderRadius: '999px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Conectar Wallet con World App
          </button>
        </div>
      ) : (
        <>
          {/* Botones de prueba */}
          <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowProfileForm(true)} style={{ padding: '12px 24px', borderRadius: '999px', background: '#444', color: 'white' }}>
              Editar mi perfil
            </button>
            <button onClick={() => fileInputRef.current?.click()
