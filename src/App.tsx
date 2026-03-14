import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Zap, Trophy, Settings, Users, ArrowRight, X, RefreshCw, Droplets, Percent, Cookie, XCircle, Star, Trash2, Download, Maximize } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Prize {
  id: number;
  name: string;
  probability: number;
  stock: number;
}

interface Lead {
  id: number;
  whatsapp: string;
  prize_name: string;
  created_at: string;
}

// --- Components ---

const SymbolIcon = ({ id, className }: { id: number | string; className?: string }) => {
  const images: Record<number | string, string> = {
    1: "/the_black_sheep.png", // THE BLACK SHEEP (POD)
    2: "/el_vape_club.png",      // COLGANTE EL VAPE CLUB
    3: "/cereza.png",             // Alfajor Rasta
    4: "/limon.png",              // Sigue Participando
    'default': "/big_win.png"     // Default
  };

  const src = images[id] || images['default'];

  return (
    <img
      src={src}
      alt={`Symbol ${id}`}
      className={cn("object-contain rounded-xl", className)}
      referrerPolicy="no-referrer"
    />
  );
};

const SlotReel = ({ symbol, spinning }: { symbol: string | number; spinning: boolean }) => {
  const spinSequence = React.useMemo(() => {
    return [1, 2, 3, 4].sort(() => Math.random() - 0.5);
  }, [spinning]);

  return (
    <div className={cn(
      "w-28 h-44 md:w-56 md:h-80 bg-gradient-to-b from-black/80 to-black/40 border-2 rounded-3xl flex items-center justify-center overflow-hidden relative transition-all duration-700",
      spinning 
        ? "border-cyber-pink shadow-[0_0_40px_rgba(255,0,255,0.5)]" 
        : "border-cyber-blue/30 shadow-[0_0_20px_rgba(0,255,255,0.15)]"
    )}>
      {/* Capas estéticas de fondo */}
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cyber-blue/10 to-transparent z-0" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-cyber-pink/10 to-transparent z-0" />
      
      {/* Brillo de cristal frontal */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-40" />

      <div className="relative w-full h-full flex items-center justify-center z-10">
        <AnimatePresence mode="popLayout" initial={false}>
          {spinning ? (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ y: [-1000, 0] }}
                transition={{ repeat: Infinity, duration: 0.15, ease: "linear" }}
                className="flex flex-col gap-12"
              >
                {[...spinSequence, ...spinSequence, ...spinSequence].map((id, index) => (
                  <div key={`spin-${index}`} className="flex justify-center">
                    <SymbolIcon id={id} className="w-20 h-20 md:w-40 md:h-40 opacity-30 blur-[2px] grayscale brightness-150" />
                  </div>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key={symbol}
              initial={{ y: -200, opacity: 0, scale: 0.4, filter: 'blur(10px)' }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 18,
                mass: 1
              }}
              className="w-full h-full flex items-center justify-center p-3 md:p-6"
            >
              {symbol === '?' ? (
                <motion.span 
                  animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [0.5, 1, 0.5],
                    textShadow: ["0 0 10px #00ffff", "0 0 30px #00ffff", "0 0 10px #00ffff"]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-7xl md:text-[10rem] font-black text-cyber-blue italic"
                >
                  ?
                </motion.span>
              ) : (
                <motion.div
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  className="relative group"
                >
                  <SymbolIcon 
                    id={symbol} 
                    className="w-24 h-24 md:w-48 md:h-48 drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]" 
                  />
                  {/* Destello sutil al aparecer */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-white rounded-full blur-xl"
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sombras internas para profundidad realista */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] z-30" />
      <div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none z-40" />
      
      {/* Divisores de riel (opcional, le da toque mecánico) */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyber-blue/50 to-transparent z-40" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyber-pink/50 to-transparent z-40" />
    </div>
  );
};

export default function App() {
  const [whatsapp, setWhatsapp] = useState('+595');
  const [reelsSpinning, setReelsSpinning] = useState([false, false, false]);
  const [result, setResult] = useState<{ prize: Prize; reels: number[]; isWin: boolean } | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState('');
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [allWon, setAllWon] = useState<boolean>(false);
  const [adminMaxAttempts, setAdminMaxAttempts] = useState<string>("3");
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false); // New state
  const [showUnlockModal, setShowUnlockModal] = useState(false); // New state
  const [unlockPin, setUnlockPin] = useState(''); // New state
  const [isUnlocking, setIsUnlocking] = useState(false); // New state

  // --- Hidden Prize Force Easter Egg ---
  const isPrizeForced = useRef(false);
  const forcedWinSession = useRef(false);
  const tapTimestamps = useRef<number[]>([]);
  const [logoFlash, setLogoFlash] = useState(false);

  // Estado de sesión finalizada (3 intentos agotados sin ganancia)
  const [sessionFinished, setSessionFinished] = useState(false);

  // Reset manual — único punto de retorno al inicio
  const handleManualReset = () => {
    setResult(null);
    setShowResultOverlay(false);
    setWhatsapp('+595');
    setHasWon(false);
    setAllWon(false);
    setRemainingAttempts(null);
    setAttemptsCount(0);
    setError('');
    setSessionFinished(false);
    forcedWinSession.current = false;
    isPrizeForced.current = false;
  };

  const handleLogoTap = () => {
    const now = Date.now();
    // Keep only taps within the last 500ms
    tapTimestamps.current = tapTimestamps.current.filter(t => now - t < 500);
    tapTimestamps.current.push(now);

    if (tapTimestamps.current.length >= 3) {
      tapTimestamps.current = [];
      isPrizeForced.current = true;
      // Trigger flash animation as confirmation
      setLogoFlash(true);
      setTimeout(() => setLogoFlash(false), 600);
    }
  };
  // --- End Easter Egg ---

  const spinAudio = useRef<HTMLAudioElement | null>(null);
  const winAudio = useRef<HTMLAudioElement | null>(null);
  const loseAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Precarga de imágenes para evitar parpadeos
    const imageUrls = [
      "/the_black_sheep.png",
      "/el_vape_club.png",
      "/cereza.png",
      "/limon.png",
      "/fondo_general.jpg",
      "/big_win.png"
    ];
    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });

    // Inicialización de audio
    const spin = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    spin.loop = true;
    spinAudio.current = spin;

    const win = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
    win.load();
    winAudio.current = win;

    const lose = new Audio('https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3');
    lose.load();
    loseAudio.current = lose;

    return () => {
      spin.pause();
      win.pause();
      lose.pause();
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      // @ts-ignore (vendors)
      const requestFullscreen = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || document.documentElement.msRequestFullscreen;
      if (requestFullscreen) {
        requestFullscreen.call(document.documentElement).catch((err: any) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const STORE_WHATSAPP = "595983127102";

  useEffect(() => {
    if (showAdmin && adminPassword) {
      fetchAdminData();
    }
  }, [showAdmin, adminPassword]);

  useEffect(() => {
    if (whatsapp.length === 13) {
      fetchUserStatus(whatsapp);
    } else {
      setRemainingAttempts(null);
      setHasWon(false);
      setAllWon(false);
      setResult(null);
      setShowResultOverlay(false);
      setAttemptsCount(0);
      setError('');
    }
  }, [whatsapp]);

  const fetchUserStatus = async (phone: string) => {
    if (phone.length < 13) return;

    setIsLoadingStatus(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`/api/status?whatsapp=${encodeURIComponent(phone)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setRemainingAttempts(typeof data.remaining === 'number' ? data.remaining : Number(data.remaining));
        setAttemptsCount(typeof data.attempts === 'number' ? data.attempts : Number(data.attempts));
        setMaxAttempts(typeof data.max_attempts === 'number' ? data.max_attempts : Number(data.max_attempts));
        setHasWon(!!data.hasWon);
        setAllWon(!!data.allWon);
      } else {
        setRemainingAttempts(0);
      }
    } catch (err) {
      console.error('Error fetching status:', err);
      setRemainingAttempts(0);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [pRes, lRes, sRes] = await Promise.all([
        fetch('/api/admin/prizes', { headers: { 'Authorization': adminPassword } }),
        fetch('/api/admin/leads', { headers: { 'Authorization': adminPassword } }),
        fetch('/api/admin/settings', { headers: { 'Authorization': adminPassword } })
      ]);
      if (!pRes.ok) throw new Error("Unauthorized");
      setPrizes(await pRes.json());
      setLeads(await lRes.json());
      const settings = await sRes.json();
      setAdminMaxAttempts(settings.max_attempts || "3");
    } catch (e) {
      setAuthError("🔒 ACCESO DENEGADO. Intenta de nuevo.");
      setShowAdmin(false);
      setAdminPassword("");
      setShowAuthModal(true);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAdminPassword(tempPassword);
    setShowAuthModal(false);
    setShowAdmin(true);
    setTempPassword('');
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': adminPassword },
        body: JSON.stringify({ max_attempts: adminMaxAttempts })
      });
      if (res.ok) {
        fetchAdminData();
        alert('Configuración guardada');
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  const handleUpdatePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrize) return;

    try {
      const res = await fetch(`/api/admin/prizes/${editingPrize.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': adminPassword },
        body: JSON.stringify({
          name: editingPrize.name,
          probability: Number(editingPrize.probability),
          stock: Number(editingPrize.stock)
        })
      });

      if (res.ok) {
        setEditingPrize(null);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error updating prize:', err);
    }
  };

  const handleDeleteLead = async (id: number | string) => {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }

    setDeletingId(null);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': adminPassword }
      });
      if (res.ok) {
        fetchAdminData();
      } else {
        const data = await res.json();
        setError('Error al eliminar: ' + (data.error || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
      setError('Error de red al intentar eliminar');
    }
  };

  const handleClearLeads = async () => {
    if (!isClearingAll) {
      setIsClearingAll(true);
      setTimeout(() => setIsClearingAll(false), 3000);
      return;
    }

    setIsClearingAll(false);
    try {
      const res = await fetch('/api/admin/leads/all/clear', {
        method: 'DELETE',
        headers: { 'Authorization': adminPassword }
      });
      if (res.ok) {
        fetchAdminData();
      } else {
        const data = await res.json();
        setError('Error al limpiar contactos: ' + (data.error || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error clearing leads:', err);
    }
  };

  const handleExportExcel = () => {
    if (leads.length === 0) return;

    const dataToExport = leads.map(lead => ({
      'WhatsApp': lead.whatsapp,
      'Premio': lead.prize_name,
      'Fecha': new Date(lead.created_at).toLocaleString('es-PY')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contactos");

    XLSX.writeFile(workbook, `Contactos_LuckyClub_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp || !unlockPin) return;

    setIsUnlocking(true);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, pin: unlockPin })
      });
      const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }));
      
      if (res.ok && data.success) {
        setShowUnlockModal(false);
        setUnlockPin('');
        setError('');
        await fetchUserStatus(whatsapp);
      } else {
        setError(data.error || 'Error de autorización (PIN incorrecto)');
      }
    } catch (err) {
      console.error('Error unlocking:', err);
      setError('Error de conexión');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSpin = async () => {
    if (!whatsapp || whatsapp.length < 13) {
      setError('Por favor ingresa un WhatsApp válido (13 caracteres)');
      return;
    }
    setError('');
    setResult(null);
    setShowResultOverlay(false);
    setReelsSpinning([true, true, true]);

    // Tomar el estado del Easter Egg SIN resetearlo — persiste durante los 3 tiros
    const forcingPrize = isPrizeForced.current;
    if (forcingPrize && !forcedWinSession.current) {
      forcedWinSession.current = true; // marca que estamos en una ronda forzada
    }

    if (spinAudio.current) {
      spinAudio.current.currentTime = 0;
      spinAudio.current.play().catch(e => console.log("Audio play blocked:", e));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp,
          ...(forcingPrize && { force_prize: true, _fk: 'lv_easter_77x' })
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al girar');
      }

      const data = await res.json();

      setTimeout(() => {
        setReelsSpinning(prev => [false, prev[1], prev[2]]);
        setResult(data);
      }, 1500); // 1.5 segundos para la primera ficha

      setTimeout(() => {
        setReelsSpinning(prev => [prev[0], false, prev[2]]);
      }, 2500); // 2.5 segundos para la segunda ficha (¡Parece que gana!)

      setTimeout(() => {
        setReelsSpinning(prev => [prev[0], prev[1], false]);
        setRemainingAttempts(data.remaining);
        setAttemptsCount(data.attempts);
        setHasWon(data.hasWon);
        setAllWon(data.allWon);

        // Si se agotaron los intentos, marcar la sesión como finalizada
        if (data.remaining <= 0) {
          setSessionFinished(true);
        }

        if (spinAudio.current) {
          spinAudio.current.pause();
        }

        setTimeout(() => {
          setShowResultOverlay(true);
          if (data.isWin) {
            setHasWon(true);
            // Si ganamos en sesión forzada, solo limpiar el flag - sin auto-reset
            if (forcedWinSession.current) {
              isPrizeForced.current = false;
              forcedWinSession.current = false;
            }
            if (winAudio.current) {
              winAudio.current.currentTime = 0;
              winAudio.current.play().catch(e => console.log("Win audio play blocked:", e));
            }
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#ff00ff', '#00ffff', '#bc13fe']
            });
          } else {
            if (loseAudio.current) {
              loseAudio.current.currentTime = 0;
              loseAudio.current.play().catch(e => console.log("Lose audio play blocked:", e));
            }
          }
        }, 1500); // 1.5 segundos después de la decepción de la última ficha
      }, 4000); // 4.0 segundos en total rodando (la tercera ficha genera tensión)

    } catch (err: any) {
      setError(err.message);
      setReelsSpinning([false, false, false]);
    }
  };

  const getWhatsAppUrl = (prizeName: string) => {
    const message = `¡Hola! Gané *${prizeName}* en LuckyClub con mi número ${whatsapp}. ¿Cómo puedo reclamarlo?`;
    return `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;
  };


  return (
    <div className="min-h-screen w-full relative flex flex-col items-center pt-32 pb-12 md:pt-44 px-4 md:px-8 bg-cyber-dark overflow-x-hidden">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src="/fondo_general.jpg"
          alt="Cyberpunk Background"
          className="w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-dark/40 via-cyber-pink/5 to-cyber-dark/90" />
      </div>

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-8 z-10"
      >
        <h1
          onClick={handleLogoTap}
          className={`text-3xl md:text-5xl font-display font-black tracking-tighter italic neon-text mb-2 select-none cursor-default transition-all duration-75 ${
            logoFlash ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,1)] opacity-100 scale-105' : ''
          }`}
          style={logoFlash ? { filter: 'brightness(4) saturate(0)' } : {}}
        >
          LUCKY<span className={logoFlash ? 'text-white' : 'text-cyber-blue'}>VAPE</span>
        </h1>
        <p className="text-cyber-blue/60 font-mono text-[10px] tracking-widest uppercase">
          Gana recompensas
        </p>
      </motion.div>

      <motion.div
        layout
        animate={{}}
        className="w-full max-w-5xl bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 relative overflow-hidden"
      >
        {!showResultOverlay ? (
          <div className="space-y-8">
            <div className="flex justify-center gap-4 md:gap-10">
              <SlotReel symbol={result ? result.reels[0] : '?'} spinning={reelsSpinning[0]} />
              <SlotReel symbol={result ? result.reels[1] : '?'} spinning={reelsSpinning[1]} />
              <SlotReel symbol={result ? result.reels[2] : '?'} spinning={reelsSpinning[2]} />
            </div>

            <div className="space-y-4 max-w-sm mx-auto">
              <div className="relative flex items-center">
                <Smartphone className="absolute left-4 text-cyber-blue w-5 h-5" />
                <span className="absolute left-11 text-xl text-white/50 font-mono select-none pointer-events-none">
                  +595
                </span>
                <input
                  type="tel"
                  placeholder="9XX XXX XXX"
                  value={whatsapp.replace('+595', '')}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    
                    // Si pegan el número con el código de país, lo limpiamos
                    if (val.startsWith('595')) {
                      val = val.slice(3);
                    }
                    
                    // No permitir el 0 inicial del número local
                    if (val.startsWith('0')) {
                      val = val.slice(1);
                    }

                    // Máximo 9 dígitos (formato Paraguay: 9xx xxx xxx)
                    if (val.length <= 9) {
                      const finalNum = '+595' + val;
                      setWhatsapp(finalNum);
                      
                      if (val.length === 9) {
                        const target = e.target as HTMLInputElement;
                        setTimeout(() => target.blur(), 50);
                      }
                    }
                  }}
                  disabled={reelsSpinning.some(s => s) || !!result}
                  className="w-full bg-black/40 border-2 border-cyber-blue/30 rounded-xl py-4 pl-24 pr-4 text-xl focus:border-cyber-pink outline-none text-white font-mono transition-all"
                />
              </div>

              {isLoadingStatus ? (
                <div className="flex justify-center gap-2">
                  <RefreshCw className="w-3 h-3 text-cyber-blue animate-spin" />
                  <span className="text-[10px] text-cyber-blue/60 font-mono uppercase tracking-tighter">Verificando...</span>
                </div>
              ) : remainingAttempts !== null ? (
                <div className="flex justify-center gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-3 h-3 rounded-full border border-cyber-blue/50",
                          remainingAttempts !== null && remainingAttempts > 0 && i < (3 - (attemptsCount % 3)) ? "bg-cyber-blue shadow-[0_0_8px_rgba(0,255,255,0.6)]" : "bg-transparent"
                        )}
                      />
                    ))}
                  <span className="ml-2 text-[10px] text-cyber-blue/60 font-mono uppercase tracking-tighter">
                    {remainingAttempts !== null && remainingAttempts > 0 ? `${3 - (attemptsCount % 3)} ${(3 - (attemptsCount % 3)) === 1 ? 'intento' : 'intentos'}` : (allWon ? '¡Ya ganaste todo!' : (hasWon ? '¡Ya ganaste! Sigue por más' : 'Sin intentos'))}
                  </span>
                </div>
              ) : (
                whatsapp.length === 13 && (
                  <div className="flex justify-center gap-2">
                    <RefreshCw className="w-3 h-3 text-cyber-blue animate-spin" />
                    <span className="text-[10px] text-cyber-blue/60 font-mono uppercase tracking-tighter">Cargando...</span>
                  </div>
                )
              )}

              <div className="relative">
                <button
                  onClick={handleSpin}
                  disabled={reelsSpinning.some(s => s) || isLoadingStatus || !whatsapp || whatsapp.length < 13 || !!result || (remainingAttempts !== null && remainingAttempts <= 0)}
                  className={cn(
                    "w-full py-6 rounded-xl text-2xl font-black tracking-widest uppercase transition-all relative overflow-hidden",
                    reelsSpinning.some(s => s) || isLoadingStatus || !whatsapp || whatsapp.length < 13 || !!result || (remainingAttempts !== null && remainingAttempts <= 0)
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : "bg-cyber-pink text-white shadow-[0_0_20px_rgba(255,0,255,0.4)]"
                  )}
                >
                  {reelsSpinning.some(s => s) ? 'PROCESANDO...' : (isLoadingStatus ? 'VERIFICANDO...' : (remainingAttempts !== null && remainingAttempts <= 0 ? 'SIN INTENTOS' : 'GIRAR AHORA'))}
                </button>
                
                {remainingAttempts !== null && remainingAttempts <= 0 && !reelsSpinning.some(s => s) && (
                  <button
                    onClick={() => setShowUnlockModal(true)}
                    className="absolute -top-3 -right-3 w-10 h-10 bg-cyber-dark border-2 border-cyber-blue rounded-full flex items-center justify-center text-cyber-blue shadow-[0_0_10px_rgba(0,255,255,0.5)] hover:scale-110 transition-transform z-20"
                    title="Nueva Compra - Habilitar Tiros"
                  >
                    <XCircle className="w-6 h-6 rotate-45" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "relative p-1 rounded-3xl overflow-hidden",
              result?.isWin
                ? "bg-gradient-to-r from-cyber-pink via-cyber-blue to-cyber-pink animate-festive-glow"
                : "bg-cyber-blue/20"
            )}
          >
            <div className="bg-cyber-dark/95 backdrop-blur-xl rounded-[calc(1.5rem-1px)] p-8 text-center space-y-4">

              {/* ---- CASO 1: Sesión terminada sin premio ---- */}
              {sessionFinished && !result?.isWin ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <Star className="w-8 h-8 text-white/30" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest">Gracias por<br/>participar</h2>
                  <p className="text-[11px] text-cyber-blue/60 font-mono">
                    Has usado todos tus intentos.<br/>
                    ¡Vuelve pronto con una nueva compra!
                  </p>
                  <div className="w-full h-px bg-white/10" />
                  <button
                    onClick={handleManualReset}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-black rounded-xl uppercase tracking-widest transition-all text-sm"
                  >
                    Cerrar
                  </button>
                </>

              ) : !result?.isWin ? (
                /* ---- CASO 2: Perdió pero quedan intentos ---- */
                <>
                  <RefreshCw className="w-12 h-12 text-gray-400 mx-auto" />
                  <h2 className="text-2xl font-bold text-white">¡Casi lo logras!</h2>
                  <button
                    onClick={() => {
                      setResult(null);
                      setShowResultOverlay(false);
                    }}
                    className="w-full py-3 bg-cyber-blue text-black font-black rounded-xl"
                  >
                    {remainingAttempts !== null && remainingAttempts > 0
                      ? `Intentar de nuevo (${remainingAttempts})`
                      : 'Intentar de nuevo'}
                  </button>
                </>

              ) : (
                /* ---- CASO 3: GANADOR ---- */
                <>
                  <Trophy className="w-12 h-12 text-cyber-pink mx-auto" />
                  <h2 className="text-3xl font-black text-white neon-text uppercase">¡GANASTE!</h2>
                  <div className="bg-cyber-blue/10 border border-cyber-blue/30 rounded-xl p-3">
                    <p className="text-2xl font-bold text-white">{result?.prize.name}</p>
                  </div>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                    <QRCodeSVG value={getWhatsAppUrl(result?.prize.name || '')} size={140} includeMargin />
                    <div className="text-left space-y-2">
                      <p className="text-[11px] text-cyber-blue/80">
                        1. Escanea el QR para abrir WhatsApp.<br />
                        2. Envíanos el mensaje pre-escrito.<br />
                        3. ¡Reclama tu premio ahora mismo!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleManualReset}
                    className="text-cyber-blue/40 text-[10px] hover:text-cyber-blue/60 transition-colors"
                  >
                    Finalizar sesión
                  </button>
                </>
              )}

            </div>
          </motion.div>
        )}
      </motion.div>

      <div className="mt-8 text-center text-cyber-blue/30 font-mono text-[10px]">
        Protocolo de Recompensas v2.4 // Kiosk Mode Active
      </div>

      <button onClick={toggleFullScreen} className="fixed bottom-4 right-20 p-3 bg-black/40 border border-cyber-blue/20 rounded-full text-cyber-blue/40 z-20 hover:text-cyber-pink hover:border-cyber-pink/50 transition-colors">
        <Maximize className="w-5 h-5" />
      </button>

      <button onClick={() => setShowAuthModal(true)} className="fixed bottom-4 right-4 p-3 bg-black/40 border border-cyber-blue/20 rounded-full text-cyber-blue/40 z-20 hover:text-cyber-blue hover:border-cyber-blue/50 transition-colors">
        <Settings className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-black/80 border-2 border-cyber-blue/40 rounded-3xl p-8 shadow-[0_0_30px_rgba(0,255,255,0.15)] relative">
              <button onClick={() => { setShowAuthModal(false); setAuthError(''); setTempPassword(''); }} className="absolute top-4 right-4 text-white/40 hover:text-cyber-pink transition-colors">
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <Settings className="w-10 h-10 text-cyber-pink mx-auto mb-3 animate-pulse" />
                <h2 className="text-xl font-bold text-white tracking-widest uppercase">Seguridad</h2>
                <p className="text-[10px] text-cyber-blue/60 font-mono mt-1">Requiere credenciales nivel admin</p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="Contraseña"
                    value={tempPassword}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setTempPassword(val);
                      if (val.length === 4) {
                        const form = e.target.form;
                        if (form) setTimeout(() => form.requestSubmit(), 50);
                      }
                    }}
                    className="w-full bg-black/40 border-2 border-cyber-blue/30 rounded-xl px-4 py-3 text-white text-center tracking-[0.2em] font-mono focus:border-cyber-pink outline-none transition-colors"
                    autoFocus
                  />
                </div>
                {authError && (
                  <p className="text-red-500 text-xs text-center font-bold tracking-wider animate-pulse mb-4">{authError}</p>
                )}
                <button
                  type="submit"
                  disabled={!tempPassword}
                  className="w-full bg-cyber-blue text-black font-black uppercase tracking-widest py-3 rounded-xl disabled:opacity-50 transition-all hover:bg-cyber-blue/80"
                >
                  Confirmar
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdmin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 p-4 overflow-y-auto">
            <div className="max-w-4xl mx-auto py-10">
              <div className="flex justify-between border-b border-white/10 pb-4 mb-8">
                <h2 className="text-2xl font-bold text-white">Panel de Control</h2>
                <X className="cursor-pointer" onClick={() => setShowAdmin(false)} />
              </div>
              <div className="space-y-12">
                {/* Summary Dash */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase text-white/40 mb-1">Total Contactos</p>
                    <p className="text-2xl font-black text-cyber-blue">
                      {new Set(leads.map(l => l.whatsapp)).size}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase text-white/40 mb-1">Premios Hoy</p>
                    <p className="text-2xl font-black text-cyber-pink">
                      {leads.filter(l => 
                        new Date(l.created_at).toDateString() === new Date().toDateString() && 
                        l.prize_name.trim().toLowerCase() !== 'sigue participando'
                      ).length}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase text-white/40 mb-1">Stock Crítico</p>
                    <p className="text-2xl font-black text-amber-500">
                      {prizes.filter(p => p.stock <= 1 && p.id !== 4).length}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[10px] uppercase text-white/40 mb-1">Versión</p>
                    <p className="text-2xl font-black text-white/20">2.6</p>
                  </div>
                </div>

                {/* General Settings */}
                <section className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6">
                  <div className="flex items-center gap-3 text-cyber-blue">
                    <Settings className="w-6 h-6" />
                    <h3 className="text-xl font-bold uppercase tracking-wider">Configuración General</h3>
                  </div>
                  <form onSubmit={handleUpdateSettings} className="flex flex-col md:flex-row items-end gap-6">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest">INTENTOS MÁXIMOS BASE (Sin compra)</label>
                      <input
                        type="number"
                        className="w-full bg-black/40 border border-cyber-blue/30 rounded-lg p-3 text-lg font-mono text-cyber-blue outline-none focus:border-cyber-pink transition-colors"
                        value={adminMaxAttempts}
                        onChange={e => setAdminMaxAttempts(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-cyber-blue text-black font-black px-8 py-3 rounded-lg hover:bg-cyber-blue/80 transition-all uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                    >
                      Guardar Cambios
                    </button>
                  </form>
                </section>

                <div className="grid md:grid-cols-2 gap-12">
                  {/* Prize Management */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3 text-cyber-pink">
                      <Zap className="w-6 h-6" />
                      <h3 className="text-xl font-bold uppercase tracking-wider">Gestión de Premios</h3>
                    </div>
                    <div className="space-y-4">
                      {prizes.map(prize => (
                        <div key={prize.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                          {editingPrize?.id === prize.id ? (
                            <form onSubmit={handleUpdatePrize} className="space-y-4">
                              <input
                                className="w-full bg-black/40 border border-cyber-blue/30 rounded p-2 text-sm"
                                value={editingPrize.name}
                                onChange={e => setEditingPrize({ ...editingPrize, name: e.target.value })}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] text-white/40 uppercase">Probabilidad (0-1)</label>
                                  <input
                                    type="number" step="0.01"
                                    className="w-full bg-black/40 border border-cyber-blue/30 rounded p-2 text-sm"
                                    value={editingPrize.probability}
                                    onChange={e => setEditingPrize({ ...editingPrize, probability: Number(e.target.value) })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-white/40 uppercase">Stock</label>
                                  <input
                                    type="number"
                                    className="w-full bg-black/40 border border-cyber-blue/30 rounded p-2 text-sm"
                                    value={editingPrize.stock}
                                    onChange={e => setEditingPrize({ ...editingPrize, stock: Number(e.target.value) })}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-cyber-pink py-2 rounded text-xs font-bold">GUARDAR</button>
                                <button type="button" onClick={() => setEditingPrize(null)} className="flex-1 bg-white/10 py-2 rounded text-xs font-bold">CANCELAR</button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-bold text-lg">{prize.name}</p>
                                <p className="text-xs text-cyber-blue/60 font-mono">ID: {prize.id}</p>
                              </div>
                              <div className="flex gap-4 items-center">
                                <div className="text-right">
                                  <p className="text-[10px] uppercase text-white/40">Prob.</p>
                                  <p className="font-mono text-cyber-blue">{(prize.probability * 100).toFixed(0)}%</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] uppercase text-white/40">Stock</p>
                                  <p className={cn("font-mono", prize.stock <= 1 && prize.id !== 4 ? "text-red-500 animate-pulse font-bold" : "text-cyber-pink")}>{prize.stock}</p>
                                </div>
                                <button
                                  onClick={() => setEditingPrize(prize)}
                                  className="p-2 hover:bg-white/10 rounded transition-colors"
                                >
                                  <ArrowRight className="w-4 h-4 text-cyber-blue" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Leads List */}
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-cyber-blue">
                        <Users className="w-6 h-6" />
                        <h3 className="text-xl font-bold uppercase tracking-wider">Contactos Captados</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        {leads.length > 0 && (
                          <button
                            onClick={handleExportExcel}
                            className="text-[10px] uppercase tracking-widest font-mono flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            Exportar Excel
                          </button>
                        )}
                        {leads.length > 0 && (
                          <button
                            onClick={handleClearLeads}
                            className={`text-[10px] uppercase tracking-widest font-mono flex items-center gap-1 transition-all duration-200 ${isClearingAll ? 'text-white bg-red-600 px-2 py-1 rounded animate-pulse' : 'text-red-500/60 hover:text-red-500'}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            {isClearingAll ? '¿CONFIRMAR BORRAR TODO?' : 'Borrar Todo'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/10 text-white/60 uppercase text-[10px] tracking-widest">
                          <tr>
                            <th className="p-3 md:p-4">WhatsApp</th>
                            <th className="p-3 md:p-4">Premio</th>
                            <th className="p-3 md:p-4 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {leads.map(lead => (
                            <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                              <td className="p-3 md:p-4 font-mono text-cyber-blue text-xs whitespace-nowrap">{lead.whatsapp}</td>
                              <td className="p-3 md:p-4 text-xs">{lead.prize_name}</td>
                              <td className="p-3 md:p-4 text-right">
                                <button
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className={`p-2 transition-all duration-200 rounded-lg flex items-center gap-2 ${deletingId === lead.id ? 'bg-red-600 text-white px-3' : 'text-red-500/40 hover:text-red-500 hover:bg-red-500/10'}`}
                                >
                                  {deletingId === lead.id ? (
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">¿Eliminar?</span>
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {showUnlockModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-cyber-dark/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm bg-black/80 border-2 border-cyber-blue rounded-2xl p-6 shadow-[0_0_30px_rgba(0,255,255,0.3)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowUnlockModal(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="text-center space-y-4 pt-4">
                <div className="w-16 h-16 bg-cyber-blue/10 rounded-full flex items-center justify-center mx-auto border border-cyber-blue/50 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                  <Zap className="w-8 h-8 text-cyber-blue" />
                </div>
                <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Nueva Compra</h3>
                <p className="text-xs text-cyber-blue/60 font-mono">Habilitar +3 tiros para:<br/><span className="text-white">{whatsapp}</span></p>

                <form onSubmit={handleUnlock} className="space-y-4">
                  <div className="relative">
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="PIN"
                      value={unlockPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setUnlockPin(val);
                        if (val.length === 4) {
                          const target = e.target;
                          target.blur();
                          const form = target.form;
                          if (form) setTimeout(() => form.requestSubmit(), 50);
                        }
                      }}
                      className="w-full bg-white/5 border border-cyber-blue/30 rounded-lg py-3 px-4 text-center text-xl font-mono tracking-[0.5em] focus:border-cyber-blue outline-none text-white"
                      autoFocus
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={isUnlocking || unlockPin.length < 4}
                    className="w-full py-4 bg-cyber-blue text-black font-black rounded-xl shadow-[0_0_15px_rgba(0,255,255,0.4)] active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50"
                  >
                    {isUnlocking ? 'HABILITANDO...' : 'CONFIRMAR CARGA'}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}