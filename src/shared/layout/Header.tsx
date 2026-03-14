'use client';

import React from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isOnline?: boolean; // Para mostrar estado de red
}

export const Header = ({ sidebarOpen, setSidebarOpen, isOnline = true }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10 dark:bg-gray-800 dark:border-b dark:border-gray-700">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-gray-700 dark:text-gray-200"
        aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className="flex items-center gap-4">
        <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${isOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          }`}>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`}></div>
          {isOnline ? 'Online' : 'Modo Offline'}
        </div>
      </div>
    </header>
  );
};
