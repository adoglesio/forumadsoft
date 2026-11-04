import { useMemo } from "react";
import { construirArvore, opcoesPlanas } from "../utils/grupos";

/**
 * Lista suspensa com todos os grupos e subgrupos, já com o caminho completo
 * ("Nota fiscal › Erro no NCM › Erro no PDV") para não haver dúvida.
 */
export default function SeletorGrupo({ produtos, value, onChange, vazio = "Sem grupo", style, ...rest }) {
  const opcoes = useMemo(() => opcoesPlanas(construirArvore(produtos).raizes), [produtos]);
  return (
    <select
      className="select"
      value={value == null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      {...rest}
    >
      <option value="">{vazio}</option>
      {opcoes.map((o) => (
        <option key={o.id} value={o.id}>{o.rotulo}</option>
      ))}
    </select>
  );
}
