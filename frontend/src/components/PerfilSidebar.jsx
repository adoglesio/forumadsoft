import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import LogoProduto from "./LogoProduto";
import { IoPencil } from "react-icons/io5";
import { useState, useEffect } from "react";
import api from "../services/api";

export default function PerfilSidebar({ onEditarPerfil, children }) {
  const { user } = useAuth();
  const { temaNome } = useTheme();
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    async function carregar() {
      try {
        const ids = await api.get(`/produtos/usuario/${encodeURIComponent(user.email)}`).then(r => r.data.data);
        const todos = await api.get('/produtos').then(r => r.data.data);
        setProdutos(todos.filter(p => ids.includes(p.id)));
      } catch {}
    }
    if (user?.email) carregar();
  }, [user]);

  const isEscuro = temaNome === "escuro";

  return (
    <aside style={{ display: "flex", flexDirection: "column", gap: 12, alignSelf: "flex-start", position: "sticky", top: 80, width: "100%" }}>
      <div className="card" style={{ overflow: "hidden" }}>

        <div style={{
          height: 68,
          background: isEscuro
            ? "linear-gradient(135deg, #0d2035 0%, #0d1117 100%)"
            : "linear-gradient(135deg, #0A5C8E 0%, #1a7ab8 100%)",
        }} />

        <div style={{ padding: "0 16px 16px", marginTop: -26 }}>
          <div style={{ marginBottom: 10 }}>
            {user?.avatar
              ? <img src={user.avatar} alt="" style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--surface)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} />
              : <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, border: "3px solid var(--surface)" }}>
                  {user?.nome?.charAt(0)?.toUpperCase()}
                </div>
            }
          </div>

          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.nome}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: user?.bio ? 8 : 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>

          {user?.bio && (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.5 }}>{user.bio}</p>
          )}

          {user?.isAdmin && (
            <span className="badge" style={{ background: "#F6C64B", color: "#4A3300", marginBottom: 12 }}>
              Administrador
            </span>
          )}

          <button onClick={onEditarPerfil} className="btn btn-ghost btn-sm btn-block" style={{ border: "1px solid var(--border)" }}>
            <IoPencil size={12} />Editar perfil
          </button>
        </div>
      </div>

      {!user?.isAdmin && produtos.length > 0 && (
        <div className="card" style={{ padding: "14px 16px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>Meus grupos</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {produtos.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.cor, flexShrink: 0 }} />
                <LogoProduto icone={p.icone} nome={p.nome} cor={p.cor} size="sm" style={{ height: 16, maxWidth: 80 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {children}
    </aside>
  );
}
