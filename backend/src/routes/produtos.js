const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db/database');
const { subarvore } = require('../db/grupos');

// "produtos" é a tabela da BASE DE ERROS: cada linha é um grupo e pode ter um
// pai (parent_id). Sem pai = grupo principal. Só admin cria/edita/exclui.

async function ehAdmin(email) {
  if (!email) return false;
  const u = await queryOne('SELECT is_admin FROM usuarios WHERE email = $1', [email]);
  return !!u?.is_admin;
}

// Lista TODOS os grupos (lista plana; o frontend monta a árvore).
// total_erros = erros ligados diretamente ao grupo.
router.get('/', async (req, res) => {
  try {
    const grupos = await query(
      `SELECT p.*, (SELECT COUNT(*)::int FROM erros e WHERE e.produto_id = p.id) AS total_erros
         FROM produtos p
        ORDER BY lower(p.nome)`
    );
    res.json({ success: true, data: grupos });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Cria grupo principal (sem parent_id) ou subgrupo (com parent_id)
router.post('/', async (req, res) => {
  try {
    const { nome, cor, icone, parent_id, usuario_email } = req.body;
    if (!(await ehAdmin(usuario_email))) return res.status(403).json({ success: false, error: 'Sem permissão' });
    const nomeLimpo = (nome || '').trim();
    if (!nomeLimpo) return res.status(400).json({ success: false, error: 'Nome obrigatório' });

    let pai = null;
    if (parent_id) {
      pai = await queryOne('SELECT id, cor FROM produtos WHERE id = $1', [parent_id]);
      if (!pai) return res.status(400).json({ success: false, error: 'Grupo pai não encontrado' });
    }

    const novo = await queryOne(
      'INSERT INTO produtos (nome, cor, icone, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nomeLimpo, cor || pai?.cor || '#0A5C8E', icone || '📦', pai ? pai.id : null]
    );
    res.json({ success: true, data: { ...novo, total_erros: 0 } });
  } catch (e) {
    res.status(400).json({
      success: false,
      error: e.code === '23505' ? 'Já existe um grupo com esse nome neste nível' : e.message,
    });
  }
});

// Renomeia, troca a cor ou move o grupo para outro pai
router.put('/:id', async (req, res) => {
  try {
    const { nome, cor, parent_id, usuario_email } = req.body;
    if (!(await ehAdmin(usuario_email))) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const atual = await queryOne('SELECT * FROM produtos WHERE id = $1', [req.params.id]);
    if (!atual) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });

    let nomeNovo = atual.nome;
    if (nome !== undefined) {
      nomeNovo = (nome || '').trim();
      if (!nomeNovo) return res.status(400).json({ success: false, error: 'Nome obrigatório' });
    }

    let paiNovo = atual.parent_id;
    if (parent_id !== undefined) {
      paiNovo = parent_id ? parseInt(parent_id, 10) : null;
      if (paiNovo) {
        const abaixo = (await subarvore([atual.id])).map(String);
        if (abaixo.includes(String(paiNovo))) {
          return res.status(400).json({ success: false, error: 'Não dá para mover um grupo para dentro dele mesmo' });
        }
        if (!(await queryOne('SELECT id FROM produtos WHERE id = $1', [paiNovo]))) {
          return res.status(400).json({ success: false, error: 'Grupo pai não encontrado' });
        }
      }
    }

    const salvo = await queryOne(
      'UPDATE produtos SET nome = $1, cor = COALESCE($2, cor), parent_id = $3 WHERE id = $4 RETURNING *',
      [nomeNovo, cor || null, paiNovo, req.params.id]
    );
    res.json({ success: true, data: salvo });
  } catch (e) {
    res.status(400).json({
      success: false,
      error: e.code === '23505' ? 'Já existe um grupo com esse nome neste nível' : e.message,
    });
  }
});

// Exclui o grupo e todos os subgrupos — mas só se NENHUM erro estiver vinculado
// a eles (para nunca deixar erro "solto" e visível para todo mundo por acidente).
router.delete('/:id', async (req, res) => {
  try {
    const { usuario_email } = req.body;
    if (!(await ehAdmin(usuario_email))) return res.status(403).json({ success: false, error: 'Sem permissão' });

    const ids = await subarvore([req.params.id]);
    if (ids.length === 0) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });

    const { n } = await queryOne('SELECT COUNT(*)::int AS n FROM erros WHERE produto_id = ANY($1::bigint[])', [ids]);
    if (n > 0) {
      return res.status(409).json({
        success: false,
        error: `Este grupo (com seus subgrupos) tem ${n} erro${n > 1 ? 's' : ''} vinculado${n > 1 ? 's' : ''}. Mova ${n > 1 ? 'os erros' : 'o erro'} para outro grupo antes de excluir.`,
      });
    }

    // os subgrupos e as permissões de usuário saem junto (ON DELETE CASCADE)
    await query('DELETE FROM produtos WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Grupos atribuídos a um usuário (admin enxerga todos)
router.get('/usuario/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const u = await queryOne('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (!u) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    if (u.is_admin) {
      const todos = await query('SELECT id FROM produtos ORDER BY nome');
      return res.json({ success: true, data: todos.map(p => p.id) });
    }
    const grupos = await query(
      `SELECT p.id FROM produtos p
       INNER JOIN usuario_produtos up ON up.produto_id = p.id
       WHERE up.usuario_email = $1`,
      [email]
    );
    res.json({ success: true, data: grupos.map(p => p.id) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Define os grupos de um usuário. Marcar um grupo libera também os subgrupos.
router.put('/usuario/:email', async (req, res) => {
  try {
    const { produto_ids, usuario_email } = req.body;
    if (!(await ehAdmin(usuario_email))) return res.status(403).json({ success: false, error: 'Sem permissão' });
    const email = decodeURIComponent(req.params.email);
    await query('DELETE FROM usuario_produtos WHERE usuario_email = $1', [email]);
    for (const id of (produto_ids || [])) {
      await query('INSERT INTO usuario_produtos (usuario_email, produto_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [email, id]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
