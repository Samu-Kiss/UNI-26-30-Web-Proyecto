import { expect, test } from '@playwright/test';
import { configurarApiMock } from './fixtures/mock-api';

test.describe('Panel de administración, usuarios, directorios y agenda de tutor', () => {
  test('gestiona usuarios, filtra en tiempo real, desactiva/activa reactivamente y agrega perfiles', async ({
    page,
  }) => {
    await configurarApiMock(page, {
      rol: 'ADMINISTRADOR',
      perfilId: 1,
      nombreUsuario: 'Juan David Ortiz',
      rolSeguridad: 'ADMIN',
    });

    await page.goto('/usuarios');
    await expect(page.getByRole('heading', { name: 'Gestión de usuarios' })).toBeVisible();

    // Verificar métricas KPI iniciales (4 usuarios, 4 activos, 2 estudiantes, 1 tutor, 1 admin)
    const kpis = page.locator('.myt-kpi-card');
    await expect(kpis.nth(0)).toContainText('4');
    await expect(kpis.nth(1)).toContainText('4');

    // Desactivar a Maria Rodríguez y comprobar actualización inmediata sin pulsar "Actualizar listado"
    const filaMaria = page.locator('tbody tr', { hasText: 'estudiante02@myt.edu.co' });
    await expect(filaMaria).toContainText('Activo');
    await filaMaria.getByRole('button', { name: 'Desactivar' }).click();

    await expect(filaMaria).toContainText('Inactivo');
    await expect(filaMaria.getByRole('button', { name: 'Activar' })).toBeVisible();
    await expect(kpis.nth(1)).toContainText('3');

    // Inspeccionar ficha de usuario ("Ver")
    await filaMaria.getByRole('button', { name: 'Ver usuario Maria' }).click();
    const ficha = page.locator('.myt-user-detail-card');
    await expect(ficha).toContainText('#4 · Maria Rodríguez');
    await expect(ficha).toContainText('Inactivo');
    await ficha.getByRole('button', { name: 'Cerrar ficha' }).click();

    // Editar datos del usuario y validar formato de teléfono
    await filaMaria.getByRole('button', { name: 'Editar' }).click();
    const subpanelEditar = page.locator('.myt-subpanel', { hasText: 'Editar usuario #4' });
    await expect(subpanelEditar).toBeVisible();
    await subpanelEditar.locator('input[name="editTelefono"]').fill('+573209998877');
    await subpanelEditar.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Datos de Maria actualizados.')).toBeVisible();

    // Agregar perfil TUTOR a un estudiante existente
    const filaJuan = page.locator('tbody tr', { hasText: 'estudiante01@myt.edu.co' });
    await filaJuan.getByRole('button', { name: 'Agregar perfil' }).click();
    const subpanelPerfil = page.locator('.myt-subpanel', {
      hasText: 'Agregar perfil a Juan Pérez',
    });
    await subpanelPerfil.locator('select[name="nuevoPerfilRol"]').selectOption('TUTOR');
    await subpanelPerfil.getByRole('button', { name: 'Guardar perfil' }).click();

    await expect(filaJuan).toContainText('TUTOR');
    await expect(kpis.nth(3)).toContainText('2');

    // Registrar un nuevo usuario desde el formulario administrativo inferior
    const formNuevo = page.locator('app-usuario-form');
    await formNuevo.locator('input[name="nombre"]').fill('Valentina');
    await formNuevo.locator('input[name="apellido"]').fill('Castro');
    await formNuevo.locator('input[name="correo"]').fill('valentina.castro@myt.edu.co');
    await formNuevo.locator('input[name="contrasena"]').fill('1ManzanaGrande!');
    await formNuevo.locator('input[name="telefono"]').fill('3112223344');
    await formNuevo.locator('input[name="codigoEstudiantil"]').fill('20269901');
    await formNuevo.locator('input[name="semestre"]').fill('4');
    await formNuevo.locator('input[name="universidad"]').fill('Pontificia Universidad Javeriana');
    await formNuevo.locator('input[name="programaAcademico"]').fill('Ingeniería de Sistemas');
    await formNuevo.getByRole('button', { name: 'Guardar usuario' }).click();

    await expect(page.getByText('Usuario registrado.')).toBeVisible();
    await expect(kpis.nth(0)).toContainText('5');

    // Filtrar usuarios con el buscador reactivo
    await page.locator('#filtro-usuarios').fill('Valentina');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr').first()).toContainText('valentina.castro@myt.edu.co');
  });

  test('consulta los directorios administrativos de estudiantes y administradores', async ({
    page,
  }) => {
    await configurarApiMock(page, {
      rol: 'ADMINISTRADOR',
      perfilId: 1,
      nombreUsuario: 'Juan David Ortiz',
      rolSeguridad: 'ADMIN',
    });

    await page.goto('/estudiantes');
    await expect(page.getByText('Juan Pérez')).toBeVisible();
    await expect(page.getByText('Maria Rodríguez')).toBeVisible();

    await page.goto('/administradores');
    await expect(page.getByText('admin.ortiz@myt.edu.co')).toBeVisible();
  });

  test('permite al tutor gestionar su disponibilidad semanal, bloqueos y navegar en el calendario', async ({
    page,
  }) => {
    await configurarApiMock(page, {
      rol: 'TUTOR',
      perfilId: 1,
      nombreUsuario: 'Felipe Morales',
      rolSeguridad: 'USER',
    });

    // 1. Calendario del tutor
    await page.goto('/calendario');
    await expect(page.getByRole('heading', { name: 'Mi calendario' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Disponibilidad semanal' })).toBeVisible();

    const mesInicial = await page.locator('.calendar-month h2').textContent();
    await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await expect(page.locator('.calendar-month h2')).not.toHaveText(mesInicial ?? '');
    await page.getByRole('button', { name: 'Hoy' }).click();
    await expect(page.locator('.calendar-month h2')).toHaveText(mesInicial ?? '');

    // 2. Editor de agenda en Mi perfil
    await page.goto('/mi-perfil');
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mi disponibilidad y bloqueos' })).toBeVisible();

    await page.getByRole('button', { name: 'Añadir bloqueo' }).click();
    const filaBloqueo = page.locator('.agenda-row--block').first();
    await filaBloqueo.locator('input[type="date"]').fill('2026-12-10');
    await filaBloqueo
      .locator('input[type="text"]')
      .fill('Sustentación de proyecto de grado universitario');

    await page.getByRole('button', { name: 'Guardar agenda' }).click();
    await expect(page.getByText('Agenda guardada.')).toBeVisible();
  });
});
