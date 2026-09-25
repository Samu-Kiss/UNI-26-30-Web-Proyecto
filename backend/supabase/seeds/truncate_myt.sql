-- truncate_myt.sql
-- Script para vaciar los datos de las 12 tablas del esquema app, reiniciar las secuencias
-- de identidad y conservar la estructura, sin usar la cláusula CASCADE.

BEGIN;

TRUNCATE TABLE 
    app.mensajes,
    app.conversaciones,
    app.resenas,
    app.bloqueos_agenda,
    app.disponibilidades_tutor,
    app.reservas,
    app.tutor_materias,
    app.estudiantes,
    app.tutores,
    app.usuario_roles,
    app.materias,
    app.usuarios
RESTART IDENTITY;

COMMIT;
