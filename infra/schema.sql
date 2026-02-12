CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  hashed_password text NOT NULL,
  api_key text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  path_template text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  content_type text NOT NULL,
  text_content text,
  blob_url text,
  tags jsonb,
  folder_id uuid REFERENCES folders(id) ON DELETE SET NULL,
  is_pinned boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  hotkey_slot integer,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  match_type text NOT NULL,
  pattern text NOT NULL,
  action text NOT NULL,
  params jsonb,
  priority integer DEFAULT 0,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predicted_content text NOT NULL,
  actual_content text,
  confidence real DEFAULT 0,
  was_correct boolean,
  context jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prediction_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  window_size integer DEFAULT 100,
  accuracy real DEFAULT 0,
  total_predictions integer DEFAULT 0,
  correct_predictions integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clip_id uuid REFERENCES clips(id) ON DELETE SET NULL,
  role text NOT NULL,
  content text NOT NULL,
  workflow text,
  created_at timestamptz DEFAULT now()
);
