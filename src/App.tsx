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
          <button className="flex-1 bg-gray-300 py-3 rounded-xl">
            Dislike
          </button>

          <button className="flex-1 bg-pink-500 text-white py-3 rounded-xl">
            Like
          </button>

          <button className="flex-1 bg-blue-500 text-white py-3 rounded-xl">
            Super
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">
            Funciones Premium
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button className="bg-yellow-400 py-3 rounded-xl">
              Boost 1 WLD
            </button>

            <button className="bg-yellow-500 py-3 rounded-xl">
              Gold 10 WLD
            </button>

            <button className="bg-orange-500 py-3 rounded-xl">
              Platinum 25 WLD
            </button>

            <button className="bg-red-500 py-3 rounded-xl">
              Diamond 40
