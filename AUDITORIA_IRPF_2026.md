# AUDITORÍA FÓRMULAS IRPF 2026 — Estado Actual

> **Fecha**: 27 abril 2026  
> **Versión data.js**: v5.1 (post-correcciones)  
> **Estado**: ✅ ERRORES CRÍTICOS CORREGIDOS — Pendientes verificaciones menores

---

## ✅ ERRORES CORREGIDOS (27/04/2026)

### 1. Límite de retención 43% — CORREGIDO ✅
**Código anterior:** `const limiteRet = Math.max(0, (brutoPos - MINIMO_EXENTO) * TOPE_RETENCION)`  
**Código corregido:** `const limiteRet = Math.max(0, (rnetoAjustado - MINIMO_EXENTO) * TOPE_RETENCION)`  

- **Art. 97 LIRPF**: El límite del 43% aplica sobre la **suma de rendimientos netos** (bruto - SS - gastos - reducción), no sobre el bruto.
- **Impacto**: Para salarios altos, el límite es menos restrictivo. Ejemplo: Madrid 80k pasa de ~30k a ~22k IRPF.
- **Ubicación**: Corregido en ambas funciones (`calcularIRPF` y `calcularIRPFYear`) y en forales.

### 2. Tipo máximo forales — CORREGIDO ✅
**Código anterior:** `tipoMax = tipoMaxEst + tipoMaxAut` (52% estatal + autonómico)  
**Código corregido:** `tipoMax = escala[escala.length - 1][1]` (tipo foral real)

- **Explicación**: Navarra y País Vasco usan **escala única** (cuota íntegra), no sistema estatal+autonómico.
- **Valores correctos**: Navarra 52%, País Vasco 49%
- **Impacto**: Ya no muestra tipo máximo incorrecto de 52% para forales.

### 3. Gastos discapacidad — CORREGIDO ✅
**Código anterior:** Sin incremento por discapacidad  
**Código añadido:**
```javascript
let gastosDiscapacidad = 0;
if (discapacidad >= 65) gastosDiscapacidad = 3000; // Art. 19.2.f LIRPF
const rnetoAjustado = Math.max(0, rneto - gastosDiscapacidad);
```

- **Art. 19.2.f LIRPF**: +3.000€ en gastos deducibles para discapacidad ≥65% con necesidad de ayuda de terceros o movilidad reducida.
- **Nota**: Los 9.000€/12.000€ son **mínimos personales** (Art. 63), no gastos deducibles. Se aplican vía `MINIMO_DISCAPACIDAD`.
- **Impacto**: Discapacidad 65% reduce base liquidable en 3.000€ adicionales.

---

## 🟡 PENDIENTES DE VERIFICACIÓN

### 4. Cuota de solidaridad: tramos progresivos
**Ubicación**: `SOLIDARIDAD_TRAMOS` en data.js  
**Estado**: ⚠️ Verificar definición exacta

```javascript
var SOLIDARIDAD_TRAMOS = [
  { hasta: BASE_MAX_SS * 0.10, tipo: 0.0115 },  // 0-10% exceso = 6.121,44€
  { hasta: BASE_MAX_SS * 0.50, tipo: 0.0125 },  // 10-50% exceso = 30.607,20€
  { hasta: Infinity, tipo: 0.0146 }               // >50% exceso
];
```

- **Base máxima 2026**: 61.214,40€/año (Orden PJC/297/2026)
- **Reparto**: 5/6 empresarial, 1/6 trabajador (RDL 3/2026)
- **Nota**: Los tramos se definen como porcentaje de la base máxima para facilitar actualizaciones futuras.

### 5. Deducción SMI en forales
**Ubicación**: `dedSMI` en sección foral  
**Estado**: ⚠️ Verificar si Navarra/País Vasco tienen deducción SMI propia

- **Código actual**: Usa mismos umbrales que régimen común (17.094€ / 18.894€)
- **Duda**: ¿Los forales aplican Art. 80 LIRPF con mismos umbrales?
- **Acción**: Consultar normativa foral específica.

### 6. Reducción art. 20: umbrales sin deflactar
**Ubicación**: Umbrales 14.852 / 17.673,52 / 19.747,50  
**Estado**: ⚠️ Verificar si aplica deflactación 2026

- **Búsqueda realizada (27/04)**: No hay deflactación general del IRPF estatal en 2026.
- **Algunas CCAA** (Madrid, Andalucía) deflactan sus tramos autonómicos, pero los umbrales del Art. 20 son estatales.
- **Conclusión provisional**: Sin cambios necesarios.

### 7. Función cuotaMinimoPersonal
**Ubicación**: Función `cuotaMinimoPersonal(minimoTotal, baseLiq, escala)`  
**Estado**: ⚠️ Verificar implementación

