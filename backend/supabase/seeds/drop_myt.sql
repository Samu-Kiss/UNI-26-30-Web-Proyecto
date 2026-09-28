-- drop_myt.sql
-- Script de eliminación de tablas del esquema app en orden estricto de dependencias.
-- No utiliza CASCADE, no elimina la base de datos ni el esquema public.

BEGIN;

-- 1. Mensajes (depende de conversaciones y usuarios)
DROP TABLE IF EXISTS app.mensajes;

-- 2. Conversaciones (depende de reservas)
DROP TABLE IF EXISTS app.conversaciones;

-- 3. Reseñas (depende de reservas)
DROP TABLE IF EXISTS app.resenas;

-- 4. Reservas (depende de estudiantes, tutores y materias)
DROP TABLE IF EXISTS app.reservas;

-- 5. Bloqueos de agenda (depende de tutores)
DROP TABLE IF EXISTS app.bloqueos_agenda;

-- 6. Disponibilidades de tutor (depende de tutores)
DROP TABLE IF EXISTS app.disponibilidades_tutor;

-- 7. Tutor - Materias (depende de tutores y materias)
DROP TABLE IF EXISTS app.tutor_materias;

-- 8. Estudiantes (depende de usuarios)
DROP TABLE IF EXISTS app.estudiantes;

-- 9. Tutores (depende de usuarios)
DROP TABLE IF EXISTS app.tutores;

-- 10. Usuario - Roles (depende de usuarios)
DROP TABLE IF EXISTS app.usuario_roles;

-- 11. Materias (independiente)
DROP TABLE IF EXISTS app.materias;

-- 12. Usuarios (independiente)
DROP TABLE IF EXISTS app.usuarios;

COMMIT;
