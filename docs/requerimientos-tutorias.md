# Correcciones del sistema de tutorías

## Comportamiento implementado

| Área | Resultado |
| --- | --- |
| Autenticación | La restauración de sesión termina antes de presentar la aplicación. El formulario conserva la contraseña durante la redirección para evitar el error fugaz de validación. Las cuentas desactivadas reciben un mensaje específico después de verificar sus credenciales. |
| Perfil | Registro y edición validan el teléfono en cliente y servidor. Se admite un número de 10 dígitos, opcionalmente precedido por `+57`; el campo es opcional. Cada usuario puede editar sus propios datos en **Mi perfil**. |
| Configuración del tutor | El primer ingreso de un tutor sin disponibilidad lo lleva a **Mi perfil**, donde configura días y franjas horarias. Los siguientes ingresos lo llevan a **Mis reservas**. |
| Agenda | La disponibilidad semanal y los bloqueos por fecha se crean, consultan, editan y eliminan desde el perfil. Los cambios se guardan juntos, de forma transaccional. Solo el tutor propietario puede modificarlos. |
| Conflictos | Se rechazan los cambios de agenda que dejen una reserva pendiente, confirmada o en curso fuera de disponibilidad o dentro de un bloqueo. Ninguna reserva se cancela automáticamente. La agenda y las reservas comparten el bloqueo del tutor para serializar escrituras concurrentes. |
| Catálogo | La búsqueda por texto, materia y precio y el ordenamiento se aplican a todos los resultados antes de paginar. Las puntuaciones aparecen únicamente cuando existen reseñas. |
| Administración | Se elimina **Examinar usuarios** y su diagnóstico asociado. El listado y los conteos responden a cambios del estado compartido y se reconcilian con el servidor. Los directorios muestran exclusivamente registros persistidos. El administrador puede consultar y gestionar todas las reservas. |
| Reservas | El tutor consulta únicamente sus reservas y puede ver el detalle y el estudiante, abrir el chat, confirmar, iniciar, completar y cancelar con motivo obligatorio. El servidor controla la propiedad y las transiciones. |
| Creación | Solo se admiten sesiones de 60, 90 o 120 minutos, con inicios cada media hora. Las horas se consultan después de seleccionar fecha y duración, descontando bloqueos y reservas existentes. No se acepta reservar sin disponibilidad configurada ni en el pasado. |
| Objetivo | **Otro** exige una explicación. El objetivo se valida y persiste por separado del tema. |
| Confirmación | Tras crear una reserva se abre su detalle en una ruta independiente, con el estado real. El formulario de creación no aparece en esa pantalla. |
| Reseñas | Solo el estudiante de una reserva completada puede publicar una reseña, una vez por reserva. La pantalla prioriza las tutorías pendientes de reseña. Los tutores solo consultan las reseñas recibidas. Se elimina el apartado de reseñas recientes. |
| Calendario | Usa las reservas reales del perfil autenticado, permite cambiar de mes y muestra las próximas tutorías por fecha. Los tutores también ven su disponibilidad y sus bloqueos. |
| Próxima disponibilidad | Se busca desde el día actual, en la zona `America/Bogota`, hasta 30 días hacia adelante, para una sesión de 60 minutos. Si no existe una franja, se muestra un estado vacío. |
| Chat | Los mensajes se consultan y guardan en el servidor y se restringen a los participantes de la reserva. |
| Datos y carga | Se retiran perfiles, estadísticas, reservas, reseñas, conversaciones y horarios ficticios, también de la página de inicio. Las consultas presentan carga, error con reintento o estado vacío. |

## Actualización de datos

Las operaciones de reserva, agenda y reseñas emiten cambios compartidos para actualizar las vistas abiertas. El listado administrativo observa su estado reactivo, por lo que los cambios de activación aparecen sin presionar **Actualizar**. Para recoger cambios de otras sesiones, los directorios se consultan cada 15 segundos, las reservas, el calendario y las reseñas cada 30 segundos, y el chat cada 10 segundos. Las suscripciones se liberan al cerrar cada vista.

## Migración necesaria antes de iniciar el backend actualizado

Aplicar, después de las migraciones existentes:

`backend/supabase/migrations/20261029010000_reserva_objetivo.sql`

Agrega la columna opcional `app.reservas.objetivo`, compatible con las reservas históricas. La base de datos compartida no se modifica como parte de las pruebas: las pruebas de integración aplican todas las migraciones en PostgreSQL aislado con Testcontainers. El perfil de aplicación sigue validando el esquema, sin modificarlo automáticamente.

## Verificación

- Frontend: compilación de producción, lint y pruebas de Angular.
- Backend: `mvnw verify`, con Checkstyle, pruebas de servicios y API y PostgreSQL aislado.
- Casos nuevos: límites de 60/90/120 minutos; intervalos de media hora; exclusión de bloqueos, reservas y días no disponibles; propiedad de agenda; protección de reservas confirmadas; CRUD persistido de agenda; permisos y persistencia de reseñas y chat; teléfono y cuenta desactivada; navegación mensual y confirmación independiente.

La compilación de Angular puede advertir que el paquete inicial supera ligeramente el presupuesto de 500 kB. La comprobación de envío a Sentry requiere su configuración y permanece omitida cuando no está disponible.
