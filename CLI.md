# CLI de consulta rápida

`cli.py` permite consultar el motor fiscal sin generar el Excel masivo. El caso principal es comparar un salario actual con su equivalente real en 2019, ajustando por IPC.

## Uso principal: 2019 vs 2026

Por defecto, `ipc` compara un salario de 2026 contra su equivalente de 2019 con la misma capacidad económica real.

```bash
python cli.py ipc 30000
```

Salida:

```text
Concepto    | Año  | Bruto nominal | Bruto 2026  | IPC     | IRPF 2026  | Tipo IRPF | Dif. tipo | Neto 2026   | Dif. IRPF | Dif. neto/mes (12p)
------------+------+---------------+-------------+---------+------------+-----------+-----------+-------------+-----------+--------------------
2019 equiv. | 2019 |   23,843.46 € | 30,000.00 € | 1.2582x | 4,038.62 € |   13.46 % | 0.00 p.p. | 24,056.38 € |    0.00 € |              0.00 €
2026 actual | 2026 |   30,000.00 € | 30,000.00 € | 1.0000x | 4,926.00 € |   16.42 % | 2.96 p.p. | 23,124.00 € |  887.38 € |            -77.70 €
```

Cómo leerlo:

- `2019 equiv.`: salario nominal de 2019 que equivale a 30.000 € de 2026 tras aplicar IPC.
- `IRPF 2026`: IRPF expresado en euros comparables de 2026.
- `Tipo IRPF`: IRPF dividido entre el bruto equivalente de 2026.
- `Dif. tipo`: aumento del tipo efectivo frente al caso equivalente de 2019.
- `Dif. IRPF`: cuánto más IRPF se paga frente al caso equivalente de 2019.
- `Dif. neto/mes`: pérdida o ganancia mensual neta frente al caso equivalente de 2019.

Para cambiar los años:

```bash
python cli.py ipc 30000 --anio-base 2019 --anio-actual 2026
```

## Rentas bajas: tipo marginal efectivo

`marginal` muestra cuánto neto queda de cada subida bruta dentro de un rango. Útil para ver zonas donde una subida salarial se convierte en poco neto disponible.

```bash
python cli.py marginal --anio 2026 --desde 16500 --hasta 18500 --paso 500
```

Salida:

```text
Año  | Bruto anual | Neto anual  | Subida bruta | Subida neta | Tipo marginal efectivo
-----+-------------+-------------+--------------+-------------+-----------------------
2026 | 16,500.00 € | 15,427.50 € |       0.00 € |      0.00 € |                 0.00 %
2026 | 17,000.00 € | 15,895.00 € |     500.00 € |    467.50 € |                 6.50 %
2026 | 17,500.00 € | 16,082.95 € |     500.00 € |    187.95 € |                62.41 %
2026 | 18,000.00 € | 16,206.18 € |     500.00 € |    123.23 € |                75.35 %
2026 | 18,500.00 € | 16,329.42 € |     500.00 € |    123.23 € |                75.35 %
```

## Otros comandos

Calcular un salario concreto:

```bash
python cli.py salario 30000 --anio 2026
```

Generar una tabla pequeña por rango salarial:

```bash
python cli.py tabla --anio 2026 --desde 20000 --hasta 40000 --paso 10000
```

Comparar el mismo bruto nominal entre años (sin ajustar por IPC):

```bash
python cli.py comparar 30000 --desde-anio 2024 --hasta-anio 2026
```

## Instalación y ayuda

Instala las dependencias del proyecto:

```bash
python3 -m pip install -r requirements.txt
```

Ver comandos disponibles:

```bash
python cli.py --help
```

## Nota

El CLI importa de `motor.py` — el mismo motor que usa `Calculo_Salario_IRPF.py` para generar el Excel. No hay duplicación ni `exec()` hack. Un solo motor, dos interfaces.

## Validación

Los resultados del CLI coinciden con el Excel generado por `Calculo_Salario_IRPF.py`:

```text
OK DAT_2026 bruto 30000: neto 23,124.00 €
OK DAT_2026 bruto 50000: neto 35,545.50 €
OK DAT_2025 bruto 30000: neto 23,128.20 €
OK DAT_2024 bruto 30000: neto 23,130.30 €
OK DAT_2012 bruto 30000: neto 22,666.59 €
VALIDACION_OK
```