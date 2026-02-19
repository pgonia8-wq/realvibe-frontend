import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

type Profile = {
  id: string;
  name: string;
  description: string;
  wld: number;
  subscriptionActive: boolean;
  photos?: string[];
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
  const [currentScreen, setCurrentScreen] = useState<'home' | 'profileEdit' | 'chat'>('home');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertColor, setAlertColor] = useState<string>('');
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentMatchId, setCurrentMatchId] = useState<string>('');

  const [userProfile, setUserProfile] = useState<Profile>({
    id: 'pgonia.world.id',
    name: '@pgonia',
    description: 'Aquí puedes editar tu descripción',
    wld: 100,
    subscriptionActive: true,
    photos: [],
  });

  const cards: Profile[] = [
    { id:'1', name: 'José', description: 'Amante de la música', wld:0, subscriptionActive:false },
    { id:'2', name: 'Josesito', description: 'Fan del cine', wld:0, subscriptionActive:false },
    { id:'3', name: 'Alex', description: 'Aventurero y divertido', wld:0, subscriptionActive:false },
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
      }

      registerAction(topCard, type);

      if (type === 'dislike') setAlertColor('#888');
      if (type === 'like') setAlertColor('linear-gradient(90deg,#ff69b4,#8a2be2)');
      if (type === 'super') setAlertColor('linear-gradient(90deg,#00bfff,#1e90ff)');
      if (type === 'boost') setAlertColor('linear-gradient(90deg,#ff8c00,#ffa500)');

      alertText = type.toUpperCase();

      // Crear match para probar chat
      if (type === 'like' || type === 'super') {
        const { data: match } = await supabase.from('matches').select('*')
          .or(`user1_id.eq.${userProfile.id},user2_id.eq.${topCard.id}`)
          .limit(1).single();
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

  // CHAT en tiempo real
  useEffect(() => {
    if (!currentMatchId) return;
    const subscription = supabase
      .from(`messages:match_id=eq.${currentMatchId}`)
      .on('INSERT', payload => {
        setChatMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => {
      supabase.removeSubscription(subscription);
    }
  }, [currentMatchId]);

  const openChat = async () => {
    if (!currentMatchId) {
      alert('No tienes Match para chat');
      return;
    }
    setCurrentScreen('chat');
    const { data } = await supabase.from('messages').select('*').eq('match_id', currentMatchId).order('sent_at', { ascending:true });
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 3); // máximo 3 fotos
    const uploaded: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${userProfile.id}/${file.name}`;
      const { error } = await supabase.storage.from('user-photos').upload(path, file, { upsert:true });
      if (!error) {
        const { publicURL } = supabase.storage.from('user-photos').getPublicUrl(path);
        uploaded.push(publicURL || '');
      }
    }

    setUserProfile(prev => ({ ...prev, photos: uploaded }));
  };

  return (
    <div style={{backgroundColor:'#6C1A36', minHeight:'100vh', fontFamily:"'Plus Jakarta Sans', sans-serif", color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', padding:'10px'}}>
      
      {/* Botón fijo para abrir chat */}
      <button onClick={openChat} style={{position:'fixed', bottom:'20px', right:'20px', background:'pink', color:'#000', padding:'12px 16px', borderRadius:'50px', zIndex:10000, fontWeight:'700'}}>Chat</button>

      {currentScreen === 'home' && (
        <>
          <h1>RealVibe 3.0</h1>
          <p>Swipes gratis: 9 | WLD: {userProfile.wld}</p>
          <div style={{width:'100%', maxWidth:'400px', position:'relative'}}>
            {cards.slice(swipeIndex).map((card, idx) => {
              const isTop = idx === 0;
              return (
                <div key={card.name} style={{
                  background: 'linear-gradient(90deg,#ff69b4,#8a2be2)',
                  borderRadius:'20px',
                  width:'90%',
                  minHeight:'480px',
                  padding:'10px',
                  position:'absolute',
                  top:0,
                  left:'50%',
                  transform: 'translateX(-50%)' + (isTop
                    ? swipeDirection === 'left'
                      ? ' translateX(-150%) rotate(-15deg)'
                      : swipeDirection === 'right'
                      ? ' translateX(150%) rotate(15deg)'
                      : ''
                    : ' scale(0.95)'),
                  display:'flex',
                  flexDirection:'column',
                  justifyContent:'space-between',
                  textAlign:'center',
                  zIndex: cards.length - idx,
                  transition:'transform 0.3s ease'
                }}>
                  <div>
                    <h2>{card.name}</h2>
                    <p>{card.description}</p>
                  </div>
                  {isTop && (
                    <div style={{display:'flex', justifyContent:'center', gap:'10px', flexWrap:'wrap'}}>
                      <button onClick={()=>handleSwipe('left','dislike')} style={{background:'#888', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Dislike</button>
                      <button onClick={()=>handleSwipe('right','like')} style={{background:'linear-gradient(90deg,#ff69b4,#8a2be2)', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Like</button>
                      <button onClick={()=>handleSwipe('right','super')} style={{background:'linear-gradient(90deg,#00bfff,#1e90ff)', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Super</button>
                    </div>
                  )}
                  {isTop && (
                    <div style={{display:'flex', justifyContent:'center', gap:'10px', flexWrap:'wrap', marginTop:'10px'}}>
                      {boostActive && <span style={{padding:'10px', borderRadius:'12px', background:'#ffa500'}}>Activo 24h</span>}
                      {!boostActive && <button onClick={()=>handleSwipe('right','boost')} style={{background:'orange', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Boost 1 WLD</button>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {alertMessage && <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', padding:'20px 40px', borderRadius:'20px', color:'#fff', fontWeight:'700', fontSize:'1.5rem', background: alertColor}}>{alertMessage}</div>}
        </>
      )}

      {currentScreen === 'profileEdit' && (
        <div style={{background:'#fff', color:'#000', borderRadius:'20px', width:'90%', maxWidth:'400px', padding:'20px', marginTop:'20px', textAlign:'center'}}>
          <h2>Editar Perfil</h2>
          <label>
            Nombre:
            <input type="text" value={userProfile.name} onChange={e=>setUserProfile({...userProfile,name:e.target.value})}/>
          </label>
          <label>
            Descripción:
            <textarea value={userProfile.description} onChange={e=>setUserProfile({...userProfile,description:e.target.value})}/>
          </label>
          <label>
            Fotos (máx 3):
            <input type="file" multiple accept="image/*" onChange={handlePhotoUpload}/>
          </label>
          <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
            {userProfile.photos?.map((p,i)=><img key={i} src={p} alt={`Foto ${i+1}`} style={{width:'80px', height:'80px', objectFit:'cover', borderRadius:'12px'}}/>)}
          </div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px'}}>
            <button onClick={()=>setCurrentScreen('home')}>Cancelar</button>
            <button onClick={()=>saveProfile(userProfile)} style={{background:'green', color:'#fff'}}>Guardar</button>
          </div>
        </div>
      )}

      {currentScreen === 'chat' && (
        <div style={{width:'100%', maxWidth:'400px', flex:1, display:'flex', flexDirection:'column', gap:'5px'}}>
          <h2 style={{textAlign:'center'}}>Chat</h2>
          <div style={{flex:1, overflowY:'auto', border:'2px solid #ff69b4', borderRadius:'12px', padding:'10px', background:'#fff', color:'#000'}}>
            {chatMessages.map(msg=>(
              <div key={msg.id} style={{textAlign: msg.sender_id===userProfile.id?'right':'left'}}>
                <span style={{background: msg.sender_id===userProfile.id?'#ff69b4':'#00bfff', padding:'5px 10px', borderRadius:'12px', color:'#fff', display:'inline-block', margin:'2px 0'}}>
                  {msg.message}
                </span>
              </div>
            ))}
          </div>
          <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
            <input style={{flex:1}} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Escribe un mensaje"/>
            <button onClick={sendMessage} style={{background:'green', color:'#fff'}}>Enviar</button>
          </div>
          <button style={{marginTop:'10px', background:'orange', color:'#fff'}} onClick={()=>setCurrentScreen('home')}>Volver</button>
        </div>
      )}
    </div>
  )
}
