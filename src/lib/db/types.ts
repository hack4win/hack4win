/**
 * Domain Models & Types for Hack4Win Platform
 * 
 * Defines structured entities following Domain-Driven Design (DDD).
 */

export type UserRole = "user" | "organizer" | "judge" | "admin";

export interface User {
  id: string;
  name: string | null;
  username?: string | null;
  email: string;
  email_verified: boolean;
  image: string | null;
  banner_url?: string | null;
  role: UserRole;
  bio: string | null;
  github_username: string | null;
  skills: string[];
  website: string | null;
  country?: string | null;
  participation_type?: "solo" | "looking_for_team" | "has_team";
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdateInput {
  name?: string;
  username?: string;
  bio?: string;
  github_username?: string;
  skills?: string[];
  website?: string;
  image?: string;
  banner_url?: string;
  country?: string;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category?: string;
  created_at: string;
}

export interface CreateSkillInput {
  name: string;
  slug?: string;
  category?: string;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  username?: string | null;
  image: string | null;
  role: UserRole;
  emailVerified: boolean;
}

export interface SessionData {
  id: string;
  userId: string;
  expiresAt: string;
  token: string;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateUserInput {
  name: string;
  username?: string;
  email: string;
  role: UserRole;
  bio?: string;
  github_username?: string;
  skills?: string[];
  website?: string;
  image?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  category?: string;
  created_at: string;
}

export interface CreateTagInput {
  name: string;
  slug?: string;
  category?: string;
}

export type PrizeType = "cash" | "non-cash";

export interface PrizeTier {
  id: string;
  title: string;
  amount: string;
  type?: PrizeType;
  item_name?: string;
  description?: string;
}

export type HackathonPublishStatus = "draft" | "published";
export type HackathonStatus = "draft" | "published" | "upcoming" | "ongoing" | "ended";
export type HackathonFormat = "online" | "virtual" | "in-person" | "hybrid";

export interface Hackathon {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  banner_url: string | null;
  thumbnail_url: string | null;
  status: HackathonStatus;
  format: HackathonFormat;
  location: string;
  prize_pool: string;
  currency: string;
  prizes: PrizeTier[];
  tags: string[];
  rules?: string[];
  start_date: string;
  end_date: string;
  submission_deadline: string;
  max_team_size: number;
  max_participants?: number | null;
  website_url: string | null;
  organizer_id: string | null;
  organizer_name: string;
  created_at: string;
  updated_at: string;
  participant_count?: number;
  is_private?: boolean;
  access_code?: string | null;
  allowed_email_domains?: string[];
  invited_emails?: string[];
  invite_token?: string | null;
}

export interface CreateHackathonInput {
  title: string;
  slug?: string;
  tagline: string;
  description: string;
  banner_url?: string;
  thumbnail_url?: string;
  status?: HackathonStatus;
  format?: HackathonFormat;
  location?: string;
  prize_pool?: string;
  currency?: string;
  prizes?: PrizeTier[];
  tags?: string[];
  rules?: string[];
  start_date: string;
  end_date: string;
  submission_deadline?: string;
  max_team_size?: number;
  max_participants?: number | null;
  website_url?: string;
  organizer_id?: string;
  organizer_name: string;
  is_private?: boolean;
  access_code?: string | null;
  allowed_email_domains?: string[];
  invited_emails?: string[];
  invite_token?: string | null;
}

export type UpdateHackathonInput = Partial<CreateHackathonInput>;

/**
 * Calculates display status dynamically based on current time and start/end dates
 */
export function getHackathonStatus(hackathon: {
  status: string;
  start_date: string;
  end_date: string;
}): "draft" | "upcoming" | "ongoing" | "ended" {
  if (hackathon.status === "draft") {
    return "draft";
  }

  const now = new Date().getTime();
  const start = new Date(hackathon.start_date).getTime();
  const end = new Date(hackathon.end_date).getTime();

  if (now < start) {
    return "upcoming";
  } else if (now >= start && now <= end) {
    return "ongoing";
  } else {
    return "ended";
  }
}

export interface AuthSession {
  user: SessionUser;
  session: SessionData;
}

export type EmailType = "marketing" | "transactional";

export interface EmailCampaign {
  id: string;
  subject: string;
  type: EmailType;
  target_filter: string;
  target_label: string;
  recipient_count: number;
  recipient_emails?: string[];
  content: string;
  preheader?: string | null;
  status: "sent" | "draft" | "scheduled";
  sent_by: string | null;
  created_at: string;
}

export interface CreateEmailCampaignInput {
  subject: string;
  type: EmailType;
  target_filter: string;
  target_label: string;
  content: string;
  preheader?: string;
  recipient_emails?: string[];
  recipient_count?: number;
  sent_by?: string;
}

export interface SubmissionTeamMember {
  id: string;
  name: string | null;
  username?: string | null;
  image?: string | null;
  role?: string | null;
  email?: string | null;
  status?: "accepted" | "pending" | "declined";
  invite_id?: string | null;
  invited_at?: string | null;
}

export interface HackathonSubmission {
  id: string;
  hackathon_id: string;
  user_id: string;
  title: string;
  tagline: string | null;
  description: string;
  demo_url: string | null;
  github_url: string | null;
  video_url: string | null;
  cover_image: string | null;
  screenshots?: string[];
  tech_stack: string[];
  created_at: string;
  updated_at: string;
  is_featured?: boolean;
  status?: string;
  winner_badge?: string | null;
  total_score?: number | null;
  judging_status?: "unscored" | "in_review" | "scored" | string;
  evaluation_count?: number;
  user_name?: string | null;
  user_email?: string | null;
  user_image?: string | null;
  user_skills?: string[];
  hackathon_title?: string;
  hackathon_slug?: string;
  team_members?: SubmissionTeamMember[];
  team_member_ids?: string[];
}

export interface CreateSubmissionInput {
  hackathon_id: string;
  user_id: string;
  title: string;
  tagline?: string;
  description: string;
  demo_url?: string;
  github_url?: string;
  video_url?: string;
  cover_image?: string;
  screenshots?: string[];
  tech_stack?: string[];
  is_featured?: boolean;
  status?: string;
  winner_badge?: string | null;
  team_members?: SubmissionTeamMember[];
  team_member_ids?: string[];
}

export interface UpdateSubmissionInput {
  title?: string;
  tagline?: string | null;
  description?: string;
  demo_url?: string | null;
  github_url?: string | null;
  video_url?: string | null;
  cover_image?: string | null;
  screenshots?: string[];
  tech_stack?: string[];
  is_featured?: boolean;
  status?: string;
  winner_badge?: string | null;
  total_score?: number | null;
  judging_status?: string;
  team_members?: SubmissionTeamMember[];
  team_member_ids?: string[];
}

export interface ProjectEvaluation {
  id: string;
  submission_id: string;
  hackathon_id: string;
  judge_id: string;
  judge_name: string;
  judge_email: string;
  score_innovation: number;
  score_technical: number;
  score_design: number;
  score_impact: number;
  score_presentation: number;
  total_score: number;
  feedback?: string | null;
  award?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveEvaluationInput {
  submission_id: string;
  hackathon_id: string;
  judge_id: string;
  judge_name: string;
  judge_email: string;
  score_innovation: number;
  score_technical: number;
  score_design: number;
  score_impact: number;
  score_presentation: number;
  feedback?: string | null;
  award?: string | null;
}

export type ParticipationType = "solo" | "looking_for_team" | "has_team";

export interface UserHackathonParticipation {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  status: HackathonStatus;
  format: HackathonFormat;
  location: string;
  prize_pool: string;
  currency: string;
  banner_url: string | null;
  thumbnail_url: string | null;
  start_date: string;
  end_date: string;
  participation_type: ParticipationType;
  registered_at: string;
}

export interface UserProjectSubmission extends HackathonSubmission {
  hackathon_title: string;
  hackathon_slug: string;
  hackathon_banner?: string | null;
}

export interface TeamInvitation {
  id: string;
  hackathon_id: string;
  hackathon_title?: string;
  hackathon_slug?: string;
  sender_id: string;
  sender_name?: string;
  sender_image?: string | null;
  receiver_id: string | null;
  receiver_name?: string | null;
  receiver_email?: string | null;
  team_name?: string | null;
  message?: string | null;
  contact_info?: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  updated_at: string;
}
