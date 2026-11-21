import type { ExemploOperacao } from "./exemplos";

/**
 * Exemplos FICTÍCIOS para o motor do Simples Nacional (endpoint não
 * assistido). As alíquotas efetivas são as do exemplo publicado no próprio
 * OpenAPI do motor 1.0.2: esta aplicação não fornece nem calcula alíquotas.
 */
export const EXEMPLOS_SIMPLES: ExemploOperacao[] = [
  {
    id: "sn-nfe-crt1",
    titulo: "NF-e, CRT 1, Anexo I (exemplo do OpenAPI)",
    descricao:
      "Exemplo publicado no OpenAPI do motor 1.0.2: revenda de mercadorias (cAtivSN 01) numa NF-e de optante pelo Simples. O motor escolhe o anexo e o par de alíquotas.",
    operacao: {
      id: "exemplo-ficticio-sn-1",
      versao: "3.0.0",
      data: "2027-03-15",
      tpDoc: "55",
      CRT: "1",
      aliquotasEfetivas: {
        fatorR: true,
        impedimentoSublimite: false,
        anexoI: { pCBSSN: "1.1612", pIBSSN: "0.0129" },
      },
      itens: [{ numero: 1, cAtivSN: "01", cClassTrib: "000001", baseCalculo: "1000.00", valorImpostoSeletivo: "0.00" }],
    },
  },
  {
    id: "sn-nfse-fator-r",
    titulo: "NFS-e, serviço com fator \"r\" (Anexo III)",
    descricao:
      "Serviço de consultoria em engenharia (NBS 114031000) com atividade 09 e fator \"r\" igual ou acima de 28%. Alíquotas do exemplo de NFS-e do OpenAPI do motor.",
    operacao: {
      id: "exemplo-ficticio-sn-2",
      versao: "3.0.0",
      data: "2027-03-15",
      tpDoc: "91",
      opSimpNac: "3",
      regApIBSCBSSN: "1",
      regApTribSN: "1",
      aliquotasEfetivas: {
        fatorR: true,
        impedimentoSublimite: false,
        anexoIII: { pCBSSN: "2.3874", pIBSSN: "0.0263", semRedistribuicaoISS: { pCBSSN: "2.3591", pIBSSN: "0.0260" } },
      },
      itens: [
        { numero: 1, cAtivSN: "09", cClassTrib: "000001", nbs: "114031000", baseCalculo: "10000.00", tribISSQN: "1", tpRetISSQN: "1" },
      ],
    },
  },
  {
    id: "sn-nfse-openapi",
    titulo: "NFS-e do OpenAPI (erro VSN-050)",
    descricao:
      "O exemplo de NFS-e exatamente como o OpenAPI do motor 1.0.2 publica. Na base V0073 a NBS 114051000 não existe, e o motor devolve o erro VSN-050 no item, sem derrubar a operação.",
    operacao: {
      id: "op-1",
      versao: "3.0.0",
      data: "2027-03-15",
      tpDoc: "91",
      opSimpNac: "3",
      regApIBSCBSSN: "1",
      regApTribSN: "1",
      aliquotasEfetivas: {
        fatorR: false,
        impedimentoSublimite: false,
        anexoIII: { pCBSSN: "2.3874", pIBSSN: "0.0263", semRedistribuicaoISS: { pCBSSN: "2.3591", pIBSSN: "0.0260" } },
      },
      itens: [
        { numero: 1, cAtivSN: "12", cClassTrib: "000001", nbs: "114051000", baseCalculo: "10000.00", tribISSQN: "1", tpRetISSQN: "1", tpBM: "1" },
      ],
    },
  },
];
