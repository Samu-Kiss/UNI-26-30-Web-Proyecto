do $$
declare
    v_app_estudiantes constant text := 'app.estudiantes';
    v_app_tutores constant text := 'app.tutores';
    v_app_reservas constant text := 'app.reservas';
begin
    if not exists (select 1 from pg_constraint
            where conname = 'ck_estudiantes_semestre' and conrelid = v_app_estudiantes::regclass) then
        alter table app.estudiantes add constraint ck_estudiantes_semestre
            check (semestre between 1 and 20);
    end if;
    if not exists (select 1 from pg_constraint
            where conname = 'ck_tutores_tarifa_positiva' and conrelid = v_app_tutores::regclass) then
        alter table app.tutores add constraint ck_tutores_tarifa_positiva
            check (tarifa_por_hora > 0);
    end if;
    if not exists (select 1 from pg_constraint
            where conname = 'ck_tutores_calificacion' and conrelid = v_app_tutores::regclass) then
        alter table app.tutores add constraint ck_tutores_calificacion
            check (calificacion_promedio between 0 and 5);
    end if;
    if not exists (select 1 from pg_constraint
            where conname = 'ck_reservas_duracion_positiva' and conrelid = v_app_reservas::regclass) then
        alter table app.reservas add constraint ck_reservas_duracion_positiva
            check (duracion_minutos > 0);
    end if;
    if not exists (select 1 from pg_constraint
            where conname = 'ck_reservas_costo_positivo' and conrelid = v_app_reservas::regclass) then
        alter table app.reservas add constraint ck_reservas_costo_positivo
            check (costo_total > 0);
    end if;
    if not exists (select 1 from pg_constraint
            where conname = 'ck_reservas_estado' and conrelid = v_app_reservas::regclass) then
        alter table app.reservas add constraint ck_reservas_estado
            check (estado in ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'));
    end if;
end;
$$;

create unique index if not exists ux_clientes_correo_lower on app.clientes (lower(correo));
create unique index if not exists ux_administradores_correo_lower on app.administradores (lower(correo));

create index if not exists ix_estudiantes_cliente_id on app.estudiantes (cliente_id);
create index if not exists ix_tutores_cliente_id on app.tutores (cliente_id);
create index if not exists ix_reservas_estudiante_id on app.reservas (estudiante_id);
create index if not exists ix_reservas_tutor_id on app.reservas (tutor_id);
