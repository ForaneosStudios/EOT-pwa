# SonarQube Cloud

El workflow `.github/workflows/sonarqube.yml` analiza el código de `src` en los
pushes y pull requests dirigidos a `develop` o `main`. Espera el resultado del
Quality Gate y falla si no se aprueba. También se puede ejecutar manualmente.

1. Importa el repositorio en SonarQube Cloud y verifica que la organización y la
   clave del proyecto coincidan con `sonar-project.properties`.
2. Configura `SONAR_TOKEN` como secret de GitHub Actions para este repositorio.
3. Si el proyecto tiene activado el análisis automático en SonarQube Cloud,
   desactívalo antes de habilitar el análisis mediante CI.
4. Si se desea bloquear merges, configura el check de SonarQube como obligatorio
   en las reglas de protección de la rama en GitHub.

Los secrets de GitHub Actions no se entregan a los pull requests de forks; esos
PR requieren un procedimiento confiable de revisión antes de ejecutar un análisis
con credenciales. Este workflow no usa `pull_request_target`.

SonarQube realiza análisis estático; el workflow separado de OWASP ZAP mantiene el
análisis dinámico. El workflow ejecuta pruebas de autenticación y componentes
React, y publica su cobertura LCOV sin excluir archivos de aplicación.
