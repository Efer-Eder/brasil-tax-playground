# Imagem de execução do app (build standalone do Next.js feito antes,
# com NEXT_BASE_PATH definido). Não compila nada no servidor.
FROM node:24-alpine

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS=--max-old-space-size=160

WORKDIR /app
COPY --chown=node:node standalone/ /app/
USER node

EXPOSE 3000
CMD ["node", "server.js"]
