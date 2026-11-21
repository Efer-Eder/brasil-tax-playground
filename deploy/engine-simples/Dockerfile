# Imagem de EXECUÇÃO do motor oficial calculadora-rtc-simples-nacional.
#
# Mesmo padrão de deploy/engine: o Dockerfile é nosso e não compila nada.
# Recebe o JAR e o banco SQLite gerados pelos passos do README oficial (o banco
# vem dos scripts flyway do calculadora-rtc-regime-regular, como o README manda)
# e executa com o perfil offline a partir da pasta que contém ./calculadora/db.
FROM eclipse-temurin:25-jre

RUN groupadd --system rtc && useradd --system --gid rtc --home /engine rtc
WORKDIR /engine

COPY api-simples-nacional.jar /engine/api-simples-nacional.jar
COPY calculadora-pro.db /engine/calculadora/db/calculadora-pro.db
RUN chown -R root:rtc /engine && chmod -R a-w /engine

USER rtc

# Mesmos limites do motor do regime regular (docs/deploy-efer-online.md).
# -XX:-UseBASE64Intrinsics: mitigação pedida no CHANGELOG do upstream (1.0.1),
# conforme o aviso de segurança do OpenJDK de 17/11/2026.
ENV JAVA_OPTS="-Xms96m -Xmx256m -XX:MaxMetaspaceSize=160m -XX:ReservedCodeCacheSize=64m -Xss512k -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -XX:-UseBASE64Intrinsics"

EXPOSE 8082
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dspring.profiles.active=offline -jar /engine/api-simples-nacional.jar"]
