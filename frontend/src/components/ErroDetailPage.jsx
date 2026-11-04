import { useState, useEffect, useRef } from "react";
import api, {
  buscarErro, editarErro, excluirErro,
  adicionarComentario, editarComentario, excluirComentario,
  listarProdutos,
} from "../services/api";

import { useAuth } from "../context/AuthContext";
import Reacoes from "./Reacoes";
import PainelEmoji from "./PainelEmoji";
import CaminhoGrupo from "./CaminhoGrupo";
import SeletorGrupo from "./SeletorGrupo";
import { construirArvore, caminho, NOME_BASE } from "../utils/grupos";
import { IoPencil, IoTrashOutline, IoSend, IoChatbubbles, IoCheckmarkCircle, IoCamera, IoClose } from "react-icons/io5";
import { MdOutlineDescription } from "react-icons/md";

// ─── Avatar com cache de perfis ───────────────────────────────────────────
const cacheAvatares = {};

function Avatar({ email, nome, size = 36 }) {
  const [avatar, setAvatar] = useState(cacheAvatares[email] || null);

  useEffect(() => {
    if (!email || cacheAvatares[email] !== undefined) return;
    api.get(`/usuarios/perfil-publico/${encodeURIComponent(email)}`)
      .then(r => {
        const av = r.data.data?.avatar || null;
        cacheAvatares[email] = av;
        setAvatar(av);
      }).catch(() => { cacheAvatares[email] = null; });
  }, [email]);

  const cores = ["#0A5C8E","#7C3AED","#16A34A","#C26B2E","#DC2626","#0891B2"];
  const cor = cores[(nome?.charCodeAt(0) || 0) % cores.length];

  if (avatar?.startsWith("data:")) {
    return <img src={avatar} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid var(--border)" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: cor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, border: "2px solid var(--border)" }}>
      {nome?.charAt(0)?.toUpperCase()}
    </div>
  );
}

