// data.js v4 — MEI + Cuota de solidaridad 2025/2026
// Fuente: PDF oficial hacienda.gob.es "Capítulo IV Tributación Autonómica 2026"
// Cálculo correcto: dos cuotas separadas (estatal + autonómica) sobre la misma base liquidable
// v4: Añadido MEI (0.15% trabajador 2026) + cuota de solidaridad para bases > máximo
//     Base máxima SS 2026: 61.214,40€/año
//     Tipo SS trabajador: 6.35% + 0.15% MEI = 6.50%

const CCAA_NAMES = {
  supletorio: "Supletorio (estatal)",
  andalucia: "Andalucía",
  aragon: "Aragón",
  asturias: "Asturias",
  baleares: "Baleares",
  canarias: "Canarias",
  cantabria: "Cantabria",
  castilla_y_leon: "Castilla y León",
  castilla_la_mancha: "Castilla-La Mancha",
  cataluna: "Cataluña",
  extremadura: "Extremadura",
  galicia: "Galicia",
  la_rioja: "La Rioja",
  madrid: "Madrid",
  murcia: "Murcia",
  navarra: "Navarra (foral)",
  pais_vasco: "País Vasco (foral)",
  comunidad_valenciana: "C. Valenciana",
  ceuta: "Ceuta",
  melilla: "Melilla"
};

// ─── Escala estatal 2026 (fija, Art. 76 LIRPF) ───
const ESTATAL = [
  [12450, 0.095],
  [20200, 0.12],
  [35200, 0.15],
  [60000, 0.185],
  [300000, 0.225],
  [Infinity, 0.245]
];

// ─── Escalas autonómicas 2026 (PDF hacienda.gob.es) ───
// null = usa escala supletoria (= escala estatal duplicada)
const AUTONOMICAS = {
  supletorio: null,  // estatal + estatal
  andalucia: [
    [13000, 0.095], [21100, 0.12], [35200, 0.15], [60000, 0.192], [Infinity, 0.225]
  ],
  aragon: [
    [13072.50, 0.095], [21210, 0.12], [36960, 0.15], [53407.20, 0.192],
    [70000, 0.215], [90000, 0.235], [175000, 0.255], [Infinity, 0.255]
  ],
  asturias: [
    [12450, 0.09], [17707.20, 0.12], [35200, 0.14], [53407.20, 0.192],
    [70000, 0.215], [Infinity, 0.26]
  ],
  baleares: [
    [10000, 0.09], [18000, 0.1125], [30000, 0.15], [48000, 0.192],
    [70000, 0.215], [90000, 0.235], [175000, 0.255], [Infinity, 0.255]
  ],
  canarias: [
    [13748, 0.09], [19422, 0.115], [35924, 0.14], [53407, 0.192],
    [70000, 0.215], [90000, 0.235], [175000, 0.255], [Infinity, 0.255]
  ],
  cantabria: [
    [13000, 0.085], [21000, 0.11], [35200, 0.145], [60000, 0.20],
    [90000, 0.215], [175000, 0.245], [Infinity, 0.27]
  ],
  castilla_y_leon: [
    [12450, 0.09], [20200, 0.12], [35200, 0.15], [53407.20, 0.192], [Infinity, 0.215]
  ],
  castilla_la_mancha: [
    [12450, 0.095], [20200, 0.12], [35200, 0.15], [60000, 0.192],
    [90000, 0.215], [175000, 0.245], [Infinity, 0.27]
  ],
  cataluna: [
    [12500, 0.095], [22000, 0.125], [33000, 0.16], [53000, 0.19],
    [90000, 0.215], [120000, 0.235], [175000, 0.245], [Infinity, 0.255]
  ],
  extremadura: [
    [12450, 0.08], [15000, 0.10], [20200, 0.16], [24200, 0.195],
    [35200, 0.20], [45000, 0.235], [60000, 0.27], [80000, 0.29],
    [120000, 0.32], [Infinity, 0.35]
  ],
  galicia: [
    [12985.35, 0.09], [21068.60, 0.1165], [35200, 0.149], [60000, 0.184], [Infinity, 0.225]
  ],
  la_rioja: [
    [12450, 0.095], [20200, 0.12], [35200, 0.15], [60000, 0.192], [Infinity, 0.225]
  ],
  madrid: [
    [13362.22, 0.085], [19004.63, 0.107], [35425.68, 0.128], [60000, 0.179],
    [90000, 0.205], [175000, 0.235], [Infinity, 0.255]
  ],
  murcia: [
    [12450, 0.095], [20200, 0.112], [35200, 0.133], [60000, 0.192], [Infinity, 0.225]
  ],
  comunidad_valenciana: [
    [12450, 0.095], [17000, 0.115], [22000, 0.135], [30000, 0.15],
    [40000, 0.17], [50000, 0.185], [65000, 0.195], [80000, 0.215],
    [120000, 0.23], [175000, 0.27], [Infinity, 0.29]
  ],
  ceuta: null,   // usa supletorio
  melilla: null   // usa supletorio
};

