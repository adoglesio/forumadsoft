// Utilitários da BASE DE ERROS (grupos em árvore).
// A API devolve uma lista plana (id, nome, parent_id, total_erros...).
// Aqui montamos a árvore e os "caminhos" (Nota fiscal › Erro no NCM › ...).

export const NOME_BASE = "Base de erros";
export const SEP = " › ";

const txt = (v) => (v === null || v === undefined || v === "" ? null : String(v));

/**
 * Monta a árvore a partir da lista plana.
 * - ids são tratados sempre como texto (o Postgres devolve bigint como string)
 * - se o pai não estiver na lista (ex.: usuário só tem acesso ao subgrupo),
 *   o nó vira raiz da árvore dele
 * - cada nó ganha `filhos` e `total` (erros do grupo + de todos os subgrupos)
 */
export function construirArvore(lista = []) {
  const mapa = new Map();
  lista.forEach((p) =>
    mapa.set(String(p.id), {
      ...p,
      id: String(p.id),
      parent_id: txt(p.parent_id),
      total_erros: Number(p.total_erros) || 0,
      filhos: [],
    })
  );

  const raizes = [];
  mapa.forEach((no) => {
    const pai = no.parent_id ? mapa.get(no.parent_id) : null;
    if (pai) pai.filhos.push(no);
    else raizes.push(no);
  });

  const ordenar = (arr) => {
    arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    arr.forEach((n) => ordenar(n.filhos));
  };
  ordenar(raizes);

  const somar = (no) => {
    no.total = no.total_erros + no.filhos.reduce((acc, f) => acc + somar(f), 0);
    return no.total;
  };
  raizes.forEach(somar);

  return { raizes, mapa };
}

/** Caminho do grupo até a raiz: [raiz, ..., grupo] */
export function caminho(id, mapa) {
  const out = [];
  let atual = id != null ? mapa.get(String(id)) : null;
  let guarda = 0;
  while (atual && guarda++ < 50) {
    out.unshift(atual);
    atual = atual.parent_id ? mapa.get(atual.parent_id) : null;
  }
  return out;
}

/** Percorre a árvore na ordem de leitura: [{ ...no, nivel, rotulo: "A › B › C" }] */
export function opcoesPlanas(raizes, prefixo = [], nivel = 0) {
  const out = [];
  raizes.forEach((no) => {
    const nomes = [...prefixo, no.nome];
    out.push({ ...no, nivel, rotulo: nomes.join(SEP) });
    out.push(...opcoesPlanas(no.filhos, nomes, nivel + 1));
  });
  return out;
}

/**
 * Lista que o usuário pode enxergar: admin vê tudo; os demais veem os grupos
 * atribuídos a eles e tudo que está abaixo deles.
 */
export function visiveis(lista, meusIds, ehAdmin) {
  if (ehAdmin) return lista;
  const meus = new Set((meusIds || []).map(String));
  const { mapa } = construirArvore(lista);
  return lista.filter((p) => caminho(p.id, mapa).some((n) => meus.has(n.id)));
}
