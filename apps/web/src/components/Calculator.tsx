'use client';

import { useState } from 'react';

export default function Calculator() {
  const [costs, setCosts] = useState(2000);
  const savings = Math.round(costs * 0.25);
  const percentage = ((costs - 500) / 4500) * 100;

  return (
    <section className="bg-amber-50 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          Wie viel sparen Sie?
        </h2>
        <p className="text-xl text-gray-600 mb-16">
          Mit Wärmecontracting sparen Privatkunden durchschnittlich 25% der Heizkosten.
        </p>

        <div className="bg-white p-12 rounded-2xl shadow-lg">
          <div className="mb-10">
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Aktuelle jährliche Heizkosten:{' '}
              <span className="text-orange-600 text-lg">€{costs.toLocaleString('de-DE')}</span>
            </label>
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={costs}
              onChange={(e) => setCosts(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ea580c 0%, #ea580c ${percentage}%, #f3e8df ${percentage}%, #f3e8df 100%)`,
              }}
            />
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>€500</span>
              <span>€5.000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <p className="text-sm text-gray-600 mb-2">Ihre jährlichen Kosten</p>
              <p className="text-5xl font-bold text-teal-700">€{costs.toLocaleString('de-DE')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Einsparung mit Contracting</p>
              <p className="text-5xl font-bold text-orange-600">−€{savings.toLocaleString('de-DE')}</p>
            </div>
          </div>

          <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 transform hover:scale-105">
            Personalisiertes Angebot erhalten
          </button>
        </div>
      </div>
    </section>
  );
}
