import morphdom from "https://esm.sh/morphdom@2.7.8";

const NAME = window.BUILDER_NAME;
let state = null;
let pending = null; // {fields} afventer bekræftelse i modal

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const isMissing = (path) => (state?.missing || []).includes(path);
const sectionMissing = (prefix) => (state?.missing || []).some((m) => m.startsWith(prefix));
const cls = (bad) => (bad ? "invalid" : "");

async function fetchState() {
  const res = await fetch(`/api/builder/state?name=${encodeURIComponent(NAME)}`);
  state = await res.json();
  if (state.error) { alert(state.error); return; }
  render();
}

async function answer(fields, confirmed = false) {
  setStatus("Gemmer...");
  const res = await fetch("/api/builder/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: NAME, fields, confirmed }),
  });
  const data = await res.json();
  if (data.needs_confirmation) {
    showConfirm(data, fields);
    return;
  }
  if (data.error) {
    alert(data.error);
    render();
    return;
  }
  state = data;
  setStatus("Gemt.");
  render();
}

function setStatus(text) {
  const el = $("#save-status");
  if (el) el.textContent = text;
}

function showConfirm(data, fields) {
  pending = fields;
  $("#confirm-text").textContent = data.message;
  $("#confirm-modal").classList.add("open");
}

function hideConfirm() {
  pending = null;
  $("#confirm-modal").classList.remove("open");
}

// ── Race/klasse/baggrund-selects kodes som "Navn|Kilde" i value ───────────
function optionList(options, selected) {
  return (options || [])
    .map((o) => {
      const val = `${o.name}|${o.source ?? ""}`;
      const sel = o.name === selected ? "selected" : "";
      return `<option value="${esc(val)}" ${sel}>${esc(o.label)}</option>`;
    })
    .join("");
}

function parseCombo(value) {
  const [name, source] = value.split("|");
  return { name, source: source || null };
}

// ── <details>-boks: sammenfoldelig, åben hvis noget i den mangler ─────────
function wrapDetails(id, missing, titleHtml, bodyHtml) {
  return `<details class="step ${missing ? "missing" : ""}" ${missing ? "open" : ""} data-step="${id}">
    <summary>${titleHtml}</summary>
    <div class="step-body">${bodyHtml}</div>
  </details>`;
}

// ── Render: top-niveau + faner ────────────────────────────────────────────
function renderTop() {
  $("#total-level").textContent = `Niveau i alt: ${state.total_level ?? 0}`;

  const banner = $("#missing-banner");
  if (!state.e5tools_available) {
    banner.style.display = "block";
    banner.textContent = "/e5tools er ikke tilgængeligt lige nu - byggeren kan ikke slå regler op.";
  } else if (state.missing && state.missing.length) {
    banner.style.display = "block";
    banner.textContent = `${state.missing.length} valg mangler stadig (markeret med rød ramme).`;
  } else {
    banner.style.display = "none";
  }
}

// ── Karakter-siden ─────────────────────────────────────────────────────
function renderCharacterPage() {
  const c = state.choices;
  return `
    ${renderRace(c)}
    ${renderClasses(c)}
    ${renderBackground(c)}
    ${renderAbilities(c)}
  `;
}

function renderAsiChoice(basePath, sc, current) {
  const mode = current?.mode;
  const path = `${basePath}.${sc.id}`;
  const abilitySelect = (field, exclude, value) => `
    <select data-field="${path}.${field}">
      <option value="">Vælg...</option>
      ${sc.options.filter((a) => a !== exclude).map((a) => `<option value="${a}" ${a === value ? "selected" : ""}>${a}</option>`).join("")}
    </select>`;
  return `<div class="sub-choice">
    <span>${esc(sc.title)}</span>
    <label class="field"><span>Fordeling</span>
      <select data-field="${path}.mode">
        <option value="">Vælg...</option>
        <option value="2" ${mode === "2" ? "selected" : ""}>+2 til én evne</option>
        <option value="1-1" ${mode === "1-1" ? "selected" : ""}>+1 til to evner</option>
      </select>
    </label>
    ${mode === "2" ? `<label class="field"><span>+2 til</span>${abilitySelect("ability1", null, current.ability1)}</label>` : ""}
    ${mode === "1-1" ? `
      <label class="field"><span>+1 til</span>${abilitySelect("ability1", null, current.ability1)}</label>
      <label class="field"><span>+1 til (anden evne)</span>${abilitySelect("ability2", current.ability1, current.ability2)}</label>` : ""}
  </div>`;
}

