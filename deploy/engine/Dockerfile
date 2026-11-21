# Imagem de EXECUÇÃO do motor oficial calculadora-rtc-regime-regular.
#
# Este Dockerfile é nosso (o upstream não publica um). Ele não compila nada:
# recebe o JAR e o banco SQLite gerados exatamente pelos passos do README
# oficial (mvnw flyway:migrate + mvnw clean package) e só os executa com o
# perfil offline, como o README manda (`java -Dspring.profiles.active=offline
# -jar target/api-regime-geral.jar`, a partir da pasta que contém ./calculadora/db).
FROM eclipse-temurin:25-jre

RUN groupadd --system rtc && useradd --system --gid rtc --home /engine rtc
WORKDIR /engine

COPY api-regime-geral.jar /engine/api-regime-geral.jar
COPY calculadora-pro.db /engine/calculadora/db/calculadora-pro.db
RUN chown -R root:rtc /engine && chmod -R a-w /engine

USER rtc

# Limites medidos (docs/deploy-efer-online.md): heap 320 MB; RSS observado
# ~440 MB sob carga. SerialGC por ser container pequeno com CPU limitada.
# -XX:-UseBASE64Intrinsics: mitigação pedida no CHANGELOG do upstream (1.7.1),
# conforme o aviso de segurança do OpenJDK de 17/11/2026.
ENV JAVA_OPTS="-Xms128m -Xmx320m -XX:MaxMetaspaceSize=160m -XX:ReservedCodeCacheSize=64m -Xss512k -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -XX:-UseBASE64Intrinsics"

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dspring.profiles.active=offline -jar /engine/api-regime-geral.jar"]
