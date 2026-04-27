# AUDITORÍA FÓRMULAS IRPF 2026 — Hallazgos

## 🔴 ERRORES CRÍTICOS

### 1. Límite de retención: base incorrecta
**Línea ~500:** `const limiteRet = Math.max(0, (brutoPos - MINIMO_EXENTO) * TOPE_RETENCION)`

- **Problema**: Aplica el 43% sobre el **bruto**, no sobre el rendimiento neto.
- **Correcto**: El límite del art. 97 LIRPF es el **43% de la suma de rendimientos netos del trabajo y actividades económicas**.
- **Impacto**: Para salarios altos, el límite es mucho más restrictivo de lo que debería.

### 2. Cuota de solidaridad: tramos mal definidos
**Línea ~270:** `SOLIDARIDAD_TRAMOS`

- **Problema**: Los tramos usan porcentajes de la base máxima (0.10, 0.50) pero deberían ser valores absolutos.
- **Base máxima 2026**: 61.214,40€ → límite 1 = 6.121,44€, límite 2 = 30.607,20€
- **Impacto**: Cálculo correcto matemáticamente, pero la definición es confusa.

### 3. Deducción SMI aplicada dos veces en forales
**Líneas ~452 y ~488:** La deducción SMI se calcula igual para forales y régimen común.

- **Problema**: En forales la deducción SMI puede tener cuantías diferentes.
- **Verificación necesaria**: ¿Navarra y País Vasco tienen deducción SMI propia?

### 4. Reducción art. 20: umbrales sin deflactar
**Líneas ~424-427:** `rn <= 14852`, `rn <= 17673.52`, `rn <= 19747.50`

- **Problema**: Estos umbrales son de 2024, sin deflactar.
- **Deflactación 2026**: +2% → nuevos umbrales deberían ser ~15.149, ~18.026, ~20.142
- **Impacto**: Los trabajadores con salarios entre 14.852-15.149€ no reciben la reducción completa.

### 5. Mínimo personal aplicado incorrectamente
**Línea ~446:** `cuotaMinimoPersonal(minimoTotal, baseLiq, escala)`

- **Problema**: La reducción por mínimo personal se aplica sobre la **cuota íntegra**, no sobre la base liquidable.
- **Correcto**: Se calcula como: `suma(minimo_i × tipo_i)` donde `tipo_i` es el tipo del tramo i.
- **Impacto**: La función actual puede estar sobreestimando la reducción.

### 6. Tipo máximo: incluye forales incorrectamente
**Línea ~520:** `tipoMax = tipoMaxEst + tipoMaxAut`

- **Problema**: Para forales, `tipoMax` debería ser el tipo de la escala foral, no estatal+autonómica.
- **Impacto**: Muestra tipo máximo incorrecto para Navarra y País Vasco.

### 7. Gastos fijos: sin incremento discapacidad
**Línea ~279:** `GASTOS_FIJOS = 2000`

- **Problema**: Los gastos fijos generales son 2.000€, pero:
  - Discapacidad + movilidad reducida: **hasta 9.750€** (no 7.750€)
  - Movilidad geográfica: **4.000€** adicionales
- **Impacto**: Subestima gastos deducibles para discapacitados.

## 🟡 ADVERTENCIAS

### 8. Base liquidable = rendimiento neto
**Línea ~448:** `const baseLiq = Math.max(0, rneto)`

- **Simplificación**: Asume que no hay otros rendimientos (capital, alquiler, etc.)
- **Correcto para nómina**: ✅ Solo calcula IRPF sobre rendimiento del trabajo.

### 9. Reducción art. 20 sobre rn, no rneto
**Verificación**: La reducción se aplica sobre `rn` (rendimiento neto previo), no `rneto`.
- **Código**: ✅ Correcto — `rn = bruto - cotTra`, luego `rneto = rn - GASTOS_FIJOS - reduccion`.

### 10. Cuota solidaridad no restada de rendimiento neto
**Verificación**: La cuota de solidaridad del trabajador se suma a `cotTra`.
- **Código**: ✅ Correcto — `cotTra = cotSSComun + solidaridad.trabajador`.

## FUENTES OFICIALES CONSULTADAS

- [x] LIRPF Art. 20 (reducción rendimientos trabajo)
- [x] LIRPF Art. 97 (límite retención 43%)
- [x] Orden PJC/297/2026 (bases cotización SS 2026)
- [x] RDL 3/2026 (cuota solidaridad)
- [x] calculadorarenta.es (escalas autonómicas 2026)
- [x] INE IPC base 2021

## ACCIONES RECOMENDADAS

1. [ ] Corregir límite retención: usar rendimiento neto, no bruto
2. [ ] Deflactar umbrales art. 20: 14852→15149, 17673.52→18026, 19747.50→20142
3. [ ] Verificar deducción SMI en forales
4. [ ] Revisar función cuotaMinimoPersonal
5. [ ] Añadir gastos discapacidad hasta 9.750€
6. [ ] Corregir tipoMax para forales