function renderSubChoices(basePath, subChoices, storedChoices) {
  return (subChoices || [])
    .map((sc) => {
      const current = (storedChoices || {})[sc.id];
      if (sc.unknown) {
        return `<div class="sub-choice"><span>${esc(sc.title)}</span><div class="ftext">(Tilladte valg er ukendt, se PHB)</div></div>`;
      }
      if (sc.fixed) {
        return `<div class="sub-choice"><span>${esc(sc.title)}</span><div class="ftext">${esc(sc.options.join(", "))}</div></div>`;
      }
      if (sc.type === "asi") {
        return renderAsiChoice(basePath, sc, current || {});
      }
      if (sc.multiple) {
        const chosen = current || [];
        const chips = sc.options
          .map((o) => `<label data-field="${basePath}.${sc.id}" data-multi="1" data-value="${esc(o)}" class="${chosen.includes(o) ? "checked" : ""}"><input type="checkbox" ${chosen.includes(o) ? "checked" : ""}>${esc(o)}</label>`)
          .join("");
        return `<div class="sub-choice"><span>${esc(sc.title)}</span><div class="checklist">${chips}</div></div>`;
      }
      return `<div class="sub-choice field"><label class="field"><span>${esc(sc.title)}</span>
        <select data-field="${basePath}.${sc.id}">
          <option value="">Vælg...</option>
          ${sc.options.map((o) => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(o)}</option>`).join("")}
        </select></label></div>`;
    })
    .join("");
}

// Et feat-slot (ASI, Fighting Style, Epic Boon, race/baggrunds feat-valg) -
// bruges inline, lige der hvor den feature der giver det, står.
function renderFeatSlot(slot) {
  return `
    <div class="sub-choice">
      <span>${esc(slot.label)}</span>
      <select data-field-combo="feats.${slot.key}" class="${cls(!slot.chosen)}">
        <option value="|">Vælg...</option>
        ${optionList(slot.options, slot.chosen?.name)}
      </select>
      ${slot.chosen ? `<div class="feature-list" style="margin-top:.4rem"><div class="ftext">${esc(slot.text)}</div></div>` : ""}
      ${renderSubChoices(`feats.${slot.key}.choices`, slot.sub_choices, slot.chosen?.choices)}
    </div>`;
}

// Et direkte valg uden mellemliggende feat (fx Weapon Mastery: vælg N våben).
function renderWeaponChoice(basePath, wc) {
  const chosen = wc.chosen || [];
  const chips = wc.options
    .map((o) => `<label data-field="${basePath}" data-multi="1" data-value="${esc(o)}" class="${chosen.includes(o) ? "checked" : ""}"><input type="checkbox" ${chosen.includes(o) ? "checked" : ""}>${esc(o)}</label>`)
    .join("");
  return `<div class="sub-choice"><span>${esc(wc.title)}</span><div class="checklist">${chips}</div></div>`;
}

function renderRace(c) {
  const r = state.race;
  const subChoices = renderSubChoices("race.choices", r.sub_choices, c.race.choices);
  const otherField = r.is_other
    ? `<label class="field"><span>Navn på hjemmelavet race</span>
        <input type="text" data-field="race.other_name" value="${esc(c.race.other_name)}"></label>`
    : "";
  const traits = r.traits.length
    ? `<ul class="feature-list">${r.traits.map((t) => `<li><span class="fname">${esc(t.name)}</span><div class="ftext">${esc(t.text)}</div></li>`).join("")}</ul>`
    : "";
  const body = `
    <label class="field"><span>Race</span>
      <select data-field-combo="race" class="${cls(isMissing("race.name"))}">
        <option value="|">Vælg...</option>
        ${optionList(r.options, c.race.name)}
      </select>
    </label>
    ${otherField}
    ${subChoices}
    ${traits}
    ${r.feat_slot ? renderFeatSlot(r.feat_slot) : ""}
  `;
  return wrapDetails("race", sectionMissing("race.") || sectionMissing("feats.race"), "Race / Species", body);
}

function renderClasses(c) {
  const classes = state.classes || [];
  const blocks = classes.map((k) => {
    const base = `classes.${k.id}`;
    const subclassBlock = k.level >= k.subclass_level
      ? `<label class="field"><span>Subclass</span>
          <select data-field-combo-single="${base}.subclass" class="${cls(isMissing(`${base}.subclass`))}">
            <option value="">Vælg...</option>
            ${(k.subclass_options || []).map((o) => `<option value="${esc(o.name)}" ${o.name === k.subclass ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
          </select></label>`
      : "";
    const skillsBlock = k.skills_count
      ? `<div class="sub-choice"><span>Skills (${k.skills_count})</span><div class="checklist">
          ${k.skills_from.map((s) => {
            const chosen = (c.classes[k.id]?.choices.skills || []).includes(s);
            return `<label data-field="${base}.choices.skills" data-multi="1" data-value="${esc(s)}" class="${chosen ? "checked" : ""}"><input type="checkbox" ${chosen ? "checked" : ""}>${esc(s)}</label>`;
          }).join("")}
        </div></div>`
      : "";
    const extraProfBlock = (k.extra_proficiencies || []).length
      ? `<div class="sub-choice"><span>Giver desuden</span><div class="ftext">${esc(k.extra_proficiencies.join(", "))}</div></div>`
      : "";
    const features = k.features.length
      ? `<ul class="feature-list">${k.features.map((f) => `
          <li>
            <span class="fname">${esc(f.name)}</span><span class="flevel">niveau ${f.level}</span>
            <div class="ftext">${esc(f.text)}</div>
            ${f.feat_slot ? renderFeatSlot(f.feat_slot) : ""}
            ${f.weapon_choice ? renderWeaponChoice(`${base}.choices.weapon_mastery`, f.weapon_choice) : ""}
          </li>`).join("")}</ul>`
      : "";
    const spellsBlock = k.is_caster
      ? `<div class="sub-choice"><span>Spells</span><div class="checklist">
          ${k.spell_options.map((s) => {
            const known = (c.spells.known || []).includes(s);
            return `<label data-field="spells.known" data-multi="1" data-value="${esc(s)}" class="${known ? "checked" : ""}"><input type="checkbox" ${known ? "checked" : ""}>${esc(s)}</label>`;
          }).join("")}
        </div></div>`
      : "";
    const title = `<span>${esc(k.name || "Klasse")} ${k.is_primary ? '<span class="n">(primær - giver startudstyr)</span>' : ""}</span>
      <button type="button" class="btn secondary" data-remove-class="${k.id}">Fjern</button>`;
    const body = `
      <label class="field"><span>Klasse</span>
        <select data-field-combo="${base}" class="${cls(isMissing(`${base}.name`))}">
          <option value="|">Vælg...</option>
          ${optionList(k.options, k.name)}
        </select>
      </label>
      <label class="field"><span>Niveau (denne klasse)</span>
        <select data-field="${base}.level">
          ${Array.from({ length: 20 }, (_, i) => i + 1).map((n) => `<option value="${n}" ${n === k.level ? "selected" : ""}>${n}</option>`).join("")}
        </select>
      </label>
      ${skillsBlock}
      ${extraProfBlock}
      ${subclassBlock}
      ${renderClassHp(k, c)}
      ${features}
      ${spellsBlock}
    `;
    return wrapDetails(`class-${k.id}`, sectionMissing(base) || sectionMissing(`feats.${k.id}_`), title, body);
  }).join("");
  const notice = isMissing("classes") ? `<p class="missing-banner">Mindst én klasse kræves.</p>` : "";
  return `${notice}${blocks}<button type="button" class="btn" id="add-class-btn">+ Tilføj klasse</button>`;
}

