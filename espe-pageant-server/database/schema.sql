-- ESPE Beauty Pageant Database Schema
-- PostgreSQL Database

-- Tabla de usuarios (jueces, administradores, etc.)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('judge', 'admin', 'superadmin', 'notary', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de candidatas
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    major VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    image_url TEXT,
    biography TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de eventos/modalidades
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('typical_costume', 'evening_gown', 'qa')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'closed')),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de calificaciones de jueces
CREATE TABLE judge_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judge_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    score DECIMAL(3,1) NOT NULL CHECK (score >= 0 AND score <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(judge_id, candidate_id, event_id)
);

-- Tabla de votos populares
CREATE TABLE public_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_ip VARCHAR(45),
    voter_session VARCHAR(255),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(voter_ip, voter_session)
);

-- Tabla de configuración del sistema
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de reportes generados
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(100) NOT NULL,
    file_url TEXT,
    generated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX idx_judge_scores_judge_id ON judge_scores(judge_id);
CREATE INDEX idx_judge_scores_candidate_id ON judge_scores(candidate_id);
CREATE INDEX idx_judge_scores_event_id ON judge_scores(event_id);
CREATE INDEX idx_public_votes_candidate_id ON public_votes(candidate_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_type ON events(event_type);

-- Triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_judge_scores_updated_at BEFORE UPDATE ON judge_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Datos de ejemplo
-- Insertar eventos por defecto
INSERT INTO events (name, event_type, status) VALUES
('Traje Típico', 'typical_costume', 'pending'),
('Vestido de Gala', 'evening_gown', 'pending'),
('Preguntas y Respuestas', 'qa', 'pending');

-- Insertar configuraciones por defecto
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('voting_enabled', 'true', 'Habilitar votación pública'),
('max_score', '10.0', 'Puntuación máxima por juez'),
('min_score', '0.0', 'Puntuación mínima por juez'),
('system_name', 'ESPE Reinas', 'Nombre del sistema'),
('competition_year', '2025', 'Año de la competencia');

-- Usuario administrador por defecto (password: admin123)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@espe.edu.ec', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', 'Administrador Sistema', 'superadmin');

-- Vistas para consultas comunes
-- Vista para resultados consolidados por candidata
CREATE VIEW candidate_results AS
SELECT 
    c.id,
    c.name,
    c.major,
    c.department,
    c.image_url,
    e.event_type,
    AVG(js.score) as average_score,
    COUNT(js.score) as judge_count,
    COUNT(pv.id) as public_votes
FROM candidates c
LEFT JOIN judge_scores js ON c.id = js.candidate_id
LEFT JOIN events e ON js.event_id = e.id
LEFT JOIN public_votes pv ON c.id = pv.candidate_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.major, c.department, c.image_url, e.event_type;

-- Vista para ranking general
CREATE VIEW general_ranking AS
SELECT 
    c.id,
    c.name,
    c.major,
    c.department,
    c.image_url,
    AVG(js.score) as overall_average,
    COUNT(DISTINCT js.judge_id) as judge_count,
    COUNT(pv.id) as public_votes
FROM candidates c
LEFT JOIN judge_scores js ON c.id = js.candidate_id
LEFT JOIN public_votes pv ON c.id = pv.candidate_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.major, c.department, c.image_url
ORDER BY overall_average DESC NULLS LAST; 