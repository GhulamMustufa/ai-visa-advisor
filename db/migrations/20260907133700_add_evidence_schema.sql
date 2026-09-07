-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Evidence table
CREATE TABLE IF NOT EXISTS immigration_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT NOT NULL,
    authority_tier INTEGER NOT NULL CHECK (authority_tier BETWEEN 1 AND 5),
    country TEXT NOT NULL,
    jurisdiction TEXT,
    pathway TEXT,
    claim_type TEXT NOT NULL,
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_url TEXT NOT NULL,
    source_title TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL -- using text-embedding-3-small (1536 dims)
);

-- Index for vector search (using HNSW for better performance)
CREATE INDEX IF NOT EXISTS immigration_evidence_embedding_idx ON immigration_evidence USING hnsw (embedding vector_cosine_ops);

-- Index for exact metadata filtering
CREATE INDEX IF NOT EXISTS immigration_evidence_metadata_idx ON immigration_evidence (country, pathway, claim_type, authority_tier);

-- Match function for pgvector similarity search
CREATE OR REPLACE FUNCTION match_evidence (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_country text DEFAULT NULL,
  filter_pathway text DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_id TEXT,
  authority_tier INTEGER,
  country TEXT,
  jurisdiction TEXT,
  pathway TEXT,
  claim_type TEXT,
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  retrieved_at TIMESTAMPTZ,
  source_url TEXT,
  source_title TEXT,
  verification_status TEXT,
  content_hash TEXT,
  content TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.id,
    ie.source_id,
    ie.authority_tier,
    ie.country,
    ie.jurisdiction,
    ie.pathway,
    ie.claim_type,
    ie.effective_from,
    ie.effective_until,
    ie.retrieved_at,
    ie.source_url,
    ie.source_title,
    ie.verification_status,
    ie.content_hash,
    ie.content,
    1 - (ie.embedding <=> query_embedding) AS similarity
  FROM immigration_evidence ie
  WHERE
    (filter_country IS NULL OR ie.country = filter_country)
    AND (filter_pathway IS NULL OR ie.pathway = filter_pathway)
    AND 1 - (ie.embedding <=> query_embedding) > match_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
