// Ponto de entrada da Vercel Serverless Function.
// Reexporta o app Express. Se o servidor falhar ao iniciar, em vez do 500 genérico
// da Vercel ("FUNCTION_INVOCATION_FAILED") responde com o MOTIVO do erro — assim
// dá para diagnosticar abrindo /api/health no navegador, sem caçar logs.
let app;
try {
  app = require('../src/server');
} catch (err) {
  console.error('Falha ao iniciar o servidor:', err);
  app = (req, res) => {
    // CORS mínimo para o navegador conseguir ler a resposta de erro
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      error: 'O servidor falhou ao iniciar',
      motivo: String(err && err.message ? err.message : err).split('\n')[0],
    }));
  };
}
module.exports = app;
