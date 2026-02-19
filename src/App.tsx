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
    image: '',
    wld: 100,
    subscriptionActive: true
  });

  const [cards, setCards] = useState<Profile[]>([
    { id:'1', name: 'José', description: 'Amante de la música', image: '', wld:0, subscriptionActive:false },
    { id:'2', name: 'Josesito', description: 'Fan del cine', image: '', wld:0, subscriptionActive:false },
    { id:'3', name: 'Alex', description: 'Aventurero y divertido', image: '', wld:0, subscriptionActive:false },
  ]);

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

  const handleSwipe = async (direction: 'left' | 'right', type: 'dislike' | 'like' | 'super' | 'boost' | 'gold' | 'platinum' | 'diamond') => {
    if (isSwiping) return;
    setSwipeDirection(direction);
    setIsSwiping(true);

    const topCard = cards[swipeIndex];
    const isSuperUser = userProfile.id === 'pgonia.world.id';
    let canPerform = true;
    let alertText = '';

    if (!isSuperUser) {
      if ((['boost','super','gold','platinum','diamond'].includes(type)) && userProfile.wld < 1) {
        canPerform = false;
        alertText = 'No tienes WLD suficiente';
      }
    }

    if (canPerform) {
      if ((['boost','super','gold','platinum','diamond'].includes(type)) && !isSuperUser) {
        setUserProfile(prev => ({ ...prev, wld: prev.wld - 1 }));
      }

      if (type === 'boost') {
        const boostExpiry = new Date();
        boostExpiry.setHours(boostExpiry.getHours() + 24);
        setUserProfile(prev => ({ ...prev, boostActiveUntil: boostExpiry.toISOString() }));
        await supabase.from('profiles').update({ boost_active_until: boostExpiry.toISOString() }).eq('id', userProfile.id);
      }

      registerAction(topCard, type);

      const colors: Record<string,string> = {
        dislike:'#888',
        like:'linear-gradient(90deg,#ff69b4,#8a2be2)',
        super:'linear-gradient(90deg,#00bfff,#1e90ff)',
        boost:'linear-gradient(90deg,#ff8c00,#ffa500)',
        gold:'gold',
        platinum:'silver',
        diamond:'cyan'
      };
      setAlertColor(colors[type]);
      alertText = type.toUpperCase();

      if (['super','like'].includes(type)) {
        const { data: match } = await supabase
          .from('matches')
          .select('*')
          .or(`user1_id.eq.${userProfile.id},user2_id.eq.${topCard.id}`)
          .limit(1)
          .single();
        if (!match) {
          const { data: newMatch } = await supabase.from('matches').insert({ user1_id: userProfile.id, user2_id: topCard.id }).select().single();
          if (newMatch) setCurrentMatchId(newMatch.id);
        }
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
    if (!currentMatchId) return setAlertMessage('No tienes Match para chat');
    setCurrentScreen('chat');
    const { data } = await supabase.from('messages').select('*').eq('match_id', currentMatchId).order('sent_at', { ascending: true });
    if (data) setChatMessages(data);
  };

  const sendMessage = async () => {
    if (!chatInput || !currentMatchId) return;
    const { data } = await supabase.from('messages').insert([{
      match_id: currentMatchId,
      sender_id: userProfile.id,
      receiver_id: cards[swipeIndex]?.id || 'unknown',
      message: chatInput,
      sent_at: new Date()
    }]);
    if (data) setChatMessages(prev => [...prev, data[0]]);
    setChatInput('');
  };

  const boostActive = userProfile.boostActiveUntil ? new Date(userProfile.boostActiveUntil) > new Date() : false;

  return (
    <div style={{backgroundColor:'#6C1A36', minHeight:'100vh', fontFamily:"'Plus Jakarta Sans', sans-serif", color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', padding:'10px', boxSizing:'border-box'}}>
      
      <button onClick={openChat} style={{position:'fixed', bottom:'20px', right:'20px', background:'pink', color:'#000', padding:'12px 16px', borderRadius:'50px', zIndex:10000, fontWeight:'700', transition:'all 0.3s'}}>Chat</button>

      {currentScreen === 'home' && (
        <>
          <div style={{width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
            <button onClick={()=>alert('Salir de la app')} style={{background:'transparent', color:'#fff', fontSize:'1.5rem', border:'none', cursor:'pointer'}}>←</button>
            <h1 style={{margin:0}}>RealVibe 3.0</h1>
            <button onClick={()=>setCurrentScreen('profileEdit')} style={{background:'transparent', border:'none', cursor:'pointer'}}>
              <img src="https://cdn-icons-png.flaticon.com/512/2099/2099058.png" alt="Perfil" style={{width:'30px', height:'30px'}} />
            </button>
          </div>

          <p style={{margin:'5px 0'}}>Swipes gratis: 9 | WLD: {userProfile.wld}</p>

          {/* Tarjetas */}
          <div style={{width:'100%', maxWidth:'400px', flex:1, display:'flex', justifyContent:'center', alignItems:'center', position:'relative'}}>
            {cards.slice(swipeIndex).map((card, idx) => {
              const isTop = idx === 0;
              return (
                <div key={card.id} style={{
                  background:'linear-gradient(90deg,#ff69b4,#8a2be2)',
                  color:'#000',
                  borderRadius:'20px',
                  width:'90%',
                  minHeight:'480px',
                  padding:'10px',
                  position:'absolute',
                  top:0,
                  left:'50%',
                  transform:'translateX(-50%)' + (isTop
                    ? swipeDirection==='left' ? ' translateX(-150%) rotate(-15deg)'
                    : swipeDirection==='right' ? ' translateX(150%) rotate(15deg)'
                    : ''
                    : ' scale(0.95)'),
                  textAlign:'center',
                  zIndex: cards.length - idx,
                  display:'flex',
                  flexDirection:'column',
                  justifyContent:'space-between',
                  transition:'transform 0.3s ease'
                }}>
                  <div style={{padding:'5px', borderRadius:'20px'}}>
                    <img src={card.image || 'https://picsum.photos/400/400?random=2'} alt={card.name} style={{width:'100%', height:'300px', objectFit:'cover', borderRadius:'15px'}} />
                  </div>
                  <div>
                    <h2>{card.name}</h2>
                    <p>{card.description}</p>
                  </div>

                  {isTop && (
                    <div style={{display:'flex', justifyContent:'center', gap:'10px', flexWrap:'wrap', marginTop:'10px'}}>
                      <button onClick={()=>handleSwipe('left','dislike')} style={{background:'#888', color:'#fff', padding:'10px 16px', borderRadius:'12px', transition:'all 0.3s'}}>Dislike</button>
                      <button onClick={()=>handleSwipe('right','like')} style={{background:'linear-gradient(90deg,#ff69b4,#8a2be2)', color:'#fff', padding:'10px 16px', borderRadius:'12px', transition:'all 0.3s'}}>Like</button>
                      <button onClick={()=>handleSwipe('right','super')} style={{background:'linear-gradient(90deg,#00bfff,#1e90ff)', color:'#fff', padding:'10px 16px', borderRadius:'12px', transition:'all 0.3s'}}>Super</button>
                    </div>
                  )}

                  {isTop && (
                    <div style={{display:'flex', justifyContent:'center', gap:'10px', flexWrap:'wrap', marginTop:'15px'}}>
                      { !boostActive && <button onClick={()=>handleSwipe('right','boost')} style={{background:'orange', color:'#fff', padding:'10px 16px', borderRadius:'12px', transition:'all 0.3s'}}>Boost 1 WLD</button> }
                      { boostActive && <button style={{background:'orange', color:'#fff', padding:'10px 16px', borderRadius:'12px', transition:'all 0.3s'}}>Activo 24h</button> }
                      <button onClick={()=>handleSwipe('right','gold')} style={{background:'gold', color:'#fff', padding:'10px 16px', borderRadius:'12px', transition:'all 0.3s'}}>Gold 10 WLD</button>
                      <button onClick={()=>handleSwipe('right','platinum')} style={{background:'silver', color:'#000', padding:'10px 16px', borderRadius:'12px', transition:'all 0.3s'}}>Platinum 25 WLD</button>
                      <button onClick={()=>handleSwipe('right','diamond')} style={{background:'cyan', color:'#000', padding:'10px 16px', borderRadius:'12px', transition:'all 0.3s'}}>Diamond 40 WLD</button>
                    </div>
                  )}

                </div>
              )
            })}
          </div>

          {alertMessage && (
            <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', padding:'20px 40px', borderRadius:'20px', color:'#fff', fontWeight:'700', fontSize:'1.5rem', background: alertColor, textAlign:'center', zIndex:9999, boxShadow:'0 5px 20px rgba(0,0,0,0.3)', pointerEvents:'none', transition:'all 0.3s'}}>
              {alertMessage}
            </div>
          )}
        </>
      )}

      {/* Chat y profileEdit se mantienen igual */}
    </div>
  )
    }
