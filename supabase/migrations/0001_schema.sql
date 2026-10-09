-- Verity core schema: tables, constraints, indexes.
create extension if not exists pg_trgm;

-- PROFILES & SETTINGS --------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 300),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  interests text[] not null default '{}' check (cardinality(interests) <= 12),
  role text not null default 'user' check (role in ('user','support','moderator','admin')),
  is_suspended boolean not null default false,
  onboarded boolean not null default false,
  show_memberships boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_username_trgm on public.profiles using gin (username gin_trgm_ops);
create index profiles_display_name_trgm on public.profiles using gin (display_name gin_trgm_ops);

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  languages text[] not null default '{en}',
  notification_prefs jsonb not null default
    '{"follows":true,"comments":true,"mentions":true,"communities":true,"answers":true,"support":true,"moderation":true}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

-- COMMUNITIES ----------------------------------------------------------------
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,32}$'),
  name text not null unique check (char_length(name) between 3 and 50),
  description text not null default '' check (char_length(description) <= 500),
  topic text not null default 'general' check (char_length(topic) <= 40),
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(topic,''))
  ) stored
);
create index communities_search_idx on public.communities using gin (search);
create index communities_topic_idx on public.communities (topic);

create table public.community_memberships (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member','moderator','owner')),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_memberships_user_idx on public.community_memberships (user_id);

create table public.community_rules (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  position int not null default 0,
  title text not null check (char_length(title) between 1 and 100),
  body text not null default '' check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);
create index community_rules_community_idx on public.community_rules (community_id, position);

-- POSTS ----------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  type text not null check (type in ('text','image','link','video','poll')),
  title text check (char_length(title) <= 300),
  body text not null default '' check (char_length(body) <= 20000),
  link_url text check (link_url is null or link_url ~ '^https?://'),
  video_url text check (video_url is null or video_url ~ '^https?://'),
  source_url text check (source_url is null or source_url ~ '^https?://'),
  declared_category text check (declared_category in
    ('original','ai_generated','ai_edited','meme','satire','parody','fiction','educational','news','opinion')),
  ai_disclosure boolean not null default false,
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  status text not null default 'published' check (status in ('published','restricted','removed')),
  removal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body,''))
  ) stored
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_community_idx on public.posts (community_id, created_at desc);
create index posts_tags_idx on public.posts using gin (tags);
create index posts_search_idx on public.posts using gin (search);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  storage_path text not null,
  mime_type text not null,
  size_bytes int not null check (size_bytes > 0),
  alt_text text check (char_length(alt_text) <= 500),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index post_media_post_idx on public.post_media (post_id, position);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 100),
  position int not null default 0
);
create index poll_options_post_idx on public.poll_options (post_id);

create table public.poll_votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index poll_votes_option_idx on public.poll_votes (option_id);

-- VERIFICATION ---------------------------------------------------------------
create table public.content_checks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  provider text not null,
  check_type text not null check (check_type in ('media_origin','claim','fact_check_search')),
  status text not null check (status in
    ('not_checked','checking','evidence_found','uncertain','disputed','provider_not_configured','failed')),
  claim text,
  signals jsonb not null default '[]'::jsonb,
  supporting jsonb not null default '[]'::jsonb,
  contradicting jsonb not null default '[]'::jsonb,
  explanation text,
  uncertainty text,
  is_demo boolean not null default false,
  assessed_at timestamptz,
  created_at timestamptz not null default now()
);
create index content_checks_post_idx on public.content_checks (post_id, created_at desc);