// ─── Escalas forales (cuota única, sin desglose) ───
const FORALES_ESCALAS = {
  navarra: [
    [4292, 0.13], [8584, 0.22], [15634, 0.25], [24704, 0.28],
    [33984, 0.35], [52600, 0.40], [70000, 0.45], [90000, 0.47],
    [180000, 0.49], [300000, 0.50], [Infinity, 0.52]
  ],
  pais_vasco: [
    [17360, 0.23], [32060, 0.28], [47560, 0.35], [78060, 0.40],
    [108560, 0.45], [192560, 0.47], [Infinity, 0.49]
  ]
};

// For backwards compatibility: ESCALAS object for app.js scale chart
// Each entry is the "effective combined" scale (for chart display only)
const ESCALAS = {};
(function buildCombinedScales() {
  // Get all CCAA keys
  const allKeys = Object.keys(CCAA_NAMES);
  for (const key of allKeys) {
    if (key === "navarra" || key === "pais_vasco") {
      ESCALAS[key] = FORALES_ESCALAS[key];
    } else {
      // Build combined scale for chart: merge boundaries from estatal + autonómica
      const aut = AUTONOMICAS[key] || ESTATAL; // null = supletorio = estatal duplicada
      const boundaries = new Set();
      for (const [lim] of ESTATAL) if (lim !== Infinity) boundaries.add(lim);
      for (const [lim] of aut) if (lim !== Infinity) boundaries.add(lim);
      const sorted = [...boundaries].sort((a, b) => a - b);

      function getTypeAt(scales, base) {
        let prev = 0;
        for (const [lim, tipo] of scales) {
          if (base <= prev) return 0;
          if (base <= lim) return tipo;
          prev = lim;
        }
        return scales[scales.length - 1][1];
      }

      const combined = [];
      for (let i = 0; i < sorted.length; i++) {
        const lower = i === 0 ? 0.01 : sorted[i - 1] + 0.01;
        const tipoEst = getTypeAt(ESTATAL, lower);
        const tipoAut = getTypeAt(aut, lower);
        combined.push([sorted[i], +(tipoEst + tipoAut).toFixed(4)]);
      }
      // Add final bracket
      const lastLower = sorted[sorted.length - 1] + 0.01;
      const tipoEst = getTypeAt(ESTATAL, lastLower);
      const tipoAut = getTypeAt(aut, lastLower);
      combined.push([Infinity, +(tipoEst + tipoAut).toFixed(4)]);

      ESCALAS[key] = combined;
    }
  }
})();

