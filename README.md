# 💶 IRPF por Comunidad Autónoma — Calculadora Interactiva

![Web](https://img.shields.io/badge/web-live-success.svg)
![Version](https://img.shields.io/badge/version-v4-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Calculadora web que compara el salario neto en las **19 comunidades autónomas** españolas, con escalas IRPF 2026 separadas (estatal + autonómica), MEI, cuota de solidaridad y cálculo exacto según la LIRPF.

Basada en el trabajo de [Jon González](https://github.com/jongonzlz/Calculadora-de-Salarios-y-Progresividad-en-Fr-o), con aportaciones propias significativas.

## 🌐 Demo

**[elcanosail.github.io/Calculadora-de-Salarios-y-Progresividad-en-Fr-o](https://elcanosail.github.io/Calculadora-de-Salarios-y-Progresividad-en-Fr-o/)**

## ✨ Funcionalidades

### Interfaz interactiva
- **Slider de salario bruto** (10.000€ – 500.000€) con input numérico sincronizado
- **Selector de edad** (menos de 65 / 65-75 / más de 75) con mínimos personal actualizados
- **Selector de hijos** (0 a 5+) con deducciones por descendientes
- **Selector de ascendientes** (>65 años)
- **Texto dinámico** que refleja la configuración del contribuyente, SS y MEI

### Visualización
- **Gráfico de barras** ordenado de mayor a menor neto, con eje truncado para amplificar diferencias
- **Tabla comparativa** completa: neto, IRPF, tipo efectivo, tipo marginal máximo, coste laboral, diferencia vs supletorio
- **Gráfico de escalas** interactivo (SVG): selecciona CCAA y compara tramos marginales estatal/autonómico/combinado
- **Comparativa anual** 2024 / 2025 / 2026 — evolución del neto con cambios legislativos
- **Tabla de verificación AEAT** — 5 casos de referencia con contraste automático

### Datos y cálculo
- **Escalas IRPF 2026 separadas**: cuota íntegra estatal + cuota íntegra autonómica (régimen común) o escala foral única (Navarra, País Vasco)
- **19 CCAA**: 17 de régimen común + 2 forales, con escalas propias del PDF oficial de Hacienda
- **MEI** (Mecanismo de Equidad Intergeneracional): 0,13% trabajador + 0,67% empresarial (Orden PJC/297/2026)
- **Cuota de solidaridad** (nueva 2025/2026): tramos progresivos sobre bases > base máxima SS (RDL 8/2025)
- **Base máxima SS 2026**: 61.214,40€ (proyección RDL 8/2025)
- **Coste laboral completo**: bruto + SS empresarial + MEI empresarial + cuota solidaridad empresarial
- **Cálculo exacto**: reducción art. 20 LIRPF, mínimo personal y familiar según Art. 63, gastos fijos (2.000€), deducción SMI (Art. 80), límite de retención 43% (Art. 101)
- **CSV descargable** con todas las escalas (`escalas.csv`)

### Páginas adicionales
- **[Fórmulas del cálculo](https://elcanosail.github.io/Calculadora-de-Salarios-y-Progresividad-en-Fr-o/formulas.html)** — 9 secciones: parámetros legales, MEI, solidaridad, cálculo paso a paso, desglose estatal/autonómico, 4 ejemplos de verificación, escalas resumen, changelog v1→v4
- **[Fuentes y referencias](https://elcanosail.github.io/Calculadora-de-Salarios-y-Progresividad-en-Fr-o/fuentes.html)** — PDF oficial de Hacienda, Orden HFP/886/2025, simulador AEAT, verificación cruzada con 5 ejemplos, instrucciones para reportar errores

## 🔧 Aportaciones respecto al repo original

Este fork parte del excelente trabajo de Jon González (auditoría Python → Excel) y añade:

| Aportación | Versión | Descripción |
|-----------|---------|-------------|
| **Web app interactiva** | v1 | De script Python a calculadora web con HTML/CSS/JS puro (sin dependencias) |
| **Escalas separadas** | v3 | Cálculo con dos cuotas separadas (estatal + autonómica) en vez de escala combinada |
| **19 CCAA** | v1 | Las 17 de régimen común + Navarra y País Vasco con escalas forales propias |
| **Configuración de contribuyente** | v1 | Edad, hijos, ascendientes — con mínimos personal actualizados (LIRPF 2024+) |
| **Mínimo según Art. 63** | v2 | Reducción de cuota sobre tipos marginales reales, no tipo fijo |
| **Gráfico de escalas (SVG)** | v1 | Visualización interactiva de tramos marginales por CCAA |
| **CSV descargable** | v2 | 127+ filas con todas las escalas para auditoría |
| **Página de fórmulas** | v2 | Especificación legal con referencias al BOE y ejemplos de verificación |
| **Página de fuentes** | v2 | PDF oficial, AEAT, verificación cruzada |
| **MEI + Cuota de solidaridad** | v4 | Nuevas cotizaciones 2025/2026, base máx. SS 61.214€ |
| **Coste laboral completo** | v4 | SS empresarial + MEI empresarial + solidaridad empresarial |
| **Comparativa anual** | v4 | 2024 → 2025 → 2026 con desglose de cambios |
| **Verificación AEAT** | v4 | 5 casos de referencia con contraste inline |
| **Responsive móvil** | v1 | Tablas con scroll, pills scrollables, layout adaptativo |

## 🏗️ Estructura del proyecto

```
docs/
├── index.html      # Calculadora principal
├── data.js         # Escalas IRPF 2026 (estatal + autonómicas + forales) + datos anuales
├── app.js          # Lógica de cálculo y renderizado
├── style.css       # Estilos + responsive
├── formulas.html   # Especificación del cálculo con referencias legales (v4)
├── fuentes.html    # Fuentes, referencias y verificación cruzada
└── escalas.csv     # CSV descargable con todas las escalas
```

## 🚀 Uso local

```bash
git clone https://github.com/elCanosail/Calculadora-de-Salarios-y-Progresividad-en-Fr-o.git
cd Calculadora-de-Salarios-y-Progresividad-en-Fr-o/docs
# Abrir docs/index.html en el navegador (no necesita servidor)
```

Para desarrollo con live reload:
```bash
npx serve docs
```

## 📐 Cálculo (régimen común, v4)

```
 1. Base SS = min(bruto, 61.214,40€)
 2. Cotización SS = Base SS × 6,35%
 3. MEI trabajador = Base SS × 0,13%
 4. Cuota solidaridad (si bruto > base máx. SS) = tramos progresivos / 6
 5. Rendimiento neto previo = bruto - cotización SS - MEI - solidaridad trab.
 6. Reducción art. 20 = tramos según rn previo (máx. 7.302€)
 7. Rendimiento neto = rn previo - 2.000€ gastos - reducción art. 20
 8. Base liquidable = rendimiento neto
 9. Cuota estatal = aplicar escala estatal (Art. 76 LIRPF) a base liquidable
10. Cuota autonómica = aplicar escala autonómica (PDF Hacienda 2026) a base liquidable
11. Reducción mínimo personal = aplicar escala a mínimo total (Art. 63 LIRPF)
12. Cuota líquida = (cuota estatal - mín.est.) + (cuota aut. - mín.aut.)
13. Deducción SMI si bruto ≤ 18.276€ (Art. 80 LIRPF)
14. Límite retención = min(cuota resultante, 43% × rendimiento)
15. Neto = bruto - (SS + MEI + solidaridad) - IRPF final
16. Coste laboral = bruto + SS empresarial + MEI empresarial + solidaridad empresarial
```

**CCAA forales (Navarra, País Vasco):** Escala única propia, sin desglose estatal/autonómico.

## 🔄 Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| v1.0 | 2026-04-01 | Versión inicial basada en Jon González |
| v2.0 | 2026-04-24 | Fix: mínimo según Art. 63 + escalas separadas (PDF Hacienda) |
| v3.0 | 2026-04-24 | Escalas corregidas: La Rioja propia, tipos máx corregidos |
| v3.1 | 2026-04-25 | Fix: Aragón/Baleares/Canarias tipo máx 0.255 |
| **v4** | **2026-04-26** | **MEI + cuota solidaridad + base máx SS 61.214€ + coste laboral + comparativa anual + verificación AEAT** |

## ⚖️ Aviso legal

Calculadora con fines educativos y orientativos. Los resultados no sustituyen el asesoramiento de un profesional fiscal. Las escalas autonómicas proceden del PDF oficial del Ministerio de Hacienda ("Capítulo IV Tributación Autonómica 2026").

Agradecimiento especial a [Francisco de la Torre](https://x.com/frdelatorre) (@frdelatorre), Inspector de Hacienda del Estado, por la corrección de las escalas autonómicas.

## 📝 Licencia

MIT — Ver [LICENSE](LICENSE).

---

*Fork de [jongonzlz/Calculadora-de-Salarios-y-Progresividad-en-Fr-o](https://github.com/jongonzlz/Calculadora-de-Salarios-y-Progresividad-en-Fr-o) con aportaciones propias.*