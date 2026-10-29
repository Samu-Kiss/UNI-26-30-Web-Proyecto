# Pruebas de las correcciones en navegador — 28 de octubre de 2026

## Actualización después de corregir los hallazgos

Los tres puntos identificados en esta auditoría se corrigieron y se volvieron a comprobar en la misma base aislada:

- **Navegación:** desde `/reservas?tutor=1`, pulsar Mis reservas muestra el listado en `/reservas` sin recargar. El cambio de parámetros limpia el formulario y descarta consultas del tutor que todavía estén pendientes.
- **Portada:** se retiraron las fechas, materias y enlaces de reserva fijos. Con sesión muestra hasta tres próximas reservas reales, ordenadas por fecha, con actualización periódica y estados de carga, vacío y error con reintento. Sin sesión invita a ingresar y no consulta reservas. Se verificaron las reservas reales #29, #30 y #32 en la portada del administrador y la invitación al ingreso en la portada pública.
- **Cancelación:** se reemplazó `window.prompt` por un formulario dentro de la página, con foco en el motivo, límite de 500 caracteres, rechazo de texto vacío o solo espacios, confirmación explícita y opción de volver sin cancelar. Se canceló #36 como tutor y #33 como administrador, comprobando la actualización inmediata del estado. El detalle de #36 mostró el motivo persistido.

Validación del frontend: **93 pruebas aprobadas en 20 archivos**, lint aprobado y compilación de producción aprobada. Se agregaron regresiones para navegación reutilizando el componente, respuestas tardías, validación y errores de cancelación y datos reales de la portada. La compilación conserva la advertencia de tamaño del paquete inicial, ligeramente por encima de 500 kB.

Evidencias posteriores: [cancelación corregida y motivo guardado](../.codex-tmp/browser-qa/cancelacion-corregida.jpg), [portada pública corregida](../.codex-tmp/browser-qa/portada-corregida.jpg), [Mis reservas sin recargar](../.codex-tmp/browser-qa/mis-reservas-corregido.jpg).

El resto de este documento conserva los resultados de la **auditoría inicial**, previos a estas tres correcciones. Sus límites de cobertura para otros requerimientos continúan aplicando.

## Alcance y entorno

Pruebas manuales automatizadas sobre la interfaz real en `http://localhost:4200`, con el backend local actualizado en el puerto 8080 y PostgreSQL aislado para esta verificación. Se usaron las cuentas de estudiante, tutor y administrador del seed, y se registró un tutor adicional exclusivamente en esa base local. Los registros del seed son datos persistidos de prueba; se distinguieron de contenido fijo en las plantillas.

Al comenzar, el backend no estaba disponible en 8080. Se inició una instancia con las migraciones del checkout y una base nueva: proyecto Docker `myt-browser-20261028`, PostgreSQL publicado en `127.0.0.1:50241`. Se reinició el servidor de Angular para servir el código actual. No se modificó la base compartida ni el código funcional durante estas pruebas.

Los resultados describen los recorridos efectivamente comprobados. No equivalen a una certificación exhaustiva de todas las pantallas, concurrencia, validación directa de API ni comportamiento en todos los navegadores.

## Hallazgos reproducibles

### 1. Mis reservas conserva el formulario de creación al navegar sin recargar

- Entrar como estudiante y abrir **Reservar** con Felipe.
- En `/reservas?tutor=1`, seleccionar fecha y duración.
- Pulsar **Mis reservas** en la navegación.
- La URL cambia a `/reservas` y la navegación marca **Mis reservas**, pero el contenido continúa mostrando **Crear reserva / Reservar con Felipe Morales**.
- Recargar muestra correctamente el listado.

Impacto: no se puede volver directamente del formulario al listado. La confirmación posterior a una creación exitosa sí usa una ruta independiente y funciona.

Referencia de implementación: `frontend/src/app/pages/reservas-page/reservas-page.ts:85` consulta el parámetro `tutor` mediante un snapshot en la inicialización; la reproducción es consistente con la reutilización del componente sin limpiar su estado cuando cambia la consulta.

Evidencia: [captura del fallo](../.codex-tmp/browser-qa/mis-reservas-formulario.jpg).

### 2. La portada conserva tutorías y fechas fijas

