// Mirror of evaluation-back-end/shared/types.ts (Source of Truth).
// Sync via scripts/sync-types.sh in backend repo.

export type Role = 'judge' | 'admin';

export interface Judge {
  _id: string;
  name: string;
  active: boolean;
  role: Role;
  createdAt?: string;
}

export interface Division {
  _id: string;
  name: string;
}

export interface Team {
  _id: string;
  divisionId: string;
  name: string;
  projectName: string;
  owner: string;
  members: string[];
  oneLiner: string;
}

export interface Criterion {
  _id: string;
  name: string;
  weight: number; // percent (e.g. 20, 30)
  indicator: string;
  order: number;
}

export interface CriterionScore {
  criterionId: string;
  value: number; // 1~5 step 0.5
}

export interface Evaluation {
  _id?: string;
  judgeId: string;
  teamId: string;
  scores: CriterionScore[];
  comment: string;
  version: number;
  updatedAt?: string;
}

export interface Settings {
  _id: 'singleton';
  disclosureOpen: boolean;
  updatedAt?: string;
}

export interface RankedTeam {
  teamId: string;
  divisionId: string;
  totalAvg: number;
  perCriterionAvg: Record<string, number>;
  stddev: number | null;
  submittedJudgeCount: number;
  needsTfDecision: boolean;
}

export interface LoginRequest {
  name: string;
  pin: string;
}

export interface LoginResponse {
  token: string;
  judge: Judge;
}

export interface AdminProgressRow {
  judgeId: string;
  judgeName: string;
  completed: number;
  total: number;
}
