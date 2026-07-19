import { JSDOM } from "jsdom";
import fs from "fs";
const html = fs.readFileSync(new URL("../halyard.html", import.meta.url), "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/" });
const w = dom.window;
if (!w.crypto.randomUUID) w.crypto.randomUUID = () => "id-" + Math.random().toString(36).slice(2);
const noop = () => {};
w.HTMLCanvasElement.prototype.getContext = function () {
  return { clearRect:noop, fillRect:noop, beginPath:noop, moveTo:noop, lineTo:noop, stroke:noop,
    fill:noop, fillText:noop, save:noop, restore:noop, arc:noop, setLineDash:noop, closePath:noop,
    set fillStyle(v){}, get fillStyle(){return "";}, set strokeStyle(v){}, get strokeStyle(){return "";},
    set lineWidth(v){}, get lineWidth(){return 0;}, set font(v){}, get font(){return "";} };
};
w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,AA";
w.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
w.HTMLDialogElement.prototype.close = function(){ this.open = false; };
const errs=[]; w.onerror=(m)=>errs.push(String(m));
await new Promise(r => setTimeout(r, 400));
console.log("boot errors:", errs.length ? errs.join("\n") : "none");
console.log("runSelfTest present:", typeof w.runSelfTest);
const p = w.runSelfTest();
const res = await Promise.race([p, new Promise(r=>setTimeout(()=>r("TIMEOUT"),8000))]);
if (res === "TIMEOUT") { console.log("HUNG. testOut says:\n" + w.document.getElementById("testOut").textContent.slice(0,800)); }
else if (!res) { console.log("returned nothing. testOut:\n" + w.document.getElementById("testOut").textContent.slice(0,600)); }
else { console.log("PASS:", res.pass, "FAIL:", res.fail);
  for (const t of res.results) if (!t.cond) console.log("  FAILED: " + t.name + "  " + t.detail); }
process.exit(res && res.fail === 0 ? 0 : 1);
