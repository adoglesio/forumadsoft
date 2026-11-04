import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import api, { listarProdutos } from "../services/api";
import SeletorGrupo from "../components/SeletorGrupo";
import CaminhoGrupo from "../components/CaminhoGrupo";
import { construirArvore, caminho, NOME_BASE } from "../utils/grupos";
import { IoLockClosedOutline, IoLinkOutline, IoCheckmarkCircle, IoSaveOutline } from "react-icons/io5";

const idTxt = (v) => (v == null || v === "" ? "" : String(v));

export default function MigrarProdutosPage({ onVoltar }) {
  const { user } = useAuth();
  const [erros, setErros] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [selecoes, setSelecoes] = useState({}); // erroId -> grupoId (texto) ou ""
  const [salvando, setSalvando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });
  const [concluido, setConcluido] = useState(false);
  const [falhas, setFalhas] = useState(0);
  const [somenteSemGrupo, setSomenteSemGrupo] = useState(true);
  const [grupoEmLote, setGrupoEmLote] = useState("");

  const { mapa } = useMemo(() => construirArvore(produtos), [produtos]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const [errosResp, grupos] = await Promise.all([
      api.get("/erros").then((r) => r.data.data),
      listarProdutos(),
    ]);
    setErros(errosResp);
    setProdutos(grupos);
    const map = {};
    errosResp.forEach((e) => { map[e.id] = idTxt(e.produto_id); });
    setSelecoes(map);
  }

  const errosFiltrados = somenteSemGrupo ? erros.filter((e) => !e.produto_id) : erros;
  const semGrupo = erros.filter((e) => !e.produto_id).length;
  const comGrupo = erros.length - semGrupo;

  // só o que realmente mudou vai para o servidor
  const alterados = erros.filter((e) => idTxt(selecoes[e.id]) !== idTxt(e.produto_id));

  function definir(erroId, grupoId) {
    setSelecoes((prev) => ({ ...prev, [erroId]: grupoId }));
  }

  function aplicarEmLote() {
    setSelecoes((prev) => {
      const novo = { ...prev };
      errosFiltrados.forEach((e) => { novo[e.id] = grupoEmLote; });
      return novo;
    });
  }

  async function salvarTodos() {
    if (alterados.length === 0) {
      alert("Nenhuma alteração para salvar. Escolha um grupo para pelo menos um erro.");
      return;
    }
    setSalvando(true);
    setConcluido(false);
    setFalhas(0);
    setProgresso({ feitos: 0, total: alterados.length });

    let erradas = 0;
    for (let i = 0; i < alterados.length; i++) {
      const e = alterados[i];
      try {
        await api.put(`/erros/${e.id}`, { produto_id: selecoes[e.id] || null, usuario_email: user.email });
      } catch { erradas++; }
      setProgresso({ feitos: i + 1, total: alterados.length });
    }

    setFalhas(erradas);
    setSalvando(false);
    setConcluido(true);
    await carregar();
  }

  if (!user?.isAdmin) return (
    <div className="empty-state">
      <IoLockClosedOutline size={40} style={{ marginBottom: 8 }} />
      <p>Acesso restrito a administradores.</p>
      <button onClick={onVoltar} className="btn btn-primary">Voltar</button>
    </div>
  );

  return (
    <div className="app-narrow" style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: "var(--text)", fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <IoLinkOutline size={19} /> Vincular erros à {NOME_BASE}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Escolha o grupo (ou subgrupo) de cada erro. Os usuários só enxergam os erros dos grupos liberados para eles.
        </p>
      </div>

      <div className="grid-3" style={{ marginBottom: 20 }}>
        {[
          { label: "Total de erros", valor: erros.length, cor: "var(--primary)", bg: "var(--primary-soft)" },
          { label: "Sem grupo", valor: semGrupo, cor: "var(--danger)", bg: "var(--danger-bg)" },
          { label: "Vinculados", valor: comGrupo, cor: "var(--success)", bg: "var(--success-bg)" },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ background: s.bg }}>
            <div className="stat-card-value" style={{ color: s.cor }}>{s.valor}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{errosFiltrados.length === 1 ? "Aplicar ao erro da lista:" : `Aplicar aos ${errosFiltrados.length} erros da lista:`}</span>
        <SeletorGrupo produtos={produtos} value={grupoEmLote} onChange={setGrupoEmLote} vazio="Sem grupo (limpar)" style={{ flex: 1, minWidth: 220 }} />
        <button onClick={aplicarEmLote} className="btn btn-secondary btn-sm" disabled={errosFiltrados.length === 0}>Aplicar</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => setSomenteSemGrupo(true)}
          className={`chip ${somenteSemGrupo ? "chip-active" : ""}`}
          style={{ background: somenteSemGrupo ? "var(--danger-bg)" : undefined, color: somenteSemGrupo ? "var(--danger)" : undefined }}
        >
          Sem grupo ({semGrupo})
        </button>
        <button
          onClick={() => setSomenteSemGrupo(false)}
          className={`chip ${!somenteSemGrupo ? "chip-active" : ""}`}
          style={{ background: !somenteSemGrupo ? "var(--primary-soft)" : undefined, color: !somenteSemGrupo ? "var(--primary)" : undefined }}
        >
          Todos os erros ({erros.length})
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {errosFiltrados.length === 0 && (
          <div className="empty-state" style={{ padding: 40 }}>
            <IoCheckmarkCircle size={22} style={{ marginBottom: 4, color: "var(--success)" }} />
            <p>Todos os erros já estão vinculados a um grupo!</p>
          </div>
        )}
        {errosFiltrados.map((e) => {
          const mudou = idTxt(selecoes[e.id]) !== idTxt(e.produto_id);
          return (
            <div key={e.id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderLeft: mudou ? "3px solid var(--primary)" : undefined }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.titulo}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  por {e.criador_nome} · {new Date(e.created_at).toLocaleDateString("pt-BR")}
                </div>
                {e.produto_id && (
                  <div style={{ marginTop: 6 }}>
                    <CaminhoGrupo nos={caminho(e.produto_id, mapa)} nomeFallback={e.produto_nome} corFallback={e.produto_cor} />
                  </div>
                )}
              </div>
              <SeletorGrupo produtos={produtos} value={selecoes[e.id]} onChange={(v) => definir(e.id, v)} style={{ width: 300, maxWidth: "100%" }} />
            </div>
          );
        })}
      </div>

      {salvando && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>Salvando...</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{progresso.feitos}/{progresso.total}</span>
          </div>
          <div style={{ background: "var(--surface-alt)", borderRadius: 20, height: 8, overflow: "hidden" }}>
            <div style={{ background: "var(--primary)", height: "100%", borderRadius: 20, width: `${(progresso.feitos / progresso.total) * 100}%`, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {concluido && (
        <div style={{ background: falhas ? "var(--danger-bg)" : "var(--success-bg)", border: `1px solid ${falhas ? "var(--danger)" : "var(--success-border)"}`, borderRadius: "var(--radius-md)", padding: 14, marginBottom: 16, textAlign: "center" }}>
          <span style={{ color: falhas ? "var(--danger)" : "var(--success)", fontWeight: 600 }}>
            {falhas ? `${falhas} erro(s) não puderam ser salvos. Tente novamente.` : "Vínculos salvos com sucesso!"}
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
        {alterados.length > 0 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{alterados.length} {alterados.length === 1 ? "alteração pendente" : "alterações pendentes"}</span>}
        <button onClick={onVoltar} className="btn btn-secondary">Voltar</button>
        <button onClick={salvarTodos} disabled={salvando || alterados.length === 0} className="btn btn-primary">
          <IoSaveOutline size={15} /> {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
