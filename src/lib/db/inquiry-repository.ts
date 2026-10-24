import { db } from "./index";
import { HostInquiry, HostInquiryStatus, CreateHostInquiryInput } from "./types";

export interface IInquiryRepository {
  createInquiry(input: CreateHostInquiryInput): Promise<HostInquiry>;
  listInquiries(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<HostInquiry[]>;
  getInquiryById(id: string): Promise<HostInquiry | null>;
  updateInquiryStatus(
    id: string,
    status: HostInquiryStatus,
    adminNotes?: string
  ): Promise<HostInquiry | null>;
  deleteInquiry(id: string): Promise<boolean>;
  getStats(): Promise<{
    total: number;
    new: number;
    contacted: number;
    in_discussion: number;
    approved: number;
    archived: number;
  }>;
}

function mapInquiryRow(row: Record<string, unknown>): HostInquiry {
  return {
    id: String(row.id),
    organization_name: String(row.organization_name || ""),
    contact_name: String(row.contact_name || ""),
    email: String(row.email || ""),
    timeline: String(row.timeline || "Flexible"),
    estimated_prize_pool: String(row.estimated_prize_pool || "Not specified"),
    tracks: Array.isArray(row.tracks) ? (row.tracks as string[]) : [],
    event_goals: String(row.event_goals || ""),
    status: (row.status as HostInquiryStatus) || "new",
    admin_notes: row.admin_notes ? String(row.admin_notes) : null,
    created_at:
      typeof row.created_at === "object" && row.created_at !== null
        ? (row.created_at as Date).toISOString()
        : String(row.created_at || ""),
    updated_at:
      typeof row.updated_at === "object" && row.updated_at !== null
        ? (row.updated_at as Date).toISOString()
        : String(row.updated_at || ""),
  };
}

export class InquiryRepository implements IInquiryRepository {
  async createInquiry(input: CreateHostInquiryInput): Promise<HostInquiry> {
    const orgName = input.organization_name.trim();
    const contactName = input.contact_name.trim();
    const email = input.email.trim().toLowerCase();
    const timeline = input.timeline?.trim() || "Flexible";
    const prizePool = input.estimated_prize_pool?.trim() || "Not specified";
    const tracks = Array.isArray(input.tracks) ? input.tracks : [];
    const eventGoals = input.event_goals.trim();

    const rows = await db`
      INSERT INTO public.host_inquiries (
        organization_name,
        contact_name,
        email,
        timeline,
        estimated_prize_pool,
        tracks,
        event_goals,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${orgName},
        ${contactName},
        ${email},
        ${timeline},
        ${prizePool},
        ${tracks},
        ${eventGoals},
        'new',
        NOW(),
        NOW()
      )
      RETURNING *;
    `;

    return mapInquiryRow(rows[0] as Record<string, unknown>);
  }

  async listInquiries(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<HostInquiry[]> {
    const limit = params?.limit ?? 100;
    const offset = params?.offset ?? 0;
    const status = params?.status && params.status !== "all" ? params.status : null;
    const search = params?.search && params.search.trim() ? `%${params.search.trim().toLowerCase()}%` : null;

    if (search && status) {
      const rows = await db`
        SELECT * FROM public.host_inquiries
        WHERE status = ${status}
          AND (
            LOWER(organization_name) LIKE ${search}
            OR LOWER(contact_name) LIKE ${search}
            OR LOWER(email) LIKE ${search}
            OR LOWER(event_goals) LIKE ${search}
          )
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
      return rows.map((r) => mapInquiryRow(r as Record<string, unknown>));
    }

    if (search) {
      const rows = await db`
        SELECT * FROM public.host_inquiries
        WHERE LOWER(organization_name) LIKE ${search}
          OR LOWER(contact_name) LIKE ${search}
          OR LOWER(email) LIKE ${search}
          OR LOWER(event_goals) LIKE ${search}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
      return rows.map((r) => mapInquiryRow(r as Record<string, unknown>));
    }

    if (status) {
      const rows = await db`
        SELECT * FROM public.host_inquiries
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
      return rows.map((r) => mapInquiryRow(r as Record<string, unknown>));
    }

    const rows = await db`
      SELECT * FROM public.host_inquiries
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
    return rows.map((r) => mapInquiryRow(r as Record<string, unknown>));
  }

  async getInquiryById(id: string): Promise<HostInquiry | null> {
    try {
      const rows = await db`
        SELECT * FROM public.host_inquiries
        WHERE id = ${id}::uuid
        LIMIT 1;
      `;
      if (!rows || rows.length === 0) return null;
      return mapInquiryRow(rows[0] as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async updateInquiryStatus(
    id: string,
    status: HostInquiryStatus,
    adminNotes?: string
  ): Promise<HostInquiry | null> {
    try {
      const notesUpdate = adminNotes !== undefined ? adminNotes : null;
      const rows = await db`
        UPDATE public.host_inquiries
        SET 
          status = ${status},
          admin_notes = COALESCE(${notesUpdate}, admin_notes),
          updated_at = NOW()
        WHERE id = ${id}::uuid
        RETURNING *;
      `;
      if (!rows || rows.length === 0) return null;
      return mapInquiryRow(rows[0] as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  async deleteInquiry(id: string): Promise<boolean> {
    try {
      await db`
        DELETE FROM public.host_inquiries
        WHERE id = ${id}::uuid;
      `;
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    total: number;
    new: number;
    contacted: number;
    in_discussion: number;
    approved: number;
    archived: number;
  }> {
    const [totalRes, newRes, contactedRes, discussionRes, approvedRes, archivedRes] = await Promise.all([
      db`SELECT COUNT(*)::int as count FROM public.host_inquiries;`,
      db`SELECT COUNT(*)::int as count FROM public.host_inquiries WHERE status = 'new';`,
      db`SELECT COUNT(*)::int as count FROM public.host_inquiries WHERE status = 'contacted';`,
      db`SELECT COUNT(*)::int as count FROM public.host_inquiries WHERE status = 'in_discussion';`,
      db`SELECT COUNT(*)::int as count FROM public.host_inquiries WHERE status = 'approved';`,
      db`SELECT COUNT(*)::int as count FROM public.host_inquiries WHERE status = 'archived';`,
    ]);

    return {
      total: totalRes[0]?.count ?? 0,
      new: newRes[0]?.count ?? 0,
      contacted: contactedRes[0]?.count ?? 0,
      in_discussion: discussionRes[0]?.count ?? 0,
      approved: approvedRes[0]?.count ?? 0,
      archived: archivedRes[0]?.count ?? 0,
    };
  }
}

export const inquiryRepository = new InquiryRepository();
