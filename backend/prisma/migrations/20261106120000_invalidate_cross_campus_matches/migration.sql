-- Las sugerencias generadas antes del filtro de sede y sentido pueden cruzar
-- sedes o sentidos. Se invalidan para que no se muestren ni se acepten. Los
-- datos anteriores al catálogo, sin sede o sin sentido, no se filtran por ese
-- campo, igual que en el matching
UPDATE "TravelMatch" AS m
SET "status" = 'INVALIDATED', "updatedAt" = CURRENT_TIMESTAMP
FROM "Trip" AS t, "TravelIntent" AS i
WHERE m."tripId" = t."id"
  AND m."travelIntentId" = i."id"
  AND m."status" = 'SUGGESTED'
  AND (
    (t."campusId" IS NOT NULL AND i."campusId" IS NOT NULL AND t."campusId" <> i."campusId")
    OR (t."routeDirection" IS NOT NULL AND i."routeDirection" IS NOT NULL AND t."routeDirection" <> i."routeDirection")
  );
