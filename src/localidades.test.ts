import { describe, expect, it } from 'vitest'
import { noticeAppliesToAddress, type OutageNotice } from './outageLogic'

const WEEK_START = '2026-08-31'

const caseFor = (localidad: string, addressRange: string, inAddress: string, outAddress: string) => ({
  localidad,
  notice: { localidad, date: '2026-09-02', addressRange } as OutageNotice,
  inAddress,
  outAddress,
})

const casos: ReturnType<typeof caseFor>[] = [
  // Avisos reales del snapshot public/outages.json (semana del 2026-08-31)
  caseFor('Usaquén', 'De la Calle 163A a la Calle 170, entre la Carrera 45 a la Carrera 15', 'Cra 40 # 165-20', 'Cra 10 # 165-20'),
  caseFor('Chapinero', 'De la Calle 45 a la Calle 85, entre la Carrera 7 a la Carrera 24', 'Cra 13 # 63-10', 'Cra 30 # 63-10'),
  caseFor('Santa Fe', 'De la Calle 19 a la Calle 54 Sur, entre la Carrera 13 a la Carrera 25', 'Calle 30 # 18-10', 'Calle 60 # 18-10'),
  caseFor('San Cristóbal', 'De la Calle 68 Sur a la Diagonal 69 Sur, entre la Carrera 45B a la Transversal 70D', 'Transversal 60 # 68-10 Sur', 'Calle 80 Sur # 60-10'),
  caseFor('Usme', 'De la Diagonal 97 Sur a la Calle 115 Sur, entre la Carrera 8 Este a la Carrera 13 Este', 'Dg. 105 Sur # 10-20 Este', 'Dg. 120 Sur # 10-20 Este'),
  caseFor('Tunjuelito', 'De la Calle 40 Sur a la Calle 60 Sur, entre la Carrera 14 a la Carrera 27', 'Calle 50 Sur # 19-40', 'Calle 70 Sur # 19-40'),
  caseFor('Bosa', 'De la Calle 50 Sur a la Calle 90 Sur, entre la Carrera 78 a la Carrera 106', 'Calle 65 Sur # 85-30', 'Calle 95 Sur # 85-30'),
  caseFor('Kennedy', 'De la Avenida Calle 26 Sur a la Avenida Carrera 72, entre la Transversal 72N a la Transversal 68F', 'AC 26 Sur # 71-40', 'AC 30 Sur # 71-40'),
  caseFor('Fontibón', 'De la Calle 13 a la Calle 26, entre la Carrera 80 a la Carrera 104', 'Calle 18 # 94-50', 'Calle 40 # 94-50'),
  caseFor('Engativá', 'De la Calle 26 a la Calle 63, entre la Carrera 68 a la Carrera 72', 'Carrera 71#49A-31', 'Carrera 75#49A-31'),
  caseFor('Suba', 'De la Carrera 85 a la Carrera 88D, entre la Calle 129 a la Calle 131C', 'Calle 130 # 86-20', 'Calle 135 # 86-20'),
  caseFor('Barrios Unidos', 'De la Calle 53 Bis a la Calle 68, entre la Carrera 24 a la Carrera 30', 'Calle 60 # 27-40', 'Calle 70 # 27-40'),
  caseFor('Teusaquillo', 'De la Calle 26 a la Calle 63, entre la Carrera 13 a la Carrera 40', 'AC 34 # 26-18', 'AC 70 # 26-18'),
  caseFor('Los Mártires', 'De la Carrera 27 a la Avenida Carrera 30, entre la Calle 8 Sur a la Calle 12A Sur', 'AK 30 # 10-15 Sur', 'AK 35 # 10-15 Sur'),
  caseFor('Antonio Nariño', 'De la Calle 13 Sur a la Calle 22 Sur, entre la Carrera 14 a la Carrera 24G', 'Calle 17 Sur # 20-30', 'Calle 30 Sur # 20-30'),
  caseFor('Puente Aranda', 'De la Calle 1 Sur a la Calle 22 Sur, entre la Carrera 24 a la Carrera 50', 'Av. Calle 13 # 34-15', 'Av. Calle 26 # 34-15'),
  caseFor('La Candelaria', 'De la Calle 18 a la Calle 12D, entre la Carrera 5 Este a la Carrera 1A', 'Cl 15 Este # 4-30', 'Cl 20 Este # 4-30'),
  caseFor('Rafael Uribe Uribe', 'De la Calle 30A Sur a la Calle 51 Sur, entre la Carrera 5A a la Carrera 13K', 'Cra. 10 # 40-15 Sur', 'Cra. 20 # 40-15 Sur'),
  caseFor('Ciudad Bolívar', 'De la Calle 67C Sur a la Calle 64D Sur, entre la Carrera 18L a la Carrera 19 Bis', 'Calle 65 Sur # 18L-30', 'Calle 65 Sur # 25-30'),
  caseFor('Sumapaz', 'De la Calle 1 Sur a la Calle 20 Sur, entre la Carrera 1 Este a la Carrera 10 Este', 'Calle 10 Sur # 5-20 Este', 'Calle 30 Sur # 5-20 Este'),
]

describe('avisos por localidad (20 localidades de Bogotá)', () => {
  it.each(casos.map(({ localidad }) => [localidad]))('soporta la nomenclatura de %s', (localidad) => {
    const caso = casos.find((item) => item.localidad === localidad)!
    expect(noticeAppliesToAddress(caso.notice, caso.localidad, WEEK_START, caso.inAddress)).toBe(true)
    expect(noticeAppliesToAddress(caso.notice, caso.localidad, WEEK_START, caso.outAddress)).toBe(false)
  })

  it('no aplica un aviso de otra localidad aunque la dirección caiga en el rango', () => {
    const caso = casos.find((item) => item.localidad === 'Engativá')!
    expect(noticeAppliesToAddress(caso.notice, 'Kennedy', WEEK_START, caso.inAddress)).toBe(false)
  })

  it('rechaza una dirección en la que no se distingue el eje de la vía', () => {
    const caso = casos.find((item) => item.localidad === 'Engativá')!
    expect(noticeAppliesToAddress(caso.notice, 'Engativá', WEEK_START, 'Casa 123 # 45-67')).toBe(false)
  })
})