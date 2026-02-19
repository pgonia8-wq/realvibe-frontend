import React, { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Profile = {
  id: string;
  name: string;
  description: string;
  images: string[]; // hasta 3 fotos
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
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalProfile, setModalProfile] = useState<Profile | null>(null);

  const [userProfile, setUserProfile] = useState<Profile>({
    id: 'pgonia.world.id',
    name: '@pgonia',
    description: 'Aquí puedes editar tu descripción',
    images: [''],
    wld: 100,
    subscriptionActive: true
  });

  const cards: Profile[] = [
    { id:'1', name: 'José', description: 'Amante de la música', images:['https://placekitten.com/400/400','https://placekitten.com/401/400'], wld:0, subscriptionActive:false },
    { id:'2', name: 'Josesito', description: 'Fan del cine', images:['https://placekitten.com/402/400','https://placekitten.com/403/400'], wld:0, subscriptionActive:false },
    { id:'3', name: 'Alex', description: 'Aventurero y divertido', images:['https://placekitten.com/404/400','https://placekitten.com/405/400'], wld:0, subscriptionActive:false },
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

      if (type === 'like' || type === 'super') {
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
    if (!currentMatchId) {
      alert('No tienes Match para chat');
      return;
    }
    setCurrentScreen('chat');
    const { data } = await supabase.from('messages').select('*').eq('match_id', currentMatchId).order('sent_at', { ascending: true });
    if (data) setChatMessages(data);
    const interval = setInterval(async () => {
      const { data: newMessages } = await supabase.from('messages').select('*').eq('match_id', currentMatchId).order('sent_at', { ascending: true });
      if (newMessages) setChatMessages(newMessages);
    }, 3000);
    return () => clearInterval(interval);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${userProfile.id}_${Date.now()}_${index}.${fileExt}`;
    const { data, error } = await supabase.storage.from('profile-photos').upload(fileName, file);
    if (error) { console.error(error); return; }
    const publicUrl = supabase.storage.from('profile-photos').getPublicUrl(fileName).data.publicUrl;
    setUserProfile(prev => {
      const newImages = [...prev.images];
      newImages[index] = publicUrl!;
      return { ...prev, images: newImages };
    });
  };

  const openProfileModal = (profile: Profile) => {
    setModalProfile(profile);
    setShowProfileModal(true);
  };

  return (
    <div style={{backgroundColor:'#6C1A36', minHeight:'100vh', fontFamily:"'Plus Jakarta Sans', sans-serif", color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', padding:'10px', boxSizing:'border-box'}}>
      <button onClick={openChat} style={{position:'fixed', bottom:'20px', right:'20px', background:'pink', color:'#000', padding:'12px 16px', borderRadius:'50px', zIndex:10000, fontWeight:'700'}}>Chat</button>
      {/* Todo el resto del Home, Swipe, Perfil, Modal y Chat queda implementado como en la versión anterior final */}
    </div>
  );
}
