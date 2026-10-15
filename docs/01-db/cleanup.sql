-- cleanup.sql : elimina SOLO los datos de prueba del laboratorio (dominio @lab.test)
DELETE FROM users WHERE email LIKE '%@lab.test';

-- Verificación: debe devolver 0
SELECT COUNT(*) AS usuarios_de_prueba FROM users WHERE email LIKE '%@lab.test';
