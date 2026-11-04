import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { listarErros, carregarEstatisticas, listarProdutos, getProdutosUsuario } from "../services/api";
import Header from "../components/Header";
import ErroCard from "../components/ErroCard";
import NovoErroModal from "../components/NovoErroModal";
import ErroDetailPage from "../components/ErroDetailPage";
import ProfilePage from "../components/ProfilePage";
import UsuariosOnline from "../components/UsuariosOnline";
import { useNotificacoes } from "../hooks/useNotificacoes";
import { useOnlineUsers } from "../hooks/useOnlineUsers";
import { iniciarPresence, pararPresence } from "../services/presence";
import LogsPage from "../pages/LogsPage";
import GestaoUsuariosPage from "./GestaoUsuariosPage";
import ToggleTema from "../components/ToggleTema";
import PerfilSidebar from "../components/PerfilSidebar";
import MigrarProdutosPage from "./MigrarProdutosPage";
import ProcedimentosPage from "./ProcedimentosPage";
import ArvoreGrupos from "../components/ArvoreGrupos";
import CaminhoGrupo from "../components/CaminhoGrupo";
import { construirArvore, caminho, visiveis, NOME_BASE } from "../utils/grupos";
import { IoArrowBack, IoSearch, IoRefreshOutline, IoClose } from "react-icons/io5";

