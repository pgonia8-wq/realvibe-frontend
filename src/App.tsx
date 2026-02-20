import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

const MAX_FREE_SWIPES_PER_DAY = 10;
const MAX_MESSAGE_LENGTH = 500;

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
  image: string;
  wallet: string;
};

type Match = {
  id: number;
  otherWallet: string;
  otherName: string;
  otherImage: string;
};

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
  // Computed
  // ────────────────────────────────────────────────
  const availableProfiles = useMemo(() => {
    const matched = new Set(myMatches.map(m => m.otherWallet));
    return profiles.filter(p => 
      !matched.has(p.wallet) && !seenWallets.has(p.wallet)
    );
  }, [profiles, myMatches, seenWallets]);

  const visibleProfiles = useMemo(() => {
    return availableProfiles.slice(discoverIndex, discoverIndex + 3);
  }, [availableProfiles, discoverIndex]);

  const topProfile = visibleProfiles[0] || null;

  // ────────────────────────────────────────────────
  // Inicialización
  // ────────────────────────────────────────────────
  useEffect(() => { MiniKit.install(); }, []);

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
    await Promise.all([
      loadProfile(),
      loadSwipes(),
      loadMyMatches(),
      loadProfiles(),
      loadSeenWallets(),
    ]);
    setLoading(false);
  };

  // ... (las funciones loadProfile, loadSwipes, decrementSwipes, loadMyMatches, loadProfiles, loadSeenWallets se mantienen iguales a tu versión anterior corregida)

  // Conectar wallet + JWT
  const connectWallet = async () => {
    if (!MiniKit.isInstalled()) return showToast('Abre en World App', 'error');

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
      showToast('Error al conectar wallet', 'error');
    }
  };

  // Subir foto
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

    await supabase
      .from('profiles_public')
      .upsert({ wallet: walletAddress, image_url: publicUrl }, { onConflict: 'wallet' });

    showToast('Foto actualizada', 'success');
    loadProfiles();
  };

  // Guardar perfil
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

    if (error) return showToast('Error al guardar perfil', 'error');

    showToast('Perfil guardado', 'success');
    setShowProfileForm(false);
    loadProfiles();
  };

  // Swipe + Match (con decremento correcto)
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
      await supabase.from('likes').insert({
        from_wallet: walletAddress!,
        to_wallet: topProfile.wallet,
      });

      const { data: mutual } = await supabase
        .from('likes')
        .select('id')
        .eq('from_wallet', topProfile.wallet)
        .eq('to_wallet', walletAddress!)
        .maybeSingle();

      if (mutual) {
        const sorted = [walletAddress!, topProfile.wallet].sort();
        const { data: match } = await supabase
          .from('matches')
          .insert({
            user1_wallet: sorted[0],
            user2_wallet: sorted[1],
          })
          .select()
          .single();

        if (match) {
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

    if (isLimited) await decrementSwipes();

    setDiscoverIndex(prev => prev + 1);
    resetCard();
  };

  // ... (gestos handlePointerDown, handlePointerMove, handlePointerUp, resetCard se mantienen iguales)

  // Render final
  if (currentScreen === 'chat' && currentMatchId) {
    return (
      <div style={{ background: '#6C1A36', minHeight: '100vh', color: '#fff', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={() => setCurrentScreen('home')} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.8rem', marginRight: '16px' }}>←</button>
          <img src={currentOtherImage} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }} />
          <h2>{currentOtherName}</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '16px', marginBottom: '16px' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ margin: '12px 0', display: 'flex', justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start' }}>
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
          ))}
          {isOtherTyping && <p style={{ color: '#aaa', fontStyle: 'italic' }}>{currentOtherName} está escribiendo...</p>}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            maxLength={MAX_MESSAGE_LENGTH}
            style={{ flex: 1, padding: '14px 18px', borderRadius: '999px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
          <button
            onClick={() => {/* sendMessage aquí */}}
            style={{ padding: '14px 24px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', borderRadius: '999px', color: 'white', border: 'none' }}
          >
            Enviar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#6C1A36', minHeight: '100vh', color: 'white', padding: '16px' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          borderRadius: '999px',
          background: toast.type === 'success' ? '#22c55e' : '#ef4444',
          zIndex: 1000,
        }}>
          {toast.text}
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handlePhotoUpload}
      />

      {!walletAddress ? (
        <div style={{ textAlign: 'center', marginTop: '200px' }}>
          <button onClick={connectWallet}>Conectar Wallet</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => setShowProfileForm(true)}>Editar perfil</button>
            <button onClick={() => fileInputRef.current?.click()}>Subir foto</button>
          </div>

          {showProfileForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
              {/* Formulario completo aquí */}
            </div>
          )}

          {loading ? (
            <p>Cargando...</p>
          ) : availableProfiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '120px 20px' }}>
              <h2>No hay más perfiles</h2>
              <p>Vuelve más tarde o invita amigos</p>
            </div>
          ) : (
            <div style={{ position: 'relative', height: '520px', maxWidth: '420px', margin: '0 auto' }}>
              {/* Stack de tarjetas aquí */}
            </div>
          )}
        </>
      )}
    </div>
  );
}