// ─── Parámetros SS 2026 ───
// Base máxima: Orden PJC/297/2026 (5.101,20 €/mes = 61.214,40 €/año)
// Tipos SS 2026: Comunes 28,30% (23,60% emp + 4,70% tra) + Desempleo + FP
// MEI 2026: 0,80% total (0,67% emp + 0,13% tra) — Orden PJC/297/2026
// Cuota de solidaridad: RDL 8/2025 + RDL 3/2026 (tramos progresivos sobre exceso de base)
const BASE_MAX_SS = 61214.40;
const TIPO_SS_COMUNES_TRA = 0.0470;
const TIPO_SS_DESEMPLEO_TRA = 0.0155;
const TIPO_SS_FP_TRA = 0.0010;
const TIPO_MEI_TRA = 0.0013;
const TIPO_SS_TRA = TIPO_SS_COMUNES_TRA + TIPO_SS_DESEMPLEO_TRA + TIPO_SS_FP_TRA + TIPO_MEI_TRA; // 0.0648
const TIPO_SS_EMPRESARIAL_COMUNES = 0.2360;
const TIPO_SS_EMPRESARIAL_DESEMPLEO = 0.0550; // contrato indefinido
const TIPO_SS_EMPRESARIAL_FP = 0.0006;
const TIPO_MEI_EMPRESARIAL = 0.0067;
const TIPO_SS_EMPRESARIAL = TIPO_SS_EMPRESARIAL_COMUNES + TIPO_SS_EMPRESARIAL_DESEMPLEO + TIPO_SS_EMPRESARIAL_FP + TIPO_MEI_EMPRESARIAL; // 0.2983

// Cuota de solidaridad 2026 (solo para bases > BASE_MAX_SS)
// RDL 3/2026: tramos progresivos sobre el exceso de base
const SOLIDARIDAD_TRAMOS = [
  { hasta: BASE_MAX_SS * 0.10, tipo: 0.0115 },  // 0-10% exceso
  { hasta: BASE_MAX_SS * 0.50, tipo: 0.0125 },  // 10%-50% exceso
  { hasta: Infinity, tipo: 0.0146 }               // >50% exceso
];
const SOLIDARIDAD_RATIO_EMPRESARIAL = 5 / 6;
const SOLIDARIDAD_RATIO_TRABAJADOR = 1 / 6;

const GASTOS_FIJOS = 2000;
const MINIMO_EXENTO = 15876;
const TOPE_RETENCION = 0.43;

const FORALES = new Set(["navarra", "pais_vasco"]);

// ─── Parámetros por situación familiar (2025/2026) ───
const MINIMO_EDAD = { normal: 5550, senior: 6550, mayor: 7950 };
const MINIMO_HIJO = { 0: 0, 1: 2400, 2: 2700, 3: 4000, 4: 4500, 5: 5750 };
const MINIMO_ASCENDIENTE = 1150;
const MINIMO_DISCAPACIDAD = { 33: 3000, 65: 9000, 100: 12200 };

const DEFAULT_CONFIG = {
  edad: "normal",
  hijos: 0,
  ascendientes: 0,
  discapacidad: 0,
  tributacion: "individual"
};

// ─── Cálculo de cuota de solidaridad (solo bases > BASE_MAX_SS) ───
function cuotaSolidaridad(bruto) {
  if (bruto <= BASE_MAX_SS) return { total: 0, empresarial: 0, trabajador: 0 };
  const exceso = bruto - BASE_MAX_SS;
  const limite1 = BASE_MAX_SS * 0.10;
  const limite2 = BASE_MAX_SS * 0.50;
  const tramo1 = Math.min(exceso, limite1) * 0.0115;
  const tramo2 = Math.min(Math.max(0, exceso - limite1), limite2 - limite1) * 0.0125;
  const tramo3 = Math.max(0, exceso - limite2) * 0.0146;
  const total = tramo1 + tramo2 + tramo3;
  return {
    total,
    empresarial: total * SOLIDARIDAD_RATIO_EMPRESARIAL,
    trabajador: total * SOLIDARIDAD_RATIO_TRABAJADOR
  };
}

// ─── Helper: calcular cuota íntegra sobre baseLiq con una escala ───
function cuotaIntegra(baseLiq, escala) {
  let cuota = 0, prev = 0;
  for (const [lim, tipo] of escala) {
    if (baseLiq <= prev) break;
    const base = Math.min(baseLiq, lim) - prev;
    cuota += Math.max(0, base * tipo);
    prev = lim;
  }
  return cuota;
}

