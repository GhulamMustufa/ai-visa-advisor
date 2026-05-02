create table if not exists visa_submissions (
  id bigserial primary key,
  request_id text not null unique,
  created_at timestamptz not null default now(),
  ip text not null,
  prompt_version text not null,
  model text not null,
  profile jsonb not null,
  sources jsonb not null,
  response jsonb not null,
  latency_ms integer not null
);

create index if not exists visa_submissions_created_at_idx
  on visa_submissions (created_at desc);
