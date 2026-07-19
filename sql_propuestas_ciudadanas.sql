-- ============================================================
-- Tabla: propuestas_ciudadanas
-- Almacena las propuestas de microintervenciones ciudadanas
-- del Geoportal Participativo de Ibarra
-- ============================================================

CREATE TABLE IF NOT EXISTS propuestas_ciudadanas (
  id BIGSERIAL PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'ACERAS','ILUMINACION','ARBOLADO','MOBILIARIO','DRENAJE',
    'SEGURIDAD','REPAVEO','ESPACIO_VERDE','SEÑALIZACION','OTROS'
  )),
  titulo TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  prioridad INTEGER NOT NULL DEFAULT 3 CHECK (prioridad BETWEEN 1 AND 5),
  autor TEXT DEFAULT 'Anónimo',
  fecha TIMESTAMPTZ DEFAULT NOW(),
  votos INTEGER DEFAULT 0,
  geom GEOMETRY(Point, 4326)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_propuestas_categoria ON propuestas_ciudadanas(categoria);
CREATE INDEX IF NOT EXISTS idx_propuestas_prioridad ON propuestas_ciudadanas(prioridad);
CREATE INDEX IF NOT EXISTS idx_propuestas_geom ON propuestas_ciudadanas USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_propuestas_fecha ON propuestas_ciudadanas(fecha DESC);

-- Trigger para mantener geom sincronizado con lat/lng
CREATE OR REPLACE FUNCTION actualizar_geom_propuesta()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_geom_propuesta ON propuestas_ciudadanas;
CREATE TRIGGER trg_geom_propuesta
  BEFORE INSERT OR UPDATE ON propuestas_ciudadanas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_geom_propuesta();

-- Habilitar RLS (Row Level Security)
ALTER TABLE propuestas_ciudadanas ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública, escritura pública (geoportal anónimo)
CREATE POLICY "Lectura pública propuestas"
  ON propuestas_ciudadanas FOR SELECT
  USING (true);

CREATE POLICY "Insertar propuestas"
  ON propuestas_ciudadanas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Actualizar votos"
  ON propuestas_ciudadanas FOR UPDATE
  USING (true);

-- Permisos para el rol anónimo (Supabase)
GRANT SELECT, INSERT, UPDATE ON propuestas_ciudadanas TO anon;
GRANT USAGE, SELECT ON SEQUENCE propuestas_ciudadanas_id_seq TO anon;
