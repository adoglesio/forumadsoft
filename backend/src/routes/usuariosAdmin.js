const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query, queryOne } = require('../db/database');

// Mesma regra de senha usada no login e na troca de senha (salt:sha256)
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + senha).digest('hex');
  return `${salt}:${hash}`;
}

function verificarSenha(plain, guardada) {
  try {
    if (!guardada.includes(':')) return plain === guardada;
    const [salt, h] = guardada.split(':');
    const calc = crypto.createHash('sha256').update(salt + plain).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(calc, 'hex'));
  } catch {
    return false;
  }
}

// O sistema só aceita e-mails da empresa (igual à tela de login)
const DOMINIO = '@adsoft.com.br';
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registrar(...args) {
  try { require('./logs').registrarLog(...args); } catch { /* log é opcional */ }
}

// Cadastra um novo usuário. Só administrador.
// Por segurança pede a senha do admin de novo: sem isso, qualquer pessoa que
// soubesse o e-mail de um admin conseguiria criar contas (inclusive de admin).
router.post('/', async (req, res) => {
  try {
    const { usuario_email, senha_admin, nome, email, senha, is_admin } = req.body;

    const admin = usuario_email
      ? await queryOne('SELECT * FROM usuarios WHERE email = $1', [usuario_email])
      : null;
    if (!admin?.is_admin) return res.status(403).json({ success: false, error: 'Sem permissão' });
    if (!senha_admin || !verificarSenha(String(senha_admin), admin.senha)) {
      return res.status(401).json({ success: false, error: 'Sua senha de administrador está incorreta.' });
    }

    const nomeLimpo = (nome || '').trim();
    const emailLimpo = (email || '').trim().toLowerCase();
    if (nomeLimpo.length < 2) return res.status(400).json({ success: false, error: 'Informe o nome do usuário.' });
    if (!EMAIL_VALIDO.test(emailLimpo)) return res.status(400).json({ success: false, error: 'E-mail inválido.' });
    if (!emailLimpo.endsWith(DOMINIO)) return res.status(400).json({ success: false, error: `Use um e-mail ${DOMINIO}.` });
    if (!senha || String(senha).length < 4) {
      return res.status(400).json({ success: false, error: 'A senha provisória precisa ter ao menos 4 caracteres.' });
    }

    const novo = await queryOne(
      `INSERT INTO usuarios (email, nome, bio, senha, is_admin)
       VALUES ($1, $2, '', $3, $4)
       RETURNING id, email, nome, is_admin AS "isAdmin", criado_em`,
      [emailLimpo, nomeLimpo, hashSenha(String(senha)), is_admin === true]
    );

    registrar('admin', 'usuario_criado', admin.nome, admin.email,
      `${admin.nome} cadastrou o usuário ${nomeLimpo}${is_admin === true ? ' (administrador)' : ''}`, null);

    res.json({ success: true, data: novo });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ success: false, error: 'Já existe um usuário com esse e-mail.' });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
