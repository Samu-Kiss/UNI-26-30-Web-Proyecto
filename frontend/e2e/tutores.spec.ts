import { expect, test } from '@playwright/test';
import { configurarApiMock } from './fixtures/mock-api';

test.describe('Catálogo de tutores, perfil, filtros, paginación y editor reactivo', () => {
  test('filtra por texto, materia y tarifa, ordena por precio y pagina resultados', async ({
    page,
  }) => {
    await configurarApiMock(page, {
      rol: 'ESTUDIANTE',
      perfilId: 1,
      nombreUsuario: 'Juan Pérez',
      rolSeguridad: 'USER',
    });

    await page.goto('/tutores');
    await expect(page.getByRole('heading', { name: 'Encuentra al tutor ideal' })).toBeVisible();
    await expect(page.locator('.myt-results-count')).toContainText('7 tutores disponibles');
    await expect(page.locator('.myt-results-count')).toContainText('Página 1 de 2');

    // Verificar que un tutor sin reseñas muestra "Sin reseñas" sin puntuación falsa
    const tarjetaRosa = page.locator('.myt-tutor-card', { hasText: 'Rosa Mendoza' });
    await expect(tarjetaRosa).toContainText('Sin reseñas');

    // Navegar a la página 2 y regresar a la página 1
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page.locator('.myt-results-count')).toContainText('Página 2 de 2');
    await expect(page.locator('.myt-tutor-card', { hasText: 'Camila Rincón' })).toBeVisible();

    await page.getByRole('button', { name: 'Página anterior' }).click();
    await expect(page.locator('.myt-results-count')).toContainText('Página 1 de 2');

    // Filtrar por texto de búsqueda
    await page.locator('input[name="busquedaTexto"]').fill('Felipe');
    await expect(page.locator('.myt-tutor-card')).toHaveCount(1);
    await expect(page.locator('.myt-tutor-card').first()).toContainText('Felipe Morales');

    // Limpiar búsqueda y filtrar por materia + tarifa máxima
    await page.locator('input[name="busquedaTexto"]').fill('');
    await page.locator('select[name="materia"]').selectOption({ label: 'Programación Web' });
    await page.locator('input[name="tarifaMax"]').fill('50000');
    await page.getByRole('button', { name: 'Filtrar' }).click();

    await expect(page.locator('.myt-tutor-card')).toHaveCount(1);
    await expect(page.locator('.myt-tutor-card').first()).toContainText('Carlos Duarte');

    // Alternar orden
    await page.getByRole('button', { name: /Ordenar:/i }).click();
    await expect(page.getByRole('button', { name: /Ordenar: Menor tarifa/i })).toBeVisible();
  });

  test('muestra el perfil del tutor, sus reseñas, horarios disponibles y enlace para reservar', async ({
    page,
  }) => {
    await configurarApiMock(page, {
      rol: 'ESTUDIANTE',
      perfilId: 1,
      nombreUsuario: 'Juan Pérez',
      rolSeguridad: 'USER',
    });

    await page.goto('/tutores/1');
    await expect(page.getByRole('heading', { name: 'Felipe Morales' })).toBeVisible();
    await expect(page.getByText('Excelente explicación de límites y derivadas')).toBeVisible();

    // Seleccionar un horario disponible en la barra lateral
    const botonHora = page.locator('.profile-slots button', { hasText: '10:00' });
    await expect(botonHora).toBeVisible();
    await botonHora.click();

    const linkReservarHorario = page.getByRole('link', { name: 'Reservar este horario' });
    await expect(linkReservarHorario).toBeVisible();
    await linkReservarHorario.click();

    await expect(page).toHaveURL(/\/reservas\?tutor=1&fecha=.*&hora=10(%3A|:)00(%3A|:)00/);
    await expect(page.getByRole('heading', { name: 'Crear reserva' })).toBeVisible();
  });

  test('permite al administrador editar un tutor, agregar materias, crear perfil tutor y manejar 409', async ({
    page,
  }) => {
    await configurarApiMock(page, {
      rol: 'ADMINISTRADOR',
      perfilId: 1,
      nombreUsuario: 'Juan David Ortiz',
      rolSeguridad: 'ADMIN',
    });

    await page.goto('/tutores');

    // Abrir el editor reactivo para Felipe Morales
    const tarjetaFelipe = page.locator('.myt-tutor-card', { hasText: 'Felipe Morales' });
    await tarjetaFelipe.getByRole('button', { name: 'Editar' }).click();

    const editor = page.locator('app-tutor-editor');
    await expect(editor.getByRole('heading', { name: 'Editar Felipe Morales' })).toBeVisible();

    // Validar controles reactivos y agregar nueva materia
    await editor.locator('input[formControlName="tarifaPorHora"]').fill('52000');
    await editor.locator('input[formControlName="materiasTexto"]').fill('Álgebra Lineal Avanzada');
    await editor
      .locator('textarea[formControlName="biografia"]')
      .fill('Especialista en cálculo, física y álgebra lineal avanzada.');
    await editor.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(editor).toBeHidden();
    await expect(page.locator('.myt-cambios-badge')).toContainText('Acciones exitosas: 1');
    await expect(tarjetaFelipe).toContainText(/\$52[.,]000/);
    await expect(tarjetaFelipe).toContainText('Álgebra Lineal Avanzada');

    // Probar alta administrativa de tutor con conflicto 409 (usuarioId 3 ya es tutor)
    const details = page.locator('details', {
      hasText: 'Asignar perfil tutor a una cuenta existente',
    });
    await details.locator('summary').click();
    await details.locator('input[name="usuarioId"]').fill('3');
    await details.locator('input[name="tarifa"]').fill('40000');
    await details.locator('select[name="nuevaMateria"]').selectOption({ index: 1 });
    await details
      .locator('textarea[name="biografia"]')
      .fill('Intento duplicado para probar conflicto 409.');
    await details.getByRole('button', { name: 'Crear perfil tutor' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'El usuario ya cuenta con un perfil de tutor registrado',
    );
  });
});
