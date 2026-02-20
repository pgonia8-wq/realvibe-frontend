import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Protección contra variables de entorno faltantes → evita white screen
let supabase: ReturnType<typeof createClient> | null = null;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR CRÍTICO: Faltan variables de entorno Supabase');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL);
  console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'existe' : 'NO existe');
} else {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error('Error al crear cliente Supabase:', err);
  }
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
  useEffect(() => {
    if (!supabase) {
      setHasCriticalError(true);
      setErrorMessage('Supabase no está configurado. Revisa las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu .env');
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

  // Realtime chat
  useEffect(() => {
    if (!supabase || currentScreen !== 'chat' || !currentMatchId || !walletAddress) return;

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
    if (!supabase) return;
    setLoading(true);
    try {
      await Promise.all([
        loadProfile(),
        loadSwipes(),
        loadProfiles(),
        loadSeenWallets(),
      ]);
      await loadMyMatches();
    } catch (err) {
      console.error('Error en loadEverything:', err);
      setErrorMessage('Error al cargar datos iniciales');
    }
    setLoading(false);
  };

  // ────────────────────────────────────────────────
  // Load functions
  // ────────────────────────────────────────────────
  const loadProfile = async () => {
    if (!supabase || !walletAddress) return;

    try {
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

      if (error) throw error;

      const level = (data?.subscription as SubscriptionLevel) || 'none';
      setSubscriptionLevel(level);

      const until = data?.boost_until ? new Date(data.boost_until) : null;
      setBoostUntil(until);
      setBoostActive(!!until && until > new Date());

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
    } catch (err) {
      console.error('loadProfile error:', err);
      setErrorMessage('No se pudo cargar el perfil');
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
    await supabase?.from('profiles')
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

    if (error) console.error('Error cargando perfiles:', error);

    setProfiles(data || []);
  };

  const loadSeenWallets = async () => {
    if (!supabase || !walletAddress) return;

    const { data, error } = await supabase
      .from('swipes')
      .select('to_profile')
      .eq('from_user', walletAddress);

    if (error) console.error('Error cargando vistos:', error);

    setSeenWallets(new Set(data?.map(s => s.to_profile) || []));
  };

  // ────────────────────────────────────────────────
  // Wallet + World ID
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

      const { data, error } = await supabase?.functions.invoke('generate-wallet-jwt', {
        body: { wallet: address },
      });

      if (error || !data?.access_token) {
        showToast('Error al autenticar sesión', 'error');
        return;
      }

      await supabase?.auth.setSession({
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
        action: 'realvibe_register',
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

    await supabase
      .from('profiles_public')
      .upsert({ wallet: walletAddress, image: publicUrl }, { onConflict: 'wallet' });

    showToast('Foto actualizada', 'success');
    loadProfiles();
  };

  const saveProfile = async () => {
    if (!walletAddress || !supabase) return showToast('Conecta wallet primero', 'error');

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
  // Suscripción
  // ────────────────────────────────────────────────
  const upgradeSubscription = async (level: SubscriptionLevel, wldAmount: number) => {
    if (!walletAddress || !MiniKit.isInstalled() || !supabase) return showToast('Abre en World App', 'error');

    try {
      const amount = tokenToDecimals(wldAmount, 18);

      const { finalPayload } = await MiniKit.commandsAsync.pay({
        to: TREASURY_WALLET,
        tokens: [{ symbol: Tokens.WLD, token_amount: amount }],
        description: `RealVibe ${level.toUpperCase()} Suscripción`,
      });

      if (finalPayload.status !== 'success') return showToast('Pago cancelado', 'error');

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
    if (!currentProfile || !supabase) return;

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
      } catch {
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
        const amount = tokenToDecimals(SUPERLIKE
