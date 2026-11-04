const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../db/database');
const { registrarLog } = require('./logs');
const { subarvore } = require('../db/grupos');

function getIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;
}

const SELECT_ERRO = `
  SELECT e.*, p.nome as produto_nome, p.cor as produto_cor, p.icone as produto_icone
  FROM erros e LEFT JOIN produtos p ON p.id = e.produto_id
`;

router.get('/', async (req, res) => {
  try {
    const { filtro, produto_id, usuario_email } = req.query;
    let sql = SELECT_ERRO;
    const params = [];
    const where = [];

    // Filtrar por produtos do usuário (se não for admin)
    if (usuario_email) {
      const u = await queryOne('SELECT * FROM usuarios WHERE email = $1', [usuario_email]);
      if (u && !u.is_admin) {
        const atribuidos = (await query('SELECT produto_id FROM usuario_produtos WHERE usuario_email = $1', [usuario_email])).map(r => r.produto_id);
        if (atribuidos.length > 0) {
          // grupo atribuído + todos os subgrupos dele
          const liberados = await subarvore(atribuidos);
          params.push(liberados);
          where.push(`(e.produto_id = ANY($${params.length}::bigint[]) OR e.produto_id IS NULL)`);
        } else {
          where.push('e.produto_id IS NULL');
        }
      }
    }

    if (produto_id) {
      // filtrar por um grupo traz também os erros de todos os subgrupos dele
      params.push(await subarvore([produto_id]));
      where.push(`e.produto_id = ANY($${params.length}::bigint[])`);
    }
    if (filtro) {
      params.push(`%${filtro}%`);
      where.push(`(e.titulo ILIKE $${params.length} OR e.descricao ILIKE $${params.length})`);
    }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY e.created_at DESC';

    const erros = await query(sql, params);
    const comentarios = erros.length
      ? await query('SELECT * FROM comentarios WHERE erro_id = ANY($1) ORDER BY data ASC', [erros.map(e => e.id)])
      : [];
    res.json({ success: true, data: erros.map(e => ({ ...e, comentarios: comentarios.filter(c => c.erro_id === e.id) })) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const erro = await queryOne(SELECT_ERRO + ' WHERE e.id = $1', [req.params.id]);
    if (!erro) return res.status(404).json({ success: false, error: 'Erro não encontrado' });
    const comentarios = await query('SELECT * FROM comentarios WHERE erro_id = $1 ORDER BY data ASC', [erro.id]);
    res.json({ success: true, data: { ...erro, comentarios } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { titulo, descricao, solucao, criador_email, criador_nome, imagem, produto_id } = req.body;
    if (!titulo || !descricao) return res.status(400).json({ success: false, error: 'Título e descrição são obrigatórios' });
    // só administrador vincula o erro a um grupo da Base de erros
    const solicitante = criador_email ? await queryOne('SELECT is_admin FROM usuarios WHERE email = $1', [criador_email]) : null;
    const grupoFinal = solicitante?.is_admin ? (produto_id || null) : null;
    const novo = await queryOne(
      `INSERT INTO erros (titulo, descricao, solucao, criador_email, criador_nome, imagem, produto_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [titulo, descricao, solucao || '', criador_email || 'anonimo', criador_nome || 'Anônimo', imagem || null, grupoFinal]
    );
    registrarLog('erro', 'erro_criado', criador_nome, criador_email, `${criador_nome} reportou o erro: "${titulo}"`, getIP(req));
    res.json({ success: true, data: { ...novo, comentarios: [] } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { titulo, descricao, solucao, imagem, usuario_email, produto_id } = req.body;
    const erro = await queryOne('SELECT * FROM erros WHERE id = $1', [req.params.id]);
    if (!erro) return res.status(404).json({ success: false, error: 'Erro não encontrado' });
    const u = await queryOne('SELECT * FROM usuarios WHERE email = $1', [usuario_email]);
    if (!u?.is_admin && erro.criador_email !== usuario_email) return res.status(403).json({ success: false, error: 'Sem permissão' });

    // só administrador troca o grupo; para os demais o vínculo atual é mantido
    const novoProdutoId = (u?.is_admin && produto_id !== undefined) ? (produto_id ? parseInt(produto_id) : null) : erro.produto_id;

    await query(
      `UPDATE erros SET titulo = COALESCE($1, titulo), descricao = COALESCE($2, descricao),
       solucao = COALESCE($3, solucao), imagem = $4, produto_id = $5, atualizado_em = now() WHERE id = $6`,
      [titulo, descricao, solucao, imagem !== undefined ? imagem : erro.imagem, novoProdutoId, req.params.id]
    );
    registrarLog('erro', 'erro_editado', u.nome, usuario_email, `${u.nome} editou o erro: "${erro.titulo}"`, getIP(req));
    res.json({ success: true, data: await queryOne(SELECT_ERRO + ' WHERE e.id = $1', [req.params.id]) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { usuario_email } = req.body;
    const erro = await queryOne('SELECT * FROM erros WHERE id = $1', [req.params.id]);
    if (!erro) return res.status(404).json({ success: false, error: 'Erro não encontrado' });
    const u = await queryOne('SELECT * FROM usuarios WHERE email = $1', [usuario_email]);
    if (!u?.is_admin && erro.criador_email !== usuario_email) return res.status(403).json({ success: false, error: 'Sem permissão' });
    await query('DELETE FROM erros WHERE id = $1', [req.params.id]);
    registrarLog('erro', 'erro_deletado', u.nome, usuario_email, `${u.nome} deletou o erro: "${erro.titulo}"`, getIP(req));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/:id/comentarios', async (req, res) => {
  try {
    const { conteudo, usuario, usuario_email } = req.body;
    if (!conteudo) return res.status(400).json({ success: false, error: 'Conteúdo obrigatório' });
    const erro = await queryOne('SELECT id, titulo FROM erros WHERE id = $1', [req.params.id]);
    if (!erro) return res.status(404).json({ success: false, error: 'Erro não encontrado' });
    const novo = await queryOne(
      'INSERT INTO comentarios (erro_id, usuario, usuario_email, conteudo) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, usuario || 'Anônimo', usuario_email || 'anonimo', conteudo]
    );
    registrarLog('comentario', 'comentario_criado', usuario, usuario_email, `${usuario} comentou em "${erro.titulo}"`, getIP(req));
    res.json({ success: true, data: novo });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/:erroId/comentarios/:comentarioId', async (req, res) => {
  try {
    const { conteudo, usuario_email } = req.body;
    const c = await queryOne('SELECT * FROM comentarios WHERE id = $1', [req.params.comentarioId]);
    if (!c) return res.status(404).json({ success: false, error: 'Comentário não encontrado' });
    if (c.usuario_email !== usuario_email) return res.status(403).json({ success: false, error: 'Sem permissão' });
    await query('UPDATE comentarios SET conteudo = $1, editado = true, editado_em = now() WHERE id = $2', [conteudo, req.params.comentarioId]);
    registrarLog('comentario', 'comentario_editado', c.usuario, usuario_email, `${c.usuario} editou um comentário`, getIP(req));
    res.json({ success: true, data: await queryOne('SELECT * FROM comentarios WHERE id = $1', [req.params.comentarioId]) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/:erroId/comentarios/:comentarioId', async (req, res) => {
  try {
    const { usuario_email } = req.body;
    const c = await queryOne('SELECT * FROM comentarios WHERE id = $1', [req.params.comentarioId]);
    if (!c) return res.status(404).json({ success: false, error: 'Comentário não encontrado' });
    const u = await queryOne('SELECT * FROM usuarios WHERE email = $1', [usuario_email]);
    if (!u?.is_admin && c.usuario_email !== usuario_email) return res.status(403).json({ success: false, error: 'Sem permissão' });
    await query('DELETE FROM comentarios WHERE id = $1', [req.params.comentarioId]);
    registrarLog('comentario', 'comentario_deletado', u.nome, usuario_email, `${u.nome} deletou um comentário`, getIP(req));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
