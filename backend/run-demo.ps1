# Starts only the isolated demo database and uses it instead of .env.local/Supabase.
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    docker compose -f ../compose.demo.yaml up -d --wait
    if ($LASTEXITCODE -ne 0) { throw 'No fue posible iniciar PostgreSQL de demostración.' }
    $env:SPRING_CONFIG_IMPORT = 'optional:file:./.env.demo[.properties]'
    $env:SPRING_PROFILES_ACTIVE = 'dev'
    $env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:55432/myt_demo'
    $env:SPRING_DATASOURCE_USERNAME = 'myt_demo'
    $env:SPRING_DATASOURCE_PASSWORD = 'myt_demo_local_only'
    $env:JWT_SECRET = 'myt-demo-only-do-not-use-in-production-2026'
    $env:JWT_COOKIE_SECURE = 'false'
    $env:SENTRY_DSN = ''
    ./mvnw.cmd spring-boot:run
} finally {
    Pop-Location
}
