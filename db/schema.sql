CREATE TABLE IF NOT EXISTS fully_rolled_out_flags (
  context_key VARCHAR(64) NOT NULL,
  flag_name VARCHAR(512) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (context_key, flag_name)
);
