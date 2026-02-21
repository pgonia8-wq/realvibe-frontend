import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('Faltan variables de entorno: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

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

  const [hasCriticalError, setHasCriticalError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const getSuperLikeLimit = (level: SubscriptionLevel) => {
    switch (level) {
      case 'gold': return 5;
      case 'platinum': return 15;
      case 'diamond': return Infinity;
      default: return 0;
    }
  };

  const getBoostLimit = (level: SubscriptionLevel) => {
    switch (level) {
      case 'gold': return 5;
      case 'platinum': return 10;
      case 'diamond': return Infinity;
      default: return 0;
    }
  };

  const hasUnlimitedSwipes = subscriptionLevel !== 'none' || boostActive;

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

  useEffect(() => {
    if (!supabase) {
      setHasCriticalError(true);
      setErrorMessage('Supabase no configurado. Revisa variables en Vercel: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
    }
  }, []);

  useEffect(() => { MiniKit.install(); }, []);

  useEffect(() => {
    const stored = localStorage.getItem('walletAddress');
    if (stored) setWalletAddress(stored);
  }, []);

  useEffect(() => {
    if (walletAddress && supabase) loadEverything();
  }, [walletAddress]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!supabase || currentScreen !== 'chat' || !currentMatchId || !walletAddress) return;

    const channel = supabase.channel(`messages:${currentMatchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${currentMatchId}`,
      }, (payload) => {
        const m = payload.new;
        if (m.sender_wallet === walletAddress) return;
        setMessages(prev => [...prev, {
          id: m.id,
          text: m.message,
          sender: 'other',
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentScreen, currentMatchId, walletAddress]);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2800);
  };

  const loadEverything = async () => {
    if (!supabase) return;
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

  const loadProfile = async () => {
    if (!supabase || !walletAddress) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription, boost_until, super_likes_used_this_month, boosts_used_this_month, super_likes_monthly_reset_date')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setSubscriptionLevel(data?.subscription || 'none');

    const until = data?.boost_until ? new Date(data.boost_until) : null;
    setBoostUntil(until);
    setBoostActive(!!until && until > new Date());

    const now = new Date();
    const resetDate = data?.super_likes_monthly_reset_date ? new Date(data.super_likes_monthly_reset_date) : null;

    if (!resetDate || resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear()) {
      await supabase.from('profiles').update({
        super_likes_used_this_month: 0,
        boosts_used_this_month: 0,
        super_likes_monthly_reset_date: now.toISOString(),
      }).eq('wallet_address', walletAddress);

      setSuperLikesUsedThisMonth(0);
      setBoostsUsedThisMonth(0);
    } else {
      setSuperLikesUsedThisMonth(data?.super_likes_used_this_month || 0);
      setBoostsUsedThisMonth(data?.boosts_used_this_month || 0);
    }
  };

  const loadSwipes = async () => {
    if (!supabase || !walletAddress) return;
    const today = new Date().toDateString();
    const { data, error } = await supabase
      .from('profiles')
      .select('free_swipes_left, last_swipe_date')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) console.error(error);

    if (data?.last_swipe_date === today) {
      setFreeSwipesLeft(data.free_swipes_left || MAX_FREE_SWIPES_PER_DAY);
    } else {
      await supabase.from('profiles').update({
        free_swipes_left: MAX_FREE_SWIPES_PER_DAY,
        last_swipe_date: today
      }).eq('wallet_address', walletAddress);
      setFreeSwipesLeft(MAX_FREE_SWIPES_PER_DAY);
    }
  };

  const decrementSwipes = async () => {
    if (hasUnlimitedSwipes) return;
    const newCount = Math.max(0, freeSwipesLeft - 1);
    setFreeSwipesLeft(newCount);
    const today = new Date().toDateString();
    await supabase?.from('profiles').update({
      free_swipes_left: newCount,
      last_swipe_date: today
    }).eq('wallet_address', walletAddress);
  };

  const loadMyMatches = async () => {
    if (!supabase || !walletAddress) return;
    const { data, error } = await supabase
      .from('matches')
      .select('id, user1_wallet, user2_wallet')
      .or(`user1_wallet.eq.\( {walletAddress},user2_wallet.eq. \){walletAddress}`);

    if (error) return console.error(error);

    const formatted = data.map(m => {
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
    if (!supabase || !walletAddress) return;
    const { data, error } = await supabase
      .from('profiles_public')
      .select('*')
      .neq('wallet', walletAddress);

    if (error) console.error(error);
    setProfiles(data || []);
  };

  const loadSeenWallets = async () => {
    if (!supabase || !walletAddress) return;
    const { data, error } = await supabase
      .from('swipes')
      .select('to_profile')
      .eq('from_user', walletAddress);

    if (error) console.error(error);
    setSeenWallets(new Set(data?.map(s => s.to_profile) || []));
  };

  const connectWallet = async () => {
    if (!MiniKit.isInstalled()) return showToast('Abre en World App', 'error');
    try {
      const nonce = Date.now().toString() + Math.random().toString(36).slice(2);
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ nonce, statement: 'Conectar a RealVibe' });

      if (finalPayload.status !== 'success') return showToast('Cancelado', 'error');

      const address = finalPayload.address || MiniKit.walletAddress;
      setWalletAddress(address);
      localStorage.setItem('walletAddress', address);
      showToast('Wallet conectada', 'success');
    } catch (err) {
      showToast('Error al conectar', 'error');
    }
  };

  const handleAction = async (action) => {
    if (!currentProfile || !supabase) return;

    if (!hasUnlimitedSwipes && freeSwipesLeft <= 0) {
      showToast('Swipes agotados', 'error');
      setShowSubscriptionModal(true);
      return;
    }

    await supabase.from('swipes').insert({
      from_user: walletAddress,
      to_profile: currentProfile.wallet,
      action,
    });

    setSeenWallets(prev => new Set([...prev, currentProfile.wallet]));

    if (action === 'like') {
      const { data: mutual } = await supabase
        .from('swipes')
        .select('id')
        .eq('from_user', currentProfile.wallet)
        .eq('to_profile', walletAddress)
        .eq('action', 'like')
        .maybeSingle();

      if (mutual) {
        const sorted = [walletAddress, currentProfile.wallet].sort();
        const { data: match } = await supabase.from('matches').insert({
          user1_wallet: sorted[0],
          user2_wallet: sorted[1],
        }).select().single();

        if (match) {
          setMyMatches(prev => [...prev, {
            id: match.id,
            otherWallet: currentProfile.wallet,
            otherName: currentProfile.name,
            otherImage: currentProfile.image,
          }]);
          showToast('¡Match!', 'success');
        }
      }
    }

    if (!hasUnlimitedSwipes) await decrementSwipes();
    setDiscoverIndex(prev => prev + 1);
    resetCard();
  };

  const activateBoost = async () => {
    if (boostActive) return showToast('Boost ya activo', 'error');
    if (!supabase) return;

    const limit = getBoostLimit(subscriptionLevel);
    const hasQuota = boostsUsedThisMonth < limit;

    if (!hasQuota && subscriptionLevel !== 'diamond') {
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
      } catch (err) {
        showToast('Error pago boost', 'error');
      }
      return;
    }

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
    if (!currentProfile || !supabase) return;

    const limit = getSuperLikeLimit(subscriptionLevel);
    const hasQuota = superLikesUsedThisMonth < limit;

    if (!hasQuota && subscriptionLevel !== 'diamond') {
      try {
        const amount = tokenToDecimals(SUPERLIKE_COST_WLD, 18);
        const { finalPayload } = await MiniKit.commandsAsync.pay({
          to: TREASURY_WALLET,
          tokens: [{ symbol: Tokens.WLD, token_amount: amount }],
          description: 'RealVibe Super Like',
        });

        if (finalPayload.status !== 'success') return showToast('Pago cancelado', 'error');

        await supabase.from('super_likes').insert({
          from_user: walletAddress,
          to_profile: currentProfile.wallet,
        });

        await handleAction('like');
        showToast('Super Like enviado (pagado) ⭐', 'success');
      } catch (err) {
        showToast('Error pago Super Like', 'error');
      }
      return;
    }

    const newUsed = superLikesUsedThisMonth + 1;

    await supabase.from('profiles').update({
      super_likes_used_this_month: newUsed,
    }).eq('wallet_address', walletAddress);

    setSuperLikesUsedThisMonth(newUsed);

    await supabase.from('super_likes').insert({
      from_user: walletAddress,
      to_profile: currentProfile.wallet,
    });

    await handleAction('like');
    showToast(`Super Like enviado (\( {newUsed}/ \){limit === Infinity ? '∞' : limit}) ⭐`, 'success');
  };

  const handlePointerDown = (e) => {
    touchStartX.current = e.clientX;
    setIsDragging(true);
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
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

  const loadChatMessages = async (matchId) => {
    if (!supabase) return;
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
    if (!chatInput.trim() || !currentMatchId || !walletAddress || !supabase) return;

    const tempId = Date.now();
    const newMsg = {
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

  const openChat = (match) => {
    setCurrentMatchId(match.id);
    setCurrentOtherName(match.otherName);
    setCurrentOtherImage(match.otherImage);
    setCurrentScreen('chat');
    loadChatMessages(match.id);
  };

  if (hasCriticalError || errorMessage) {
    return (
      <div style={{ minHeight: '100vh', background: '#6C1A36', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
        <h1>¡Ups! Algo salió mal</h1>
        <p>{errorMessage || 'Revisa consola (F12)'}</p>
        <p>Posibles causas: variables de entorno faltantes o error en Supabase/MiniKit</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '14px 40px', background: 'white', color: '#6C1A36', borderRadius: '999px', border: 'none', fontWeight: 'bold' }}>
          Recargar
        </button>
      </div>
    );
  }

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
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowProfileForm(true)} style={{ padding: '10px 20px', borderRadius: '999px', background: '#444', color: 'white' }}>Editar perfil</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', borderRadius: '999px', background: '#444', color: 'white' }}>Subir foto</button>
            <button onClick={() => setCurrentScreen('matches')} style={{ padding: '10px 20px', borderRadius: '999px', background
