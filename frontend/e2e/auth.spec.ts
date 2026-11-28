import { expect, test } from '@playwright/test';
import { configurarApiMock } from './fixtures/mock-api';

test.describe('Autenticación, roles, guardas y registro', () => {
  test('la portada pública muestra secciones clave y redirige rutas protegidas a /login', async ({
    page,
  }) => {
    await configurarApiMock(page, null);

    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Tu próxima tutoría empieza con la persona correcta/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Iniciar sesión' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear cuenta' }).first()).toBeVisible();

    // Intentar acceder a una ruta protegida sin sesión debe redirigir a /login
    await page.goto('/tutores');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Ingreso a MyT' })).toBeVisible();
  });

  test('muestra error 401 con credenciales inválidas y error 403 en cuenta desactivada', async ({
    page,
  }) => {
    const state = await configurarApiMock(page, null);
    state.usuarios.find((u) => u.correo === 'estudiante02@myt.edu.co')!.activo = false;

    await page.goto('/login');

    // Credenciales incorrectas
    await page.locator('input[name="correo"]').fill('estudiante01@myt.edu.co');
    await page.locator('input[name="contrasena"]').fill('ClaveErronea123');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByRole('alert')).toContainText('Credenciales inválidas');

    // Cuenta inactiva
    await page.locator('input[name="correo"]').fill('estudiante02@myt.edu.co');
    await page.locator('input[name="contrasena"]').fill('1ManzanaGrande!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByRole('alert')).toContainText('Tu cuenta está desactivada');
  });

  test('inicia sesión como Estudiante, protege rutas de Admin y cierra sesión', async ({
    page,
  }) => {
    await configurarApiMock(page, null);

    await page.goto('/login');
    await page.getByRole('button', { name: /USER 1 · Estudiante/i }).click();

    await expect(page).toHaveURL(/\/tutores$/);
    await expect(page.getByRole('heading', { name: 'Encuentra al tutor ideal' })).toBeVisible();
    await expect(page.locator('.myt-sidebar__user')).toContainText('Juan Pérez');
    await expect(page.locator('.myt-sidebar__user')).toContainText('USER · ESTUDIANTE');

    // Un estudiante que intenta abrir /usuarios es redirigido a /tutores por sessionGuard
    await page.goto('/usuarios');
    await expect(page).toHaveURL(/\/tutores$/);

    // Cerrar sesión
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('inicia sesión como Tutor con agenda hacia /reservas y sin agenda hacia /mi-perfil?setup=1', async ({
    page,
  }) => {
    await configurarApiMock(page, null);

    // Tutor con agenda configurada
    await page.goto('/login');
    await page.getByRole('button', { name: /USER 2 · Tutor/i }).click();
    await expect(page).toHaveURL(/\/reservas$/);
    await expect(page.getByRole('heading', { name: 'Mis reservas' })).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Tutor nuevo sin disponibilidad configurada
    await page.locator('input[name="correo"]').fill('tutornuevo@myt.edu.co');
    await page.locator('input[name="contrasena"]').fill('1ManzanaGrande!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/mi-perfil\?setup=1$/);
    await expect(page.getByText('¡Te damos la bienvenida a MyT!')).toBeVisible();
  });

  test('permite elegir perfil en cuentas multi-rol y recuperar contraseña con token temporal', async ({
    page,
  }) => {
    await configurarApiMock(page, null);

    await page.goto('/login');

    // Recuperación de contraseña
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible();

    await page.locator('input[name="correoRecuperacion"]').fill('user1@myt.edu.co');
    await page.getByRole('button', { name: 'Generar código de recuperación' }).click();

    await expect(page.locator('.myt-demo-token code')).toHaveText('MYT-REC-2026');
    await page.locator('input[name="nuevaContrasena"]').fill('NuevaClave2026!');
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click();

    await expect(page.getByRole('status')).toContainText('Tu contraseña se actualizó correctamente');

    // Login con cuenta dual (Estudiante + Tutor)
    await page.locator('input[name="correo"]').fill('dual@myt.edu.co');
    await page.locator('input[name="contrasena"]').fill('1ManzanaGrande!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByRole('heading', { name: 'Elige tu perfil' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar como TUTOR' }).click();
    await expect(page).toHaveURL(/\/reservas$/);
  });

  test('valida teléfono en el autorregistro y permite registrar una nueva cuenta de tutor', async ({
    page,
  }) => {
    await configurarApiMock(page, null);

    await page.goto('/registro?rol=TUTOR');
    await expect(page.getByRole('heading', { name: 'Crear una cuenta' })).toBeVisible();

    await page.locator('input[name="nombre"]').fill('Sofía');
    await page.locator('input[name="apellido"]').fill('Gómez');
    await page.locator('input[name="correo"]').fill('sofia.tutor@myt.edu.co');
    await page.locator('input[name="telefono"]').fill('telefono-invalido');
    await page.locator('input[name="contrasena"]').fill('1ManzanaGrande!');
    await page.locator('input[name="materias"]').fill('Cálculo Diferencial, Álgebra');
    await page.locator('textarea[name="biografia"]').fill('Tutora de matemáticas universitarias.');

    await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
    await expect(page.getByRole('alert').first()).toContainText('10 dígitos');

    // Corregir teléfono y registrar
    await page.locator('input[name="telefono"]').fill('+573001234567');
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click();

    await expect(page.getByText('¡Cuenta creada exitosamente!')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir al inicio de sesión' })).toBeVisible();
  });
});
