/**
 * XML FICTÍCIO de NFS-e para experimentar o gerador oficial de DANFSe.
 *
 * Montado a partir do modelo que o próprio gerador lê
 * (internal/domain/models/models.go no upstream 1.0.0): CNPJ e CPF zerados,
 * ambiente de homologação (tpAmb 2) e nenhum valor de tributo. Não é uma nota
 * real e não tem valor fiscal.
 */
export const XML_NFSE_EXEMPLO = `<?xml version="1.0" encoding="UTF-8"?>
<NFSe versao="1.01" xmlns="http://www.sped.fazenda.gov.br/nfse">
  <infNFSe Id="NFS00000000000000000000000000000000000000000000000001">
    <xLocEmi>Porto Alegre</xLocEmi>
    <xLocPrestacao>Porto Alegre</xLocPrestacao>
    <nNFSe>1</nNFSe>
    <cLocIncid>4314902</cLocIncid>
    <xLocIncid>Porto Alegre</xLocIncid>
    <xTribNac>Exemplo fictício de serviço</xTribNac>
    <ambGer>2</ambGer>
    <dhProc>2027-03-15T10:00:00-03:00</dhProc>
    <emit>
      <CNPJ>00000000000000</CNPJ>
      <xNome>EMPRESA FICTICIA DE EXEMPLO</xNome>
      <enderNac>
        <xLgr>Rua de Exemplo</xLgr><nro>1</nro><xBairro>Centro</xBairro>
        <cMun>4314902</cMun><UF>RS</UF><CEP>90000000</CEP>
      </enderNac>
    </emit>
    <valores>
      <vLiq>1000.00</vLiq>
    </valores>
    <DPS versao="1.01">
      <infDPS Id="DPS000000000000000000000000000000000000001">
        <tpAmb>2</tpAmb>
        <dhEmi>2027-03-15T10:00:00-03:00</dhEmi>
        <serie>1</serie>
        <nDPS>1</nDPS>
        <dCompet>2027-03-15</dCompet>
        <tpEmit>1</tpEmit>
        <cLocEmi>4314902</cLocEmi>
        <prest><CNPJ>00000000000000</CNPJ><regTrib><opSimpNac>3</opSimpNac><regApTribSN>1</regApTribSN><regEspTrib>0</regEspTrib></regTrib></prest>
        <toma><CPF>00000000000</CPF><xNome>TOMADOR FICTICIO DE EXEMPLO</xNome></toma>
        <serv>
          <locPrest><cLocPrestacao>4314902</cLocPrestacao></locPrest>
          <cServ><cTribNac>010101</cTribNac><xDescServ>Serviço fictício para demonstração do DANFSe</xDescServ></cServ>
        </serv>
        <valores>
          <vServPrest><vServ>1000.00</vServ></vServPrest>
        </valores>
      </infDPS>
    </DPS>
  </infNFSe>
</NFSe>
`;
