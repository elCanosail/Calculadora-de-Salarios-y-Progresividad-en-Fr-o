# -*- coding: utf-8 -*-
"""Calculo_Salario_IRPF — Generador del Excel de auditoría fiscal 2012-2026.

Motor fiscal importado de motor.py. Este script genera el Excel completo;
para consultas rápidas por terminal, usar cli.py.
"""

from motor import (
    IPC_ANUAL_DIC, INFLACION_A_2026, ANIOS_SOPORTADOS,
    obtener_inflacion_acumulada, obtener_parametros,
    calcular_nomina_agregada, calcular_cuotas_por_tramo,
)

import pandas as pd
import numpy as np


# =============================================================================
# GENERACIÓN DE HOJAS DE CONTROL DE PARÁMETROS
# =============================================================================
def generar_hojas_control():
    general = []
    tramos_lista = []

    for anio in ANIOS_SOPORTADOS:
        p = obtener_parametros(anio)
        tipo_emp = sum(x[0] for x in p['ss_tipos'].values())
        tipo_tra = sum(x[1] for x in p['ss_tipos'].values())

        general.append({
            "Año": anio,
            "Base Máx. Anual": p['base_max'],
            "SS Empleador %": round(tipo_emp * 100, 2),
            "SS Empleado %": round(tipo_tra * 100, 2),
            "MEI Empleador %": round(p['mei'][0] * 100, 3),
            "MEI Empleado %": round(p['mei'][1] * 100, 3),
            "Gastos Fijos Art.19": p['gastos_fijos'],
            "Mín. Contribuyente": p['irpf_minimo'],
            "Mín. Exento Retención": p['minimo_exento'],
            "Art.20 Umbral Inf": p['art20_meta']['U_Inf'],
            "Art.20 Red. Máxima": p['art20_meta']['R_Max'],
            "Art.20 Umbral Sup": p['art20_meta']['U_Sup'],
            "Art.20 Red. Mínima": p['art20_meta']['R_Min']
        })

        for i, (lim, tip) in enumerate(p['tramos_irpf']):
            tramos_lista.append({
                "Año": anio,
                "Nº Tramo": i + 1,
                "Hasta Base": lim if lim != float('inf') else "En adelante",
                "Tipo %": round(tip * 100, 2)
            })

    return pd.DataFrame(general), pd.DataFrame(tramos_lista)


# =============================================================================
# MOTOR DETALLADO (PARA PESTAÑAS ANUALES DAT_YYYY)
# =============================================================================
def procesar_ano(anio):
    p = obtener_parametros(anio)
    salarios_brutos = np.arange(0, 100001, 1)
    resultados = []

    for bruto in salarios_brutos:
        base_cotizacion = min(bruto, p['base_max'])
        exceso_base = max(0, bruto - p['base_max'])

        tipo_empresa = sum(x[0] for x in p['ss_tipos'].values()) + p['mei'][0]
        tipo_trabajador = sum(x[1] for x in p['ss_tipos'].values()) + p['mei'][1]

        cot_empresa = base_cotizacion * tipo_empresa
        cot_trabajador = base_cotizacion * tipo_trabajador

        if p['solidaridad'] and exceso_base > 0:
            tramo1_limite = p['base_max'] * 0.10
            tramo2_limite = p['base_max'] * 0.50
            exceso1 = min(exceso_base, tramo1_limite)
            exceso2 = min(max(0, exceso_base - tramo1_limite), tramo2_limite - tramo1_limite)
            exceso3 = max(0, exceso_base - tramo2_limite)
            cuota_sol_total = (exceso1 * p['solidaridad'][0][1]) + (exceso2 * p['solidaridad'][1][1]) + (exceso3 * p['solidaridad'][2][1])
            cot_empresa += cuota_sol_total * (5/6)
            cot_trabajador += cuota_sol_total * (1/6)

        coste_laboral = bruto + cot_empresa

        rendimiento_previo_sin_fijos = bruto - cot_trabajador
        red_trabajo = p['reduccion_trabajo'](rendimiento_previo_sin_fijos)
        rendimiento_neto = max(0, rendimiento_previo_sin_fijos - p['gastos_fijos'])
        base_imponible = max(0, rendimiento_neto - red_trabajo)

        cuotas_tramos, cuota_integra = calcular_cuotas_por_tramo(base_imponible, p['tramos_irpf'])
        cuota_minimo = p['irpf_minimo'] * p['tramos_irpf'][0][1]
        cuota_teorica = max(0, cuota_integra - cuota_minimo)

        deduccion = p['deduccion_smi'](bruto)
        cuota_con_deduccion = max(0, cuota_teorica - deduccion)

        limite_retencion = max(0, (bruto - p['minimo_exento']) * 0.43)
        irpf_final = min(cuota_con_deduccion, limite_retencion)
        salario_neto = bruto - cot_trabajador - irpf_final

        fila = {
            "Salario Bruto": bruto,
            "Cot. Soc. Empresa": round(cot_empresa, 2),
            "Coste Laboral": round(coste_laboral, 2),
            "Cot. Soc. Trab.": round(cot_trabajador, 2),
            "Ren. Previo": round(rendimiento_previo_sin_fijos, 2),
            "Gastos Fijos": p['gastos_fijos'],
            "Red. Ren. Trab.": round(red_trabajo, 2),
            "Base Imponible": round(base_imponible, 2)
        }
        for k, v in cuotas_tramos.items():
            fila[k] = round(v, 2)
        fila.update({
            "Cuota Íntegra": round(cuota_integra, 2),
            "Cuota Mínimo Personal": round(cuota_minimo, 2),
            "Cuota Teórica": round(cuota_teorica, 2),
            "Deducción SMI": round(deduccion, 2),
            "Cuota tras SMI": round(cuota_con_deduccion, 2),
            "Límite 43% (Art 85.3)": round(limite_retencion, 2),
            "IRPF Final": round(irpf_final, 2),
            "Salario Neto": round(salario_neto, 2)
        })
        resultados.append(fila)

    return pd.DataFrame(resultados)


