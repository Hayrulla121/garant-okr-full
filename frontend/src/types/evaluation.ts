export enum EvaluatorType {
  DIRECTOR = 'DIRECTOR',
  HR = 'HR',
  BUSINESS_BLOCK = 'BUSINESS_BLOCK'
}

export enum EvaluationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED'
}

export interface Evaluation {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorType: EvaluatorType;
  targetType: string;
  targetId: string;
  numericRating?: number;
  letterRating?: string;
  comment?: string;
  status: EvaluationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string;
}

export interface EvaluationCreateRequest {
  targetType: string;
  targetId: string;
  evaluatorType: EvaluatorType;
  numericRating?: number;
  starRating?: number;
  letterRating?: string;
  comment?: string;
}

export type DisciplinaryStatus = 'NONE' | 'WATCH' | 'WARNING' | 'FINE' | 'TERMINATION_RISK';

export interface EmployeeEvaluationSummary {
  userId: string;
  userFullName: string;
  totalEvaluations: number;
  belowExpectationsCount: number;
  disciplinaryStatus: DisciplinaryStatus;
  disciplinaryDescription: string;
  recentEvaluations: Evaluation[];
}

export interface DepartmentScoreResult {
  automaticOkrScore: number;
  automaticOkrPercentage: number;
  directorName?: string;
  directorAvatar?: string;
  directorEvaluation?: number;
  directorStars?: number;
  directorComment?: string;
  hrName?: string;
  hrAvatar?: string;
  hrEvaluationLetter?: string;
  hrEvaluationNumeric?: number;
  hrComment?: string;
  businessBlockName?: string;
  businessBlockAvatar?: string;
  businessBlockEvaluation?: number;
  businessBlockStars?: number;
  businessBlockComment?: string;
  finalCombinedScore?: number;
  finalPercentage?: number;
  scoreLevel: string;
  color: string;
  hasDirectorEvaluation: boolean;
  hasHrEvaluation: boolean;
  hasBusinessBlockEvaluation: boolean;
  directorSubmittedAt?: string;
  directorUpdatedAt?: string;
  hrSubmittedAt?: string;
  hrUpdatedAt?: string;
  businessBlockSubmittedAt?: string;
  businessBlockUpdatedAt?: string;
}
