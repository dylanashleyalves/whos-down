-- Tell people nearby when someone posts an "I'd be down for…" idea, the same way new
-- activities are announced (0015). Tapping it opens the idea. The push function decides
-- who hears about it and keeps to the daily limit.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Then deploy the push function again so it knows the new 'idea' type.

create trigger push_on_idea
  after insert on public.ideas
  for each row execute function public.notify_push('idea');
