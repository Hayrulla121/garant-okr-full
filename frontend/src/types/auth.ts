export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  DEPARTMENT_LEADER = 'DEPARTMENT_LEADER',
  HR = 'HR',
  DIRECTOR = 'DIRECTOR',
  BUSINESS_BLOCK = 'BUSINESS_BLOCK',
  ADMIN = 'ADMIN'
}

/**
 * Lightweight department summary for user contexts
 */
export interface DepartmentSummary {
  id: string;
  name: string;
}

/**
 * User information
 */
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  profilePhotoUrl?: string;
  jobTitle?: string;
  phoneNumber?: string;
  bio?: string;
  isActive: boolean;
  canEditAssignedDepartments: boolean;
  lastLogin?: string;
  assignedDepartments: DepartmentSummary[];
  createdAt?: string;
}

/**
 * Extended user profile with detailed department info and evaluations
 */
export interface UserProfile extends User {
  assignedDepartmentsDetail: any[]; // DepartmentDTO[]
  recentEvaluations: any[]; // EvaluationDTO[]
}

/**
 * User with overall score calculated from assigned departments.
 * Used for the Team Overview page.
 */
export interface UserWithScore extends User {
  /** Overall score calculated as average of assigned department scores */
  overallScore?: number;
  /** Score level name (e.g., "исключительно", "превышает_ожидания", "на_уровне_ожиданий", "ниже_ожиданий", "не_соответствует") */
  scoreLevel?: string;
  /** Color associated with the score level */
  scoreColor?: string;
  /** Score as a percentage (0-100) */
  scorePercentage?: number;
  /** Total number of employee evaluations received */
  totalEvaluationsCount?: number;
  /** Number of below-expectations evaluations */
  belowExpectationsCount?: number;
  /** Disciplinary status: NONE, WATCH, WARNING, FINE, TERMINATION_RISK */
  disciplinaryStatus?: string;
}

/**
 * Request to create a new user
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: Role;
  assignedDepartmentIds?: string[];
  jobTitle?: string;
  phoneNumber?: string;
  bio?: string;
}

/**
 * Request to update an existing user
 */
export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  jobTitle?: string;
  phoneNumber?: string;
  bio?: string;
  role?: Role;                         // ADMIN only
  assignedDepartmentIds?: string[];    // ADMIN only
  isActive?: boolean;                  // ADMIN only
  canEditAssignedDepartments?: boolean; // ADMIN only
  password?: string;                   // Password change
}

/**
 * Request to assign departments to a user
 */
export interface AssignDepartmentsRequest {
  departmentIds: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  user: User;
}
