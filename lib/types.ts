// Domain row types mirroring the Postgres schema in supabase/migrations/0001_init.sql

export type Team = {
  id: string;
  external_id: string;
  name: string;
  code: string | null;
  flag_url: string | null;
  group_label: string | null;
  created_at: string;
};

export type Player = {
  id: string;
  external_id: string;
  team_id: string | null;
  name: string;
  position: string | null;
  shirt_number: number | null;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  favorite_team_id: string | null;
  favorite_country: string | null;
  created_at: string;
};

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

export type Match = {
  id: string;
  external_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string;
  matchday: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
  updated_at: string;
};

export type League = {
  id: string;
  name: string;
  join_code: string;
  admin_id: string;
  created_at: string;
};

export type MemberRole = "admin" | "member";
export type MemberStatus = "pending" | "approved" | "rejected";

export type LeagueMember = {
  id: string;
  league_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  pred_home: number;
  pred_away: number;
  points: number | null;
  created_at: string;
  updated_at: string;
};

export type DailyScore = {
  id: string;
  league_id: string;
  user_id: string;
  match_date: string;
  base_points: number;
  bonus_points: number;
  total_points: number;
  updated_at: string;
};

export type GlobalScore = {
  user_id: string;
  total_points: number;
  updated_at: string;
};
