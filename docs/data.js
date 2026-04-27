// data.js v5 — IPC, Coste Empresa, Radiografía visual
// Fuente: PDF oficial hacienda.gob.es "Capítulo IV Tributación Autonómica 2026"
// Cálculo correcto: dos cuotas separadas (estatal + autonómica) sobre la misma base liquidable
// v5: Añadido IPC INE base 2021 + cálculo coste empresa + desglose visual
//     Base máxima SS 2026: 61.214,40€/año
//     Tipo SS trabajador: 4.70% comunes + 1.55% desempleo + 0.10% FP + 0.15% MEI = 6.50%
//     Tipo SS empresa: 23.60% comunes + 5.50% desempleo + 0.06% FP + 0.75% MEI = 29.91%

// IPC (Índice de Precios de Consumo) — base 2021, medias anuales INE
// Fuente: INE tabla 50934, serie base 2021, medias anuales
// 2026 estimado extrapolado de variación interanual +3.4% (marzo 2026)
var ipcData = {
    2012: 92.717,
    2013: 94.023,
    2014: 93.881,
    2015: 93.412,
    2016: 93.222,
    2017: 95.046,
    2018: 96.638,
    2019: 97.314,
    2020: 97.000,
    2021: 100.000,
    2022: 108.391,
    2023: 112.219,
    2024: 115.333,
    2025: 118.415,
    2026: 122.440
};

function getIPC(year) {
    return ipcData[year] || ipcData[2025];
}

// Cálcula la comparativa de poder adquisitivo entre dos años
// Retorna: salario ajustado al año target, pérdida/ganancia real
function calculateIPCAjusted(salary, yearBase, yearTarget) {
    const ipcBase = getIPC(yearBase);
    const ipcTarget = getIPC(yearTarget);
    if (!ipcBase || !ipcTarget) return null;
    const salaryAjustado = salary * (ipcTarget / ipcBase);
    const perdidaAdquisitivo = salary - salaryAjustado;
    const perdidaPercent = (perdidaAdquisitivo / salary) * 100;
    return {
        salaryOriginal: salary,
        salaryAjustado: salaryAjustado,
        perdidaAdquisitivo: perdidaAdquisitivo,
        perdidaPercent: perdidaPercent,
        ipcBase: ipcBase,
        ipcTarget: ipcTarget,
        factor: ipcTarget / ipcBase
    };
}

// Cotización seguridad social 2026 — trabajador + empresa
var SS_CONFIG_2026 = {
    baseMaxima: 61214.40,
    tipoTrabajador: 0.0470,  // 4.70% contingencias comunes
    tipoMEI: 0.0015,         // 0.15% MEI intergeneracional
    tipoTotalTrabajador: 0.0650,  // 4.70% + 1.55% desempleo + 0.10% FP + 0.15% MEI
    tipoEmpresaComun: 0.2360,     // 23.60% contingencias comunes empresa
    tipoEmpresaDesempleo: 0.0550,  // 5.50% desempleo empresa
    tipoEmpresaFP: 0.0006,          // 0.06% FP empresa
    tipoEmpresaMEI: 0.0075,        // 0.75% MEI empresa
    tipoTotalEmpresa: 0.2991,       // 23.60% + 5.50% + 0.06% + 0.75% = 29.91%
    minimoContribuyente: 2268     // Mínimo tributable 2026
};

function calculateCosteEmpresa(bruto) {
    const cfg = SS_CONFIG_2026;
    const baseSS = Math.min(bruto, cfg.baseMaxima);
    
    // Cotización trabajador
    const ssTrabajador = baseSS * cfg.tipoTotalTrabajador;
    
    // Cotización empresa
    const ssEmpresa = baseSS * cfg.tipoTotalEmpresa;
    
    // Coste total empresa = bruto + SS empresa
    const costeTotal = bruto + ssEmpresa;
    
    return {
        bruto: bruto,
        baseSS: baseSS,
        ssTrabajador: ssTrabajador,
        ssTrabajadorPercent: (ssTrabajador / bruto) * 100,
        ssEmpresa: ssEmpresa,
        ssEmpresaPercent: (ssEmpresa / bruto) * 100,
        costeTotal: costeTotal,
        costeTotalPercent: (costeTotal / bruto) * 100,
        ratioEmpresaTrabajador: ssEmpresa / ssTrabajador
    };
}

