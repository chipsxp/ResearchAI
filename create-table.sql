-- PostgreSQL syntax (pgvector extension)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddedinfo (
    id bigserial PRIMARY KEY,
    filename text NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    embedding vector(1536), -- 1536-dimensional embeddings (text-embedding-3-small)
    created_at timestamptz DEFAULT now()
);

-- Create GIN index on metadata for efficient @> filtering --
CREATE INDEX idx_embeddedinfo_metadata ON embeddedinfo USING GIN (metadata);

-- Function to match information using semantic similarity search
-- IMPORTANT: Run "DROP FUNCTION IF EXISTS match_information;" before creating if updating
CREATE FUNCTION match_information (
    query_embedding vector(1536), -- matches the embedding dimensions
    match_count int DEFAULT 5,    -- maximum number of results to return
    match_threshold float DEFAULT 0.1, -- minimum similarity score (lowered from 0.3)
    filter jsonb DEFAULT NULL     -- optional metadata filter (changed from '{}' to NULL)
) RETURNS TABLE(
    id bigint,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT
        embeddedinfo.id,
        embeddedinfo.content,
        embeddedinfo.metadata,
        1 - (embeddedinfo.embedding <=> query_embedding) AS similarity
    FROM embeddedinfo
    WHERE 
        -- FIX: Only apply metadata filter if one is provided (fixes NULL metadata bug)
        (filter IS NULL OR embeddedinfo.metadata @> filter)
        AND 1 - (embeddedinfo.embedding <=> query_embedding) > match_threshold
    ORDER BY embeddedinfo.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
