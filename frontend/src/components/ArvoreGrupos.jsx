import { useState, useEffect } from "react";
import { IoChevronForward, IoChevronDown, IoLayersOutline } from "react-icons/io5";
import { caminho, NOME_BASE } from "../utils/grupos";

/**
 * Filtro lateral da Base de erros. Clicar num grupo filtra e abre os subgrupos.
 * O filtro por um grupo inclui automaticamente os erros dos subgrupos.
 */
export default function ArvoreGrupos({ raizes, mapa, selecionado, onSelecionar, totalGeral }) {
  const [abertos, setAbertos] = useState(() => new Set());

  // ao selecionar (ou vir de fora), garante que o caminho até o grupo esteja aberto
  useEffect(() => {
    if (!selecionado) return;
    setAbertos((prev) => {
      const novo = new Set(prev);
      caminho(selecionado, mapa).forEach((n) => novo.add(n.id));
      return novo;
    });
  }, [selecionado, mapa]);

  function alternar(id) {
    setAbertos((prev) => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  function linha(no, nivel) {
    const aberto = abertos.has(no.id);
    const ativo = selecionado === no.id;
    const temFilhos = no.filhos.length > 0;
    return (
      <div key={no.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            onSelecionar(no.id);
            if (temFilhos && !aberto) alternar(no.id);
          }}
          onKeyDown={(e) => e.key === "Enter" && onSelecionar(no.id)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 8px", paddingLeft: 8 + nivel * 14,
            borderRadius: 8, cursor: "pointer", fontSize: 13,
            background: ativo ? "var(--primary-soft)" : "transparent",
            color: ativo ? "var(--primary)" : "var(--text)",
            fontWeight: ativo ? 700 : 500,
            borderLeft: `3px solid ${nivel === 0 ? no.cor || "var(--primary)" : "transparent"}`,
          }}
        >
          <span
            onClick={(e) => { e.stopPropagation(); if (temFilhos) alternar(no.id); }}
            style={{ width: 16, display: "inline-flex", justifyContent: "center", color: "var(--text-muted)", flexShrink: 0 }}
            title={temFilhos ? (aberto ? "Recolher" : "Abrir subgrupos") : undefined}
          >
            {temFilhos && (aberto ? <IoChevronDown size={13} /> : <IoChevronForward size={13} />)}
          </span>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={no.nome}>
            {no.nome}
          </span>
          {no.total > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface-alt)", borderRadius: 10, padding: "1px 7px", flexShrink: 0 }}>
              {no.total}
            </span>
          )}
        </div>
        {temFilhos && aberto && no.filhos.map((f) => linha(f, nivel + 1))}
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "14px 10px 10px" }}>
      <p style={{ margin: "0 0 8px 8px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, display: "flex", alignItems: "center", gap: 6 }}>
        <IoLayersOutline size={13} /> {NOME_BASE}
      </p>

      <div style={{ maxHeight: "calc(100vh - 470px)", minHeight: 140, overflowY: "auto" }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelecionar("")}
          onKeyDown={(e) => e.key === "Enter" && onSelecionar("")}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", paddingLeft: 11,
            borderRadius: 8, cursor: "pointer", fontSize: 13,
            background: !selecionado ? "var(--primary-soft)" : "transparent",
            color: !selecionado ? "var(--primary)" : "var(--text)",
            fontWeight: !selecionado ? 700 : 500,
          }}
        >
          <span style={{ width: 16 }} />
          <span style={{ flex: 1 }}>Todos os erros</span>
          {totalGeral > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--surface-alt)", borderRadius: 10, padding: "1px 7px" }}>
              {totalGeral}
            </span>
          )}
        </div>

        {raizes.length === 0 && (
          <p style={{ margin: "10px 8px", fontSize: 12, color: "var(--text-muted)" }}>Nenhum grupo cadastrado ainda.</p>
        )}
        {raizes.map((r) => linha(r, 0))}
      </div>
    </div>
  );
}
