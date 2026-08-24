# Nority

Aplicación para consultar cortes de agua del Acueducto de Bogotá según una dirección guardada.

## Funciones

- Consulta la programación semanal oficial.
- Filtra los avisos por localidad y dirección.
- Envía un correo al activar la suscripción y cuando corresponde un aviso.
- Guarda los datos y puede instalarse como PWA.

## Desarrollo

```bash
npm install
npm run dev
```

## Validación

```bash
npm test
npm run build
npm run lint
```

## Producción

La aplicación está publicada en:

https://leolplex.github.io/serviceReminder/

Los despliegues se ejecutan automáticamente desde GitHub Actions al actualizar `main`.

## Fuente de datos

La información proviene del boletín semanal oficial del Acueducto de Bogotá.

https://www.acueducto.com.co/wps/portal/EAB2/Home/atencion-al-usuario/programacion_cortes/cortes+de+la+semana