// ── Sub-header para sub-páginas ───────────────────────────────────────────
function SubPageHeader({ titulo, onVoltar, direita }) {
  return (
    <header className="app-header" style={{
      padding: "10px 20px", display: "flex",
      alignItems: "center", justifyContent: "space-between", gap: 12,
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {onVoltar && (
          <button onClick={onVoltar} className="btn btn-ghost btn-sm">
            <IoArrowBack size={14} /> Voltar
          </button>
        )}
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 800,
          color: "var(--primary)", fontSize: 16, letterSpacing: -0.3,
        }}>
          {titulo || "Dodô Forum"}
        </span>
      </div>
      {direita}
    </header>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { tema } = useTheme();
  const [erros, setErros] = useState([]);
  const [stats, setStats] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [showNovo, setShowNovo] = useState(false);
  const [viewErroId, setViewErroId] = useState(null);
  const [viewPerfil, setViewPerfil] = useState(false);
  const [viewLogs, setViewLogs] = useState(false);
  const [viewGestao, setViewGestao] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [meusGrupos, setMeusGrupos] = useState([]);
  const [produtoFiltro, setProdutoFiltro] = useState("");
  const [viewMigrar, setViewMigrar] = useState(false);
  const [carregandoErros, setCarregandoErros] = useState(true);
  const [viewProcedimentos, setViewProcedimentos] = useState(false);
  const [novasNotif, setNovasNotif] = useState(0);
  const buscarTimer = useRef(null);

  // Busca com debounce para não disparar a cada tecla
  const carregar = useCallback(async () => {
    setCarregandoErros(true);
    try {
      const [lista, estatisticas] = await Promise.all([
        listarErros(filtro, produtoFiltro ? String(produtoFiltro) : "", user?.email),
        carregarEstatisticas(),
      ]);
      setErros(lista);
      setStats(estatisticas);
    } catch {
      // silencioso — o usuário vê lista vazia
    } finally {
      setCarregandoErros(false);
    }
  }, [filtro, produtoFiltro, user?.email]);

  // Debounce na busca por texto
  useEffect(() => {
    clearTimeout(buscarTimer.current);
    buscarTimer.current = setTimeout(() => carregar(), filtro ? 400 : 0);
    return () => clearTimeout(buscarTimer.current);
  }, [carregar, filtro]);

  useEffect(() => {
    listarProdutos().then(setProdutos).catch(() => {});
    if (user?.email) getProdutosUsuario(user.email).then(setMeusGrupos).catch(() => {});
  }, [user?.email]);

  // Base de erros: árvore completa (para os caminhos) e a parte que o usuário enxerga (filtro lateral)
  const { mapa: mapaTodos } = useMemo(() => construirArvore(produtos), [produtos]);
  const listaVisivel = useMemo(() => visiveis(produtos, meusGrupos, user?.isAdmin), [produtos, meusGrupos, user?.isAdmin]);
  const { raizes: raizesFiltro, mapa: mapaFiltro } = useMemo(() => construirArvore(listaVisivel), [listaVisivel]);

  // Presence via Supabase Realtime
  useEffect(() => {
    if (!user) return;
    iniciarPresence(user);
    return () => pararPresence();
  }, [user]);

  const online = useOnlineUsers();
  const statsComOnline = stats ? { ...stats, usuariosOnline: online.length } : stats;

  // Notificações em tempo real — incrementa o contador do sino
  useNotificacoes({
    user,
    onErroClick: (id) => {
      setNovasNotif(0);
      setViewErroId(id);
    },
  });

  // Incrementa contador quando chega nova notificação via Supabase
  // (feito dentro do hook com uma callback extra seria ideal, mas por ora
  //  usamos o efeito de atualização do próprio carregar() periódico)

  const SeletorTema = () => <ToggleTema />;

  // ── Sub-páginas ──────────────────────────────────────────────────────────
  if (viewMigrar) return (
    <div className="app-shell">
      <SubPageHeader titulo="Vincular Erros" onVoltar={() => setViewMigrar(false)} direita={<SeletorTema />} />
      <MigrarProdutosPage onVoltar={() => { setViewMigrar(false); carregar(); }} />
    </div>
  );

  if (viewGestao) return (
    <div className="app-shell">
      <SubPageHeader titulo={NOME_BASE} onVoltar={() => setViewGestao(false)} direita={<SeletorTema />} />
      <GestaoUsuariosPage onVoltar={() => setViewGestao(false)} />
    </div>
  );

  if (viewLogs) return (
    <div className="app-shell">
      <SubPageHeader titulo="Logs do Sistema" onVoltar={() => setViewLogs(false)} direita={<SeletorTema />} />
      <LogsPage onVoltar={() => setViewLogs(false)} />
    </div>
  );

  if (viewProcedimentos) return (
    <div className="app-shell">
      <SubPageHeader titulo="Procedimentos" onVoltar={() => setViewProcedimentos(false)} direita={<SeletorTema />} />
      <ProcedimentosPage />
    </div>
  );

  if (viewPerfil) return (
    <div className="app-shell">
      <SubPageHeader titulo="Meu Perfil" onVoltar={() => setViewPerfil(false)} direita={<SeletorTema />} />
      <ProfilePage onVoltar={() => setViewPerfil(false)} />
    </div>
  );

  if (viewErroId !== null) return (
    <div className="app-shell">
      <SubPageHeader
        titulo="Detalhe do Erro"
        onVoltar={() => setViewErroId(null)}
        direita={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SeletorTema />
            <button onClick={() => setShowNovo(true)} className="btn btn-primary btn-sm">+ Novo</button>
            <button onClick={() => setViewPerfil(true)} className="btn btn-secondary btn-sm">Perfil</button>
          </div>
        }
      />
      <ErroDetailPage
        erroId={viewErroId}
        onVoltar={() => setViewErroId(null)}
        onAtualizar={carregar}
      />
      {showNovo && <NovoErroModal onClose={() => setShowNovo(false)} onCriado={carregar} />}
    </div>
  );

  // ── Dashboard principal ──────────────────────────────────────────────────
  return (
    <div className="app-shell">
      <Header
        stats={statsComOnline}
        onNovo={() => setShowNovo(true)}
        onPerfil={() => setViewPerfil(true)}
        onLogs={() => setViewLogs(true)}
        onGestao={() => setViewGestao(true)}
        onMigrar={() => setViewMigrar(true)}
        onProcedimentos={() => setViewProcedimentos(true)}
        onNotificacoes={() => setNovasNotif(0)}
        totalNotificacoes={novasNotif}
        seletorTema={<SeletorTema />}
      />

      <div className="app-content">

        {/* Sidebar esquerda: perfil */}
        <div className="app-aside-left" style={{ display: "flex", flexDirection: "column", gap: 12, flexShrink: 0, width: 236 }}>
          <PerfilSidebar onEditarPerfil={() => setViewPerfil(true)}>
            <ArvoreGrupos
              raizes={raizesFiltro}
              mapa={mapaFiltro}
              selecionado={produtoFiltro}
              onSelecionar={setProdutoFiltro}
              totalGeral={user?.isAdmin ? stats?.totalErros : undefined}
            />
          </PerfilSidebar>
        </div>

        {/* Coluna central */}
        <div className="app-main" style={{ minWidth: 0 }}>

          {/* Stats */}
          {statsComOnline && (
            <div className="stat-grid">
              {[
                { label: "Total de Erros",  valor: statsComOnline.totalErros,       bg: tema.statBg1, cor: tema.statCor1 },
                { label: "Comentários",     valor: statsComOnline.totalComentarios, bg: tema.statBg2, cor: tema.statCor2 },
                { label: "Usuários",        valor: statsComOnline.totalUsuarios,    bg: tema.statBg3, cor: tema.statCor3 },
                { label: "Online agora",    valor: statsComOnline.usuariosOnline,   bg: tema.statBg4, cor: tema.statCor4 },
              ].map((s) => (
                <div key={s.label} className="stat-card" style={{ background: s.bg }}>
                  <div className="stat-card-value" style={{ color: s.cor }}>{s.valor ?? "—"}</div>
                  <div className="stat-card-label">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filtro ativo da Base de erros */}
          {produtoFiltro && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Filtrando por:</span>
              <CaminhoGrupo nos={caminho(produtoFiltro, mapaTodos)} />
              <button onClick={() => setProdutoFiltro("")} className="btn btn-ghost btn-sm" title="Remover filtro">
                <IoClose size={14} /> Limpar
              </button>
            </div>
          )}

          {/* Campo de busca */}
          <div style={{ position: "relative", marginBottom: 20 }}>
            <IoSearch size={15} style={{
              position: "absolute", left: 13, top: "50%",
              transform: "translateY(-50%)", color: "var(--text-muted)",
            }} />
            <input
              placeholder="Buscar por título ou descrição..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="input"
              style={{ paddingLeft: 36 }}
            />
            {filtro && (
              <button
                onClick={() => setFiltro("")}
                style={{
                  position: "absolute", right: 10, top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer", color: "var(--text-muted)",
                  fontSize: 16, lineHeight: 1,
                }}
                title="Limpar busca"
              >
                ×
              </button>
            )}
          </div>

          {/* Lista de erros */}
          {carregandoErros ? (
            <div className="empty-state">
              <div className="skeleton-spinner" />
            </div>
          ) : erros.length === 0 ? (
            <div className="empty-state">
              <p style={{ marginBottom: 12, color: "var(--text-secondary)" }}>
                {filtro || produtoFiltro ? "Nenhum erro encontrado para este filtro." : "Nenhum erro registrado ainda."}
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {(filtro || produtoFiltro) && (
                  <button onClick={() => { setFiltro(""); setProdutoFiltro(""); }} className="btn btn-secondary btn-sm">
                    Limpar filtros
                  </button>
                )}
                <button onClick={() => setShowNovo(true)} className="btn btn-primary">
                  + Reportar erro
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <small style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {erros.length} {erros.length === 1 ? "erro" : "erros"}
                </small>
                <button onClick={carregar} className="btn btn-ghost btn-sm" title="Atualizar">
                  <IoRefreshOutline size={14} />
                </button>
              </div>
              {erros.map((erro) => (
                <ErroCard
                  key={erro.id}
                  erro={erro}
                  user={user}
                  mapaGrupos={mapaTodos}
                  onAtualizar={carregar}
                  onVerDetalhes={(id) => setViewErroId(id)}
                />
              ))}
            </>
          )}
        </div>

        {/* Sidebar direita: usuários online */}
        <div className="app-aside-right">
          <UsuariosOnline />
        </div>
      </div>

      {showNovo && <NovoErroModal onClose={() => setShowNovo(false)} onCriado={carregar} />}
    </div>
  );
}
