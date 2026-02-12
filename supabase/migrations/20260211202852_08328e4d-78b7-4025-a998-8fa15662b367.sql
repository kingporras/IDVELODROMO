
-- Add unique constraint on mvp_votes (1 vote per user per match)
ALTER TABLE public.mvp_votes ADD CONSTRAINT mvp_votes_match_voter_unique UNIQUE (match_id, voter_user_id);

-- Add unique constraint on convocation_responses (1 response per user per convocation)
ALTER TABLE public.convocation_responses ADD CONSTRAINT convocation_responses_conv_user_unique UNIQUE (convocation_id, user_id);

-- Update config.toml edge function settings