export default function ErroDetailPage({ erroId, onVoltar, onAtualizar }) {
  const { user } = useAuth();
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [grupos, setGrupos] = useState([]);

  useEffect(() => { carregar(); }, [erroId]);
  useEffect(() => { listarProdutos().then(setGrupos).catch(() => {}); }, []);

  async function carregar() {
    setLoading(true);
    try { setErro(await buscarErro(erroId)); } finally { setLoading(false); }
  }

  async function handleExcluir() {
    if (!window.confirm("Excluir este erro permanentemente?")) return;
    await excluirErro(erroId, user.email);
    onAtualizar(); onVoltar();
  }

  if (loading) return <div className="empty-state"><div className="skeleton-spinner" /></div>;
  if (!erro) return <div className="app-narrow"><p style={{ color: "var(--danger)" }}>Erro não encontrado.</p></div>;

  const ehDono = user?.email === erro.criador_email;
  const ehAdmin = user?.isAdmin;

  if (modoEdicao) return (
    <EditarErroForm erro={erro} user={user}
      onCancelado={() => setModoEdicao(false)}
      onSalvo={() => { setModoEdicao(false); carregar(); onAtualizar(); }}
    />
  );

  return (
    <div className="app-narrow">
      <div className="card" style={{ padding: 28 }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {erro.produto_id && (
              <div style={{ marginBottom: 8 }}>
                <CaminhoGrupo
                  nos={caminho(erro.produto_id, construirArvore(grupos).mapa)}
                  nomeFallback={erro.produto_nome}
                  corFallback={erro.produto_cor}
                />
              </div>
            )}
            <h2 style={{ margin: 0, color: "var(--text)", fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{erro.titulo}</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {(ehDono || ehAdmin) && (
              <button onClick={() => setModoEdicao(true)} className="btn btn-secondary btn-sm"><IoPencil size={13} /> Editar</button>
            )}
            {ehAdmin && (
              <button onClick={handleExcluir} className="btn btn-danger-solid btn-sm"><IoTrashOutline size={13} /> Excluir</button>
            )}
          </div>
        </div>

        {erro.imagem && (
          <img src={erro.imagem} alt="" style={{ width: "100%", maxHeight: 380, objectFit: "contain", borderRadius: 12, marginBottom: 20, border: "1px solid var(--border)" }} />
        )}

        <div style={{ marginBottom: 20 }}>
          <Reacoes erroId={erro.id} user={user} />
        </div>

        <p style={tituloSecao}><MdOutlineDescription style={{marginRight:4,verticalAlign:"middle"}} /> Descrição</p>
        <div style={descricaoStyle}>{erro.descricao}</div>

        <p style={tituloSecao}><IoCheckmarkCircle style={{marginRight:4,verticalAlign:"middle",color:"var(--success)"}} /> Solução</p>
        <div style={solucaoStyle}>
          {erro.solucao || <em style={{ color: "var(--text-muted)" }}>Nenhuma solução registrada ainda.</em>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
          <Avatar email={erro.criador_email} nome={erro.criador_nome} size={32} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{erro.criador_nome}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
              {new Date(erro.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
        </div>

        <hr style={{ margin: "16px 0 24px", border: "none", borderTop: "1px solid var(--border)" }} />

        <Comentarios erro={erro} user={user} onAtualizar={carregar} />
      </div>
    </div>
  );
}

function Comentarios({ erro, user, onAtualizar }) {
  const [texto, setTexto] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const textareaRef = useRef();

  async function enviar() {
    if (!texto.trim()) return;
    await adicionarComentario(erro.id, { conteudo: texto, usuario: user.nome, usuario_email: user.email });
    setTexto(""); onAtualizar();
  }

  async function handleExcluir(cId) {
    if (!window.confirm("Excluir comentário?")) return;
    await excluirComentario(erro.id, cId, user.email);
    onAtualizar();
  }

  return (
    <>
      <h3 style={{ marginBottom: 16, color: "var(--text)", fontSize: 16, display: "flex", alignItems: "center", gap: 6 }}>
        <IoChatbubbles size={17} /> Comentários ({erro.comentarios?.length || 0})
      </h3>

      {(erro.comentarios || []).map((c) => (
        <div key={c.id} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <Avatar email={c.usuario_email} nome={c.usuario} size={36} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: "var(--surface-alt)", borderRadius: "4px 12px 12px 12px", padding: "10px 14px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13, color: "var(--text)" }}>{c.usuario}</strong>
                  <small style={{ color: "var(--text-muted)", fontSize: 11 }}>{new Date(c.data).toLocaleString("pt-BR")}</small>
                  {c.editado && <small style={{ color: "var(--text-muted)", fontSize: 11 }}>(editado)</small>}
                </div>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  {c.usuario_email === user?.email && (
                    <button onClick={() => setEditandoId(editandoId === c.id ? null : c.id)} className="btn-icon btn-ghost" style={{ border: "none", width: 26, height: 26 }} title="Editar"><IoPencil size={13} /></button>
                  )}
                  {(user?.isAdmin || c.usuario_email === user?.email) && (
                    <button onClick={() => handleExcluir(c.id)} className="btn-icon btn-ghost" style={{ border: "none", width: 26, height: 26, color: "var(--danger)" }} title="Excluir"><IoTrashOutline size={13} /></button>
                  )}
                </div>
              </div>

              {editandoId === c.id ? (
                <EditarComentario erroId={erro.id} comentario={c} userEmail={user.email}
                  onSalvo={() => { setEditandoId(null); onAtualizar(); }}
                  onCancelar={() => setEditandoId(null)}
                />
              ) : (
                <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>{c.conteudo}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <Avatar email={user?.email} nome={user?.nome} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === "Enter" && e.ctrlKey && enviar()}
            placeholder="Escreva um comentário... (Ctrl + Enter para enviar)"
            rows={3}
            className="textarea"
            style={{ borderRadius: "4px 12px 12px 12px" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={enviar} className="btn btn-primary btn-sm">
              <IoChatbubbles size={14} /> Comentar
            </button>
            <PainelEmoji onSelecionar={(emoji) => {
              const el = textareaRef.current;
              if (el) {
                const s = el.selectionStart, e2 = el.selectionEnd;
                const novo = texto.substring(0, s) + emoji + texto.substring(e2);
                setTexto(novo);
                setTimeout(() => { el.focus(); el.setSelectionRange(s + emoji.length, s + emoji.length); }, 0);
              } else setTexto(t => t + emoji);
            }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Ctrl+Enter para enviar</span>
          </div>
        </div>
      </div>
    </>
  );
}

function EditarComentario({ erroId, comentario, userEmail, onSalvo, onCancelar }) {
  const [texto, setTexto] = useState(comentario.conteudo);

  async function salvar() {
    if (!texto.trim()) return;
    await editarComentario(erroId, comentario.id, { conteudo: texto, usuario_email: userEmail });
    onSalvo();
  }

  return (
    <div>
      <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3} className="textarea" />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={salvar} className="btn btn-primary btn-sm">Salvar</button>
        <button onClick={onCancelar} className="btn btn-secondary btn-sm">Cancelar</button>
      </div>
    </div>
  );
}

function EditarErroForm({ erro, user, onCancelado, onSalvo }) {
  const [titulo, setTitulo] = useState(erro.titulo);
  const [descricao, setDescricao] = useState(erro.descricao);
  const [solucao, setSolucao] = useState(erro.solucao || "");
  const [imagem, setImagem] = useState(erro.imagem || null);
  const [msg, setMsg] = useState("");
  const [msgTipo, setMsgTipo] = useState("erro");
  const [produtos, setProdutos] = useState([]);
  const [produtoId, setProdutoId] = useState(erro.produto_id == null ? "" : String(erro.produto_id));
  const fileRef = useRef();

  useEffect(() => {
    // só administrador escolhe o grupo da Base de erros
    if (user?.isAdmin) listarProdutos().then(setProdutos).catch(() => {});
  }, [user]);

  async function salvar() {
    if (!titulo.trim() || !descricao.trim()) { setMsg("Preencha os campos obrigatórios."); setMsgTipo("erro"); return; }
    const ok = await editarErro(erro.id, { titulo, descricao, solucao, imagem, usuario_email: user.email, ...(user.isAdmin ? { produto_id: produtoId || null } : {}) });
    if (ok) { setMsg("Salvo!"); setMsgTipo("sucesso"); setTimeout(onSalvo, 800); }
    else { setMsg("Não foi possível salvar."); setMsgTipo("erro"); }
  }

  return (
    <div className="app-narrow">
      <div className="card" style={{ padding: 28 }}>
        <h2 style={{ marginBottom: 20, color: "var(--text)", fontSize: 19, display: "flex", alignItems: "center", gap: 8 }}><IoPencil size={18} /> Editar erro</h2>

        {user?.isAdmin && produtos.length > 0 && (
          <div className="field">
            <label className="field-label">{NOME_BASE}</label>
            <SeletorGrupo produtos={produtos} value={produtoId} onChange={setProdutoId} />
          </div>
        )}

        <div className="field">
          <label className="field-label field-required">Título</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} className="input" />
        </div>

        <div className="field">
          <label className="field-label field-required">Descrição</label>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={5} className="textarea" />
        </div>

        <div className="field">
          <label className="field-label">Solução</label>
          <textarea value={solucao} onChange={e => setSolucao(e.target.value)} rows={4} className="textarea" />
        </div>

        {imagem && <img src={imagem} alt="" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginBottom: 8 }} />}

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => fileRef.current.click()} className="btn btn-secondary btn-sm"><IoCamera size={14} /> Imagem</button>
          {imagem && <button onClick={() => setImagem(null)} className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}><IoClose size={14} /> Remover</button>}
          <input type="file" ref={fileRef} accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) { const r = new FileReader(); r.onload = ev => setImagem(ev.target.result); r.readAsDataURL(e.target.files[0]); } }} />
        </div>

        {msg && <p className={`form-message ${msgTipo === "sucesso" ? "form-message-success" : "form-message-error"}`}>{msg}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancelado} className="btn btn-secondary">Cancelar</button>
          <button onClick={salvar} className="btn btn-primary"><IoSend size={14} /> Salvar</button>
        </div>
      </div>
    </div>
  );
}

const tituloSecao = { fontWeight: 700, color: "var(--text)", marginBottom: 8, fontSize: 14 };
const descricaoStyle = { background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, marginBottom: 20, color: "var(--text)" };
const solucaoStyle = { background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: 12, padding: 16, whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, marginBottom: 20, color: "var(--text)" };
