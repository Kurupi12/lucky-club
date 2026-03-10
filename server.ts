// LuckyClub Server v2.5.2 - Blindaje Total RNG
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase Client
const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/^['"]|['"]$/g, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/^['"]|['"]$/g, '');

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT || 3000;

  // --- Admin Auth Middleware ---
  app.use("/api/admin", (req, res, next) => {
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || '1234';
    if (authHeader !== adminPassword) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // --- API Routes ---

  // Get all prizes (Admin)
  app.get("/api/admin/prizes", async (req, res) => {
    const { data: prizes, error } = await supabase.from('prizes').select('*').order('id');
    if (error) {
      console.error("Supabase Error (Prizes):", error);
      return res.status(500).json({ error: error.message });
    }
    res.json(prizes || []);
  });

  // Update prize (Admin)
  app.post("/api/admin/prizes/:id", async (req, res) => {
    const { name, probability, stock } = req.body;
    const { id } = req.params;
    const { error } = await supabase.from('prizes').update({ name, probability, stock }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Get leads (Admin)
  app.get("/api/admin/leads", async (req, res) => {
    const { data: leads, error } = await supabase.from('leads').select('*, prizes:prize_id (name)').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    
    const formattedLeads = leads?.map(lead => ({
      ...lead,
      prize_name: lead.prizes?.name || 'Desconocido'
    })) || [];
    res.json(formattedLeads);
  });

  // Delete all leads (Admin)
  app.delete("/api/admin/leads/all/clear", async (req, res) => {
    // Delete all leads (by using an always true condition like ID not null)
    const { error } = await supabase.from('leads').delete().neq('id', 0);
    if (error) return res.status(500).json({ error: "Error al limpiar contactos" });
    res.json({ success: true, message: "Todos los contactos eliminados" });
  });

  // Delete lead (Admin)
  app.delete("/api/admin/leads/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) return res.status(500).json({ error: "Error interno al eliminar el contacto" });
    res.json({ success: true, message: "Contacto eliminado correctamente" });
  });

  // Get settings (Admin)
  app.get("/api/admin/settings", async (req, res) => {
    const { data: settings, error } = await supabase.from('settings').select('*');
    if (error) return res.status(500).json({ error: error.message });
    
    const settingsObj = (settings || []).reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    
    // Default fallback if not defined
    if (!settingsObj.max_attempts) settingsObj.max_attempts = "3";
    res.json(settingsObj);
  });

  // Update settings (Admin)
  app.post("/api/admin/settings", async (req, res) => {
    const { max_attempts } = req.body;
    const { error } = await supabase.from('settings').upsert({ key: "max_attempts", value: String(max_attempts) }, { onConflict: 'key' });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Get user status (Remaining attempts)
  app.get("/api/status", async (req, res) => {
    const { whatsapp } = req.query;
    if (!whatsapp || typeof whatsapp !== 'string') return res.status(400).json({ error: "WhatsApp requerido" });

    // Intentos base + desbloqueos (cada desbloqueo suma 3)
    const { count: unlocksCount } = await supabase.from('manual_unlocks').select('*', { count: 'exact', head: true }).eq('whatsapp', whatsapp);
    const maxAttempts = 3 + (unlocksCount || 0) * 3;

    const { count: attemptsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('whatsapp', whatsapp);
    const attempts = attemptsCount || 0;
    const remaining = Math.max(0, maxAttempts - attempts);

    // Ver que premios ya ganó (excluyendo el Limón)
    const { data: wonLeads } = await supabase.from('leads').select('prize_id, prizes!inner(name)').eq('whatsapp', whatsapp).neq('prizes.name', 'Sigue Participando');
    const alreadyWonPrizeIds = wonLeads?.map(l => l.prize_id) || [];

    const { data: prizes } = await supabase.from('prizes').select('*');
    const realPrizesCount = prizes?.filter(p => p.id !== 4 && p.name.trim().toLowerCase() !== "sigue participando").length;

    res.json({
      whatsapp,
      attempts: attempts,
      max_attempts: maxAttempts,
      remaining: remaining,
      hasWon: alreadyWonPrizeIds.length > 0,
      alreadyWonIds: alreadyWonPrizeIds,
      allWon: alreadyWonPrizeIds.length >= (realPrizesCount || 0)
    });
  });

  // Nuevo endpoint para que el cajero habilite más tiros
  app.post("/api/admin/unlock", async (req, res) => {
    const { whatsapp, pin } = req.body;
    const adminPass = process.env.ADMIN_PASSWORD || "1234";

    if (pin !== adminPass) return res.status(401).json({ error: "PIN incorrecto" });
    if (!whatsapp) return res.status(400).json({ error: "WhatsApp requerido" });

    const { error } = await supabase.from('manual_unlocks').insert({ whatsapp });
    if (error) {
      // Si la tabla no existe en este proyecto nuevo, intentamos informar o manejar el error
      if (error.code === '42P01') {
        return res.status(500).json({ error: "Error técnico: La tabla 'manual_unlocks' no existe en Supabase. Por favor contacta soporte." });
      }
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: "Has habilitado 3 tiros nuevos para " + whatsapp });
  });

  app.post("/api/spin", async (req, res) => {
    const { whatsapp } = req.body;

    if (!whatsapp || whatsapp.length < 8) {
      return res.status(400).json({ error: "WhatsApp inválido" });
    }

    // Calcular intentos máximos: 3 base + 3 por cada desbloqueo manual
    const { count: unlocksCount } = await supabase.from('manual_unlocks').select('*', { count: 'exact', head: true }).eq('whatsapp', whatsapp);
    const maxAttempts = 3 + (unlocksCount || 0) * 3;
    
    const { count: attemptsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('whatsapp', whatsapp);
    const attempts = attemptsCount || 0;

    if (attempts >= maxAttempts) {
      return res.status(400).json({ error: "Ya agotaste tus intentos disponibles." });
    }

    const { data: wonLeads } = await supabase.from('leads').select('prize_id, prizes!inner(name)').eq('whatsapp', whatsapp).neq('prizes.name', 'Sigue Participando');
    const alreadyWonPrizeIds = wonLeads?.map(l => l.prize_id) || [];

    // Obtener premios del inventario
    const { data: allPrizes } = await supabase.from('prizes').select('*').order('id');
    if (!allPrizes) return res.status(500).json({ error: "Error leyendo premios" });
    
    // Función auxiliar para identificar el premio perdedor ("Sigue Participando")
    const isLoser = (p: any) => p.id === 4 || p.name.trim().toLowerCase().includes("sigue participando");

    // FILTRO IMPORTANTE: El pool de sorteo incluye los ya ganados para no alterar probabilidades, 
    // pero solo los que tengan stock.
    const filteredPrizes = allPrizes.filter(p => p.stock > 0);
    
    let selectedPrize: any | null = null;
    let silentConversion = false;

    // LÓGICA DE NEGOCIO:
    if (filteredPrizes.length > 0) {
      // Tiro 1 o 2 de CADA BLOQUE de 3
      const attemptsInThisBlock = attempts % 3;
      if (attemptsInThisBlock < 2) {
        const continuePrize = filteredPrizes.find(isLoser);
        if (continuePrize) {
          selectedPrize = continuePrize;
        }
      }
      
      // Si toca ganar (tiro 3) o no se forzó perdedor: RNG sobre el pool Total (con stock)
      if (!selectedPrize) {
        // SORTEO SOBRE EL 100% PARA PROTEGER EL PREMIO MAYOR
        let totalProb = filteredPrizes.reduce((sum, p) => sum + p.probability, 0);
        let random = Math.random() * totalProb;
        for (const prize of filteredPrizes) {
          random -= prize.probability;
          if (random <= 0) {
            selectedPrize = prize;
            break;
          }
        }

        // Si es el tiro 3 y tocó el Limón, pero el cliente NO ha ganado nada en sus tiros actuales, 
        // podríamos forzar victoria si quisieras, pero según tu regla mantendremos el RNG.
        // REGLA DE EXCLUSIÓN: Si el premio ya lo tiene, se convierte en pérdida silenciosa.
        if (selectedPrize && !isLoser(selectedPrize) && alreadyWonPrizeIds.includes(selectedPrize.id)) {
          silentConversion = true;
        }
      }
    }

    if (!selectedPrize) {
      return res.status(500).json({ error: "No hay premios disponibles" });
    }

    // Si hubo conversión silenciosa, para la base de datos es un "Sigue Participando"
    const finalPrizeToRecord = silentConversion ? allPrizes.find(isLoser) || selectedPrize : selectedPrize;

    // Guardamos el lead en Supabase
    await supabase.from('leads').insert({ whatsapp, prize_id: finalPrizeToRecord.id });

    // Definimos si el premio es un "perdedor" para el frontend
    const isLoserPrize = silentConversion || isLoser(selectedPrize);

    // Calculamos los símbolos de la ruleta
    let reelSymbols: number[];
    if (isLoserPrize) {
      // Si pierde, mostramos dos íconos iguales (bait) y el tercero diferente (ruin)
      const possibleIds = allPrizes.map(p => p.id);
      
      // Usamos el premio que salió en el sorteo (aunque ya lo tenga) como "bait" para crear tensión
      const baitPrizeId = selectedPrize.id;
      
      // La tercera ficha será CUALQUIERA diferente para romper la fila (no solo limón)
      let ruinPrizeId = possibleIds[Math.floor(Math.random() * possibleIds.length)];
      if (ruinPrizeId === baitPrizeId) {
        // Forzar uno diferente si coinciden
        const otherPrizes = possibleIds.filter(id => id !== baitPrizeId);
        ruinPrizeId = otherPrizes[Math.floor(Math.random() * otherPrizes.length)] || (baitPrizeId === 4 ? 1 : 4);
      }
      
      reelSymbols = [baitPrizeId, baitPrizeId, ruinPrizeId];
    } else {
      // Si gana de verdad
      reelSymbols = [selectedPrize.id, selectedPrize.id, selectedPrize.id];
    }

    // Actualizar stock si es un premio real y ganó de verdad
    if (!isLoserPrize) {
      await supabase.from('prizes').update({ stock: selectedPrize.stock - 1 }).eq('id', selectedPrize.id);
    }

    res.json({
      prize: finalPrizeToRecord, // Enviamos el premio real o el "Sigue Participando" si fue bloqueado
      reels: reelSymbols,
      remaining: Math.max(0, maxAttempts - (attempts + 1)),
      isWin: !isLoserPrize,
      hasWon: !isLoserPrize || alreadyWonPrizeIds.length > 0,
      allWon: (alreadyWonPrizeIds.length + (!isLoserPrize ? 1 : 0)) >= (allPrizes.filter(p => !isLoser(p)).length)
    });
  });

  // Static files and Vite logic
  if (process.env.NODE_ENV === "production" || process.env.VITE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist/index.html"));
    });
  } else {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error("Vite setup error:", e);
    }
  }

  app.listen(PORT, () => {
    console.log(`Server is running with Supabase on port ${PORT}`);
  });
}

startServer().catch(console.error);
