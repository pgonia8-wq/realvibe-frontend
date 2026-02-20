import React, { useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MAX_FREE_SWIPES_PER_DAY = 10;

export default function RealVibeApp() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freeSwipesLeft, setFreeSwipesLeft] = useState(MAX_FREE_SWIPES_PER_DAY);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [discoverIndex, setDiscoverIndex] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        MiniKit.install();

        const stored = localStorage.getItem('walletAddress');
        if (stored) {
          setWalletAddress(stored);
        }

        setLoading(false);
      } catch (err) {
        setError('Error inicial: ' + (err as Error).message);
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!walletAddress) return;

    const loadProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles_public')
          .select('*')
          .neq('wallet', walletAddress);

        if (error) throw error;

        setProfiles(data || []);
      } catch (err) {
        setError('Error cargando perfiles: ' + (err as Error).message);
      }
    };

    loadProfiles();
  }, [walletAddress]);

  const connectWallet = async () => {
    try {
      const nonce = Date.now().toString();
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        statement: 'Conectar a RealVibe',
      });

      if (finalPayload.status === 'success') {
        const address = MiniKit.walletAddress || (finalPayload as any).address;
        setWalletAddress(address);
        localStorage.setItem('walletAddress', address);
      }
    } catch (err) {
      setError('Error al conectar: ' + (err as Error).message);
    }
  };

  if (loading) {
    return <div style={{ background: '#6C1A36', minHeight: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1>Cargando...</h1>
    </div>;
  }

  return (
    <div style={{ background: '#6C1A36', minHeight: '100vh', color: 'white', padding: '40px', textAlign: 'center' }}>
      <h1 style={{ color: 'white' }}>RealVibe - Versión Funcional</h1>

      {walletAddress ? (
        <>
          <p>Wallet conectada: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
          <p style={{ marginTop: '20px', fontSize: '1.3rem' }}>
            Swipes restantes: {freeSwipesLeft}/{MAX_FREE_SWIPES_PER_DAY}
          </p>

          {profiles.length === 0 ? (
            <div style={{ marginTop: '40px' }}>
              <h2>No hay más perfiles</h2>
              <p>Vuelve más tarde o invita amigos</p>
            </div>
          ) : (
            <div style={{ marginTop: '40px' }}>
              <h2>¡Perfiles cargados!</h2>
              <p>Total: {profiles.length}</p>
              <p>Primer perfil: {profiles[0]?.name || 'Sin nombre'} ({profiles[0]?.wallet?.slice(0, 6)}...)</p>
            </div>
          )}
        </>
      ) : (
        <button 
          onClick={connectWallet}
          style={{ padding: '20px 60px', fontSize: '1.3rem', borderRadius: '999px', background: 'linear-gradient(90deg, #ff69b4, #8a2be2)', color: 'white', border: 'none' }}
        >
          Conectar Wallet
        </button>
      )}

      {error && <p style={{ color: '#ff4d4d', marginTop: '40px' }}>{error}</p>}
    </div>
  );
          }
