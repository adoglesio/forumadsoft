-- ════════════════════════════════════════════════════════════════════════
--  OPCIONAL — cria a árvore de exemplo pedida:
--
--    Nota fiscal › Erro no NCM › Erro no PDV
--    Nota fiscal de entrada › Erro no XML › erro ao gravar
--    Windows › Erro na emissão
--
--  Rode DEPOIS de migracao-base-de-erros.sql. Pode rodar mais de uma vez:
--  o que já existe é reaproveitado, nada é duplicado.
--  (Você também pode criar tudo pela tela: Base de erros → Novo grupo.)
-- ════════════════════════════════════════════════════════════════════════

create or replace function pg_temp.grupo(p_nome text, p_pai bigint, p_cor text)
returns bigint language plpgsql as $$
declare v_id bigint;
begin
  select id into v_id from produtos
   where lower(nome) = lower(p_nome) and coalesce(parent_id, 0) = coalesce(p_pai, 0);
  if v_id is null then
    insert into produtos (nome, cor, icone, parent_id)
    values (p_nome, p_cor, '📦', p_pai) returning id into v_id;
  end if;
  return v_id;
end $$;

do $$
declare
  nf   bigint; ncm bigint;
  nfe  bigint; xml bigint;
  win  bigint;
begin
  nf  := pg_temp.grupo('Nota fiscal',          null, '#0A5C8E');
  ncm := pg_temp.grupo('Erro no NCM',          nf,   '#0A5C8E');
  perform pg_temp.grupo('Erro no PDV',         ncm,  '#0A5C8E');

  nfe := pg_temp.grupo('Nota fiscal de entrada', null, '#C26B2E');
  xml := pg_temp.grupo('Erro no XML',            nfe,  '#C26B2E');
  perform pg_temp.grupo('erro ao gravar',        xml,  '#C26B2E');

  win := pg_temp.grupo('Windows',              null, '#4f46e5');
  perform pg_temp.grupo('Erro na emissão',     win,  '#4f46e5');
end $$;
