-- Production Performance Indexes for Hack4Win Platform
-- Applied on Neon PostgreSQL database

-- 1. Hackathon Submissions: accelerate detail lookup by hackathon, author, and featured filter
CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_hackathon_id ON public.hackathon_submissions(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_user_id ON public.hackathon_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_submissions_featured ON public.hackathon_submissions(is_featured) WHERE is_featured = true;

-- 2. Hackathon Registrations: accelerate user registration checks and campus status lookups
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_user_id ON public.hackathon_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_status ON public.hackathon_registrations(status);

-- 3. Team Invitations: speed up collaboration lookups, pending invite resolution, and linking
CREATE INDEX IF NOT EXISTS idx_team_invitations_hackathon_id ON public.team_invitations(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_sender_id ON public.team_invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_receiver_id ON public.team_invitations(receiver_id);

-- 4. Project Evaluations: index judge assignments
CREATE INDEX IF NOT EXISTS idx_project_evaluations_judge_id ON public.project_evaluations(judge_id);
