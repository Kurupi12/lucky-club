import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.sqlite");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS prizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    probability REAL NOT NULL,
    stock INTEGER NOT NULL,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    whatsapp TEXT NOT NULL,
    prize_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(prize_id) REFERENCES prizes(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed initial prizes if empty
const prizeCount = db.prepare("SELECT COUNT(*) as count FROM prizes").get() as { count: number };
if (prizeCount.count === 0) {
  const insert = db.prepare("INSERT INTO prizes (name, probability, stock) VALUES (?, ?, ?)");
  insert.run("Líquido 10ml", 0.1, 50);
  insert.run("Descuento 20%", 0.3, 100);
  insert.run("Alfajor Rasta", 0.05, 20);
  insert.run("Sigue Participando", 0.55, 999999);
}

// Seed settings if empty
const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("max_attempts", "3");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = process.env.PORT || 3000;

  // --- Admin Auth Middleware ---
  app.use("/api/admin", (req, res, next) => {
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || 'vapeclub2025';
    if (authHeader !== adminPassword) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // --- API Routes ---

  // Get all prizes (Admin)
  app.get("/api/admin/prizes", (req, res) => {
    const prizes = db.prepare("SELECT * FROM prizes").all();
    res.json(prizes);
  });

  // Update prize (Admin)
  app.post("/api/admin/prizes/:id", (req, res) => {
    const { name, probability, stock } = req.body;
    const { id } = req.params;
    db.prepare("UPDATE prizes SET name = ?, probability = ?, stock = ? WHERE id = ?")
      .run(name, probability, stock, id);
    res.json({ success: true });
  });

  // Get leads (Admin)
  app.get("/api/admin/leads", (req, res) => {
    const leads = db.prepare(`
      SELECT leads.*, prizes.name as prize_name 
      FROM leads 
      LEFT JOIN prizes ON leads.prize_id = prizes.id
      ORDER BY created_at DESC
    `).all();
    res.json(leads);
  });

  // Delete all leads (Admin)
  app.delete("/api/admin/leads/all/clear", (req, res) => {
    console.log("Iniciando limpieza de todos los contactos...");
    try {
      const result = db.prepare("DELETE FROM leads").run();
      res.json({ success: true, deletedCount: result.changes });
    } catch (error) {
      console.error("Error al limpiar leads:", error);
      res.status(500).json({ error: "Error al limpiar contactos en la base de datos" });
    }
  });

  // Delete lead (Admin)
  app.delete("/api/admin/leads/:id", (req, res) => {
    const { id } = req.params;

    // Convert to number explicitly as SQLite INTEGER PRIMARY KEY expects a number
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      console.error(`[ERROR] ID de contacto no válido recibido: ${id}`);
      return res.status(400).json({ error: "ID de contacto no válido" });
    }

    try {
      const stmt = db.prepare("DELETE FROM leads WHERE id = ?");
      const result = stmt.run(numericId);

      if (result.changes > 0) {
        console.log(`[SUCCESS] Contacto con ID ${numericId} eliminado`);
        res.json({ success: true, message: "Contacto eliminado correctamente" });
      } else {
        console.warn(`[WARN] No se encontró contacto con ID ${numericId} para eliminar`);
        res.status(404).json({ error: "No se encontró ningún contacto con ese ID" });
      }
    } catch (error) {
      console.error("[ERROR] Error en DELETE /api/admin/leads/:id:", error);
      res.status(500).json({ error: "Error interno al eliminar el contacto" });
    }
  });

  // Get settings (Admin)
  app.get("/api/admin/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  // Update settings (Admin)
  app.post("/api/admin/settings", (req, res) => {
    const { max_attempts } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run("max_attempts", String(max_attempts));
    res.json({ success: true });
  });

  // Get user status (Remaining attempts)
  app.get("/api/status/:whatsapp", (req, res) => {
    const { whatsapp } = req.params;
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'max_attempts'").get() as { value: string } | undefined;
    const maxAttempts = parseInt(setting?.value || "3", 10) || 3;
    const attempts = db.prepare("SELECT COUNT(*) as count FROM leads WHERE whatsapp = ?").get(whatsapp) as { count: number };

    const remaining = Math.max(0, maxAttempts - (attempts?.count || 0));

    // Get prizes the user has already won
    const alreadyWonPrizeIds = db.prepare(`
      SELECT prize_id 
      FROM leads 
      JOIN prizes ON leads.prize_id = prizes.id 
      WHERE leads.whatsapp = ? AND prizes.name != 'Sigue Participando'
    `).all(whatsapp).map((p: any) => p.prize_id);

    const totalRealPrizesCount = db.prepare("SELECT COUNT(*) as count FROM prizes WHERE name != 'Sigue Participando'").get() as { count: number };

    res.json({
      whatsapp,
      attempts: attempts.count,
      max_attempts: maxAttempts,
      remaining: remaining,
      hasWon: alreadyWonPrizeIds.length > 0,
      allWon: alreadyWonPrizeIds.length >= totalRealPrizesCount.count
    });
  });

  // Spin Logic
  app.post("/api/spin", (req, res) => {
    const { whatsapp } = req.body;

    if (!whatsapp || whatsapp.length < 8) {
      return res.status(400).json({ error: "WhatsApp inválido" });
    }

    const setting = db.prepare("SELECT value FROM settings WHERE key = 'max_attempts'").get() as { value: string } | undefined;
    const maxAttempts = parseInt(setting?.value || "3", 10) || 3;
    const attempts = db.prepare("SELECT COUNT(*) as count FROM leads WHERE whatsapp = ?").get(whatsapp) as { count: number };

    if ((attempts?.count || 0) >= maxAttempts) {
      return res.status(400).json({ error: "Ya agotaste tus intentos disponibles." });
    }

    // Get prizes the user has already won
    const alreadyWonPrizeIds = db.prepare(`
      SELECT prize_id 
      FROM leads 
      JOIN prizes ON leads.prize_id = prizes.id 
      WHERE leads.whatsapp = ? AND prizes.name != 'Sigue Participando'
    `).all(whatsapp).map((p: any) => p.prize_id);

    // Filter prizes: exclude those already won, but always keep 'Sigue Participando'
    const prizes = db.prepare("SELECT * FROM prizes WHERE stock > 0").all() as any[];
    const filteredPrizes = prizes.filter(p => p.name === 'Sigue Participando' || !alreadyWonPrizeIds.includes(p.id));

    if (filteredPrizes.length === 0) {
      return res.status(400).json({ error: "Ya ganaste todos los premios disponibles." });
    }

    const allPrizesForSymbols = db.prepare("SELECT id FROM prizes").all() as { id: number }[];

    // Weighted random selection on filtered prizes
    let totalProb = filteredPrizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalProb;
    let selectedPrize = filteredPrizes[filteredPrizes.length - 1];

    for (const prize of filteredPrizes) {
      if (random < prize.probability) {
        selectedPrize = prize;
        break;
      }
      random -= prize.probability;
    }

    // Update stock if it's a real prize
    if (selectedPrize.name !== "Sigue Participando") {
      db.prepare("UPDATE prizes SET stock = stock - 1 WHERE id = ?").run(selectedPrize.id);
    }

    // Record lead (Every spin is recorded as an attempt)
    db.prepare("INSERT INTO leads (whatsapp, prize_id) VALUES (?, ?)").run(whatsapp, selectedPrize.id);

    // Generate reel symbols
    let reelSymbols: number[];
    if (selectedPrize.name === "Sigue Participando") {
      // For "Sigue Participando", show non-matching symbols
      const allPrizeIds = allPrizesForSymbols.map(p => p.id);
      // Pick 3 random symbols, but ensure they are not all the same
      reelSymbols = [
        allPrizeIds[Math.floor(Math.random() * allPrizeIds.length)],
        allPrizeIds[Math.floor(Math.random() * allPrizeIds.length)],
        allPrizeIds[Math.floor(Math.random() * allPrizeIds.length)]
      ];

      // If they happen to be all the same, force the last one to be different
      if (reelSymbols[0] === reelSymbols[1] && reelSymbols[1] === reelSymbols[2]) {
        const otherIds = allPrizeIds.filter(id => id !== reelSymbols[0]);
        if (otherIds.length > 0) {
          reelSymbols[2] = otherIds[Math.floor(Math.random() * otherIds.length)];
        }
      }
    } else {
      // For a real win, show 3 matching symbols
      reelSymbols = [selectedPrize.id, selectedPrize.id, selectedPrize.id];
    }

    // Get prizes the user has already won (including the one they just won)
    const updatedAlreadyWonPrizeIds = db.prepare(`
      SELECT prize_id 
      FROM leads 
      JOIN prizes ON leads.prize_id = prizes.id 
      WHERE leads.whatsapp = ? AND prizes.name != 'Sigue Participando'
    `).all(whatsapp).map((p: any) => p.prize_id);

    const totalRealPrizesCount = db.prepare("SELECT COUNT(*) as count FROM prizes WHERE name != 'Sigue Participando'").get() as { count: number };

    res.json({
      prize: selectedPrize,
      reels: reelSymbols,
      remaining: Math.max(0, maxAttempts - (attempts.count + 1)),
      hasWon: updatedAlreadyWonPrizeIds.length > 0,
      allWon: updatedAlreadyWonPrizeIds.length >= totalRealPrizesCount.count
    });
  });

  // Serve dynamic vCard
  app.get("/contact.vcf", (req, res) => {
    const { prize, whatsapp } = req.query;
    let note = "";
    if (prize) {
      note = `\nNOTE:Gané ${prize} en Lucky Club.${whatsapp ? ` Mi número: ${whatsapp}` : ""}`;
    }

    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:El Vape Club Encarnación
TEL;TYPE=CELL:+595983127102${note}
END:VCARD`;
    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', 'attachment; filename="ElVapeClub.vcf"');
    res.send(vcard);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
