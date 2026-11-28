create table if not exists app.ordenes (
    referencia varchar(64) primary key,
    perfil varchar(64) not null,
    reserva_id integer references app.reservas(id) on delete set null,
    concepto varchar(300) not null default 'Tutoría académica MyT',
    monto_en_centavos bigint not null check (monto_en_centavos > 0),
    estado varchar(10) not null default 'PENDING'
        check (estado in ('PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED')),
    wompi_transaccion_id varchar(64) unique,
    fecha_creacion timestamptz not null default now()
);

alter table app.ordenes add column if not exists reserva_id integer references app.reservas(id) on delete set null;
alter table app.ordenes add column if not exists concepto varchar(300) not null default 'Tutoría académica MyT';

create index if not exists idx_ordenes_reserva_id on app.ordenes(reserva_id);
create index if not exists idx_ordenes_perfil on app.ordenes(perfil);
