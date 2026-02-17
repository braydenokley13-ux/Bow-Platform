export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export interface PortalActionEnvelope<T> {
  ok: boolean;
  code: string;
  message: string;
  data: T;
}

export interface PortalActor {
  email: string;
  role: Role;
}

export interface ActivityItem {
  track: string;
  module_id: string;
  lesson_id: number;
  lesson_title: string;
  activity_url: string;
  xp_value: number;
  next_lesson_id: number;
  status: string;
  recommended_order: number;
}

export interface Raffle {
  raffle_id: string;
  title: string;
  prize: string;
  opens_at: string;
  closes_at: string;
  status: string;
  winner_email: string;
  winner_drawn_at: string;
  created_by: string;
  created_at: string;
}

export interface RaffleEntry {
  entry_id: string;
  raffle_id: string;
  email: string;
  tickets_spent: number;
  created_at: string;
}

export interface RaffleTicketBalance {
  email: string;
  earned: number;
  adjustments: number;
  available: number;
  formula: string;
}

export interface ApiErrorShape {
  error: string;
  code?: string;
  details?: unknown;
}
