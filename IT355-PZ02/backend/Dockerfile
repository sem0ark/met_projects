FROM maven:3-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .

# Downloads all project dependencies to reuse later
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests

ENTRYPOINT ["java", "-jar", "target/app.jar"]
