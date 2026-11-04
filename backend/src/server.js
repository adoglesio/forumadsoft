// Em desenvolvimento lê o arquivo .env; na Vercel as variáveis vêm do painel,
// então a ausência do pacote dotenv não pode derrubar o servidor.
try { require('dotenv').config(); } catch { /* ok */ }

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app      = express();
const PORT     = process.env.PORT    || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── CORS ─────────────────────────────────────────────────────────────────
// Aceita: domínio exato do FRONTEND_URL, qualquer subdomínio *.vercel.app,
// e localhost para desenvolvimento local.
const FRONTEND_URL = process.env.FRONTEND_URL || '';

app.use(cors({
  origin: (origin, callback) => {
    // Sem origin = curl / Postman / server-to-server → permite
    if (!origin) return callback(null, true);

    const permitido =
      origin === FRONTEND_URL ||                          // domínio exato configurado
      origin.endsWith('.vercel.app') ||                   // qualquer deploy Vercel
      origin.startsWith('http://localhost') ||            // dev local
      origin.startsWith('http://127.0.0.1');              // dev local

    if (permitido) return callback(null, true);
    return callback(new Error(`CORS: origem não permitida — ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ── Health-check ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: NODE_ENV, ts: new Date().toISOString() });
});

// ── Rotas ─────────────────────────────────────────────────────────────────
function safeRoute(routePath) {
  try {
    return require(routePath);
  } catch (err) {
    console.error(`Erro ao carregar rota ${routePath}:`, err.message);
    // r.use (e não r.all('*')) funciona no Express 4 e no 5; no 5 o '*' derrubava o servidor
    const r = express.Router();
    r.use((_req, res) =>
      res.status(500).json({ error: `Rota ${routePath} falhou ao carregar: ${err.message}` })
    );
    return r;
  }
}

app.use('/api/usuarios',      safeRoute('./routes/usuarios'));
app.use('/api/erros',         safeRoute('./routes/erros'));
app.use('/api/procedimentos', safeRoute('./routes/procedimentos'));
app.use('/api/logs',          safeRoute('./routes/logs'));
app.use('/api/reacoes',       safeRoute('./routes/reacoes'));
app.use('/api/produtos',      safeRoute('./routes/produtos'));
app.use('/api/admin/usuarios', safeRoute('./routes/usuariosAdmin'));

// ── Estatísticas ──────────────────────────────────────────────────────────
app.get('/api/estatisticas', async (req, res) => {
  try {
    const { query } = require('./db/database');
    const [{ c: totalErros }]       = await query('SELECT COUNT(*)::int as c FROM erros');
    const [{ c: totalComentarios }] = await query('SELECT COUNT(*)::int as c FROM comentarios');
    const [{ c: totalUsuarios }]    = await query('SELECT COUNT(*)::int as c FROM usuarios');
    res.json({ success: true, data: { totalErros, totalComentarios, totalUsuarios } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// ── Erros: sempre responde em JSON (origem bloqueada = 403, não 500) ───────
app.use((err, _req, res, _next) => {
  if (String(err?.message).startsWith('CORS')) return res.status(403).json({ error: err.message });
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: err?.message || 'Erro interno' });
});

// ── Start (só dev local) ──────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend em http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
