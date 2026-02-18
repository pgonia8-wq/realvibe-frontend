interface SwipeCardProps {
  profile: {
    id: number;
    name: string;
    age: number;
    bio: string;
    photoUrl: string;
  };
}

export default function SwipeCard({ profile }: SwipeCardProps) {
  return (
    <motion.div 
      className="card-container"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
    >
      <img src={profile.photoUrl} className="w-full h-full object-cover"/>
      <div className="absolute bottom-0 bg-black bg-opacity-50 w-full p-4 text-white">
        <h2 className="font-bold text-lg">{profile.name}</h2>
        <p>{profile.bio}</p>
      </div>
    </motion.div>
  );
}
