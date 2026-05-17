# -*- coding: utf-8 -*-
"""Motor de cálculo fiscal español (IRPF + SS) 2012-2026.

Módulo importable. Sin side effects. Sin ejecución de Excel.
Tanto el script original como el CLI importan de aquí.
"""

import numpy as np

# =============================================================================
# 1. DATOS MACROECONÓMICOS: INFLACIÓN ACUMULADA (DICIEMBRE A DICIEMBRE)
# =============================================================================
IPC_ANUAL_DIC = {
    2013: 0.003, 2014: -0.010, 2015: 0.000, 2016: 0.016, 2017: 0.011,
    2018: 0.012, 2019: 0.008, 2020: -0.005, 2021: 0.065, 2022: 0.057,
    2023: 0.031, 2024: 0.028, 2025: 0.029, 2026: 0.030
}

ANIOS_SOPORTADOS = range(2012, 2027)


def obtener_inflacion_acumulada(anio_base, anio_destino=2026):
    """Factor de inflación acumulada entre anio_base y anio_destino."""
    if anio_base == anio_destino:
        return 1.0
    multiplicador = 1.0
    for anio in range(anio_base + 1, anio_destino + 1):
        multiplicador *= (1 + IPC_ANUAL_DIC[anio])
    return multiplicador


INFLACION_A_2026 = {anio: obtener_inflacion_acumulada(anio, 2026) for anio in ANIOS_SOPORTADOS}


# =============================================================================
# 2. PARÁMETROS FISCALES POR AÑO
# =============================================================================
def obtener_parametros(anio):
    """Devuelve un dict con todos los parámetros fiscales de un año."""
    p = {}

    # Bases y Tipos Generales SS
    p['base_max'] = {
        2012: 39150.0, 2013: 41108.4, 2014: 43164.0, 2015: 43272.0,
        2016: 43704.0, 2017: 45014.4, 2018: 45014.4, 2019: 48841.2,
        2020: 48841.2, 2021: 48841.2, 2022: 49672.8, 2023: 53946.0,
        2024: 56646.0, 2025: 58914.0, 2026: 61214.4
    }[anio]

    p['ss_tipos'] = {
        'comunes': [0.236, 0.047], 'desempleo': [0.055, 0.0155],
        'fogasa': [0.002, 0.0], 'fp': [0.006, 0.001], 'atep': [0.015, 0.0]
    }

    # MEI y Solidaridad
    if anio == 2023:
        p['mei'] = [0.005, 0.001]
    elif anio == 2024:
        p['mei'] = [0.0058, 0.0012]
    elif anio == 2025:
        p['mei'] = [0.0067, 0.0013]
    elif anio >= 2026:
        p['mei'] = [0.0075, 0.0015]
    else:
        p['mei'] = [0.0, 0.0]

    if anio == 2025:
        p['solidaridad'] = [(1.10, 0.0092), (1.50, 0.0100), (float('inf'), 0.0117)]
    elif anio >= 2026:
        p['solidaridad'] = [(1.10, 0.0115), (1.50, 0.0125), (float('inf'), 0.0146)]
    else:
        p['solidaridad'] = []

    # Mínimos y Gastos
    p['irpf_minimo'] = 5151 if anio <= 2014 else 5550
    p['minimo_exento'] = {
        2012: 11162, 2013: 11162, 2014: 11162, 2015: 12000, 2016: 12000,
        2017: 12000, 2018: 12643, 2019: 14000, 2020: 14000, 2021: 14000,
        2022: 14000, 2023: 15000, 2024: 15876, 2025: 15876, 2026: 15876
    }[anio]
    p['gastos_fijos'] = 0 if anio <= 2014 else 2000

    # Reducción Art 20
    def _get_art20_params(a):
        if a <= 2014:
            return {"U_Inf": 9180, "R_Max": 4080, "U_Sup": 13260, "R_Min": 2652}
        elif 2015 <= a <= 2017:
            return {"U_Inf": 11250, "R_Max": 3700, "U_Sup": 14450, "R_Min": 0}
        elif a == 2018:
            return {"U_Inf": "Transitorio", "R_Max": "Transitorio",
                    "U_Sup": "Transitorio", "R_Min": "Transitorio"}
        elif 2019 <= a <= 2022:
            return {"U_Inf": 13115, "R_Max": 5565, "U_Sup": 16825, "R_Min": 0}
        elif a == 2023:
            return {"U_Inf": 14047.5, "R_Max": 6498, "U_Sup": 19747.5, "R_Min": 0}
        else:
            return {"U_Inf": 14852, "R_Max": 7302, "U_Sup": 19747.5, "R_Min": 0}

    p['art20_meta'] = _get_art20_params(anio)

    def _reduccion_trabajo(rn_previo):
        if anio <= 2014:
            if rn_previo <= 9180:
                return 4080.0
            elif rn_previo <= 13260:
                return 4080.0 - 0.35 * (rn_previo - 9180.0)
            else:
                return 2652.0
        elif 2015 <= anio <= 2017:
            if rn_previo <= 11250:
                return 3700.0
            elif rn_previo <= 14450:
                return 3700.0 - 1.15625 * (rn_previo - 11250.0)
            else:
                return 0.0
        elif anio == 2018:
            pre = 3700.0 if rn_previo <= 11250 else (
                3700.0 - 1.15625 * (rn_previo - 11250.0) if rn_previo <= 14450 else 0.0)
            post = 5565.0 if rn_previo <= 13115 else (
                max(0.0, 5565.0 - 1.5 * (rn_previo - 13115.0)) if rn_previo <= 16825 else 0.0)
            return (pre / 2.0) + (post / 2.0)
        elif 2019 <= anio <= 2022:
            if rn_previo <= 13115:
                return 5565.0
            elif rn_previo <= 16825:
                return max(0.0, 5565.0 - 1.5 * (rn_previo - 13115.0))
            else:
                return 0.0
        elif anio == 2023:
            if rn_previo <= 14047.50:
                return 6498.0
            elif rn_previo <= 19747.50:
                return max(0.0, 6498.0 - 1.14 * (rn_previo - 14047.50))
            else:
                return 0.0
        elif anio >= 2024:
            if rn_previo <= 14852:
                return 7302.0
            elif rn_previo <= 17673.52:
                return 7302.0 - 1.75 * (rn_previo - 14852.0)
            elif rn_previo <= 19747.50:
                return 2364.34 - 1.14 * (rn_previo - 17673.52)
            else:
                return 0.0
        return 0.0

    p['reduccion_trabajo'] = _reduccion_trabajo

    # Escalas IRPF
    if anio <= 2014:
        p['tramos_irpf'] = [
            (17707, 0.2475), (33007, 0.30), (53407, 0.40),
            (120000, 0.47), (175000, 0.49), (300000, 0.51), (float('inf'), 0.52)
        ]
    elif anio == 2015:
        p['tramos_irpf'] = [
            (12450, 0.195), (20200, 0.245), (34000, 0.305),
            (60000, 0.38), (float('inf'), 0.46)
        ]
    elif 2016 <= anio <= 2020:
        p['tramos_irpf'] = [
            (12450, 0.19), (20200, 0.24), (35200, 0.30),
            (60000, 0.37), (float('inf'), 0.45)
        ]
    else:
        p['tramos_irpf'] = [
            (12450, 0.19), (20200, 0.24), (35200, 0.30),
            (60000, 0.37), (300000, 0.45), (float('inf'), 0.47)
        ]

    # Deducción SMI
    def _deduccion_smi(bruto):
        if anio == 2026:
            if bruto <= 17094:
                return 590.89
            else:
                return max(0.0, 590.89 - 0.20 * (bruto - 17094.0))
        elif anio == 2025:
            if bruto <= 16576:
                return 340.0
            elif bruto <= 18276:
                return max(0, 340.0 - 0.20 * (bruto - 16576.0))
        return 0.0

    p['deduccion_smi'] = _deduccion_smi

    return p