function renderBackground(c) {
  const b = state.background;
  const split = c.background.choices.ability_split;
  const abilityBlock = b.ability_options.length
    ? `<div class="sub-choice">
        <span>Evne-bonus (${b.ability_options.join("/")})</span>
        <label class="field"><span>Fordeling</span>
          <select data-field="background.choices.ability_split.type" class="${cls(isMissing("background.choices.ability_split"))}">
            <option value="">Vælg...</option>
            <option value="2-1" ${split?.type === "2-1" ? "selected" : ""}>+2 til én, +1 til en anden</option>
            <option value="1-1-1" ${split?.type === "1-1-1" ? "selected" : ""}>+1 til alle tre</option>
          </select>
        </label>
        ${split?.type === "2-1" ? `
          <label class="field"><span>+2 til</span>
            <select data-field="background.choices.ability_split.plus2">
              <option value="">Vælg...</option>
              ${b.ability_options.map((a) => `<option value="${a}" ${split.plus2 === a ? "selected" : ""}>${a.toUpperCase()}</option>`).join("")}
            </select></label>
          <label class="field"><span>+1 til</span>
            <select data-field="background.choices.ability_split.plus1">
              <option value="">Vælg...</option>
              ${b.ability_options.filter((a) => a !== split.plus2).map((a) => `<option value="${a}" ${split.plus1 === a ? "selected" : ""}>${a.toUpperCase()}</option>`).join("")}
            </select></label>` : ""}
      </div>`
    : "";
  const featBlock = b.feat
    ? `<div class="sub-choice"><span>Feat fra baggrund</span>
        <div class="feature-list" style="margin-top:.3rem"><div class="fname">${esc(b.feat.name)}</div><div class="ftext">${esc(b.feat.text)}</div></div></div>`
    : "";
  const body = `
    <label class="field"><span>Baggrund</span>
      <select data-field-combo="background" class="${cls(isMissing("background.name"))}">
        <option value="|">Vælg...</option>
        ${optionList(b.options, c.background.name)}
      </select>
    </label>
    ${abilityBlock}
    ${featBlock}
    ${b.feat_slot ? renderFeatSlot(b.feat_slot) : ""}
  `;
  return wrapDetails("background", sectionMissing("background.") || sectionMissing("feats.background"), "Baggrund", body);
}

