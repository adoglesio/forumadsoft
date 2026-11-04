import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { pararPresence } from "../services/presence";
import { IoList, IoGrid, IoLink, IoNotificationsOutline, IoNotifications } from "react-icons/io5";

export default function Header({
  stats,
  onNovo,
  onPerfil,
  onLogs,
  onGestao,
  onMigrar,
  onProcedimentos,
  onNotificacoes,
  totalNotificacoes = 0,
  seletorTema,
}) {
  const { user, logout } = useAuth();
  const { tema } = useTheme();
  const [confirmandoSair, setConfirmandoSair] = useState(false);

  function handleLogout() {
    pararPresence();
    logout();
  }

  const avatar = user?.avatar
    ? (
      <img
        src={user.avatar}
        alt=""
        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0 }}
      />
    ) : (
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "var(--primary)", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 13, flexShrink: 0,
      }}>
        {user?.nome?.charAt(0)?.toUpperCase()}
      </div>
    );

  return (
    <header className="app-header" style={{
      padding: "10px 20px",
      display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 12,
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Logo + stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          fontSize: 17, color: "var(--primary)", letterSpacing: -0.5, flexShrink: 0,
        }}>
          Dodô Forum
        </span>
        {stats && (
          <div style={{ display: "flex", gap: 5 }}>
            <span className="badge" style={{ background: "var(--primary-soft)", color: "var(--primary)", fontSize: 11 }}>
              {stats.totalErros} erros
            </span>
            <span className="badge" style={{ background: "var(--success-bg)", color: "var(--success)", fontSize: 11 }}>
              {stats.usuariosOnline ?? 0} online
            </span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {seletorTema}

        <button onClick={onNovo} className="btn btn-primary btn-sm">
          + Novo Erro
        </button>

        <button onClick={onProcedimentos} className="btn btn-secondary btn-sm">
          Procedimentos
        </button>

        {/* Sino de notificações */}
        {onNotificacoes && (
          <button
            onClick={onNotificacoes}
            className="btn btn-secondary btn-sm"
            style={{ position: "relative", padding: "5px 8px" }}
            title="Notificações"
          >
            {totalNotificacoes > 0
              ? <IoNotifications size={16} color="var(--primary)" />
              : <IoNotificationsOutline size={16} />
            }
            {totalNotificacoes > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "var(--danger)", color: "white",
                fontSize: 10, fontWeight: 700,
                width: 16, height: 16, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}>
                {totalNotificacoes > 9 ? "9+" : totalNotificacoes}
              </span>
            )}
          </button>
        )}

        {/* Botões admin */}
        {user?.isAdmin && (
          <>
            <button onClick={onLogs} className="btn btn-secondary btn-sm" title="Logs do sistema">
              <IoList size={13} /> <span className="app-header-actions-label">Logs</span>
            </button>
            <button onClick={onGestao} className="btn btn-secondary btn-sm" title="Gerir a Base de erros e as permissões dos usuários">
              <IoGrid size={13} /> <span className="app-header-actions-label">Base de erros</span>
            </button>
            <button onClick={onMigrar} className="btn btn-danger btn-sm" title="Vincular erros a produtos">
              <IoLink size={13} /> <span className="app-header-actions-label">Vincular</span>
            </button>
          </>
        )}

        {/* Perfil */}
        <div
          onClick={onPerfil}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            cursor: "pointer", padding: "4px 8px",
            borderRadius: 8, transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = tema.sidebarHover || "var(--surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Meu perfil"
        >
          {avatar}
          <span className="app-header-actions-label" style={{
            fontSize: 13, color: "var(--text)", fontWeight: 500,
            maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user?.nome}
          </span>
        </div>

        {/* Sair */}
        {confirmandoSair ? (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Confirmar?</span>
            <button onClick={handleLogout} className="btn btn-danger btn-sm">Sim</button>
            <button onClick={() => setConfirmandoSair(false)} className="btn btn-secondary btn-sm">Não</button>
          </div>
        ) : (
          <button onClick={() => setConfirmandoSair(true)} className="btn btn-danger btn-sm">
            Sair
          </button>
        )}
      </div>
    </header>
  );
}
