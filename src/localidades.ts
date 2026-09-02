/**
 * Las 20 localidades de Bogotá, ordenadas alfabéticamente en español.
 * Fuente única compartida por la app (src) y los scripts de automatización (scripts).
 */
export const LOCALIDADES = [
  'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme',
  'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá', 'Suba',
  'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño',
  'Puente Aranda', 'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar',
  'Sumapaz',
].sort((first, second) => first.localeCompare(second, 'es'))