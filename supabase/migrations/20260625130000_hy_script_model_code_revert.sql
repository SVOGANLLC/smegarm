-- Revert mistaken uppercase Latin → Armenian in model codes (first script run).
BEGIN;

UPDATE products SET description_hy = REPLACE(description_hy, 'ECF12WՀԵU', 'ECF12WHEU')
WHERE description_hy LIKE '%ECF12WՀԵU%';
UPDATE products SET description_hy = REPLACE(description_hy, 'EGF03WՀԵU', 'EGF03WHEU')
WHERE description_hy LIKE '%EGF03WՀԵU%';
UPDATE products SET description_hy = REPLACE(description_hy, 'EGF03ՑՐԵU', 'EGF03CREU')
WHERE description_hy LIKE '%EGF03ՑՐԵU%';

COMMIT;
