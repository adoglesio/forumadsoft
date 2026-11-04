-- ════════════════════════════════════════════════════════════════════════
--  BASE DE ERROS EM ÁRVORE  (grupo › subgrupo › subgrupo ...)
--
--  Rode UMA vez no Supabase: SQL Editor → New query → colar → Run.
--  É seguro rodar de novo (não duplica nada) e NÃO apaga dados:
--  os produtos atuais viram grupos principais e os erros já vinculados
--  continuam vinculados.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- 1) Cada grupo pode ter um "pai". Sem pai = grupo principal.
--    Se um grupo for excluído, seus subgrupos vão junto (o backend só deixa
--    excluir quando não há nenhum erro vinculado na árvore).
alter table produtos
  add column if not exists parent_id bigint references produtos(id) on delete cascade;

-- 2) O nome deixa de ser único no banco inteiro e passa a ser único
--    dentro do mesmo pai. Assim "Erro no PDV" pode existir em grupos diferentes.
alter table produtos drop constraint if exists produtos_nome_key;

create unique index if not exists uq_produtos_pai_nome
  on produtos (coalesce(parent_id, 0), lower(nome));

create index if not exists idx_produtos_parent on produtos (parent_id);

-- 3) Um grupo não pode ser pai dele mesmo.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_produtos_nao_pai_de_si') then
    alter table produtos
      add constraint ck_produtos_nao_pai_de_si check (parent_id is null or parent_id <> id);
  end if;
end $$;

commit;
