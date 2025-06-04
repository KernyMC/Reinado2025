// Database types based on PostgreSQL schema

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'judge' | 'admin' | 'superadmin' | 'notary' | 'user';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Candidate {
  id: string;
  name: string;
  major: string;
  department: string;
  image_url?: string;
  biography?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Event {
  id: string;
  name: string;
  event_type: 'typical_costume' | 'evening_gown' | 'qa';
  status: 'pending' | 'active' | 'closed';
  start_time?: Date;
  end_time?: Date;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface JudgeScore {
  id: string;
  judge_id: string;
  candidate_id: string;
  event_id: string;
  score: number;
  created_at: Date;
  updated_at: Date;
}

export interface PublicVote {
  id: string;
  voter_ip?: string;
  voter_session?: string;
  candidate_id: string;
  created_at: Date;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Report {
  id: string;
  report_type: string;
  file_url?: string;
  generated_by?: string;
  created_at: Date;
}

// View types
export interface CandidateResult {
  id: string;
  name: string;
  major: string;
  department: string;
  image_url?: string;
  event_type?: string;
  average_score?: number;
  judge_count: number;
  public_votes: number;
}

export interface GeneralRanking {
  id: string;
  name: string;
  major: string;
  department: string;
  image_url?: string;
  overall_average?: number;
  judge_count: number;
  public_votes: number;
} 