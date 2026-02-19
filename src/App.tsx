import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

type Profile = {
  id: string;
  name: string;
  description: string;
  image: string;
  wld: number;
  subscriptionActive: boolean;
  boostActiveUntil?: string;
};

type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  sent_at: string;
};

const supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = 'YOUR_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'profileEdit' | 'chat'>('home');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertColor, setAlertColor] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentMatchId, setCurrentMatchId] = useState<string>('');

  const [userProfile, setUserProfile] = useState<Profile>({
    id: 'pgonia.world.id',
    name: '@pgonia',
    description: 'Aquí puedes editar tu descripción',
    image: 'https://picsum.photos/400/400?random=1',
    wld: 100,
    subscriptionActive: true
  });

  const cards: Profile[] = [
    { id:'1', name: 'José', description: 'Amante de la música', image: 'https://placekitten.com/400/400', wld:0, subscriptionActive:false },
    { id:'2', name: 'Josesito', description: 'Fan del cine', image: 'https://placekitten.com/401/400', wld:0, subscriptionActive:false },
    { id:'3', name: 'Alex', description: 'Aventurero y divertido', image: 'https://placekitten.com/402/400', wld:0, subscriptionActive:false },
  ];

  useEffect(() => {
    const stored = localStorage.getItem('userProfile');
    if (stored) setUserProfile(JSON.parse(stored));
  }, []);

  const saveProfile = (profile: Profile) => {
    setUserProfile(profile);
    localStorage.setItem('userProfile', JSON.stringify(profile));
    setCurrentScreen('home');
  };

  const registerAction = async (targetProfile: Profile, actionType: string) => {
    try {
      await supabase.from('actions').insert({
        user_id: userProfile.id,
        target_user_id: targetProfile.id,
        action_type: actionType,
        timestamp: new Date()
      });
    } catch (err) {
      console.error('Error registrando acción:', err);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right', type: 'dislike' | 'like' | 'super' | 'boost') => {
    if (isSwiping) return;
    setSwipeDirection(direction);
    setIsSwiping(true);

    const topCard = cards[swipeIndex];
    const isSuperUser = userProfile.id === 'pgonia.world.id';
    let canPerform = true;
    let alertText = '';

    if (!isSuperUser) {
      if ((type === 'boost' || type === 'super') && !userProfile.subscriptionActive && userProfile.wld < 1) {
        canPerform = false;
        alertText = 'No tienes WLD suficiente';
      }
    }

    if (canPerform) {
      if ((type === 'boost' || type === 'super') && !isSuperUser && !userProfile.subscriptionActive) {
        setUserProfile(prev => ({ ...prev, wld: prev.wld - 1 }));
      }

      if (type === 'boost') {
        const boostExpiry = new Date();
        boostExpiry.setHours(boostExpiry.getHours() + 24);
        setUserProfile(prev => ({ ...prev, boostActiveUntil: boostExpiry.toISOString() }));
        await supabase.from('profiles').update({ boost_active_until: boostExpiry.toISOString() }).eq('id', userProfile.id);
      }

      registerAction(topCard, type);

      if (type === 'dislike') setAlertColor('#888');
      if (type === 'like') setAlertColor('linear-gradient(90deg,#ff69b4,#8a2be2)');
      if (type === 'super') setAlertColor('linear-gradient(90deg,#00bfff,#1e90ff)');
      if (type === 'boost') setAlertColor('linear-gradient(90deg,#ff8c00,#ffa500)');

      alertText = type.toUpperCase();

      // Crear match si hay like o super
      if (type === 'like' || type === 'super') {
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('*')
          .or(`user1_id.eq.${userProfile.id},user2_id.eq.${userProfile.id}`)
          .limit(1)
          .single();

        let matchId = existingMatch?.id;

        if (!matchId) {
          const { data: newMatch } = await supabase
            .from('matches')
            .insert({ user1_id: userProfile.id, user2_id: topCard.id })
            .select()
            .single();
          matchId = newMatch?.id;
        }

        if (matchId) setCurrentMatchId(matchId);
      }

    } else {
      setAlertColor('#ff4d4d');
    }

    setAlertMessage(alertText);

    setTimeout(() => {
      setSwipeIndex(prev => (prev < cards.length - 1 ? prev + 1 : 0));
      setSwipeDirection(null);
      setIsSwiping(false);
      setAlertMessage(null);
    }, 500);
  };

  const openChat = async () => {
    let matchId = currentMatchId;

    if (!matchId) {
      const { data: firstMatch } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${userProfile.id},user2_id.eq.${userProfile.id}`)
        .limit(1)
        .single();

      if (!firstMatch) {
        alert('No tienes ningún match aún');
        return;
      }
      matchId = firstMatch.id;
      setCurrentMatchId(matchId);
    }

    setCurrentScreen('chat');

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('sent_at', { ascending: true });

    if (data) setChatMessages(data);

    // Subscripción en tiempo real
    supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, payload => {
        setChatMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
  };

  const sendMessage = async () => {
    if (!chatInput || !currentMatchId) return;
    const { data } = await supabase.from('messages').insert([{
      match_id: currentMatchId,
      sender_id: userProfile.id,
      receiver_id: cards[swipeIndex]?.id || 'unknown',
      message: chatInput,
      sent_at: new Date()
    }]).select();

    if (data) setChatMessages(prev => [...prev, data[0]]);
    setChatInput('');
  };

  const boostActive = userProfile.boostActiveUntil ? new Date(userProfile.boostActiveUntil) > new Date() : false;

  return (
    <div style={{backgroundColor:'#6C1A36', minHeight:'100vh', fontFamily:"'Plus Jakarta Sans', sans-serif", color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', padding:'10px', boxSizing:'border-box'}}>
      
      <button onClick={openChat} style={{position:'fixed', bottom:'20px', right:'20px', background:'pink', color:'#000', padding:'12px 16px', borderRadius:'50px', zIndex:10000, fontWeight:'700'}}>Chat</button>
      
      {currentScreen === 'home' && (
        <>
          {/* Código de home, igual que antes */}
          {/* ... */}
        </>
      )}

      {currentScreen === 'chat' && (
        <div style={{width:'100%', maxWidth:'400px', flex:1, display:'flex', flexDirection:'column', gap:'5px'}}>
          <h2 style={{textAlign:'center'}}>Chat</h2>
          <div style={{flex:1, overflowY:'auto', border:'2px solid #ff69b4', borderRadius:'12px', padding:'10px', background:'#fff', color:'#000'}}>
            {chatMessages.map((msg) => (
              <div key={msg.id} style={{textAlign: msg.sender_id === userProfile.id ? 'right' : 'left'}}>
                <span style={{background: msg.sender_id === userProfile.id ? '#ff69b4' : '#00bfff', padding:'5px 10px', borderRadius:'12px', display:'inline-block', margin:'2px 0', color:'#fff'}}>
                  {msg.message}
                </span>
              </div>
            ))}
          </div>
          <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
            <input style={{flex:1, padding:'8px', borderRadius:'12px'}} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Escribe un mensaje"/>
            <button style={{padding:'10px 16px', borderRadius:'12px', background:'green', color:'#fff'}} onClick={sendMessage}>Enviar</button>
          </div>
          <button style={{marginTop:'10px', borderRadius:'12px', padding:'10px 16px', background:'orange', color:'#fff'}} onClick={()=>setCurrentScreen('home')}>Volver</button>
        </div>
      )}

      {currentScreen === 'profileEdit' && (
        <div style={{background:'#fff', color:'#000', borderRadius:'20px', width:'90%', maxWidth:'400px', padding:'20px', marginTop:'20px', textAlign:'center'}}>
          {/* Código de edición de perfil, igual que antes */}
          {/* ... */}
        </div>
      )}
    </div>
  )
}
