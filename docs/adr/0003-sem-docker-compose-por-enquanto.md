# ADR 0003 — Sem Docker Compose por enquanto

- Data: 2026-11-20
- Status: Substituído em parte pelo [ADR 0005](0005-instancia-publica-em-efer-online.md) (Compose de execução para a instância pública)

## Contexto

A especificação pede Docker Compose para subir app e motores "quando tecnicamente possível, respeitando suas documentações". No commit consultado (`f1eebd7`, tag 1.7.2), o repositório do regime regular **não tem Dockerfile** e o README documenta apenas execução com Maven/Java. Docker também não está instalado na máquina de desenvolvimento, então nada poderia ser testado.

## Decisão

Não incluir `docker-compose.yml` agora. Escrever um Dockerfile próprio para o motor seria inventar um procedimento de build não documentado pelo upstream.

## Próximo passo

Reavaliar se: (a) o upstream publicar Dockerfile/imagem, ou (b) Docker estiver disponível para testar um Compose que só execute os comandos documentados no README (gerar banco com Flyway e rodar o JAR). Em qualquer caso, marcar como "não testado" até rodar de verdade.
