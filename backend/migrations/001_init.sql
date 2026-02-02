-- Migration: Create surveys and responses tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS surveys (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refid      VARCHAR(50) UNIQUE NOT NULL,
    name       VARCHAR(255) NOT NULL,
    secname    VARCHAR(255),
    data       JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS responses (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refid      VARCHAR(50) NOT NULL REFERENCES surveys(refid) ON DELETE CASCADE,
    name       VARCHAR(255),
    secname    VARCHAR(255),
    data       JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_refid ON responses(refid);
CREATE INDEX IF NOT EXISTS idx_surveys_refid ON surveys(refid);