# =============================================================================
# 3. CÁLCULO DE NÓMINA (MOTOR RÁPIDO)
# =============================================================================
def calcular_nomina_agregada(bruto, anio, p):
    """Calcula coste laboral, SS empresa, SS trabajador, IRPF y neto."""
    base_cot = min(bruto, p['base_max'])
    exc_base = max(0, bruto - p['base_max'])

    t_emp = sum(x[0] for x in p['ss_tipos'].values()) + p['mei'][0]
    t_tra = sum(x[1] for x in p['ss_tipos'].values()) + p['mei'][1]

    cot_emp = base_cot * t_emp
    cot_tra = base_cot * t_tra

    # Solidaridad
    if p['solidaridad'] and exc_base > 0:
        tramo1_limite = p['base_max'] * 0.10
        tramo2_limite = p['base_max'] * 0.50
        exceso1 = min(exc_base, tramo1_limite)
        exceso2 = min(max(0, exc_base - tramo1_limite), tramo2_limite - tramo1_limite)
        exceso3 = max(0, exc_base - tramo2_limite)
        cuota_sol = (exceso1 * p['solidaridad'][0][1]
                     + exceso2 * p['solidaridad'][1][1]
                     + exceso3 * p['solidaridad'][2][1])
        cot_emp += cuota_sol * (5 / 6)
        cot_tra += cuota_sol * (1 / 6)

    coste_lab = bruto + cot_emp
    rn_previo = bruto - cot_tra
    red20 = p['reduccion_trabajo'](rn_previo)
    base_imp = max(0, rn_previo - p['gastos_fijos'] - red20)

    q_integra = 0.0
    lim_ant = 0.0
    for lim, tipo in p['tramos_irpf']:
        if base_imp > lim:
            q_integra += (lim - lim_ant) * tipo
            lim_ant = lim
        else:
            q_integra += (base_imp - lim_ant) * tipo
            break

    q_min = p['irpf_minimo'] * p['tramos_irpf'][0][1]
    q_teorica = max(0, q_integra - q_min)
    q_smi = max(0, q_teorica - p['deduccion_smi'](bruto))

    lim_ret = max(0, (bruto - p['minimo_exento']) * 0.43)
    irpf_final = min(q_smi, lim_ret)

    return coste_lab, cot_emp, cot_tra, irpf_final, bruto - cot_tra - irpf_final


def calcular_cuotas_por_tramo(base_liq, tramos):
    """Desglose de cuotas IRPF por tramo."""
    cuotas = {f"T{i+1} ({round(tipo*100, 1)}%)": 0.0
              for i, (_, tipo) in enumerate(tramos)}
    total = 0.0
    if base_liq <= 0:
        return cuotas, total
    lim_ant = 0.0
    for i, (lim, tipo) in enumerate(tramos):
        nombre = f"T{i+1} ({round(tipo*100, 1)}%)"
        if base_liq > lim:
            cuota = (lim - lim_ant) * tipo
            cuotas[nombre] = cuota
            total += cuota
            lim_ant = lim
        else:
            cuota = (base_liq - lim_ant) * tipo
            cuotas[nombre] = cuota
            total += cuota
            break
    return cuotas, total