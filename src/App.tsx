import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

type Profile = {
  id: string;
  name: string;
  description: string;
  likes: string;
  location: string;
  images: string[];
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
  const [currentScreen, setCurrentScreen] = useState<'home' | 'profileEdit' | 'chat' | 'profileModal'>('home');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertColor, setAlertColor] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentMatchId, setCurrentMatchId] = useState<string>('');
  const [modalProfile, setModalProfile] = useState<Profile | null>(null);

  const [userProfile, setUserProfile] = useState<Profile>({
    id: 'pgonia.world.id',
    name: '@pgonia',
    description: 'Aquí puedes editar tu descripción',
    likes: 'Música, Cine',
    location: 'CDMX, MX',
    images: [],
    wld: 100,
    subscriptionActive: true
  });

  const [cards, setCards] = useState<Profile[]>([
    { id:'1', name: 'José', description: 'Amante de la música', likes: 'Música', location:'CDMX', images: ['https://placekitten.com/400/400'], wld:0, subscriptionActive:false },
    { id:'2', name: 'Josesito', description: 'Fan del cine', likes: 'Cine', location:'CDMX', images: ['https://placekitten.com/401/400'], wld:0, subscriptionActive:false },
    { id:'3', name: 'Alex', description: 'Aventurero y divertido', likes: 'Viajes', location:'CDMX', images: ['https://placekitten.com/402/400'], wld:0, subscriptionActive:false },
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

  // Subir imagen a Supabase Storage
  const uploadImage = async (file: File, index: number) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userProfile.id}_${index}.${fileExt}`;
    const { data, error } = await supabase.storage.from('user-photos').upload(fileName, file, { upsert: true });
    if (error) { console.error(error); return; }
    const publicURL = supabase.storage.from('user-photos').getPublicUrl(fileName).data.publicUrl;
    const updatedImages = [...userProfile.images];
    updatedImages[index] = publicURL;
    setUserProfile(prev => ({ ...prev, images: updatedImages }));
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

      if ((type === 'like' || type === 'super') && !isSuperUser) {
        // Crear match si no existe
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('*')
          .or(`user1_id.eq.${userProfile.id},user2_id.eq.${topCard.id}`)
          .limit(1)
          .single();
        if (!existingMatch) {
          const { data: newMatch } = await supabase
            .from('matches')
            .insert({ user1_id: userProfile.id, user2_id: topCard.id })
            .select()
            .single();
          if (newMatch) setCurrentMatchId(newMatch.id);
        } else {
          setCurrentMatchId(existingMatch.id);
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
    if (!currentMatchId) { setAlertMessage('No tienes Match para chat'); return; }
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
      
      <button onClick={openChat} style={{position:'fixed', bottom:'20px', right:'20px', background:'pink', color:'#000', padding:'12px 16px', borderRadius:'50px', zIndex:10000, fontWeight:'700'}}>Chat</button>
      
      {currentScreen === 'home' && (
        <>
          <div style={{width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
            <button onClick={()=>alert('Salir de la app')} style={{background:'transparent', color:'#fff', fontSize:'1.5rem', border:'none', cursor:'pointer'}}>←</button>
            <h1 style={{margin:0}}>RealVibe 3.0</h1>
            <button onClick={()=>setCurrentScreen('profileEdit')} style={{background:'transparent', color:'#fff', fontSize:'1.5rem', border:'none', cursor:'pointer'}}>⚙️</button>
          </div>

          <p style={{margin:'5px 0'}}>Swipes gratis: 9 | WLD: {userProfile.wld}</p>

          <div style={{width:'100%', maxWidth:'400px', flex:1, display:'flex', justifyContent:'center', alignItems:'center', position:'relative'}}>
            {cards.slice(swipeIndex).map((card, idx) => {
              const isTop = idx === 0;
              return (
                <div key={card.id} style={{
                  background: 'linear-gradient(90deg,#ff69b4,#8a2be2)',
                  color:'#000',
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
                  textAlign:'center',
                  zIndex: cards.length - idx,
                  display:'flex',
                  flexDirection:'column',
                  justifyContent:'space-between',
                  transition:'transform 0.3s ease'
                }}>
                  <div style={{padding:'5px', borderRadius:'20px', flex:1, display:'flex', justifyContent:'center', alignItems:'center'}}>
                    {card.images[0] && <img src={card.images[0]} alt={card.name} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'15px'}} />}
                  </div>
                  <div>
                    <h2>{card.name}</h2>
                    <p>{card.description}</p>
                  </div>

                  {isTop && (
                    <div style={{display:'flex', justifyContent:'center', gap:'10px', flexWrap:'wrap', marginTop:'10px'}}>
                      <button onClick={()=>handleSwipe('left','dislike')} style={{background:'#888', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Dislike</button>
                      <button onClick={()=>handleSwipe('right','like')} style={{background:'linear-gradient(90deg,#ff69b4,#8a2be2)', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Like</button>
                      <button onClick={()=>handleSwipe('right','super')} style={{background:'linear-gradient(90deg,#00bfff,#1e90ff)', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Super</button>
                    </div>
                  )}

                  {isTop && (
                    <div style={{display:'flex', justifyContent:'center', gap:'10px', flexWrap:'wrap', marginTop:'15px'}}>
                      <button onClick={()=>handleSwipe('right','boost')} style={{background:'orange', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>
                        Boost 1 WLD {boostActive && '(Activo 24h)'}
                      </button>
                      <button style={{background:'gold', color:'#fff', padding:'10px 16px', borderRadius:'12px'}}>Gold 10 WLD</button>
                      <button style={{background:'silver', color:'#000', padding:'10px 16px', borderRadius:'12px'}}>Platinum 25 WLD</button>
                      <button style={{background:'cyan', color:'#000', padding:'10px 16px', borderRadius:'12px'}}>Diamond 40 WLD</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {alertMessage && (
            <div style={{
              position:'absolute',
              top:'50%',
              left:'50%',
              transform:'translate(-50%,-50%)',
              padding:'20px 40px',
              borderRadius:'20px',
              color:'#fff',
              fontWeight:'700',
              fontSize:'1.5rem',
              background: alertColor,
              textAlign:'center',
              zIndex:9999,
              boxShadow:'0 5px 20px rgba(0,0,0,0.3)',
              pointerEvents:'none',
              transition:'all 0.3s ease'
            }}>
              {alertMessage}
            </div>
          )}
        </>
      )}

      {currentScreen === 'profileEdit' && (
        <div style={{background:'#fff', color:'#000', borderRadius:'20px', width:'90%', maxWidth:'400px', padding:'20px', marginTop:'20px', textAlign:'center'}}>
          <h2>Editar Perfil</h2>
          <label style={{display:'block', margin:'5px 0'}}>
            Nombre:
            <input type="text" value={userProfile.name} onChange={(e)=>setUserProfile({...userProfile,name:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          <label style={{display:'block', margin:'5px 0'}}>
            Descripción:
            <textarea value={userProfile.description} onChange={(e)=>setUserProfile({...userProfile,description:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          <label style={{display:'block', margin:'5px 0'}}>
            Gustos:
            <input type="text" value={userProfile.likes} onChange={(e)=>setUserProfile({...userProfile,likes:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          <label style={{display:'block', margin:'5px 0'}}>
            Ubicación aproximada:
            <input type="text" value={userProfile.location} onChange={(e)=>setUserProfile({...userProfile,location:e.target.value})} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
          </label>
          {[0,1,2].map(idx => (
            <label key={idx} style={{display:'block', margin:'5px 0'}}>
              Foto {idx+1}:
              <input type="file" accept="image/*" onChange={e=>e.target.files && uploadImage(e.target.files[0], idx)} style={{width:'100%', padding:'8px', margin:'5px 0'}}/>
            </label>
          ))}
          <div style={{display:'flex', justifyContent:'space-between', marginTop:'10px'}}>
            <button onClick={()=>setCurrentScreen('home')} style={{padding:'10px 16px', borderRadius:'12px'}}>Cancelar</button>
            <button onClick={()=>saveProfile(userProfile)} style={{padding:'10px 16px', borderRadius:'12px', background:'green', color:'#fff'}}>Guardar</button>
          </div>
        </div>
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
    </div>
  );
}
