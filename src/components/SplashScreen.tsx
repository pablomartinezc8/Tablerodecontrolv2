import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Increment loading bar progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1.25;
      });
    }, 30);

    // Fade out after 3.5 seconds
    const timeout = setTimeout(() => {
      onFinish();
    }, 3500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50 overflow-hidden text-white select-none">
      {/* Abstract technical grid background in background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.6)_0%,rgba(2,6,23,1)_80%)] z-0" />
      
      {/* Subtle blueprint grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] z-0" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center max-w-md px-6 text-center"
      >
        {/* LOGO TAGING (Vector/CSS representation based on the user's reference image) */}
        <div className="mb-8 flex flex-col items-center">
          {/* Cyan/Blue triangle above the text */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, type: 'spring' }}
            className="w-24 h-12 relative"
          >
            {/* Draw a right-angled triangle pointing up and right */}
            <svg viewBox="0 0 100 50" className="w-full h-full drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]">
              <polygon points="20,50 80,10 80,50" fill="#00a3e0" className="fill-sky-500" />
            </svg>
          </motion.div>
          
          {/* TAGING TEXT */}
          <motion.h1 
            initial={{ letterSpacing: '0.1em', opacity: 0 }}
            animate={{ letterSpacing: '0.18em', opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl md:text-5xl font-black tracking-widest font-sans mt-2"
          >
            TAGING
          </motion.h1>
          
          {/* Subtitle text */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-xs uppercase tracking-[0.25em] text-sky-400 font-medium font-sans mt-2"
          >
            Ingeniería Inteligente
          </motion.p>
        </div>

        {/* Separator line */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: 1, duration: 0.7 }}
          className="h-[1px] bg-gradient-to-r from-transparent via-slate-500 to-transparent w-full my-4"
        />

        {/* Product tagline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="space-y-1"
        >
          <h2 className="text-xl font-semibold text-slate-200 tracking-wide">Control de Proyectos</h2>
          <p className="text-sm text-slate-400 font-light max-w-sm leading-relaxed">
            Gestión, avance, costos y certificaciones en tiempo real
          </p>
        </motion.div>

        {/* Progress Bar Container */}
        <div className="w-64 h-1.5 bg-slate-800 rounded-full mt-12 overflow-hidden relative border border-slate-700/50">
          <motion.div 
            className="h-full bg-gradient-to-r from-sky-500 to-teal-400 rounded-full shadow-[0_0_8px_#0ea5e9]"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Loading status text */}
        <motion.span 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-[10px] text-slate-500 tracking-[0.15em] uppercase font-mono mt-2"
        >
          Inicializando base de datos... {Math.round(progress)}%
        </motion.span>
      </motion.div>

      {/* Footer system status labels */}
      <div className="absolute bottom-6 text-[10px] text-slate-600 tracking-wider uppercase font-mono z-10 flex space-x-6">
        <span>SISTEMA DE CONTROL DE INGENIERÍA V2.5</span>
        <span>•</span>
        <span>ESTABLE</span>
      </div>
    </div>
  );
}