// ─── Helper: calcular reducción de cuota por mínimo personal ───
function cuotaMinimoPersonal(minimoTotal, baseLiq, escala) {
  let cuotaMin = 0, remaining = minimoTotal, prev = 0;
  for (const [lim, tipo] of escala) {
    if (remaining <= 0) break;
    if (baseLiq > prev) {
      const ancho = lim - prev;
      const disponible = Math.min(remaining, ancho, Math.min(baseLiq, lim) - prev);
      if (disponible > 0) {
        cuotaMin += disponible * tipo;
        remaining -= disponible;
      }
    }
    prev = lim;
  }
  return cuotaMin;
}

// ─── Cálculo real de IRPF (dos escalas separadas) ───
function calcularIRPF(bruto, ccaaKey, config = DEFAULT_CONFIG) {
  const {
    edad = "normal",
    hijos = 0,
    ascendientes = 0,
    discapacidad = 0,
    tributacion = "individual"
  } = config;

  const brutoPos = Math.max(0, bruto);

  // 1. Base cotización SS (topada) + MEI
  const baseSS = Math.min(brutoPos, BASE_MAX_SS);
  const cotSSComun = Math.round(baseSS * TIPO_SS_TRA * 100) / 100;
  
  // 2. Cuota de solidaridad (solo si bruto > BASE_MAX_SS)
  const solidaridad = cuotaSolidaridad(brutoPos);
  const cotTra = Math.round((cotSSComun + solidaridad.trabajador) * 100) / 100;
  
  // Coste empresarial (informativo, no resta del neto)
  const cotEmpresarial = Math.round((baseSS * TIPO_SS_EMPRESARIAL + solidaridad.empresarial) * 100) / 100;
  const costeLaboral = Math.round((brutoPos + cotEmpresarial) * 100) / 100;

  // 2. Rendimiento neto previo
  const rn = Math.max(0, brutoPos - cotTra);

  // 3. Reducción art. 20 LIRPF (2024+)
  let reduccion = 0;
  if (rn <= 14852) reduccion = 7302;
  else if (rn <= 17673.52) reduccion = 7302 - 1.75 * (rn - 14852);
  else if (rn <= 19747.50) reduccion = 2364.34 - 1.14 * (rn - 17673.52);
  else reduccion = 0;
  reduccion = Math.max(0, reduccion);

  // 4. Rendimiento neto
  const rneto = Math.max(0, rn - GASTOS_FIJOS - reduccion);

  // 5. Mínimo personal + familiares
  const minimoPersonal = MINIMO_EDAD[edad] || MINIMO_EDAD.normal;
  const minimoHijos = MINIMO_HIJO[Math.min(hijos, 5)] || 0;
  const minimoAscendientes = Math.min(ascendientes, 4) * MINIMO_ASCENDIENTE;
  const minimoDiscapacidad = MINIMO_DISCAPACIDAD[discapacidad] || 0;
  const minimoTotal = minimoPersonal + minimoHijos + minimoAscendientes + minimoDiscapacidad;

  // 6. Base liquidable (el mínimo personal NO se resta de la base)
  const baseLiq = Math.max(0, rneto);

  let irpfFinal, irpfEstatal, irpfAutonomica, tipoMax;

  if (FORALES.has(ccaaKey)) {
    // ─── FORALES: escala propia como cuota única ───
    const escala = FORALES_ESCALAS[ccaaKey];
    const cuota = cuotaIntegra(baseLiq, escala);
    const cuotaMin = cuotaMinimoPersonal(minimoTotal, baseLiq, escala);
    const cuotaLiq = Math.max(0, cuota - cuotaMin);

    let dedSMI = 0;
    if (brutoPos <= 16576) dedSMI = 340;
    else if (brutoPos <= 18276) dedSMI = Math.max(0, 340 - 0.20 * (brutoPos - 16576));

    const cuotaResult = Math.max(0, cuotaLiq - dedSMI);
    const limiteRet = Math.max(0, (brutoPos - MINIMO_EXENTO) * TOPE_RETENCION);
    irpfFinal = Math.min(cuotaResult, limiteRet);
    irpfEstatal = 0;
    irpfAutonomica = irpfFinal;

    // tipoMax = último tipo de la escala foral
    tipoMax = escala[escala.length - 1][1];

  } else {
    // ─── RÉGIMEN COMÚN: dos cuotas separadas ───
    const escalaAut = AUTONOMICAS[ccaaKey] || ESTATAL; // null = supletorio

    // Cuota íntegra estatal
    const cuotaEst = cuotaIntegra(baseLiq, ESTATAL);
    // Cuota íntegra autonómica
    const cuotaAut = cuotaIntegra(baseLiq, escalaAut);

    // Reducción por mínimo personal (separada para estatal y autonómica)
    const minEst = cuotaMinimoPersonal(minimoTotal, baseLiq, ESTATAL);
    const minAut = cuotaMinimoPersonal(minimoTotal, baseLiq, escalaAut);

    const cuotaLiqEst = Math.max(0, cuotaEst - minEst);
    const cuotaLiqAut = Math.max(0, cuotaAut - minAut);

    // Deducción SMI (se reparte proporcionalmente entre estatal y autonómica)
    let dedSMI = 0;
    if (brutoPos <= 16576) dedSMI = 340;
    else if (brutoPos <= 18276) dedSMI = Math.max(0, 340 - 0.20 * (brutoPos - 16576));

    const cuotaLiqTotal = cuotaLiqEst + cuotaLiqAut;
    const ratioEst = cuotaLiqTotal > 0 ? cuotaLiqEst / cuotaLiqTotal : 0.5;
    const dedEst = dedSMI * ratioEst;
    const dedAut = dedSMI * (1 - ratioEst);

    const cuotaResEst = Math.max(0, cuotaLiqEst - dedEst);
    const cuotaResAut = Math.max(0, cuotaLiqAut - dedAut);

    // Límite de retención (43% del rendimiento)
    const limiteRet = Math.max(0, (brutoPos - MINIMO_EXENTO) * TOPE_RETENCION);

    irpfEstatal = Math.min(cuotaResEst, limiteRet);
    irpfAutonomica = Math.min(cuotaResAut, Math.max(0, limiteRet - irpfEstatal));
    irpfFinal = irpfEstatal + irpfAutonomica;
    if (irpfFinal > Math.min(cuotaResEst + cuotaResAut, limiteRet)) {
      irpfFinal = Math.min(cuotaResEst + cuotaResAut, limiteRet);
      irpfEstatal = irpfFinal * ratioEst;
      irpfAutonomica = irpfFinal - irpfEstatal;
    }

    // tipoMax = máximo entre tipo máximo estatal y autonómico combinado
    const tipoMaxEst = ESTATAL[ESTATAL.length - 1][1];
    const tipoMaxAut = escalaAut[escalaAut.length - 1][1];
    tipoMax = tipoMaxEst + tipoMaxAut;
  }

  const neto = brutoPos - cotTra - irpfFinal;
  const tipoEfectivo = brutoPos > 0 ? (irpfFinal / brutoPos * 100) : 0;

  return {
    bruto: brutoPos,
    baseSS: Math.round(baseSS),
    cotSS: Math.round(cotSSComun),
    cotSolidaridad: +solidaridad.trabajador.toFixed(2),
    cotTra: Math.round(cotTra),
    cotEmpresarial: Math.round(cotEmpresarial),
    costeLaboral: Math.round(costeLaboral),
    rn: Math.round(rn),
    reduccion: Math.round(reduccion),
    rneto: Math.round(rneto),
    baseLiq: Math.round(baseLiq),
    cuota: Math.round(irpfFinal),
    minimoAplicado: Math.round(minimoTotal),
    cuotaLiquida: Math.round(irpfFinal),
    dedSMI: 0,
    irpfFinal: Math.round(irpfFinal),
    irpfEstatal: Math.round(irpfEstatal),
    irpfAutonomica: Math.round(irpfAutonomica),
    neto: Math.round(neto),
    tipoEfectivo: +tipoEfectivo.toFixed(2),
    tipoMax: +(tipoMax * 100).toFixed(1),
    _minimoTotal: Math.round(minimoTotal)
  };
}

// Formatear euros
function fmt(n) {
  return n.toLocaleString("es-ES") + " €";
}
function fmtPct(n) {
  return n.toFixed(1) + "%";
}
function fmtDelta(n) {
  const sign = n >= 0 ? "+" : "";
  return sign + n.toLocaleString("es-ES") + " €";
}