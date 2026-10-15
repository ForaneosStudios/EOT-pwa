-- ANTES de registrar desde la PWA  -> captura 01-db/antes.png
SELECT user_id, username, email, created_at FROM users ORDER BY created_at;

-- DESPUÉS de registrar desde la PWA -> captura 01-db/despues.png
SELECT user_id, username, email, left(password,4) AS prefijo_hash, length(password) AS largo_hash, created_at
FROM users ORDER BY created_at;

SELECT conname AS constraint, contype AS tipo FROM pg_constraint WHERE conrelid = 'users'::regclass;