Sin sesión, **Tu semana en MyT** presenta `LUN 7`, `MAR 8`, `MIÉ 9`, `JUE 10`, `VIE 11`, una tutoría de Cálculo a las 4:00 p. m. y otra de Inglés a las 6:00 p. m. Los enlaces apuntan a `/reservas/1` y `/reservas/3`. No se identifican como datos ilustrativos.

Esto impide aprobar de forma global el requisito 10.1. Las plantillas todavía contienen esos valores en `frontend/src/app/pages/landing-page/landing-page.ts:187`.

Evidencia: [portada completa](../.codex-tmp/browser-qa/portada-datos-fijos.jpg).

### 3. Cancelación pendiente de verificar en un navegador compatible con prompt

Al pulsar **Cancelar con motivo**, el navegador integrado registra `Error: prompt() is not supported.` No aparece un campo para escribir la justificación y la reserva conserva su estado.

El flujo depende de `window.prompt` en `frontend/src/app/pages/reservas-page/reservas-page.ts:157`. Esta limitación del navegador utilizado no demuestra que falle en Chrome o Edge, pero impide aprobar la cancelación de principio a fin en esta ejecución, tanto para tutor como para administrador. Requiere una prueba adicional en un navegador compatible o reemplazar el prompt por un formulario dentro de la aplicación.

## Matriz de requerimientos

**OK**: recorrido observado satisfactorio. **Parcial**: solo una parte comprobada o falta un control complementario. **Pendiente**: no pudo completarse. **Falla**: resultado contrario a lo solicitado.