function renderAbilities(c) {
  const a = c.abilities;
  const scores = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  const body = `
    <label class="field"><span>Metode</span>
      <select data-field="abilities.method" class="${cls(isMissing("abilities.method"))}">
        <option value="">Vælg...</option>
        <option value="standard" ${a.method === "standard" ? "selected" : ""}>Standard Array</option>
        <option value="pointbuy" ${a.method === "pointbuy" ? "selected" : ""}>Point Buy</option>
        <option value="roll" ${a.method === "roll" ? "selected" : ""}>Rul selv (terningslag)</option>
      </select>
    </label>
    <div class="ability-grid">
      ${scores.map((s) => `
        <div class="ab">
          <div class="lbl">${s}</div>
          <input type="number" min="1" max="30" data-field="abilities.assigned.${s}" value="${a.assigned[s] ?? ""}" class="${cls(isMissing("abilities.assigned") && !a.assigned[s])}">
        </div>`).join("")}
    </div>
  `;
  return wrapDetails("abilities", sectionMissing("abilities."), "Evner", body);
}

function renderClassHp(k, c) {
  const group = (state.hp_levels || []).find((g) => g.class_id === k.id);
  if (!group) return "";
  const stored = (c.hp_rolls || {})[k.id] || {};
  // Primærklassens niveau 1 er altid makstal på terningen (PHB 2024s
  // multiclass-regel: "you gain the 1st-level hit points for a class only
  // when you are a 1st-level character") - vist som et LÅST felt, så man
  // visuelt kan se hvor det kommer fra, men gemmes ikke i hp_rolls (samme
  // som i dag, bare nu pr. klasse i stedet for kun for primærklassen).
  // En sekundær klasses EGEN niveau 1 er IKKE låst - den ruller/vælger som
  // alle andre niveauer, fordi karakteren ikke er "1st-level" når den
  // multiclasses ind i den.
  const lockedLevel1 = k.is_primary
    ? `<div class="dice-cell"><span>Niveau 1</span>
        <input type="number" value="${k.hit_die}" disabled title="Niveau 1 er altid makstal på terningen (d${k.hit_die}), ikke rullet">
      </div>`
    : "";
  const base = `hp_rolls.${k.id}`;
  const body = `
    <div class="dice-grid">
      ${lockedLevel1}
      ${group.levels.map((lvl) => `
        <div class="dice-cell">
          <span>Niveau ${lvl}</span>
          <input type="number" min="1" max="${k.hit_die}" data-field="${base}.${lvl}" value="${stored[lvl] ?? ""}" class="${cls(isMissing(`${base}.${lvl}`))}">
        </div>`).join("")}
    </div>
  `;
  return wrapDetails(`hp-${k.id}`, sectionMissing(`${base}.`), `HP-terningslag (d${k.hit_die})`, body);
}

