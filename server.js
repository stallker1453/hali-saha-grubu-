
const express = require("express");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("DATABASE_URL ayarlı değil. Uygulama başlarken veritabanı bağlantısı kurulamayacak.");
}
const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
}) : null;

async function db(sql, params=[]) {
  if (!pool) throw new Error("DATABASE_URL eksik");
  return pool.query(sql, params);
}

async function init() {
  if (!pool) return;
  await db(`
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS players_name_lower_idx ON players (LOWER(name));

    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Kadroya yazıl',
      match_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      capacity INTEGER NOT NULL DEFAULT 14,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS signups (
      id SERIAL PRIMARY KEY,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'coming',
      team TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(match_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      goals INTEGER NOT NULL DEFAULT 0,
      UNIQUE(match_id, player_id)
    );
  `);
  const m = await db("SELECT id FROM matches ORDER BY id LIMIT 1");
  if (!m.rows.length) {
    await db("INSERT INTO matches(title, match_date, capacity) VALUES($1, $2, 14)",
      ["Kadroya yazıl", new Date(Date.now()+24*3600*1000)]);
  }
}

function publicPlayer(p) { return {id:p.id, name:p.name}; }

app.get("/api/state", async (req,res) => {
  try {
    const m = (await db("SELECT * FROM matches ORDER BY id DESC LIMIT 1")).rows[0];
    const players = (await db("SELECT id,name FROM players ORDER BY LOWER(name)")).rows;
    const signups = (await db(`
      SELECT s.*, p.name FROM signups s
      JOIN players p ON p.id=s.player_id
      WHERE s.match_id=$1 AND s.status='coming'
      ORDER BY s.created_at, p.name
    `,[m.id])).rows;
    const goals = (await db("SELECT player_id,goals FROM goals WHERE match_id=$1",[m.id])).rows;
    res.json({match:m, players, signups, goals});
  } catch(e) {
    res.status(500).json({error:e.message});
  }
});

app.post("/api/players", async (req,res) => {
  try {
    const name = String(req.body.name||"").trim().replace(/\s+/g," ");
    const pin = String(req.body.pin||"").trim();
    if (name.length < 2 || name.length > 40) return res.status(400).json({error:"Geçerli bir ad soyad girin."});
    if (!/^\d{4}$/.test(pin)) return res.status(400).json({error:"PIN 4 haneli olmalı."});
    const exists = await db("SELECT id FROM players WHERE LOWER(name)=LOWER($1)",[name]);
    if (exists.rows.length) return res.status(409).json({error:"Bu isim zaten kayıtlı."});
    const hash = await bcrypt.hash(pin,10);
    const r = await db("INSERT INTO players(name,pin_hash) VALUES($1,$2) RETURNING id,name",[name,hash]);
    res.json(publicPlayer(r.rows[0]));
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.delete("/api/players/:id", async (req,res) => {
  try {
    const pin=String(req.body.pin||"");
    const r=await db("SELECT * FROM players WHERE id=$1",[req.params.id]);
    if(!r.rows.length) return res.status(404).json({error:"Oyuncu bulunamadı."});
    if(!await bcrypt.compare(pin,r.rows[0].pin_hash)) return res.status(403).json({error:"PIN yanlış."});
    await db("DELETE FROM players WHERE id=$1",[req.params.id]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post("/api/signups", async (req,res) => {
  try {
    const match=(await db("SELECT * FROM matches ORDER BY id DESC LIMIT 1")).rows[0];
    const player=(await db("SELECT * FROM players WHERE id=$1",[req.body.playerId])).rows[0];
    if(!player) return res.status(404).json({error:"Oyuncu bulunamadı."});
    const existing=(await db("SELECT * FROM signups WHERE match_id=$1 AND player_id=$2",[match.id,player.id])).rows[0];
    if(existing) {
      await db("UPDATE signups SET status='coming' WHERE id=$1",[existing.id]);
    } else {
      await db("INSERT INTO signups(match_id,player_id,status) VALUES($1,$2,'coming')",[match.id,player.id]);
    }
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.delete("/api/signups/:playerId", async (req,res) => {
  try {
    const pin=String(req.body.pin||"");
    const p=(await db("SELECT * FROM players WHERE id=$1",[req.params.playerId])).rows[0];
    if(!p || !await bcrypt.compare(pin,p.pin_hash)) return res.status(403).json({error:"PIN yanlış."});
    const m=(await db("SELECT id FROM matches ORDER BY id DESC LIMIT 1")).rows[0];
    await db("DELETE FROM signups WHERE match_id=$1 AND player_id=$2",[m.id,p.id]);
    res.json({ok:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post("/api/admin/reset", async (req,res) => {
  if (req.body.key !== process.env.ADMIN_KEY) return res.status(403).json({error:"Yetkisiz."});
  const m=(await db("SELECT id FROM matches ORDER BY id DESC LIMIT 1")).rows[0];
  await db("DELETE FROM signups WHERE match_id=$1",[m.id]);
  res.json({ok:true});
});

init().then(()=>app.listen(PORT,()=>console.log(`Halı Saha Grubu ${PORT} portunda çalışıyor.`)))
.catch(e=>{console.error(e); process.exit(1);});
