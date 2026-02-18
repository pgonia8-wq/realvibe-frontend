import React from "react";

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
    <div className="card-container">
      <img src={profile.photoUrl} alt={profile.name} />
      <div className="absolute bottom-0 bg-black bg-opacity-50 w-full p-4 text-white">
        <h2 className="font-bold text-lg">{profile.name}</h2>
        <p>{profile.bio}</p>
      </div>
    </div>
  );
}