// ── Udstyrs-siden ──────────────────────────────────────────────────────
function renderEquipmentPage() {
  const c = state.choices;
  const pkg = (packages, field, chosenKey) => Object.entries(packages || {})
    .map(([key, items]) => `
      <div class="equip-pkg ${chosenKey === key ? "chosen" : ""}" data-field="${field}" data-value="${key}">
        <strong>Pakke ${key}</strong>
        <ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
      </div>`).join("");
  return `
    ${wrapDetails("equip-class", isMissing("equipment.class_package"), "Udstyr fra klasse", pkg(state.equipment.class_packages, "equipment.class_package", c.equipment.class_package))}
    ${wrapDetails("equip-background", isMissing("equipment.background_package"), "Udstyr fra baggrund", pkg(state.equipment.background_packages, "equipment.background_package", c.equipment.background_package))}
  `;
}

// <details> bygges helt om ved hvert svar (innerHTML), så vi skal selv huske
// hvad brugeren har foldet ud/sammen - ellers springer ALT tilbage til
// missing-baserede standard hver gang ét felt ændres. Ukendte (nye) sektioner
// falder tilbage til missing-standarden, som før.
function captureOpenState() {
  const open = {};
  document.querySelectorAll("details.step[data-step]").forEach((d) => {
    open[d.dataset.step] = d.open;
  });
  return open;
}

function restoreOpenState(prevOpen) {
  document.querySelectorAll("details.step[data-step]").forEach((d) => {
    const id = d.dataset.step;
    if (id in prevOpen) d.open = prevOpen[id];
  });
}

function morphChildren(el, html) {
  morphdom(el, `<div>${html}</div>`, { childrenOnly: true });
}

function render() {
  renderTop();
  const prevOpen = captureOpenState();
  morphChildren($("#page-character"), renderCharacterPage());
  morphChildren($("#page-equipment"), renderEquipmentPage());
  restoreOpenState(prevOpen);
}

// ── Print-siden: character.yaml + sheets.yaml, renderet via den gamle karakterark.py ──
function setPrintBanner(text, { showButton = false, enabled = true } = {}) {
  const banner = $("#print-banner");
  const btn = $("#translate-btn");
  if (!text) {
    banner.style.display = "none";
    return;
  }
  $("#print-banner-text").textContent = text;
  btn.style.display = showButton ? "" : "none";
  btn.disabled = !enabled;
  banner.style.display = "flex";
}

