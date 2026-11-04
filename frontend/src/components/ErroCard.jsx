import { useState } from "react";
import { excluirErro } from "../services/api";
import Reacoes from "./Reacoes";
import CaminhoGrupo from "./CaminhoGrupo";
import { caminho } from "../utils/grupos";
import { IoTrashOutline, IoCheckmarkCircle, IoChatbubbleOutline, IoTimeOutline } from "react-icons/io5";

function formatarData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const agora = new Date();
  const diff = Math.floor((agora - d) / 1000); // segundos

  if (diff < 60)        return "agora mesmo";
  if (diff < 3600)      return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d atrás`;
  return d.toLocaleDateString("pt-BR");
}

export default function ErroCard({ erro, user, mapaGrupos, onAtualizar, onVerDetalhes }) {
  const [excluindo, setExcluindo] = useState(false);
  const ehDono = user?.email === erro.criador_email;
  const ehAdmin = user?.isAdmin;
  const qtdComentarios = Array.isArray(erro.comentarios) ? erro.comentarios.length : (erro.total_comentarios ?? 0);

  async function handleExcluir(e) {
    e.stopPropagation();
    if (!window.confirm("Excluir este erro permanentemente?")) return;
    setExcluindo(true);
    try {
      await excluirErro(erro.id, user.email);
      onAtualizar();
    } catch (err) {
      alert(err.message);
      setExcluindo(false);
    }
  }

  return (
    <div
      className="card card-interactive"
      style={{ padding: 20, marginBottom: 14, opacity: excluindo ? 0.5 : 1, transition: "opacity 0.2s" }}
      onClick={() => onVerDetalhes(erro.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onVerDetalhes(erro.id)}
    >
      {/* Imagem de preview */}
      {erro.imagem && (
        <img
          src={erro.imagem}
          alt=""
          style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 10, marginBottom: 12 }}
        />
      )}

      {/* Badge do produto */}
      {erro.produto_id && (
        <div style={{ marginBottom: 8 }}>
          <CaminhoGrupo
            nos={mapaGrupos ? caminho(erro.produto_id, mapaGrupos) : []}
            nomeFallback={erro.produto_nome}
            corFallback={erro.produto_cor}
          />
        </div>
      )}

      {/* Título + botão excluir */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <h3 style={{ margin: 0, color: "var(--text)", fontSize: 15, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
          {erro.titulo}
        </h3>
        {(ehAdmin || ehDono) && (
          <button
            onClick={handleExcluir}
            className="btn-icon btn-ghost"
            style={{ color: "var(--danger)", flexShrink: 0, border: "none" }}
            title="Excluir"
            disabled={excluindo}
          >
            <IoTrashOutline size={16} />
          </button>
        )}
      </div>

      {/* Descrição resumida */}
      <p style={{ margin: "8px 0", color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
        {erro.descricao?.substring(0, 140)}{(erro.descricao?.length ?? 0) > 140 ? "…" : ""}
      </p>

      {/* Badge solução */}
      {erro.solucao && (
        <div style={{
          background: "var(--success-bg)", border: "1px solid var(--success-border)",
          borderRadius: 8, padding: "4px 12px", marginTop: 8,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <IoCheckmarkCircle size={13} color="var(--success)" />
          <strong style={{ color: "var(--success)", fontSize: 12 }}>Solução disponível</strong>
        </div>
      )}

      {/* Reações */}
      <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
        <Reacoes erroId={erro.id} user={user} />
      </div>

      {/* Rodapé */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)",
      }}>
        <small style={{ color: "var(--text-muted)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          <IoTimeOutline size={12} />
          Por <strong style={{ color: "var(--text-secondary)", marginLeft: 3 }}>{erro.criador_nome}</strong>
          <span style={{ margin: "0 3px" }}>·</span>
          {formatarData(erro.created_at)}
        </small>
        <small style={{ color: "var(--text-secondary)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          <IoChatbubbleOutline size={13} />
          {qtdComentarios}
        </small>
      </div>
    </div>
  );
}