create table public.post_labels (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  dimension text not null check (dimension in ('origin','accuracy','intent')),
  value text not null check (value in (
    'ai_generated','ai_edited','creator_declared_ai','provenance_available','origin_uncertain','origin_unknown',
    'supported','contradicted','misleading_context','disputed','not_verified',
    'meme','entertainment','satire','parody','fiction','educational','news','opinion','original')),
  basis text not null check (basis in ('creator_declared','automated','human_review','demo')),
  evidence_check_id uuid references public.content_checks(id) on delete set null,
  status text not null default 'active' check (status in ('active','superseded','removed')),
  explanation text check (char_length(explanation) <= 2000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index post_labels_post_idx on public.post_labels (post_id, status);

create table public.post_sources (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null check (url ~ '^https?://'),
  title text check (char_length(title) <= 300),
  publisher text check (char_length(publisher) <= 120),
  stance text not null default 'context' check (stance in ('supporting','contradicting','context')),
  origin text not null default 'user' check (origin in ('user','provider','staff')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index post_sources_post_idx on public.post_sources (post_id);

-- QUESTIONS & ANSWERS --------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid references public.communities(id) on delete set null,
  title text not null check (char_length(title) between 10 and 300),
  details text not null default '' check (char_length(details) <= 10000),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  "references" text[] not null default '{}' check (cardinality("references") <= 10),
  accepted_answer_id uuid,
  status text not null default 'published' check (status in ('published','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(details,''))
  ) stored
);
create index questions_created_idx on public.questions (created_at desc);
create index questions_search_idx on public.questions using gin (search);
create index questions_tags_idx on public.questions using gin (tags);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 20000),
  citations text[] not null default '{}' check (cardinality(citations) <= 10),
  status text not null default 'published' check (status in ('published','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index answers_question_idx on public.answers (question_id, created_at);

alter table public.questions
  add constraint questions_accepted_answer_fk
  foreign key (accepted_answer_id) references public.answers(id) on delete set null;

create table public.question_votes (
  answer_id uuid not null references public.answers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);

create table public.question_links (
  question_id uuid not null references public.questions(id) on delete cascade,
  related_question_id uuid not null references public.questions(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (question_id, related_question_id),
  check (question_id <> related_question_id)
);

-- COMMENTS, REACTIONS, BOOKMARKS ---------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((post_id is null) <> (answer_id is null))
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_answer_idx on public.comments (answer_id, created_at);
create index comments_author_idx on public.comments (author_id, created_at desc);

create table public.reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index reactions_user_idx on public.reactions (user_id);

create table public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- TRUST & SAFETY -------------------------------------------------------------
create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete set null,
  label_id uuid references public.post_labels(id) on delete set null,
  case_type text not null check (case_type in ('label_review','appeal','report')),
  status text not null default 'awaiting_review' check (status in
    ('submitted','awaiting_review','under_review','awaiting_information','resolved','appealed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  opened_by uuid references public.profiles(id) on delete set null,
  summary text check (char_length(summary) <= 2000),
  resolution text,
  needs_second_review boolean not null default false,
  due_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index moderation_cases_status_idx on public.moderation_cases (status, priority, due_at);
create index moderation_cases_post_idx on public.moderation_cases (post_id);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.moderation_cases(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  reason text not null,
  previous_state jsonb,
  new_state jsonb,
  created_at timestamptz not null default now()
);
create index moderation_actions_case_idx on public.moderation_actions (case_id, created_at);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','question','answer','profile')),
  target_id uuid not null,
  reason text not null check (reason in
    ('spam','harassment','misinformation','hate','violence','impersonation','privacy','copyright','incorrect_label','other')),
  details text check (char_length(details) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  case_id uuid references public.moderation_cases(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_status_idx on public.reports (status, created_at desc);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.moderation_cases(id) on delete set null,
  post_id uuid not null references public.posts(id) on delete cascade,
  label_id uuid references public.post_labels(id) on delete set null,
  prior_action_id uuid references public.moderation_actions(id) on delete set null,
  appellant_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 2000),
  evidence text check (char_length(evidence) <= 4000),
  evidence_path text,
  status text not null default 'submitted' check (status in
    ('submitted','awaiting_review','under_review','awaiting_information','resolved','appealed')),
  final_decision text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appeals_appellant_idx on public.appeals (appellant_id, created_at desc);

-- SUPPORT --------------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in (
    'incorrect_ai_label','incorrect_misinformation_label','removed_post_appeal','harmful_content',
    'impersonation_privacy','account_recovery','login_problem','technical_issue','general')),
  subject text not null check (char_length(subject) between 5 and 150),
  description text not null check (char_length(description) between 20 and 5000),
  related_post_id uuid references public.posts(id) on delete set null,
  related_username text check (related_username is null or related_username ~ '^[a-z0-9_]{3,24}$'),
  status text not null default 'received' check (status in
    ('received','under_review','awaiting_information','resolved','appealed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_team text not null default 'support' check (assigned_team in ('support','trust_safety')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution text,
  escalated boolean not null default false,
  response_due_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index support_tickets_queue_idx on public.support_tickets (status, priority, response_due_at);

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  is_staff boolean not null default false,
  is_internal boolean not null default false,
  attachment_path text,
  created_at timestamptz not null default now()
);
create index support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);

-- NOTIFICATIONS & AUDIT ------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in
    ('follow','comment','reply','mention','community','answer','support','appeal','moderation','review')),
  message text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
