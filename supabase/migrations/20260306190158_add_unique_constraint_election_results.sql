-- Add unique constraint to allow UPSERT operations
ALTER TABLE election_results ADD CONSTRAINT unique_candidate_per_constituency UNIQUE (dist_id, const_id, candidate_name);
