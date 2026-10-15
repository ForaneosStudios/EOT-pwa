-- seed.sql : estado inicial del laboratorio
-- Contraseña en texto plano de los 3 usuarios (solo para pruebas): SuperSecretPassword123!
-- El valor guardado es el hash BCrypt, igual que lo guarda el backend.
INSERT INTO users (username, email, password, profile_picture) VALUES
('TestUno',  'test1@lab.test', '$2a$10$EHN6eXSUE/chPtJzUp3Z0uLDWE7phkgEbFcprMumcGNVwc/FraGfe', NULL),
('TestDos',  'test2@lab.test', '$2a$10$EHN6eXSUE/chPtJzUp3Z0uLDWE7phkgEbFcprMumcGNVwc/FraGfe', NULL),
('TestTres', 'test3@lab.test', '$2a$10$EHN6eXSUE/chPtJzUp3Z0uLDWE7phkgEbFcprMumcGNVwc/FraGfe', NULL)
ON CONFLICT (email) DO NOTHING;

-- Verificación
SELECT user_id, username, email, created_at FROM users WHERE email LIKE '%@lab.test' ORDER BY created_at;
