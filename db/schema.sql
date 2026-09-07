-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create immigration_evidence table
CREATE TABLE IF NOT EXISTS immigration_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT UNIQUE NOT NULL,
    authority_tier INTEGER NOT NULL,
    country TEXT NOT NULL,
    jurisdiction TEXT,
    pathway TEXT,
    claim_type TEXT NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE,
    effective_until TIMESTAMP WITH TIME ZONE,
    source_url TEXT NOT NULL,
    source_title TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create visa_submissions table to store assessment results
CREATE TABLE IF NOT EXISTS visa_submissions (
    id SERIAL PRIMARY KEY,
    request_id TEXT NOT NULL,
    ip TEXT,
    user_id TEXT, -- Clerk user ID
    prompt_version TEXT,
    model TEXT,
    profile JSONB NOT NULL,
    sources JSONB NOT NULL,
    response JSONB NOT NULL,
    latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_subscriptions table 
CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id TEXT PRIMARY KEY, -- Clerk user ID
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on embeddings for fast retrieval
CREATE INDEX IF NOT EXISTS immigration_evidence_embedding_idx ON immigration_evidence USING hnsw (embedding vector_cosine_ops);

-- Create match_evidence function
CREATE OR REPLACE FUNCTION match_evidence(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter_country text DEFAULT null,
    filter_pathway text DEFAULT null
)
RETURNS TABLE (
    id uuid,
    source_id text,
    authority_tier int,
    country text,
    jurisdiction text,
    pathway text,
    claim_type text,
    effective_from timestamp with time zone,
    effective_until timestamp with time zone,
    source_url text,
    source_title text,
    verification_status text,
    content text,
    content_hash text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.source_id,
        e.authority_tier,
        e.country,
        e.jurisdiction,
        e.pathway,
        e.claim_type,
        e.effective_from,
        e.effective_until,
        e.source_url,
        e.source_title,
        e.verification_status,
        e.content,
        e.content_hash,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM
        immigration_evidence e
    WHERE
        (filter_country IS NULL OR e.country = filter_country)
        AND (filter_pathway IS NULL OR e.pathway = filter_pathway)
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY
        e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
