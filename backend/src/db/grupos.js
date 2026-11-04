const { query } = require('./database');

// Recebe ids de grupos e devolve esses ids + TODOS os subgrupos abaixo deles
// (qualquer profundidade). Usado nos filtros e nas permissões.
async function subarvore(ids) {
  const limpos = (ids || []).map((i) => parseInt(i, 10)).filter(Number.isFinite);
  if (limpos.length === 0) return [];
  const rows = await query(
    `WITH RECURSIVE sub AS (
       SELECT id FROM produtos WHERE id = ANY($1::bigint[])
       UNION
       SELECT p.id FROM produtos p JOIN sub s ON p.parent_id = s.id
     )
     SELECT id FROM sub`,
    [limpos]
  );
  return rows.map((r) => r.id);
}

module.exports = { subarvore };
