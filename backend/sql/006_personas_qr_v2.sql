-- QR canónico para catálogo de personas
-- Formato final:
-- IMPULSO|2|PERSONA|<UUID>

UPDATE personas
SET qr_value = 'IMPULSO|2|PERSONA|' || id::text
WHERE qr_value IS DISTINCT FROM 'IMPULSO|2|PERSONA|' || id::text;