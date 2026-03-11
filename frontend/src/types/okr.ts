export interface ScoreResult {
    score: number;
    level: string; // Dynamic level name from score levels configuration
    color: string;
    percentage: number;
}

export interface Threshold {
    below: number;
    meets: number;
    good: number;
    veryGood: number;
    exceptional: number;
}

export type MetricType = 'HIGHER_BETTER' | 'LOWER_BETTER' | 'QUALITATIVE';

export interface KeyResult {
    id: string;
    name: string;
    description?: string;
    metricType: MetricType;
    unit?: string;
    weight: number;
    thresholds: Threshold;
    actualValue: string;
    objectiveId: string;
    score?: ScoreResult;
    progress?: number | null; // 0-100%, null if user can't view
    attachmentUrl?: string;
    attachmentFileName?: string;
}

export interface Objective {
    id: string;
    name: string;
    weight: number;
    departmentId: string;
    keyResults: KeyResult[];
    score?: ScoreResult;
}

// Division types - defined before Department since Department references DivisionSummary
export interface DivisionSummary {
    id: string;
    name: string;
}

export interface UserSummary {
    id: string;
    username: string;
    fullName: string;
    email: string;
    profilePhotoUrl?: string;
}

export interface DepartmentSummary {
    id: string;
    name: string;
}

export interface Department {
    id: string;
    name: string;
    division?: DivisionSummary;
    divisionId?: string;
    objectives: Objective[];
    score?: ScoreResult; // Automatic OKR score (dept objectives only)
    finalScore?: ScoreResult; // Final combined score (60% OKR + 20% Director + 20% HR)
    hasAllEvaluations?: boolean; // True if department has both Director and HR evaluations
    /** Personal objectives belonging to the assigned department leader */
    leaderObjectives?: Objective[];
    /** Weighted OKR score from the leader's personal objectives */
    leaderScore?: ScoreResult;
    /** Full name of the assigned department leader */
    leaderName?: string;
    /** UUID of the assigned department leader */
    leaderId?: string;
}

export interface ScoreLevel {
    id?: string;
    name: string;
    scoreValue: number;
    color: string;
    displayOrder: number;
}

export interface Division {
    id: string;
    name: string;
    divisionLeader?: UserSummary;
    departments: DepartmentSummary[];
    createdAt?: string;
    updatedAt?: string;
}

export interface DivisionWithScore {
    id: string;
    name: string;
    score?: number;
    scoreLevel?: string;
    color?: string;
    percentage?: number;
}

export interface CreateDivisionRequest {
    name: string;
    leaderId?: string;
}

export interface UpdateDivisionRequest {
    name?: string;
    leaderId?: string;
}
