begin;

-- Evita que dos ejecuciones concurrentes del seed pasen la guarda a la vez.
lock table app.usuarios in share row exclusive mode;

-- Generador pseudoaleatorio determinista (semilla 42). Temporal: vive solo en
-- esta transaccion y se elimina antes del COMMIT.
create function pg_temp.myt_rand(p_clave text, p_mod integer)
returns integer
language sql
immutable
as $fn$
    select ((hashtextextended(p_clave, 42) & 9223372036854775807) % p_mod)::integer
$fn$;

do $seed$
declare
    -- BCrypt (cost 10) de "1ManzanaGrande!"
    c_hash constant text := '$2a$10$mLQT19XRmfTQA9Sy9mrse.7NE3A/5Yhe.OEpRt2gyOgrHMnZlK8.a';
    c_admin constant text := 'admin.ortiz@myt.edu.co';
    c_dias constant text[] := array['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
    c_materias constant text[] := array[
        'Cálculo Multivariado', 'Álgebra Lineal', 'Física Mecánica', 'Programación Orientada a Objetos',
        'Estructuras de Datos', 'Bases de Datos', 'Química Orgánica', 'Estadística y Probabilidad',
        'Ecuaciones Diferenciales', 'Sistemas Operativos', 'Ingeniería de Software', 'Econometría',
        'Fisiología Humana', 'Derecho Constitucional', 'Arquitectura de Computadores'];
    -- Estado segun el orden k=1..7 del mes: pasado (fecha < hoy) o vigente (fecha >= hoy).
    c_pasado constant text[] := array['COMPLETADA', 'COMPLETADA', 'CANCELADA', 'COMPLETADA', 'RECHAZADA', 'COMPLETADA', 'COMPLETADA'];
    c_futuro constant text[] := array['CONFIRMADA', 'PENDIENTE', 'CANCELADA', 'CONFIRMADA', 'PENDIENTE', 'CONFIRMADA', 'RECHAZADA'];
    c_lugares constant text[] := array['Biblioteca Central - Sala 1', 'Biblioteca Central - Sala 2', 'Biblioteca Central - Sala 3',
                                       'Biblioteca Central - Sala 4', 'Biblioteca Central - Sala 5'];
    c_motivos_cancel constant text[] := array['Conflicto de horario imprevisto', 'Imprevisto personal',
                                              'Examen inesperado en la universidad', 'El estudiante ya resolvió sus dudas'];
    c_motivos_rechazo constant text[] := array['Tutor no disponible', 'El tutor tiene un compromiso académico ese día'];
    c_motivos_bloqueo constant text[] := array['Congreso académico', 'Cita médica', 'Viaje familiar', 'Examen de posgrado', 'Capacitación docente'];
    c_temas constant jsonb := jsonb_build_object(
        'Cálculo Multivariado', jsonb_build_array('Derivadas parciales', 'Integrales dobles y triples', 'Optimización con multiplicadores de Lagrange'),
        'Álgebra Lineal', jsonb_build_array('Sistemas de ecuaciones', 'Valores y vectores propios', 'Transformaciones lineales'),
        'Física Mecánica', jsonb_build_array('Cinemática en dos dimensiones', 'Leyes de Newton', 'Trabajo y energía'),
        'Programación Orientada a Objetos', jsonb_build_array('Herencia y polimorfismo', 'Patrones de diseño', 'Pruebas unitarias con JUnit'),
        'Estructuras de Datos', jsonb_build_array('Listas enlazadas y pilas', 'Árboles binarios de búsqueda', 'Complejidad algorítmica'),
        'Bases de Datos', jsonb_build_array('Normalización', 'Consultas con JOIN y subconsultas', 'Índices y planes de ejecución'),
        'Química Orgánica', jsonb_build_array('Nomenclatura y grupos funcionales', 'Reacciones de sustitución y eliminación', 'Estereoquímica'),
        'Estadística y Probabilidad', jsonb_build_array('Distribuciones de probabilidad', 'Pruebas de hipótesis', 'Regresión lineal simple'),
        'Ecuaciones Diferenciales', jsonb_build_array('Ecuaciones separables', 'Ecuaciones lineales de segundo orden', 'Transformada de Laplace'),
        'Sistemas Operativos', jsonb_build_array('Procesos e hilos', 'Planificación de la CPU', 'Gestión de memoria'),
        'Ingeniería de Software', jsonb_build_array('Requisitos y casos de uso', 'Metodologías ágiles', 'Pruebas y control de calidad'),
        'Econometría', jsonb_build_array('Modelo de regresión múltiple', 'Heterocedasticidad', 'Series de tiempo'),
        'Fisiología Humana', jsonb_build_array('Sistema cardiovascular', 'Fisiología renal', 'Sistema nervioso'),
        'Derecho Constitucional', jsonb_build_array('Derechos fundamentales', 'Acción de tutela', 'Estructura del Estado colombiano'),
        'Arquitectura de Computadores', jsonb_build_array('Conjunto de instrucciones', 'Jerarquía de memoria', 'Segmentación (pipeline)'));
    c_comentarios constant jsonb := jsonb_build_object(
        '3', jsonb_build_array('Sesión útil, aunque faltó tiempo para resolver todos los ejercicios.', 'Buena explicación, me gustaría más ejemplos prácticos.'),
        '4', jsonb_build_array('Muy clara la explicación y buen ritmo durante la sesión.', 'Resolvió mis dudas y dejó ejercicios para practicar.'),
        '5', jsonb_build_array('Excelente tutoría, explicación muy clara y dominio del tema.', 'Muy paciente y organizado. Totalmente recomendado.'));

    v_ahora timestamp := date_trunc('second', now() at time zone 'America/Bogota');
    v_hoy date := (date_trunc('second', now() at time zone 'America/Bogota'))::date;
    v_mes_actual date := date_trunc('month', (now() at time zone 'America/Bogota'))::date;
    v_alta timestamp := (date_trunc('month', (now() at time zone 'America/Bogota'))::date - interval '3 months' - interval '15 days');

    v_offset integer;
    v_k integer;
    v_n integer := 0;
    v_i integer;
    v_mes date;
    v_mes_fin date;
    v_anchor date;
    v_fecha date;
    v_hora time(0);
    v_tutor_id integer;
    v_estudiante_id integer;
    v_materia_id integer;
    v_materia text;
    v_tarifa numeric(12, 2);
    v_dur integer;
    v_rot integer;
    v_t_idx integer;
    v_e_idx integer;
    v_estado text;
    v_modalidad text;
    v_ubicacion text;
    v_costo numeric(12, 2);
    v_creacion timestamp;
    v_actualizacion timestamp;
    v_motivo text;
    v_fecha_canc timestamp;
    v_filas bigint;
    v_bad bigint;
    v_msg text;
begin
    -- ------------------------------------------------------------------
    -- 0. Guardas: reejecucion segura y aborto si existen datos ajenos
    -- ------------------------------------------------------------------
    if exists (select 1 from app.usuarios where lower(correo) = c_admin) then
        raise notice 'Seed MyT ya aplicado (% existe): no se modifica nada.', c_admin;
        return;
    end if;

    select (select count(*) from app.usuarios)
         + (select count(*) from app.usuario_roles)
         + (select count(*) from app.estudiantes)
         + (select count(*) from app.tutores)
         + (select count(*) from app.materias where nombre <> 'Sin especificar')
         + (select count(*) from app.tutor_materias)
         + (select count(*) from app.reservas)
         + (select count(*) from app.disponibilidades_tutor)
         + (select count(*) from app.resenas)
         + (select count(*) from app.bloqueos_agenda)
         + (select count(*) from app.conversaciones)
         + (select count(*) from app.mensajes)
      into v_filas;
    if v_filas > 0 then
        raise exception 'Seed abortado: el esquema app ya contiene % filas ajenas al seed. Ejecuta truncate_myt.sql si quieres partir de cero.', v_filas;
    end if;

    -- ------------------------------------------------------------------
    -- 1. Administradores (usuario + rol ADMINISTRADOR)
    -- ------------------------------------------------------------------
    with nuevos as (
        insert into app.usuarios (nombre, apellido, correo, contrasena, telefono, activo, fecha_creacion, fecha_actualizacion)
        select v.nombre, v.apellido, v.correo, c_hash, v.telefono, true,
               v_alta + row_number() over (order by v.correo) * interval '1 hour',
               v_alta + row_number() over (order by v.correo) * interval '1 hour'
        from (values
            ('Juan David', 'Ortiz',    'admin.ortiz@myt.edu.co',   '+573001112233'),
            ('Samuel',     'Pico',     'admin.pico@myt.edu.co',    '+573001112234'),
            ('Santiago',   'Bautista', 'admin.coco@myt.edu.co',    '+573001112235'),
            ('Alejandra',  'Garcia',   'admin.maleja@myt.edu.co',  '+573001112236')
        ) as v(nombre, apellido, correo, telefono)
        returning id
    )
    insert into app.usuario_roles (usuario_id, rol)
    select id, 'ADMINISTRADOR' from nuevos;

    -- ------------------------------------------------------------------
    -- 2. Clientes (20 estudiantes + 30 tutores como usuarios) y sus roles
    -- ------------------------------------------------------------------
    with nuevos as (
        insert into app.usuarios (nombre, apellido, correo, contrasena, telefono, activo, fecha_creacion, fecha_actualizacion)
        select v.nombre, v.apellido, v.correo, c_hash, v.telefono, true,
               v_alta + (10 + row_number() over (order by v.correo)) * interval '1 hour',
               v_alta + (10 + row_number() over (order by v.correo)) * interval '1 hour'
        from (values
            ('Juan',      'Pérez',     'estudiante01@myt.edu.co', '+573100000001'),
            ('Maria',     'Rodríguez', 'estudiante02@myt.edu.co', '+573100000002'),
            ('Camilo',    'Torres',    'estudiante03@myt.edu.co', '+573100000003'),
            ('Ana',       'Martínez',  'estudiante04@myt.edu.co', '+573100000004'),
            ('Mateo',     'López',     'estudiante05@myt.edu.co', '+573100000005'),
            ('Sofia',     'Hernández', 'estudiante06@myt.edu.co', '+573100000006'),
            ('Daniel',    'González',  'estudiante07@myt.edu.co', '+573100000007'),
            ('Valentina', 'Díaz',      'estudiante08@myt.edu.co', '+573100000008'),
            ('Santiago',  'Ramírez',   'estudiante09@myt.edu.co', '+573100000009'),
            ('Isabella',  'Sánchez',   'estudiante10@myt.edu.co', '+573100000010'),
            ('Alejandro', 'Romero',    'estudiante11@myt.edu.co', '+573100000011'),
            ('Gabriela',  'Álvarez',   'estudiante12@myt.edu.co', '+573100000012'),
            ('Nicolas',   'Espinoza',  'estudiante13@myt.edu.co', '+573100000013'),
            ('Mariana',   'Castillo',  'estudiante14@myt.edu.co', '+573100000014'),
            ('Samuel',    'Moreno',    'estudiante15@myt.edu.co', '+573100000015'),
            ('Daniela',   'Suárez',    'estudiante16@myt.edu.co', '+573100000016'),
            ('Sebastian', 'Blanco',    'estudiante17@myt.edu.co', '+573100000017'),
            ('Lucia',     'Delgado',   'estudiante18@myt.edu.co', '+573100000018'),
            ('David',     'Castro',    'estudiante19@myt.edu.co', '+573100000019'),
            ('Emma',      'Ortiz',     'estudiante20@myt.edu.co', '+573100000020')
        ) as v(nombre, apellido, correo, telefono)
        returning id
    )
    insert into app.usuario_roles (usuario_id, rol)
    select id, 'ESTUDIANTE' from nuevos;

    with nuevos as (
        insert into app.usuarios (nombre, apellido, correo, contrasena, telefono, activo, fecha_creacion, fecha_actualizacion)
        select v.nombre, v.apellido, v.correo, c_hash, v.telefono, true,
               v_alta + (40 + row_number() over (order by v.correo)) * interval '1 hour',
               v_alta + (40 + row_number() over (order by v.correo)) * interval '1 hour'
        from (values
            ('Felipe',   'Morales',    'tutor01@myt.edu.co', '+573200000001'),
            ('Elena',    'Guerrero',   'tutor02@myt.edu.co', '+573200000002'),
            ('Javier',   'Paredes',    'tutor03@myt.edu.co', '+573200000003'),
            ('Natalia',  'Rojas',      'tutor04@myt.edu.co', '+573200000004'),
            ('Esteban',  'Soto',       'tutor05@myt.edu.co', '+573200000005'),
            ('Camila',   'Silva',      'tutor06@myt.edu.co', '+573200000006'),
            ('Hugo',     'Navarro',    'tutor07@myt.edu.co', '+573200000007'),
            ('Paula',    'Molina',     'tutor08@myt.edu.co', '+573200000008'),
            ('Diego',    'Acosta',     'tutor09@myt.edu.co', '+573200000009'),
            ('Andrea',   'Campos',     'tutor10@myt.edu.co', '+573200000010'),
            ('Oscar',    'Vega',       'tutor11@myt.edu.co', '+573200000011'),
            ('Diana',    'Fuentes',    'tutor12@myt.edu.co', '+573200000012'),
            ('Ricardo',  'Cárdenas',   'tutor13@myt.edu.co', '+573200000013'),
            ('Valeria',  'Lara',       'tutor14@myt.edu.co', '+573200000014'),
            ('Gabriel',  'Pacheco',    'tutor15@myt.edu.co', '+573200000015'),
            ('Silvia',   'Quintero',   'tutor16@myt.edu.co', '+573200000016'),
            ('Fernando', 'Ríos',       'tutor17@myt.edu.co', '+573200000017'),
            ('Adriana',  'Cruz',       'tutor18@myt.edu.co', '+573200000018'),
            ('Manuel',   'Reyes',      'tutor19@myt.edu.co', '+573200000019'),
            ('Monica',   'Aguilar',    'tutor20@myt.edu.co', '+573200000020'),
            ('Jorge',    'Salazar',    'tutor21@myt.edu.co', '+573200000021'),
            ('Clara',    'Arias',      'tutor22@myt.edu.co', '+573200000022'),
            ('Rodrigo',  'Pena',       'tutor23@myt.edu.co', '+573200000023'),
            ('Verónica', 'Cabrera',    'tutor24@myt.edu.co', '+573200000024'),
            ('Gonzalo',  'Ibarra',     'tutor25@myt.edu.co', '+573200000025'),
            ('Beatriz',  'Cortés',     'tutor26@myt.edu.co', '+573200000026'),
            ('Héctor',   'Guerrero',   'tutor27@myt.edu.co', '+573200000027'),
            ('Carmen',   'Villanueva', 'tutor28@myt.edu.co', '+573200000028'),
            ('Iván',     'Mejía',      'tutor29@myt.edu.co', '+573200000029'),
            ('Rosa',     'Núñez',      'tutor30@myt.edu.co', '+573200000030')
        ) as v(nombre, apellido, correo, telefono)
        returning id
    )
    insert into app.usuario_roles (usuario_id, rol)
    select id, 'TUTOR' from nuevos;

    -- ------------------------------------------------------------------
    -- 3. Estudiantes y tutores asociados a usuarios (por rol, ordenados por correo)
    -- ------------------------------------------------------------------
    insert into app.estudiantes (usuario_id, semestre, codigo_estudiantil, programa_academico, universidad)
    select x.id,
           (1 + (x.rn % 10))::integer,
           'EST-2024-' || lpad(x.rn::text, 3, '0'),
           case (x.rn % 5)
               when 0 then 'Ingeniería de Sistemas'
               when 1 then 'Medicina'
               when 2 then 'Derecho'
               when 3 then 'Administración de Empresas'
               else 'Ingeniería Industrial'
           end,
           case (x.rn % 4)
               when 0 then 'Universidad Nacional de Colombia'
               when 1 then 'Universidad de los Andes'
               when 2 then 'Universidad Javeriana'
               else 'Universidad del Rosario'
           end
    from (
        select u.id, row_number() over (order by u.correo) as rn
        from app.usuarios u
        join app.usuario_roles ur on ur.usuario_id = u.id and ur.rol = 'ESTUDIANTE'
    ) x
    order by x.rn;

    insert into app.tutores (usuario_id, disponible, tarifa_por_hora, biografia)
    select x.id,
           true,
           (35000 + ((x.rn % 12) * 5000))::numeric(12, 2),
           'Tutor(a) especializado(a) con experiencia universitaria y apoyo académico personalizado.'
    from (
        select u.id, row_number() over (order by u.correo) as rn
        from app.usuarios u
        join app.usuario_roles ur on ur.usuario_id = u.id and ur.rol = 'TUTOR'
    ) x
    order by x.rn;

    -- ------------------------------------------------------------------
    -- 4. Materias (2 por tutor) y disponibilidad semanal
    --    'Sin especificar' es la fila base que crea la migracion 20260917160000.
    -- ------------------------------------------------------------------
    insert into app.materias (nombre)
    select 'Sin especificar'
    where not exists (select 1 from app.materias where nombre = 'Sin especificar');

    insert into app.materias (nombre)
    select unnest(c_materias);

    -- Tutor i (orden por correo): materia base ((i-1) mod 15)+1 y una segunda distinta, elegida con semilla 42.
    insert into app.tutor_materias (tutor_id, materia_id)
    select tu.tutor_id, m.id
    from (
        select t.id as tutor_id, row_number() over (order by u.correo) as i
        from app.tutores t
        join app.usuarios u on u.id = t.usuario_id
    ) tu
    cross join lateral (
        select (((tu.i - 1) % 15) + 1) as idx
        union all
        select (((((tu.i - 1) % 15) + 1) + pg_temp.myt_rand('materia:' || tu.i, 14)) % 15) + 1 as idx
    ) pick
    join app.materias m on m.nombre = c_materias[pick.idx];

    -- Lunes 08-12, miercoles 14-18 y viernes 09-13 para todos los tutores
    insert into app.disponibilidades_tutor (tutor_id, dia_semana, hora_inicio, hora_fin)
    select t.id, d.dia, d.inicio, d.fin
    from app.tutores t
    cross join (values
        ('LUNES',     time '08:00', time '12:00'),
        ('MIERCOLES', time '14:00', time '18:00'),
        ('VIERNES',   time '09:00', time '13:00')
    ) as d(dia, inicio, fin);

    -- ------------------------------------------------------------------
    -- 5. Reservas: 7 por mes durante 5 meses (M-3, M-2, M-1, M, M+1) = 35
    --    Cada reserva: materia del tutor, dentro de su disponibilidad y sin
    --    solapes de tutor ni de estudiante. El estado depende de la fecha.
    --    Los tutores 01..06 reciben ~la mitad de las reservas (agendas con
    --    varios estados); el resto se reparte entre los 30 tutores.
    -- ------------------------------------------------------------------
    for v_offset in -3..1 loop
        v_mes := (v_mes_actual + make_interval(months => v_offset))::date;
        v_mes_fin := (v_mes + interval '1 month' - interval '1 day')::date;

        for v_k in 1..7 loop
            v_n := v_n + 1;

            v_t_idx := case when v_n % 2 = 1 then (((v_n - 1) / 2) % 6) + 1 else ((v_n * 7) % 30) + 1 end;
            v_e_idx := (((v_n - 1) * 3) % 20) + 1;

            select t.id, t.tarifa_por_hora
              into v_tutor_id, v_tarifa
            from app.tutores t
            join app.usuarios u on u.id = t.usuario_id
            where lower(u.correo) = 'tutor' || lpad(v_t_idx::text, 2, '0') || '@myt.edu.co';

            select e.id
              into v_estudiante_id
            from app.estudiantes e
            join app.usuarios u on u.id = e.usuario_id
            where lower(u.correo) = 'estudiante' || lpad(v_e_idx::text, 2, '0') || '@myt.edu.co';

            v_rot := pg_temp.myt_rand('materia-reserva:' || v_n, 2);
            select m.id, m.nombre
              into v_materia_id, v_materia
            from app.tutor_materias tm
            join app.materias m on m.id = tm.materia_id
            where tm.tutor_id = v_tutor_id
            order by m.nombre
            offset v_rot limit 1;

            v_dur := (array[60, 90, 120])[1 + pg_temp.myt_rand('duracion:' || v_n, 3)];
            v_anchor := v_mes + (3 * (v_k - 1) + pg_temp.myt_rand('dia:' || v_n, 3));
            v_rot := pg_temp.myt_rand('hora:' || v_n, 8);

            -- Primer hueco valido desde la fecha ancla hasta fin de mes
            select c.fecha, c.hora_inicio
              into v_fecha, v_hora
            from (
                select v_anchor + g.dd as fecha,
                       (dt.hora_inicio + s.paso * interval '30 minutes')::time(0) as hora_inicio,
                       s.paso,
                       w.pasos
                from generate_series(0, v_mes_fin - v_anchor) as g(dd)
                join app.disponibilidades_tutor dt
                  on dt.tutor_id = v_tutor_id
                 and dt.dia_semana = c_dias[extract(isodow from (v_anchor + g.dd))::integer]
                cross join lateral (
                    select (((extract(epoch from (dt.hora_fin - dt.hora_inicio)) / 60)::integer - v_dur) / 30) + 1 as pasos
                ) as w
                cross join lateral generate_series(0, w.pasos - 1) as s(paso)
            ) c
            where not exists (
                      select 1 from app.reservas r
                      where r.tutor_id = v_tutor_id and r.fecha = c.fecha
                        and r.hora_inicio < (c.hora_inicio + v_dur * interval '1 minute')::time
                        and (r.hora_inicio + r.duracion_minutos * interval '1 minute')::time > c.hora_inicio)
              and not exists (
                      select 1 from app.reservas r
                      where r.estudiante_id = v_estudiante_id and r.fecha = c.fecha
                        and r.hora_inicio < (c.hora_inicio + v_dur * interval '1 minute')::time
                        and (r.hora_inicio + r.duracion_minutos * interval '1 minute')::time > c.hora_inicio)
            order by c.fecha, (c.paso + v_rot) % c.pasos, c.paso
            limit 1;

            if v_fecha is null then
                raise exception 'Seed revertido: no hay horario libre para la reserva % (mes %, tutor %)', v_n, v_mes, v_tutor_id;
            end if;

            v_estado := case when v_fecha < v_hoy then c_pasado[v_k] else c_futuro[v_k] end;
            v_costo := round(v_tarifa * v_dur / 60.0, 2);
            v_modalidad := case when v_n % 2 = 0 then 'VIRTUAL' else 'PRESENCIAL' end;
            v_ubicacion := case v_modalidad
                when 'PRESENCIAL' then c_lugares[1 + (v_n % 5)]
                else 'https://meet.google.com/myt-session-' || v_n
            end;

            v_creacion := least(
                (v_fecha + v_hora) - ((1 + pg_temp.myt_rand('anticipacion:' || v_n, 6)) * interval '1 day') - interval '2 hours',
                v_ahora - v_n * interval '1 hour');

            v_motivo := null;
            v_fecha_canc := null;
            if v_estado = 'CANCELADA' then
                v_motivo := c_motivos_cancel[1 + pg_temp.myt_rand('motivo:' || v_n, 4)];
            elsif v_estado = 'RECHAZADA' then
                v_motivo := c_motivos_rechazo[1 + pg_temp.myt_rand('motivo:' || v_n, 2)];
            end if;
            if v_motivo is not null then
                v_fecha_canc := least(
                    v_creacion + interval '3 hours' + pg_temp.myt_rand('cierre:' || v_n, 20) * interval '1 hour',
                    v_ahora - interval '30 minutes');
            end if;

            v_actualizacion := case v_estado
                when 'PENDIENTE'  then v_creacion
                when 'CONFIRMADA' then least(v_creacion + interval '6 hours', v_ahora - interval '10 minutes')
                when 'COMPLETADA' then least(v_fecha + v_hora + v_dur * interval '1 minute', v_ahora - interval '1 minute')
                else v_fecha_canc
            end;

            insert into app.reservas (
                costo_total, duracion_minutos, estudiante_id, tutor_id, fecha, hora_inicio, estado, tema,
                materia_id, modalidad, ubicacion_o_enlace, moneda, motivo_cancelacion, fecha_cancelacion,
                fecha_creacion, fecha_actualizacion)
            values (
                v_costo, v_dur, v_estudiante_id, v_tutor_id, v_fecha, v_hora, v_estado,
                (c_temas -> v_materia) ->> pg_temp.myt_rand('tema:' || v_n, 3),
                v_materia_id, v_modalidad, v_ubicacion, 'COP', v_motivo, v_fecha_canc,
                v_creacion, v_actualizacion);
        end loop;
    end loop;

    -- ------------------------------------------------------------------
    -- 6. Complementos: reseñas, bloqueos de agenda, chat
    -- ------------------------------------------------------------------
    -- Reseñas: ~75 % de las reservas COMPLETADA (1..5, una por reserva)
    insert into app.resenas (reserva_id, calificacion, comentario, fecha_creacion)
    select x.id, x.calificacion,
           (c_comentarios -> x.calificacion::text) ->> pg_temp.myt_rand('comentario:' || x.rn, 2),
           least(x.fin + interval '3 hours', v_ahora - interval '1 minute')
    from (
        select o.id, o.rn, o.fin,
               (array[5, 5, 4, 5, 4, 3, 5, 4])[1 + pg_temp.myt_rand('nota:' || o.rn, 8)] as calificacion
        from (
            select r.id,
                   r.fecha + r.hora_inicio + r.duracion_minutos * interval '1 minute' as fin,
                   row_number() over (order by r.fecha, r.hora_inicio, r.tutor_id) as rn
            from app.reservas r
            where r.estado = 'COMPLETADA'
        ) o
        where pg_temp.myt_rand('resena:' || o.rn, 4) <> 0
    ) x;

    -- Bloqueos: una franja de 2 h para los tutores 01..05, en su primer dia disponible (>= hoy+7) sin reservas
    for v_i in 1..5 loop
        select t.id into v_tutor_id
        from app.tutores t
        join app.usuarios u on u.id = t.usuario_id
        where lower(u.correo) = 'tutor' || lpad(v_i::text, 2, '0') || '@myt.edu.co';

        select v_hoy + g.dd, dt.hora_inicio
          into v_fecha, v_hora
        from generate_series(7, 90) as g(dd)
        join app.disponibilidades_tutor dt
          on dt.tutor_id = v_tutor_id
         and dt.dia_semana = c_dias[extract(isodow from (v_hoy + g.dd))::integer]
        where not exists (select 1 from app.reservas r where r.tutor_id = v_tutor_id and r.fecha = v_hoy + g.dd)
        order by g.dd
        limit 1;

        if v_fecha is null then
            raise exception 'Seed revertido: no se encontro dia para el bloqueo del tutor %', v_i;
        end if;

        insert into app.bloqueos_agenda (tutor_id, fecha, hora_inicio, hora_fin, motivo)
        values (v_tutor_id, v_fecha, v_hora, (v_hora + interval '2 hours')::time(0), c_motivos_bloqueo[v_i]);
    end loop;

    -- Chat: una conversacion por reserva PENDIENTE/CONFIRMADA (ACTIVA) o COMPLETADA (CERRADA)
    insert into app.conversaciones (reserva_id, estado, fecha_creacion)
    select r.id,
           case r.estado when 'COMPLETADA' then 'CERRADA' else 'ACTIVA' end,
           r.fecha_creacion + interval '1 minute'
    from app.reservas r
    where r.estado in ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA')
    order by r.fecha, r.hora_inicio, r.tutor_id;

    -- Mensajes: PENDIENTE -> 1 (sin leer); CONFIRMADA -> 3 (el ultimo sin leer); COMPLETADA -> 4 (todos leidos)
    insert into app.mensajes (conversacion_id, remitente_usuario_id, contenido, fecha_envio, leido_en)
    select x.conversacion_id, x.remitente, x.contenido, x.envio,
           case when x.leido then least(x.envio + interval '3 minutes', v_ahora) end
    from (
        select c.id as conversacion_id,
               m.seq,
               m.remitente,
               m.contenido,
               least(
                   case when m.seq = 4
                        then r.fecha + r.hora_inicio + r.duracion_minutos * interval '1 minute' + interval '10 minutes'
                        else c.fecha_creacion + m.espera
                   end,
                   v_ahora - (5 - m.seq) * interval '1 minute') as envio,
               case r.estado when 'PENDIENTE' then false
                             when 'CONFIRMADA' then m.seq < 3
                             else true end as leido
        from app.conversaciones c
        join app.reservas r on r.id = c.reserva_id
        join app.estudiantes e on e.id = r.estudiante_id
        join app.tutores t on t.id = r.tutor_id
        cross join lateral (values
            (1, e.usuario_id,
                'Hola, adjunto los temas que me gustaría revisar en la sesión.',
                interval '5 minutes'),
            (2, t.usuario_id,
                '¡Hola! Perfecto, estaré preparado para trabajar en esos ejercicios.',
                interval '30 minutes'),
            (3, e.usuario_id,
                'Perfecto, gracias. Nos vemos el ' || to_char(r.fecha, 'DD/MM/YYYY') || ' a las ' || to_char(r.hora_inicio, 'HH24:MI') || '.',
                interval '6 hours 14 minutes'),
            (4, t.usuario_id,
                'Gracias por la sesión. Si necesitas reforzar algo más, escríbeme por aquí.',
                interval '0 minutes')
        ) as m(seq, remitente, contenido, espera)
        where m.seq = 1
           or (m.seq <= 3 and r.estado in ('CONFIRMADA', 'COMPLETADA'))
           or (m.seq = 4 and r.estado = 'COMPLETADA')
    ) x
    order by x.conversacion_id, x.seq;

    -- ------------------------------------------------------------------
    -- 7. Validaciones: cualquier incoherencia revierte toda la transaccion
    -- ------------------------------------------------------------------
    -- 7.1 Conteos esperados
    select string_agg(format('%s=%s (esperado %s)', c.nombre, c.actual, c.esperado), '; ')
      into v_msg
    from (values
        ('usuarios',                 (select count(*) from app.usuarios), 54),
        ('roles ADMINISTRADOR',      (select count(*) from app.usuario_roles where rol = 'ADMINISTRADOR'), 4),
        ('roles ESTUDIANTE',         (select count(*) from app.usuario_roles where rol = 'ESTUDIANTE'), 20),
        ('roles TUTOR',              (select count(*) from app.usuario_roles where rol = 'TUTOR'), 30),
        ('estudiantes',              (select count(*) from app.estudiantes), 20),
        ('tutores',                  (select count(*) from app.tutores), 30),
        ('materias (sin la base)',   (select count(*) from app.materias where nombre <> 'Sin especificar'), 15),
        ('tutor_materias',           (select count(*) from app.tutor_materias), 60),
        ('tutores con != 2 materias',(select count(*) from app.tutores t where (select count(*) from app.tutor_materias tm where tm.tutor_id = t.id) <> 2), 0),
        ('materias sin tutor',       (select count(*) from app.materias m where m.nombre <> 'Sin especificar' and not exists (select 1 from app.tutor_materias tm where tm.materia_id = m.id)), 0),
        ('disponibilidades_tutor',   (select count(*) from app.disponibilidades_tutor), 90),
        ('bloqueos_agenda',          (select count(*) from app.bloqueos_agenda), 5),
        ('reservas',                 (select count(*) from app.reservas), 35),
        ('estados distintos (PENDIENTE/CONFIRMADA/COMPLETADA/CANCELADA)',
            (select count(distinct estado) from app.reservas where estado in ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA')), 4),
        ('meses con reservas',       (select count(distinct date_trunc('month', fecha)) from app.reservas), 5),
        ('meses con != 7 reservas',  (select count(*) from (select 1 from app.reservas group by date_trunc('month', fecha) having count(*) <> 7) q), 0),
        ('reservas fuera de M-3..M+1',
            (select count(*) from app.reservas
              where fecha < (v_mes_actual - interval '3 months') or fecha >= (v_mes_actual + interval '2 months')), 0),
        ('conversaciones',           (select count(*) from app.conversaciones),
            (select count(*) from app.reservas where estado in ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA')))
    ) as c(nombre, actual, esperado)
    where c.actual <> c.esperado;
    if v_msg is not null then
        raise exception 'Seed revertido, conteos inesperados: %', v_msg;
    end if;

    -- 7.2 Identidad: hashes BCrypt validos, correos y codigos unicos, roles coherentes
    select count(*) into v_bad from app.usuarios
    where contrasena !~ '^\$2[aby]\$10\$[./A-Za-z0-9]{53}$' or length(contrasena) <> 60;
    if v_bad > 0 then raise exception 'Seed revertido: % contrasenas no son hashes BCrypt validos', v_bad; end if;

    select count(*) into v_bad from (select 1 from app.usuarios group by lower(correo) having count(*) > 1) q;
    if v_bad > 0 then raise exception 'Seed revertido: correos duplicados (%)', v_bad; end if;

    select count(*) - count(distinct codigo_estudiantil) into v_bad from app.estudiantes;
    if v_bad <> 0 then raise exception 'Seed revertido: codigos estudiantiles repetidos'; end if;

    select count(*) into v_bad from app.estudiantes where semestre not between 1 and 30;
    if v_bad > 0 then raise exception 'Seed revertido: % estudiantes con semestre fuera de 1..30', v_bad; end if;

    select count(*) into v_bad from app.tutores where tarifa_por_hora <= 0;
    if v_bad > 0 then raise exception 'Seed revertido: % tutores con tarifa no positiva', v_bad; end if;

    select count(*) into v_bad from (
        select e.usuario_id from app.estudiantes e
         where not exists (select 1 from app.usuario_roles r where r.usuario_id = e.usuario_id and r.rol = 'ESTUDIANTE')
        union all
        select t.usuario_id from app.tutores t
         where not exists (select 1 from app.usuario_roles r where r.usuario_id = t.usuario_id and r.rol = 'TUTOR')
        union all
        select r.usuario_id from app.usuario_roles r
         where (r.rol = 'ESTUDIANTE' and not exists (select 1 from app.estudiantes e where e.usuario_id = r.usuario_id))
            or (r.rol = 'TUTOR' and not exists (select 1 from app.tutores t where t.usuario_id = r.usuario_id))
            or (r.rol = 'ADMINISTRADOR' and (exists (select 1 from app.estudiantes e where e.usuario_id = r.usuario_id)
                                          or exists (select 1 from app.tutores t where t.usuario_id = r.usuario_id)))
    ) q;
    if v_bad > 0 then raise exception 'Seed revertido: % incoherencias entre roles y estudiantes/tutores', v_bad; end if;

    -- 7.3 Reservas: materia del tutor, costo, participantes, disponibilidad
    select count(*) into v_bad
    from app.reservas r
    join app.tutores t on t.id = r.tutor_id
    join app.estudiantes e on e.id = r.estudiante_id
    where not exists (select 1 from app.tutor_materias tm where tm.tutor_id = r.tutor_id and tm.materia_id = r.materia_id)
       or r.costo_total <> round(t.tarifa_por_hora * r.duracion_minutos / 60.0, 2)
       or r.moneda <> 'COP'
       or e.usuario_id = t.usuario_id
       or r.ubicacion_o_enlace is null
       or not exists (select 1 from app.disponibilidades_tutor dt
                      where dt.tutor_id = r.tutor_id
                        and dt.dia_semana = c_dias[extract(isodow from r.fecha)::integer]
                        and r.hora_inicio >= dt.hora_inicio
                        and (r.hora_inicio + r.duracion_minutos * interval '1 minute')::time <= dt.hora_fin);
    if v_bad > 0 then raise exception 'Seed revertido: % reservas incoherentes (materia, costo, participantes o disponibilidad)', v_bad; end if;

    -- 7.4 Sin solapes de tutor ni de estudiante, ni con bloqueos de agenda
    select count(*) into v_bad
    from app.reservas a
    join app.reservas b on b.id > a.id and b.fecha = a.fecha
        and (b.tutor_id = a.tutor_id or b.estudiante_id = a.estudiante_id)
        and b.hora_inicio < (a.hora_inicio + a.duracion_minutos * interval '1 minute')::time
        and a.hora_inicio < (b.hora_inicio + b.duracion_minutos * interval '1 minute')::time;
    if v_bad > 0 then raise exception 'Seed revertido: % pares de reservas se solapan', v_bad; end if;

    select count(*) into v_bad
    from app.bloqueos_agenda bl
    join app.reservas r on r.tutor_id = bl.tutor_id and r.fecha = bl.fecha
        and r.hora_inicio < bl.hora_fin
        and bl.hora_inicio < (r.hora_inicio + r.duracion_minutos * interval '1 minute')::time;
    if v_bad > 0 then raise exception 'Seed revertido: % reservas chocan con bloqueos de agenda', v_bad; end if;

    -- 7.5 Estado vs fecha, cancelaciones y marcas de tiempo
    select count(*) into v_bad
    from app.reservas r
    join app.estudiantes e on e.id = r.estudiante_id
    join app.usuarios ue on ue.id = e.usuario_id
    join app.tutores t on t.id = r.tutor_id
    join app.usuarios ut on ut.id = t.usuario_id
    where (r.estado = 'COMPLETADA' and r.fecha >= v_hoy)
       or (r.estado in ('PENDIENTE', 'CONFIRMADA') and r.fecha < v_hoy)
       or (r.estado in ('CANCELADA', 'RECHAZADA') and (r.motivo_cancelacion is null or r.fecha_cancelacion is null))
       or (r.estado not in ('CANCELADA', 'RECHAZADA') and (r.motivo_cancelacion is not null or r.fecha_cancelacion is not null))
       or r.fecha_cancelacion < r.fecha_creacion
       or r.fecha_actualizacion < r.fecha_creacion
       or r.fecha_creacion > v_ahora or r.fecha_actualizacion > v_ahora
       or r.fecha_creacion < ue.fecha_creacion or r.fecha_creacion < ut.fecha_creacion;
    if v_bad > 0 then raise exception 'Seed revertido: % reservas con estado, fechas o cancelacion incoherentes', v_bad; end if;

    -- 7.6 Reseñas
    select count(*) into v_bad
    from app.resenas rs
    join app.reservas r on r.id = rs.reserva_id
    where r.estado <> 'COMPLETADA'
       or rs.calificacion not between 1 and 5
       or rs.fecha_creacion < (r.fecha + r.hora_inicio + r.duracion_minutos * interval '1 minute')
       or rs.fecha_creacion > v_ahora;
    if v_bad > 0 then raise exception 'Seed revertido: % reseñas incoherentes', v_bad; end if;

    -- 7.7 Chat: conversacion iff PENDIENTE/CONFIRMADA/COMPLETADA, estado coherente, remitentes y tiempos validos
    select count(*) into v_bad
    from app.reservas r
    left join app.conversaciones c on c.reserva_id = r.id
    where (r.estado in ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA')) <> (c.id is not null)
       or (c.id is not null and c.estado <> case r.estado when 'COMPLETADA' then 'CERRADA' else 'ACTIVA' end)
       or (c.id is not null and (c.fecha_creacion < r.fecha_creacion or c.fecha_creacion > v_ahora));
    if v_bad > 0 then raise exception 'Seed revertido: % conversaciones incoherentes', v_bad; end if;

    select count(*) into v_bad
    from app.mensajes m
    join app.conversaciones c on c.id = m.conversacion_id
    join app.reservas r on r.id = c.reserva_id
    join app.estudiantes e on e.id = r.estudiante_id
    join app.tutores t on t.id = r.tutor_id
    where m.remitente_usuario_id not in (e.usuario_id, t.usuario_id)
       or m.fecha_envio < c.fecha_creacion
       or m.fecha_envio > v_ahora
       or (m.leido_en is not null and (m.leido_en < m.fecha_envio or m.leido_en > v_ahora))
       or length(trim(m.contenido)) not between 1 and 4000;
    if v_bad > 0 then raise exception 'Seed revertido: % mensajes incoherentes', v_bad; end if;

    select count(*) into v_bad from app.conversaciones c
    where not exists (select 1 from app.mensajes m where m.conversacion_id = c.id);
    if v_bad > 0 then raise exception 'Seed revertido: % conversaciones sin mensajes', v_bad; end if;

    raise notice 'Seed MyT aplicado y validado correctamente.';
end;
$seed$;

drop function pg_temp.myt_rand(text, integer);

commit;

-- =============================================================================
-- Resumen final (un solo resultado): conteos, reservas por mes/estado y cuentas
-- =============================================================================
select seccion, detalle, valor
from (
    select 1 as o, 1 as s, 'Conteos' as seccion, 'usuarios' as detalle, count(*)::text as valor from app.usuarios
    union all select 1, 2, 'Conteos', 'usuario_roles', count(*)::text from app.usuario_roles
    union all select 1, 3, 'Conteos', 'estudiantes', count(*)::text from app.estudiantes
    union all select 1, 4, 'Conteos', 'tutores', count(*)::text from app.tutores
    union all select 1, 5, 'Conteos', 'materias', count(*)::text from app.materias
    union all select 1, 6, 'Conteos', 'tutor_materias', count(*)::text from app.tutor_materias
    union all select 1, 7, 'Conteos', 'disponibilidades_tutor', count(*)::text from app.disponibilidades_tutor
    union all select 1, 8, 'Conteos', 'reservas', count(*)::text from app.reservas
    union all select 1, 9, 'Conteos', 'resenas', count(*)::text from app.resenas
    union all select 1, 10, 'Conteos', 'bloqueos_agenda', count(*)::text from app.bloqueos_agenda
    union all select 1, 11, 'Conteos', 'conversaciones', count(*)::text from app.conversaciones
    union all select 1, 12, 'Conteos', 'mensajes', count(*)::text from app.mensajes
    union all
    select 2, 0, 'Reservas por mes', to_char(date_trunc('month', fecha), 'YYYY-MM'), count(*)::text
    from app.reservas group by date_trunc('month', fecha)
    union all
    select 3, 0, 'Reservas por estado', estado, count(*)::text
    from app.reservas group by estado
    union all
    select 4, 0, 'Cuentas de ejemplo (clave: 1ManzanaGrande!)', x.correo, x.rol
    from (
        select u.correo, r.rol,
               row_number() over (partition by r.rol order by u.correo) as rn
        from app.usuarios u
        join app.usuario_roles r on r.usuario_id = u.id
    ) x
    where x.rn <= 3
) resumen
order by o, s, detalle;
