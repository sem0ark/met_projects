FROM maven:3-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B # Downloads all project dependencies

COPY src ./src
RUN mvn clean package -DskipTests

ENTRYPOINT ["java", "-jar", "target/app.jar"]
