// 'use client';

// import React from 'react';
// import { Menu, X } from 'lucide-react';

// interface HeaderProps {
//   sidebarOpen: boolean;
//   setSidebarOpen: (open: boolean) => void;
//   isOnline?: boolean; // Para mostrar estado de red
// }

// import { useNetwork } from '@/core/providers/NetworkProvider';
// import { Stethoscope } from 'lucide-react';

// export const Header = ({ sidebarOpen, setSidebarOpen }: HeaderProps) => {
//   const { isOnline } = useNetwork();
  
//   return (
//     <header className="bg-white/95 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-0 z-40 dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800">
//       <div className="flex items-center gap-4">
//         <button
//           onClick={() => setSidebarOpen(!sidebarOpen)}
//           className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all text-slate-500 dark:text-slate-400"
//           aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
//         >
//           {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
//         </button>
        
//         <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-900/30">
//            <div className="h-1.5 w-1.5 rounded-full bg-teal-500" />
//            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Servicio de Salud Escolar</span>
//         </div>
//       </div>

//       <div className="flex items-center gap-4">
//         <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all ${
//           isOnline 
//             ? 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' 
//             : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/30'
//         }`}>
//           <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
//           <span className="hidden xs:inline">{isOnline ? 'En línea' : 'Sin conexión'}</span>
//         </div>
//       </div>
//     </header>
//   );
// };
