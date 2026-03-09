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
  app.get("/api/status/:whatsapp", async (req, res) => {
    const { whatsapp } = req.params;
    
    const { data: settings } = await supabase.from('settings').select('value').eq('key', 'max_attempts').single();
    const maxAttempts = parseInt(settings?.value || "3", 10) || 3;
    
    const { count: attemptsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('whatsapp', whatsapp);
    const attempts = attemptsCount || 0;
    const remaining = Math.max(0, maxAttempts - attempts);

    // Won prizes 
    const { data: wonLeads } = await supabase.from('leads').select('prize_id, prizes!inner(name)').eq('whatsapp', whatsapp).neq('prizes.name', 'Sigue Participando');
    const alreadyWonPrizeIds = wonLeads?.map(l => l.prize_id) || [];

    const { count: realPrizesCount } = await supabase.from('prizes').select('*', { count: 'exact', head: true }).neq('name', 'Sigue Participando');

    res.json({
      whatsapp,
      attempts: attempts,
      max_attempts: maxAttempts,
      remaining: remaining,
      hasWon: alreadyWonPrizeIds.length > 0,
      allWon: alreadyWonPrizeIds.length >= (realPrizesCount || 0)
    });
  });

  app.post("/api/spin", async (req, res) => {
    const { whatsapp } = req.body;

    if (!whatsapp || whatsapp.length < 8) {
      return res.status(400).json({ error: "WhatsApp inválido" });
    }

    const { data: settings } = await supabase.from('settings').select('value').eq('key', 'max_attempts').single();
    const maxAttempts = parseInt(settings?.value || "3", 10) || 3;
    
    const { count: attemptsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('whatsapp', whatsapp);
    const attempts = attemptsCount || 0;

    if (attempts >= maxAttempts) {
      return res.status(400).json({ error: "Ya agotaste tus intentos disponibles." });
    }

    const { data: wonLeads } = await supabase.from('leads').select('prize_id, prizes!inner(name)').eq('whatsapp', whatsapp).neq('prizes.name', 'Sigue Participando');
    const alreadyWonPrizeIds = wonLeads?.map(l => l.prize_id) || [];

    const { data: allPrizes } = await supabase.from('prizes').select('*').order('id');
    if (!allPrizes) return res.status(500).json({ error: "Error leyendo premios" });
    
    const filteredPrizes = allPrizes.filter(p => p.stock > 0 && (p.name === 'Sigue Participando' || !alreadyWonPrizeIds.includes(p.id)));

    if (filteredPrizes.length === 0) {
      return res.status(400).json({ error: "Ya ganaste todos los premios disponibles." });
    }

    // --- LÓGICA DE NEGOCIO: FORZAR GANAR EN EL ÚLTIMO TIRO ---
    let selectedPrize = filteredPrizes[filteredPrizes.length - 1]; // Default (usually Sigue Participando)

    // Si es el tiro 1 o 2, forzamos "Sigue Participando" para crear tensión
    if (attempts < maxAttempts - 1) {
      const continuePrize = filteredPrizes.find(p => p.id === 4 || p.name.trim().toLowerCase() === "sigue participando");
      if (continuePrize) {
        selectedPrize = continuePrize;
      }
    } else {
      // SI ES EL ÚLTIMO TIRO (Intento 3):
      // Si el cliente NO ha ganado nada aún, priorizamos que gane algo real
      const realPrizes = filteredPrizes.filter(p => p.id !== 4 && p.name.trim().toLowerCase() !== "sigue participando");
      
      if (alreadyWonPrizeIds.length === 0 && realPrizes.length > 0) {
        // Recalculamos probabilidades solo entre premios reales para asegurar el QR
        let realTotalProb = realPrizes.reduce((sum, p) => sum + p.probability, 0);
        let random = Math.random() * realTotalProb;
        for (const prize of realPrizes) {
          random -= prize.probability;
          if (random <= 0) {
            selectedPrize = prize;
            break;
          }
        }
      } else {
        // Si ya ganó algo o no hay stock, usamos el RNG normal
        let totalProb = filteredPrizes.reduce((sum, p) => sum + p.probability, 0);
        let random = Math.random() * totalProb;
        for (const prize of filteredPrizes) {
          random -= prize.probability;
          if (random <= 0) {
            selectedPrize = prize;
            break;
          }
        }
      }
    }

    // Guardamos el lead en Supabase
    await supabase.from('leads').insert({ whatsapp, prize_id: selectedPrize.id });

    // Definimos si el premio es un "perdedor" (ID 4 o nombre) de forma robusta
    const isLoserPrize = selectedPrize.id === 4 || selectedPrize.name.trim().toLowerCase().includes("sigue participando");

    // Calculamos los símbolos de la ruleta
    let reelSymbols: number[];
    if (isLoserPrize) {
      // Si pierde, mostramos dos íconos iguales (bait) y el tercero diferente (ruin)
      const realPrizes = allPrizes.map(p => p.id).filter(id => id !== selectedPrize.id && id !== 4);
      const baitPrizeId = realPrizes[Math.floor(Math.random() * realPrizes.length)] || allPrizes[0].id;
      
      // La tercera ficha SIEMPRE será el limón (ID 4) para romper la fila
      const ruinPrizeId = 4; 
      reelSymbols = [baitPrizeId, baitPrizeId, ruinPrizeId];
    } else {
      // Si gana, los tres iguales
      reelSymbols = [selectedPrize.id, selectedPrize.id, selectedPrize.id];
    }

    // Actualizar stock si es un premio real
    if (!isLoserPrize) {
      await supabase.from('prizes').update({ stock: selectedPrize.stock - 1 }).eq('id', selectedPrize.id);
    }

    res.json({
      prize: selectedPrize,
      reels: reelSymbols,
      remaining: Math.max(0, maxAttempts - (attempts + 1)),
      isWin: !isLoserPrize,
      hasWon: !isLoserPrize || alreadyWonPrizeIds.length > 0,
      allWon: (alreadyWonPrizeIds.length + (!isLoserPrize ? 1 : 0)) >= (allPrizes.length - 1)
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
