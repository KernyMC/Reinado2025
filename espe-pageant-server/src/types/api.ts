import { Request } from 'express';
import { User } from './database.js';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Request types
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateCandidateRequest {
  name: string;
  major: string;
  department: string;
  image_url?: string;
  biography?: string;
}

export interface UpdateCandidateRequest {
  name?: string;
  major?: string;
  department?: string;
  image_url?: string;
  biography?: string;
  is_active?: boolean;
}

export interface SubmitScoreRequest {
  candidate_id: string;
  event_id: string;
  score: number;
}

export interface SubmitVoteRequest {
  candidate_id: string;
  voter_session?: string;
}

export interface UpdateEventStatusRequest {
  status: 'pending' | 'active' | 'closed';
  start_time?: string;
  end_time?: string;
}

export interface CreateUserRequest {
  email: string;
  full_name: string;
  role: User['role'];
  password?: string;
}

export interface UpdateUserRequest {
  email?: string;
  full_name?: string;
  role?: User['role'];
  is_active?: boolean;
}

export interface GenerateReportRequest {
  report_type: string;
  filters?: {
    start_date?: string;
    end_date?: string;
    event_type?: string;
    candidate_ids?: string[];
  };
}

// WebSocket event types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
}

export interface VoteUpdateEvent extends WebSocketEvent {
  type: 'vote_update';
  data: {
    candidate_id: string;
    total_votes: number;
  };
}

export interface ScoreUpdateEvent extends WebSocketEvent {
  type: 'score_update';
  data: {
    candidate_id: string;
    event_id: string;
    judge_id: string;
    score: number;
  };
}

export interface EventStatusUpdateEvent extends WebSocketEvent {
  type: 'event_status_update';
  data: {
    event_id: string;
    status: 'pending' | 'active' | 'closed';
  };
} 