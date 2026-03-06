# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY .mvn .mvn
RUN mvn dependency:resolve -B || true
COPY src ./src
RUN mvn package -DskipTests -B
RUN mv target/okrTrackingSystem-*.jar target/app.jar

# Stage 2: Run
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/target/app.jar app.jar
RUN mkdir -p /app/data /app/uploads /app/logs && \
    chown -R appuser:appgroup /app

VOLUME ["/app/data", "/app/uploads", "/app/logs"]

USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
