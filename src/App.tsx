import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MAX_FREE_SWIPES_PER_DAY = 10;

// Tipos básicos
type Profile = {
  id: number;
  name: string;
  age: number;
  bio: string;
  location: string;
  image: string;
  wallet: string;
};

export default function RealVibeApp() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [freeSwipesLeft, setFreeSwipesLeft] = useState(MAX_FREE_SWIPES_PER_DAY);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [discoverIndex, setDiscoverIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragRot, setDragRot] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showLike, setShowLike] = useState(false);
  const [showDislike, setShowDislike] = useState(false);

  const touchStartX = useRef(0);

  // ────────────────────────────────────────────────
  // Inicialización
  // ────────────────────────────────────────────────
  useEffect(() => {
    MiniKit.install();

    const stored = localStorage.getItem('walletAddress');
    if (stored) setWalletAddress(stored);
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);

      // Cargar perfiles desde Supabase
      const { data: profilesData, error } = await supabase
        .from('profiles_public')
        .select('*')
        .neq('wallet', walletAddress);

      if (error) {
        console.error('Error cargando perfiles:', error);
        setToast('No se pudieron cargar perfiles');
      } else {
        setProfiles(profilesData || []);
      }

      setLoading(false);
    };

    loadData();
  }, [walletAddress]);

  const connectWallet = async () => {
    if (!MiniKit.isInstalled()) {
      setToast('Abre la app dentro de World App');
      return;
    }

    try {
      const nonce = Date.now().toString();
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: 'Conectar a RealVibe',
      });

      if (finalPayload.status === 'success') {
        const address = MiniKit.walletAddress || (finalPayload as any).address;
        if (address) {
          setWalletAddress(address);
          localStorage.setItem('walletAddress', address);
          setToast('Wallet conectada');
        }
      }
    } catch (err) {
      setToast('Error al conectar wallet');
    }
  };

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = (action: 'like' | 'dislike') => {
    if (!topProfile) return;
    setToast(action === 'like' ? 'Like enviado' : 'Dislike registrado');

    if (freeSwipesLeft > 0) {
      setFreeSwipesLeft(prev => prev - 1);
    }

    setDiscoverIndex(prev => prev + 1);
  };

  const topProfile = profiles[discoverIndex % profiles.length] || null;

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: '#6C1A36', minHeight: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1>Cargando...</h1>
      </div>
    );
  }

  return (
    <div style={{ background: '#6C1A36', minHeight: '100vh', color: 'white', padding: '20px', fontFamily: 'sans-serif' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: 'rgba(0,0,0,0.7)',
          borderRadius: '999px',
          zIndex: 1000,
          color: 'white',
        }}>
          {toast}
        </div>
      )}

      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>RealVibe</h1>

      {!walletAddress ? (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={connectWallet}
            style={{
              padding: '16px 48px',
              fontSize: '1.2rem',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #ff69b4, #8a2be2)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Conectar Wallet
          </button>
        </div>
      ) : (
        <>
          <p style={{ textAlign: 'center', marginBottom: '20px' }}>
            Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>

          <p style={{ textAlign: 'center', marginBottom: '16px' }}>
            Swipes restantes: {freeSwipesLeft}/{MAX_FREE_SWIPES_PER_DAY}
          </p>

          {topProfile ? (
            <div style={{ position: 'relative', maxWidth: '400px', margin: '0 auto' }}>
              {/* Tarjeta principal */}
              <div
                style={{
                  transform: `translateX(\( {dragX}px) rotate( \){dragRot}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.4s ease-out',
                  touchAction: 'none',
                }}
                onPointerDown={(e) => {
                  touchStartX.current = e.clientX;
                  setIsDragging(true);
                  e.preventDefault();
                }}
                onPointerMove={(e) => {
                  if (!isDragging) return;
                  const deltaX = e.clientX - touchStartX.current;
                  setDragX(deltaX);
                  setDragRot(deltaX / 12);
                  setShowLike(deltaX > 60);
                  setShowDislike(deltaX < -60);
                }}
                onPointerUp={() => {
                  setIsDragging(false);
                  if (Math.abs(dragX) > 120) {
                    const isLike = dragX > 0;
                    setDragX(isLike ? window.innerWidth : -window.innerWidth);
                    setDragRot(isLike ? 45 : -45);
                    setTimeout(() => handleAction(isLike ? 'like' : 'dislike'), 300);
                  } else {
                    setDragX(0);
                    setDragRot(0);
                    setShowLike(false);
                    setShowDislike(false);
                  }
                }}
                onPointerCancel={() => {
                  setDragX(0);
                  setDragRot(0);
                  setShowLike(false);
                  setShowDislike(false);
                  setIsDragging(false);
                }}
              >
                <div style={{
                  background: 'linear-gradient(135deg, #ff69b4, #8a2be2)',
                  borderRadius: '24px',
                  padding: '20px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                }}>
                  <img
                    src={topProfile.image}
                    alt={topProfile.name}
                    style={{ width: '100%', borderRadius: '16px', marginBottom: '16px' }}
                  />
                  <h2 style={{ margin: '0 0 8px' }}>{topProfile.name}, {topProfile.age}</h2>
                  <p style={{ margin: '0 0 8px' }}>{topProfile.bio}</p>
                  <p style={{ margin: 0 }}>📍 {topProfile.location}</p>
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginTop: '24px' }}>
                <button
                  onClick={() => handleAction('dislike')}
                  style={{ padding: '16px 40px', background: '#444', borderRadius: '999px', color: 'white', border: 'none', fontSize: '1.4rem' }}
                >
                  👎
                </button>
                <button
                  onClick={() => handleAction('like')}
                  style={{ padding: '16px 50px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', borderRadius: '999px', color: 'white', border: 'none', fontSize: '1.4rem' }}
                >
                  ❤️
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px' }}>
              <h2>No hay más perfiles</h2>
              <p>Vuelve más tarde o invita amigos</p>
            </div>
          )}
        </>
      )}
    </div>
  );
    }
