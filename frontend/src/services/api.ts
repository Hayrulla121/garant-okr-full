import axios from 'axios';
import { Department, Objective, KeyResult, ScoreLevel, Division, DivisionWithScore, CreateDivisionRequest, UpdateDivisionRequest, DepartmentSummary } from '../types/okr';
import { LoginRequest, LoginResponse, User, UserProfile, UserWithScore, CreateUserRequest, UpdateUserRequest, AssignDepartmentsRequest } from '../types/auth';
import { Evaluation, EvaluationCreateRequest, DepartmentScoreResult, EmployeeEvaluationSummary } from '../types/evaluation';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
export const SERVER_BASE = API_BASE.replace(/\/api$/, '');

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add JWT token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle authentication errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Department APIs
export const departmentApi = {
    getAll: () => api.get<Department[]>('/departments'),
    getById: (id: string) => api.get<Department>(`/departments/${id}`),
    create: (data: Partial<Department>) => api.post<Department>('/departments', data),
    update: (id: string, data: Partial<Department>) => api.put<Department>(`/departments/${id}`, data),
    delete: (id: string) => api.delete(`/departments/${id}`),
};

// Division APIs
export const divisionApi = {
    getAll: () => api.get<Division[]>('/divisions'),
    getById: (id: string) => api.get<Division>(`/divisions/${id}`),
    create: (data: CreateDivisionRequest) => api.post<Division>('/divisions', data),
    update: (id: string, data: UpdateDivisionRequest) => api.put<Division>(`/divisions/${id}`, data),
    delete: (id: string) => api.delete(`/divisions/${id}`),
    getDepartments: (id: string) => api.get<DepartmentSummary[]>(`/divisions/${id}/departments`),
    getWithScore: (id: string) => api.get<DivisionWithScore>(`/divisions/${id}/score`),
};

// Objective APIs
export const objectiveApi = {
    create: (departmentId: string, data: Partial<Objective>) =>
        api.post<Objective>(`/departments/${departmentId}/objectives`, data),
    createLeaderObjective: (departmentId: string, data: Partial<Objective>) =>
        api.post<Objective>(`/departments/${departmentId}/leader-objectives`, data),
    update: (id: string, data: Partial<Objective>) =>
        api.put<Objective>(`/objectives/${id}`, data),
    delete: (id: string) => api.delete(`/objectives/${id}`),
};

// Key Result APIs
export const keyResultApi = {
    create: (objectiveId: string, data: Partial<KeyResult>) =>
        api.post<KeyResult>(`/objectives/${objectiveId}/key-results`, data),
    update: (id: string, data: Partial<KeyResult>) =>
        api.put<KeyResult>(`/key-results/${id}`, data),
    updateActualValue: (id: string, value: string, file?: File) => {
        const formData = new FormData();
        formData.append('actualValue', value);
        if (file) formData.append('file', file);
        return api.put<KeyResult>(`/key-results/${id}/actual-value`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    updateProgress: (id: string, progress: number) =>
        api.put<KeyResult>(`/key-results/${id}/progress`, { progress }),
    delete: (id: string) => api.delete(`/key-results/${id}`),
};

// Score Level APIs
export const scoreLevelApi = {
    getAll: () => api.get<ScoreLevel[]>('/score-levels'),
    updateAll: (levels: ScoreLevel[]) => api.put<ScoreLevel[]>('/score-levels', levels),
    resetToDefaults: () => api.post('/score-levels/reset'),
};

// Demo Data APIs
export const demoApi = {
    loadDemoData: () => api.post<Department[]>('/demo/load'),
};

// Authentication APIs
export const authApi = {
    login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login', data),
    register: (data: any) => api.post<User>('/auth/register', data),
    getCurrentUser: () => api.get<User>('/auth/me'),
};

// Evaluation APIs
export const evaluationApi = {
    create: (data: EvaluationCreateRequest) => api.post<Evaluation>('/evaluations', data),
    update: (id: string, data: EvaluationCreateRequest) => api.put<Evaluation>(`/evaluations/${id}`, data),
    submit: (id: string) => api.post<Evaluation>(`/evaluations/${id}/submit`),
    getForTarget: (type: string, id: string) => api.get<Evaluation[]>(`/evaluations/target/${type}/${id}`),
    getMy: () => api.get<Evaluation[]>('/evaluations/my'),
    delete: (id: string) => api.delete(`/evaluations/${id}`),
    getEmployeeSummary: (userId: string) => api.get<EmployeeEvaluationSummary>(`/evaluations/employee/${userId}/summary`),
    getAtRisk: () => api.get<EmployeeEvaluationSummary[]>('/evaluations/at-risk'),
};

// Department Scores API
export const departmentScoresApi = {
    getScores: (id: string) => api.get<DepartmentScoreResult>(`/departments/${id}/scores`),
};

// Export API
export const exportApi = {
    exportExcel: () => api.get('/export/excel', { responseType: 'blob' }),
};

// User Management API
export const userApi = {
    // Get all users (ADMIN only)
    getAll: () => api.get<User[]>('/users'),

    // Get all users with scores (ADMIN and DIRECTOR)
    getAllWithScores: () => api.get<UserWithScore[]>('/users/with-scores'),

    // Get user by ID
    getById: (id: string) => api.get<User>(`/users/${id}`),

    // Create new user (ADMIN only)
    create: (data: CreateUserRequest) => api.post<User>('/users', data),

    // Update user
    update: (id: string, data: UpdateUserRequest) => api.put<User>(`/users/${id}`, data),

    // Delete user (ADMIN only)
    delete: (id: string) => api.delete(`/users/${id}`),

    // Assign departments to user (ADMIN only)
    assignDepartments: (id: string, departmentIds: string[]) =>
        api.post<User>(`/users/${id}/departments`, { departmentIds } as AssignDepartmentsRequest),

    // Remove department from user (ADMIN only)
    removeDepartment: (id: string, deptId: string) =>
        api.delete<User>(`/users/${id}/departments/${deptId}`),

    // Upload profile photo
    uploadPhoto: (id: string, file: File) => {
        const formData = new FormData();
        formData.append('photo', file);
        return api.post<User>(`/users/${id}/photo`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Get users by department
    getByDepartment: (deptId: string) => api.get<User[]>(`/users/by-department/${deptId}`),

    // Get current user's extended profile
    getMyProfile: () => api.get<UserProfile>('/users/me/profile'),
};

// Platform Settings API
export interface PlatformSettingDto {
    settingKey: string;
    settingValue: string;
    description: string | null;
}

export const platformSettingsApi = {
    getAll: () => api.get<PlatformSettingDto[]>('/platform-settings'),
    update: (key: string, value: string, description?: string) =>
        api.put<PlatformSettingDto>(`/platform-settings/${key}`, { value, description }),
    uploadWatermarkImage: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<PlatformSettingDto>('/platform-settings/watermark-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};