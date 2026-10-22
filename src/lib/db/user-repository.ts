import { db } from "./index";
import {
  User,
  UserProfileUpdateInput,
  UserRole,
  CreateUserInput,
  UserProjectSubmission,
  UserHackathonParticipation,
  TeamInvitation,
  SubmissionTeamMember,
  ParticipationType,
  HackathonStatus,
  HackathonFormat,
} from "./types";

/**
 * UserRepository Interface
 * Follows Interface Segregation Principle (ISP) & Single Responsibility Principle (SRP)
 */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean>;
  createUser(input: CreateUserInput): Promise<User>;
  deleteUser(id: string): Promise<void>;
  updateProfile(id: string, input: UserProfileUpdateInput): Promise<User>;
  updateRole(id: string, role: UserRole): Promise<User>;
  listUsers(params?: { search?: string; role?: string; limit?: number; offset?: number; hideTestAccounts?: boolean }): Promise<User[]>;
  countUsers(params?: { search?: string; role?: string; hideTestAccounts?: boolean }): Promise<number>;
  getStats(): Promise<{ totalUsers: number; adminCount: number; recentSignups: number }>;
  getUserProjects(userId: string, options?: { includeDrafts?: boolean }): Promise<UserProjectSubmission[]>;
  getUserHackathons(userId: string, options?: { includeDrafts?: boolean }): Promise<UserHackathonParticipation[]>;
  createTeamInvitation(data: {
    hackathon_id: string;
    sender_id: string;
    receiver_id?: string | null;
    receiver_email?: string | null;
    team_name?: string;
    message?: string;
    contact_info?: string;
  }): Promise<TeamInvitation>;
  getUserInvitations(userId: string, userEmail?: string | null): Promise<TeamInvitation[]>;
  getInvitationById(inviteId: string): Promise<TeamInvitation | null>;
  updateInvitationStatus(inviteId: string, status: "accepted" | "declined", receiverId?: string | null): Promise<TeamInvitation | null>;
  linkPendingInvitations(userId: string, email: string): Promise<void>;
  getAcceptedInviteCount(hackathonId: string, senderId: string): Promise<number>;
}

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "moderator",
  "mod",
  "staff",
  "team",
  "support",
  "help",
  "security",
  "root",
  "system",
  "api",
  "auth",
  "signin",
  "signup",
  "login",
  "logout",
  "dashboard",
  "settings",
  "profile",
  "hackathon",
  "hackathons",
  "project",
  "projects",
  "users",
  "user",
  "teams",
  "terms",
  "privacy",
  "about",
  "contact",
  "blog",
  "explore",
  "leaderboard",
  "null",
  "undefined",
  "status",
  "test",
  "dev",
  "do4win",
  "hack4win",
  "official",
]);

/**
 * PostgreSQL Implementation of IUserRepository
 */
