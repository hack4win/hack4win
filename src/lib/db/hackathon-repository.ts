import { db } from "./index";
import {
  Hackathon,
  CreateHackathonInput,
  UpdateHackathonInput,
  HackathonStatus,
  User,
  HackathonSubmission,
  CreateSubmissionInput,
  UpdateSubmissionInput,
  SubmissionTeamMember,
  ProjectEvaluation,
  SaveEvaluationInput,
  RegisteredStudent,
} from "./types";
import { generateSlug } from "../utils/slug";

export { generateSlug };

/**
 * IHackathonRepository Interface
 * Follows Interface Segregation Principle (ISP) & Single Responsibility Principle (SRP)
 */
export interface IHackathonRepository {
  findById(id: string): Promise<Hackathon | null>;
  findBySlug(slug: string): Promise<Hackathon | null>;
  createHackathon(input: CreateHackathonInput): Promise<Hackathon>;
  updateHackathon(id: string, input: UpdateHackathonInput): Promise<Hackathon>;
  deleteHackathon(id: string): Promise<void>;
  listHackathons(params?: {
    status?: string;
    search?: string;
    tag?: string;
    limit?: number;
    offset?: number;
    includeDrafts?: boolean;
  }): Promise<Hackathon[]>;
  getStats(): Promise<{
    total: number;
    upcoming: number;
    ongoing: number;
    ended: number;
  }>;
  isUserRegistered(hackathonId: string, userId: string): Promise<boolean>;
  getUserRegistration(
    hackathonId: string,
    userId: string
  ): Promise<{ registered: boolean; participation_type: string; status: "approved" | "pending" | "rejected" } | null>;
  registerUser(
    hackathonId: string,
    userId: string,
    participationType?: string,
    studentData?: {
      student_id?: string | null;
      college_name?: string | null;
      academic_year?: string | null;
      branch?: string | null;
      status?: "approved" | "pending" | "rejected";
    }
  ): Promise<boolean>;
  updateRegistrationStatus(
    hackathonId: string,
    userId: string,
    status: "approved" | "pending" | "rejected"
  ): Promise<boolean>;
  unregisterUser(hackathonId: string, userId: string): Promise<boolean>;
  getParticipantCount(hackathonId: string): Promise<number>;
  getParticipants(hackathonId: string, limit?: number): Promise<User[]>;
  getSubmissions(hackathonId: string): Promise<HackathonSubmission[]>;
  getAllSubmissions(params?: {
    hackathonId?: string;
    isFeatured?: boolean;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
    includeDraftHackathons?: boolean;
  }): Promise<HackathonSubmission[]>;
  getFeaturedSubmissions(limit?: number): Promise<HackathonSubmission[]>;
  getSubmissionById(id: string): Promise<HackathonSubmission | null>;
  createSubmission(input: CreateSubmissionInput): Promise<HackathonSubmission>;
  updateSubmission(id: string, input: UpdateSubmissionInput): Promise<HackathonSubmission>;
  deleteSubmission(id: string): Promise<boolean>;
  getSubmissionStats(): Promise<{
    total: number;
    featured: number;
    approved: number;
    under_review: number;
    uniqueHackathons: number;
    totalBuilders: number;
  }>;
  getUserSubmission(hackathonId: string, userId: string): Promise<HackathonSubmission | null>;
  updateSubmissionTeamMemberStatus(
    hackathonId: string,
    memberIdentifier: string,
    status: "accepted" | "declined",
    resolvedUserId?: string,
    options?: {
      senderId?: string;
      memberName?: string;
      memberImage?: string | null;
      memberRole?: string;
    }
  ): Promise<void>;
  saveEvaluation(input: SaveEvaluationInput): Promise<ProjectEvaluation>;
  getEvaluationsBySubmission(submissionId: string): Promise<ProjectEvaluation[]>;
  getEvaluationsByHackathon(hackathonId: string): Promise<ProjectEvaluation[]>;
  getJudgingLeaderboard(hackathonId: string): Promise<HackathonSubmission[]>;
  assignJudge(hackathonId: string, judgeId: string, invitedBy?: string): Promise<void>;
  removeJudge(hackathonId: string, judgeId: string): Promise<void>;
  getJudgesForOrganizer(organizerId: string, isSuperAdmin?: boolean): Promise<Array<{
    id: string;
    judge_id: string;
    name: string;
    email: string;
    username: string | null;
    image: string | null;
    hackathon_id: string;
    hackathon_title: string;
    hackathon_slug: string;
    assigned_at: string;
    evaluation_count: number;
  }>>;
  getHackathonsForJudge(judgeId: string, isSuperAdmin?: boolean): Promise<Hackathon[]>;
  verifyPrivateAccess(
    hackathon: Hackathon,
    options: {
      userId?: string;
      userEmail?: string;
      accessCode?: string;
      inviteToken?: string;
      userRole?: string;
    }
  ): Promise<{ allowed: boolean; reason?: string }>;
  getRegisteredStudents(hackathonId: string): Promise<Array<{
    user_id: string;
    name: string;
    email: string;
    username: string | null;
    image: string | null;
    registered_at: string;
    participation_type: string;
  }>>;
  updateInvitedEmails(hackathonId: string, emails: string[]): Promise<string[]>;
  regenerateInviteToken(hackathonId: string): Promise<string>;
}

function mapHackathonRow(row: Record<string, unknown>): Hackathon {
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : [],
    rules: Array.isArray(row.rules) ? row.rules : [],
    prizes: Array.isArray(row.prizes) ? row.prizes : [],
    allowed_email_domains: Array.isArray(row.allowed_email_domains) ? row.allowed_email_domains : [],
    invited_emails: Array.isArray(row.invited_emails) ? row.invited_emails : [],
    is_private: Boolean(row.is_private),
    access_code: row.access_code || null,
    invite_token: row.invite_token || null,
    participant_count:
      typeof row.participant_count === "number"
        ? row.participant_count
        : row.participant_count !== undefined && row.participant_count !== null
        ? Number(row.participant_count)
        : 0,
    max_participants:
      row.max_participants != null ? Number(row.max_participants) : null,
  } as Hackathon;
}

/**
 * PostgreSQL Implementation of IHackathonRepository
 */
