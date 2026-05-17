#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CLI ligero para consultar el motor fiscal sin generar el Excel masivo.

Comandos:
    ipc        Compara un salario actual con su equivalente real en un año anterior (ajustado por IPC)
    marginal   Muestra cuánto neto queda de cada subida bruta dentro de un rango
    salario    Calcula una nómina anual concreta
    tabla      Genera una tabla ligera por rango salarial
    comparar   Compara el mismo bruto nominal entre años
"""

import argparse
import math

import numpy as np

from motor import (
    ANIOS_SOPORTADOS, INFLACION_A_2026,
    calcular_nomina_agregada, obtener_inflacion_acumulada, obtener_parametros,
)


# ── Formato ──────────────────────────────────────────────────────────────────

def fmt_euros(valor):
    return f"{valor:,.2f} €"


def fmt_porciento(valor):
    return f"{valor:,.2f} %"


def fmt_puntos(valor):
    return f"{valor:,.2f} p.p."


def fmt_ipc(valor):
    return f"{valor:.4f}x"


# ── Lógica de cálculo ────────────────────────────────────────────────────────

def resumen_nomina(bruto, anio, pagas=12):
    p = obtener_parametros(anio)
    coste, ss_emp, ss_tra, irpf, neto = calcular_nomina_agregada(bruto, anio, p)
    return {
        "Año": anio,
        "Bruto anual": bruto,
        "Coste empresa": coste,
        "SS empresa": ss_emp,
        "SS trabajador": ss_tra,
        "IRPF": irpf,
        "Neto anual": neto,
        f"Neto mensual ({pagas}p)": neto / pagas,
    }


def comparativa_ipc(bruto_actual, anio_base, anio_actual, pagas=12):
    inflacion = obtener_inflacion_acumulada(anio_base, anio_actual)
    bruto_base = bruto_actual / inflacion

    base = resumen_nomina(bruto_base, anio_base, pagas)
    actual = resumen_nomina(bruto_actual, anio_actual, pagas)

    irpf_base_actualizado = base["IRPF"] * inflacion
    neto_base_actualizado = base["Neto anual"] * inflacion
    tipo_base = irpf_base_actualizado / bruto_actual * 100 if bruto_actual else 0.0
    tipo_actual = actual["IRPF"] / bruto_actual * 100 if bruto_actual else 0.0
    dif_irpf = actual["IRPF"] - irpf_base_actualizado
    dif_neto = actual["Neto anual"] - neto_base_actualizado

    return [
        {
            "Concepto": f"{anio_base} equiv.",
            "Año": anio_base,
            "Bruto nominal": bruto_base,
            f"Bruto {anio_actual}": bruto_actual,
            "IPC": inflacion,
            f"IRPF {anio_actual}": irpf_base_actualizado,
            "Tipo IRPF": tipo_base,
            "Dif. tipo": 0.0,
            f"Neto {anio_actual}": neto_base_actualizado,
            "Dif. IRPF": 0.0,
            f"Dif. neto/mes ({pagas}p)": 0.0,
        },
        {
            "Concepto": f"{anio_actual} actual",
            "Año": anio_actual,
            "Bruto nominal": bruto_actual,
            f"Bruto {anio_actual}": bruto_actual,
            "IPC": 1.0,
            f"IRPF {anio_actual}": actual["IRPF"],
            "Tipo IRPF": tipo_actual,
            "Dif. tipo": tipo_actual - tipo_base,
            f"Neto {anio_actual}": actual["Neto anual"],
            "Dif. IRPF": dif_irpf,
            f"Dif. neto/mes ({pagas}p)": dif_neto / pagas,
        },
    ]


def marginal_efectivo(anio, desde, hasta, paso):
    salarios = np.linspace(desde, hasta, num=int(round((hasta - desde) / paso)) + 1)
    filas = []
    anterior = None
    for bruto in salarios:
        r = resumen_nomina(float(bruto), anio)
        fila = {
            "Año": anio,
            "Bruto anual": r["Bruto anual"],
            "Neto anual": r["Neto anual"],
            "Subida bruta": 0.0,
            "Subida neta": 0.0,
            "Tipo marginal efectivo": 0.0,
        }
        if anterior is not None:
            subida_bruta = fila["Bruto anual"] - anterior["Bruto anual"]
            subida_neta = fila["Neto anual"] - anterior["Neto anual"]
            fila["Subida bruta"] = subida_bruta
            fila["Subida neta"] = subida_neta
            if subida_bruta:
                fila["Tipo marginal efectivo"] = (1 - subida_neta / subida_bruta) * 100
        filas.append(fila)
        anterior = fila
    return filas


# ── Impresión de tablas ──────────────────────────────────────────────────────

FORMATO_COLUMNAS = {
    "Año": str,
    "Concepto": str,
    "Bruto anual": fmt_euros,
    "Bruto nominal": fmt_euros,
    "Coste empresa": fmt_euros,
    "SS empresa": fmt_euros,
    "SS trabajador": fmt_euros,
    "IRPF": fmt_euros,
    "Neto anual": fmt_euros,
    "Neto mensual (12p)": fmt_euros,
    "IPC": fmt_ipc,
    f"Bruto {2026}": fmt_euros,
    f"IRPF {2026}": fmt_euros,
    f"Neto {2026}": fmt_euros,
    "Tipo IRPF": fmt_porciento,
    "Dif. tipo": fmt_puntos,
    "Dif. IRPF": fmt_euros,
    f"Dif. neto/mes (12p)": fmt_euros,
    "Subida bruta": fmt_euros,
    "Subida neta": fmt_euros,
    "Tipo marginal efectivo": fmt_porciento,
}


def imprimir_tabla(filas):
    if not filas:
        print("No hay filas para mostrar.")
        return
    columnas = list(filas[0].keys())
    filas_texto = []
    for fila in filas:
        valores = []
        for col in columnas:
            valor = fila[col]
            fmt = FORMATO_COLUMNAS.get(col, fmt_euros)
            valores.append(fmt(valor))
        filas_texto.append(valores)

    anchos = [
        max(len(str(col)), *(len(f[i]) for f in filas_texto))
        for i, col in enumerate(columnas)
    ]
    cabecera = " | ".join(str(col).ljust(anchos[i]) for i, col in enumerate(columnas))
    separador = "-+-".join("-" * w for w in anchos)

    print(cabecera)
    print(separador)
    for fila in filas_texto:
        print(" | ".join(v.rjust(anchos[i]) for i, v in enumerate(fila)))


# ── Comandos ─────────────────────────────────────────────────────────────────

def cmd_ipc(args):
    if args.anio_base >= args.anio_actual:
        raise SystemExit("--anio-base debe ser anterior a --anio-actual")
    imprimir_tabla(comparativa_ipc(
        args.bruto_actual, args.anio_base, args.anio_actual, args.pagas))


def cmd_marginal(args):
    if args.desde > args.hasta:
        raise SystemExit("--desde no puede ser mayor que --hasta")
    if args.paso <= 0:
        raise SystemExit("--paso debe ser mayor que 0")
    imprimir_tabla(marginal_efectivo(args.anio, args.desde, args.hasta, args.paso))


def cmd_salario(args):
    imprimir_tabla([resumen_nomina(args.bruto, args.anio, args.pagas)])


def cmd_tabla(args):
    salarios = np.linspace(args.desde, args.hasta,
                           num=int(round((args.hasta - args.desde) / args.paso)) + 1)
    filas = [resumen_nomina(float(s), args.anio, args.pagas) for s in salarios]
    imprimir_tabla(filas)


def cmd_comparar(args):
    if args.desde_anio > args.hasta_anio:
        raise SystemExit("--desde-anio no puede ser mayor que --hasta-anio")
    filas = [resumen_nomina(args.bruto, a, args.pagas)
             for a in range(args.desde_anio, args.hasta_anio + 1)]
    imprimir_tabla(filas)


# ── Parser ────────────────────────────────────────────────────────────────────

def crear_parser():
    parser = argparse.ArgumentParser(
        description="Consulta rápida de salario neto, IRPF y Seguridad Social en España (2012-2026)."
    )
    sub = parser.add_subparsers(dest="comando", required=True)

    # ipc
    p_ipc = sub.add_parser(
        "ipc",
        help="Compara un salario actual con su equivalente real en un año anterior, ajustado por IPC.",
    )
    p_ipc.add_argument("bruto_actual", type=float, help="Salario bruto anual del año actual.")
    p_ipc.add_argument("--anio-base", type=int, default=2019,
                       choices=list(ANIOS_SOPORTADOS), metavar="YYYY")
    p_ipc.add_argument("--anio-actual", type=int, default=2026,
                       choices=list(ANIOS_SOPORTADOS), metavar="YYYY")
    p_ipc.add_argument("--pagas", type=int, default=12)
    p_ipc.set_defaults(func=cmd_ipc)

    # marginal
    p_mar = sub.add_parser(
        "marginal",
        help="Muestra cuánto neto queda de cada subida bruta dentro de un rango.",
    )
    p_mar.add_argument("--anio", type=int, default=2026,
                       choices=list(ANIOS_SOPORTADOS), metavar="YYYY")
    p_mar.add_argument("--desde", type=float, default=15000)
    p_mar.add_argument("--hasta", type=float, default=25000)
    p_mar.add_argument("--paso", type=float, default=500)
    p_mar.set_defaults(func=cmd_marginal)

    # salario
    p_sal = sub.add_parser("salario", help="Calcula una nómina anual concreta.")
    p_sal.add_argument("bruto", type=float, help="Salario bruto anual.")
    p_sal.add_argument("--anio", type=int, default=2026,
                       choices=list(ANIOS_SOPORTADOS), metavar="YYYY")
    p_sal.add_argument("--pagas", type=int, default=12)
    p_sal.set_defaults(func=cmd_salario)

    # tabla
    p_tab = sub.add_parser("tabla", help="Genera una tabla ligera por rango salarial.")
    p_tab.add_argument("--anio", type=int, default=2026,
                       choices=list(ANIOS_SOPORTADOS), metavar="YYYY")
    p_tab.add_argument("--desde", type=float, default=15000)
    p_tab.add_argument("--hasta", type=float, default=100000)
    p_tab.add_argument("--paso", type=float, default=5000)
    p_tab.add_argument("--pagas", type=int, default=12)
    p_tab.set_defaults(func=cmd_tabla)

    # comparar
    p_cmp = sub.add_parser("comparar",
                           help="Compara el mismo bruto nominal entre años (sin ajustar por IPC).")
    p_cmp.add_argument("bruto", type=float, help="Salario bruto anual.")
    p_cmp.add_argument("--desde-anio", type=int, default=2024,
                       choices=list(ANIOS_SOPORTADOS), metavar="YYYY")
    p_cmp.add_argument("--hasta-anio", type=int, default=2026,
                       choices=list(ANIOS_SOPORTADOS), metavar="YYYY")
    p_cmp.add_argument("--pagas", type=int, default=12)
    p_cmp.set_defaults(func=cmd_comparar)

    return parser


def main():
    parser = crear_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()