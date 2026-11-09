/**
 * Design system reference (design-system.html, development only): every token of styles/tokens.css
 * and every shared component of styles/components.css, drawn with the real stylesheets, in the current
 * theme. The token lists are read from the files themselves, so a new token shows up without touching
 * this page. Open it from the preview page, or with ?theme=dark.
 */
import "../styles/tokens.css";
import "../styles/components.css";
import "./designSystem.css";
import tokensCss from "../styles/tokens.css?raw";
import themeTs from "../theme.ts?raw";
import { DEFAULT_THEME, initTheme } from "../theme";
import { mountSettingsButton } from "../ui/settings";
import { CHEVRON_BACK, CHEVRON_FORWARD } from "../ui/icons";
import { LANG_CHANGE } from "../i18n";

const tokens = (prefix: string) => [...new Set([...tokensCss.matchAll(new RegExp(`(--${prefix}[\\w-]*)\\s*:`, "g"))].map((m) => m[1]))];
const themeTokens = [...new Set([...themeTs.matchAll(/set\("(--[\w-]+)"/g)].map((m) => m[1]))].filter((n) => !/^--(art-o|halo)$/.test(n));
const fixedColours = [...tokensCss.slice(tokensCss.indexOf("Fixed colours"), tokensCss.indexOf("Theme colours")).matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);

const swatch = (name: string) => `<figure class="sw"><span style="background:var(${name})"></span><figcaption>${name}</figcaption></figure>`;
const section = (title: string, body: string, note = "") => `<section class="ds-sec"><h2>${title}</h2>${note ? `<p class="hint">${note}</p>` : ""}${body}</section>`;

function render(): void {
  document.getElementById("ds")!.innerHTML = `
    <header class="ds-head"><h1>Design system</h1><span id="gear"></span></header>
    ${section("Theme colours", `<div class="sws">${themeTokens.filter((n) => !n.startsWith("--banner-grad")).map(swatch).join("")}</div>`,
      "Recomputed by theme.ts from the trip's three colours (here the default, Lilas), in light and dark mode.")}
    ${section("Fixed colours", `<div class="sws">${fixedColours.filter((n) => !/shadow|edge/.test(n)).map(swatch).join("")}</div>`)}
    ${section("Text sizes", tokens("text-").map((n) => `<p class="ds-row"><code>${n}</code><span style="font-size:var(${n})">Samedi à Bordeaux</span></p>`).join(""))}
    ${section("Weights", tokens("weight-").map((n) => `<p class="ds-row"><code>${n}</code><span style="font-weight:var(${n})">Marché des Capucins</span></p>`).join(""))}
    ${section("Space", tokens("space-").map((n) => `<p class="ds-row"><code>${n}</code><span class="bar" style="width:var(${n})"></span></p>`).join(""))}
    ${section("Radii", `<div class="sws">${tokens("radius-").map((n) => `<figure class="sw"><span class="box" style="border-radius:var(${n})"></span><figcaption>${n}</figcaption></figure>`).join("")}</div>`)}
    ${section("Shadows", `<div class="sws">${["--shadow-sm", "--shadow-pop", "--shadow-bar", "--shadow-dialog"].map((n) => `<figure class="sw"><span class="box" style="box-shadow:var(${n})"></span><figcaption>${n}</figcaption></figure>`).join("")}</div>`)}
    ${section("Buttons", `<div class="form"><div class="row">
        <button class="btn fill">Open</button><button class="btn">Back</button><button class="link-btn">Link</button></div>
      <div class="row"><button class="btn fill add">Save</button><button class="btn add">+ Add an activity</button>
        <button class="btn fill edit">Edit</button><button class="btn edit">Apply</button>
        <button class="btn danger">Delete</button><button class="btn danger" data-armed>Really delete?</button></div>
      <div class="row"><button class="btn small">Small</button><button class="btn small add">Small add</button><button class="btn small edit">Small edit</button><button class="btn small danger">Small delete</button><button class="btn fill add" disabled>Disabled</button></div></div>`,
      "Colour = what it does. Accent: navigation (.btn, .link-btn) · green: add or confirm (.add) · yellow: modify (.edit) · red: delete or discard (.danger; [data-armed] = second click confirms). .fill for the main action, .small inside lists.")}
    ${section("Arrows", `<div class="row"><button class="arrow-btn">${CHEVRON_BACK}</button><button class="arrow-btn">${CHEVRON_FORWARD}</button><button class="arrow-btn lg">${CHEVRON_BACK}</button><button class="arrow-btn lg" disabled>${CHEVRON_FORWARD}</button></div>`, "Only the chevron shows; hovering or pressing reveals the clickable area, darker than what is behind. .arrow-btn scrolls a strip · .arrow-btn.lg steps through panels · disabled at an end")}
    ${section("Chips and tooltip", `<div class="ds-banner"><div class="chips-demo">
        <span class="chip live">In 19 days</span><button class="chip">4 participants<span class="tip ds-show"><b>Participants</b>Camille<br>Hugo</span></button>
        <span class="chip">Meet at 12:30</span></div></div>`, "On the banner: .chip · .chip.live · .tip")}
    ${section("Tags", `<div class="row"><span class="tag">OPTIONAL</span><span class="tag all">EVERYONE</span><span class="tag now">NOW</span><span class="tag vote">GROUP CHOICE · 2 VOTES</span><span class="tag tie">TIE</span></div>`)}
    ${section("Panel", `<div class="panel" style="max-width:360px"><h2>Weather</h2><p class="sub">Panel title and subtitle.</p><p>Content.</p></div>`)}
    ${section("Form", `<div class="form" style="max-width:640px"><div class="row">
        <label class="field tiny">Start<input type="time" value="12:30"></label><label class="field narrow">Date<input type="date" value="2026-11-28"></label>
        <label class="field">Title<input value="Lunch"></label></div>
        <label class="field">Style<select><option>Everyone</option></select></label><label class="field">Description<textarea>Grilled meat.</textarea></label>
        <p class="hint">.hint text under a form.</p></div>`, ".form · .row · .field (.narrow, .tiny)")}
    ${section("Segmented choice", `<div class="seg" style="max-width:340px"><label><input type="radio" name="ds-seg" checked><span>Auto</span></label><label><input type="radio" name="ds-seg"><span>Light</span></label><label><input type="radio" name="ds-seg"><span>Dark</span></label></div>`)}
    ${section("Messages", `<div class="form" style="max-width:520px"><p class="msg">Link sent. Open it on this device.</p><p class="msg bad">Saving failed. Check your connection.</p></div>`)}
    ${section("Dialog", `<dialog class="dialog ds-dialog" open><div class="dialog-body"><div class="dialog-head"><h2>Settings</h2><button class="dialog-close">✕</button></div>
        <fieldset><legend>Language</legend><div class="seg"><label><input type="radio" name="ds-l"><span>English</span></label><label><input type="radio" name="ds-l" checked><span>Français</span></label></div></fieldset>
        <fieldset><legend>Organisation</legend><a class="btn fill">Open the admin page</a></fieldset></div></dialog>`, "dialog.dialog · .dialog-body · .dialog-head · .dialog-close")}
    ${section("Empty and error states", `<p class="error">This trip could not be loaded.</p>`)}`;
  const gear = document.getElementById("gear")!;
  mountSettingsButton(gear, "btn small settings-btn");
  mountSettingsButton(document.querySelector<HTMLElement>(".chips-demo")!);
}

initTheme(DEFAULT_THEME);
render();
document.addEventListener(LANG_CHANGE, render);
