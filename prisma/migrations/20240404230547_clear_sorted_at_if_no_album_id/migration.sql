-- This is an empty migration.
UPDATE "Images"
SET sorted_status = NULL
WHERE sorted_album_id IS NULL;

UPDATE "Images"
SET updated_at = NULL
WHERE sorted_album_id IS NULL;