async function loadPrintPage() {
  const output = $("#sheet-output");
  setPrintBanner("Henter karakterarket...");
  const res = await fetch(`/api/builder/sheet?name=${encodeURIComponent(NAME)}`);
  const data = await res.json();
  if (data.error) {
    output.srcdoc = "";
    setPrintBanner(data.error);
    return;
  }
  output.srcdoc = data.html;
  const n = (data.missing_descriptions || []).length;
  setPrintBanner(n ? `${n} regler/besværgelser mangler en dansk beskrivelse.` : "", { showButton: true });
}

async function translateMissing() {
  const btn = $("#translate-btn");
  btn.disabled = true;
  setPrintBanner("Genererer beskrivelser...", { showButton: true, enabled: false });
  const res = await fetch("/api/builder/translate", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: NAME }),
  });
  const data = await res.json();
  if (data.error) {
    setPrintBanner(data.error, { showButton: true });
    return;
  }
  const n = (data.missing_descriptions || []).length;
  setPrintBanner(n ? `${n} regler/besværgelser mangler stadig en dansk beskrivelse.` : "Alle beskrivelser er nu genereret.", { showButton: n > 0 });
}

// ── Event-delegation: ét sted for alle felter ─────────────────────────────
async function addClass() {
  setStatus("Gemmer...");
  const res = await fetch("/api/builder/class/add", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: NAME }),
  });
  state = await res.json();
  setStatus("Gemt.");
  render();
}

async function removeClass(classId) {
  setStatus("Gemmer...");
  const res = await fetch("/api/builder/class/remove", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: NAME, class_id: classId }),
  });
  state = await res.json();
  setStatus("Gemt.");
  render();
}

function wireEvents() {
  $(".tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    document.querySelectorAll(".tabs button[data-page]").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === `page-${btn.dataset.page}`));
    if (btn.dataset.page === "print") loadPrintPage();
  });

  $("#translate-btn").addEventListener("click", translateMissing);

  $("#confirm-yes").addEventListener("click", () => {
    const fields = pending;
    hideConfirm();
    if (fields) answer(fields, true);
  });
  $("#confirm-no").addEventListener("click", () => {
    hideConfirm();
    render();
  });

  document.querySelector("main").addEventListener("change", (e) => {
    const comboEl = e.target.closest("[data-field-combo]");
    if (comboEl) {
      const base = comboEl.dataset.fieldCombo;
      const { name, source } = parseCombo(comboEl.value);
      answer({ [`${base}.name`]: name || null, [`${base}.source`]: source });
      return;
    }
    const singleEl = e.target.closest("[data-field-combo-single]");
    if (singleEl) {
      answer({ [singleEl.dataset.fieldComboSingle]: singleEl.value || null });
      return;
    }
    const fieldEl = e.target.closest("[data-field]");
    if (fieldEl && !fieldEl.dataset.multi) {
      const path = fieldEl.dataset.field;
      let value = fieldEl.value;
      if (fieldEl.type === "number" || path.endsWith(".level")) value = value === "" ? null : Number(value);
      answer({ [path]: value });
    }
  });

  document.querySelector("main").addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove-class]");
    if (removeBtn) {
      e.preventDefault(); // ellers lukker/åbner klikket også <details>, da knappen sidder i <summary>
      removeClass(removeBtn.dataset.removeClass);
      return;
    }
    if (e.target.closest("#add-class-btn")) {
      addClass();
      return;
    }
    const chip = e.target.closest("[data-multi]");
    if (chip) {
      const path = chip.dataset.field;
      const val = chip.dataset.value;
      const current = getPath(state.choices, path) || [];
      const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
      answer({ [path]: next });
      return;
    }
    const pkgEl = e.target.closest(".equip-pkg");
    if (pkgEl) {
      answer({ [pkgEl.dataset.field]: pkgEl.dataset.value });
    }
  });
}

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

wireEvents();
fetchState();
if ($(".tabs button.active")?.dataset.page === "print") loadPrintPage();
