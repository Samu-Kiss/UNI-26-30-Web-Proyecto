# Frontend MyT

Angular con rutas /tutores, /reservas, /login y /usuarios (administrador).
Los datos proceden de Spring Boot y PostgreSQL y requieren una sesión válida.

```sh
npm ci
npm start
npm run lint
npm run test:ci
npm run build
```

El proxy envía /api a localhost:8080. Para levantar base de demo y backend,
consulta [la guía reproducible](../docs/entrega-2.md).

prestart / prebuild generan runtime-config.js; no se incluyen claves JWT en el navegador.
En producción publica frontend y API bajo el mismo origen. Sentry es opcional.