export class UserRepository implements IUserRepository {
  /**
   * Find a user by primary ID
   */
  async findById(id: string): Promise<User | null> {
    const rows = await db`
      SELECT 
        id, name, username, email, email_verified, image, banner_url, role, 
        bio, github_username, skills, website, country,
        created_at, updated_at
      FROM public.users
      WHERE id = ${id}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) return null;
    return rows[0] as unknown as User;
  }

  /**
   * Find a user by unique email
   */
  async findByEmail(email: string): Promise<User | null> {
    const rows = await db`
      SELECT 
        id, name, username, email, email_verified, image, banner_url, role, 
        bio, github_username, skills, website, country,
        created_at, updated_at
      FROM public.users
      WHERE email = ${email.toLowerCase().trim()}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) return null;
    return rows[0] as unknown as User;
  }

  /**
   * Find a user by unique username
   */
  async findByUsername(username: string): Promise<User | null> {
    const rows = await db`
      SELECT 
        id, name, username, email, email_verified, image, banner_url, role, 
        bio, github_username, skills, website, country,
        created_at, updated_at
      FROM public.users
      WHERE LOWER(username) = ${username.toLowerCase().trim()}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) return null;
    return rows[0] as unknown as User;
  }

  /**
   * Check if a username is available (optionally ignoring a specific user ID)
   */
  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const clean = username.toLowerCase().trim();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
      return false;
    }

    if (RESERVED_USERNAMES.has(clean)) {
      return false;
    }

    if (excludeUserId) {
      const rows = await db`
        SELECT id FROM public.users
        WHERE LOWER(username) = ${clean} AND id != ${excludeUserId}
        LIMIT 1;
      `;
      return !rows || rows.length === 0;
    }

    const rows = await db`
      SELECT id FROM public.users
      WHERE LOWER(username) = ${clean}
      LIMIT 1;
    `;
    return !rows || rows.length === 0;
  }

  /**
   * Create a new platform user (Admin functionality)
   * Ensures account is created in neon_auth.user and fully provisioned in public.users
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new Error(`User with email "${email}" already exists`);
    }

    const username = input.username?.toLowerCase().trim() || null;
    if (username) {
      if (RESERVED_USERNAMES.has(username)) {
        throw new Error(`Username @${username} is reserved by the platform`);
      }
      const isAvailable = await this.isUsernameAvailable(username);
      if (!isAvailable) {
        throw new Error(`Username @${username} is already taken`);
      }
    }

    const userId = crypto.randomUUID();
    const name = input.name?.trim() || email.split("@")[0];
    const role = input.role || "user";
    const bio = input.bio || null;
    const github_username = input.github_username || null;
    const website = input.website || null;
    const image = input.image || null;
    const skills = input.skills || [];

    // 1. Insert into neon_auth.user so auth & credentials work seamlessly
    try {
      await db`
        INSERT INTO neon_auth.user (
          id, name, email, "emailVerified", role, image, "createdAt", "updatedAt"
        )
        VALUES (
          ${userId}::uuid, ${name}, ${email}, true, ${role}, ${image}, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          image = COALESCE(EXCLUDED.image, neon_auth.user.image),
          "updatedAt" = NOW();
      `;
    } catch (neonErr) {
      console.warn("Neon auth table insert warning:", neonErr);
    }

    // 2. Ensure record exists in public.users with complete profile details
    const rows = await db`
      INSERT INTO public.users (
        id, name, username, email, email_verified, image, role, 
        bio, github_username, skills, website, 
        created_at, updated_at
      )
      VALUES (
        ${userId}, ${name}, ${username}, ${email}, true, ${image}, ${role},
        ${bio}, ${github_username}, ${skills}, ${website},
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        username = COALESCE(EXCLUDED.username, public.users.username),
        role = EXCLUDED.role,
        bio = EXCLUDED.bio,
        github_username = EXCLUDED.github_username,
        skills = EXCLUDED.skills,
        website = EXCLUDED.website,
        image = COALESCE(EXCLUDED.image, public.users.image),
        updated_at = NOW()
      RETURNING *;
    `;

    return rows[0] as unknown as User;
  }

  /**
   * Delete user and revoke their sessions
   */
  async deleteUser(id: string): Promise<void> {
    await db`DELETE FROM neon_auth.session WHERE "userId" = ${id};`.catch(() => {});
    await db`DELETE FROM neon_auth.user WHERE id = ${id}::uuid;`.catch(() => {});
    await db`DELETE FROM public.users WHERE id = ${id};`;
  }

  /**
   * Update profile fields for a user
   */
  async updateProfile(id: string, input: UserProfileUpdateInput): Promise<User> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`User with ID ${id} not found`);
    }

    let updatedUsername = existing.username;
    if (input.username !== undefined) {
      const cleanUsername = input.username.toLowerCase().trim();
      if (!cleanUsername) {
        throw new Error("Username cannot be empty");
      }
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
        throw new Error("Username must be between 3 and 30 characters and contain only letters, numbers, and underscores.");
      }
      if (cleanUsername !== existing.username?.toLowerCase()) {
        if (RESERVED_USERNAMES.has(cleanUsername)) {
          throw new Error(`Username @${cleanUsername} is reserved by the platform. Please choose another one.`);
        }
        const available = await this.isUsernameAvailable(cleanUsername, id);
        if (!available) {
          throw new Error(`Username @${cleanUsername} is already taken. Please choose another one.`);
        }
      }
      updatedUsername = cleanUsername;
    }

    const updatedName = input.name !== undefined ? input.name : existing.name;
    const updatedBio = input.bio !== undefined ? input.bio : existing.bio;
    const updatedGithub = input.github_username !== undefined ? input.github_username : existing.github_username;
    const updatedWebsite = input.website !== undefined ? input.website : existing.website;
    const updatedImage = input.image !== undefined ? input.image : existing.image;
    const updatedBanner = input.banner_url !== undefined ? input.banner_url : existing.banner_url;
    const updatedSkills = input.skills !== undefined ? input.skills : existing.skills;
    const updatedCountry = input.country !== undefined ? input.country : (existing.country || "India");

    const rows = await db`
      UPDATE public.users
      SET
        name = ${updatedName},
        username = ${updatedUsername},
        bio = ${updatedBio},
        github_username = ${updatedGithub},
        website = ${updatedWebsite},
        image = ${updatedImage},
        banner_url = ${updatedBanner},
        skills = ${updatedSkills},
        country = ${updatedCountry},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    // Also sync name/image back to neon_auth.user if changed
    if (input.name !== undefined || input.image !== undefined) {
      await db`
        UPDATE neon_auth.user
        SET
          name = COALESCE(${input.name ?? null}, name),
          image = COALESCE(${input.image ?? null}, image),
          "updatedAt" = NOW()
        WHERE id = ${id}::uuid;
      `.catch(() => {
        // Non-blocking in case id is formatted differently
      });
    }

    return rows[0] as unknown as User;
  }

  /**
   * Update user role (e.g., promote to admin, organizer, judge)
   */
  async updateRole(id: string, role: UserRole): Promise<User> {
    const rows = await db`
      UPDATE public.users
      SET role = ${role}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;

    if (!rows || rows.length === 0) {
      throw new Error(`User with ID ${id} not found`);
    }

    // Keep neon_auth.user role in sync
    await db`
      UPDATE neon_auth.user
      SET role = ${role}, "updatedAt" = NOW()
      WHERE id = ${id}::uuid;
    `.catch(() => {
      // Non-blocking
    });

    return rows[0] as unknown as User;
  }

  /**
   * List users with optional search and role filters
   * Prioritizes real and demo accounts at the top, supporting username search and test account filtering.
   */
  async listUsers(params?: {
    search?: string;
    role?: string;
    limit?: number;
    offset?: number;
    hideTestAccounts?: boolean;
  }): Promise<User[]> {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const search = params?.search ? `%${params.search.toLowerCase().trim()}%` : null;
    const role = params?.role && params.role !== "all" ? params.role : null;
    const hideTest = Boolean(params?.hideTestAccounts);

    if (search && role) {
      const rows = hideTest
        ? await db`
            SELECT * FROM public.users
            WHERE role = ${role}
              AND (LOWER(name) LIKE ${search} OR LOWER(email) LIKE ${search} OR LOWER(COALESCE(username, '')) LIKE ${search})
              AND email NOT LIKE '%@platform.io' AND email NOT LIKE '%@example.com'
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `
        : await db`
            SELECT * FROM public.users
            WHERE role = ${role}
              AND (LOWER(name) LIKE ${search} OR LOWER(email) LIKE ${search} OR LOWER(COALESCE(username, '')) LIKE ${search})
            ORDER BY (CASE WHEN email LIKE '%@platform.io' OR email LIKE '%@example.com' THEN 1 ELSE 0 END) ASC, created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `;
      return rows as unknown as User[];
    }

    if (search) {
      const rows = hideTest
        ? await db`
            SELECT * FROM public.users
            WHERE (LOWER(name) LIKE ${search} OR LOWER(email) LIKE ${search} OR LOWER(COALESCE(username, '')) LIKE ${search})
              AND email NOT LIKE '%@platform.io' AND email NOT LIKE '%@example.com'
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `
        : await db`
            SELECT * FROM public.users
            WHERE (LOWER(name) LIKE ${search} OR LOWER(email) LIKE ${search} OR LOWER(COALESCE(username, '')) LIKE ${search})
            ORDER BY (CASE WHEN email LIKE '%@platform.io' OR email LIKE '%@example.com' THEN 1 ELSE 0 END) ASC, created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `;
      return rows as unknown as User[];
    }

    if (role) {
      const rows = hideTest
        ? await db`
            SELECT * FROM public.users
            WHERE role = ${role}
              AND email NOT LIKE '%@platform.io' AND email NOT LIKE '%@example.com'
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `
        : await db`
            SELECT * FROM public.users
            WHERE role = ${role}
            ORDER BY (CASE WHEN email LIKE '%@platform.io' OR email LIKE '%@example.com' THEN 1 ELSE 0 END) ASC, created_at DESC
            LIMIT ${limit} OFFSET ${offset};
          `;
      return rows as unknown as User[];
    }

    const rows = hideTest
      ? await db`
          SELECT * FROM public.users
          WHERE email NOT LIKE '%@platform.io' AND email NOT LIKE '%@example.com'
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset};
        `
      : await db`
          SELECT * FROM public.users
          ORDER BY (CASE WHEN email LIKE '%@platform.io' OR email LIKE '%@example.com' THEN 1 ELSE 0 END) ASC, created_at DESC
          LIMIT ${limit} OFFSET ${offset};
        `;
    return rows as unknown as User[];
  }

  /**
   * Count total users matching filters (for admin pagination)
   */
  async countUsers(params?: {
    search?: string;
    role?: string;
    hideTestAccounts?: boolean;
  }): Promise<number> {
    const search = params?.search ? `%${params.search.toLowerCase().trim()}%` : null;
    const role = params?.role && params.role !== "all" ? params.role : null;
    const hideTest = Boolean(params?.hideTestAccounts);

    if (search && role) {
      const rows = hideTest
        ? await db`
            SELECT COUNT(*)::int as count FROM public.users
            WHERE role = ${role}
              AND (LOWER(name) LIKE ${search} OR LOWER(email) LIKE ${search} OR LOWER(COALESCE(username, '')) LIKE ${search})
              AND email NOT LIKE '%@platform.io' AND email NOT LIKE '%@example.com';
          `
        : await db`
            SELECT COUNT(*)::int as count FROM public.users
            WHERE role = ${role}
              AND (LOWER(name) LIKE ${search} OR LOWER(email) LIKE ${search} OR LOWER(COALESCE(username, '')) LIKE ${search});
          `;
      return rows[0]?.count ?? 0;
    }

    if (search) {
      const rows = hideTest
        ? await db`
            SELECT COUNT(*)::int as count FROM public.users
            WHERE (LOWER(name) LIKE ${search} OR LOWER(email) LIKE ${search} OR LOWER(COALESCE(username, '')) LIKE ${search})
              AND email NOT LIKE '%@platform.io' AND email NOT LIKE '%@example.com';
          `
        : await db`
            SELECT COUNT(*)::int as count FROM public.users
            WHERE (LOWER(name) LIKE ${search} OR LOWER(email) LIKE ${search} OR LOWER(COALESCE(username, '')) LIKE ${search});
          `;
      return rows[0]?.count ?? 0;
    }

    if (role) {
      const rows = hideTest
        ? await db`
            SELECT COUNT(*)::int as count FROM public.users
            WHERE role = ${role}
              AND email NOT LIKE '%@platform.io' AND email NOT LIKE '%@example.com';
          `
        : await db`
            SELECT COUNT(*)::int as count FROM public.users
            WHERE role = ${role};
          `;
      return rows[0]?.count ?? 0;
    }

    const rows = hideTest
      ? await db`
          SELECT COUNT(*)::int as count FROM public.users
          WHERE email NOT LIKE '%@platform.io' AND email NOT LIKE '%@example.com';
        `
      : await db`SELECT COUNT(*)::int as count FROM public.users;`;
    return rows[0]?.count ?? 0;
  }

  /**
   * Get administrative platform user metrics
   */
  async getStats(): Promise<{ totalUsers: number; adminCount: number; recentSignups: number }> {
    const totalResult = await db`SELECT COUNT(*)::int as count FROM public.users;`;
    const adminResult = await db`SELECT COUNT(*)::int as count FROM public.users WHERE role = 'admin';`;
    const recentResult = await db`
      SELECT COUNT(*)::int as count 
      FROM public.users 
      WHERE created_at >= NOW() - INTERVAL '7 days';
    `;

    return {
      totalUsers: totalResult[0]?.count ?? 0,
      adminCount: adminResult[0]?.count ?? 0,
      recentSignups: recentResult[0]?.count ?? 0,
    };
  }

  /**
   * Get all projects submitted by a user across all hackathons
   */
  async getUserProjects(userId: string, options?: { includeDrafts?: boolean }): Promise<UserProjectSubmission[]> {
    try {
      const includeDrafts = Boolean(options?.includeDrafts);
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
          s.created_at,
          s.updated_at,
          h.title as hackathon_title,
          h.slug as hackathon_slug,
          h.banner_url as hackathon_banner
        FROM public.hackathon_submissions s
        JOIN public.hackathons h ON h.id = s.hackathon_id
        WHERE (s.user_id = ${userId} OR ${userId} = ANY(s.team_member_ids))
          AND (${includeDrafts}::boolean = true OR h.status != 'draft')
        ORDER BY s.created_at DESC;
      `;
      return rows.map((r: Record<string, unknown>) => {
        let teamMembers = Array.isArray(r.team_members) ? (r.team_members as SubmissionTeamMember[]) : [];
        if (teamMembers.length === 0 && r.user_id) {
          teamMembers = [
            {
              id: r.user_id as string,
              name: "Builder",
              image: null,
              role: "Creator",
            },
          ];
        }

        return {
          id: r.id,
          hackathon_id: r.hackathon_id,
          user_id: r.user_id,
          title: r.title,
          tagline: r.tagline,
          description: r.description,
          demo_url: r.demo_url,
          github_url: r.github_url,
          video_url: r.video_url,
          cover_image: r.cover_image,
          screenshots: Array.isArray(r.screenshots) ? (r.screenshots as string[]) : [],
          tech_stack: Array.isArray(r.tech_stack) ? r.tech_stack : [],
          created_at: r.created_at,
          updated_at: r.updated_at,
          hackathon_title: r.hackathon_title,
          hackathon_slug: r.hackathon_slug,
          hackathon_banner: r.hackathon_banner,
          team_members: teamMembers,
          team_member_ids: Array.isArray(r.team_member_ids) ? (r.team_member_ids as string[]) : [r.user_id as string],
        } as unknown as UserProjectSubmission;
      });
    } catch (err) {
      console.error("[getUserProjects Error]:", err);
      return [];
    }
  }

  /**
   * Get all hackathons a user is registered for / participated in
   */
  async getUserHackathons(userId: string, options?: { includeDrafts?: boolean }): Promise<UserHackathonParticipation[]> {
    try {
      const includeDrafts = Boolean(options?.includeDrafts);
      const rows = await db`
        SELECT 
          h.id,
          h.title,
          h.slug,
          h.tagline,
          h.status,
          h.format,
          h.location,
          h.prize_pool,
          h.currency,
          h.banner_url,
          h.thumbnail_url,
          h.start_date,
          h.end_date,
          COALESCE(r.participation_type, 'looking_for_team') as participation_type,
          r.created_at as registered_at
        FROM public.hackathon_registrations r
        JOIN public.hackathons h ON h.id = r.hackathon_id
        WHERE r.user_id = ${userId}
          AND (${includeDrafts}::boolean = true OR h.status != 'draft')
        ORDER BY r.created_at DESC;
      `;
      return rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        title: r.title as string,
        slug: r.slug as string,
        tagline: r.tagline as string,
        status: r.status as HackathonStatus,
        format: (r.format as HackathonFormat) || "online",
        location: r.location as string,
        prize_pool: r.prize_pool as string,
        currency: r.currency as string,
        banner_url: r.banner_url as string | null,
        thumbnail_url: r.thumbnail_url as string | null,
        start_date: r.start_date as string,
        end_date: r.end_date as string,
        participation_type: (r.participation_type as ParticipationType) || "looking_for_team",
        registered_at: r.registered_at as string,
      }));
    } catch (err) {
      console.error("[getUserHackathons Error]:", err);
      return [];
    }
  }

  /**
   * Create team invitation from sender to receiver
   */
  async createTeamInvitation(data: {
    hackathon_id: string;
    sender_id: string;
    receiver_id?: string | null;
    receiver_email?: string | null;
    team_name?: string;
    message?: string;
    contact_info?: string;
  }): Promise<TeamInvitation> {
    const cleanEmail = data.receiver_email ? data.receiver_email.trim().toLowerCase() : null;

    const existing = data.receiver_id
      ? await db`
          SELECT id FROM public.team_invitations
          WHERE hackathon_id = ${data.hackathon_id}::uuid
            AND sender_id = ${data.sender_id}
            AND receiver_id = ${data.receiver_id}
            AND status = 'pending'
          LIMIT 1;
        `
      : cleanEmail
      ? await db`
          SELECT id FROM public.team_invitations
          WHERE hackathon_id = ${data.hackathon_id}::uuid
            AND sender_id = ${data.sender_id}
            AND LOWER(receiver_email) = ${cleanEmail}
            AND status = 'pending'
          LIMIT 1;
        `
      : [];

    if (existing.length > 0) {
      const rows = await db`
        UPDATE public.team_invitations
        SET
          receiver_id = COALESCE(${data.receiver_id || null}, receiver_id),
          receiver_email = COALESCE(${cleanEmail}, receiver_email),
          team_name = COALESCE(${data.team_name || null}, team_name),
          message = COALESCE(${data.message || null}, message),
          contact_info = COALESCE(${data.contact_info || null}, contact_info),
          updated_at = NOW()
        WHERE id = ${existing[0].id}::uuid
        RETURNING *;
      `;
      return rows[0] as unknown as TeamInvitation;
    }

    const rows = await db`
      INSERT INTO public.team_invitations (
        hackathon_id, sender_id, receiver_id, receiver_email, team_name, message, contact_info, status, created_at, updated_at
      ) VALUES (
        ${data.hackathon_id}::uuid,
        ${data.sender_id},
        ${data.receiver_id || null},
        ${cleanEmail},
        ${data.team_name || null},
        ${data.message || null},
        ${data.contact_info || null},
        'pending',
        NOW(),
        NOW()
      )
      RETURNING *;
    `;
    return rows[0] as unknown as TeamInvitation;
  }

  /**
   * Get all team invitations for a user (received or sent, including pending invites sent to their email)
   */
  async getUserInvitations(userId: string, userEmail?: string | null): Promise<TeamInvitation[]> {
    try {
      const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : null;
      const rows = cleanEmail
        ? await db`
            SELECT 
              ti.*,
              h.title as hackathon_title,
              h.slug as hackathon_slug,
              u_sender.name as sender_name,
              u_sender.image as sender_image,
              u_receiver.name as receiver_name,
              COALESCE(u_receiver.email, ti.receiver_email) as receiver_email
            FROM public.team_invitations ti
            JOIN public.hackathons h ON h.id = ti.hackathon_id
            JOIN public.users u_sender ON u_sender.id = ti.sender_id
            LEFT JOIN public.users u_receiver ON u_receiver.id = ti.receiver_id
            WHERE ti.receiver_id = ${userId}
               OR ti.sender_id = ${userId}
               OR (ti.receiver_id IS NULL AND LOWER(ti.receiver_email) = ${cleanEmail})
            ORDER BY ti.created_at DESC;
          `
        : await db`
            SELECT 
              ti.*,
              h.title as hackathon_title,
              h.slug as hackathon_slug,
              u_sender.name as sender_name,
              u_sender.image as sender_image,
              u_receiver.name as receiver_name,
              COALESCE(u_receiver.email, ti.receiver_email) as receiver_email
            FROM public.team_invitations ti
            JOIN public.hackathons h ON h.id = ti.hackathon_id
            JOIN public.users u_sender ON u_sender.id = ti.sender_id
            LEFT JOIN public.users u_receiver ON u_receiver.id = ti.receiver_id
            WHERE ti.receiver_id = ${userId} OR ti.sender_id = ${userId}
            ORDER BY ti.created_at DESC;
          `;
      return rows as unknown as TeamInvitation[];
    } catch (err) {
      console.error("[getUserInvitations Error]:", err);
      return [];
    }
  }

  /**
   * Find invitation by ID
   */
  async getInvitationById(inviteId: string): Promise<TeamInvitation | null> {
    try {
      const rows = await db`
        SELECT 
          ti.*,
          h.title as hackathon_title,
          h.slug as hackathon_slug,
          u_sender.name as sender_name,
          u_sender.image as sender_image,
          u_receiver.name as receiver_name,
          COALESCE(u_receiver.email, ti.receiver_email) as receiver_email
        FROM public.team_invitations ti
        JOIN public.hackathons h ON h.id = ti.hackathon_id
        JOIN public.users u_sender ON u_sender.id = ti.sender_id
        LEFT JOIN public.users u_receiver ON u_receiver.id = ti.receiver_id
        WHERE ti.id = ${inviteId}::uuid
        LIMIT 1;
      `;
      return (rows[0] as unknown as TeamInvitation) || null;
    } catch {
      return null;
    }
  }

  /**
   * Update invitation status (and optionally associate receiver_id)
   */
  async updateInvitationStatus(
    inviteId: string,
    status: "accepted" | "declined",
    receiverId?: string | null
  ): Promise<TeamInvitation | null> {
    try {
      const rows = await db`
        UPDATE public.team_invitations
        SET
          status = ${status},
          receiver_id = COALESCE(receiver_id, ${receiverId || null}),
          updated_at = NOW()
        WHERE id = ${inviteId}::uuid
        RETURNING *;
      `;
      return (rows[0] as unknown as TeamInvitation) || null;
    } catch {
      return null;
    }
  }

  /**
   * Link pending invitations sent to an email address to a newly registered/logged-in user
   */
  async linkPendingInvitations(userId: string, email: string): Promise<void> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      await db`
        UPDATE public.team_invitations
        SET receiver_id = ${userId}, updated_at = NOW()
        WHERE receiver_id IS NULL AND LOWER(receiver_email) = ${cleanEmail};
      `;
    } catch (err) {
      console.error("[linkPendingInvitations Error]:", err);
    }
  }

  /**
   * Count accepted invitations sent by a user for a specific hackathon
   */
  async getAcceptedInviteCount(hackathonId: string, senderId: string): Promise<number> {
    try {
      const rows = await db`
        SELECT COUNT(*)::int as count
        FROM public.team_invitations
        WHERE hackathon_id = ${hackathonId}::uuid
          AND sender_id = ${senderId}
          AND status = 'accepted';
      `;
      return rows[0]?.count ?? 0;
    } catch {
      return 0;
    }
  }
}

// Singleton export following Dependency Inversion Principle
export const userRepository = new UserRepository();
