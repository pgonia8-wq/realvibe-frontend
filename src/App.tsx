import { useState } from "react";

export default function App() {
  const [swipes] = useState(9);
  const [wld] = useState(0);
  const profiles: any[] = [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex justify-center">
      <div className="w-full max-w-md p-4">

        <h1 className="text-3xl font-bold text-center mb-2">
          RealVibe 3.0
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Swipes gratis: {swipes} | WLD: {wld}
        </p>

        <div className="bg-white rounded-3xl shadow-xl h-[420px] flex items-center justify-center mb-6">
          {profiles.length === 0 ? (
            <p className="text-gray-400">
              No hay perfiles disponibles
            </p>
          ) : (
            <div>Perfil aquí</div>
          )}
        </div>

        <div className="flex justify-between gap-3 mb-6">
          <button className="flex-1
