# Architecture Documentation - OKR Tracking System

## Overview

This document provides a comprehensive technical architecture overview of the OKR (Objectives and Key Results) Tracking System built for Garant Bank.

**Project:** okrTrackingSystem
**Organization:** uz.garantbank
**Version:** 0.0.1-SNAPSHOT
**Java Version:** 17
**Spring Boot Version:** 4.1.0-M1
**Default Port:** 8080

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Project Structure](#2-project-structure)
3. [Database Layer](#3-database-layer)
4. [Entity Model](#4-entity-model)
5. [Data Transfer Objects](#5-data-transfer-objects)
6. [Repository Layer](#6-repository-layer)
7. [Service Layer](#7-service-layer)
8. [Controller Layer](#8-controller-layer)
9. [Security Architecture](#9-security-architecture)
10. [Score Calculation Engine](#10-score-calculation-engine)
11. [File Storage](#11-file-storage)
12. [Exception Handling](#12-exception-handling)
13. [Configuration](#13-configuration)
14. [Dependencies](#14-dependencies)
15. [Deployment](#15-deployment)

---

## 1. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React/Vue)                      │
│                   localhost:3000 / localhost:5173                │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP/REST + JWT
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Spring Boot Application                      │
│                        localhost:8080                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Security Layer                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │  │
│  │  │ JWT Filter  │→ │ Auth Manager │→ │ Security Config │   │  │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Controller Layer                         │  │
│  │  ┌────────┐ ┌──────┐ ┌────────────┐ ┌──────────────────┐  │  │
│  │  │  Auth  │ │ User │ │    OKR     │ │    Evaluation    │  │  │
│  │  └────────┘ └──────┘ └────────────┘ └──────────────────┘  │  │
│  │  ┌────────────────┐  ┌────────────────────────────────┐   │  │
│  │  │   Division     │  │         Score Level            │   │  │
│  │  └────────────────┘  └────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Service Layer                           │  │
│  │  ┌────────────┐ ┌──────────────┐ ┌────────────────────┐   │  │
│  │  │ UserService│ │  OkrService  │ │ EvaluationService  │   │  │
│  │  └────────────┘ └──────────────┘ └────────────────────┘   │  │
│  │  ┌────────────────────────┐ ┌─────────────────────────┐   │  │
│  │  │ ScoreCalculationService│ │    DivisionService      │   │  │
│  │  └────────────────────────┘ └─────────────────────────┘   │  │
│  │  ┌────────────────────────┐ ┌─────────────────────────┐   │  │
│  │  │  FileUploadService     │ │   ScoreLevelService     │   │  │
│  │  └────────────────────────┘ └─────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Repository Layer                         │  │
│  │  ┌──────┐ ┌────────────┐ ┌───────────┐ ┌───────────────┐  │  │
│  │  │ User │ │ Department │ │ Objective │ │   KeyResult   │  │  │
│  │  └──────┘ └────────────┘ └───────────┘ └───────────────┘  │  │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────────────┐    │  │
│  │  │ Evaluation │ │  Division  │ │     ScoreLevel      │    │  │
│  │  └────────────┘ └────────────┘ └─────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  │ JPA/Hibernate
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      H2 Database                                 │
│                  jdbc:h2:file:./data/okrdb                       │
└─────────────────────────────────────────────────────────────────┘
```

### Design Patterns Used

- **Layered Architecture**: Controller → Service → Repository
- **DTO Pattern**: Separation of entity and transfer objects
- **Repository Pattern**: Data access abstraction via Spring Data JPA
- **Dependency Injection**: Spring IoC container
- **Filter Chain Pattern**: Security filters for JWT authentication
- **Strategy Pattern**: Score calculation for different metric types

---

## 2. Project Structure

```
src/main/java/uz/garantbank/okrTrackingSystem/
├── OkrTrackingSystemApplication.java    # Main entry point
├── config/                              # Configuration classes
│   ├── SecurityConfig.java              # Spring Security configuration
│   ├── WebConfig.java                   # CORS configuration
│   ├── WebMvcConfig.java                # Static resource serving
│   └── DataInitializer.java             # Default data initialization
├── controller/                          # REST API endpoints
│   ├── AuthController.java              # Authentication endpoints
│   ├── UserManagementController.java    # User management endpoints
│   ├── OkrController.java               # OKR CRUD endpoints
│   ├── DivisionController.java          # Division management
│   ├── EvaluationController.java        # Evaluation endpoints
│   └── ScoreLevelController.java        # Score level configuration
├── dto/                                 # Data Transfer Objects
│   ├── request/                         # Request DTOs
│   │   ├── LoginRequest.java
│   │   ├── RegisterRequest.java
│   │   ├── CreateUserRequest.java
│   │   ├── UpdateUserRequest.java
│   │   ├── CreateDivisionRequest.java
│   │   ├── UpdateDivisionRequest.java
│   │   ├── EvaluationCreateRequest.java
│   │   └── AssignDepartmentsRequest.java
│   ├── response/                        # Response DTOs
│   │   ├── LoginResponse.java
│   │   ├── ErrorResponse.java
│   │   └── ScoreResult.java
│   ├── UserDTO.java
│   ├── UserWithScoreDTO.java
│   ├── UserProfileDTO.java
│   ├── DepartmentDTO.java
│   ├── DepartmentSummaryDTO.java
│   ├── DepartmentScoreResult.java
│   ├── DivisionDTO.java
│   ├── DivisionSummaryDTO.java
│   ├── DivisionScoreResult.java
│   ├── ObjectiveDTO.java
│   ├── KeyResultDTO.java
│   ├── ThresholdDTO.java
│   ├── EvaluationDTO.java
│   └── ScoreLevelDTO.java
├── entity/                              # JPA Entities
│   ├── User.java
│   ├── Department.java
│   ├── Division.java
│   ├── Objective.java
│   ├── KeyResult.java
│   ├── Evaluation.java
│   └── ScoreLevel.java
├── enums/                               # Enumeration types
│   ├── Role.java
│   ├── EvaluatorType.java
│   ├── EvaluationStatus.java
│   └── ObjectiveLevel.java
├── repository/                          # Data access layer
│   ├── UserRepository.java
│   ├── DepartmentRepository.java
│   ├── DivisionRepository.java
│   ├── ObjectiveRepository.java
│   ├── KeyResultRepository.java
│   ├── EvaluationRepository.java
│   └── ScoreLevelRepository.java
├── service/                             # Business logic layer
│   ├── UserService.java
│   ├── OkrService.java
│   ├── DivisionService.java
│   ├── EvaluationService.java
│   ├── ScoreCalculationService.java
│   ├── ScoreLevelService.java
│   ├── FileUploadService.java
│   ├── DepartmentAccessService.java
│   └── DivisionAccessService.java
├── security/                            # Security components
│   ├── JwtTokenProvider.java
│   ├── JwtAuthenticationFilter.java
│   ├── UserDetailsImpl.java
│   └── UserDetailsServiceImpl.java
└── exception/                           # Exception handling
    ├── GlobalExceptionHandler.java
    └── ErrorResponse.java
```

---

## 3. Database Layer

### Database Configuration

**Database:** H2 (Embedded/File-based)

```properties
spring.datasource.url=jdbc:h2:file:./data/okrdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
```

### JPA/Hibernate Configuration

```properties
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect
spring.jpa.properties.hibernate.default_batch_fetch_size=20
```

### Database Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) NOT NULL,
    profile_photo_url VARCHAR(500),
    job_title VARCHAR(100),
    phone_number VARCHAR(20),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    can_edit_assigned_departments BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Divisions table
CREATE TABLE divisions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    division_leader_id UUID REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Departments table
CREATE TABLE departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    division_id VARCHAR(36) NOT NULL REFERENCES divisions(id),
    department_leader_id UUID REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- User-Department association table
CREATE TABLE user_departments (
    user_id UUID REFERENCES users(id),
    department_id VARCHAR(36) REFERENCES departments(id),
    PRIMARY KEY (user_id, department_id)
);

-- Objectives table
CREATE TABLE objectives (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    weight DOUBLE NOT NULL,
    level VARCHAR(20),
    department_id VARCHAR(36) REFERENCES departments(id),
    employee_id UUID REFERENCES users(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Key Results table
CREATE TABLE key_results (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    metric_type VARCHAR(20) NOT NULL,
    unit VARCHAR(50),
    weight DOUBLE NOT NULL,
    actual_value VARCHAR(50),
    threshold_below DOUBLE,
    threshold_meets DOUBLE,
    threshold_good DOUBLE,
    threshold_very_good DOUBLE,
    threshold_exceptional DOUBLE,
    objective_id VARCHAR(36) REFERENCES objectives(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Evaluations table
CREATE TABLE evaluations (
    id UUID PRIMARY KEY,
    evaluator_id UUID REFERENCES users(id),
    evaluator_type VARCHAR(20) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    numeric_rating DOUBLE,
    letter_rating VARCHAR(1),
    comment TEXT,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Score Levels table
CREATE TABLE score_levels (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    score_value DOUBLE NOT NULL,
    color VARCHAR(7) NOT NULL,
    display_order INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT FALSE
);
```

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    User     │◄──────│ user_departments │───────►│ Department  │
│             │  M:N  └─────────────────┘   M:N  │             │
│  - id       │                                   │  - id       │
│  - username │       ┌─────────────────────────►│  - name     │
│  - email    │       │                    1:N   │  - divisionId│
│  - password │       │                          └──────┬──────┘
│  - role     │       │                                 │
└──────┬──────┘       │                                 │ 1:N
       │              │                                 ▼
       │ 1:1          │                          ┌─────────────┐
       │              │                          │  Objective  │
       ▼              │                          │             │
┌─────────────┐       │                          │  - id       │
│  Division   │───────┘                          │  - name     │
│             │  1:N                             │  - weight   │
│  - id       │                                  │  - level    │
│  - name     │                                  └──────┬──────┘
│  - leaderId │                                         │
└─────────────┘                                         │ 1:N
                                                        ▼
┌─────────────┐                                  ┌─────────────┐
│ Evaluation  │                                  │  KeyResult  │
│             │                                  │             │
│  - id       │                                  │  - id       │
│  - evaluator│                                  │  - name     │
│  - target   │                                  │  - weight   │
│  - rating   │                                  │  - thresholds│
│  - status   │                                  │  - actualValue│
└─────────────┘                                  └─────────────┘

┌─────────────┐
│ ScoreLevel  │
│             │
│  - id       │
│  - name     │
│  - scoreValue│
│  - color    │
└─────────────┘
```

---

## 4. Entity Model

### User Entity

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;  // BCrypt hashed

    private String fullName;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String profilePhotoUrl;
    private String jobTitle;
    private String phoneNumber;
    private String bio;
    private Boolean isActive = true;
    private Boolean canEditAssignedDepartments = false;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @ManyToMany
    @JoinTable(name = "user_departments",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "department_id"))
    private Set<Department> assignedDepartments;
}
```

### Division Entity

```java
@Entity
@Table(name = "divisions")
public class Division {
    @Id
    private String id;  // UUID as String

    @Column(nullable = false)
    private String name;

    @ManyToOne
    @JoinColumn(name = "division_leader_id")
    private User divisionLeader;

    @OneToMany(mappedBy = "division", cascade = CascadeType.ALL)
    private List<Department> departments;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID().toString();
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
}
```

### Department Entity

```java
@Entity
@Table(name = "departments")
public class Department {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(optional = false)
    @JoinColumn(name = "division_id")
    private Division division;

    @ManyToOne
    @JoinColumn(name = "department_leader_id")
    private User departmentLeader;

    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Objective> objectives;

    @ManyToMany(mappedBy = "assignedDepartments")
    private Set<User> assignedUsers;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

### Objective Entity

```java
@Entity
@Table(name = "objectives")
public class Objective {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double weight;  // 0-100%

    @Enumerated(EnumType.STRING)
    private ObjectiveLevel level;  // DEPARTMENT or INDIVIDUAL

    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;

    @ManyToOne
    @JoinColumn(name = "employee_id")
    private User employee;

    @OneToMany(mappedBy = "objective", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<KeyResult> keyResults;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

### KeyResult Entity

```java
@Entity
@Table(name = "key_results")
public class KeyResult {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MetricType metricType;  // HIGHER_BETTER, LOWER_BETTER, QUALITATIVE

    private String unit;

    @Column(nullable = false)
    private Double weight;  // 0-100%

    private String actualValue;

    // Threshold values for scoring
    private Double thresholdBelow;
    private Double thresholdMeets;
    private Double thresholdGood;
    private Double thresholdVeryGood;
    private Double thresholdExceptional;

    @ManyToOne
    @JoinColumn(name = "objective_id")
    private Objective objective;

    public enum MetricType {
        HIGHER_BETTER,
        LOWER_BETTER,
        QUALITATIVE
    }
}
```

### Evaluation Entity

```java
@Entity
@Table(name = "evaluations")
public class Evaluation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "evaluator_id")
    private User evaluator;

    @Enumerated(EnumType.STRING)
    private EvaluatorType evaluatorType;  // DIRECTOR, HR, BUSINESS_BLOCK

    @Enumerated(EnumType.STRING)
    private TargetType targetType;  // DEPARTMENT, EMPLOYEE

    private UUID targetId;

    private Double numericRating;  // For stars (converted to 4.25-5.0)
    private String letterRating;   // For HR: A, B, C, D
    private String comment;

    @Enumerated(EnumType.STRING)
    private EvaluationStatus status;  // DRAFT, SUBMITTED

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

### ScoreLevel Entity

```java
@Entity
@Table(name = "score_levels")
public class ScoreLevel {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;  // "Below", "Meets", "Good", etc.

    @Column(nullable = false)
    private Double scoreValue;  // 0.0, 0.25, 0.50, 0.75, 1.0

    @Column(nullable = false)
    private String color;  // Hex color code

    @Column(nullable = false)
    private Integer displayOrder;  // 0-4

    private Boolean isDefault = false;
}
```

### Enumerations

```java
public enum Role {
    EMPLOYEE,
    DEPARTMENT_LEADER,
    HR,
    DIRECTOR,
    BUSINESS_BLOCK,
    ADMIN
}

public enum EvaluatorType {
    DIRECTOR,      // 1-5 stars → 4.25-5.0, 20% weight
    HR,            // A-D letters → numeric, 20% weight
    BUSINESS_BLOCK // 1-5 stars, separate display
}

public enum EvaluationStatus {
    DRAFT,     // Can be edited
    SUBMITTED, // Locked, included in calculations
    APPROVED   // Optional final state
}

public enum ObjectiveLevel {
    DEPARTMENT, // Belongs to department
    INDIVIDUAL  // Assigned to employee
}
```

---

## 5. Data Transfer Objects

### Core DTOs

#### UserDTO
```java
public class UserDTO {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private Role role;
    private String profilePhotoUrl;
    private String jobTitle;
    private String phoneNumber;
    private String bio;
    private Boolean isActive;
    private Boolean canEditAssignedDepartments;
    private LocalDateTime lastLogin;
    private List<DepartmentSummaryDTO> assignedDepartments;
    private LocalDateTime createdAt;
}
```

#### DepartmentScoreResult
```java
public class DepartmentScoreResult {
    // Automatic OKR Score (60%)
    private Double automaticOkrScore;
    private Double automaticOkrPercentage;

    // Director Evaluation (20%)
    private Double directorEvaluation;
    private Integer directorStars;
    private String directorComment;
    private Boolean hasDirectorEvaluation;

    // HR Evaluation (20%)
    private String hrEvaluationLetter;
    private Double hrEvaluationNumeric;
    private String hrComment;
    private Boolean hasHrEvaluation;

    // Business Block (separate display)
    private Double businessBlockEvaluation;
    private Integer businessBlockStars;
    private String businessBlockComment;
    private Boolean hasBusinessBlockEvaluation;

    // Final Combined Score
    private Double finalCombinedScore;
    private Double finalPercentage;
    private String scoreLevel;
    private String color;
}
```

#### ScoreResult
```java
public class ScoreResult {
    private Double score;      // Normalized 0.0-1.0
    private String level;      // "Below", "Meets", etc.
    private String color;      // Hex color
    private Double percentage; // 0-100%
}
```

### Request DTOs

```java
// Authentication
public class LoginRequest {
    private String username;
    private String password;
}

public class RegisterRequest {
    private String username;
    private String email;
    private String password;
    private String fullName;
    private Role role;
    private String departmentId;
}

// User Management
public class CreateUserRequest {
    private String username;
    private String email;
    private String password;
    private String fullName;
    private Role role;
    private List<String> assignedDepartmentIds;
    private String jobTitle;
    private String phoneNumber;
    private String bio;
}

public class UpdateUserRequest {
    private String fullName;
    private String email;
    private String jobTitle;
    private String phoneNumber;
    private String bio;
    private Role role;                         // ADMIN only
    private List<String> assignedDepartmentIds; // ADMIN only
    private Boolean isActive;                   // ADMIN only
    private Boolean canEditAssignedDepartments; // ADMIN only
    private String password;
}

// Evaluations
public class EvaluationCreateRequest {
    private String targetType;      // DEPARTMENT or EMPLOYEE
    private UUID targetId;
    private EvaluatorType evaluatorType;
    private Double numericRating;   // 1-5 for stars
    private Integer starRating;     // 1-5
    private String letterRating;    // A, B, C, D
    private String comment;
}

// Divisions
public class CreateDivisionRequest {
    private String name;
    private UUID leaderId;
}

public class UpdateDivisionRequest {
    private String name;
    private UUID leaderId;
}
```

### Response DTOs

```java
public class LoginResponse {
    private String token;
    private String type = "Bearer";
    private UserDTO user;
}

public class ErrorResponse {
    private String code;
    private String message;
    private LocalDateTime timestamp;
}
```

---

## 6. Repository Layer

### Repository Interfaces

```java
// UserRepository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByRole(Role role);
    List<User> findByIsActiveTrue();

    @Query("SELECT u FROM User u JOIN u.assignedDepartments d WHERE d.id = :deptId")
    List<User> findByAssignedDepartmentId(@Param("deptId") String deptId);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.assignedDepartments WHERE u.id = :id")
    Optional<User> findByIdWithDepartments(@Param("id") UUID id);

    @Query("SELECT DISTINCT u FROM User u LEFT JOIN FETCH u.assignedDepartments")
    List<User> findAllWithDepartments();
}

// DepartmentRepository
public interface DepartmentRepository extends JpaRepository<Department, String> {
    @Query("SELECT d FROM Department d LEFT JOIN FETCH d.objectives o " +
           "LEFT JOIN FETCH o.keyResults WHERE d.id = :id")
    Optional<Department> findByIdWithObjectives(@Param("id") String id);

    @Query("SELECT DISTINCT d FROM Department d LEFT JOIN FETCH d.objectives o " +
           "LEFT JOIN FETCH o.keyResults")
    List<Department> findAllWithObjectives();

    List<Department> findByDivisionId(String divisionId);

    @Query("SELECT d.id FROM Department d")
    List<String> findAllIds();

    long countByDivisionId(String divisionId);
}

// EvaluationRepository
public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {
    List<Evaluation> findByTargetTypeAndTargetId(String targetType, UUID targetId);
    List<Evaluation> findByEvaluatorId(UUID evaluatorId);

    @Query("SELECT e FROM Evaluation e WHERE e.targetType = :type " +
           "AND e.targetId = :id AND e.status = :status")
    List<Evaluation> findByTargetTypeAndTargetIdAndStatus(
        @Param("type") String type,
        @Param("id") UUID id,
        @Param("status") EvaluationStatus status);

    boolean existsByEvaluatorAndTargetTypeAndTargetIdAndEvaluatorType(
        User evaluator, String targetType, UUID targetId, EvaluatorType type);
}

// DivisionRepository
public interface DivisionRepository extends JpaRepository<Division, String> {
    @Query("SELECT d FROM Division d LEFT JOIN FETCH d.departments WHERE d.id = :id")
    Optional<Division> findByIdWithDepartments(@Param("id") String id);

    @Query("SELECT DISTINCT d FROM Division d LEFT JOIN FETCH d.departments")
    List<Division> findAllWithDepartments();

    boolean existsByName(String name);
    Optional<Division> findByDivisionLeaderId(UUID leaderId);
}

// ScoreLevelRepository
public interface ScoreLevelRepository extends JpaRepository<ScoreLevel, String> {
    List<ScoreLevel> findAllByOrderByDisplayOrderAsc();
}
```

---

## 7. Service Layer

### UserService

```java
@Service
@Transactional
public class UserService {

    public UserDTO createUser(CreateUserRequest request) {
        // Validate uniqueness
        // Hash password with BCrypt
        // Create user entity
        // Assign departments if provided
        // Save and return DTO
    }

    public UserDTO updateUser(UUID id, UpdateUserRequest request, User currentUser) {
        // Check permissions (ADMIN vs self-update)
        // Update allowed fields
        // Hash password if changed
        // Save and return DTO
    }

    public void deleteUser(UUID id, User currentUser) {
        // Prevent self-deletion
        // Check ADMIN role
        // Delete user
    }

    public List<UserWithScoreDTO> getAllUsersWithScores() {
        // Get all users
        // Calculate scores for each
        // Return enriched DTOs
    }

    public UserDTO uploadPhoto(UUID id, MultipartFile file, User currentUser) {
        // Validate file
        // Save via FileUploadService
        // Update user profile photo URL
        // Return updated DTO
    }
}
```

### OkrService

```java
@Service
@Transactional
public class OkrService {

    // Department operations
    public List<DepartmentDTO> getAllDepartments() {
        return departmentRepository.findAllWithObjectives()
            .stream()
            .map(this::toDepartmentDTO)
            .collect(Collectors.toList());
    }

    public DepartmentScoreResult getDepartmentScoreWithEvaluations(String departmentId) {
        Department dept = departmentRepository.findByIdWithObjectives(departmentId)
            .orElseThrow(() -> new EntityNotFoundException("Department not found"));
        return scoreCalculationService.calculateDepartmentScoreWithEvaluations(dept);
    }

    // Objective operations
    public ObjectiveDTO createObjective(String deptId, ObjectiveDTO dto) {
        // Validate department exists
        // Check edit permission
        // Create and save objective
        // Return DTO with calculated score
    }

    // Key Result operations
    public KeyResultDTO updateKeyResultActualValue(String id, String actualValue) {
        // Find key result
        // Check edit permission
        // Update actual value
        // Recalculate score
        // Return updated DTO
    }

    // DTO Conversion
    private DepartmentDTO toDepartmentDTO(Department dept) {
        DepartmentDTO dto = new DepartmentDTO();
        dto.setId(dept.getId());
        dto.setName(dept.getName());
        dto.setDivisionId(dept.getDivision().getId());
        dto.setObjectives(dept.getObjectives().stream()
            .map(this::toObjectiveDTO)
            .collect(Collectors.toList()));
        dto.setScore(scoreCalculationService.calculateDepartmentScore(dept));
        return dto;
    }
}
```

### ScoreCalculationService

```java
@Service
public class ScoreCalculationService {

    private static final double OKR_WEIGHT = 0.60;
    private static final double DIRECTOR_WEIGHT = 0.20;
    private static final double HR_WEIGHT = 0.20;

    // Key Result scoring
    public Double calculateKeyResultScore(KeyResult kr) {
        if (kr.getActualValue() == null) return null;

        return switch (kr.getMetricType()) {
            case HIGHER_BETTER -> calculateQuantitativeScore(kr, true);
            case LOWER_BETTER -> calculateQuantitativeScore(kr, false);
            case QUALITATIVE -> calculateQualitativeScore(kr);
        };
    }

    private Double calculateQuantitativeScore(KeyResult kr, boolean higherBetter) {
        double actual = Double.parseDouble(kr.getActualValue());
        // Interpolate between thresholds
        // Return normalized score 0.0-1.0
    }

    private Double calculateQualitativeScore(KeyResult kr) {
        return switch (kr.getActualValue().toUpperCase()) {
            case "A" -> 1.0;    // Exceptional
            case "B" -> 0.75;   // Very Good
            case "C" -> 0.50;   // Good
            case "D" -> 0.25;   // Meets
            case "E" -> 0.0;    // Below
            default -> null;
        };
    }

    // Objective scoring (weighted average of KRs)
    public Double calculateObjectiveScore(Objective obj) {
        List<KeyResult> krs = obj.getKeyResults();
        if (krs.isEmpty()) return null;

        double totalWeight = 0;
        double weightedSum = 0;

        for (KeyResult kr : krs) {
            Double score = calculateKeyResultScore(kr);
            if (score != null) {
                weightedSum += score * kr.getWeight();
                totalWeight += kr.getWeight();
            }
        }

        return totalWeight > 0 ? weightedSum / totalWeight : null;
    }

    // Department scoring (weighted average of objectives)
    public Double calculateDepartmentScore(Department dept) {
        // Similar weighted average logic
    }

    // Combined score with evaluations
    public DepartmentScoreResult calculateDepartmentScoreWithEvaluations(Department dept) {
        DepartmentScoreResult result = new DepartmentScoreResult();

        // 1. Calculate automatic OKR score
        Double okrScore = calculateDepartmentScore(dept);
        result.setAutomaticOkrScore(okrScore);

        // 2. Get evaluations
        List<Evaluation> evaluations = getSubmittedEvaluations(dept.getId());

        // 3. Extract Director evaluation
        Evaluation directorEval = findByType(evaluations, DIRECTOR);
        if (directorEval != null) {
            result.setDirectorEvaluation(directorEval.getNumericRating());
            result.setDirectorStars(convertNumericToStars(directorEval.getNumericRating()));
            result.setHasDirectorEvaluation(true);
        }

        // 4. Extract HR evaluation
        Evaluation hrEval = findByType(evaluations, HR);
        if (hrEval != null) {
            result.setHrEvaluationLetter(hrEval.getLetterRating());
            result.setHrEvaluationNumeric(convertHrLetterToNumeric(hrEval.getLetterRating()));
            result.setHasHrEvaluation(true);
        }

        // 5. Calculate final combined score
        if (okrScore != null) {
            double finalScore = okrScore * OKR_WEIGHT;
            if (result.getHasDirectorEvaluation()) {
                finalScore += normalize(result.getDirectorEvaluation()) * DIRECTOR_WEIGHT;
            }
            if (result.getHasHrEvaluation()) {
                finalScore += normalize(result.getHrEvaluationNumeric()) * HR_WEIGHT;
            }
            result.setFinalCombinedScore(finalScore);
        }

        // 6. Determine level and color
        ScoreResult scoreResult = createScoreResult(result.getFinalCombinedScore());
        result.setScoreLevel(scoreResult.getLevel());
        result.setColor(scoreResult.getColor());

        return result;
    }
}
```

### EvaluationService

```java
@Service
@Transactional
public class EvaluationService {

    public EvaluationDTO createEvaluation(EvaluationCreateRequest request, User evaluator) {
        // Validate evaluator has correct role for evaluatorType
        // Check for duplicate evaluation
        // Convert star ratings to numeric (1-5 → 4.25-5.0)
        // Create and save evaluation with DRAFT status
        // Return DTO
    }

    public EvaluationDTO submitEvaluation(UUID id, User currentUser) {
        Evaluation eval = findById(id);
        // Verify ownership
        // Change status to SUBMITTED
        // Save and return DTO
    }

    private void validateEvaluationPermissions(User user, EvaluatorType type) {
        boolean allowed = switch (type) {
            case DIRECTOR -> user.getRole() == Role.DIRECTOR || user.getRole() == Role.ADMIN;
            case HR -> user.getRole() == Role.HR || user.getRole() == Role.ADMIN;
            case BUSINESS_BLOCK -> user.getRole() == Role.BUSINESS_BLOCK || user.getRole() == Role.ADMIN;
        };
        if (!allowed) throw new AccessDeniedException("Not authorized for this evaluation type");
    }

    public Double convertStarsToNumeric(int stars) {
        // 1 star → 4.25, 2 → 4.4375, 3 → 4.625, 4 → 4.8125, 5 → 5.0
        return 4.25 + (stars - 1) * 0.1875;
    }

    public Double convertHrLetterToNumeric(String letter) {
        return switch (letter.toUpperCase()) {
            case "A" -> 5.0;
            case "B" -> 4.75;
            case "C" -> 4.5;
            case "D" -> 4.25;
            default -> null;
        };
    }
}
```

---

## 8. Controller Layer

### AuthController

```java
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        String token = jwtTokenProvider.generateToken(auth);
        UserDTO userDTO = userService.getUserByUsername(request.getUsername());
        return ResponseEntity.ok(new LoginResponse(token, "Bearer", userDTO));
    }

    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(userService.registerUser(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(userService.getUserById(user.getId()));
    }
}
```

### OkrController

```java
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class OkrController {

    // Department endpoints
    @GetMapping("/departments")
    public ResponseEntity<List<DepartmentDTO>> getAllDepartments() {
        return ResponseEntity.ok(okrService.getAllDepartments());
    }

    @GetMapping("/departments/{id}/scores")
    public ResponseEntity<DepartmentScoreResult> getDepartmentScores(@PathVariable String id) {
        return ResponseEntity.ok(okrService.getDepartmentScoreWithEvaluations(id));
    }

    @PostMapping("/departments")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    public ResponseEntity<DepartmentDTO> createDepartment(@RequestBody DepartmentDTO dto) {
        return ResponseEntity.ok(okrService.createDepartment(dto));
    }

    // Objective endpoints
    @PostMapping("/departments/{deptId}/objectives")
    public ResponseEntity<ObjectiveDTO> createObjective(
            @PathVariable String deptId,
            @RequestBody ObjectiveDTO dto,
            @AuthenticationPrincipal UserDetailsImpl user) {
        departmentAccessService.checkEditPermission(deptId, user);
        return ResponseEntity.ok(okrService.createObjective(deptId, dto));
    }

    // Key Result endpoints
    @PutMapping("/key-results/{id}/actual-value")
    public ResponseEntity<KeyResultDTO> updateActualValue(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(okrService.updateKeyResultActualValue(id, body.get("actualValue")));
    }

    // Export
    @GetMapping("/export/excel")
    public ResponseEntity<byte[]> exportToExcel() {
        byte[] excelData = okrService.exportToExcel();
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=okr-report.xlsx")
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(excelData);
    }
}
```

### EvaluationController

```java
@RestController
@RequestMapping("/api/evaluations")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class EvaluationController {

    @PostMapping
    @PreAuthorize("hasAnyRole('DIRECTOR', 'HR', 'BUSINESS_BLOCK', 'ADMIN')")
    public ResponseEntity<EvaluationDTO> createEvaluation(
            @RequestBody EvaluationCreateRequest request,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(evaluationService.createEvaluation(request, user.getUser()));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('DIRECTOR', 'HR', 'BUSINESS_BLOCK', 'ADMIN')")
    public ResponseEntity<EvaluationDTO> submitEvaluation(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(evaluationService.submitEvaluation(id, user.getUser()));
    }

    @GetMapping("/target/{type}/{id}")
    public ResponseEntity<List<EvaluationDTO>> getEvaluationsForTarget(
            @PathVariable String type,
            @PathVariable UUID id) {
        return ResponseEntity.ok(evaluationService.getEvaluationsForTarget(type, id));
    }
}
```

---

## 9. Security Architecture

### JWT Token Flow

```
┌────────────┐     POST /api/auth/login      ┌─────────────────┐
│   Client   │ ─────────────────────────────►│  AuthController │
│            │     {username, password}      │                 │
└────────────┘                               └────────┬────────┘
                                                      │
                                                      ▼
                                          ┌─────────────────────┐
                                          │ AuthenticationManager│
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │UserDetailsServiceImpl│
                                          │  loadUserByUsername │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   UserRepository    │
                                          │  findByUsername()   │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │   PasswordEncoder   │
                                          │     matches()       │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  JwtTokenProvider   │
                                          │  generateToken()    │
                                          └──────────┬──────────┘
                                                     │
┌────────────┐      LoginResponse(token)             │
│   Client   │ ◄─────────────────────────────────────┘
│            │
└────────────┘
```

### Request Authentication Flow

```
┌────────────┐    GET /api/departments       ┌─────────────────────┐
│   Client   │ ─────────────────────────────►│JwtAuthenticationFilter│
│            │   Authorization: Bearer JWT   │                     │
└────────────┘                               └──────────┬──────────┘
                                                        │
                                      ┌─────────────────┴─────────────────┐
                                      │ 1. Extract token from header      │
                                      │ 2. JwtTokenProvider.validateToken │
                                      │ 3. JwtTokenProvider.getUsername   │
                                      │ 4. UserDetailsService.loadUser    │
                                      │ 5. Set SecurityContext            │
                                      └─────────────────┬─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   Controller    │
                                              │  (Authorized)   │
                                              └─────────────────┘
```

### Security Configuration

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/export/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(),
                UsernamePasswordAuthenticationFilter.class)
            .headers(headers -> headers.frameOptions().disable());

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(
            "http://localhost:5173",
            "http://localhost:3000"
        ));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

### JWT Token Provider

```java
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private int jwtExpiration;

    public String generateToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
            .setSubject(userPrincipal.getUsername())
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes()), SignatureAlgorithm.HS256)
            .compact();
    }

    public String getUsernameFromToken(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.error("Invalid JWT signature");
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired");
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported");
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty");
        }
        return false;
    }
}
```

### Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| ADMIN | Full access to all operations |
| DIRECTOR | Create divisions/departments, evaluate, view all |
| HR | Create letter-based evaluations, view all |
| BUSINESS_BLOCK | Create numeric evaluations, view all |
| DEPARTMENT_LEADER | Edit assigned departments |
| EMPLOYEE | View own profile, view OKRs |

---

## 10. Score Calculation Engine

### Scoring Formula

#### Final Combined Score
```
FinalScore = (OKR × 0.60) + (Director × 0.20) + (HR × 0.20)
```

#### Key Result Score (Quantitative)

For HIGHER_BETTER metrics:
```
if actual < thresholdBelow:
    score = 0.0
elif actual < thresholdMeets:
    score = interpolate(0.0, 0.25, actual, thresholdBelow, thresholdMeets)
elif actual < thresholdGood:
    score = interpolate(0.25, 0.50, actual, thresholdMeets, thresholdGood)
elif actual < thresholdVeryGood:
    score = interpolate(0.50, 0.75, actual, thresholdGood, thresholdVeryGood)
elif actual < thresholdExceptional:
    score = interpolate(0.75, 1.0, actual, thresholdVeryGood, thresholdExceptional)
else:
    score = 1.0
```

#### Key Result Score (Qualitative)
```
Grade  →  Score
A      →  1.00 (Exceptional)
B      →  0.75 (Very Good)
C      →  0.50 (Good)
D      →  0.25 (Meets)
E      →  0.00 (Below)
```

#### Objective Score
```
ObjectiveScore = Σ(KRscore × KRweight) / Σ(KRweights)
```

#### Department Score
```
DepartmentScore = Σ(ObjectiveScore × ObjectiveWeight) / Σ(ObjectiveWeights)
```

### Evaluation Conversions

#### Director Stars → Numeric
```
Stars  →  Numeric
1      →  4.250
2      →  4.4375
3      →  4.625
4      →  4.8125
5      →  5.000
```

#### HR Letters → Numeric
```
Letter →  Numeric
A      →  5.00
B      →  4.75
C      →  4.50
D      →  4.25
```

### Score Levels

| Level | Score Range | Color | Display |
|-------|------------|-------|---------|
| Below | 0.00-0.24 | #d9534f | Red |
| Meets | 0.25-0.49 | #f0ad4e | Orange |
| Good | 0.50-0.74 | #5cb85c | Green |
| Very Good | 0.75-0.99 | #28a745 | Darker Green |
| Exceptional | 1.00 | #1e7b34 | Dark Green |

---

## 11. File Storage

### Profile Photo Upload

**Directory Structure:**
```
./uploads/
└── profile-photos/
    ├── {userId}_{timestamp}.jpg
    ├── {userId}_{timestamp}.png
    └── {userId}_{timestamp}.gif
```

**Configuration:**
```properties
app.upload.dir=./uploads
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=5MB
```

**FileUploadService:**
```java
@Service
public class FileUploadService {

    private static final List<String> ALLOWED_TYPES = List.of(
        "image/jpeg", "image/png", "image/gif"
    );
    private static final List<String> ALLOWED_EXTENSIONS = List.of(
        "jpg", "jpeg", "png", "gif"
    );
    private static final long MAX_SIZE = 5 * 1024 * 1024; // 5MB

    public String uploadProfilePhoto(UUID userId, MultipartFile file) {
        validateFile(file);

        String filename = userId + "_" + System.currentTimeMillis() +
                         "." + getExtension(file.getOriginalFilename());
        Path targetPath = Paths.get(uploadDir, "profile-photos", filename);

        Files.createDirectories(targetPath.getParent());
        Files.copy(file.getInputStream(), targetPath);

        return "/uploads/profile-photos/" + filename;
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) throw new IllegalArgumentException("File is empty");
        if (file.getSize() > MAX_SIZE) throw new MaxUploadSizeExceededException(MAX_SIZE);
        if (!ALLOWED_TYPES.contains(file.getContentType()))
            throw new IllegalArgumentException("Invalid file type");
    }
}
```

**Static Resource Configuration:**
```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:./uploads/");
    }
}
```

---

## 12. Exception Handling

### Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(new ErrorResponse("BAD_CREDENTIALS", "Invalid username or password"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("ACCESS_DENIED", "Permission denied"));
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse("VALIDATION_ERROR", errors));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleFileTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(new ErrorResponse("FILE_TOO_LARGE", "File size exceeds 5MB limit"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
    }
}
```

### Error Response Format

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": "2024-01-15T10:30:00"
}
```

### HTTP Status Codes

| Code | Description | Use Case |
|------|-------------|----------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Invalid credentials |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 413 | Payload Too Large | File exceeds limit |
| 500 | Internal Error | Unexpected server error |

---

## 13. Configuration

### application.properties

```properties
# Application
spring.application.name=okrTrackingSystem
server.port=8080

# Database
spring.datasource.url=jdbc:h2:file:./data/okrdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect
spring.jpa.properties.hibernate.default_batch_fetch_size=20

# JWT
jwt.secret=YourSuperSecretKeyThatIsAtLeast256BitsLongForHS256AlgorithmSecurityPurposes
jwt.expiration=86400000

# CORS
app.cors.allowed-origins=http://localhost:3000

# File Upload
app.upload.dir=./uploads
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=5MB
```

### Data Initialization

```java
@Component
public class DataInitializer implements CommandLineRunner {

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setEmail("admin@okr-tracker.com");
            admin.setFullName("System Administrator");
            admin.setRole(Role.ADMIN);
            admin.setIsActive(true);
            userRepository.save(admin);
            log.info("Default admin user created");
        }
    }
}
```

---

## 14. Dependencies

### Maven Dependencies (pom.xml)

```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Database -->
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- JWT -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>

    <!-- Utilities -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>

    <!-- Excel Export -->
    <dependency>
        <groupId>org.apache.poi</groupId>
        <artifactId>poi-ooxml</artifactId>
        <version>5.2.5</version>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.springframework.security</groupId>
        <artifactId>spring-security-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

---

## 15. Deployment

### Development Environment

```bash
# Start the application
./mvnw spring-boot:run

# Or with specific profile
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### Available Endpoints

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8080/api |
| H2 Console | http://localhost:8080/h2-console |
| File Uploads | http://localhost:8080/uploads |

### Production Considerations

1. **Database**: Replace H2 with PostgreSQL or MySQL
2. **JWT Secret**: Use environment variables for secrets
3. **File Storage**: Use cloud storage (S3, GCS) for uploads
4. **CORS**: Configure allowed origins for production domains
5. **HTTPS**: Enable TLS/SSL termination
6. **Monitoring**: Add health checks and metrics endpoints

### Environment Variables

```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/okrdb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=secret

# JWT
JWT_SECRET=your-production-secret-key-min-256-bits
JWT_EXPIRATION=86400000

# CORS
APP_CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com

# File Upload
APP_UPLOAD_DIR=/var/uploads
```

---

## Summary

The OKR Tracking System is a comprehensive Spring Boot application that provides:

- **User Management**: Role-based access control with JWT authentication
- **OKR Management**: Hierarchical structure (Division → Department → Objective → Key Result)
- **Multi-Source Evaluation**: Director, HR, and Business Block evaluations
- **Dynamic Score Calculation**: Weighted scoring with configurable levels
- **File Upload**: Profile photo management
- **Excel Export**: Report generation capability

The architecture follows industry best practices with clear separation of concerns, proper exception handling, and comprehensive security measures.
