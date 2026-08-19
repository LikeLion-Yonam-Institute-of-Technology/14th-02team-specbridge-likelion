# SpecBridge Backend (Spring Boot)

This is a minimal Spring Boot backend scaffold created to support the SpecBridge frontend during development.

Features:
- Java 17 + Spring Boot
- Maven build
- Simple REST GET /api/health returning { "status": "ok" }
- CORS configured to allow requests from the frontend dev server (http://localhost:5173)

Run (from project root)

1) Using Maven (requires Java 17+ and Maven installed):

   cd specbridge\backend
   mvn spring-boot:run

2) Or build then run jar:

   cd specbridge\backend
   mvn package
   java -jar target\specbridge-backend-0.0.1-SNAPSHOT.jar

Default port: 8080
Health endpoint: GET http://localhost:8080/api/health  --> { "status": "ok" }

CORS: configured to allow http://localhost:5173 (the Vite dev server) so the frontend can call APIs during development.

Note: This backend is intentionally minimal. No OpenAI integration or API routes for translation/summarization are implemented in this step.