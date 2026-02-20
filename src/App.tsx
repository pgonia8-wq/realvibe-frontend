import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TREASURY_WALLET = '0xdf4a991bc05945bd0212e773adcff6ea619f4c4b';
const MAX_FREE_SWIPES_PER_DAY = 10;
const BOOST_COST_WLD = 1;
const SUPERLIKE_COST_WLD = 1;
const BOOST_DURATION_HOURS = 24;
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
  const [boostUntil, setBoostUntil] = useState<Date | null>(null);
  const [freeSwipesLeft, setFreeSwipesLeft] = useState(MAX_FREE_SWIPES_PER_DAY);

  const [superLikesUsedThisMonth, setSuperLikesUsedThisMonth] = useState(0);
  const [boostsUsedThisMonth, setBoostsUsedThisMonth] = useState(0);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [seenWallets, setSeenWallets] = useState<Set<string>>(new Set());
  const [discoverIndex, setDiscoverIndex] = useState(0);

  const [currentScreen, setCurrentScreen] = useState<'home' | 'matches' | 'chat'>('home');
  const [currentMatchId, setCurrentMatchId] = useState<number | null>(null);
  const [currentOtherName, setCurrentOtherName] = useState('');
  const [currentOtherImage, setCurrentOtherImage] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Swipe states
  const [dragX, setDragX] = useState(0);
  const [dragRot, setDragRot] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showLike, setShowLike] = useState(false);
  const [showDislike, setShowDislike] = useState(false);

  const touchStartX = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({
    name: '',
    age: 0,
    bio: '',
    location: '',
  });

  // ────────────────────────────────────────────────
  // Límites por plan
  // ────────────────────────────────────────────────
  const getSuperLikeLimit = (level: SubscriptionLevel): number => {
    switch (level) {
      case 'gold':     return 5;
      case 'platinum': return 15;
      case 'diamond':  return Infinity;
      default:         return 0;
    }
  };

  const getBoostLimit = (level: SubscriptionLevel): number => {
    switch (level) {
      case 'gold':     return 5;
      case 'platinum': return 10;
      case 'diamond':  return Infinity;
      default:         return 0;
    }
  };

  const hasUnlimitedSwipes = subscriptionLevel !== 'none' || boostActive;

  // ────────────────────────────────────────────────
  // Computed
  // ────────────────────────────────────────────────
  const availableProfiles = useMemo(() => {
    const matched = new Set(myMatches.map(m => m.otherWallet));
    return profiles.filter(p =>
      !matched.has(p.wallet) &&
      !seenWallets.has(p.wallet) &&
      p.wallet !== walletAddress
    );
  }, [profiles, myMatches, seenWallets, walletAddress]);

  const currentProfile = useMemo(() => {
    if (availableProfiles.length === 0) return null;
    return availableProfiles[discoverIndex % availableProfiles.length];
  }, [availableProfiles, discoverIndex]);

  // ────────────────────────────────────────────────
  // Effects
  // ────────────────────────────────────────────────
  useEffect(() => { MiniKit.install(); }, []);

  useEffect(() => {
    const stored = localStorage.getItem('walletAddress');
    if (stored) setWalletAddress(stored);
  }, []);

  useEffect(() => {
    if (walletAddress) loadEverything();
  }, [walletAddress]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime chat
  useEffect(() => {
    if (currentScreen !== 'chat' || !currentMatchId || !walletAddress) return;

    const channel = supabase
      .channel(`messages:${currentMatchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${currentMatchId}` },
        (payload) => {
          const m = payload.new as any;
          if (m.sender_wallet === walletAddress) return;
          const newMsg: Message = {
            id: m.id,
            text: m.message,
            sender: 'other',
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentScreen, currentMatchId, walletAddress]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2800);
  };

  const loadEverything = async () => {
    setLoading(true);
    await Promise.all([
      loadProfile(),
      loadSwipes(),
      loadProfiles(),
      loadSeenWallets(),
    ]);
    await loadMyMatches();
    setLoading(false);
  };

  // ────────────────────────────────────────────────
  // Load data functions
  // ────────────────────────────────────────────────
  const loadProfile = async () => {
    if (!walletAddress) return;

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        subscription,
        boost_until,
        super_likes_used_this_month,
        boosts_used_this_month,
        super_likes_monthly_reset_date
      `)
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      console.error('loadProfile error:', error);
      return;
    }

    const level = (data?.subscription as SubscriptionLevel) || 'none';
    setSubscriptionLevel(level);

    // Boost
    const until = data?.boost_until ? new Date(data.boost_until) : null;
    setBoostUntil(until);
    setBoostActive(!!until && until > new Date());

    // Reset mensual
    const now = new Date();
    let resetDate = data?.super_likes_monthly_reset_date ? new Date(data.super_likes_monthly_reset_date) : null;

    if (!resetDate || resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear()) {
      await supabase
        .from('profiles')
        .update({
          super_likes_used_this_month: 0,
          boosts_used_this_month: 0,
          super_likes_monthly_reset_date: now.toISOString(),
        })
        .eq('wallet_address', walletAddress);

      setSuperLikesUsedThisMonth(0);
      setBoostsUsedThisMonth(0);
    } else {
      setSuperLikesUsedThisMonth(data?.super_likes_used_this_month ?? 0);
      setBoostsUsedThisMonth(data?.boosts_used_this_month ?? 0);
    }
  };

  const loadSwipes = async () => {
    if (!walletAddress) return;
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
    if (hasUnlimitedSwipes) return;
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
    if (!walletAddress) return;
    const { data, error } = await supabase
      .from('profiles_public')
      .select('*')
      .neq('wallet', walletAddress);

    if (error) console.error('Error cargando perfiles:', error);

    setProfiles(data || []);
  };

  const loadSeenWallets = async () => {
    if (!walletAddress) return;

    const { data, error } = await supabase
      .from('swipes')
      .select('to_profile')
      .eq('from_user', walletAddress);

    if (error) console.error('Error cargando vistos:', error);

    setSeenWallets(new Set(data?.map(s => s.to_profile) || []));
  };

  // ────────────────────────────────────────────────
  // Wallet connect + World ID
  // ────────────────────────────────────────────────
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

      const { data, error } = await supabase.functions.invoke('generate-wallet-jwt', {
        body: { wallet: address },
      });

      if (error || !data?.access_token) {
        showToast('Error al autenticar sesión', 'error');
        return;
      }

      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: '',
      });

      showToast('Wallet conectada ✅', 'success');
    } catch (err) {
      showToast('Error al conectar wallet', 'error');
    }
  };

  const requestWorldIDVerification = async () => {
    if (!MiniKit.isInstalled()) return false;

    try {
      const { finalPayload } = await MiniKit.commandsAsync.verify({
        action: 'realvibe_register',  // ← crea esta action en Worldcoin portal (Orb preferido)
        verification_level: 'orb',
      });

      return finalPayload.status === 'success';
    } catch {
      return false;
    }
  };

  // ────────────────────────────────────────────────
  // Foto + Perfil
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

    await supabase
      .from('profiles_public')
      .upsert({ wallet: walletAddress, image: publicUrl }, { onConflict: 'wallet' });

    showToast('Foto actualizada', 'success');
    loadProfiles();
  };

  const saveProfile = async () => {
    if (!walletAddress) return showToast('Conecta wallet primero', 'error');

    const verified = await requestWorldIDVerification();
    if (!verified) return showToast('Verificación World ID requerida', 'error');

    const { error } = await supabase
      .from('profiles_public')
      .upsert({
        wallet: walletAddress,
        name: profileForm.name || 'Usuario',
        age: profileForm.age || null,
        bio: profileForm.bio,
        location: profileForm.location,
      }, { onConflict: 'wallet' });

    if (error) return showToast('Error guardando perfil', 'error');

    showToast('Perfil guardado ✅', 'success');
    setShowProfileForm(false);
    loadProfiles();
  };

  // ────────────────────────────────────────────────
  // Suscripción (upgrade)
  // ────────────────────────────────────────────────
  const upgradeSubscription = async (level: SubscriptionLevel, wldAmount: number) => {
    if (!walletAddress || !MiniKit.isInstalled()) return showToast('Abre en World App', 'error');

    try {
      const amount = tokenToDecimals(wldAmount, 18);

      const { finalPayload } = await MiniKit.commandsAsync.pay({
        to: TREASURY_WALLET,
        tokens: [{ symbol: Tokens.WLD, token_amount: amount }],
        description: `RealVibe ${level.toUpperCase()} Suscripción`,
      });

      if (finalPayload.status !== 'success') return showToast('Pago cancelado', 'error');

      // En producción: verifica transacción en backend
      const { error } = await supabase
        .from('profiles')
        .update({ subscription: level })
        .eq('wallet_address', walletAddress);

      if (error) {
        showToast('Pago recibido, error al activar', 'error');
      } else {
        setSubscriptionLevel(level);
        showToast(`${level.toUpperCase()} activado!`, 'success');
        loadProfile();
      }
    } catch (err) {
      showToast('Error en pago', 'error');
    }
  };

  // ────────────────────────────────────────────────
  // Swipe + Match
  // ────────────────────────────────────────────────
  const handleAction = async (action: 'like' | 'dislike') => {
    if (!currentProfile) return;

    if (!hasUnlimitedSwipes && freeSwipesLeft <= 0) {
      showToast('Swipes gratis agotados → Boost o suscripción', 'error');
      setShowSubscriptionModal(true);
      return;
    }

    const { error } = await supabase
      .from('swipes')
      .insert({
        from_user: walletAddress!,
        to_profile: currentProfile.wallet,
        action,
      });

    if (error) return showToast('Error swipe', 'error');

    setSeenWallets(prev => new Set([...prev, currentProfile.wallet]));

    if (action === 'like') {
      const { data: mutual } = await supabase
        .from('swipes')
        .select('id')
        .eq('from_user', currentProfile.wallet)
        .eq('to_profile', walletAddress!)
        .eq('action', 'like')
        .maybeSingle();

      if (mutual) {
        const sorted = [walletAddress!, currentProfile.wallet].sort();
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({ user1_wallet: sorted[0], user2_wallet: sorted[1] })
          .select()
          .single();

        if (!matchError && match) {
          setMyMatches(prev => [...prev, {
            id: match.id,
            otherWallet: currentProfile.wallet,
            otherName: currentProfile.name,
            otherImage: currentProfile.image,
          }]);
          showToast(`¡Match con ${currentProfile.name}! 💕`, 'success');
        }
      }
    }

    if (!hasUnlimitedSwipes) await decrementSwipes();

    setDiscoverIndex(prev => prev + 1);
    resetCard();
  };

  // ────────────────────────────────────────────────
  // Boost y Super Like
  // ────────────────────────────────────────────────
  const activateBoost = async () => {
    if (boostActive) return showToast('Boost ya activo', 'error');

    const limit = getBoostLimit(subscriptionLevel);
    const hasQuota = boostsUsedThisMonth < limit;

    if (!hasQuota && subscriptionLevel !== 'diamond') {
      // Pago
      try {
        const amount = tokenToDecimals(BOOST_COST_WLD, 18);
        const { finalPayload } = await MiniKit.commandsAsync.pay({
          to: TREASURY_WALLET,
          tokens: [{ symbol: Tokens.WLD, token_amount: amount }],
          description: 'RealVibe Boost 24h',
        });

        if (finalPayload.status !== 'success') return showToast('Pago cancelado', 'error');

        const end = new Date(Date.now() + BOOST_DURATION_HOURS * 60 * 60 * 1000);
        await supabase.from('profiles').update({ boost_until: end.toISOString() }).eq('wallet_address', walletAddress);

        setBoostUntil(end);
        setBoostActive(true);
        showToast('Boost activado (pagado) 🔥', 'success');
      } catch {
        showToast('Error pago boost', 'error');
      }
      return;
    }

    // Cupo gratis
    const end = new Date(Date.now() + BOOST_DURATION_HOURS * 60 * 60 * 1000);
    const newUsed = boostsUsedThisMonth + 1;

    await supabase.from('profiles').update({
      boost_until: end.toISOString(),
      boosts_used_this_month: newUsed,
    }).eq('wallet_address', walletAddress);

    setBoostUntil(end);
    setBoostActive(true);
    setBoostsUsedThisMonth(newUsed);
    showToast(`Boost activado (\( {newUsed}/ \){limit === Infinity ? '∞' : limit})`, 'success');
  };

  const handleSuperLike = async () => {
    if (!currentProfile) return;

    const limit = getSuperLikeLimit(subscriptionLevel);
    const hasQuota = superLikesUsedThisMonth < limit;

    if (!hasQuota && subscriptionLevel !== 'diamond') {
      // Pago
      try {
        const amount = tokenToDecimals(SUPERLIKE_COST_WLD, 18);
        const { finalPayload } = await MiniKit.commandsAsync.pay({
          to: TREASURY_WALLET,
          tokens: [{ symbol: Tokens.WLD, token_amount: amount }],
          description: 'RealVibe Super Like',
        });

        if (finalPayload.status !== 'success') return showToast('Pago cancelado', 'error');

        await supabase.from('super_likes').insert({
          from_user: walletAddress!,
          to_profile: currentProfile.wallet,
        });

        await handleAction('like');
        showToast('Super Like enviado (pagado) ⭐', 'success');
      } catch {
        showToast('Error pago Super Like', 'error');
      }
      return;
    }

    // Cupo gratis
    const newUsed = superLikesUsedThisMonth + 1;

    await supabase.from('profiles').update({
      super_likes_used_this_month: newUsed,
    }).eq('wallet_address', walletAddress);

    setSuperLikesUsedThisMonth(newUsed);

    await supabase.from('super_likes').insert({
      from_user: walletAddress!,
      to_profile: currentProfile.wallet,
    });

    await handleAction('like');
    showToast(`Super Like enviado (\( {newUsed}/ \){limit === Infinity ? '∞' : limit}) ⭐`, 'success');
  };

  // ────────────────────────────────────────────────
  // Gestos swipe
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
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 120;

    if (Math.abs(dragX) > threshold && currentProfile) {
      const isLike = dragX > 0;
      setDragX(isLike ? window.innerWidth : -window.innerWidth);
      setDragRot(isLike ? 45 : -45);
      setTimeout(() => handleAction(isLike ? 'like' : 'dislike'), 300);
    } else {
      resetCard();
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
  // Chat
  // ────────────────────────────────────────────────
  const loadChatMessages = async (matchId: number) => {
    setChatLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at');

    if (error) console.error(error);

    const formatted = (data || []).map(m => ({
      id: m.id,
      text: m.message,
      sender: m.sender_wallet === walletAddress ? 'me' : 'other',
      time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    setMessages(formatted);
    setChatLoading(false);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentMatchId || !walletAddress) return;

    const tempId = Date.now();
    const newMsg: Message = {
      id: tempId,
      text: chatInput,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMsg]);
    const textCopy = chatInput;
    setChatInput('');

    const { error } = await supabase.from('messages').insert({
      match_id: currentMatchId,
      sender_wallet: walletAddress,
      message: textCopy,
    });

    if (error) {
      showToast('Error enviando', 'error');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const openChat = (match: Match) => {
    setCurrentMatchId(match.id);
    setCurrentOtherName(match.otherName);
    setCurrentOtherImage(match.otherImage);
    setCurrentScreen('chat');
    loadChatMessages(match.id);
  };

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  return (
    <div style={{ background: '#6C1A36', minHeight: '100vh', color: '#fff', padding: '16px', fontFamily: 'system-ui' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          padding: '12px 24px', borderRadius: '999px',
          background: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: 'white', zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {toast.text}
        </div>
      )}

      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} />

      {!walletAddress ? (
        <div style={{ textAlign: 'center', marginTop: '200px' }}>
          <button onClick={connectWallet} style={{ padding: '16px 64px', borderRadius: '999px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', color: 'white', border: 'none' }}>
            Conectar Wallet
          </button>
        </div>
      ) : (
        <>
          {/* Botones principales */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowProfileForm(true)} style={{ padding: '10px 20px', borderRadius: '999px', background: '#444', color: 'white' }}>Editar perfil</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', borderRadius: '999px', background: '#444', color: 'white' }}>Subir foto</button>
            <button onClick={() => setCurrentScreen('matches')} style={{ padding: '10px 20px', borderRadius: '999px', background: '#444', color: 'white' }}>
              Matches ({myMatches.length})
            </button>
            <button onClick={() => setShowSubscriptionModal(true)} style={{ padding: '10px 20px', borderRadius: '999px', background: 'linear-gradient(90deg, #ffd700, #ff8c00)', color: 'black', fontWeight: 'bold' }}>
              {subscriptionLevel === 'none' ? 'Upgrade' : subscriptionLevel.toUpperCase()}
            </button>
          </div>

          {/* Indicador cupos */}
          {subscriptionLevel !== 'none' && (
            <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.9rem', opacity: 0.85 }}>
              Super Likes: {superLikesUsedThisMonth} / {getSuperLikeLimit(subscriptionLevel) === Infinity ? '∞' : getSuperLikeLimit(subscriptionLevel)}
              {' • '} Boosts: {boostsUsedThisMonth} / {getBoostLimit(subscriptionLevel) === Infinity ? '∞' : getBoostLimit(subscriptionLevel)}
            </div>
          )}

          {/* Form perfil */}
          {showProfileForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
              <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px' }}>
                <h2>Editar perfil</h2>
                <input type="text" placeholder="Nombre" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', background: '#333', color: 'white' }} />
                <input type="number" placeholder="Edad" value={profileForm.age || ''} onChange={e => setProfileForm(p => ({ ...p, age: Number(e.target.value) }))} style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', background: '#333', color: 'white' }} />
                <textarea placeholder="Bio (max 150)" value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value.slice(0, 150) }))} style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', background: '#333', color: 'white', minHeight: '80px' }} />
                <input type="text" placeholder="Ubicación" value={profileForm.location} onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))} style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', background: '#333', color: 'white' }} />

                <button onClick={saveProfile} style={{ width: '100%', padding: '16px', marginTop: '16px', borderRadius: '999px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', color: 'white', border: 'none' }}>Guardar</button>
                <button onClick={() => setShowProfileForm(false)} style={{ width: '100%', padding: '12px', marginTop: '12px', borderRadius: '999px', background: '#444', color: 'white' }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Modal suscripción + tabla precios */}
          {showSubscriptionModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002 }}>
              <div style={{ background: '#1a1a1a', padding: '24px', borderRadius: '20px', width: '90%', maxWidth: '480px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Planes RealVibe</h2>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ background: '#222' }}>
                      <th style={{ padding: '10px', border: '1px solid #444' }}>Plan</th>
                      <th style={{ padding: '10px', border: '1px solid #444' }}>Precio</th>
                      <th style={{ padding: '10px', border: '1px solid #444' }}>Swipes</th>
                      <th style={{ padding: '10px', border: '1px solid #444' }}>Super Likes/mes</th>
                      <th style={{ padding: '10px', border: '1px solid #444' }}>Boosts/mes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>Free</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>0 WLD</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>10/día</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>0</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>0</td>
                    </tr>
                    <tr style={{ background: '#2a1a00' }}>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>Gold</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>5 WLD</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>Ilimitados</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>5</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>5</td>
                    </tr>
                    <tr style={{ background: '#1a2a3a' }}>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>Platinum</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>15 WLD</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>Ilimitados</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>15</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>10</td>
                    </tr>
                    <tr style={{ background: '#3a2a4a' }}>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>Diamond</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>50 WLD</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>Ilimitados</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>∞</td>
                      <td style={{ padding: '10px', border: '1px solid #444' }}>∞</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button onClick={() => upgradeSubscription('gold', 5)} style={{ padding: '14px', background: '#2a1a00', borderRadius: '12px', color: '#ffcc00', border: 'none' }}>Gold – 5 WLD</button>
                  <button onClick={() => upgradeSubscription('platinum', 15)} style={{ padding: '14px', background: '#1a2a3a', borderRadius: '12px', color: '#88ccff', border: 'none' }}>Platinum – 15 WLD</button>
                  <button onClick={() => upgradeSubscription('diamond', 50)} style={{ padding: '14px', background: '#3a2a4a', borderRadius: '12px', color: '#dd88ff', border: 'none' }}>Diamond – 50 WLD</button>
                  <button onClick={() => setShowSubscriptionModal(false)} style={{ padding: '12px', background: '#444', borderRadius: '999px', color: 'white' }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Contenido principal */}
          {currentScreen === 'home' && (
            <>
              {loading ? (
                <p style={{ textAlign: 'center' }}>Cargando...</p>
              ) : availableProfiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 20px' }}>
                  <div style={{ fontSize: '5rem' }}>🌵</div>
                  <h2>No hay más perfiles</h2>
                </div>
              ) : (
                <div style={{ position: 'relative', height: '520px', maxWidth: '420px', margin: '0 auto' }}>
                  {availableProfiles.slice(discoverIndex, discoverIndex + 2).map((profile, index) => (
                    <div
                      key={profile.wallet}
                      style={{
                        position: 'absolute',
                        top: index * 16,
                        left: index * 16,
                        right: index * 16,
                        transform: index === 0 ? `translateX(\( {dragX}px) rotate( \){dragRot}deg)` : `scale(${1 - index * 0.05})`,
                        transition: 'transform 0.35s ease-out',
                        zIndex: 10 - index,
                      }}
                    >
                      <div
                        onPointerDown={index === 0 ? handlePointerDown : undefined}
                        onPointerMove={index === 0 ? handlePointerMove : undefined}
                        onPointerUp={index === 0 ? handlePointerUp : undefined}
                        onPointerCancel={resetCard}
                        style={{
                          background: 'linear-gradient(135deg, #ff69b4, #8a2be2)',
                          borderRadius: '24px',
                          padding: '20px',
                          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                          cursor: index === 0 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        }}
                      >
                        <img src={profile.image} alt={profile.name} style={{ width: '100%', borderRadius: '16px', marginBottom: '16px' }} />
                        <h2>{profile.name}, {profile.age || '?'}</h2>
                        <p>{profile.bio}</p>
                        <p>📍 {profile.location}</p>
                      </div>
                    </div>
                  ))}

                  {isDragging && currentProfile && (
                    <>
                      {showLike && <div style={{ position: 'absolute', top: '80px', right: '60px', fontSize: '8rem', opacity: Math.min(1, dragX / 300) }}>❤️</div>}
                      {showDislike && <div style={{ position: 'absolute', top: '80px', left: '60px', fontSize: '8rem', opacity: Math.min(1, Math.abs(dragX) / 300) }}>👎</div>}
                    </>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '340px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleAction('dislike')} style={{ padding: '16px 40px', background: '#444', borderRadius: '999px', fontSize: '1.5rem' }}>👎</button>

                    <button onClick={activateBoost} disabled={boostActive} style={{ padding: '16px 28px', background: boostActive ? '#555' : 'linear-gradient(90deg, #00bfff, #1e90ff)', borderRadius: '999px', color: 'white', border: 'none' }}>
                      {boostActive ? 'Boost ON' : 'Boost 24h'}
                    </button>

                    <button onClick={handleSuperLike} style={{ padding: '16px 40px', background: 'linear-gradient(90deg, #ffd700, #ffaa00)', borderRadius: '999px', fontSize: '1.5rem', color: 'black' }}>
                      ⭐
                    </button>

                    <button onClick={() => handleAction('like')} style={{ padding: '16px 40px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', borderRadius: '999px', fontSize: '1.5rem' }}>❤️</button>
                  </div>
                </div>
              )}
            </>
          )}

          {currentScreen === 'matches' && (
            <div style={{ maxWidth: '420px', margin: '0 auto' }}>
              <button onClick={() => setCurrentScreen('home')} style={{ background: 'none', border: 'none', fontSize: '2rem', color: 'white' }}>←</button>
              <h2>Mis Matches ({myMatches.length})</h2>
              {myMatches.length === 0 ? (
                <p style={{ textAlign: 'center', marginTop: '80px' }}>Aún sin matches</p>
              ) : (
                myMatches.map(match => (
                  <div key={match.id} onClick={() => openChat(match)} style={{ display: 'flex', alignItems: 'center', background: '#222', padding: '12px', borderRadius: '16px', margin: '12px 0', cursor: 'pointer' }}>
                    <img src={match.otherImage} style={{ width: '60px', height: '60px', borderRadius: '50%', marginRight: '16px' }} alt="" />
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{match.otherName}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Chatea ahora</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {currentScreen === 'chat' && (
            <div style={{ maxWidth: '420px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={() => setCurrentScreen('matches')} style={{ background: 'none', border: 'none', fontSize: '2rem', color: 'white' }}>←</button>
                <img src={currentOtherImage} style={{ width: '50px', height: '50px', borderRadius: '50%', margin: '0 12px' }} alt="" />
                <h2>{currentOtherName}</h2>
              </div>

              <div style={{ height: '60vh', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', borderRadius: '16px', padding: '16px' }}>
                {chatLoading ? <p>Cargando...</p> : messages.map(msg => (
                  <div key={msg.id} style={{ margin: '10px 0', textAlign: msg.sender === 'me' ? 'right' : 'left' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '10px 16px',
                      borderRadius: '18px',
                      background: msg.sender === 'me' ? '#8a2be2' : '#444',
                      maxWidth: '75%'
                    }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '4px' }}>{msg.time}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  placeholder="Mensaje..."
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '999px', background: '#222', color: 'white', border: 'none' }}
                  onKeyPress={e => e.key === 'Enter' && sendChatMessage()}
                />
                <button onClick={sendChatMessage} style={{ padding: '12px 24px', borderRadius: '999px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', color: 'white', border: 'none' }}>
                  Enviar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
