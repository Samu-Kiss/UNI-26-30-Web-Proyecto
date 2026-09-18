# Modelo de dominio

## Identidad y perfiles

`Usuario` es la unica identidad autenticable. Contiene nombre, correo, hash de contrasena,
telefono, estado, auditoria y uno o varios roles. `Estudiante` y `Tutor` son perfiles opcionales
uno-a-uno con datos propios del negocio; no duplican credenciales. Un usuario puede tener ambos
perfiles. Los administradores son usuarios con el rol `ADMINISTRADOR` y no tienen una tabla propia.

Todo componente nuevo, incluido el chat, debe referenciar `usuarios.id` para identificar personas.
No debe apuntar alternativamente a estudiantes o tutores.

## Tutorias

- `Materia` normaliza el catalogo de materias.
- `tutor_materias` relaciona tutores y materias.
- `DisponibilidadTutor` describe la agenda semanal recurrente.
- `BloqueoAgenda` representa excepciones para una fecha y un intervalo concreto.
- `Reserva` vincula estudiante, tutor y materia, guarda el precio acordado, moneda, modalidad,
  ubicacion o enlace, auditoria y version para concurrencia optimista.
- `Resena` es opcional, unica por reserva y solo se crea cuando la reserva esta completada.

Las transiciones de reserva admitidas son:

```text
PENDIENTE -> CONFIRMADA | RECHAZADA | CANCELADA
CONFIRMADA -> EN_CURSO | CANCELADA
EN_CURSO -> COMPLETADA | CANCELADA
```

Los estados finales no vuelven a abrirse. Cancelar o rechazar requiere un motivo. El servicio de
reservas rechaza solapamientos, bloqueos de agenda, horarios fuera de disponibilidad y reservas de
una persona consigo misma.

## Chat

El chat esta implementado como un canal privado por reserva:

```text
Conversacion
- id
- reserva_id: FK unica a reservas.id
- fecha_creacion
- estado
- version

Mensaje
- id
- conversacion_id: FK a conversaciones.id
- remitente_usuario_id: FK a usuarios.id
- contenido
- fecha_envio
- fecha_edicion (opcional)
- fecha_eliminacion (opcional, borrado logico)
- leido_en (opcional)
```

Una conversacion pertenece a una reserva, por lo que sus participantes se derivan de
`reserva.estudiante.usuario` y `reserva.tutor.usuario`. Antes de guardar un mensaje se debe validar
que el usuario sea uno de ellos. `ChatService` concentra estas reglas y es el punto de entrada para
la futura capa web. No se exponen entidades JPA directamente para evitar ciclos y la filtracion de
datos de `Usuario`.

El servicio permite crear u obtener la conversacion, listar mensajes, enviar, editar, hacer borrado
logico, marcar como leido y cerrar. Solo el autor modifica o elimina su mensaje; el remitente no
puede marcarlo como leido y una conversacion cerrada no admite envios ni ediciones. `leido_en` es
suficiente porque cada conversacion tiene exactamente dos participantes.

Los adjuntos y chats grupales no forman parte del alcance actual. Si se agregan, se recomienda
`AdjuntoMensaje` con metadatos y una URL de almacenamiento de objetos; para grupos se necesitarian
`ParticipanteConversacion` y `LecturaMensaje`.

## Catalogo de entidades

| Entidad | Responsabilidad | Relaciones principales |
| --- | --- | --- |
| `Usuario` | Identidad, credenciales, estado y roles comunes. | Tiene cero o un perfil de cada tipo; envia mensajes. |
| `Estudiante` | Datos academicos del usuario que solicita tutorias. | Uno a uno con `Usuario`; tiene muchas reservas. |
| `Tutor` | Perfil profesional, tarifa y disponibilidad general. | Uno a uno con `Usuario`; materias, agenda y reservas. |
| `Materia` | Nombre normalizado de una asignatura. | Muchos a muchos con tutores; una a muchas reservas. |
| `DisponibilidadTutor` | Intervalo semanal recurrente en el que atiende un tutor. | Muchas disponibilidades pertenecen a un tutor. |
| `BloqueoAgenda` | Excepcion de indisponibilidad para una fecha concreta. | Muchos bloqueos pertenecen a un tutor. |
| `Reserva` | Acuerdo de tutoria, horario, precio, modalidad y estado. | Une estudiante, tutor y materia; puede tener resena y conversacion. |
| `Resena` | Calificacion opcional de una reserva completada. | Uno a uno con `Reserva`. |
| `Conversacion` | Canal privado y unico asociado a una reserva. | Uno a uno con `Reserva`; contiene mensajes. |
| `Mensaje` | Contenido enviado por un participante, con lectura y borrado logico. | Pertenece a una conversacion y a un usuario remitente. |

Los enums persistidos como texto son `RolUsuario`, `EstadoReserva`, `ModalidadReserva`,
`DiaSemana` y `EstadoConversacion`. Añadir o renombrar un valor requiere actualizar también las
restricciones `check` de las migraciones.

## Migraciones

La migracion `20260917160000_refactor_domain_model.sql` transforma datos existentes: renombra
clientes a usuarios, incorpora administradores como usuarios, asigna roles, normaliza materias y
crea agenda, bloqueos y resenas. `20260917170000_add_chat.sql` agrega conversaciones y mensajes.
Hibernate usa `validate` en todos los perfiles; las migraciones son la unica fuente autorizada de
cambios del esquema.
