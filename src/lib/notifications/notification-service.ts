import { db } from "@/lib/db";
import { SessionUser } from "@/lib/db/types";

export type NotificationCategory =
  | "verification"
  | "judging"
  | "inquiry"
  | "hackathon"
  | "submission"
  | "system";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionUrl: string;
  actionLabel: string;
  targetRole: "organizer" | "judge" | "admin";
  hackathonId?: string;
  hackathonTitle?: string;
  createdAt: string;
  isRead: boolean;
  meta?: Record<string, unknown>;
}

export interface GetNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  totalCount: number;
  role: string;
}

/**
 * Service to aggregate dynamic, real-time platform notifications
 * for Organizer, Judge, and Administrator roles.
 */
export class NotificationService {
  /**
   * Fetch all relevant notifications for a privileged user
   */
  async getNotificationsForUser(user: SessionUser): Promise<GetNotificationsResult> {
    const role = user.role;
    if (role !== "admin" && role !== "organizer" && role !== "judge") {
      return {
        notifications: [],
        unreadCount: 0,
        totalCount: 0,
        role,
      };
    }

    const rawNotifications: AppNotification[] = [];
    const now = new Date();

    // 1. Fetch user's read notification IDs
    const readRows = await db`
      SELECT notification_id 
      FROM public.user_notification_reads 
      WHERE user_id = ${user.id};
    `;
    const readSet = new Set<string>(readRows.map((r) => r.notification_id as string));

    // ==========================================
    // A. ORGANIZER NOTIFICATIONS
    // ==========================================
    if (role === "organizer" || role === "admin") {
      // 1. Pending UPI Payment Verifications
      const pendingPayments = role === "admin"
        ? await db`
            SELECT 
              r.id as registration_id,
              r.hackathon_id,
              r.payment_amount,
              r.payment_reference,
              r.payment_screenshot_url,
              r.created_at,
              u.name as student_name,
              u.email as student_email,
              h.title as hackathon_title,
              h.fee_currency
            FROM public.hackathon_registrations r
            JOIN public.hackathons h ON h.id = r.hackathon_id
            JOIN public.users u ON u.id = r.user_id
            WHERE r.payment_status = 'pending_verification'
            ORDER BY r.created_at DESC
            LIMIT 15;
          `
        : await db`
            SELECT 
              r.id as registration_id,
              r.hackathon_id,
              r.payment_amount,
              r.payment_reference,
              r.payment_screenshot_url,
              r.created_at,
              u.name as student_name,
              u.email as student_email,
              h.title as hackathon_title,
              h.fee_currency
            FROM public.hackathon_registrations r
            JOIN public.hackathons h ON h.id = r.hackathon_id
            JOIN public.users u ON u.id = r.user_id
            WHERE r.payment_status = 'pending_verification'
              AND h.organizer_id = ${user.id}
            ORDER BY r.created_at DESC
            LIMIT 15;
          `;

      for (const p of pendingPayments) {
        const id = `notif-payment-${p.registration_id}`;
        rawNotifications.push({
          id,
          title: "Payment Proof Verification Required",
          message: `${p.student_name || p.student_email} submitted ${p.fee_currency || "₹"}${p.payment_amount || 0} with UTR reference ${p.payment_reference || "Pending"} for "${p.hackathon_title}".`,
          category: "verification",
          priority: "urgent",
          actionUrl: `/organizer/hackathons/${p.hackathon_id}/students?status=pending_verification`,
          actionLabel: "Verify Payment Receipt",
          targetRole: "organizer",
          hackathonId: p.hackathon_id as string,
          hackathonTitle: p.hackathon_title as string,
          createdAt: (p.created_at as Date)?.toISOString() || now.toISOString(),
          isRead: readSet.has(id),
          meta: {
            utr: p.payment_reference,
            amount: p.payment_amount,
          },
        });
      }

      // 2. Pending Student Campus Whitelist Approvals
      const pendingStudents = role === "admin"
        ? await db`
            SELECT 
              r.id as registration_id,
              r.hackathon_id,
              r.student_id,
              r.college_name,
              r.created_at,
              u.name as student_name,
              u.email as student_email,
              h.title as hackathon_title
            FROM public.hackathon_registrations r
            JOIN public.hackathons h ON h.id = r.hackathon_id
            JOIN public.users u ON u.id = r.user_id
            WHERE r.status = 'pending'
              AND (r.payment_status IS NULL OR r.payment_status != 'pending_verification')
            ORDER BY r.created_at DESC
            LIMIT 15;
          `
        : await db`
            SELECT 
              r.id as registration_id,
              r.hackathon_id,
              r.student_id,
              r.college_name,
              r.created_at,
              u.name as student_name,
              u.email as student_email,
              h.title as hackathon_title
            FROM public.hackathon_registrations r
            JOIN public.hackathons h ON h.id = r.hackathon_id
            JOIN public.users u ON u.id = r.user_id
            WHERE r.status = 'pending'
              AND (r.payment_status IS NULL OR r.payment_status != 'pending_verification')
              AND h.organizer_id = ${user.id}
            ORDER BY r.created_at DESC
            LIMIT 15;
          `;

      for (const s of pendingStudents) {
        const id = `notif-student-${s.registration_id}`;
        rawNotifications.push({
          id,
          title: "Campus Access Review Pending",
          message: `${s.student_name || s.student_email} (${s.college_name || "Campus Builder"}) applied for "${s.hackathon_title}" and requires organizer approval.`,
          category: "verification",
          priority: "high",
          actionUrl: `/organizer/hackathons/${s.hackathon_id}/students?status=pending`,
          actionLabel: "Review Roster Access",
          targetRole: "organizer",
          hackathonId: s.hackathon_id as string,
          hackathonTitle: s.hackathon_title as string,
          createdAt: (s.created_at as Date)?.toISOString() || now.toISOString(),
          isRead: readSet.has(id),
        });
      }

      // 3. New Submissions Received (last 7 days)
      const recentSubmissions = role === "admin"
        ? await db`
            SELECT 
              s.id as submission_id,
              s.hackathon_id,
              s.title as submission_title,
              s.created_at,
              u.name as user_name,
              h.title as hackathon_title
            FROM public.hackathon_submissions s
            JOIN public.hackathons h ON h.id = s.hackathon_id
            LEFT JOIN public.users u ON u.id = s.user_id
            WHERE s.created_at >= NOW() - INTERVAL '7 days'
            ORDER BY s.created_at DESC
            LIMIT 10;
          `
        : await db`
            SELECT 
              s.id as submission_id,
              s.hackathon_id,
              s.title as submission_title,
              s.created_at,
              u.name as user_name,
              h.title as hackathon_title
            FROM public.hackathon_submissions s
            JOIN public.hackathons h ON h.id = s.hackathon_id
            LEFT JOIN public.users u ON u.id = s.user_id
            WHERE s.created_at >= NOW() - INTERVAL '7 days'
              AND h.organizer_id = ${user.id}
            ORDER BY s.created_at DESC
            LIMIT 10;
          `;

      for (const sub of recentSubmissions) {
        const id = `notif-submission-${sub.submission_id}`;
        rawNotifications.push({
          id,
          title: `New Project: ${sub.submission_title}`,
          message: `${sub.user_name || "Builder"} submitted a new project for "${sub.hackathon_title}".`,
          category: "submission",
          priority: "medium",
          actionUrl: `/projects/${sub.submission_id}`,
          actionLabel: "View Project Build",
          targetRole: "organizer",
          hackathonId: sub.hackathon_id as string,
          hackathonTitle: sub.hackathon_title as string,
          createdAt: (sub.created_at as Date)?.toISOString() || now.toISOString(),
          isRead: readSet.has(id),
        });
      }

      // 4. Upcoming Deadlines in next 48 hours
      const closingHackathons = role === "admin"
        ? await db`
            SELECT id, title, slug, submission_deadline, end_date
            FROM public.hackathons
            WHERE status = 'ongoing'
              AND submission_deadline >= NOW()
              AND submission_deadline <= NOW() + INTERVAL '48 hours'
            ORDER BY submission_deadline ASC;
          `
        : await db`
            SELECT id, title, slug, submission_deadline, end_date
            FROM public.hackathons
            WHERE status = 'ongoing'
              AND organizer_id = ${user.id}
              AND submission_deadline >= NOW()
              AND submission_deadline <= NOW() + INTERVAL '48 hours'
            ORDER BY submission_deadline ASC;
          `;

      for (const h of closingHackathons) {
        const id = `notif-deadline-${h.id}`;
        rawNotifications.push({
          id,
          title: `Submission Deadline Approaching: ${h.title}`,
          message: `Submissions for "${h.title}" will close in less than 48 hours. Ensure your participants and judges are aligned.`,
          category: "hackathon",
          priority: "urgent",
          actionUrl: `/hackathons/${h.slug}`,
          actionLabel: "Inspect Competition Status",
          targetRole: "organizer",
          hackathonId: h.id as string,
          hackathonTitle: h.title as string,
          createdAt: now.toISOString(),
          isRead: readSet.has(id),
        });
      }
    }

    // ==========================================
    // B. JUDGE NOTIFICATIONS
    // ==========================================
    if (role === "judge" || role === "admin") {
      // 1. Assigned Hackathons awaiting judge scorecard evaluation
      const judgeHackathons = role === "admin"
        ? await db`
            SELECT DISTINCT h.id, h.title, h.slug, h.status
            FROM public.hackathons h
            WHERE h.status IN ('ongoing', 'judging');
          `
        : await db`
            SELECT h.id, h.title, h.slug, h.status
            FROM public.hackathon_judges hj
            JOIN public.hackathons h ON h.id = hj.hackathon_id
            WHERE hj.judge_id = ${user.id}
              AND h.status IN ('ongoing', 'judging');
          `;

      for (const jh of judgeHackathons) {
        // Count un-evaluated submissions for this judge in this hackathon
        const unEvaluated = await db`
          SELECT s.id, s.title
          FROM public.hackathon_submissions s
          WHERE s.hackathon_id = ${jh.id}::uuid
            AND NOT EXISTS (
              SELECT 1 FROM public.project_evaluations pe 
              WHERE pe.submission_id = s.id AND pe.judge_id = ${user.id}
            )
          LIMIT 10;
        `;

        if (unEvaluated.length > 0) {
          const id = `notif-judge-pending-${jh.id}-${user.id}`;
          rawNotifications.push({
            id,
            title: `${unEvaluated.length} Project(s) Awaiting Evaluation`,
            message: `You have ${unEvaluated.length} project submission(s) awaiting your scorecard rubric review in "${jh.title}".`,
            category: "judging",
            priority: "high",
            actionUrl: `/judges/evaluations`,
            actionLabel: "Open Scoring Console",
            targetRole: "judge",
            hackathonId: jh.id as string,
            hackathonTitle: jh.title as string,
            createdAt: now.toISOString(),
            isRead: readSet.has(id),
            meta: {
              pendingCount: unEvaluated.length,
            },
          });
        }
      }
    }

    // ==========================================
    // C. ADMINISTRATOR NOTIFICATIONS
    // ==========================================
    if (role === "admin") {
      // 1. Pending Host Inquiries
      const pendingInquiries = await db`
        SELECT id, organization_name, contact_name, email, created_at, estimated_prize_pool
        FROM public.host_inquiries
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 10;
      `;

      for (const inq of pendingInquiries) {
        const id = `notif-inquiry-${inq.id}`;
        rawNotifications.push({
          id,
          title: `Host Inquiry: ${inq.organization_name || "New Partner"}`,
          message: `${inq.contact_name} (${inq.email}) submitted a request to organize a hackathon (estimated prize pool: ${inq.estimated_prize_pool || "TBD"}).`,
          category: "inquiry",
          priority: "high",
          actionUrl: `/admin/inquiries`,
          actionLabel: "Review Host Request",
          targetRole: "admin",
          createdAt: (inq.created_at as Date)?.toISOString() || now.toISOString(),
          isRead: readSet.has(id),
        });
      }

      // 2. Draft Hackathons Awaiting Launch
      const draftHackathons = await db`
        SELECT id, title, slug, created_at
        FROM public.hackathons
        WHERE status = 'draft'
        ORDER BY created_at DESC
        LIMIT 5;
      `;

      if (draftHackathons.length > 0) {
        const id = `notif-draft-hackathons-${draftHackathons[0].id}`;
        rawNotifications.push({
          id,
          title: `${draftHackathons.length} Draft Hackathon(s) Saved`,
          message: `Competitions like "${draftHackathons[0].title}" are currently in draft status and not yet live to participants.`,
          category: "hackathon",
          priority: "low",
          actionUrl: `/admin/hackathons`,
          actionLabel: "Manage Competitions",
          targetRole: "admin",
          createdAt: (draftHackathons[0].created_at as Date)?.toISOString() || now.toISOString(),
          isRead: readSet.has(id),
        });
      }
    }

    // Sort: Urgent/High priority first, then unread first, then by date DESC
    const priorityWeight: Record<NotificationPriority, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    rawNotifications.sort((a, b) => {
      // Unread before read
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      // Higher priority first
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      // Newer date first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const unreadCount = rawNotifications.filter((n) => !n.isRead).length;

    return {
      notifications: rawNotifications,
      unreadCount,
      totalCount: rawNotifications.length,
      role,
    };
  }

  /**
   * Mark a specific notification or all notifications as read for a user
   */
  async markAsRead(userId: string, notificationId?: string, all = false): Promise<void> {
    if (!userId) return;

    if (all) {
      // Fetch user to get current active notification IDs
      const userRows = await db`SELECT id, role FROM public.users WHERE id = ${userId} LIMIT 1;`;
      if (!userRows || userRows.length === 0) return;
      const user = userRows[0] as unknown as SessionUser;

      const result = await this.getNotificationsForUser(user);
      for (const notif of result.notifications) {
        await db`
          INSERT INTO public.user_notification_reads (user_id, notification_id, read_at)
          VALUES (${userId}, ${notif.id}, NOW())
          ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = NOW();
        `;
      }
      return;
    }

    if (notificationId) {
      await db`
        INSERT INTO public.user_notification_reads (user_id, notification_id, read_at)
        VALUES (${userId}, ${notificationId}, NOW())
        ON CONFLICT (user_id, notification_id) DO UPDATE SET read_at = NOW();
      `;
    }
  }
}

export const notificationService = new NotificationService();
