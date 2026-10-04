# Política de seguridad

## Versiones soportadas

Se aceptan reportes de seguridad para la versión más reciente desplegada desde la rama `main`. Las versiones anteriores no reciben correcciones por separado.

## Revisiones automatizadas

GitHub Actions ejecuta CodeQL y `npm audit` al recibir pushes y pull requests, y vuelve a revisar las dependencias semanalmente. En cada pull request, Dependency Review compara los cambios de dependencias con los avisos conocidos y publica un resumen; falla si encuentra una vulnerabilidad moderada o superior. Los hallazgos de CodeQL se publican en la pestaña **Security** del repositorio; `npm audit` falla si encuentra vulnerabilidades de severidad moderada o superior.

## Security Advisories

Las vulnerabilidades confirmadas se gestionarán mediante GitHub Security Advisories. Los detalles se mantendrán privados durante la investigación y la coordinación de una corrección o mitigación; después podrán publicarse como un aviso de seguridad.

## Cómo reportar una vulnerabilidad

Por favor, no publiques vulnerabilidades en Issues ni en discusiones públicas.

Envía el reporte de forma privada mediante [GitHub Private Vulnerability Reporting](https://github.com/leolplex/serviceReminder/security/advisories/new). Incluye, si es posible:

- Una descripción del problema y su posible impacto.
- Los pasos para reproducirlo o una prueba de concepto segura.
- Las rutas, componentes o versiones afectados.
- Una posible mitigación, si la conoces.

El equipo del repositorio revisará el reporte, coordinará contigo los detalles y la divulgación, y procurará mantenerte informado sobre el avance. Evita acceder, modificar o divulgar datos de otras personas durante la investigación.

## Alcance

Esta política cubre el código fuente de este repositorio y la aplicación publicada en GitHub Pages. No autoriza pruebas contra servicios externos, infraestructura de terceros ni cuentas o datos que no te pertenezcan.