# =============================================================================
# COMPARATIVA INFLACIÓN
# =============================================================================
def generar_comparativa_inflacion():
    salarios_2026 = np.arange(15000, 100001, 1000)
    p_2026 = obtener_parametros(2026)
    ref_2026 = {b: calcular_nomina_agregada(b, 2026, p_2026) for b in salarios_2026}

    resultados = []
    for anio in ANIOS_SOPORTADOS:
        p_anio = obtener_parametros(anio)
        inf_acum = INFLACION_A_2026[anio]

        for bruto_26 in salarios_2026:
            bruto_nom = bruto_26 / inf_acum
            c_lab_n, c_emp_n, c_tra_n, irpf_n, neto_n = calcular_nomina_agregada(bruto_nom, anio, p_anio)

            c_lab_aj = c_lab_n * inf_acum
            c_emp_aj = c_emp_n * inf_acum
            c_tra_aj = c_tra_n * inf_acum
            irpf_aj = irpf_n * inf_acum
            neto_aj = neto_n * inf_acum

            neto_2026_real = ref_2026[bruto_26][4]
            dif_poder_adq = neto_aj - neto_2026_real

            resultados.append({
                "Año a Comparar": anio,
                "Salario Equivalente (2026)": bruto_26,
                "Multiplicador IPC Acum.": round(inf_acum, 4),
                "IPC Acumulado (%)": f"{round((inf_acum - 1)*100, 2)}%",
                "Salario Bruto Nominal": round(bruto_nom, 2),
                "Coste Lab. (Euros 2026)": round(c_lab_aj, 2),
                "SS Emp. (Euros 2026)": round(c_emp_aj, 2),
                "SS Tra. (Euros 2026)": round(c_tra_aj, 2),
                "IRPF (Euros 2026)": round(irpf_aj, 2),
                "Neto Real en su Año": round(neto_aj, 2),
                "Neto Real en 2026": round(neto_2026_real, 2),
                "Variación Poder Adquisitivo Mensual vs 2026 (12 pagas)": round(dif_poder_adq / 12, 2),
                "Pérdida/Ganancia Anual Poder Adq.": round(dif_poder_adq, 2)
            })

    return pd.DataFrame(resultados)


# =============================================================================
# EJECUCIÓN MAESTRA Y GENERACIÓN DEL EXCEL COMPLETO
# =============================================================================
if __name__ == "__main__":
    nombre_fichero = 'Auditoria_Integral_Nominas_e_Inflacion_2012_2026.xlsx'
    print("Iniciando la creación del mega-archivo Excel. ¡Paciencia, puede tardar un par de minutos!...")

    with pd.ExcelWriter(nombre_fichero, engine='openpyxl') as writer:
        print("Generando hojas de control normativo...")
        df_gen, df_tra = generar_hojas_control()
        df_gen.to_excel(writer, sheet_name='CONTROL_GENERAL', index=False)
        df_tra.to_excel(writer, sheet_name='CONTROL_TRAMOS_IRPF', index=False)

        print("Calculando y generando comparativa ajustada por IPC...")
        df_comparativa = generar_comparativa_inflacion()
        df_comparativa.to_excel(writer, sheet_name='COMPARATIVA_INFLACION', index=False)

        for anio in ANIOS_SOPORTADOS:
            print(f"Calculando nóminas detalladas para el año {anio} (100.001 registros)...")
            df_ano = procesar_ano(anio)
            df_ano.to_excel(writer, sheet_name=f'DAT_{anio}', index=False)

    print(f"\n¡Éxito total! Archivo '{nombre_fichero}' creado correctamente con todas las auditorías solicitadas.")