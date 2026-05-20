CREATE TABLE point_types (
    type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO point_types (name) VALUES
    ('shop'),
    ('transport'),
    ('cafe'),
    ('pharmacy'),
    ('park'),
    ('other'),
    ('museum'),
    ('food'),
    ('landmark');