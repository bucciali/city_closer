CREATE TABLE IF NOT EXISTS point_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_id UUID NOT NULL REFERENCES points(point_id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_tags_point_id ON point_tags(point_id);
CREATE INDEX IF NOT EXISTS idx_point_tags_tag ON point_tags(tag);