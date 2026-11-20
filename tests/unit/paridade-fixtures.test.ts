import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultadoSucesso } from "@/components/resultado-simulacao";
import { extrairMemoriaCalculo } from "@/lib/simulation/memoria";
import { carregarFixtures, type FixtureRegimeRegular } from "../fixtures/regime-regular";

/**
 * Paridade "resposta do motor × tela": renderiza o resultado a partir de cada
 * fixture GRAVADA do motor real e confere que a tela mostra o que o motor
 * devolveu — e nenhum número que não esteja na resposta.
 */
const fixtures = carregarFixtures();

function renderizar(fixture: FixtureRegimeRegular) {
  const html = renderToStaticMarkup(
    createElement(ResultadoSucesso, {
      resultado: {
        ok: true,
        httpStatus: 200,
        requisicao: fixture.requisicao,
        resposta: fixture.resposta,
        warningDadosSimulados: fixture.warningDadosSimulados,
        motor: { baseUrl: "http://motor.local/api", versao: fixture.motor.versao },
        executadoEm: fixture.gravadoEm,
      },
    }),
  );
  return decodificar(html);
}

/** Converte o HTML em texto, decodificando as entidades usadas pelo React. */
function decodificar(html: string) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Parte "legível" da tela: tudo, exceto os blocos <pre> com o JSON cru. */
function resumoSemJson(html: string) {
  return html.replace(/<pre[\s\S]*?<\/pre>/g, "").replace(/<[^>]+>/g, " ");
}

describe("paridade: fixtures reais × tela de resultado", () => {
  it("há pelo menos três cenários gravados do motor real", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(3);
    for (const f of fixtures) expect(f.motor.versao.versaoApp).toBeTruthy();
  });

  for (const fixture of fixtures) {
    describe(fixture.exemploId, () => {
      const html = renderizar(fixture);
      const resumo = resumoSemJson(html);

      it("mostra a versão do motor que produziu a resposta", () => {
        expect(resumo).toContain(fixture.motor.versao.versaoApp!);
        expect(resumo).toContain(fixture.motor.versao.versaoDb!);
      });

      it("mostra cada item com o estado devolvido pelo motor", () => {
        for (const objeto of fixture.resposta.objetos) {
          expect(resumo).toContain(`Item ${objeto.nObj}`);
          expect(resumo).toContain(objeto.estadoItem);
        }
      });

      it("mostra os erros do motor literalmente", () => {
        for (const objeto of fixture.resposta.objetos) {
          const erros = (objeto as { erros?: Record<string, string>[] }).erros ?? [];
          for (const erro of erros) {
            for (const campo of ["code", "title", "detail", "pointer"]) {
              if (erro[campo]) expect(resumo).toContain(erro[campo]);
            }
          }
        }
      });

      it("mostra a memória de cálculo literalmente", () => {
        for (const objeto of fixture.resposta.objetos) {
          for (const trecho of extrairMemoriaCalculo(objeto)) {
            expect(resumo).toContain(trecho.texto);
          }
        }
      });

      it("mostra o aviso de dados simulados somente se o motor enviou", () => {
        expect(resumo.includes("x-warning-dados-simulados")).toBe(fixture.warningDadosSimulados !== null);
      });

      it("não exibe nenhum valor decimal que não esteja na resposta do motor", () => {
        const respostaTexto = JSON.stringify(fixture);
        const valores = resumo.match(/\d[\d.]*,\d+|\d+\.\d+/g) ?? [];
        // Todos os cenários gravados têm ao menos um item calculado com memória.
        expect(valores.length).toBeGreaterThan(0);
        for (const valor of valores) {
          expect(respostaTexto, `valor "${valor}" não veio do motor`).toContain(valor);
        }
      });

      it("inclui a resposta crua completa no inspetor", () => {
        expect(html).toContain(JSON.stringify(fixture.resposta, null, 2));
      });
    });
  }
});
