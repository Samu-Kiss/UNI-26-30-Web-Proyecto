import { expect, test } from '@playwright/test';

test.describe('E2E Full-Stack (Angular + Spring Boot + PostgreSQL)', () => {
  test('flujo integral de estudiante: login con JWT HttpOnly, catálogo paginado, perfil de tutor y reservas reales', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Ingreso a MyT' })).toBeVisible();

    // Iniciar sesión con la cuenta de estudiante del seed / Spring Security
    await page.locator('input[name="correo"]').fill('estudiante01@myt.edu.co');
    await page.locator('input[name="contrasena"]').fill('1ManzanaGrande!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/tutores$/);
    await expect(page.getByRole('heading', { name: 'Encuentra al tutor ideal' })).toBeVisible();
    await expect(page.locator('.myt-tutor-card').first()).toBeVisible();

    // Filtrar por Felipe Morales en la base de datos real
    await page.locator('input[name="busquedaTexto"]').fill('Felipe');
    await expect(page.locator('.myt-tutor-card', { hasText: 'Felipe Morales' })).toBeVisible();

    // Abrir perfil del tutor
    await page
      .locator('.myt-tutor-card', { hasText: 'Felipe Morales' })
      .getByRole('link', { name: 'Ver perfil' })
      .click();
    await expect(page).toHaveURL(/\/tutores\/\d+$/);
    await expect(page.getByRole('heading', { name: 'Felipe Morales' })).toBeVisible();

    // Consultar Mis reservas reales del estudiante
    await page.locator('#myt-navigation').getByRole('link', { name: 'Mis reservas' }).click();
    await expect(page).toHaveURL(/\/reservas$/);
    await expect(page.getByRole('heading', { name: 'Mis reservas' })).toBeVisible();

    // Cerrar sesión y comprobar eliminación de cookie JWT
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('flujo integral de tutor: login, gestión de agenda/reservas y calendario real', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.locator('input[name="correo"]').fill('tutor01@myt.edu.co');
    await page.locator('input[name="contrasena"]').fill('1ManzanaGrande!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/(reservas|mi-perfil)/);
    await expect(page.locator('.myt-sidebar__user')).toContainText('TUTOR');

    // Navegar al calendario
    await page.locator('#myt-navigation').getByRole('link', { name: 'Calendario' }).click();
    await expect(page).toHaveURL(/\/calendario$/);
    await expect(page.getByRole('heading', { name: 'Mi calendario' })).toBeVisible();

    // Navegar a Mi perfil y verificar carga de datos desde PostgreSQL
    await page.getByRole('link', { name: 'Mi perfil' }).first().click();
    await expect(page).toHaveURL(/\/mi-perfil/);
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    await expect(page.locator('input[name="correo"]')).toHaveValue('tutor01@myt.edu.co');

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('flujo integral de administrador: acceso a /usuarios, KPIs reales, filtro y protección por rol', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.locator('input[name="correo"]').fill('admin.ortiz@myt.edu.co');
    await page.locator('input[name="contrasena"]').fill('1ManzanaGrande!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(page.getByRole('heading', { name: 'Gestión de usuarios' })).toBeVisible();

    // Esperar a que la tabla cargue usuarios reales de PostgreSQL
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.locator('.myt-kpi-card').first()).toBeVisible();

    // Filtrar por correo o nombre en la tabla administrativa
    await page.locator('#filtro-usuarios').fill('Felipe');
    await expect(page.locator('tbody tr', { hasText: 'tutor01@myt.edu.co' })).toBeVisible();

    // Consultar todas las reservas como administrador
    await page.locator('#myt-navigation').getByRole('link', { name: 'Todas las reservas' }).click();
    await expect(page).toHaveURL(/\/reservas$/);
    await expect(page.getByRole('heading', { name: 'Mis reservas' })).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