| ID | Resultado | Evidencia y límites |
| --- | --- | --- |
| 1.1 | Parcial | Varios ingresos exitosos redirigieron correctamente sin observar un error falso; no se midieron destellos mediante grabación o instrumentación temporal. |
| 1.2 | OK | Tras desactivar a Maria, su ingreso con credenciales válidas mostró que la cuenta estaba desactivada y que debía contactar a soporte. |
| 1.3 | Parcial | La sesión se conservó al recargar calendario, perfil y reservas. No se midió cuadro por cuadro la ausencia de opciones de invitado durante la carga. |
| 2.1 | Parcial | Registro y perfil rechazaron teléfonos con letras. El perfil deshabilitó Guardar y el registro mostró error sin crear la cuenta. Un teléfono válido permitió registrar al tutor. No se intentó omitir el frontend para probar directamente la validación del backend. |
| 2.2 | OK | El tutor nuevo fue dirigido a `/mi-perfil?setup=1`, con disponibilidad vacía y controles de días y horas. Se guardó su agenda. |
| 3.1 | OK en catálogo | La búsqueda Felipe redujo 30 tutores y 6 páginas a 1 tutor, sin paginación sobrante. No se comprobó una combinación exhaustiva de filtros. |
| 3.2 | OK | Desactivar a Maria cambió inmediatamente su fila a Inactivo, el botón a Activar y el conteo de activos de 54 a 53, sin Actualizar. |
| 3.3 | OK en interfaz | No se encontró el botón Examinar usuario. Permanecen otras herramientas técnicas de consulta reactiva; no se verificó su relación interna con la funcionalidad eliminada. |
| 3.4 | OK | El resumen mostró 54 cuentas: 20 estudiantes, 30 tutores y 4 administradores; el total de activos reaccionó a la desactivación. |
| 3.5 | Parcial | El directorio de estudiantes reflejó el estado Inactivo al navegar a él. No se verificó una actualización entre dos sesiones manteniendo esa pantalla abierta. |
| 4.1 | Parcial | El administrador vio las reservas de distintos tutores y estudiantes, incluida la nueva, y abrió detalles ajenos a su cuenta. La cancelación quedó pendiente por prompt. |
| 5.1 | Parcial | El tutor con agenda inició en Mis reservas, vio solo sus 4 reservas y confirmó la #30 reactivamente. Cancelación pendiente por prompt. |
| 5.2 | OK | El detalle del tutor mostró nombre, correo y teléfono del estudiante, fecha, duración, modalidad, objetivo y total. |
| 5.3 | OK en interfaz | El tutor vio reseñas recibidas y puntuación, sin formulario ni acción de publicación. No se intentaron escrituras directas a la API. |
| 5.4 | OK | El calendario de Felipe mostró su reserva completada de octubre y la confirmada #30 de noviembre, junto a sus bloqueos. Un tutor distinto recibió La reserva pertenece a otro perfil al abrir #35. |
| 5.5 | OK | Se creó, consultó tras recarga, editó y eliminó disponibilidad. Un horario con fin anterior al inicio se rechazó. Eliminar la franja de la reserva confirmada #30 se rechazó sin alterar la reserva. |
| 5.6 | OK | Se creó, consultó, editó y eliminó un bloqueo, verificando persistencia. Otro bloqueo apareció en calendario y excluyó sus horas de la reserva del estudiante. No se probó cada tipo de conflicto posible. |
| 6.1 | OK en interfaz | El estudiante vio únicamente sus tutorías completadas sin reseña; su nueva reserva pendiente no apareció. Se publicó una reseña de la tutoría completada #1. |
| 6.2 | OK | No apareció Reseñas publicadas recientemente. |
| 6.3 | OK | Rosa mostró Sin reseñas en catálogo y perfil, sin puntuación ni estrellas de valoración. |
| 6.4 | OK | Las tutorías completadas disponibles aparecieron directamente con Añadir reseña. Publicar retiró #1 del listado pendiente. |
| 7.1 | OK | Los calendarios de tutor y estudiante mostraron sus registros. La reserva nueva #36 apareció en el día 29 del estudiante. |
| 7.2 | OK | Al pasar de octubre a noviembre cambiaron los eventos: #25 en octubre y #30 en noviembre para Felipe. |
| 7.3 | Parcial | Próximas tutorías mostró la confirmada #30 para el tutor y la nueva pendiente #36 para el estudiante. No se verificaron todas las transiciones ni la actualización entre sesiones abiertas. |
| 7.4 | OK en caso probado | Rosa mostró próxima disponibilidad 2026-10-30 09:00, posterior al momento de prueba. No se recorrió un periodo completo de 30 días sin disponibilidad. |
| 8.1 | OK | El selector solo ofreció 60, 90 y 120 minutos. |
| 8.2 | OK | Hora inicialmente deshabilitada; domingo sin disponibilidad mantuvo el selector vacío. Jueves 09:00–18:00 con bloqueo 09:00–10:00 ofreció inicios desde 10:00. Últimos inicios: 17:00 para 60, 16:30 para 90 y 16:00 para 120. Después de reservar 10:00–11:30, las opciones comenzaron en 11:30. El miércoles con una reserva confirmada 16:00–18:00 solo ofreció 14:00 y 14:30 para 90 minutos. |
| 8.3 | Parcial | Crear #36 abrió `/reservas/36?creada=1`, mostrando Solicitud enviada y su detalle sin formulario. Se encontró además el fallo de navegación de creación a Mis reservas descrito arriba. |
| 9.1 | OK | Otro habilitó un texto obligatorio. Solicitar estaba deshabilitado mientras faltaba ese texto. La confirmación mostró el objetivo guardado. |
| 10.1 | Falla global / parcial en vistas | Se observaron carga, estados vacíos y errores con reintento, y las pantallas operativas probadas usaron datos persistidos. La portada conserva tutorías fijas. No se auditó cada pantalla ni todos los fallos de red. |

## Datos y evidencias de esta ejecución

- Reserva de prueba #36: estudiante Juan, tutor Felipe, 29 de octubre, 10:00, 90 minutos, pendiente. [Confirmación](../.codex-tmp/browser-qa/reserva-confirmada.jpg).
- La reserva #30 pasó de Pendiente a Confirmada en la base aislada.
- Maria quedó inactiva en esa base para comprobar el mensaje de acceso. [Estado reactivo](../.codex-tmp/browser-qa/usuario-reactivo.jpg), [mensaje de cuenta inactiva](../.codex-tmp/browser-qa/cuenta-inactiva.jpg).
- Se publicó una reseña de prueba de #1 y se registró el tutor QA Navegador. Sus franjas y bloqueos usados para probar el CRUD se eliminaron y se verificó el estado vacío tras recargar.
- Felipe conserva una franja adicional de jueves 09:00–18:00 y un bloqueo de prueba para el 29 de octubre 09:00–10:00, únicamente en la base aislada.
- [Calendario del estudiante con la reserva nueva](../.codex-tmp/browser-qa/calendario-estudiante.jpg).

No se enviaron mensajes de chat. Se comprobó la apertura de la conversación de #36 y su estado vacío. No se ejecutó una nueva suite de pruebas unitarias o de integración en esta sesión: el alcance fue la verificación en navegador.
