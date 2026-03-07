-- Bot conversation history — persistent memory across server restarts
CREATE TABLE public.bot_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_jid  TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX bot_messages_group_jid_idx ON public.bot_messages (group_jid, created_at);
