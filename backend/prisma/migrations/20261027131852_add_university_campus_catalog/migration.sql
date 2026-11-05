-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "University_name_key" ON "University"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Campus_universityId_name_key" ON "Campus"("universityId", "name");

-- AddForeignKey
ALTER TABLE "Campus" ADD CONSTRAINT "Campus_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Catálogo fijo de universidades y sedes (KAN-177).
-- Coordenadas obtenidas con Geoapify y verificadas manualmente.
INSERT INTO "University" ("id", "name") VALUES
                                            ('ua', 'Universidad Austral'),
                                            ('dt', 'Universidad Torcuato Di Tella'),
                                            ('uba', 'Universidad de Buenos Aires'),
                                            ('uca', 'Universidad Católica Argentina'),
                                            ('itba', 'Instituto Tecnológico de Buenos Aires'),
                                            ('uade', 'Universidad Argentina de la Empresa'),
                                            ('up', 'Universidad de Palermo'),
                                            ('ucema', 'Universidad del CEMA')
    ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Campus" ("id", "universityId", "name", "address", "latitude", "longitude") VALUES
                                                                                            ('ua-pilar', 'ua', 'Sede Pilar', 'Mariano Acosta 1611, Pilar', -34.451549, -58.862084),
                                                                                            ('ua-caba', 'ua', 'Sede CABA', 'Cerrito 1250, CABA', -34.593513, -58.382979),
                                                                                            ('dt-belgrano', 'dt', 'Sede Belgrano', 'Av. Presidente Figueroa Alcorta 7350, CABA', -34.547752, -58.446677),
                                                                                            ('uba-martinez', 'uba', 'Sede Martínez', 'Córdoba 2001, Martínez', -34.498395, -58.524974),
                                                                                            ('uba-ciudad-universitaria', 'uba', 'Sede Ciudad Universitaria', 'Av. Intendente Güiraldes 2160, CABA', -34.541972, -58.442406),
                                                                                            ('uba-paternal', 'uba', 'Sede Paternal', 'Av. San Martín 4453, CABA', -34.593443, -58.485538),
                                                                                            ('uca-puerto-madero', 'uca', 'Sede Puerto Madero', 'Av. Alicia Moreau de Justo 1500, CABA', -34.615096, -58.366029),
                                                                                            ('itba-parque-patricios', 'itba', 'Sede Parque Patricios', 'Lavardén 315, CABA', -34.641178, -58.401468),
                                                                                            ('itba-microcentro', 'itba', 'Sede Microcentro', 'San Martín 202, CABA', -34.605537, -58.373842),
                                                                                            ('uade-monserrat', 'uade', 'Sede Monserrat', 'Lima 757, CABA', -34.617126, -58.381704),
                                                                                            ('up-palermo', 'up', 'Sede Palermo', 'Mario Bravo 1050, CABA', -34.597337, -58.415887),
                                                                                            ('ucema-central', 'ucema', 'Sede Central', 'Av. Córdoba 374, CABA', -34.598606, -58.372413),
                                                                                            ('ucema-reconquista', 'ucema', 'Sede Reconquista', 'Reconquista 775, CABA', -34.598886, -58.372708)
    ON CONFLICT ("id") DO NOTHING;