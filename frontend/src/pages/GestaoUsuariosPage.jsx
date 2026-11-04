import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import api, { listarProdutos, getProdutosUsuario, setProdutosUsuario, criarProduto, editarProduto, deletarProduto } from "../services/api";
import { construirArvore, opcoesPlanas, NOME_BASE } from "../utils/grupos";
import {
  IoTrashOutline, IoLayersOutline, IoPeopleOutline, IoLockClosedOutline, IoSaveOutline,
  IoAdd, IoPencil, IoCheckmark, IoClose, IoChevronForward, IoChevronDown,
} from "react-icons/io5";

export default function GestaoUsuariosPage({ onVoltar }) {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [gruposUsuario, setGruposUsuario] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [erroMsg, setErroMsg] = useState("");

  // formulário de grupo principal
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#0A5C8E");

  // edição na árvore
  const [adicionandoEm, setAdicionandoEm] = useState(null); // id do grupo pai
  const [subNome, setSubNome] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [recolhidos, setRecolhidos] = useState(() => new Set());

  const { raizes } = useMemo(() => construirArvore(produtos), [produtos]);
  const planas = useMemo(() => opcoesPlanas(raizes), [raizes]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    const [u, p] = await Promise.all([
      api.get("/usuarios/listar").then((r) => r.data.data).catch(() => []),
      listarProdutos().catch(() => []),
    ]);
    setUsuarios(u);
    setProdutos(p);
  }

  function avisar(texto, erro = false) {
    if (erro) { setErroMsg(texto); setTimeout(() => setErroMsg(""), 5000); }
    else { setMsg(texto); setTimeout(() => setMsg(""), 2500); }
  }

  async function executar(fn, sucesso) {
    try {
      await fn();
      if (sucesso) avisar(sucesso);
      await carregar();
      return true;
    } catch (e) {
      avisar(e.message, true);
      return false;
    }
  }

  // ── grupos ──────────────────────────────────────────────────────────────
  async function criarPrincipal() {
    if (!novoNome.trim()) return;
    const ok = await executar(
      () => criarProduto({ nome: novoNome.trim(), cor: novaCor, usuario_email: user.email }),
      "Grupo criado!"
    );
    if (ok) setNovoNome("");
  }

  async function criarSub(paiId) {
    if (!subNome.trim()) return;
    const ok = await executar(
      () => criarProduto({ nome: subNome.trim(), parent_id: paiId, usuario_email: user.email }),
      "Subgrupo criado!"
    );
    if (ok) {
      setSubNome("");
      setAdicionandoEm(null);
      setRecolhidos((prev) => { const n = new Set(prev); n.delete(paiId); return n; });
    }
  }

  async function renomear(id) {
    if (!editNome.trim()) return;
    const ok = await executar(() => editarProduto(id, { nome: editNome.trim(), usuario_email: user.email }), "Nome atualizado!");
    if (ok) setEditandoId(null);
  }

  function contarDescendentes(no) {
    return no.filhos.reduce((acc, f) => acc + 1 + contarDescendentes(f), 0);
  }

  async function excluir(no) {
    const extra = no.filhos.length ? ` Os ${contarDescendentes(no)} subgrupo(s) dentro dele também serão excluídos.` : "";
    if (!window.confirm(`Excluir "${no.nome}"?${extra}`)) return;
    await executar(() => deletarProduto(no.id, user.email), "Grupo excluído.");
  }

  function alternarRecolhido(id) {
    setRecolhidos((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ── permissões de usuário ───────────────────────────────────────────────
  async function selecionarUsuario(u) {
    setSelecionado(u);
    const ids = await getProdutosUsuario(u.email);
    setGruposUsuario(ids.map(String));
  }

  function alternarGrupoUsuario(id) {
    setGruposUsuario((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function salvarGrupos() {
    setSalvando(true);
    try {
      await setProdutosUsuario(selecionado.email, gruposUsuario, user.email);
      avisar("Grupos salvos!");
    } catch (e) {
      avisar(e.message, true);
    }
    setSalvando(false);
  }

  if (!user?.isAdmin) return (
    <div className="empty-state">
      <IoLockClosedOutline size={40} style={{ marginBottom: 8 }} />
      <p>Acesso restrito a administradores.</p>
      <button onClick={onVoltar} className="btn btn-primary">Voltar</button>
    </div>
  );

  function linha(no, nivel) {
    const recolhido = recolhidos.has(no.id);
    const temFilhos = no.filhos.length > 0;
    const editando = editandoId === no.id;
    return (
      <div key={no.id}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", paddingLeft: 8 + nivel * 18,
            borderRadius: "var(--radius-sm)", border: "1px solid var(--input-border)", background: "var(--input-bg)", marginBottom: 4,
          }}
        >
          <span
            onClick={() => temFilhos && alternarRecolhido(no.id)}
            style={{ width: 16, display: "inline-flex", justifyContent: "center", color: "var(--text-muted)", cursor: temFilhos ? "pointer" : "default", flexShrink: 0 }}
          >
            {temFilhos && (recolhido ? <IoChevronForward size={13} /> : <IoChevronDown size={13} />)}
          </span>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: no.cor, flexShrink: 0 }} />

          {editando ? (
            <input
              autoFocus
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") renomear(no.id); if (e.key === "Escape") setEditandoId(null); }}
              className="input"
              style={{ flex: 1, padding: "4px 8px", fontSize: 13 }}
            />
          ) : (
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: nivel === 0 ? 700 : 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {no.nome}
              {no.total_erros > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{no.total_erros} erro{no.total_erros > 1 ? "s" : ""}</span>}
            </span>
          )}

          {editando ? (
            <>
              <button onClick={() => renomear(no.id)} className="btn-icon btn-ghost" style={{ border: "none", color: "var(--success)" }} title="Salvar"><IoCheckmark size={16} /></button>
              <button onClick={() => setEditandoId(null)} className="btn-icon btn-ghost" style={{ border: "none" }} title="Cancelar"><IoClose size={16} /></button>
            </>
          ) : (
            <>
              <button onClick={() => { setAdicionandoEm(no.id); setSubNome(""); }} className="btn-icon btn-ghost" style={{ border: "none", color: "var(--primary)" }} title="Adicionar subgrupo"><IoAdd size={17} /></button>
              <button onClick={() => { setEditandoId(no.id); setEditNome(no.nome); }} className="btn-icon btn-ghost" style={{ border: "none" }} title="Renomear"><IoPencil size={14} /></button>
              <button onClick={() => excluir(no)} className="btn-icon btn-ghost" style={{ border: "none", color: "var(--danger)" }} title="Excluir"><IoTrashOutline size={15} /></button>
            </>
          )}
        </div>

        {adicionandoEm === no.id && (
          <div style={{ display: "flex", gap: 6, marginBottom: 4, paddingLeft: 8 + (nivel + 1) * 18 }}>
            <input
              autoFocus
              value={subNome}
              onChange={(e) => setSubNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") criarSub(no.id); if (e.key === "Escape") setAdicionandoEm(null); }}
              placeholder={`Subgrupo dentro de "${no.nome}"`}
              className="input"
              style={{ flex: 1, padding: "6px 10px", fontSize: 13 }}
            />
            <button onClick={() => criarSub(no.id)} className="btn btn-primary btn-sm">Adicionar</button>
            <button onClick={() => setAdicionandoEm(null)} className="btn btn-secondary btn-sm">Cancelar</button>
          </div>
        )}

        {temFilhos && !recolhido && no.filhos.map((f) => linha(f, nivel + 1))}
      </div>
    );
  }

  return (
    <div className="app-narrow" style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: "var(--text)", fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <IoLayersOutline size={20} /> {NOME_BASE}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
          Monte os grupos e subgrupos. Só administradores cadastram grupos e vinculam erros a eles.
        </p>
      </div>

      {(msg || erroMsg) && (
        <div className={`form-message ${erroMsg ? "form-message-error" : "form-message-success"}`} style={{ marginBottom: 14 }}>
          {erroMsg || msg}
        </div>
      )}

      <div className="grid-2">
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", color: "var(--text)", fontSize: 15, fontWeight: 700 }}>Grupos e subgrupos</h3>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-muted)" }}>
            Use <IoAdd size={12} style={{ verticalAlign: "middle" }} /> para criar um subgrupo dentro do grupo.
          </p>

          <div style={{ marginBottom: 16 }}>
            {raizes.map((r) => linha(r, 0))}
            {raizes.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Nenhum grupo cadastrado.</p>}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>Novo grupo principal</p>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criarPrincipal()}
                placeholder="Ex.: Nota fiscal"
                className="input"
                style={{ flex: 1 }}
              />
              <input type="color" value={novaCor} onChange={(e) => setNovaCor(e.target.value)} style={{ width: 38, height: 38, border: "none", borderRadius: 8, cursor: "pointer", padding: 2, flexShrink: 0 }} title="Cor do grupo" />
              <button onClick={criarPrincipal} className="btn btn-primary btn-sm">Adicionar</button>
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", color: "var(--text)", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <IoPeopleOutline size={17} /> Usuários
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
              {usuarios.map((u) => (
                <div
                  key={u.email}
                  onClick={() => selecionarUsuario(u)}
                  style={{
                    padding: "10px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer",
                    border: selecionado?.email === u.email ? "2px solid var(--primary)" : "1px solid var(--input-border)",
                    background: selecionado?.email === u.email ? "var(--primary-soft)" : "var(--input-bg)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0, fontSize: 13 }}>
                    {u.nome?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                  </div>
                  {u.isAdmin && <span className="badge" style={{ marginLeft: "auto", background: "#F6C64B", color: "#4A3300", flexShrink: 0 }}>Admin</span>}
                </div>
              ))}
            </div>
          </div>

          {selecionado && (
            <div className="card" style={{ padding: 20, marginTop: 16 }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                Grupos de <span style={{ color: "var(--primary)" }}>{selecionado.nome}</span>
              </p>

              {selecionado.isAdmin ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Admin tem acesso a todos os grupos automaticamente.</p>
              ) : (
                <>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-muted)" }}>
                    Marcar um grupo libera também todos os subgrupos dele.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto", marginBottom: 14 }}>
                    {planas.map((g) => (
                      <label
                        key={g.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", paddingLeft: 8 + g.nivel * 18, borderRadius: 6, cursor: "pointer", fontSize: 13, color: "var(--text)", background: gruposUsuario.includes(g.id) ? "var(--primary-soft)" : "transparent" }}
                      >
                        <input type="checkbox" checked={gruposUsuario.includes(g.id)} onChange={() => alternarGrupoUsuario(g.id)} />
                        <span style={{ fontWeight: g.nivel === 0 ? 700 : 400 }}>{g.nome}</span>
                      </label>
                    ))}
                  </div>
                  <button onClick={salvarGrupos} disabled={salvando} className="btn btn-primary btn-sm">
                    <IoSaveOutline size={14} /> {salvando ? "Salvando..." : "Salvar"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
