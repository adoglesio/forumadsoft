import { IoChevronForward } from "react-icons/io5";

/** Mostra o caminho do grupo: Nota fiscal › Erro no NCM › Erro no PDV */
export default function CaminhoGrupo({ nos = [], nomeFallback, corFallback }) {
  const lista = nos.length ? nos : nomeFallback ? [{ id: "x", nome: nomeFallback, cor: corFallback }] : [];
  if (!lista.length) return null;
  const cor = lista[0].cor || "#0A5C8E";

  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 4,
        background: cor + "18", border: `1px solid ${cor}44`, borderLeft: `3px solid ${cor}`,
        borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600,
      }}
    >
      {lista.map((n, i) => (
        <span key={n.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {i > 0 && <IoChevronForward size={10} style={{ opacity: 0.5, color: "var(--text-muted)" }} />}
          <span style={{ color: i === 0 ? cor : "var(--text-secondary)" }}>{n.nome}</span>
        </span>
      ))}
    </span>
  );
}
