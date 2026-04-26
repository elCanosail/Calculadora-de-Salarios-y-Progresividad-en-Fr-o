// app.js — UI: tabla comparativa + gráfico barras + escalas
(function() {
  "use strict";

  const CCAA_KEYS = Object.keys(ESCALAS);
  const slider = document.getElementById("salary-slider");
  const numInput = document.getElementById("salary-input");
  const display = document.getElementById("salary-display");
  const edadSelect = document.getElementById("edad-select");
  const hijosSelect = document.getElementById("hijos-select");
  const ascendientesSelect = document.getElementById("ascendientes-select");
  const configSummary = document.getElementById("config-summary");
  const tbody = document.querySelector("#ccaa-table tbody");
  const barDiv = document.getElementById("bar-chart");
  const scaleDiv = document.getElementById("scale-chart");
  const pillsDiv = document.getElementById("ccaa-pills");

  let currentSalary = 35000;
  let currentNetoMadrid = null;
  let selectedScales = new Set(["supletorio", "madrid", "cataluna", "comunidad_valenciana"]);
  let selectedIPCYear = 2019;

  // --- Configuración ---
  function getConfig() {
    return {
      edad: edadSelect?.value || "normal",
      hijos: parseInt(hijosSelect?.value || "0"),
      ascendientes: parseInt(ascendientesSelect?.value || "0"),
      discapacidad: 0,
      tributacion: "individual"
    };
  }

  function updateConfigSummary(config) {
    if (!configSummary) return;
    const parts = [];
    if (config.edad === "senior") parts.push("≥65");
    else if (config.edad === "mayor") parts.push("≥75");
    if (config.hijos > 0) parts.push(config.hijos + (config.hijos === 1 ? " hijo" : " hijos"));
    if (config.ascendientes > 0) parts.push(config.ascendientes + " ascendiente" + (config.ascendientes > 1 ? "s" : ""));
    configSummary.innerHTML = parts.length > 0 ? "Mínimo aplicado: " + parts.join(", ") : "Contribuyente individual, sin mínimos adicionales";
  }

  // --- Sync inputs ---
  function setSalary(v) {
    v = Math.max(10000, Math.min(500000, Math.round(v / 100) * 100));
    currentSalary = v;
    slider.value = v;
    numInput.value = v;
    display.textContent = v.toLocaleString("es-ES") + " €";
    update();
  }

  slider.addEventListener("input", () => setSalary(+slider.value));
  numInput.addEventListener("input", () => setSalary(+numInput.value));

  // --- Config change triggers update ---
  if (edadSelect) edadSelect.addEventListener("change", update);
  if (hijosSelect) hijosSelect.addEventListener("change", update);
  if (ascendientesSelect) ascendientesSelect.addEventListener("change", update);

  // --- Highlight table row by CCAA key ---
  function highlightTableRow(key) {
    if (!tbody) return;
    tbody.querySelectorAll('tr').forEach(tr => {
      if (key && tr.dataset.key === key) {
        tr.classList.add('highlighted');
        tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        tr.classList.remove('highlighted');
      }
    });
  }

  // --- Highlight bar by CCAA key + show tooltip ---
  function highlightBar(key, results) {
    const tooltip = document.getElementById('bar-tooltip');
    const supletorioNeto = results.find(r => r.key === 'supletorio')?.res.neto || 0;
    barDiv.querySelectorAll('.bar-row').forEach(r => {
      if (key && r.dataset.key === key) {
        r.classList.add('selected');
        // Show tooltip for this bar
        if (tooltip && key) {
          const res = results.find(x => x.key === key);
          if (res) {
            const delta = res.res.neto - supletorioNeto;
            const deltaClass = delta > 0 ? 'positive' : (delta < 0 ? 'negative' : '');
            const deltaStr = key === 'supletorio' ? '' : `<span class="tt-delta ${deltaClass}">${delta > 0 ? '+' : ''}${delta.toLocaleString('es-ES')}€</span>`;
            tooltip.innerHTML = `<div class="tt-name">${CCAA_NAMES[key]}</div>
              <div class="tt-row"><span class="tt-label">Neto</span><span class="tt-val">${fmt(res.res.neto)}</span></div>
              <div class="tt-row"><span class="tt-label">IRPF</span><span class="tt-val">${fmt(res.res.irpfFinal)}</span></div>
              <div class="tt-row"><span class="tt-label">Tipo ef.</span><span class="tt-val">${fmtPct(res.res.tipoEfectivo)}</span></div>
              <div class="tt-row"><span class="tt-label">Tipo máx.</span><span class="tt-val">${fmtPct(res.res.tipoMax)}</span></div>
              <div class="tt-row"><span class="tt-label">Coste lab.</span><span class="tt-val">${fmt(res.res.costeLaboral)}</span></div>
              ${deltaStr ? '<div class="tt-row"><span class="tt-label">vs Supletorio</span>' + deltaStr + '</div>' : ''}`;
            const rect = r.getBoundingClientRect();
            const chartRect = barDiv.getBoundingClientRect();
            const top = rect.top - chartRect.top + rect.height / 2;
            const left = rect.right - chartRect.left + 8;
            tooltip.style.top = top + 'px';
            tooltip.style.transform = 'translateY(-50%)';
            if (left + 220 > barDiv.clientWidth) {
              tooltip.style.left = 'auto';
              tooltip.style.right = (barDiv.clientWidth - (rect.left - chartRect.left) + 8) + 'px';
            } else {
              tooltip.style.left = left + 'px';
              tooltip.style.right = 'auto';
            }
            tooltip.classList.add('visible');
          }
        }
      } else {
        r.classList.remove('selected');
      }
    });
  }

  // --- Bar chart (pure CSS/HTML) ---
  function renderBarChart(results) {
    const sorted = [...results].sort((a, b) => b.res.neto - a.res.neto);
    const maxNeto = sorted[0].res.neto;
    const minNeto = sorted[sorted.length - 1].res.neto;
    const supletorioNeto = results.find(r => r.key === "supletorio")?.res.neto || 0;
    // Broken axis: start from below min to amplify differences
    const range = maxNeto - minNeto;
    const baseline = Math.max(0, minNeto - range * 0.3);
    const span = maxNeto - baseline;

    // Dynamic height: each bar row needs ~28px (20px bar + 4px gap + 4px padding)
    const rowHeight = 28;
    const chartHeight = sorted.length * rowHeight + 40; // 40px for baseline label + padding
    barDiv.style.height = chartHeight + 'px';

    let html = '<div class="bars" style="position:relative">';
    // Baseline indicator
    html += `<div class="bar-baseline">Eje desde ${fmt(Math.round(baseline))}</div>`;
    for (const r of sorted) {
      const pct = span > 0 ? ((r.res.neto - baseline) / span * 100) : 0;
      const delta = r.res.neto - supletorioNeto;
      const color = r.key === "supletorio" ? "var(--accent)" : (delta > 0 ? "#059669" : (delta < 0 ? "#dc2626" : "var(--muted)"));
      html += `
        <div class="bar-row" data-key="${r.key}" title="">
          <div class="bar-label">${CCAA_NAMES[r.key]}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="bar-val">${fmt(r.res.neto)}</div>
        </div>`;
    }
    // Tooltip (single, positioned by JS)
    html += '<div class="bar-tooltip" id="bar-tooltip"></div>';
    html += '</div>';
    barDiv.innerHTML = html;

    // Bind click/tap to show tooltip + highlight table row
    const tooltip = document.getElementById('bar-tooltip');
    let activeKey = null;

    barDiv.querySelectorAll('.bar-row').forEach(row => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = row.dataset.key;
        if (activeKey === key) {
          // Deselect
          activeKey = null;
          tooltip.classList.remove('visible');
          barDiv.querySelectorAll('.bar-row').forEach(r => r.classList.remove('selected'));
          highlightTableRow(null);
          return;
        }
        activeKey = key;
        barDiv.querySelectorAll('.bar-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
        highlightTableRow(key);

        // Find result for this key
        const r = results.find(r => r.key === key);
        const delta = r.res.neto - supletorioNeto;
        const deltaClass = delta > 0 ? 'positive' : (delta < 0 ? 'negative' : '');
        const deltaStr = r.key === 'supletorio' ? '' : `<span class="tt-delta ${deltaClass}">${delta > 0 ? '+' : ''}${delta.toLocaleString('es-ES')}€</span>`;
        tooltip.innerHTML = `<div class="tt-name">${CCAA_NAMES[r.key]}</div>
          <div class="tt-row"><span class="tt-label">Neto</span><span class="tt-val">${fmt(r.res.neto)}</span></div>
          <div class="tt-row"><span class="tt-label">IRPF</span><span class="tt-val">${fmt(r.res.irpfFinal)}</span></div>
          <div class="tt-row"><span class="tt-label">Tipo ef.</span><span class="tt-val">${fmtPct(r.res.tipoEfectivo)}</span></div>
          <div class="tt-row"><span class="tt-label">Tipo máx.</span><span class="tt-val">${fmtPct(r.res.tipoMax)}</span></div>
          <div class="tt-row"><span class="tt-label">Coste lab.</span><span class="tt-val">${fmt(r.res.costeLaboral)}</span></div>
          ${deltaStr ? '<div class="tt-row"><span class="tt-label">vs Supletorio</span>' + deltaStr + '</div>' : ''}`;

        // Position tooltip - responsive: centered on mobile, side on desktop
        const isMobile = window.innerWidth <= 640;
        if (isMobile) {
          // Mobile: center tooltip below/above the bar
          tooltip.style.position = 'fixed';
          tooltip.style.top = '50%';
          tooltip.style.left = '50%';
          tooltip.style.transform = 'translate(-50%, -50%)';
          tooltip.style.right = 'auto';
        } else {
          // Desktop: position to the side
          const rect = row.getBoundingClientRect();
          const chartRect = barDiv.getBoundingClientRect();
          const top = rect.top - chartRect.top + rect.height / 2;
          const left = rect.right - chartRect.left + 8;
          tooltip.style.position = 'absolute';
          tooltip.style.top = top + 'px';
          tooltip.style.transform = 'translateY(-50%)';
          if (left + 220 > barDiv.clientWidth) {
            tooltip.style.left = 'auto';
            tooltip.style.right = (barDiv.clientWidth - (rect.left - chartRect.left) + 8) + 'px';
          } else {
            tooltip.style.left = left + 'px';
            tooltip.style.right = 'auto';
          }
        }
        tooltip.classList.add('visible');
      });
    });

    // Click outside closes tooltip
    document.addEventListener('click', () => {
      if (activeKey) {
        activeKey = null;
        tooltip.classList.remove('visible');
        barDiv.querySelectorAll('.bar-row').forEach(r => r.classList.remove('selected'));
        highlightTableRow(null);
      }
    });
  }

  // --- Table ---
  function renderTable(results) {
    const supletorio = results.find(r => r.key === "supletorio");
    const sorted = [...results].sort((a, b) => b.res.neto - a.res.neto);

    let html = "";
    sorted.forEach((r, i) => {
      const delta = r.res.neto - (supletorio?.res.neto || 0);
      const rowClass = i === 0 ? "best" : (i === sorted.length - 1 ? "worst" : "");
      const deltaClass = delta > 0 ? "positive" : (delta < 0 ? "negative" : "");
      const deltaStr = r.key === "supletorio" ? "—" : `<span class="delta ${deltaClass}">${fmtDelta(delta)}</span>`;

      const costeLabPct = r.res.bruto > 0 ? (r.res.costeLaboral / r.res.bruto * 100) : 0;
      html += `<tr class="${rowClass}" data-key="${r.key}" title="Coste laboral: ${fmt(r.res.costeLaboral)} (${costeLabPct.toFixed(1)}% del bruto) · SS tra: ${fmt(r.res.cotTra)} · SS emp: ${fmt(r.res.cotEmpresarial)}">
        <td class="pos">${i + 1}</td>
        <td>${CCAA_NAMES[r.key]}</td>
        <td class="money">${fmt(r.res.neto)}</td>
        <td class="money">${fmt(r.res.irpfFinal)}</td>
        <td class="pct">${fmtPct(r.res.tipoEfectivo)}</td>
        <td class="pct">${fmtPct(r.res.tipoMax)}</td>
        <td class="money" title="${fmt(r.res.cotEmpresarial)} SS empresarial + ${fmt(r.res.bruto)} bruto">${fmt(r.res.costeLaboral)}</td>
        <td>${deltaStr}</td>
      </tr>`;
    });
    tbody.innerHTML = html;

    // Bind click/tap on table rows to highlight bar + show tooltip
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = tr.dataset.key;
        if (!key) return;

        const allResults = CCAA_KEYS.map(k => ({ key: k, res: calcularIRPF(currentSalary, k, getConfig()) }));
        highlightBar(key, allResults);
        highlightTableRow(key);
      });
    });
  }

  // --- Scale chart (step function) ---
  function renderScaleChart() {
    const maxBase = 200000;
    const step = 500;
    const colors = {
      supletorio: "#64748b",
      madrid: "#059669",
      cataluna: "#dc2626",
      comunidad_valenciana: "#f59e0b",
      andalucia: "#8b5cf6",
      extremadura: "#0891b2",
      canarias: "#d97706",
      baleares: "#be185d",
      aragon: "#4f46e5",
      asturias: "#15803d",
      galicia: "#b45309",
      cantabria: "#0e7490",
      castilla_y_leon: "#7c3aed",
      castilla_la_mancha: "#c026d3",
      la_rioja: "#ea580c",
      murcia: "#0d9488",
      navarra: "#e11d48",
      pais_vasco: "#1d4ed8",
      ceuta: "#a3a3a3",
      melilla: "#a3a3a3"
    };

    const datasets = [];
    for (const key of selectedScales) {
      const escala = ESCALAS[key];
      if (!escala) continue;
      const points = [];
      for (let b = 0; b <= maxBase; b += step) {
        let tipoEff = 0;
        if (b > 0) {
          let cuota = 0, prev = 0;
          for (const [lim, tipo] of escala) {
            if (b > prev) {
              const base = Math.min(b, lim) - prev;
              cuota += base * tipo;
            }
            prev = lim;
          }
          tipoEff = cuota / b * 100;
        }
        points.push({ x: b, y: +tipoEff.toFixed(2) });
      }
      datasets.push({
        label: CCAA_NAMES[key],
        data: points,
        borderColor: colors[key] || "#64748b",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0
      });
    }

    // Simple SVG chart (no external deps)
    const W = scaleDiv.clientWidth || 800;
    const H = 380;
    const margin = { top: 20, right: 20, bottom: 40, left: 55 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const maxTipo = 55;
    const scaleX = v => margin.left + (v / maxBase) * w;
    const scaleY = v => margin.top + h - (v / maxTipo) * h;

    let svg = `<svg viewBox="0 0 ${W} ${H}" class="scale-svg">`;

    // Grid
    for (let t = 0; t <= maxTipo; t += 10) {
      const y = scaleY(t);
      svg += `<line x1="${margin.left}" y1="${y}" x2="${W - margin.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
      svg += `<text x="${margin.left - 5}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="11">${t}%</text>`;
    }
    for (let b = 0; b <= maxBase; b += 50000) {
      const x = scaleX(b);
      svg += `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${H - margin.bottom}" stroke="#e2e8f0" stroke-width="1"/>`;
      svg += `<text x="${x}" y="${H - margin.bottom + 18}" text-anchor="middle" fill="#64748b" font-size="11">${(b/1000).toFixed(0)}k</text>`;
    }

    // Lines
    for (const ds of datasets) {
      let d = `M ${scaleX(ds.data[0].x)} ${scaleY(ds.data[0].y)}`;
      for (let i = 1; i < ds.data.length; i++) {
        d += ` L ${scaleX(ds.data[i].x)} ${scaleY(ds.data[i].y)}`;
      }
      svg += `<path d="${d}" fill="none" stroke="${ds.borderColor}" stroke-width="2"/>`;
    }

    // Legend
    let lx = margin.left;
    const ly = margin.top + 4;
    for (const ds of datasets) {
      svg += `<rect x="${lx}" y="${ly - 8}" width="12" height="12" fill="${ds.borderColor}" rx="2"/>`;
      svg += `<text x="${lx + 16}" y="${ly + 2}" fill="#0f172a" font-size="11">${ds.label}</text>`;
      lx += ds.label.length * 7 + 30;
    }

    // Axis labels
    svg += `<text x="${W / 2}" y="${H - 2}" text-anchor="middle" fill="#64748b" font-size="11">Base liquidable (€)</text>`;

    svg += "</svg>";
    scaleDiv.innerHTML = svg;
  }

  // --- Pills ---
  function renderPills() {
    let html = "";
    for (const key of CCAA_KEYS) {
      const active = selectedScales.has(key) ? "active" : "";
      html += `<button class="pill ${active}" data-key="${key}">${CCAA_NAMES[key]}</button>`;
    }
    pillsDiv.innerHTML = html;

    pillsDiv.querySelectorAll(".pill").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.key;
        if (selectedScales.has(k)) {
          if (selectedScales.size > 1) selectedScales.delete(k);
        } else {
          selectedScales.add(k);
        }
        renderPills();
        renderScaleChart();
      });
    });
  }

  // --- Update all ---
  function update() {
    const config = getConfig();
    updateConfigSummary(config);
    const results = CCAA_KEYS.map(key => ({ key, res: calcularIRPF(currentSalary, key, config) }));
    currentNetoMadrid = results.find(r => r.key === "madrid")?.res.neto || null;
    renderBarChart(results);
    renderTable(results);
    renderScaleChart();
    updateMeiNotice();
    renderYearComparison();
    renderRadiografia();
    renderIPCComparison();
    renderTramosDesglose();
  }

  function updateMeiNotice() {
    const notice = document.getElementById("mei-notice");
    if (!notice) return;
    const res = calcularIRPF(currentSalary, "madrid");
    const parts = [];
    parts.push("SS: " + fmt(res.cotSS) + " (6.35% comunes) + MEI: " + fmt(Math.round(res.baseSS * 0.0013)) + " (0.13%)");
    if (res.cotSolidaridad > 0) {
      parts.push("Solidaridad: " + fmt(res.cotSolidaridad) + " (1/6 trabajador)");
    }
    parts.push("Base m\u00e1x. SS: " + fmt(Math.round(BASE_MAX_SS)) + " \u20ac/a\u00f1o");
    notice.innerHTML = parts.join(" · ");
  }

  // --- Verify with AEAT reference values ---
  function renderVerify() {
    const card = document.getElementById("verify-card");
    if (!card) return;

    const refs = [
      { key: "supletorio", bruto: 35000, expected: { neto: 26401, irpf: 6331 } },
      { key: "madrid", bruto: 35000, expected: { neto: 26798, irpf: 5934 } },
      { key: "cataluna", bruto: 35000, expected: { neto: 26322, irpf: 6410 } },
      { key: "supletorio", bruto: 60000, expected: { neto: 41444, irpf: 14668 } },
      { key: "extremadura", bruto: 35000, expected: { neto: 25841, irpf: 6891 } },
    ];

    let html = '<div class="table-wrap"><table><thead><tr><th>Caso</th><th>Neto (nuestro)</th><th>Neto (AEAT)</th><th>Δ</th><th>IRPF (nuestro)</th><th>IRPF (AEAT)</th><th>Δ</th><th>OK</th></tr></thead><tbody>';

    let allOk = true;
    for (const ref of refs) {
      const res = calcularIRPF(ref.bruto, ref.key, { edad: "normal", hijos: 0, ascendientes: 0, discapacidad: 0, tributacion: "individual" });
      const dn = res.neto - ref.expected.neto;
      const di = res.irpfFinal - ref.expected.irpf;
      const ok = Math.abs(dn) <= 5 && Math.abs(di) <= 5;
      if (!ok) allOk = false;
      html += '<tr><td>' + CCAA_NAMES[ref.key] + ' ' + fmt(ref.bruto) + '</td><td class="money">' + fmt(res.neto) + '</td><td class="money">' + fmt(ref.expected.neto) + '</td><td class="money' + (Math.abs(dn) <= 5 ? '' : ' negative') + '">' + (dn >= 0 ? '+' : '') + dn.toLocaleString("es-ES") + '€</td><td class="money">' + fmt(res.irpfFinal) + '</td><td class="money">' + fmt(ref.expected.irpf) + '</td><td class="money' + (Math.abs(di) <= 5 ? '' : ' negative') + '">' + (di >= 0 ? '+' : '') + di.toLocaleString("es-ES") + '€</td><td>' + (ok ? '✅' : '⚠️') + '</td></tr>';
    }
    html += '</tbody></table></div>';
    html += '<p style="margin-top:0.75rem;font-size:0.8rem;color:var(--muted)">Autocomprobación interna (nuestro cálculo vs nuestro cálculo). Si sale ✅ el motor funciona. Para contrastar con AEAT, usa el <a href="https://www.agenciatributaria.gob.es/AEAT.internet/Inicio/Ayuda/_comp_Consultas_y_Simuladores/_Simuladores/Simulador_IRPF_2025/Simulador_IRPF_2025.shtml" target="_blank" rel="noopener">simulador oficial</a>.</p>';
    card.innerHTML = html;
  }

  // --- Year comparison ---
  function renderYearComparison() {
    const table = document.getElementById("year-compare-table");
    const chart = document.getElementById("year-compare-chart");
    if (!table) return;

    const config = getConfig();
    const years = [2024, 2025, 2026];
    const ccaa = "madrid";

    let html = '<div class="table-wrap"><table><thead><tr><th>Año</th><th>Bruto</th><th>SS trab.</th><th>IRPF</th><th>Neto</th><th>Coste laboral</th><th>Tipo ef.</th></tr></thead><tbody>';

    for (const year of years) {
      const res = calcularIRPFYear(currentSalary, ccaa, year, config);
      html += '<tr><td><strong>' + year + '</strong></td><td>' + fmt(res.bruto) + '</td><td>' + fmt(res.cotTra) + '</td><td>' + fmt(res.irpfFinal) + '</td><td class="money">' + fmt(res.neto) + '</td><td>' + fmt(res.costeLaboral) + '</td><td>' + fmtPct(res.tipoEfectivo) + '</td></tr>';
    }
    html += '</tbody></table></div>';
    html += '<p style="margin-top:0.75rem;font-size:0.8rem;color:var(--muted)">Valores para ' + CCAA_NAMES[ccaa] + ' a ' + fmt(currentSalary) + ' bruto.</p>';
    table.innerHTML = html;

    // Mini bar chart
    const results = years.map(y => ({ year: y, res: calcularIRPFYear(currentSalary, ccaa, y, config) }));
    const maxNeto = Math.max(...results.map(r => r.res.neto));
    const minNeto = Math.min(...results.map(r => r.res.neto));
    const baseline = Math.max(0, minNeto - (maxNeto - minNeto) * 0.3);
    const span = maxNeto - baseline;

    let chartHtml = '<div class="bars">';
    for (const r of results) {
      const pct = span > 0 ? ((r.res.neto - baseline) / span * 100) : 50;
      const color = r.year === 2026 ? "var(--accent)" : (r.year === 2025 ? "#059669" : "#64748b");
      chartHtml += '<div class="bar-row" title="' + r.year + ': ' + fmt(r.res.neto) + '"><div class="bar-label">' + r.year + '</div><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div><div class="bar-val">' + fmt(r.res.neto) + '</div></div>';
    }
    chartHtml += '</div>';
    chart.innerHTML = chartHtml;
  }

  // --- Panel: Radiografía del Coste ---
  function renderRadiografia() {
    const bruto = currentSalary || parseFloat(numInput.value) || 0;
    if (bruto <= 0) return;

    const coste = calculateCosteEmpresa(bruto);
    const neto = currentNetoMadrid || (bruto * 0.75); // fallback
    const irpf = bruto - neto - coste.ssTrabajador;

    // Donut chart
    const svg = document.getElementById("coste-donut");
    if (svg) {
      const total = coste.costeTotal;
      const data = [
        { label: "Neto", value: neto, color: "#10b981", percent: (neto/total)*100 },
        { label: "IRPF", value: irpf, color: "#ef4444", percent: (irpf/total)*100 },
        { label: "SS trabajador", value: coste.ssTrabajador, color: "#f59e0b", percent: (coste.ssTrabajador/total)*100 },
        { label: "SS empresa", value: coste.ssEmpresa, color: "#ec4899", percent: (coste.ssEmpresa/total)*100 }
      ];

      let svgHtml = '';
      let cumulativePercent = 0;
      const cx = 100, cy = 100, r = 80, innerR = 55;

      for (const d of data) {
        if (d.percent < 1) continue;
        const startAngle = (cumulativePercent / 100) * Math.PI * 2 - Math.PI / 2;
        cumulativePercent += d.percent;
        const endAngle = (cumulativePercent / 100) * Math.PI * 2 - Math.PI / 2;

        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const x3 = cx + innerR * Math.cos(endAngle);
        const y3 = cy + innerR * Math.sin(endAngle);
        const x4 = cx + innerR * Math.cos(startAngle);
        const y4 = cy + innerR * Math.sin(startAngle);

        const largeArc = d.percent > 50 ? 1 : 0;

        svgHtml += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z" fill="${d.color}" class="donut-segment" data-label="${d.label}: ${fmt(d.value)} (${d.percent.toFixed(1)}%)"/>`;
      }

      // Center circle
      svgHtml += `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="var(--bg)" class="donut-center"/>`;
      svgHtml += `<text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="10" fill="var(--muted)">Coste</text>`;
      svgHtml += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--fg)">${fmt(coste.costeTotal)}</text>`;

      svg.innerHTML = svgHtml;

      // Legend
      const legend = document.getElementById("donut-legend");
      if (legend) {
        legend.innerHTML = data.map(d =>
          `<span class="legend-item"><span class="legend-dot" style="background:${d.color}"></span>${d.label} ${d.percent.toFixed(1)}%</span>`
        ).join('');
      }
    }

    // Desglose texto
    const desglose = document.getElementById("coste-desglose");
    if (desglose) {
      desglose.innerHTML = `
        <div class="coste-row"><span class="coste-label">💰 Tu neto anual</span><span class="coste-value neto">${fmt(neto)}</span></div>
        <div class="coste-row"><span class="coste-label">🏛️ IRPF retenido</span><span class="coste-value irpf">${fmt(irpf)}</span></div>
        <div class="coste-row"><span class="coste-label">🛡️ SS trabajador (${coste.ssTrabajadorPercent.toFixed(2)}%)</span><span class="coste-value ss-trab">${fmt(coste.ssTrabajador)}</span></div>
        <div class="coste-row total-row"><span class="coste-label">📄 Salario bruto</span><span class="coste-value bruto">${fmt(bruto)}</span></div>
        <div class="separator"></div>
        <div class="coste-row empresa-row"><span class="coste-label">🏢 SS empresa (+${coste.ssEmpresaPercent.toFixed(1)}%)</span><span class="coste-value ss-empresa">${fmt(coste.ssEmpresa)}</span></div>
        <div class="coste-row total-empresa-row"><span class="coste-label">💸 Coste TOTAL empresa</span><span class="coste-value total-empresa">${fmt(coste.costeTotal)}</span></div>
        <div style="margin-top:0.5rem;font-size:0.78rem;color:var(--muted);text-align:center">Ratio empresa/trabajador: ${coste.ratioEmpresaTrabajador.toFixed(2)}×</div>
      `;
    }
  }

  // --- Panel: Comparativa IPC ---
  function renderIPCSelector() {
    const container = document.getElementById("ipc-year-selector");
    if (!container) return;

    const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
    container.innerHTML = years.map(y =>
      `<button class="year-btn ${y === selectedIPCYear ? 'active' : ''}" data-year="${y}">${y}</button>`
    ).join('');

    container.querySelectorAll('.year-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedIPCYear = parseInt(btn.dataset.year);
        renderIPCSelector();
        renderIPCComparison();
      });
    });
  }

  function renderIPCComparison() {
    const bruto = currentSalary || parseFloat(numInput.value) || 0;
    if (bruto <= 0) return;

    // Use Madrid neto as reference
    const neto = currentNetoMadrid || bruto * 0.75;
    const result = calculateIPCAjusted(neto, selectedIPCYear, 2026);
    if (!result) return;

    const necesitarias = result.salaryAjustado; // lo que necesitarías ganar hoy para mantener poder adquisitivo del año base
    const perdida = necesitarias - neto; // positivo = pierdes, negativo = ganas
    const isGanancia = perdida < 0;

    // Main display
    const perdidaEl = document.getElementById("ipc-perdida");
    if (perdidaEl) {
      perdidaEl.textContent = (isGanancia ? "+" : "−") + fmt(Math.abs(perdida));
      perdidaEl.className = "ipc-big-number " + (isGanancia ? "ganancia" : "");
    }

    const salarioActual = document.getElementById("ipc-salario-actual");
    if (salarioActual) salarioActual.textContent = fmt(neto);

    const salarioAjustado = document.getElementById("ipc-salario-ajustado");
    if (salarioAjustado) salarioAjustado.textContent = fmt(Math.round(neto * (result.ipcBase / result.ipcTarget)));
    // Muestra: valor de tu sueldo de hoy en euros del año seleccionado

    const anoBase = document.getElementById("ipc-ano-base");
    if (anoBase) anoBase.textContent = selectedIPCYear;

    // Timeline
    const timeline = document.getElementById("ipc-timeline");
    if (timeline) {
      const years = Object.keys(ipcData).map(Number).filter(y => y >= 2019 && y <= 2026).sort((a,b) => a-b);
      const maxPerdida = Math.max(...years.map(y => {
        const r = calculateIPCAjusted(neto, y, 2026);
        return r ? Math.abs(r.salaryAjustado - neto) : 0;
      }));

      let html = '<div class="ipc-timeline-title">Pérdida acumulada desde cada año hasta 2026</div>';
      html += '<div class="ipc-timeline-bars">';

      for (const year of years) {
        const r = calculateIPCAjusted(neto, year, 2026);
        if (!r) continue;
        const perdidaNeta = r.salaryAjustado - neto; // positivo = pierdes, negativo = ganas
        const heightPct = maxPerdida > 0 ? (Math.abs(perdidaNeta) / maxPerdida * 100) : 0;
        const isActive = year === selectedIPCYear;
        const color = perdidaNeta > 0 ? "#ef4444" : "#10b981";

        html += `<div class="ipc-timeline-bar ${isActive ? 'active' : ''}" data-year="${year}" title="${year}: ${fmt(perdidaNeta)}">`;
        html += `<div class="bar-fill" style="height:${Math.max(heightPct, 2)}%;background:${color}"></div>`;
        html += `<div class="bar-year">${year}</div>`;
        html += `</div>`;
      }

      html += '</div>';
      timeline.innerHTML = html;

      timeline.querySelectorAll('.ipc-timeline-bar').forEach(bar => {
        bar.addEventListener('click', () => {
          selectedIPCYear = parseInt(bar.dataset.year);
          renderIPCSelector();
          renderIPCComparison();
        });
      });
    }
  }

  // --- Panel: Desglose por Tramos IRPF ---
  function renderTramosDesglose() {
    const bruto = currentSalary || parseFloat(numInput.value) || 0;
    if (bruto <= 0) return;

    // Get Madrid scales for display
    const scales = ESCALAS.madrid || ESCALAS.supletorio;
    if (!scales) return;

    // Use full calcularIRPF to get accurate breakdown, then derive tramos
    const config = getConfig();
    const res = calcularIRPF(bruto, "madrid", config);

    // Build tramos from ESCALAS combined scale
    const tramos = [];
    let remaining = res.baseLiq;
    let totalIrpf = 0;

    for (let i = 0; i < scales.length && remaining > 0; i++) {
      const s = scales[i];
      const from = i === 0 ? 0 : scales[i - 1][0];
      const to = s[0] === Infinity ? 1000000000 : s[0];
      const rate = s[1];
      const tramoBase = Math.min(remaining, to - from);
      const total = tramoBase * rate;

      // Split proportionally based on estatal vs autonómica rates at this bracket
      let estatalRate = 0;
      let prevEst = 0;
      for (const [lim, r] of ESTATAL) {
        if (from > prevEst && from <= lim) { estatalRate = r; break; }
        prevEst = lim;
      }
      const autonomicoRate = Math.max(0, rate - estatalRate);
      const estatal = total * (estatalRate / rate);
      const autonomico = total * (autonomicoRate / rate);

      tramos.push({
        num: i + 1,
        from: from,
        to: s[0] === Infinity ? Infinity : to,
        estatalRate: estatalRate,
        autonomicoRate: autonomicoRate,
        totalRate: rate,
        base: tramoBase,
        estatal: estatal,
        autonomico: autonomico,
        total: total
      });

      totalIrpf += total;
      remaining -= tramoBase;
    }

    // Render stacked bars
    const chart = document.getElementById("tramos-chart");
    if (chart) {
      const maxTotal = Math.max(...tramos.map(t => t.total), 1);

      let html = '';
      for (const t of tramos) {
        const estatalPct = (t.estatal / maxTotal) * 100;
        const autonomicoPct = (t.autonomico / maxTotal) * 100;
        const labelFrom = t.from >= 1000000 ? "∞" : fmt(t.from);
        const labelTo = t.to >= 1000000 ? "∞" : fmt(t.to);

        html += `<div class="tramo-bar-container">`;
        html += `<div class="tramo-label"><span>Tramo ${t.num}: ${labelFrom} — ${labelTo}</span><span>${(t.totalRate * 100).toFixed(1)}%</span></div>`;
        html += `<div class="tramo-bar-bg">`;
        if (t.estatal > 0) {
          html += `<div class="tramo-bar-fill estatal" style="width:${estatalPct}%">${estatalPct > 15 ? fmt(t.estatal) : ''}</div>`;
        }
        if (t.autonomico > 0) {
          html += `<div class="tramo-bar-fill autonomico" style="width:${autonomicoPct}%">${autonomicoPct > 15 ? fmt(t.autonomico) : ''}</div>`;
        }
        html += `</div></div>`;
      }

      chart.innerHTML = html;
    }

    // Render table
    const tbody = document.getElementById("tramos-tbody");
    if (tbody) {
      tbody.innerHTML = tramos.map(t => {
        const labelFrom = t.from >= 1000000 ? "∞" : fmt(t.from);
        const labelTo = t.to >= 1000000 ? "∞" : fmt(t.to);
        return `<tr>
          <td>Tramo ${t.num}</td>
          <td>${labelFrom} — ${labelTo}</td>
          <td>${(t.estatalRate * 100).toFixed(1)}%</td>
          <td>${(t.autonomicoRate * 100).toFixed(1)}%</td>
          <td><strong>${(t.totalRate * 100).toFixed(1)}%</strong></td>
          <td>${fmt(t.total)}</td>
        </tr>`;
      }).join('');
    }
  }

  // --- Init ---
  renderPills();
  renderVerify();
  renderYearComparison();
  renderIPCSelector();
  setSalary(35000);

  // Formulas & Fuentes links now navigate directly to their pages (no modal)
  if (modalClose) modalClose.addEventListener("click", closeModal);
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal || e.target.classList.contains("modal-backdrop")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  // Resize handler
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderScaleChart(), 150);
  });
})();