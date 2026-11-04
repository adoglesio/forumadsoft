-- ─────────────────────────────────────────────────────────────────────────
-- Dodô Forum — schema Postgres para Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (Supabase Dashboard → SQL Editor → New query → colar → Run)
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

create table if not exists usuarios (
  id         bigint generated always as identity primary key,
  email      text unique not null,
  nome       text not null,
  bio        text default '',
  senha      text not null,
  avatar     text,
  is_admin   boolean default false,
  criado_em  timestamptz default now()
);

-- Base de erros: cada linha é um grupo; parent_id aponta para o grupo pai
-- (null = grupo principal). Nome é único dentro do mesmo pai.
create table if not exists produtos (
  id         bigint generated always as identity primary key,
  nome       text not null,
  cor        text default '#0A5C8E',
  icone      text default 'SIAFW',
  parent_id  bigint references produtos(id) on delete cascade,
  created_at timestamptz default now(),
  constraint ck_produtos_nao_pai_de_si check (parent_id is null or parent_id <> id)
);
create unique index if not exists uq_produtos_pai_nome on produtos (coalesce(parent_id, 0), lower(nome));
create index if not exists idx_produtos_parent on produtos (parent_id);

create table if not exists usuario_produtos (
  id            bigint generated always as identity primary key,
  usuario_email text not null,
  produto_id    bigint not null references produtos(id) on delete cascade,
  unique (usuario_email, produto_id)
);

create table if not exists erros (
  id            bigint generated always as identity primary key,
  titulo        text not null,
  descricao     text not null,
  solucao       text default '',
  imagem        text,
  criador_email text not null,
  criador_nome  text not null,
  produto_id    bigint references produtos(id),
  created_at    timestamptz default now(),
  atualizado_em timestamptz
);

create table if not exists comentarios (
  id             bigint generated always as identity primary key,
  erro_id        bigint not null references erros(id) on delete cascade,
  usuario        text not null,
  usuario_email  text not null,
  conteudo       text not null,
  editado        boolean default false,
  editado_em     timestamptz,
  data           timestamptz default now()
);

create table if not exists reacoes (
  id            bigint generated always as identity primary key,
  erro_id       bigint not null references erros(id) on delete cascade,
  usuario_email text not null,
  tipo          text not null,
  created_at    timestamptz default now(),
  unique (erro_id, usuario_email, tipo)
);

create table if not exists chat (
  id            bigint generated always as identity primary key,
  usuario       text not null,
  usuario_email text not null,
  avatar        text,
  conteudo      text not null,
  data          timestamptz default now()
);

create table if not exists logs (
  id            bigint generated always as identity primary key,
  tipo          text not null,
  acao          text not null,
  usuario       text not null,
  usuario_email text not null,
  descricao     text not null,
  ip            text,
  created_at    timestamptz default now()
);

create index if not exists idx_comentarios_erro   on comentarios(erro_id);
create index if not exists idx_reacoes_erro        on reacoes(erro_id);
create index if not exists idx_erros_produto       on erros(produto_id);
create index if not exists idx_usuario_produtos_email on usuario_produtos(usuario_email);

-- ── Habilita Realtime nestas tabelas (chat ao vivo + notificações) ────────
-- Necessário para o frontend "escutar" INSERT/DELETE via supabase-js
alter publication supabase_realtime add table chat;
alter publication supabase_realtime add table erros;
alter publication supabase_realtime add table comentarios;

-- ── Produtos padrão ─────────────────────────────────────────────────────
insert into produtos (nome, cor, icone)
select v.nome, v.cor, v.icone
from (values
  ('SIAFW', '#0A5C8E', 'SIAFW'),
  ('SIAF Evolution', '#1a7ab8', 'siafEvolution'),
  ('GOL', '#0d1f3c', 'GOL'),
  ('AdChef', '#4f46e5', 'adchef')
) as v(nome, cor, icone)
where not exists (select 1 from produtos p where p.parent_id is null and lower(p.nome) = lower(v.nome));

-- ── Produtos padrão ─────────────────────────────────────────────────────
insert into produtos (nome, cor, icone)
select v.nome, v.cor, v.icone
from (values
  ('SIAFW', '#0A5C8E', 'SIAFW'),
  ('SIAF Evolution', '#1a7ab8', 'siafEvolution'),
  ('GOL', '#0d1f3c', 'GOL'),
  ('AdChef', '#4f46e5', 'adchef')
) as v(nome, cor, icone)
where not exists (select 1 from produtos p where p.parent_id is null and lower(p.nome) = lower(v.nome));

-- ── Usuário admin padrão (mesmo hash usado no app: sha256(salt+senha)) ────
-- Senha inicial: 4071 — troque depois de migrar.
insert into usuarios (email, nome, bio, senha, is_admin)
select 'adoglesio@adsoft.com.br', 'Adoglesio Gomes', 'Especialista em soluções técnicas | Adsoft',
       encode(gen_random_bytes(16), 'hex') || ':' ||
       encode(digest(encode(gen_random_bytes(16), 'hex') || '4071', 'sha256'), 'hex'),
       true
where not exists (select 1 from usuarios where email = 'adoglesio@adsoft.com.br');