export class HackathonRepository implements IHackathonRepository {
  /**
   * Find hackathon by primary ID
   */
  async findById(id: string): Promise<Hackathon | null> {
    const rows = await db`
      SELECT 
        h.*, 
        COALESCE(r.p_count, 0)::int as participant_count
      FROM public.hackathons h
      LEFT JOIN (
        SELECT hackathon_id, COUNT(*)::int as p_count 
        FROM public.hackathon_registrations 
        GROUP BY hackathon_id
      ) r ON r.hackathon_id = h.id
      WHERE h.id = ${id}::uuid
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) return null;
    return mapHackathonRow(rows[0]);
  }

  /**
   * Find hackathon by URL slug
   */
  async findBySlug(slug: string): Promise<Hackathon | null> {
    const rows = await db`
      SELECT 
        h.*, 
        COALESCE(r.p_count, 0)::int as participant_count
      FROM public.hackathons h
      LEFT JOIN (
        SELECT hackathon_id, COUNT(*)::int as p_count 
        FROM public.hackathon_registrations 
        GROUP BY hackathon_id
      ) r ON r.hackathon_id = h.id
      WHERE h.slug = ${slug.toLowerCase().trim()}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) return null;
    return mapHackathonRow(rows[0]);
  }

  /**
   * Create a new Hackathon (Admin / Organizer)
   */
  async createHackathon(input: CreateHackathonInput): Promise<Hackathon> {
    let slug = input.slug ? generateSlug(input.slug) : generateSlug(input.title);

    // Ensure unique slug
    const existingSlug = await this.findBySlug(slug);
    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const title = input.title.trim();
    const tagline = input.tagline.trim();
    const description = input.description.trim();
    const banner_url = input.banner_url || null;
    const thumbnail_url = input.thumbnail_url || null;
    const status = input.status || "upcoming";
    const format = input.format || "online";
    const location = input.location || (format === "online" ? "Global (Online)" : "TBD");
    const prize_pool = input.prize_pool || "$0";
    const currency = input.currency || "$";
    const prizes = JSON.stringify(input.prizes || []);
    const tags = Array.isArray(input.tags) ? input.tags : [];
    const rawRules = input.rules as unknown;
    const rules =
      typeof rawRules === "string"
        ? rawRules.split("\n").map((r: string) => r.trim()).filter(Boolean)
        : Array.isArray(rawRules)
        ? (rawRules as string[])
        : [];
    const start_date = new Date(input.start_date).toISOString();
    const end_date = new Date(input.end_date).toISOString();
    const submission_deadline = input.submission_deadline
      ? new Date(input.submission_deadline).toISOString()
      : end_date;
    const max_team_size = input.max_team_size || 4;
    const max_participants =
      input.max_participants !== undefined && input.max_participants !== null && Number(input.max_participants) > 0
        ? Number(input.max_participants)
        : null;
    const website_url = input.website_url || null;
    const organizer_id = input.organizer_id || null;
    const organizer_name = input.organizer_name || "Hack4Win Platform";
    const is_private = Boolean(input.is_private);
    const access_code = input.access_code ? input.access_code.trim().toUpperCase() : null;
    const allowed_email_domains = (input.allowed_email_domains || [])
      .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);
    const invited_emails = (input.invited_emails || [])
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const invite_token =
      input.invite_token || (is_private ? crypto.randomUUID().replace(/-/g, "").substring(0, 16) : null);

    const rows = await db`
      INSERT INTO public.hackathons (
        title, slug, tagline, description, banner_url, thumbnail_url,
        status, format, location, prize_pool, currency, prizes, tags, rules,
        start_date, end_date, submission_deadline, max_team_size, max_participants,
        website_url, organizer_id, organizer_name,
        is_private, access_code, allowed_email_domains, invited_emails, invite_token,
        created_at, updated_at
      )
      VALUES (
        ${title}, ${slug}, ${tagline}, ${description}, ${banner_url}, ${thumbnail_url},
        ${status}, ${format}, ${location}, ${prize_pool}, ${currency}, ${prizes}::jsonb, ${tags}, ${rules},
        ${start_date}, ${end_date}, ${submission_deadline}, ${max_team_size}, ${max_participants},
        ${website_url}, ${organizer_id}, ${organizer_name},
        ${is_private}, ${access_code}, ${allowed_email_domains}, ${invited_emails}, ${invite_token},
        NOW(), NOW()
      )
      RETURNING *;
    `;

    return mapHackathonRow(rows[0]);
  }

  /**
   * Update an existing hackathon
   */
  async updateHackathon(id: string, input: UpdateHackathonInput): Promise<Hackathon> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Hackathon with ID ${id} not found`);
    }

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    let slug = input.slug !== undefined ? generateSlug(input.slug) : existing.slug;
    if (slug !== existing.slug) {
      let candidate = slug;
      let existingSlug = await this.findBySlug(candidate);
      while (existingSlug && existingSlug.id !== id) {
        candidate = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
        existingSlug = await this.findBySlug(candidate);
      }
      slug = candidate;
    }
    const tagline = input.tagline !== undefined ? input.tagline.trim() : existing.tagline;
    const description = input.description !== undefined ? input.description.trim() : existing.description;
    const banner_url = input.banner_url !== undefined ? input.banner_url : existing.banner_url;
    const thumbnail_url = input.thumbnail_url !== undefined ? input.thumbnail_url : existing.thumbnail_url;
    const status = input.status !== undefined ? input.status : existing.status;
    const format = input.format !== undefined ? input.format : existing.format;
    const location = input.location !== undefined ? input.location : existing.location;
    const prize_pool = input.prize_pool !== undefined ? input.prize_pool : existing.prize_pool;
    const currency = input.currency !== undefined ? input.currency : existing.currency || "$";
    const prizes = input.prizes !== undefined ? JSON.stringify(input.prizes) : JSON.stringify(existing.prizes || []);
    const tags = input.tags !== undefined ? (Array.isArray(input.tags) ? input.tags : []) : existing.tags;
    const rawInputRules = input.rules as unknown;
    const rules =
      rawInputRules !== undefined
        ? typeof rawInputRules === "string"
          ? rawInputRules.split("\n").map((r: string) => r.trim()).filter(Boolean)
          : Array.isArray(rawInputRules)
          ? (rawInputRules as string[])
          : []
        : existing.rules || [];
    const start_date = input.start_date !== undefined ? new Date(input.start_date).toISOString() : existing.start_date;
    const end_date = input.end_date !== undefined ? new Date(input.end_date).toISOString() : existing.end_date;
    const submission_deadline = input.submission_deadline !== undefined
      ? new Date(input.submission_deadline).toISOString()
      : existing.submission_deadline;
    const max_team_size = input.max_team_size !== undefined ? input.max_team_size : existing.max_team_size;
    const max_participants =
      input.max_participants !== undefined
        ? (input.max_participants !== null && Number(input.max_participants) > 0 ? Number(input.max_participants) : null)
        : (existing.max_participants ?? null);
    const website_url = input.website_url !== undefined ? input.website_url : existing.website_url;
    const organizer_name = input.organizer_name !== undefined ? input.organizer_name : existing.organizer_name;
    const is_private = input.is_private !== undefined ? Boolean(input.is_private) : Boolean(existing.is_private);
    const access_code =
      input.access_code !== undefined
        ? (input.access_code ? input.access_code.trim().toUpperCase() : null)
        : existing.access_code;
    const allowed_email_domains =
      input.allowed_email_domains !== undefined
        ? input.allowed_email_domains.map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean)
        : (existing.allowed_email_domains || []);
    const invited_emails =
      input.invited_emails !== undefined
        ? input.invited_emails.map((e) => e.trim().toLowerCase()).filter(Boolean)
        : (existing.invited_emails || []);
    const invite_token =
      input.invite_token !== undefined
        ? input.invite_token
        : existing.invite_token || (is_private ? crypto.randomUUID().replace(/-/g, "").substring(0, 16) : null);

    const rows = await db`
      UPDATE public.hackathons
      SET
        title = ${title},
        slug = ${slug},
        tagline = ${tagline},
        description = ${description},
        banner_url = ${banner_url},
        thumbnail_url = ${thumbnail_url},
        status = ${status},
        format = ${format},
        location = ${location},
        prize_pool = ${prize_pool},
        currency = ${currency},
        prizes = ${prizes}::jsonb,
        tags = ${tags},
        rules = ${rules},
        start_date = ${start_date},
        end_date = ${end_date},
        submission_deadline = ${submission_deadline},
        max_team_size = ${max_team_size},
        max_participants = ${max_participants},
        website_url = ${website_url},
        organizer_name = ${organizer_name},
        is_private = ${is_private},
        access_code = ${access_code},
        allowed_email_domains = ${allowed_email_domains},
        invited_emails = ${invited_emails},
        invite_token = ${invite_token},
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *;
    `;

    return mapHackathonRow(rows[0]);
  }

  /**
   * Delete a hackathon
   */
  async deleteHackathon(id: string): Promise<void> {
    await db`DELETE FROM public.hackathons WHERE id = ${id}::uuid;`;
  }

  /**
   * List hackathons with optional filters
   */
  async listHackathons(params?: {
    status?: string;
    search?: string;
    tag?: string;
    limit?: number;
    offset?: number;
    includeDrafts?: boolean;
  }): Promise<Hackathon[]> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const search = params?.search ? `%${params.search.toLowerCase()}%` : null;
    const status = params?.status && params.status !== "all" ? params.status : null;
    const tag = params?.tag ? params.tag.toLowerCase() : null;
    const includeDrafts = Boolean(params?.includeDrafts);

    // If caller specifically requested status="draft", but includeDrafts is false,
    // deny draft visibility to public/unprivileged queries by returning empty list.
    if (status === "draft" && !includeDrafts) {
      return [];
    }

    if (search && status) {
      const rows = await db`
        SELECT 
          h.*,
          COALESCE(r.p_count, 0)::int as participant_count
        FROM public.hackathons h
        LEFT JOIN (
          SELECT hackathon_id, COUNT(*)::int as p_count 
          FROM public.hackathon_registrations 
          GROUP BY hackathon_id
        ) r ON r.hackathon_id = h.id
        WHERE h.status = ${status}
          AND (${includeDrafts}::boolean = true OR h.status != 'draft')
          AND (LOWER(h.title) LIKE ${search} OR LOWER(h.tagline) LIKE ${search} OR LOWER(h.organizer_name) LIKE ${search})
        ORDER BY h.start_date DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
      return rows.map(mapHackathonRow);
    }

    if (search) {
      const rows = await db`
        SELECT 
          h.*,
          COALESCE(r.p_count, 0)::int as participant_count
        FROM public.hackathons h
        LEFT JOIN (
          SELECT hackathon_id, COUNT(*)::int as p_count 
          FROM public.hackathon_registrations 
          GROUP BY hackathon_id
        ) r ON r.hackathon_id = h.id
        WHERE (${includeDrafts}::boolean = true OR h.status != 'draft')
          AND (LOWER(h.title) LIKE ${search} OR LOWER(h.tagline) LIKE ${search} OR LOWER(h.organizer_name) LIKE ${search})
        ORDER BY h.start_date DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
      return rows.map(mapHackathonRow);
    }

    if (status) {
      const rows = await db`
        SELECT 
          h.*,
          COALESCE(r.p_count, 0)::int as participant_count
        FROM public.hackathons h
        LEFT JOIN (
          SELECT hackathon_id, COUNT(*)::int as p_count 
          FROM public.hackathon_registrations 
          GROUP BY hackathon_id
        ) r ON r.hackathon_id = h.id
        WHERE h.status = ${status}
          AND (${includeDrafts}::boolean = true OR h.status != 'draft')
        ORDER BY h.start_date DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
      return rows.map(mapHackathonRow);
    }

    const rows = await db`
      SELECT 
        h.*,
        COALESCE(r.p_count, 0)::int as participant_count
      FROM public.hackathons h
      LEFT JOIN (
        SELECT hackathon_id, COUNT(*)::int as p_count 
        FROM public.hackathon_registrations 
        GROUP BY hackathon_id
      ) r ON r.hackathon_id = h.id
      WHERE (${includeDrafts}::boolean = true OR h.status != 'draft')
      ORDER BY h.start_date DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
    return rows.map(mapHackathonRow);
  }

  /**
   * Get platform hackathon metrics
   */
  async getStats(options?: { includeDrafts?: boolean }): Promise<{
    total: number;
    upcoming: number;
    ongoing: number;
    ended: number;
  }> {
    const includeDrafts = Boolean(options?.includeDrafts);
    const totalResult = includeDrafts
      ? await db`SELECT COUNT(*)::int as count FROM public.hackathons;`
      : await db`SELECT COUNT(*)::int as count FROM public.hackathons WHERE status != 'draft';`;
    const upcomingResult = await db`SELECT COUNT(*)::int as count FROM public.hackathons WHERE status = 'upcoming';`;
    const ongoingResult = await db`SELECT COUNT(*)::int as count FROM public.hackathons WHERE status = 'ongoing';`;
    const endedResult = await db`SELECT COUNT(*)::int as count FROM public.hackathons WHERE status = 'ended';`;

    return {
      total: totalResult[0]?.count ?? 0,
      upcoming: upcomingResult[0]?.count ?? 0,
      ongoing: ongoingResult[0]?.count ?? 0,
      ended: endedResult[0]?.count ?? 0,
    };
  }

  /**
   * Check if user is registered for a hackathon
   */
  async isUserRegistered(hackathonId: string, userId: string): Promise<boolean> {
    try {
      const rows = await db`
        SELECT 1 FROM public.hackathon_registrations
        WHERE hackathon_id = ${hackathonId}::uuid AND user_id = ${userId}
        LIMIT 1;
      `;
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Register a user for a hackathon with participation type (solo vs looking_for_team) and student details
   */
  async registerUser(
    hackathonId: string,
    userId: string,
    participationType: string = "looking_for_team",
    studentData?: {
      student_id?: string | null;
      college_name?: string | null;
      academic_year?: string | null;
      branch?: string | null;
      status?: "approved" | "pending" | "rejected";
    }
  ): Promise<boolean> {
    const studentId = studentData?.student_id || null;
    const collegeName = studentData?.college_name || null;
    const academicYear = studentData?.academic_year || null;
    const branch = studentData?.branch || null;
    const status = studentData?.status || "approved";

    await db`
      INSERT INTO public.hackathon_registrations (
        hackathon_id, user_id, participation_type, student_id, college_name, academic_year, branch, status, created_at
      )
      VALUES (
        ${hackathonId}::uuid, ${userId}, ${participationType}, ${studentId}, ${collegeName}, ${academicYear}, ${branch}, ${status}, NOW()
      )
      ON CONFLICT (hackathon_id, user_id) DO UPDATE SET 
        participation_type = EXCLUDED.participation_type,
        student_id = COALESCE(EXCLUDED.student_id, hackathon_registrations.student_id),
        college_name = COALESCE(EXCLUDED.college_name, hackathon_registrations.college_name),
        academic_year = COALESCE(EXCLUDED.academic_year, hackathon_registrations.academic_year),
        branch = COALESCE(EXCLUDED.branch, hackathon_registrations.branch),
        status = CASE
          WHEN hackathon_registrations.status = 'rejected' THEN EXCLUDED.status
          ELSE hackathon_registrations.status
        END;
    `;
    return true;
  }

  /**
   * Get registration details for a user in a hackathon
   */
  async getUserRegistration(
    hackathonId: string,
    userId: string
  ): Promise<{ registered: boolean; participation_type: string; status: "approved" | "pending" | "rejected" } | null> {
    try {
      const rows = await db`
        SELECT * FROM public.hackathon_registrations
        WHERE hackathon_id = ${hackathonId}::uuid AND user_id = ${userId}
        LIMIT 1;
      `;
      if (rows.length === 0) return null;
      return {
        registered: true,
        participation_type: rows[0].participation_type || "looking_for_team",
        status: (rows[0].status as "approved" | "pending" | "rejected") || "approved",
      };
    } catch {
      return null;
    }
  }

  /**
   * Update student verification status
   */
  async updateRegistrationStatus(
    hackathonId: string,
    userId: string,
    status: "approved" | "pending" | "rejected"
  ): Promise<boolean> {
    await db`
      UPDATE public.hackathon_registrations
      SET status = ${status}
      WHERE hackathon_id = ${hackathonId}::uuid AND user_id = ${userId};
    `;
    return true;
  }

  /**
   * Unregister a user from a hackathon
   */
  async unregisterUser(hackathonId: string, userId: string): Promise<boolean> {
    await db`
      DELETE FROM public.hackathon_registrations
      WHERE hackathon_id = ${hackathonId}::uuid AND user_id = ${userId};
    `;
    return true;
  }

  /**
   * Get registered participant count for a hackathon
   */
  async getParticipantCount(hackathonId: string): Promise<number> {
    try {
      const rows = await db`
        SELECT COUNT(*)::int as count FROM public.hackathon_registrations
        WHERE hackathon_id = ${hackathonId}::uuid;
      `;
      return rows[0]?.count ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get registered participants list for a hackathon
   */
  async getParticipants(hackathonId: string, limit: number = 100): Promise<User[]> {
    try {
      const rows = await db`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.email_verified,
          u.image,
          u.banner_url,
          u.role,
          u.bio,
          u.github_username,
          COALESCE(u.skills, ARRAY[]::text[]) as skills,
          u.website,
          u.country,
          u.created_at,
          u.updated_at,
          COALESCE(r.participation_type, 'looking_for_team') as participation_type,
          r.created_at as registered_at
        FROM public.hackathon_registrations r
        JOIN public.users u ON u.id = r.user_id
        WHERE r.hackathon_id = ${hackathonId}::uuid
        ORDER BY r.created_at DESC
        LIMIT ${limit};
      `;

      return rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string | null,
        email: r.email as string,
        email_verified: Boolean(r.email_verified),
        image: r.image as string | null,
        banner_url: r.banner_url as string | null,
        role: (r.role as "user" | "organizer" | "admin" | "judge") || "user",
        bio: r.bio as string | null,
        github_username: r.github_username as string | null,
        skills: Array.isArray(r.skills) ? (r.skills as string[]) : [],
        website: r.website as string | null,
        country: (r.country as string) || "India",
        participation_type: (r.participation_type as "solo" | "looking_for_team" | "has_team") || "looking_for_team",
        created_at: (r.registered_at || r.created_at) as string,
        updated_at: r.updated_at as string,
      }));
    } catch (err) {
      console.error("[getParticipants Error]:", err);
      return [];
    }
  }

  /**
   * Get all project submissions for a hackathon
   */
  /**
   * Get all project submissions for a hackathon
   */
  async getSubmissions(hackathonId: string): Promise<HackathonSubmission[]> {
    return this.getAllSubmissions({ hackathonId });
  }

  /**
   * Get all submissions across hackathons with optional filters (Admin & Directory)
   */
  async getAllSubmissions(params?: {
    hackathonId?: string;
    isFeatured?: boolean;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
    includeDraftHackathons?: boolean;
  }): Promise<HackathonSubmission[]> {
    try {
      const limit = params?.limit ?? 100;
      const offset = params?.offset ?? 0;
      const search = params?.search ? `%${params.search.toLowerCase()}%` : null;
      const hackathonId = params?.hackathonId && params.hackathonId !== "all" ? params.hackathonId : null;
      const isFeatured = typeof params?.isFeatured === "boolean" ? params.isFeatured : null;
      const status = params?.status && params.status !== "all" ? params.status : null;
      const includeDraftHackathons = Boolean(params?.includeDraftHackathons);

      const rows = await db`
        SELECT 
          s.id,
          s.hackathon_id,
          s.user_id,
          s.title,
          s.tagline,
          s.description,
          s.demo_url,
          s.github_url,
          s.video_url,
          s.cover_image,
          COALESCE(s.screenshots, ARRAY[]::text[]) as screenshots,
          COALESCE(s.tech_stack, ARRAY[]::text[]) as tech_stack,
          s.team_members,
          COALESCE(s.team_member_ids, ARRAY[]::text[]) as team_member_ids,
          COALESCE(s.is_featured, false) as is_featured,
          COALESCE(s.status, 'approved') as status,
          s.winner_badge,
          s.total_score,
          COALESCE(s.judging_status, 'unscored') as judging_status,
          s.created_at,
          s.updated_at,
          u.name as user_name,
          u.email as user_email,
          u.image as user_image,
          COALESCE(u.skills, ARRAY[]::text[]) as user_skills,
          h.title as hackathon_title,
          h.slug as hackathon_slug
        FROM public.hackathon_submissions s
        LEFT JOIN public.users u ON u.id = s.user_id
        LEFT JOIN public.hackathons h ON h.id = s.hackathon_id
        WHERE 
          (${hackathonId}::uuid IS NULL OR s.hackathon_id = ${hackathonId}::uuid)
          AND (${isFeatured}::boolean IS NULL OR COALESCE(s.is_featured, false) = ${isFeatured}::boolean)
          AND (${status}::text IS NULL OR COALESCE(s.status, 'approved') = ${status}::text)
          AND (${includeDraftHackathons}::boolean = true OR (h.status IS NULL OR h.status != 'draft'))
          AND (${search}::text IS NULL OR (
            LOWER(s.title) LIKE ${search}::text OR 
            LOWER(COALESCE(s.tagline, '')) LIKE ${search}::text OR 
            LOWER(COALESCE(u.name, '')) LIKE ${search}::text OR 
            LOWER(COALESCE(h.title, '')) LIKE ${search}::text
          ))
        ORDER BY s.is_featured DESC, s.created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;

      return rows.map((r: Record<string, unknown>) => {
        let teamMembers = Array.isArray(r.team_members) ? (r.team_members as SubmissionTeamMember[]) : [];
        if (teamMembers.length === 0 && (r.user_name || r.user_id)) {
          teamMembers = [
            {
              id: (r.user_id as string) || "",
              name: (r.user_name as string) || "Builder",
              image: (r.user_image as string) || null,
              role: "Creator",
              status: "accepted",
            },
          ];
        }

        return {
          id: r.id as string,
          hackathon_id: r.hackathon_id as string,
          user_id: r.user_id as string,
          title: r.title as string,
          tagline: (r.tagline as string) || null,
          description: (r.description as string) || "",
          demo_url: (r.demo_url as string) || null,
          github_url: (r.github_url as string) || null,
          video_url: (r.video_url as string) || null,
          cover_image: (r.cover_image as string) || null,
          screenshots: Array.isArray(r.screenshots) ? (r.screenshots as string[]) : [],
          tech_stack: Array.isArray(r.tech_stack) ? (r.tech_stack as string[]) : [],
          is_featured: Boolean(r.is_featured),
          status: (r.status as string) || "approved",
          winner_badge: (r.winner_badge as string) || null,
          total_score: typeof r.total_score === "number" ? r.total_score : (r.total_score ? Number(r.total_score) : null),
          judging_status: (r.judging_status as string) || "unscored",
          created_at: typeof r.created_at === "object" && r.created_at !== null ? (r.created_at as Date).toISOString() : String(r.created_at || ""),
          updated_at: typeof r.updated_at === "object" && r.updated_at !== null ? (r.updated_at as Date).toISOString() : String(r.updated_at || ""),
          user_name: (r.user_name as string) || null,
          user_email: (r.user_email as string) || null,
          user_image: (r.user_image as string) || null,
          user_skills: Array.isArray(r.user_skills) ? (r.user_skills as string[]) : [],
          hackathon_title: (r.hackathon_title as string) || undefined,
          hackathon_slug: (r.hackathon_slug as string) || undefined,
          team_members: teamMembers,
          team_member_ids: Array.isArray(r.team_member_ids) ? (r.team_member_ids as string[]) : [(r.user_id as string)],
        };
      });
    } catch (err) {
      console.error("[getAllSubmissions Error]:", err);
      return [];
    }
  }

  /**
   * Get featured submissions for landing page showcase
   */
  async getFeaturedSubmissions(limit: number = 6): Promise<HackathonSubmission[]> {
    try {
      let featured = await this.getAllSubmissions({ isFeatured: true, limit, includeDraftHackathons: false });
      if (featured.length < limit) {
        const remaining = limit - featured.length;
        const additional = await this.getAllSubmissions({
          isFeatured: false,
          status: "approved",
          limit: remaining,
          includeDraftHackathons: false,
        });
        featured = [...featured, ...additional];
      }
      return featured;
    } catch (err) {
      console.error("[getFeaturedSubmissions Error]:", err);
      return [];
    }
  }

  /**
   * Get single submission by ID with joined user and hackathon metadata
   */
  async getSubmissionById(id: string): Promise<HackathonSubmission | null> {
    try {
      const rows = await db`
        SELECT 
          s.id,
          s.hackathon_id,
          s.user_id,
          s.title,
          s.tagline,
          s.description,
          s.demo_url,
          s.github_url,
          s.video_url,
          s.cover_image,
          COALESCE(s.screenshots, ARRAY[]::text[]) as screenshots,
          COALESCE(s.tech_stack, ARRAY[]::text[]) as tech_stack,
          s.team_members,
          COALESCE(s.team_member_ids, ARRAY[]::text[]) as team_member_ids,
          COALESCE(s.is_featured, false) as is_featured,
          COALESCE(s.status, 'approved') as status,
          s.winner_badge,
          s.total_score,
          COALESCE(s.judging_status, 'unscored') as judging_status,
          s.created_at,
          s.updated_at,
          u.name as user_name,
          u.email as user_email,
          u.image as user_image,
          COALESCE(u.skills, ARRAY[]::text[]) as user_skills,
          h.title as hackathon_title,
          h.slug as hackathon_slug
        FROM public.hackathon_submissions s
        LEFT JOIN public.users u ON u.id = s.user_id
        LEFT JOIN public.hackathons h ON h.id = s.hackathon_id
        WHERE s.id = ${id}::uuid
        LIMIT 1;
      `;
      if (rows.length === 0) return null;
      const r = rows[0] as Record<string, unknown>;

      let teamMembers = Array.isArray(r.team_members) ? (r.team_members as SubmissionTeamMember[]) : [];
      if (teamMembers.length === 0 && (r.user_name || r.user_id)) {
        teamMembers = [
          {
            id: (r.user_id as string) || "",
            name: (r.user_name as string) || "Builder",
            image: (r.user_image as string) || null,
            role: "Creator",
            status: "accepted",
          },
        ];
      }

      return {
        id: r.id as string,
        hackathon_id: r.hackathon_id as string,
        user_id: r.user_id as string,
        title: r.title as string,
        tagline: (r.tagline as string) || null,
        description: (r.description as string) || "",
        demo_url: (r.demo_url as string) || null,
        github_url: (r.github_url as string) || null,
        video_url: (r.video_url as string) || null,
        cover_image: (r.cover_image as string) || null,
        screenshots: Array.isArray(r.screenshots) ? (r.screenshots as string[]) : [],
        tech_stack: Array.isArray(r.tech_stack) ? (r.tech_stack as string[]) : [],
        is_featured: Boolean(r.is_featured),
        status: (r.status as string) || "approved",
        winner_badge: (r.winner_badge as string) || null,
        total_score: typeof r.total_score === "number" ? r.total_score : (r.total_score ? Number(r.total_score) : null),
        judging_status: (r.judging_status as string) || "unscored",
        created_at: typeof r.created_at === "object" && r.created_at !== null ? (r.created_at as Date).toISOString() : String(r.created_at || ""),
        updated_at: typeof r.updated_at === "object" && r.updated_at !== null ? (r.updated_at as Date).toISOString() : String(r.updated_at || ""),
        user_name: (r.user_name as string) || null,
        user_email: (r.user_email as string) || null,
        user_image: (r.user_image as string) || null,
        user_skills: Array.isArray(r.user_skills) ? (r.user_skills as string[]) : [],
        hackathon_title: (r.hackathon_title as string) || undefined,
        hackathon_slug: (r.hackathon_slug as string) || undefined,
        team_members: teamMembers,
        team_member_ids: Array.isArray(r.team_member_ids) ? (r.team_member_ids as string[]) : [(r.user_id as string)],
      };
    } catch {
      return null;
    }
  }

  /**
   * Update an existing submission (Admin / Management)
   */
  async updateSubmission(id: string, input: UpdateSubmissionInput): Promise<HackathonSubmission> {
    const existing = await this.getSubmissionById(id);
    if (!existing) {
      throw new Error(`Submission with ID ${id} not found`);
    }

    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const tagline = input.tagline !== undefined ? (input.tagline ? input.tagline.trim() : null) : existing.tagline;
    const description = input.description !== undefined ? input.description.trim() : existing.description;
    const demo_url = input.demo_url !== undefined ? (input.demo_url ? input.demo_url.trim() : null) : existing.demo_url;
    const github_url = input.github_url !== undefined ? (input.github_url ? input.github_url.trim() : null) : existing.github_url;
    const video_url = input.video_url !== undefined ? (input.video_url ? input.video_url.trim() : null) : existing.video_url;
    const cover_image = input.cover_image !== undefined ? (input.cover_image ? input.cover_image.trim() : null) : existing.cover_image;
    const screenshots = input.screenshots !== undefined ? input.screenshots : (existing.screenshots || []);
    const tech_stack = input.tech_stack !== undefined ? input.tech_stack : existing.tech_stack;
    const is_featured = input.is_featured !== undefined ? input.is_featured : (existing.is_featured ?? false);
    const status = input.status !== undefined ? input.status : (existing.status ?? "approved");
    const winner_badge = input.winner_badge !== undefined ? input.winner_badge : (existing.winner_badge ?? null);
    const total_score = input.total_score !== undefined ? input.total_score : (existing.total_score ?? null);
    const judging_status = input.judging_status !== undefined ? input.judging_status : (existing.judging_status ?? "unscored");
    const team_members = input.team_members !== undefined ? input.team_members : (existing.team_members || []);
    const team_member_ids = input.team_member_ids !== undefined ? input.team_member_ids : (existing.team_member_ids || []);

    await db`
      UPDATE public.hackathon_submissions
      SET 
        title = ${title},
        tagline = ${tagline},
        description = ${description},
        demo_url = ${demo_url},
        github_url = ${github_url},
        video_url = ${video_url},
        cover_image = ${cover_image},
        screenshots = ${screenshots}::text[],
        tech_stack = ${tech_stack}::text[],
        is_featured = ${is_featured}::boolean,
        status = ${status},
        winner_badge = ${winner_badge},
        total_score = ${total_score},
        judging_status = ${judging_status},
        team_members = ${JSON.stringify(team_members)}::jsonb,
        team_member_ids = ${team_member_ids}::text[],
        updated_at = NOW()
      WHERE id = ${id}::uuid;
    `;

    return (await this.getSubmissionById(id))!;
  }

  /**
   * Delete a submission
   */
  async deleteSubmission(id: string): Promise<boolean> {
    try {
      await db`DELETE FROM public.hackathon_submissions WHERE id = ${id}::uuid;`;
      return true;
    } catch (err) {
      console.error("[deleteSubmission Error]:", err);
      return false;
    }
  }

  /**
   * Aggregate stats for submissions
   */
  async getSubmissionStats(): Promise<{
    total: number;
    featured: number;
    approved: number;
    under_review: number;
    uniqueHackathons: number;
    totalBuilders: number;
  }> {
    try {
      const rows = await db`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE is_featured = true)::int as featured,
          COUNT(*) FILTER (WHERE COALESCE(status, 'approved') = 'approved')::int as approved,
          COUNT(*) FILTER (WHERE status = 'under_review')::int as under_review,
          COUNT(DISTINCT hackathon_id)::int as unique_hackathons
        FROM public.hackathon_submissions;
      `;
      const r = rows[0] as Record<string, number>;
      return {
        total: r.total || 0,
        featured: r.featured || 0,
        approved: r.approved || 0,
        under_review: r.under_review || 0,
        uniqueHackathons: r.unique_hackathons || 0,
        totalBuilders: 0,
      };
    } catch {
      return { total: 0, featured: 0, approved: 0, under_review: 0, uniqueHackathons: 0, totalBuilders: 0 };
    }
  }

  /**
   * Submit a project for a hackathon
   */
   async createSubmission(input: CreateSubmissionInput): Promise<HackathonSubmission> {
    const teamMembers = input.team_members && input.team_members.length > 0
      ? input.team_members
      : [{ id: input.user_id, name: "Builder", image: null, role: "Creator", status: "accepted" }];
    const teamMemberIds = input.team_member_ids && input.team_member_ids.length > 0
      ? input.team_member_ids
      : [input.user_id];

    // Check if user already submitted for this hackathon (as creator or accepted teammate)
    const existing = await this.getUserSubmission(input.hackathon_id, input.user_id);
    const isAuthorOrTeammate = Boolean(
      existing &&
        (existing.user_id === input.user_id ||
          existing.team_member_ids?.includes(input.user_id))
    );

    if (existing && isAuthorOrTeammate) {
      // Preserve the original creator ID
      const originalUserId = existing.user_id;
      const mergedMemberIds = Array.from(
        new Set([originalUserId, input.user_id, ...teamMemberIds])
      ).filter(Boolean);

      const rows = await db`
        UPDATE public.hackathon_submissions
        SET 
          title = ${input.title},
          tagline = ${input.tagline || null},
          description = ${input.description},
          demo_url = ${input.demo_url || null},
          github_url = ${input.github_url || null},
          video_url = ${input.video_url || null},
          cover_image = ${input.cover_image || null},
          screenshots = ${input.screenshots || []}::text[],
          tech_stack = ${input.tech_stack || []}::text[],
          team_members = ${JSON.stringify(teamMembers)}::jsonb,
          team_member_ids = ${mergedMemberIds}::text[],
          updated_at = NOW()
        WHERE id = ${existing.id}::uuid
        RETURNING *;
      `;
      const r = rows[0] as Record<string, unknown>;
      return {
        ...r,
        team_members: Array.isArray(r.team_members) ? r.team_members : teamMembers,
        team_member_ids: Array.isArray(r.team_member_ids) ? r.team_member_ids : mergedMemberIds,
      } as unknown as HackathonSubmission;
    }

    const rows = await db`
      INSERT INTO public.hackathon_submissions (
        hackathon_id, user_id, title, tagline, description,
        demo_url, github_url, video_url, cover_image, screenshots, tech_stack,
        team_members, team_member_ids,
        created_at, updated_at
      ) VALUES (
        ${input.hackathon_id}::uuid,
        ${input.user_id},
        ${input.title},
        ${input.tagline || null},
        ${input.description},
        ${input.demo_url || null},
        ${input.github_url || null},
        ${input.video_url || null},
        ${input.cover_image || null},
        ${input.screenshots || []}::text[],
        ${input.tech_stack || []}::text[],
        ${JSON.stringify(teamMembers)}::jsonb,
        ${teamMemberIds}::text[],
        NOW(),
        NOW()
      )
      RETURNING *;
    `;
    const r = rows[0] as Record<string, unknown>;
    return {
      ...r,
      team_members: Array.isArray(r.team_members) ? r.team_members : teamMembers,
      team_member_ids: Array.isArray(r.team_member_ids) ? r.team_member_ids : teamMemberIds,
    } as unknown as HackathonSubmission;
  }

  /**
   * Update team member status in any submission for this hackathon
   */
  async updateSubmissionTeamMemberStatus(
    hackathonId: string,
    memberIdentifier: string,
    status: "accepted" | "declined",
    resolvedUserId?: string,
    options?: {
      senderId?: string;
      memberName?: string;
      memberImage?: string | null;
      memberRole?: string;
    }
  ): Promise<void> {
    try {
      const submissions = await db`
        SELECT id, user_id, team_members, team_member_ids
        FROM public.hackathon_submissions
        WHERE hackathon_id = ${hackathonId}::uuid;
      `;
      for (const sub of submissions) {
        let teamMembersList = Array.isArray(sub.team_members) ? [...sub.team_members] : [];
        let changed = false;
        let memberUserId: string | null = resolvedUserId || null;

        let matched = false;
        const updatedMembers = teamMembersList.map((m: Record<string, unknown>) => {
          if (
            m.id === memberIdentifier ||
            m.email === memberIdentifier ||
            m.invite_id === memberIdentifier ||
            (resolvedUserId && m.id === resolvedUserId)
          ) {
            matched = true;
            changed = true;
            if (!memberUserId && typeof m.id === "string" && m.id && m.id !== memberIdentifier) {
              memberUserId = m.id;
            }
            return {
              ...m,
              status,
              ...(memberUserId ? { id: memberUserId } : {}),
            };
          }
          return m;
        });

        teamMembersList = updatedMembers;

        // If not already in team_members array, but this submission belongs to the sender of the invite
        if (!matched && status === "accepted" && options?.senderId && sub.user_id === options.senderId) {
          const effectiveId = resolvedUserId || memberIdentifier;
          teamMembersList.push({
            id: effectiveId,
            name: options.memberName || "Teammate",
            image: options.memberImage || null,
            role: options.memberRole || "Co-Builder",
            status: "accepted",
          });
          changed = true;
          memberUserId = effectiveId;
        }

        if (changed) {
          const currentMemberIds: string[] = Array.isArray(sub.team_member_ids)
            ? [...(sub.team_member_ids as string[])]
            : [];

          const effectiveUserId =
            resolvedUserId ||
            memberUserId ||
            (typeof memberIdentifier === "string" && !memberIdentifier.includes("@") && memberIdentifier.length > 10
              ? memberIdentifier
              : null);

          let updatedMemberIds = [...currentMemberIds];
          if (status === "accepted" && effectiveUserId) {
            if (!updatedMemberIds.includes(effectiveUserId)) {
              updatedMemberIds.push(effectiveUserId);
            }
          } else if (status === "declined" && effectiveUserId) {
            updatedMemberIds = updatedMemberIds.filter((id) => id !== effectiveUserId);
          }

          await db`
            UPDATE public.hackathon_submissions
            SET team_members = ${JSON.stringify(teamMembersList)}::jsonb,
                team_member_ids = ${updatedMemberIds}::text[],
                updated_at = NOW()
            WHERE id = ${sub.id}::uuid;
          `;
        }
      }
    } catch (err) {
      console.error("[updateSubmissionTeamMemberStatus error]:", err);
    }
  }

  /**
   * Get submission by specific user for this hackathon
   */
  async getUserSubmission(hackathonId: string, userId: string): Promise<HackathonSubmission | null> {
    try {
      const rows = await db`
        SELECT 
          s.*,
          u.name as user_name,
          u.image as user_image
        FROM public.hackathon_submissions s
        LEFT JOIN public.users u ON u.id = s.user_id
        WHERE s.hackathon_id = ${hackathonId}::uuid 
          AND (s.user_id = ${userId} OR ${userId} = ANY(s.team_member_ids))
        ORDER BY s.created_at DESC
        LIMIT 1;
      `;
      if (rows.length === 0) return null;
      const r = rows[0] as Record<string, unknown>;
      let teamMembers = Array.isArray(r.team_members) ? r.team_members : [];
      if (teamMembers.length === 0 && (r.user_name || r.user_id)) {
        teamMembers = [{ id: r.user_id, name: r.user_name || "Builder", image: r.user_image || null, role: "Creator" }];
      }
      return {
        ...r,
        screenshots: Array.isArray(r.screenshots) ? (r.screenshots as string[]) : [],
        tech_stack: Array.isArray(r.tech_stack) ? r.tech_stack : [],
        team_members: teamMembers,
        team_member_ids: Array.isArray(r.team_member_ids) ? r.team_member_ids : [r.user_id],
      } as unknown as HackathonSubmission;
    } catch {
      return null;
    }
  }

  /**
   * Save or update judge evaluation for a submission
   */
  async saveEvaluation(input: SaveEvaluationInput): Promise<ProjectEvaluation> {
    const totalScore =
      Math.min(10, Math.max(1, Number(input.score_innovation) || 1)) +
      Math.min(10, Math.max(1, Number(input.score_technical) || 1)) +
      Math.min(10, Math.max(1, Number(input.score_design) || 1)) +
      Math.min(10, Math.max(1, Number(input.score_impact) || 1)) +
      Math.min(10, Math.max(1, Number(input.score_presentation) || 1));

    const rows = await db`
      INSERT INTO public.project_evaluations (
        submission_id,
        hackathon_id,
        judge_id,
        judge_name,
        judge_email,
        score_innovation,
        score_technical,
        score_design,
        score_impact,
        score_presentation,
        total_score,
        feedback,
        award,
        created_at,
        updated_at
      ) VALUES (
        ${input.submission_id}::uuid,
        ${input.hackathon_id}::uuid,
        ${input.judge_id},
        ${input.judge_name},
        ${input.judge_email},
        ${Math.min(10, Math.max(1, Number(input.score_innovation) || 1))},
        ${Math.min(10, Math.max(1, Number(input.score_technical) || 1))},
        ${Math.min(10, Math.max(1, Number(input.score_design) || 1))},
        ${Math.min(10, Math.max(1, Number(input.score_impact) || 1))},
        ${Math.min(10, Math.max(1, Number(input.score_presentation) || 1))},
        ${totalScore},
        ${input.feedback ? input.feedback.trim() : null},
        ${input.award ? input.award.trim() : null},
        NOW(),
        NOW()
      )
      ON CONFLICT (submission_id, judge_id) DO UPDATE SET
        score_innovation = EXCLUDED.score_innovation,
        score_technical = EXCLUDED.score_technical,
        score_design = EXCLUDED.score_design,
        score_impact = EXCLUDED.score_impact,
        score_presentation = EXCLUDED.score_presentation,
        total_score = EXCLUDED.total_score,
        feedback = EXCLUDED.feedback,
        award = EXCLUDED.award,
        updated_at = NOW()
      RETURNING *;
    `;

    // Recalculate average score for this submission
    const scoreAgg = await db`
      SELECT ROUND(AVG(total_score)) as avg_score, COUNT(*)::int as count
      FROM public.project_evaluations
      WHERE submission_id = ${input.submission_id}::uuid;
    `;

    const avgScore = scoreAgg.length > 0 && scoreAgg[0].avg_score !== null ? Number(scoreAgg[0].avg_score) : totalScore;
    const isWinner = Boolean(input.award && input.award.trim().length > 0);

    // Update submission record with latest judge evaluation
    await db`
      UPDATE public.hackathon_submissions
      SET
        total_score = ${avgScore},
        judging_status = 'scored',
        winner_badge = CASE 
          WHEN ${input.award !== undefined} THEN ${input.award ? input.award.trim() : null}
          ELSE winner_badge
        END,
        is_featured = CASE 
          WHEN ${isWinner} THEN true
          ELSE is_featured
        END,
        updated_at = NOW()
      WHERE id = ${input.submission_id}::uuid;
    `;

    const r = rows[0] as Record<string, unknown>;
    return {
      id: r.id as string,
      submission_id: r.submission_id as string,
      hackathon_id: r.hackathon_id as string,
      judge_id: r.judge_id as string,
      judge_name: r.judge_name as string,
      judge_email: r.judge_email as string,
      score_innovation: Number(r.score_innovation),
      score_technical: Number(r.score_technical),
      score_design: Number(r.score_design),
      score_impact: Number(r.score_impact),
      score_presentation: Number(r.score_presentation),
      total_score: Number(r.total_score),
      feedback: (r.feedback as string) || null,
      award: (r.award as string) || null,
      created_at: typeof r.created_at === "object" && r.created_at !== null ? (r.created_at as Date).toISOString() : String(r.created_at || ""),
      updated_at: typeof r.updated_at === "object" && r.updated_at !== null ? (r.updated_at as Date).toISOString() : String(r.updated_at || ""),
    };
  }

  /**
   * Get all evaluations for a specific submission
   */
  async getEvaluationsBySubmission(submissionId: string): Promise<ProjectEvaluation[]> {
    try {
      const rows = await db`
        SELECT * FROM public.project_evaluations
        WHERE submission_id = ${submissionId}::uuid
        ORDER BY created_at DESC;
      `;
      return rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        submission_id: r.submission_id as string,
        hackathon_id: r.hackathon_id as string,
        judge_id: r.judge_id as string,
        judge_name: r.judge_name as string,
        judge_email: r.judge_email as string,
        score_innovation: Number(r.score_innovation),
        score_technical: Number(r.score_technical),
        score_design: Number(r.score_design),
        score_impact: Number(r.score_impact),
        score_presentation: Number(r.score_presentation),
        total_score: Number(r.total_score),
        feedback: (r.feedback as string) || null,
        award: (r.award as string) || null,
        created_at: typeof r.created_at === "object" && r.created_at !== null ? (r.created_at as Date).toISOString() : String(r.created_at || ""),
        updated_at: typeof r.updated_at === "object" && r.updated_at !== null ? (r.updated_at as Date).toISOString() : String(r.updated_at || ""),
      }));
    } catch (err) {
      console.error("[getEvaluationsBySubmission Error]:", err);
      return [];
    }
  }

  /**
   * Get all evaluations for a hackathon
   */
  async getEvaluationsByHackathon(hackathonId: string): Promise<ProjectEvaluation[]> {
    try {
      const rows = await db`
        SELECT * FROM public.project_evaluations
        WHERE hackathon_id = ${hackathonId}::uuid
        ORDER BY updated_at DESC;
      `;
      return rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        submission_id: r.submission_id as string,
        hackathon_id: r.hackathon_id as string,
        judge_id: r.judge_id as string,
        judge_name: r.judge_name as string,
        judge_email: r.judge_email as string,
        score_innovation: Number(r.score_innovation),
        score_technical: Number(r.score_technical),
        score_design: Number(r.score_design),
        score_impact: Number(r.score_impact),
        score_presentation: Number(r.score_presentation),
        total_score: Number(r.total_score),
        feedback: (r.feedback as string) || null,
        award: (r.award as string) || null,
        created_at: typeof r.created_at === "object" && r.created_at !== null ? (r.created_at as Date).toISOString() : String(r.created_at || ""),
        updated_at: typeof r.updated_at === "object" && r.updated_at !== null ? (r.updated_at as Date).toISOString() : String(r.updated_at || ""),
      }));
    } catch (err) {
      console.error("[getEvaluationsByHackathon Error]:", err);
      return [];
    }
  }

  /**
   * Get leaderboard rankings for a hackathon (sorted by total_score desc)
   */
  async getJudgingLeaderboard(hackathonId: string): Promise<HackathonSubmission[]> {
    try {
      const rows = await db`
        SELECT 
          s.id,
          s.hackathon_id,
          s.user_id,
          s.title,
          s.tagline,
          s.description,
          s.demo_url,
          s.github_url,
          s.video_url,
          s.cover_image,
          COALESCE(s.screenshots, ARRAY[]::text[]) as screenshots,
          COALESCE(s.tech_stack, ARRAY[]::text[]) as tech_stack,
          s.team_members,
          COALESCE(s.team_member_ids, ARRAY[]::text[]) as team_member_ids,
          COALESCE(s.is_featured, false) as is_featured,
          COALESCE(s.status, 'approved') as status,
          s.winner_badge,
          s.total_score,
          COALESCE(s.judging_status, 'unscored') as judging_status,
          s.created_at,
          s.updated_at,
          u.name as user_name,
          u.email as user_email,
          u.image as user_image,
          h.title as hackathon_title,
          h.slug as hackathon_slug,
          (SELECT COUNT(*)::int FROM public.project_evaluations pe WHERE pe.submission_id = s.id) as evaluation_count
        FROM public.hackathon_submissions s
        LEFT JOIN public.users u ON u.id = s.user_id
        LEFT JOIN public.hackathons h ON h.id = s.hackathon_id
        WHERE s.hackathon_id = ${hackathonId}::uuid
        ORDER BY s.total_score DESC NULLS LAST, s.created_at ASC;
      `;

      return rows.map((r: Record<string, unknown>) => {
        let teamMembers = Array.isArray(r.team_members) ? (r.team_members as SubmissionTeamMember[]) : [];
        if (teamMembers.length === 0 && (r.user_name || r.user_id)) {
          teamMembers = [
            {
              id: (r.user_id as string) || "",
              name: (r.user_name as string) || "Builder",
              image: (r.user_image as string) || null,
              role: "Creator",
              status: "accepted",
            },
          ];
        }

        return {
          id: r.id as string,
          hackathon_id: r.hackathon_id as string,
          user_id: r.user_id as string,
          title: r.title as string,
          tagline: (r.tagline as string) || null,
          description: (r.description as string) || "",
          demo_url: (r.demo_url as string) || null,
          github_url: (r.github_url as string) || null,
          video_url: (r.video_url as string) || null,
          cover_image: (r.cover_image as string) || null,
          screenshots: Array.isArray(r.screenshots) ? (r.screenshots as string[]) : [],
          tech_stack: Array.isArray(r.tech_stack) ? (r.tech_stack as string[]) : [],
          is_featured: Boolean(r.is_featured),
          status: (r.status as string) || "approved",
          winner_badge: (r.winner_badge as string) || null,
          total_score: typeof r.total_score === "number" ? r.total_score : (r.total_score ? Number(r.total_score) : null),
          judging_status: (r.judging_status as string) || "unscored",
          evaluation_count: Number(r.evaluation_count || 0),
          created_at: typeof r.created_at === "object" && r.created_at !== null ? (r.created_at as Date).toISOString() : String(r.created_at || ""),
          updated_at: typeof r.updated_at === "object" && r.updated_at !== null ? (r.updated_at as Date).toISOString() : String(r.updated_at || ""),
          user_name: (r.user_name as string) || null,
          user_email: (r.user_email as string) || null,
          user_image: (r.user_image as string) || null,
          hackathon_title: (r.hackathon_title as string) || undefined,
          hackathon_slug: (r.hackathon_slug as string) || undefined,
          team_members: teamMembers,
          team_member_ids: Array.isArray(r.team_member_ids) ? (r.team_member_ids as string[]) : [(r.user_id as string)],
        };
      });
    } catch (err) {
      console.error("[getJudgingLeaderboard Error]:", err);
      return [];
    }
  }

  /**
   * Assign a judge to a hackathon
   */
  async assignJudge(hackathonId: string, judgeId: string, invitedBy?: string): Promise<void> {
    await db`
      INSERT INTO public.hackathon_judges (hackathon_id, judge_id, invited_by, created_at)
      VALUES (${hackathonId}::uuid, ${judgeId}, ${invitedBy || null}, NOW())
      ON CONFLICT (hackathon_id, judge_id) DO NOTHING;
    `;
  }

  /**
   * Remove a judge assignment from a hackathon
   */
  async removeJudge(hackathonId: string, judgeId: string): Promise<void> {
    await db`
      DELETE FROM public.hackathon_judges
      WHERE hackathon_id = ${hackathonId}::uuid AND judge_id = ${judgeId};
    `;
  }

  /**
   * Get all judges assigned to an organizer's hackathons
   */
  async getJudgesForOrganizer(organizerId: string, isSuperAdmin = false): Promise<Array<{
    id: string;
    judge_id: string;
    name: string;
    email: string;
    username: string | null;
    image: string | null;
    hackathon_id: string;
    hackathon_title: string;
    hackathon_slug: string;
    assigned_at: string;
    evaluation_count: number;
  }>> {
    try {
      const rows = await db`
        SELECT 
          hj.id,
          u.id as judge_id,
          u.name,
          u.email,
          u.username,
          u.image,
          h.id as hackathon_id,
          h.title as hackathon_title,
          h.slug as hackathon_slug,
          hj.created_at as assigned_at,
          COALESCE(pe.eval_count, 0) as evaluation_count
        FROM public.hackathon_judges hj
        JOIN public.hackathons h ON h.id = hj.hackathon_id
        JOIN public.users u ON u.id = hj.judge_id
        LEFT JOIN (
          SELECT judge_id, hackathon_id, count(*)::int as eval_count
          FROM public.project_evaluations
          GROUP BY judge_id, hackathon_id
        ) pe ON pe.judge_id = u.id AND pe.hackathon_id = h.id
        WHERE (${isSuperAdmin}::boolean = true OR h.organizer_id = ${organizerId})
        ORDER BY hj.created_at DESC;
      `;
      return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        judge_id: String(r.judge_id),
        name: (r.name as string) || "Judge",
        email: String(r.email),
        username: (r.username as string) || null,
        image: (r.image as string) || null,
        hackathon_id: String(r.hackathon_id || ""),
        hackathon_title: String(r.hackathon_title || ""),
        hackathon_slug: String(r.hackathon_slug || ""),
        assigned_at: String(r.assigned_at || ""),
        evaluation_count: Number(r.evaluation_count) || 0,
      }));
    } catch (err) {
      console.error("[getJudgesForOrganizer Error]:", err);
      return [];
    }
  }

  /**
   * Get hackathons assigned to a specific judge
   */
  async getHackathonsForJudge(judgeId: string, isSuperAdmin = false): Promise<Hackathon[]> {
    try {
      if (isSuperAdmin) {
        return this.listHackathons({ includeDrafts: true });
      }
      const rows = await db`
        SELECT 
          h.*,
          COALESCE(r.p_count, 0)::int as participant_count
        FROM public.hackathons h
        JOIN public.hackathon_judges hj ON hj.hackathon_id = h.id
        LEFT JOIN (
          SELECT hackathon_id, COUNT(*)::int as p_count 
          FROM public.hackathon_registrations 
          GROUP BY hackathon_id
        ) r ON r.hackathon_id = h.id
        WHERE hj.judge_id = ${judgeId}
        ORDER BY h.start_date DESC;
      `;
      return rows.map(mapHackathonRow);
    } catch (err) {
      console.error("[getHackathonsForJudge Error]:", err);
      return [];
    }
  }

  /**
   * Verify whether a participant is eligible to access/register for a private hackathon
   */
  async verifyPrivateAccess(
    hackathon: Hackathon,
    options: {
      userId?: string;
      userEmail?: string;
      accessCode?: string;
      inviteToken?: string;
      userRole?: string;
    }
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 1. If hackathon is not private, access is unrestricted
    if (!hackathon.is_private) {
      return { allowed: true, reason: "public" };
    }

    // 2. Super Admin always has full access
    if (options.userRole === "admin") {
      return { allowed: true, reason: "admin_bypass" };
    }

    // 3. Hackathon Organizer has full access
    if (options.userId && hackathon.organizer_id && options.userId === hackathon.organizer_id) {
      return { allowed: true, reason: "organizer_bypass" };
    }

    // 4. Already registered participant is granted access
    if (options.userId) {
      const isRegistered = await this.isUserRegistered(hackathon.id, options.userId);
      if (isRegistered) {
        return { allowed: true, reason: "already_registered" };
      }
    }

    // 5. Secret Invite Token match (e.g. from one-click invite URL /?invite=...)
    if (
      options.inviteToken &&
      hackathon.invite_token &&
      options.inviteToken.trim().toLowerCase() === hackathon.invite_token.trim().toLowerCase()
    ) {
      return { allowed: true, reason: "invite_token" };
    }

    // 6. Access Code / Passcode match (case-insensitive)
    if (
      options.accessCode &&
      hackathon.access_code &&
      options.accessCode.trim().toUpperCase() === hackathon.access_code.trim().toUpperCase()
    ) {
      return { allowed: true, reason: "access_code" };
    }

    // 7. Verified email whitelists & institutional domain checks
    if (options.userEmail) {
      const email = options.userEmail.trim().toLowerCase();

      // Check pre-approved student emails whitelist
      if (hackathon.invited_emails && hackathon.invited_emails.length > 0) {
        const isWhitelisted = hackathon.invited_emails.some((e) => e.trim().toLowerCase() === email);
        if (isWhitelisted) {
          return { allowed: true, reason: "email_whitelist" };
        }
      }

      // Check approved college/university email domains
      if (hackathon.allowed_email_domains && hackathon.allowed_email_domains.length > 0) {
        const isDomainApproved = hackathon.allowed_email_domains.some((d) => {
          const cleanDomain = d.trim().toLowerCase().replace(/^@/, "");
          return email.endsWith(`@${cleanDomain}`) || email.endsWith(`.${cleanDomain}`);
        });
        if (isDomainApproved) {
          return { allowed: true, reason: "domain_whitelist" };
        }
      }
    }

    return { allowed: false, reason: "private_restricted" };
  }

  /**
   * Get registered students/participants for an organizer's private hackathon
   */
  async getRegisteredStudents(hackathonId: string): Promise<RegisteredStudent[]> {
    try {
      const rows = await db`
        SELECT 
          u.id as user_id,
          u.name,
          u.email,
          u.username,
          u.image,
          r.created_at as registered_at,
          r.participation_type,
          r.student_id,
          r.college_name,
          r.academic_year,
          r.branch,
          COALESCE(r.status, 'approved') as registration_status,
          sub.id as submission_id,
          sub.title as submission_title,
          sub.created_at as submitted_at
        FROM public.hackathon_registrations r
        JOIN public.users u ON u.id = r.user_id
        LEFT JOIN public.hackathon_submissions sub ON sub.hackathon_id = r.hackathon_id AND sub.user_id = r.user_id
        WHERE r.hackathon_id = ${hackathonId}::uuid
        ORDER BY r.created_at DESC;
      `;
      return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
        user_id: String(r.user_id),
        name: (r.name as string) || "Student Participant",
        email: String(r.email),
        username: (r.username as string) || null,
        image: (r.image as string) || null,
        registered_at: r.registered_at ? new Date(String(r.registered_at)).toISOString() : new Date().toISOString(),
        participation_type: (r.participation_type as string) || "solo",
        status: (r.registration_status as "approved" | "pending" | "rejected") || "approved",
        student_id: (r.student_id as string) || null,
        college_name: (r.college_name as string) || null,
        academic_year: (r.academic_year as string) || null,
        branch: (r.branch as string) || null,
        submission_id: (r.submission_id as string) || null,
        submission_title: (r.submission_title as string) || null,
        has_submitted: Boolean(r.submission_id),
        submitted_at: r.submitted_at ? new Date(String(r.submitted_at)).toISOString() : null,
      }));
    } catch (err) {
      console.error("[getRegisteredStudents Error]:", err);
      return [];
    }
  }

  /**
   * Remove an email from the invited student emails whitelist
   */
  async removeInvitedEmail(hackathonId: string, emailToRemove: string): Promise<string[]> {
    const cleanEmail = emailToRemove.trim().toLowerCase();
    const existing = await this.findById(hackathonId);
    if (!existing || !existing.invited_emails) return [];
    const updated = existing.invited_emails.filter((e) => e.trim().toLowerCase() !== cleanEmail);
    return this.updateInvitedEmails(hackathonId, updated);
  }

  /**
   * Update invited student emails whitelist
   */
  async updateInvitedEmails(hackathonId: string, emails: string[]): Promise<string[]> {
    const cleanEmails = Array.from(
      new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))
    );
    await db`
      UPDATE public.hackathons
      SET invited_emails = ${cleanEmails}, updated_at = NOW()
      WHERE id = ${hackathonId}::uuid;
    `;
    return cleanEmails;
  }

  /**
   * Regenerate secret invite token for a private hackathon
   */
  async regenerateInviteToken(hackathonId: string): Promise<string> {
    const newToken = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    await db`
      UPDATE public.hackathons
      SET invite_token = ${newToken}, updated_at = NOW()
      WHERE id = ${hackathonId}::uuid;
    `;
    return newToken;
  }
}

// Singleton instance export
export const hackathonRepository = new HackathonRepository();
