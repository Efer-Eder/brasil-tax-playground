/**
 * Exemplos de operação para o editor. São FICTÍCIOS: servem para exercitar o
 * fluxo e mostrar como o motor responde, não para representar uma operação
 * real. Nenhum contém alíquotas — em 2026 o upstream proíbe `aliquotasNominais`
 * e usa as alíquotas de referência da própria base.
 *
 * Os códigos NCM/CST/cClassTrib usados aparecem nos exemplos e testes do
 * repositório oficial (calculadora-rtc-regime-regular 1.7.2).
 */
export interface ExemploOperacao {
  id: string;
  titulo: string;
  descricao: string;
  operacao: unknown;
}

const base = {
  versao: "1.0.0",
  dhFatoGerador: "2026-06-01T10:00:00-03:00",
  municipio: 4314902,
  uf: "RS",
};

export const EXEMPLOS: ExemploOperacao[] = [
  {
    id: "item-unico-2026",
    titulo: "Item único (2026)",
    descricao: "Um item com NCM, CST 000 e cClassTrib 000001. O motor calcula com as alíquotas de referência da base dele.",
    operacao: {
      id: "exemplo-ficticio-1",
      ...base,
      itens: [{ numero: 1, ncm: "22030000", cst: "000", cClassTrib: "000001", baseCalculo: 100.0 }],
    },
  },
  {
    id: "erro-por-item-2026",
    titulo: "Erro em um dos itens (2026)",
    descricao:
      "Dois itens; o segundo usa uma cClassTrib inexistente. A observabilidade calcula o primeiro e devolve o erro do segundo.",
    operacao: {
      id: "exemplo-ficticio-2",
      ...base,
      itens: [
        { numero: 1, ncm: "22030000", cst: "000", cClassTrib: "000001", baseCalculo: 100.0 },
        { numero: 2, ncm: "22030000", cst: "000", cClassTrib: "999999", baseCalculo: 50.0 },
      ],
    },
  },
  {
    id: "invalido-estrutural",
    titulo: "Entrada inválida",
    descricao: "CST com letras e sem itens válidos: a validação estrutural barra antes de chamar o motor.",
    operacao: {
      id: "exemplo-ficticio-3",
      ...base,
      itens: [{ numero: 1, ncm: "22030000", cst: "0A0", cClassTrib: "1", baseCalculo: -1 }],
    },
  },
];
