import { expect, test } from '@playwright/test';
import { configurarApiMock } from './fixtures/mock-api';

test.describe('Ciclo de reservas, navegación, cancelación con motivo, chat y reseñas', () => {
  test('crea una reserva con objetivo personalizado, navega sin recargar y valida confirmación independiente', async ({
    page,
  }) => {
    await configurarApiMock(page, {
      rol: 'ESTUDIANTE',
      perfilId: 1,
      nombreUsuario: 'Juan Pérez',
      rolSeguridad: 'USER',
    });

    await page.goto('/reservas?tutor=1');
    await expect(page.getByRole('heading', { name: 'Crear reserva' })).toBeVisible();

    // Regresión: pulsar "Mis reservas" en la barra lateral debe mostrar el listado sin recargar
    await page.locator('#myt-navigation').getByRole('link', { name: 'Mis reservas' }).click();
    await expect(page).toHaveURL(/\/reservas$/);
    await expect(page.getByRole('heading', { name: 'Mis reservas' })).toBeVisible();
    await expect(page.locator('.booking-session')).toHaveCount(3);

    // Volver al formulario de creación de reserva con Felipe Morales
    await page.goto('/reservas?tutor=1');
    await page.locator('input[name="tema"]').fill('Integración por partes y fracciones parciales');

    // Seleccionar el primer día disponible del calendario
    const diaDisponible = page.locator('.calendar-picker__day.is-available').first();
    await expect(diaDisponible).toBeVisible();
    await diaDisponible.click();

    // Verificar que las duraciones permitidas son exclusivamente 60, 90 y 120 minutos
    const opcionesDuracion = await page.locator('select[name="duracion"] option').allTextContents();
    expect(opcionesDuracion.map((t) => t.trim())).toEqual([
      '60 minutos',
      '90 minutos',
      '120 minutos',
    ]);

    await page.locator('select[name="duracion"]').selectOption({ label: '90 minutos' });
    await page.locator('select[name="hora"]').selectOption('10:00:00');

    // Seleccionar objetivo "Otro" y comprobar que exige texto obligatorio
    await page.locator('select[name="objetivo"]').selectOption('Otro');
    const botonSolicitar = page.getByRole('button', { name: 'Solicitar reserva' });
    await expect(botonSolicitar).toBeDisabled();

    await page
      .locator('textarea[name="otro"]')
      .fill('Dominar técnicas de integración antes del parcial final.');
    await expect(botonSolicitar).toBeEnabled();
    await botonSolicitar.click();

    // Debe redirigir a la pantalla independiente de detalle /reservas/:id?creada=1
    await expect(page).toHaveURL(/\/reservas\/\d+\?creada=1$/);
    await expect(page.getByRole('heading', { name: '¡Solicitud enviada!' })).toBeVisible();
    await expect(
      page.getByText('Dominar técnicas de integración antes del parcial final.'),
    ).toBeVisible();
  });

  test('permite al tutor confirmar, iniciar, completar y cancelar una reserva con formulario de motivo', async ({
    page,
  }) => {
    await configurarApiMock(page, {
      rol: 'TUTOR',
      perfilId: 1,
      nombreUsuario: 'Felipe Morales',
      rolSeguridad: 'USER',
    });

    await page.goto('/reservas');
    await expect(page.getByRole('heading', { name: 'Mis reservas' })).toBeVisible();

    // Confirmar la reserva #101 (PENDIENTE -> CONFIRMADA)
    const sesion101 = page.locator('.booking-session', { hasText: '#101' });
    await expect(sesion101).toContainText('Pendiente');
    await sesion101.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Reserva actualizada.')).toBeVisible();
    await expect(sesion101).toContainText('Confirmada');

    // Cancelar la reserva #102 usando el formulario en página (sin window.prompt)
    const sesion102 = page.locator('.booking-session', { hasText: '#102' });
    await sesion102.getByRole('button', { name: 'Cancelar con motivo' }).click();

    const panelCancelacion = page.locator('section', { hasText: 'Cancelar reserva #102' });
    await expect(panelCancelacion).toBeVisible();
    const btnConfirmarCancelacion = panelCancelacion.getByRole('button', {
      name: 'Confirmar cancelación',
    });
    await expect(btnConfirmarCancelacion).toBeDisabled();

    // Probar botón "Volver sin cancelar"
    await panelCancelacion.getByRole('button', { name: 'Volver sin cancelar' }).click();
    await expect(panelCancelacion).toBeHidden();

    // Volver a abrir y confirmar la cancelación con motivo válido
    await sesion102.getByRole('button', { name: 'Cancelar con motivo' }).click();
    await page
      .locator('textarea[name="motivo"]')
      .fill('Cruce imprevisto con sustentación académica de posgrado.');
    await btnConfirmarCancelacion.click();

    await expect(sesion102).toContainText('Cancelada');

    // Verificar que el motivo quedó persistido en el detalle de la reserva #102
    await sesion102.getByRole('link', { name: 'Ver detalle' }).click();
    await expect(page).toHaveURL(/\/reservas\/102$/);
    await expect(
      page.getByText('Cruce imprevisto con sustentación académica de posgrado.'),
    ).toBeVisible();
  });

  test('envía mensajes en el chat de una reserva y publica una reseña de tutoría completada', async ({
    page,
  }) => {
    await configurarApiMock(page, {
      rol: 'ESTUDIANTE',
      perfilId: 1,
      nombreUsuario: 'Juan Pérez',
      rolSeguridad: 'USER',
    });

    // 1. Chat de la reserva #101
    await page.goto('/mensajes?reserva=101');
    await expect(page.getByRole('heading', { name: 'Mensajes' })).toBeVisible();
    await expect(
      page.getByText('Hola Juan, recuerda tener listos los ejercicios del taller.'),
    ).toBeVisible();

    await page
      .locator('#chat-text')
      .fill('¡Hola Felipe! Ya tengo listos los ejercicios de límites.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(
      page.locator('.chat-bubble--own', {
        hasText: '¡Hola Felipe! Ya tengo listos los ejercicios de límites.',
      }),
    ).toBeVisible();

    // 2. Publicar reseña de la reserva completada #103
    await page.goto('/resenas');
    await expect(page.getByRole('heading', { name: 'Reseñar mis tutorías' })).toBeVisible();

    const tarjetaPendiente = page.locator('.review-card', {
      hasText: 'Derivadas implícitas y regla de la cadena',
    });
    await expect(tarjetaPendiente).toBeVisible();
    await tarjetaPendiente.getByRole('button', { name: 'Añadir reseña' }).click();

    await expect(page.getByRole('heading', { name: 'Reseñar tutoría #103' })).toBeVisible();
    await page
      .locator('textarea[name="comentario"]')
      .fill('La sesión fue muy clara y resolvimos todos los ejercicios propuestos.');
    await page.getByRole('button', { name: 'Publicar reseña' }).click();

    await expect(page.getByText('Reseña publicada.')).toBeVisible();
    await expect(page.getByText('¡Al día con tus valoraciones!')).toBeVisible();
  });
});
