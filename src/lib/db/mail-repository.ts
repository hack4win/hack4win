import { db } from "./index";
import { EmailCampaign, CreateEmailCampaignInput } from "./types";

export interface RecipientInfo {
  email: string;
  name: string | null;
}

export interface IMailRepository {
  resolveRecipients(targetFilter: string): Promise<{ count: number; recipients: RecipientInfo[] }>;
  createCampaign(input: CreateEmailCampaignInput): Promise<EmailCampaign>;
  listCampaigns(limit?: number): Promise<EmailCampaign[]>;
  getCampaignStats(): Promise<{ totalCampaigns: number; totalSent: number; marketingCount: number; transactionalCount: number }>;
}

export class MailRepository implements IMailRepository {
  /**
   * Resolve target audience matching filter criteria
   */
  async resolveRecipients(targetFilter: string): Promise<{ count: number; recipients: RecipientInfo[] }> {
    try {
      if (targetFilter.startsWith("direct:")) {
        const directEmail = targetFilter.replace("direct:", "").trim();
        return {
          count: directEmail ? 1 : 0,
          recipients: directEmail ? [{ email: directEmail, name: "Direct Recipient" }] : [],
        };
      }

      if (targetFilter.startsWith("hackathon:")) {
        const hackathonId = targetFilter.replace("hackathon:", "").trim();
        const rows = await db`
          SELECT u.email, u.name
          FROM public.users u
          INNER JOIN public.hackathon_registrations r ON u.id = r.user_id
          WHERE r.hackathon_id = ${hackathonId}::uuid
          ORDER BY u.name ASC;
        `;
        return {
          count: rows.length,
          recipients: rows as unknown as RecipientInfo[],
        };
      }

      if (targetFilter.startsWith("role:")) {
        const role = targetFilter.replace("role:", "").trim();
        const rows = await db`
          SELECT email, name
          FROM public.users
          WHERE role = ${role}
          ORDER BY name ASC;
        `;
        return {
          count: rows.length,
          recipients: rows as unknown as RecipientInfo[],
        };
      }

      if (targetFilter.startsWith("skill:")) {
        const skill = targetFilter.replace("skill:", "").trim();
        const rows = await db`
          SELECT email, name
          FROM public.users
          WHERE ${skill} = ANY(skills)
          ORDER BY name ASC;
        `;
        return {
          count: rows.length,
          recipients: rows as unknown as RecipientInfo[],
        };
      }

      // Default: "all" users
      const rows = await db`
        SELECT email, name
        FROM public.users
        ORDER BY created_at DESC;
      `;
      return {
        count: rows.length,
        recipients: rows as unknown as RecipientInfo[],
      };
    } catch (err) {
      console.error("[MailRepository resolveRecipients Error]:", err);
      return { count: 0, recipients: [] };
    }
  }

  /**
   * Create and record a sent email campaign
   */
  async createCampaign(input: CreateEmailCampaignInput): Promise<EmailCampaign> {
    const emailsJson = JSON.stringify(input.recipient_emails || []);
    const count = input.recipient_count ?? (input.recipient_emails?.length || 0);

    const rows = await db`
      INSERT INTO public.email_campaigns (
        subject, type, target_filter, target_label,
        recipient_count, recipient_emails, content, preheader,
        status, sent_by, created_at
      )
      VALUES (
        ${input.subject},
        ${input.type},
        ${input.target_filter},
        ${input.target_label},
        ${count},
        ${emailsJson}::jsonb,
        ${input.content},
        ${input.preheader ?? null},
        'sent',
        ${input.sent_by ?? null},
        NOW()
      )
      RETURNING *;
    `;

    return rows[0] as unknown as EmailCampaign;
  }

  /**
   * List recent campaigns
   */
  async listCampaigns(limit: number = 30): Promise<EmailCampaign[]> {
    const rows = await db`
      SELECT *
      FROM public.email_campaigns
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
    return rows as unknown as EmailCampaign[];
  }

  /**
   * Campaign metrics
   */
  async getCampaignStats(): Promise<{
    totalCampaigns: number;
    totalSent: number;
    marketingCount: number;
    transactionalCount: number;
  }> {
    const rows = await db`
      SELECT
        COUNT(*)::int as total_campaigns,
        COALESCE(SUM(recipient_count), 0)::int as total_sent,
        COUNT(*) FILTER (WHERE type = 'marketing')::int as marketing_count,
        COUNT(*) FILTER (WHERE type = 'transactional')::int as transactional_count
      FROM public.email_campaigns;
    `;

    const res = rows[0] || {};
    return {
      totalCampaigns: res.total_campaigns ?? 0,
      totalSent: res.total_sent ?? 0,
      marketingCount: res.marketing_count ?? 0,
      transactionalCount: res.transactional_count ?? 0,
    };
  }
}

export const mailRepository = new MailRepository();
