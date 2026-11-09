create table app.ordenes (
    referencia varchar(64) primary key,
    perfil varchar(64) not null,
    monto_en_centavos bigint not null check (monto_en_centavos > 0),
    estado varchar(10) not null default 'PENDING'
        check (estado in ('PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED')),
    wompi_transaccion_id varchar(64) unique,
    fecha_creacion timestamptz not null default now()
);
