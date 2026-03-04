# OKR Tracking System - API Documentation

Complete REST API reference for the OKR Tracking System.

## Table of Contents

1. [Authentication](#authentication)
2. [Divisions](#divisions)
3. [Departments](#departments)
4. [Objectives](#objectives)
5. [Key Results](#key-results)
6. [Users](#users)
7. [Evaluations](#evaluations)
8. [Score Levels](#score-levels)
9. [Export & Demo](#export--demo)
10. [Error Handling](#error-handling)

---

## Base URL

```
http://localhost:8080/api
```

## Authentication

All endpoints (except login) require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Authentication

### Login

Authenticate a user and receive a JWT token.

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "admin@okr-tracker.com",
    "fullName": "System Administrator",
    "role": "ADMIN"
  }
}
```

**When to Use:** First step before accessing any protected endpoints. Store the token for subsequent requests.

---

### Register User

Create a new user account (Admin only).

```http
POST /api/auth/register
```

**Security:** `ADMIN` role required

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "securePassword123",
  "fullName": "New User",
  "role": "EMPLOYEE"
}
```

**Response (200 OK):** Returns the created `UserDTO`

**When to Use:** When administrators need to create new user accounts.

---

### Get Current User

Get the authenticated user's information.

```http
GET /api/auth/me
```

**Security:** Authenticated users

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin",
  "email": "admin@okr-tracker.com",
  "fullName": "System Administrator",
  "role": "ADMIN",
  "assignedDepartments": ["dept-id-1", "dept-id-2"]
}
```

**When to Use:** To display current user info in the UI, check permissions, or refresh user state.

---

## Divisions

Divisions are the top-level organizational units that contain departments.

### Get All Divisions

```http
GET /api/divisions
```

**Security:** Authenticated users

**Response (200 OK):**
```json
[
  {
    "id": "div-123",
    "name": "Technology Division",
    "divisionLeader": {
      "id": "user-uuid",
      "username": "johndoe",
      "fullName": "John Doe",
      "profilePhotoUrl": "/uploads/photo.jpg"
    },
    "departments": [
      { "id": "dept-1", "name": "Engineering" },
      { "id": "dept-2", "name": "IT Support" }
    ],
    "createdAt": "2024-01-28T10:30:00",
    "updatedAt": "2024-01-28T10:30:00"
  }
]
```

**When to Use:** To display the organizational hierarchy, populate division dropdowns, or show dashboard overview.

---

### Get Division by ID

```http
GET /api/divisions/{id}
```

**Security:** Authenticated users

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | String | Division ID |

**Response (200 OK):** Single `DivisionDTO` object

**When to Use:** To display detailed division information or edit a specific division.

---

### Create Division

```http
POST /api/divisions
```

**Security:** `ADMIN` or `DIRECTOR` role required

**Request Body:**
```json
{
  "name": "Commercial Division",
  "leaderId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | Division name (2-100 characters) |
| leaderId | UUID | No | User ID of division leader |

**Response (201 Created):** Created `DivisionDTO`

**When to Use:** When setting up organizational structure or adding new business units.

---

### Update Division

```http
PUT /api/divisions/{id}
```

**Security:** Authenticated + permission check (ADMIN, DIRECTOR, or Division Leader)

**Request Body:**
```json
{
  "name": "Updated Division Name",
  "leaderId": "new-leader-uuid"
}
```

**Response (200 OK):** Updated `DivisionDTO`

**When to Use:** To rename divisions or change leadership.

---

### Delete Division

```http
DELETE /api/divisions/{id}
```

**Security:** `ADMIN` role required

**Response (204 No Content)**

**Constraints:** Cannot delete a division that contains departments. Reassign or delete departments first.

**When to Use:** During organizational restructuring when a division is no longer needed.

---

### Get Departments in Division

```http
GET /api/divisions/{id}/departments
```

**Security:** Authenticated users

**Response (200 OK):**
```json
[
  { "id": "dept-1", "name": "Engineering" },
  { "id": "dept-2", "name": "IT Support" }
]
```

**When to Use:** To show all departments within a specific division.

---

## Departments

Departments belong to divisions and contain objectives.

### Get All Departments

```http
GET /api/departments
```

**Security:** Authenticated users

**Response (200 OK):**
```json
[
  {
    "id": "dept-uuid",
    "name": "PMO - Project Management Office",
    "division": {
      "id": "div-123",
      "name": "Technology Division"
    },
    "objectives": [...],
    "score": {
      "score": 3.5,
      "level": "Good",
      "color": "#4CAF50",
      "percentage": 70
    },
    "finalScore": {
      "score": 3.8,
      "level": "Very Good",
      "color": "#8BC34A",
      "percentage": 76
    },
    "hasAllEvaluations": true
  }
]
```

**When to Use:** Main dashboard view, department selection lists, or OKR overview pages.

---

### Get Department by ID

```http
GET /api/departments/{id}
```

**Security:** Authenticated users

**Response (200 OK):** Single `DepartmentDTO` with full objectives and key results

**When to Use:** To view/edit a specific department's OKRs.

---

### Create Department

```http
POST /api/departments
```

**Security:** `ADMIN` or `DIRECTOR` role required

**Request Body:**
```json
{
  "name": "New Department",
  "divisionId": "div-123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | Department name |
| divisionId | String | Yes | Parent division ID |

**Response (200 OK):** Created `DepartmentDTO`

**When to Use:** When adding new departments to the organization.

---

### Update Department

```http
PUT /api/departments/{id}
```

**Security:** Requires edit permission (ADMIN, DIRECTOR, Department Leader, or assigned user with edit rights)

**Request Body:**
```json
{
  "name": "Updated Department Name",
  "divisionId": "new-division-id"
}
```

**Response (200 OK):** Updated `DepartmentDTO`

**When to Use:** To rename departments or move them to different divisions.

---

### Delete Department

```http
DELETE /api/departments/{id}
```

**Security:** `ADMIN` role required

**Response (204 No Content)**

**Side Effects:**
- Deletes all objectives and key results (cascade)
- Removes user assignments
- Deletes related evaluations

**When to Use:** When a department is dissolved or merged.

---

### Get Department Scores

Get detailed score breakdown including evaluations.

```http
GET /api/departments/{id}/scores
```

**Security:** Authenticated users

**Response (200 OK):**
```json
{
  "departmentId": "dept-uuid",
  "departmentName": "PMO",
  "okrScore": {
    "score": 3.5,
    "level": "Good",
    "color": "#4CAF50",
    "percentage": 70
  },
  "directorEvaluation": {
    "rating": 4.5,
    "comment": "Excellent performance"
  },
  "hrEvaluation": {
    "letterRating": "A",
    "comment": "Outstanding teamwork"
  },
  "businessBlockEvaluation": {
    "rating": 4,
    "comment": "Good collaboration"
  },
  "finalScore": {
    "score": 3.8,
    "level": "Very Good",
    "percentage": 76
  }
}
```

**When to Use:** Department detail pages showing full score breakdown with all evaluation components.

---

## Objectives

Objectives are goals within departments, containing key results.

### Create Objective

```http
POST /api/departments/{departmentId}/objectives
```

**Security:** Requires edit permission for the department

**Request Body:**
```json
{
  "name": "Improve Customer Satisfaction",
  "weight": 25
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | Objective description |
| weight | Integer | Yes | Weight percentage (0-100) |

**Response (200 OK):** Created `ObjectiveDTO`

**When to Use:** When defining new OKRs for a department.

---

### Update Objective

```http
PUT /api/objectives/{id}
```

**Security:** Requires edit permission for the associated department

**Request Body:**
```json
{
  "name": "Updated Objective Name",
  "weight": 30
}
```

**Response (200 OK):** Updated `ObjectiveDTO`

---

### Delete Objective

```http
DELETE /api/objectives/{id}
```

**Security:** Requires edit permission for the associated department

**Response (204 No Content)**

**Side Effects:** Deletes all associated key results (cascade)

---

## Key Results

Key Results are measurable outcomes within objectives.

### Create Key Result

```http
POST /api/objectives/{objectiveId}/key-results
```

**Security:** Requires edit permission for the associated department

**Request Body:**
```json
{
  "name": "Customer NPS Score",
  "description": "Net Promoter Score from quarterly surveys",
  "metricType": "HIGHER_BETTER",
  "unit": "points",
  "weight": 40,
  "thresholds": {
    "below": 30,
    "meets": 50,
    "good": 65,
    "veryGood": 80,
    "exceptional": 90
  },
  "actualValue": "0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | Key result name |
| description | String | No | Detailed description |
| metricType | Enum | Yes | `HIGHER_BETTER`, `LOWER_BETTER`, or `QUALITATIVE` |
| unit | String | No | Measurement unit (%, points, etc.) |
| weight | Integer | Yes | Weight within objective (0-100) |
| thresholds | Object | Yes | Score thresholds for each level |
| actualValue | String | No | Current measured value |

**Response (200 OK):** Created `KeyResultDTO`

**When to Use:** When defining measurable outcomes for objectives.

---

### Update Key Result

```http
PUT /api/key-results/{id}
```

**Security:** Requires edit permission for the associated department

**Request Body:** Same as create, all fields optional for partial update

**Response (200 OK):** Updated `KeyResultDTO`

---

### Update Key Result Actual Value

Quick endpoint to update just the measured value.

```http
PUT /api/key-results/{id}/actual-value
```

**Security:** Requires edit permission for the associated department

**Request Body:**
```json
{
  "actualValue": "75"
}
```

**Response (200 OK):** Updated `KeyResultDTO` with recalculated score

**When to Use:** During regular OKR check-ins to update progress.

---

### Delete Key Result

```http
DELETE /api/key-results/{id}
```

**Security:** Requires edit permission for the associated department

**Response (204 No Content)**

---

## Users

User management endpoints.

### Get All Users

```http
GET /api/users
```

**Security:** `ADMIN` or `DIRECTOR` role required

**Response (200 OK):** List of `UserDTO` objects

**When to Use:** User management screens, assigning users to departments.

---

### Get Users with Scores

```http
GET /api/users/with-scores
```

**Security:** `ADMIN` or `DIRECTOR` role required

**Response (200 OK):** List of `UserWithScoreDTO` including individual OKR scores

**When to Use:** Performance dashboards showing user rankings.

---

### Get User by ID

```http
GET /api/users/{id}
```

**Security:** `ADMIN`, `DIRECTOR`, or self

**Response (200 OK):** `UserDTO`

---

### Create User

```http
POST /api/users
```

**Security:** `ADMIN` role required

**Request Body:**
```json
{
  "username": "newemployee",
  "email": "employee@company.com",
  "password": "initialPassword123",
  "fullName": "New Employee",
  "role": "EMPLOYEE",
  "assignedDepartmentIds": ["dept-1", "dept-2"],
  "jobTitle": "Software Engineer",
  "phoneNumber": "+998901234567",
  "bio": "Experienced developer"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | String | Yes | Unique username |
| email | String | Yes | Unique email |
| password | String | Yes | Initial password |
| fullName | String | Yes | Display name |
| role | Enum | Yes | `EMPLOYEE`, `DEPARTMENT_LEADER`, `HR`, `DIRECTOR`, `BUSINESS_BLOCK`, `ADMIN` |
| assignedDepartmentIds | List | No | Departments to assign |
| jobTitle | String | No | Job title |
| phoneNumber | String | No | Contact number |
| bio | String | No | Short biography |

**Response (200 OK):** Created `UserDTO`

---

### Update User

```http
PUT /api/users/{id}
```

**Security:** `ADMIN` (all fields) or self (profile fields only)

**Request Body:** Partial update with any fields from create

**Response (200 OK):** Updated `UserDTO`

---

### Delete User

```http
DELETE /api/users/{id}
```

**Security:** `ADMIN` role required (cannot delete self)

**Response (204 No Content)**

---

### Assign Departments to User

```http
POST /api/users/{id}/departments
```

**Security:** `ADMIN` role required

**Request Body:**
```json
{
  "departmentIds": ["dept-1", "dept-2", "dept-3"]
}
```

**Response (200 OK):** Updated `UserDTO`

**When to Use:** When users join new projects or change teams.

---

### Remove User from Department

```http
DELETE /api/users/{id}/departments/{deptId}
```

**Security:** `ADMIN` role required

**Response (200 OK):** Updated `UserDTO`

---

### Upload User Photo

```http
POST /api/users/{id}/photo
Content-Type: multipart/form-data
```

**Security:** `ADMIN` or self

**Request:** Form data with `photo` file field

**Response (200 OK):** Updated `UserDTO` with new `profilePhotoUrl`

---

### Get Users by Department

```http
GET /api/users/by-department/{deptId}
```

**Security:** Authenticated users

**Response (200 OK):** List of `UserDTO` assigned to the department

**When to Use:** Department team views, selecting assignees.

---

### Get My Profile

```http
GET /api/users/me/profile
```

**Security:** Authenticated users

**Response (200 OK):** `UserProfileDTO` with extended details including recent evaluations

**When to Use:** User profile pages with evaluation history.

---

## Evaluations

Evaluations are assessments of departments or individuals by authorized evaluators.

### Create Evaluation

```http
POST /api/evaluations
```

**Security:** `DIRECTOR`, `HR`, `BUSINESS_BLOCK`, or `ADMIN` role required

**Request Body:**
```json
{
  "targetType": "DEPARTMENT",
  "targetId": "550e8400-e29b-41d4-a716-446655440000",
  "evaluatorType": "DIRECTOR",
  "numericRating": 4.5,
  "comment": "Excellent performance this quarter"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| targetType | String | Yes | `DEPARTMENT` or `INDIVIDUAL` |
| targetId | UUID | Yes | ID of target department/user |
| evaluatorType | Enum | Yes | `DIRECTOR`, `HR`, or `BUSINESS_BLOCK` |
| numericRating | Double | Conditional | Required for DIRECTOR (4.25-5.0) and BUSINESS_BLOCK (1-5) |
| letterRating | String | Conditional | Required for HR (A, B, C, D) |
| comment | String | No | Evaluation feedback |

**Response (200 OK):** Created `EvaluationDTO` (status: `DRAFT`)

**When to Use:** When evaluators assess department/employee performance.

---

### Submit Evaluation

Finalize and submit a draft evaluation.

```http
POST /api/evaluations/{id}/submit
```

**Security:** Evaluation owner (same evaluator type)

**Response (200 OK):** `EvaluationDTO` with status `SUBMITTED`

**When to Use:** After completing evaluation details and ready to finalize.

---

### Update Evaluation

```http
PUT /api/evaluations/{id}
```

**Security:** Evaluation owner (only while in DRAFT status)

**Request Body:** Same as create

**Response (200 OK):** Updated `EvaluationDTO`

---

### Get Evaluations by Target

```http
GET /api/evaluations/target/{type}/{id}
```

**Security:** Authenticated users

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | String | `DEPARTMENT` or `INDIVIDUAL` |
| id | UUID | Target ID |

**Response (200 OK):** List of `EvaluationDTO` for the target

**When to Use:** Showing all evaluations for a specific department/user.

---

### Get My Evaluations

```http
GET /api/evaluations/my
```

**Security:** Authenticated users

**Response (200 OK):** List of evaluations created by current user

**When to Use:** Evaluator dashboard showing their submitted evaluations.

---

### Get All Evaluations

```http
GET /api/evaluations/all
```

**Security:** `ADMIN` role required

**Response (200 OK):** All evaluations in the system

**When to Use:** Admin oversight and reporting.

---

### Delete Evaluation

```http
DELETE /api/evaluations/{id}
```

**Security:** Evaluation owner

**Response (204 No Content)**

---

## Score Levels

Configure scoring thresholds and display settings.

### Get Score Levels

```http
GET /api/score-levels
```

**Security:** Public

**Response (200 OK):**
```json
[
  {
    "id": "level-1",
    "name": "Below Expectations",
    "scoreValue": 1.0,
    "color": "#F44336",
    "displayOrder": 1,
    "isDefault": false
  },
  {
    "id": "level-2",
    "name": "Meets Expectations",
    "scoreValue": 2.0,
    "color": "#FF9800",
    "displayOrder": 2,
    "isDefault": false
  }
]
```

**When to Use:** Displaying score legends, configuring thresholds.

---

### Update Score Levels

```http
PUT /api/score-levels
```

**Request Body:** List of `ScoreLevelDTO`

**Response (200 OK):** Updated list

**When to Use:** Customizing scoring configuration.

---

### Reset Score Levels

```http
POST /api/score-levels/reset
```

**Response (204 No Content)**

**When to Use:** Restoring default scoring configuration.

---

## Export & Demo

### Export to Excel

```http
GET /api/export/excel
```

**Security:** Authenticated users

**Response:** Excel file download (`application/octet-stream`)

**When to Use:** Generating reports for stakeholders.

---

### Load Demo Data

```http
POST /api/demo/load
```

**Security:** `ADMIN` role required

**Response (200 OK):** List of created `DepartmentDTO`

**Side Effects:**
- Clears ALL existing data (evaluations, users, departments)
- Creates demo users with predefined credentials
- Creates sample department with objectives and key results

**Demo Users Created:**
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN |
| director | director123 | DIRECTOR |
| hr | hr123 | HR |
| business | business123 | BUSINESS_BLOCK |
| pmo_leader | leader123 | DEPARTMENT_LEADER |
| employee1 | employee123 | EMPLOYEE |
| employee2 | employee123 | EMPLOYEE |

**When to Use:** Setting up demo environments, testing, or resetting to known state.

---

## Error Handling

### Error Response Format

```json
{
  "timestamp": "2024-01-28T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Division with this name already exists",
  "path": "/api/divisions"
}
```

### Common HTTP Status Codes

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Validation error, invalid data |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., username) |
| 500 | Internal Server Error | Server-side error |

---

## Role Permissions Summary

| Role | Divisions | Departments | Objectives/KRs | Users | Evaluations |
|------|-----------|-------------|----------------|-------|-------------|
| ADMIN | Full CRUD | Full CRUD | Full CRUD | Full CRUD | View All |
| DIRECTOR | Create, Edit | Create, Edit | Edit (own dept) | View | Create (Director type) |
| HR | View | View | View | View | Create (HR type) |
| BUSINESS_BLOCK | View | View | View | View | Create (BB type) |
| DEPARTMENT_LEADER | View | Edit (own) | Edit (own dept) | View | View |
| EMPLOYEE | View | View | View (assigned) | View self | View |

---

## CORS Configuration

The API allows requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Create React App)

For production, update CORS settings in the backend configuration.