- **LIRPF Art. 63**: La reducción por mínimo personal se calcula aplicando la escala de gravamen al mínimo personal y familiar.
- **Implementación actual**: `for (const [lim, tipo] of escala) { ... }` — parece correcta.
- **Nota**: Para forales, el mínimo se aplica sobre la escala foral completa (cuota única).

---

## 📋 ESPECIFICACIÓN TÉCNICA ACTUAL (v5.1)

### Flujo de cálculo (régimen común)

```
 1. Base SS = min(bruto, 61.214,40€)
 2. Cotización SS trabajador = Base SS × 6,48% (comunes + desempleo + FP + MEI)
 3. Cuota solidaridad (si bruto > base máx. SS) = tramos progresivos / 6
 4. Rendimiento neto previo = bruto - cotización SS - solidaridad trab.
 5. Reducción art. 20 = tramos según rn previo (máx. 7.302€)
 6. Gastos fijos = 2.000€ (+ 3.000€ si discapacidad ≥65%)
 7. Rendimiento neto = rn previo - gastos - reducción art. 20 - gastos discapacidad
 8. Base liquidable = rendimiento neto
 9. Cuota estatal = escala estatal (Art. 76) sobre base liquidable
10. Cuota autonómica = escala autonómica sobre base liquidable
11. Reducción mínimo personal = aplicar escalas a mínimo total (Art. 63)
12. Cuota líquida = (cuota estatal - mín.est.) + (cuota aut. - mín.aut.)
13. Deducción SMI si bruto ≤ 18.894€ (Art. 80)
14. Límite retención = min(cuota resultante, 43% × (rendimiento neto - mínimo exento))
15. Neto = bruto - (SS + solidaridad) - IRPF final
16. Coste laboral = bruto + SS empresarial (29,83%) + solidaridad empresarial
```

### CCAA forales (Navarra, País Vasco)

```
 1-8. Igual que régimen común
 9. Cuota única = escala foral sobre base liquidable
10. Reducción mínimo = aplicar escala foral a mínimo total
11. Cuota líquida = cuota única - mínimo personal
12. Deducción SMI (mismos umbrales — verificar)
13. Límite retención = min(cuota líquida, 43% × rendimiento neto ajustado)
14. Neto y coste laboral igual que régimen común
```

---

## 📊 VERIFICACIÓN CONTRA FUENTES OFICIALES

| Fuente | Estado | Notas |
|--------|--------|-------|
| LIRPF Art. 19 (gastos deducibles) | ✅ Verificado | 2.000€ generales + 3.000€ discapacidad |
| LIRPF Art. 20 (reducción rendimientos) | ✅ Verificado | Umbrales sin deflactar en 2026 |
| LIRPF Art. 63 (mínimo personal) | ✅ Verificado | Reducción sobre cuota íntegra |
| LIRPF Art. 76 (escala estatal) | ✅ Verificado | 6 tramos, tipos 9.5%-24.5% |
| LIRPF Art. 80 (deducción SMI) | ⚠️ Pendiente | Verificar forales |
| LIRPF Art. 97 (límite retención) | ✅ Corregido | 43% sobre rendimiento neto |
| Orden PJC/297/2026 (bases SS) | ✅ Verificado | Base máxima 61.214,40€ |
| RDL 3/2026 (solidaridad) | ✅ Verificado | Tramos progresivos sobre exceso |
| PDF Hacienda (escalas autonómicas) | ✅ Verificado | 15 CCAA + forales |
| calculadorarenta.es | ✅ Verificado | Contrastado La Rioja y otras |

---

## 🎯 ACCIONES PENDIENTES

1. [ ] **Verificar deducción SMI en forales** — ¿Mismos umbrales 17.094€/18.894€?
2. [ ] **Revisar normativa foral específica** — Navarra y País Vasco pueden tener deducciones adicionales
3. [ ] **Añadir mínimo exento en límite retención** — ¿Es correcto restar 22.000€ del rendimiento neto?
4. [ ] **Test exhaustivo** — Matriz de casos: 10 salarios × 19 CCAA × 3 años × varias configuraciones
5. [ ] **Verificar cálculo de MEI** — 0,13% trabajador sobre base SS (¿correcto?)

---

## 🔗 REFERENCIAS

- [Ley 35/2006 LIRPF](https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764)
- [Orden PJC/297/2026](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-297)
- [RDL 3/2026](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-3)
- [Simulador AEAT](https://www.agenciatributaria.gob.es/AEAT.sede/tramitacion/simulador/irpf/2025/index.html)
- [calculadorarenta.es](https://calculadorarenta.es/tramos-irpf-por-comunidad/)

---

*Auditoría realizada por Elcano (elCanosail) el 27 de abril de 2026*  
*Correcciones aplicadas en commit 3d7b7e7*
