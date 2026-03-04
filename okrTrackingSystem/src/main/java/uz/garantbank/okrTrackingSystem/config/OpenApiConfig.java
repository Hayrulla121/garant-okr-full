package uz.garantbank.okrTrackingSystem.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI okrTrackingOpenAPI() {
        final String securitySchemeName = "Bearer Authentication";

        return new OpenAPI()
                .info(new Info()
                        .title("OKR Tracking System API")
                        .description("""
                                ## OKR Tracking System — Garant Bank

                                REST API for managing **Objectives & Key Results (OKR)**, organizational structure, \
                                user management, and multi-source performance evaluations.

                                ### Key Features
                                - **OKR Management** — Create and track Objectives with weighted Key Results
                                - **Multi-Source Evaluations** — Director (star rating), HR (letter grade), and Business Block assessments
                                - **Score Calculation** — Automatic weighted scoring: 60% OKR + 20% Director + 20% HR
                                - **Organizational Hierarchy** — Divisions → Departments → Objectives → Key Results
                                - **Role-Based Access Control** — 6 roles with fine-grained permissions
                                - **Excel Export** — Export all OKR data to Excel spreadsheets

                                ### Authentication
                                All endpoints (except login and export) require a **JWT Bearer token**.
                                1. Call `POST /api/auth/login` with your credentials
                                2. Copy the `token` from the response
                                3. Click the **Authorize** button above and enter the token

                                ### Roles
                                | Role | Description |
                                |------|-------------|
                                | `ADMIN` | Full system access, user management |
                                | `DIRECTOR` | Division oversight, star-based evaluations |
                                | `DEPARTMENT_LEADER` | Department OKR management |
                                | `HR` | Letter-grade evaluations (A/B/C/D) |
                                | `BUSINESS_BLOCK` | Business block star-based evaluations |
                                | `EMPLOYEE` | View own profile and assigned departments |
                                """)
                        .version("1.0.0"))
                .externalDocs(new ExternalDocumentation()
                        .description("OKR Tracking System Documentation")
                        .url("https://garantbank.uz/docs/okr"))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Development Server")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Enter the JWT token obtained from `POST /api/auth/login`")))
                .tags(List.of(
                        new Tag().name("Authentication")
                                .description("Login, registration, and current user operations. " +
                                        "Use `POST /api/auth/login` to obtain a JWT token."),
                        new Tag().name("Departments")
                                .description("Department CRUD operations. Departments belong to Divisions " +
                                        "and contain Objectives."),
                        new Tag().name("Objectives")
                                .description("Objective management within departments. " +
                                        "Each objective has a weight (0-100%) and contains Key Results."),
                        new Tag().name("Key Results")
                                .description("Key Result management within objectives. Supports HIGHER_BETTER, " +
                                        "LOWER_BETTER, and QUALITATIVE metric types with configurable thresholds."),
                        new Tag().name("Evaluations")
                                .description("Multi-source performance evaluations. Director (1-5 stars → 4.25-5.0), " +
                                        "HR (A/B/C/D letter grades → 5.0/4.75/4.5/4.25), and Business Block assessments."),
                        new Tag().name("Divisions")
                                .description("Division CRUD operations. Divisions are the top-level " +
                                        "organizational unit containing Departments."),
                        new Tag().name("Users")
                                .description("User management including creation, profile updates, " +
                                        "department assignments, photo uploads, and score overview."),
                        new Tag().name("Score Levels")
                                .description("Score level configuration for the scoring system. " +
                                        "Defines levels: Не соответствует (0-0.3), Ниже ожиданий (0.31-0.50), На уровне ожиданий (0.51-0.85), Превышает ожидания (0.86-0.97), Исключительно (0.98-1.0)."),
                        new Tag().name("Export")
                                .description("Data export operations. Currently supports Excel (.xlsx) export of all OKR data."),
                        new Tag().name("Demo Data")
                                .description("Load sample/demo data for testing purposes. Admin only.")
                ));
    }
}
