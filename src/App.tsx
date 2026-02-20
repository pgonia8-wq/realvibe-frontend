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
const VISIBLE_CARDS = 3;

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

const POTENTIAL_PROFILES: Profile[] = [
  { id: 1, name: 'José', age: 24, bio: 'Música electrónica y tacos al pastor 🌮', location: 'CDMX', image: 'https://picsum.photos/id/64/450/600', wallet: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
  { id: 2, name: 'Ana', age: 26, bio: 'Arte urbano y café de especialidad ☕', location: 'Guadalajara', image: 'https://picsum.photos/id/1011/450/600', wallet: '0x8Ba1B4fC4bA6c9e7f2d5a3b9c8d7e6f5a4b3c2d1' },
  { id: 3, name: 'Carlos', age: 23, bio: 'Futbol amateur y League of Legends ⚽', location: 'Monterrey', image: 'https://picsum.photos/id/201/450/600', wallet: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b' },
  { id: 4, name: 'Sofía', age: 25, bio: 'Viajes y fotografía amateur ✈️', location: 'Puebla', image: 'https://picsum.photos/id/1005/450/600', wallet: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1098' },
  { id: 5, name: 'Miguel', age: 28, bio: 'Blockchain y mezcal 🥃', location: 'CDMX', image: 'https://picsum.photos/id/669/450/600', wallet: '0x3f2e1d0c9b8a7f6e5d4c3b2a1098765432109876' },
];

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
    return [...POTENTIAL_PROFILES, ...profiles].filter(p => 
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

  const loadProfile = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription, boost_until')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) console.error('Error cargando perfil:', error);
    setSubscriptionLevel((data?.subscription as SubscriptionLevel) || 'none');
    const until = data?.boost_until ? new Date(data.boost_until) : null;
    setBoostActive(!!until && until > new Date());
  };

  const loadSwipes = async () => {
    if (!supabase) return;
    const today = new Date().toDateString();
    const { data, error } = await supabase
      .from('profiles')
      .select('free_swipes_left, last_swipe_date')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) console.error('Error cargando swipes:', error);

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
    if (!supabase) return;
    const newCount = Math.max(0, freeSwipesLeft - 1);
    setFreeSwipesLeft(newCount);
    const today = new Date().toDateString();
    await supabase
      .from('profiles')
      .update({ free_swipes_left: newCount, last_swipe_date: today })
      .eq('wallet_address', walletAddress);
  };

  const loadMyMatches = async () => {
    if (!supabase || !walletAddress) return;

    const { data, error } = await supabase
      .from('matches')
      .select('id, user1_wallet, user2_wallet, created_at')
      .or(`user1_wallet.eq.\( {walletAddress},user2_wallet.eq. \){walletAddress}`);

    if (error) {
      console.error('Error cargando matches:', error);
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
        created_at: m.created_at,
      };
    });

    setMyMatches(formatted);
  };

  const loadProfiles = async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('profiles_public')
      .select('*')
      .neq('wallet', walletAddress!);

    if (error) {
      console.error('Error cargando perfiles:', error);
      return;
    }

    setProfiles(data || []);
  };

  const loadSeenWallets = async () => {
    if (!supabase || !walletAddress) return;

    const { data, error } = await supabase
      .from('swipes')
      .select('to_profile')
      .eq('from_user', walletAddress);

    if (error) return console.error('Error cargando vistos:', error);

    setSeenWallets(new Set(data?.map(s => s.to_profile) || []));
  };

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !walletAddress || !supabase) return showToast('Selecciona una foto', 'error');

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
        image_url: publicUrl,
      }, { onConflict: 'wallet' });

    if (updateError) return showToast('Foto subida pero no se actualizó perfil', 'error');

    showToast('Foto de perfil actualizada', 'success');
    loadProfiles();
  };

  const saveProfile = async () => {
    if (!walletAddress || !supabase) return showToast('Conecta wallet primero', 'error');

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
      console.error('Error guardando perfil:', error);
      showToast('Error al guardar perfil', 'error');
      return;
    }

    showToast('Perfil guardado', 'success');
    setShowProfileForm(false);
    loadProfiles();
  };

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

  // Gestos
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
      if (Math.abs(dragX) > 120 && topProfile) {
        const isLike = dragX > 0;
        setDragX(isLike ? window.innerWidth : -window.innerWidth);
        setDragRot(isLike ? 45 : -45);
        setTimeout(() => handleAction(isLike ? 'like' : 'dislike'), 300);
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

  // Render final
  if (currentScreen === 'chat' && currentMatchId) {
    return (
      <div style={{ background: '#6C1A36', minHeight: '100vh', color: '#fff', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => setCurrentScreen('home')} style={{ alignSelf: 'flex-start', marginBottom: '16px' }}>← Volver</button>
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
              <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px' }}>
                <h2>Editar mi perfil</h2>
                <input type="text" placeholder="Nombre" value={profileForm.name} onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))} style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', background: '#333', color: 'white' }} />
                <input type="number" placeholder="Edad" value={profileForm.age || ''} onChange={e => setProfileForm(prev => ({ ...prev, age: Number(e.target.value) }))} style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', background: '#333', color: 'white' }} />
                <textarea placeholder="Bio" value={profileForm.bio} onChange={e => setProfileForm(prev => ({ ...prev, bio: e.target.value }))} style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', background: '#333', color: 'white', minHeight: '80px' }} />
                <input type="text" placeholder="Ubicación" value={profileForm.location} onChange={e => setProfileForm(prev => ({ ...prev, location: e.target.value }))} style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', background: '#333', color: 'white' }} />
                <button onClick={saveProfile} style={{ width: '100%', padding: '16px', marginTop: '16px', borderRadius: '999px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', color: 'white' }}>Guardar</button>
                <button onClick={() => setShowProfileForm(false)} style={{ width: '100%', padding: '12px', marginTop: '12px', borderRadius: '999px', background: '#444', color: 'white' }}>Cancelar</button>
              </div>
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
              {visibleProfiles.map((profile, index) => (
                <div key={profile.id} style={{
                  position: 'absolute',
                  top: index * 16,
                  left: index * 16,
                  right: index * 16,
                  trans