var CCAA_NAMES = {
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
var ESTATAL = [
  [12450, 0.095],
  [20200, 0.12],
  [35200, 0.15],
  [60000, 0.185],
  [300000, 0.225],
  [Infinity, 0.245]
];

// ─── Escalas autonómicas 2026 (PDF hacienda.gob.es) ───
// null = usa escala supletoria (= escala estatal duplicada)
var AUTONOMICAS = {
  supletorio: null,  // estatal + estatal
  andalucia: [
    [12450, 0.095], [20200, 0.12], [28000, 0.15], [35200, 0.155],
    [50000, 0.175], [60000, 0.185], [120000, 0.228], [Infinity, 0.245]
  ],
  aragon: [
    [12450, 0.10], [20200, 0.125], [34000, 0.155], [50000, 0.19],
    [60000, 0.21], [70000, 0.225], [90000, 0.245], [130000, 0.25],
    [150000, 0.255], [Infinity, 0.255]
  ],
  asturias: [
    [12450, 0.10], [17707, 0.12], [33007, 0.14], [53407, 0.188],
    [70000, 0.213], [90000, 0.225], [175000, 0.25], [Infinity, 0.255]
  ],
  baleares: [
    [10000, 0.095], [18000, 0.118], [30000, 0.148], [48000, 0.175],
    [70000, 0.19], [90000, 0.225], [175000, 0.235], [Infinity, 0.245]
  ],
  canarias: [
    [12450, 0.09], [17707, 0.115], [33007, 0.14], [53407, 0.185],
    [90000, 0.235], [120000, 0.245], [Infinity, 0.26]
  ],
  cantabria: [
    [12450, 0.095], [20200, 0.12], [35200, 0.15], [46000, 0.175],
    [60000, 0.19], [90000, 0.22], [150000, 0.235], [Infinity, 0.255]
  ],
  castilla_y_leon: [
    [12450, 0.09], [20200, 0.12], [35200, 0.14], [53407, 0.175], [Infinity, 0.215]
  ],
  castilla_la_mancha: [
    [12450, 0.095], [20200, 0.12], [35200, 0.15], [60000, 0.185], [Infinity, 0.225]
  ],
  cataluna: [
    [12450, 0.105], [17707, 0.12], [33007, 0.148], [53407, 0.17],
    [90000, 0.208], [120000, 0.218], [175000, 0.235], [Infinity, 0.255]
  ],
  extremadura: [
    [12450, 0.095], [20200, 0.12], [24000, 0.145], [35200, 0.165],
    [60000, 0.20], [80000, 0.23], [100000, 0.245], [120000, 0.25], [Infinity, 0.255]
  ],
  galicia: [
    [12450, 0.095], [20200, 0.118], [35200, 0.148], [60000, 0.185], [Infinity, 0.225]
  ],
  la_rioja: [
    [12450, 0.09], [20200, 0.118], [35200, 0.15], [50000, 0.19],
    [65000, 0.22], [80000, 0.235], [120000, 0.245], [Infinity, 0.27]
  ],
  madrid: [
    [12450, 0.085], [17707, 0.108], [33007, 0.128], [53407, 0.158],
    [Infinity, 0.205]
  ],
  murcia: [
    [12450, 0.095], [20200, 0.118], [34000, 0.148], [60000, 0.19],
    [120000, 0.235], [Infinity, 0.245]
  ],
  comunidad_valenciana: [
    [12450, 0.10], [17707, 0.12], [33007, 0.14], [53407, 0.175],
    [65000, 0.19], [80000, 0.235], [120000, 0.245], [140000, 0.25],
    [175000, 0.255], [Infinity, 0.295]
  ],
  ceuta: null,   // usa supletorio
  melilla: null   // usa supletorio
};

// ─── Escalas forales (cuota única, sin desglose) ───
var FORALES_ESCALAS = {
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
var ESCALAS = {};
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
// MEI 2026: 0,80% total (0,75% emp + 0,15% tra) — Orden PJC/297/2026
// Cuota de solidaridad: RDL 8/2025 + RDL 3/2026 (tramos progresivos sobre exceso de base)
var BASE_MAX_SS = 61214.40;
var TIPO_SS_COMUNES_TRA = 0.0470;
var TIPO_SS_DESEMPLEO_TRA = 0.0155;
var TIPO_SS_FP_TRA = 0.0010;
var TIPO_MEI_TRA = 0.0015;
var TIPO_SS_TRA = TIPO_SS_COMUNES_TRA + TIPO_SS_DESEMPLEO_TRA + TIPO_SS_FP_TRA + TIPO_MEI_TRA; // 0.0650
var TIPO_SS_EMPRESARIAL_COMUNES = 0.2360;
var TIPO_SS_EMPRESARIAL_DESEMPLEO = 0.0550; // contrato indefinido
var TIPO_SS_EMPRESARIAL_FP = 0.0006;
var TIPO_MEI_EMPRESARIAL = 0.0075;
var TIPO_SS_EMPRESARIAL = TIPO_SS_EMPRESARIAL_COMUNES + TIPO_SS_EMPRESARIAL_DESEMPLEO + TIPO_SS_EMPRESARIAL_FP + TIPO_MEI_EMPRESARIAL; // 0.2991

// Cuota de solidaridad 2026 (solo para bases > BASE_MAX_SS)
// RDL 3/2026: tramos progresivos sobre el exceso de base
var SOLIDARIDAD_TRAMOS = [
  { hasta: BASE_MAX_SS * 0.10, tipo: 0.0115 },  // 0-10% exceso
  { hasta: BASE_MAX_SS * 0.50, tipo: 0.0125 },  // 10%-50% exceso
  { hasta: Infinity, tipo: 0.0146 }               // >50% exceso
];
var SOLIDARIDAD_RATIO_EMPRESARIAL = 5 / 6;
var SOLIDARIDAD_RATIO_TRABAJADOR = 1 / 6;

var GASTOS_FIJOS = 2000;
var MINIMO_EXENTO = 15876;
var TOPE_RETENCION = 0.43;

var FORALES = new Set(["navarra", "pais_vasco"]);

// ─── Parámetros por situación familiar (2025/2026) ───
var MINIMO_EDAD = { normal: 5550, senior: 6700, mayor: 8100 };
var MINIMO_HIJO = { 0: 0, 1: 2400, 2: 2700, 3: 4000, 4: 4500, 5: 5750 };
var MINIMO_ASCENDIENTE = 1150;
var MINIMO_DISCAPACIDAD = { 33: 3000, 65: 9000, 100: 12200 };

var DEFAULT_CONFIG = {
  edad: "normal",
  hijos: 0,
  ascendientes: 0,
  discapacidad: 0,
  tributacion: "individual"
};

// ─── Parámetros por año fiscal ───
// Usados para la comparativa año a año (progresividad en frío)
// Las autonómicas 2024/2025 usan las de 2026 como aproximación (cambios menores)
var YEAR_PARAMS = {
  2024: {
    baseMaxSS: 55266.00,       // Orden PJC/2024
    tipoSSComunesTra: 0.0470,
    tipoSSDesempleoTra: 0.0155,
    tipoSSFpTra: 0.0010,
    tipoMeiTra: 0.0,           // sin MEI
    tipoSSEmpresarialComunes: 0.2360,
    tipoSSEmpresarialDesempleo: 0.0550,
    tipoSSEmpresarialFp: 0.0006,
    tipoMeiEmpresarial: 0.0,
    solidaridad: false,
    escalaEstatal: [
      [12450, 0.095], [20200, 0.12], [35200, 0.15],
      [60000, 0.185], [300000, 0.225], [Infinity, 0.245]
    ]
  },
  2025: {
    baseMaxSS: 58914.00,       // Orden PJC/2025
    tipoSSComunesTra: 0.0470,
    tipoSSDesempleoTra: 0.0155,
    tipoSSFpTra: 0.0010,
    tipoMeiTra: 0.0,           // sin MEI (aplazado)
    tipoSSEmpresarialComunes: 0.2360,
    tipoSSEmpresarialDesempleo: 0.0550,
    tipoSSEmpresarialFp: 0.0006,
    tipoMeiEmpresarial: 0.0,
    solidaridad: false,
    escalaEstatal: [
      [12450, 0.095], [20200, 0.12], [35200, 0.15],
      [60000, 0.185], [300000, 0.225], [Infinity, 0.245]
    ]
  },
  2026: {
    baseMaxSS: 61214.40,       // Orden PJC/297/2026
    tipoSSComunesTra: 0.0470,
    tipoSSDesempleoTra: 0.0155,
    tipoSSFpTra: 0.0010,
    tipoMeiTra: 0.0015,        // 0.15% trabajador
    tipoSSEmpresarialComunes: 0.2360,
    tipoSSEmpresarialDesempleo: 0.0550,
    tipoSSEmpresarialFp: 0.0006,
    tipoMeiEmpresarial: 0.0075, // 0.75% empresarial
    solidaridad: true,
    escalaEstatal: [
      [12450, 0.095], [20200, 0.12], [35200, 0.15],
      [60000, 0.185], [300000, 0.225], [Infinity, 0.245]
    ]
  }
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
    if (brutoPos <= 17094) dedSMI = 590.89;
    else if (brutoPos <= 18894) dedSMI = Math.max(0, 590.89 - 0.3277 * (brutoPos - 17094));

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

    // Deducción SMI 2026 (590,89€ máx, umbrales 17.094€ / 18.894€)
    let dedSMI = 0;
    if (brutoPos <= 17094) dedSMI = 590.89;
    else if (brutoPos <= 18894) dedSMI = Math.max(0, 590.89 - 0.3277 * (brutoPos - 17094));

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

// ─── Cálculo de IRPF por año (para comparativa año a año) ───
function calcularIRPFYear(bruto, ccaaKey, year, config) {
  const yp = YEAR_PARAMS[year];
  if (!yp) return calcularIRPF(bruto, ccaaKey, config);
  const { edad = "normal", hijos = 0, ascendientes = 0, discapacidad = 0 } = config || DEFAULT_CONFIG;
  const brutoPos = Math.max(0, bruto);
  const baseSS = Math.min(brutoPos, yp.baseMaxSS);
  const tipoTra = yp.tipoSSComunesTra + yp.tipoSSDesempleoTra + yp.tipoSSFpTra + yp.tipoMeiTra;
  const tipoEmp = yp.tipoSSEmpresarialComunes + yp.tipoSSEmpresarialDesempleo + yp.tipoSSEmpresarialFp + yp.tipoMeiEmpresarial;
  const cotSSComun = Math.round(baseSS * tipoTra * 100) / 100;
  let solidaridad = { total: 0, empresarial: 0, trabajador: 0 };
  if (yp.solidaridad) {
    if (brutoPos > yp.baseMaxSS) {
      const exceso = brutoPos - yp.baseMaxSS;
      const l1 = yp.baseMaxSS * 0.10, l2 = yp.baseMaxSS * 0.50;
      const t1 = Math.min(exceso, l1) * 0.0115;
      const t2 = Math.min(Math.max(0, exceso - l1), l2 - l1) * 0.0125;
      const t3 = Math.max(0, exceso - l2) * 0.0146;
      solidaridad = { total: t1+t2+t3, empresarial: (t1+t2+t3)*5/6, trabajador: (t1+t2+t3)/6 };
    }
  }
  const cotTra = Math.round((cotSSComun + solidaridad.trabajador) * 100) / 100;
  const cotEmpresarial = Math.round((baseSS * tipoEmp + solidaridad.empresarial) * 100) / 100;
  const costeLaboral = Math.round((brutoPos + cotEmpresarial) * 100) / 100;
  const rn = Math.max(0, brutoPos - cotTra);
  let reduccion = 0;
  if (rn <= 14852) reduccion = 7302;
  else if (rn <= 17673.52) reduccion = 7302 - 1.75 * (rn - 14852);
  else if (rn <= 19747.50) reduccion = 2364.34 - 1.14 * (rn - 17673.52);
  reduccion = Math.max(0, reduccion);
  const rneto = Math.max(0, rn - GASTOS_FIJOS - reduccion);
  const minimoPersonal = MINIMO_EDAD[edad] || MINIMO_EDAD.normal;
  const minimoHijos = MINIMO_HIJO[Math.min(hijos, 5)] || 0;
  const minimoAscendientes = Math.min(ascendientes, 4) * MINIMO_ASCENDIENTE;
  const minimoTotal = minimoPersonal + minimoHijos + minimoAscendientes;
  const baseLiq = Math.max(0, rneto);
  const estatal = yp.escalaEstatal;
  let irpfFinal, irpfEstatal, irpfAutonomica, tipoMax;
  if (FORALES.has(ccaaKey)) {
    const escala = FORALES_ESCALAS[ccaaKey];
    const cuota = cuotaIntegra(baseLiq, escala);
    const cuotaMin = cuotaMinimoPersonal(minimoTotal, baseLiq, escala);
    const cuotaLiq = Math.max(0, cuota - cuotaMin);
    let dedSMI = 0;
    if (brutoPos <= 17094) dedSMI = 590.89;
    else if (brutoPos <= 18894) dedSMI = Math.max(0, 590.89 - 0.3277 * (brutoPos - 17094));
    const cuotaResult = Math.max(0, cuotaLiq - dedSMI);
    const limiteRet = Math.max(0, (brutoPos - MINIMO_EXENTO) * TOPE_RETENCION);
    irpfFinal = Math.min(cuotaResult, limiteRet);
    irpfEstatal = 0; irpfAutonomica = irpfFinal;
    tipoMax = escala[escala.length - 1][1];
  } else {
    const escalaAut = AUTONOMICAS[ccaaKey] || estatal;
    const cuotaEst = cuotaIntegra(baseLiq, estatal);
    const cuotaAut = cuotaIntegra(baseLiq, escalaAut);
    const minEst = cuotaMinimoPersonal(minimoTotal, baseLiq, estatal);
    const minAut = cuotaMinimoPersonal(minimoTotal, baseLiq, escalaAut);
    const cuotaLiqEst = Math.max(0, cuotaEst - minEst);
    const cuotaLiqAut = Math.max(0, cuotaAut - minAut);
    let dedSMI = 0;
    if (brutoPos <= 17094) dedSMI = 590.89;
    else if (brutoPos <= 18894) dedSMI = Math.max(0, 590.89 - 0.3277 * (brutoPos - 17094));
    const cuotaLiqTotal = cuotaLiqEst + cuotaLiqAut;
    const ratioEst = cuotaLiqTotal > 0 ? cuotaLiqEst / cuotaLiqTotal : 0.5;
    const cuotaResEst = Math.max(0, cuotaLiqEst - dedSMI * ratioEst);
    const cuotaResAut = Math.max(0, cuotaLiqAut - dedSMI * (1 - ratioEst));
    const limiteRet = Math.max(0, (brutoPos - MINIMO_EXENTO) * TOPE_RETENCION);
    irpfEstatal = Math.min(cuotaResEst, limiteRet);
    irpfAutonomica = Math.min(cuotaResAut, Math.max(0, limiteRet - irpfEstatal));
    irpfFinal = irpfEstatal + irpfAutonomica;
    tipoMax = estatal[estatal.length - 1][1] + escalaAut[escalaAut.length - 1][1];
  }
  const neto = brutoPos - cotTra - irpfFinal;
  const tipoEfectivo = brutoPos > 0 ? (irpfFinal / brutoPos * 100) : 0;
  return {
    bruto: brutoPos, baseSS: Math.round(baseSS), cotSS: Math.round(cotSSComun),
    cotTra: Math.round(cotTra), cotEmpresarial: Math.round(cotEmpresarial),
    costeLaboral: Math.round(costeLaboral), neto: Math.round(neto),
    irpfFinal: Math.round(irpfFinal), irpfEstatal: Math.round(irpfEstatal),
    irpfAutonomica: Math.round(irpfAutonomica), tipoEfectivo: +tipoEfectivo.toFixed(2),
    tipoMax: +(tipoMax * 100).toFixed(1), year: year
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
