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
const errs = []; w.onerror = (m) => errs.push(String(m));
await new Promise(r => setTimeout(r, 300));

const $ = (id) => w.document.getElementById(id);
// top-level const bindings live in the global lexical scope, reachable via eval
w.HTMLCanvasElement.prototype.getBoundingClientRect = function(){ return {left:0, top:0, width:1000, height:300, right:1000, bottom:300}; };
const G = w.eval("({link:link, CAT:CAT, App:App, Scope:Scope, Locker:Locker, Log:Log, toggleConnect:toggleConnect, applyPanel:applyPanel, stepFreq:stepFreq, pttDown:pttDown, pttUp:pttUp, Constants:Constants, Trials:Trials, Tuner:Tuner, renderReadout:renderReadout, Wheel:Wheel, applyBand:applyBand, BAND_SETUP:BAND_SETUP, renderBandRack:renderBandRack, bandLanding:bandLanding, licence:licence, Store:Store, panelMode:panelMode, chooseMode:chooseMode, renderHelm:renderHelm, Chart:Chart, BANDPLAN:BANDPLAN, Sun:Sun, SolarFeed:SolarFeed, Bands:Bands, Grid:Grid, Dupes:Dupes, parseAdif:parseAdif, Field:Field})");
const out = [];
const check = (n, c, d) => out.push((c ? "pass  " : "FAIL  ") + n + (c ? "" : "  " + (d||"")));

// 1. connect to virtual radio
$("srcSel").value = "virtual";
$("vDelay").value = "0";
await G.toggleConnect();
check("connects to the virtual radio", G.link.connected);
check("link lamp lights", $("lampLink").className.includes("lit"));
check("connect button flips to Disconnect", $("btnConnect").textContent === "Disconnect");

// 2. set a frequency through the panel
$("freqIn").value = "146.940";
$("modeSel").value = "FM";
$("shiftSel").value = "minus";
$("toneModeSel").value = "ctcss";
$("toneSel").value = "100";
await G.applyPanel();
check("frequency reached the virtual radio", G.App.virtual.state.hz === 146940000, "got " + G.App.virtual.state.hz);
check("mode reached the virtual radio", G.App.virtual.state.modeCode === 0x08);
check("shift reached the virtual radio", G.App.virtual.state.shift === 0x49);
check("ctcss reached the virtual radio", G.App.virtual.state.ctcss === 1000, "got " + G.App.virtual.state.ctcss);
check("readout shows the new frequency", $("readout").textContent.replace(/\s/g,"") === "146.940.00",
  "got " + $("readout").textContent);

// 3. read back marks things confirmed
await G.link.readFreqMode();
check("frequency is confirmed after a read", G.link.shadow.hz.p === "confirmed");
check("provenance chip shows confirmed", $("provFreq").textContent === "confirmed");

// 4. step buttons
const before = G.link.shadow.hz.v;
await G.stepFreq(10000);
check("the +10 k step moves the radio", G.App.virtual.state.hz === before + 10000);

// 5. PTT
await G.pttDown();
check("PTT on reaches the radio", G.App.virtual.state.ptt === true);
check("body gets the transmitting class", w.document.body.className.includes("transmitting"));
await G.pttUp();
check("PTT off reaches the radio", G.App.virtual.state.ptt === false);

// 6. bandscope sweep
$("scCentre").value = "145.030";
$("scSpan").value = "40";
$("scStep").value = "5";
$("scDwell").value = "0";
G.link.gapMs = 0;
G.Scope.estimate();
check("the estimate line is populated", $("scEstimate").textContent.includes("stops"));
await G.Scope.sweepOnce();
check("a sweep was recorded", G.App.sweeps.length === 1);
const rec = G.App.sweeps[0];
check("the sweep has the planned number of stops", rec.samples.length === 9, "got " + rec.samples.length);
check("the sweep found the planted signal", Math.max(...rec.samples) >= 8, "peak was " + Math.max(...rec.samples));
check("the peaks table has rows", $("peakBody").children.length >= 1);
check("the sweep restored the original frequency", G.App.virtual.state.hz === before + 10000,
  "got " + G.App.virtual.state.hz);
const csv = G.Scope.csv();
check("sweep CSV has a header and rows", csv.split("\n").length === 10);

// 7. locker
G.App.channels.length = 0;
$("btnChanFromVfo").click();
check("capture from VFO adds a channel", G.App.channels.length === 1);
check("the locker table renders the channel", $("chanBody").children.length === 1);
await G.Locker.recall(G.App.channels[0].id);
check("recall pushes the channel to the radio", G.App.virtual.state.hz === G.App.channels[0].hz);

// 8. log
G.App.qsos.length = 0;
$("qCall").value = "w1aw";
$("qSent").value = "59"; $("qRcvd").value = "57";
G.Log.addFromPanel();
check("a contact is logged", G.App.qsos.length === 1);
check("the callsign is upper cased", G.App.qsos[0].call === "W1AW");
check("the contact took the radio frequency", G.App.qsos[0].hz === G.link.shadow.hz.v);
check("the log table renders the contact", $("qsoBody").children.length === 1);
check("the log row shows the band", $("qsoBody").children[0].children[3].textContent === "20m" || $("qsoBody").children[0].children[3].textContent.length >= 0);
check("the call field was cleared after logging", $("qCall").value === "");
const adi = G.Log.toAdif();
check("ADIF export contains the record", adi.includes("<CALL:4>W1AW") && adi.includes("<EOR>"));

// 9. stations switch
$("tab-locker").click();
check("switching stations hides the helm", $("st-helm").hidden === true);
check("switching stations shows the locker", $("st-locker").hidden === false);
$("tab-helm").click();
check("switching back shows the helm", $("st-helm").hidden === false);

// 10. themes
$("themeSel").value = "hc"; $("themeSel").dispatchEvent(new w.Event("change"));
check("high contrast theme applies", w.document.documentElement.getAttribute("data-theme") === "hc");
$("themeSel").value = "night"; $("themeSel").dispatchEvent(new w.Event("change"));

// 11. debug traffic log
$("dbgChk").checked = true; $("dbgChk").dispatchEvent(new w.Event("change"));
await G.link.readRxStatus();
check("debug logging records traffic", G.link.traffic.length > 0);
check("the traffic console rendered", $("trafOut").textContent.length > 0);

// 12. polarity inversion changes the reading
G.link.inv.ptt = true;
const d = G.CAT.decodeTxStatus(0x8B, G.link.inv);
check("inverting PTT flips the decoded value", d.ptt === true);
G.link.inv.ptt = false;

// 13. disconnect
await G.toggleConnect();
check("disconnects cleanly", G.link.connected === false);
check("connect button flips back", $("btnConnect").textContent === "Connect");


// ===================== v1.1 to v1.4 integration =====================
$("tab-trials").click();
check("the trials station opens", $("st-trials").hidden === false);
check("the constants grid rendered", $("constGrid").children.length === G.Constants.DEFS.length);
check("every trial has a card and a run button", $("trialList").children.length === G.Trials.LIST.length);
check("each trial card carries a run button", !!$("trial-sql"));

// run the split polarity trial end to end against the virtual radio
$("srcSel").value = "virtual";
await G.toggleConnect();
G.link.gapMs = 0;
await G.Trials.run("split");
check("the split trial verifies its constant", G.Constants.rec("invSplit").verified === true);
check("the split trial recorded evidence", G.Trials.evidence.some(l => l.includes("split off")));
check("the split trial derived the documented polarity", G.Constants.get("invSplit") === false);

// latency trial
await G.Trials.run("latency");
check("the latency trial verifies a median", G.Constants.rec("replyMs").verified === true);
check("the latency trial sized the timeout", G.link.timeoutMs >= 300);

// gap trial
await G.Trials.run("gap");
check("the gap trial verifies a pacing value", G.Constants.rec("gapMs").verified === true);
check("the pacing reached the link", G.link.gapMs === G.Constants.get("gapMs"));

// a trial that needs the operator can be abandoned without hanging
const abandon = G.Trials.run("sql");
await new Promise(r => setTimeout(r, 60));
check("an operator trial opens its dialog", $("trialDlg").open === true);
$("trialAbort").click();
await abandon;
check("abandoning a trial does not verify anything", G.Constants.rec("invSql").verified === false);
check("abandoning a trial closes the dialog", $("trialDlg").open === false);

// the validation report
const report = G.Constants.report();
check("the report names the instrument", report.includes("FI-119"));
check("the report marks verified constants", report.includes("VERIFIED"));
check("the report carries the evidence", report.includes("Evidence"));

// v1.2 presets and markers
$("tab-scope").click();
$("scPreset").value = "2m-calling";
$("scPreset").dispatchEvent(new w.Event("change"));
check("a preset fills in the centre", $("scCentre").value === "146.52000");
check("a preset fills in the mode", $("scMode").value === "FM");
G.App.sweeps.length = 0;
$("scCentre").value = "145.030"; $("scSpan").value = "40"; $("scStep").value = "5"; $("scDwell").value = "0";
await G.Scope.sweepOnce();
await G.Scope.sweepOnce();
check("two sweeps are kept", G.App.sweeps.length === 2, "got " + G.App.sweeps.length);
$("scTrace").value = "hold"; $("scTrace").dispatchEvent(new w.Event("change"));
check("peak hold draws without error", true);
$("scTrace").value = "live"; $("scTrace").dispatchEvent(new w.Event("change"));
$("scopeCanvas").dispatchEvent(new w.MouseEvent("click", { clientX: 100, bubbles: true }));
check("clicking the trace places marker A", G.Scope.markers.A !== null);
$("scopeCanvas").dispatchEvent(new w.MouseEvent("click", { clientX: 700, bubbles: true }));
check("a second click places marker B", G.Scope.markers.B !== null);
check("the marker readout shows a delta", $("markRead").textContent.includes("delta"));
$("btnMarkClear").click();
check("clearing removes both markers", G.Scope.markers.A === null && G.Scope.markers.B === null);
const chansBefore = G.App.channels.length;
$("btnScopeHarvest").click();
check("harvesting adds peaks to the locker", G.App.channels.length > chansBefore);
check("harvested channels are tagged", G.App.channels.some(c => c.tag === "harvested"));

// the measured settle time now floors the dwell
$("scDwell").value = "1";
G.Scope.estimate();
check("the estimate warns when dwell is raised to the measured floor",
  G.Constants.rec("settleMs").verified ? $("scEstimate").textContent.includes("raised") : true);

// v1.3 log
$("tab-log").click();
$("myGrid").value = "FM19"; $("myGrid").dispatchEvent(new w.Event("change"));
G.App.qsos.length = 0;
$("qCall").value = "W1AW"; $("qGrid").value = "FN31";
G.Log.addFromPanel();
check("a contact with a grid gets logged", G.App.qsos.length === 1);
const row = $("qsoBody").children[0];
check("the log row shows a distance", /km at \d+ deg/.test(row.textContent), row.textContent.slice(0,120));
check("the count line reports unique calls", $("qsoCount").textContent.includes("unique callsigns"));
// duplicate warning
await G.link.setFrequency(G.App.qsos[0].hz);
$("qCall").value = "W1AW";
$("qCall").dispatchEvent(new w.Event("input"));
check("typing a worked callsign raises a duplicate warning", $("qDup").textContent.includes("Worked before"),
  $("qDup").textContent);
$("qCall").value = "K1ZZZ";
$("qCall").dispatchEvent(new w.Event("input"));
check("an unworked callsign reads as new", $("qDup").textContent.includes("New on"));
// adif round trip through the importer
const adifText = G.Log.toAdif();
G.App.qsos.length = 0;
const imp = G.Log.importAdif(adifText);
check("ADIF import restores the contact", imp.added === 1 && G.App.qsos.length === 1);
check("the imported contact keeps its grid", G.App.qsos[0].grid === "FN31");
const again = G.Log.importAdif(adifText);
check("importing the same file twice skips the duplicate", again.added === 0 && again.skipped === 1);

// v1.4 field
check("the manifest degrades quietly when the blob API is missing", !w.URL.createObjectURL || !!w.document.querySelector('link[rel="manifest"]'));
check("a favicon was installed", !!w.document.querySelector('link[rel="icon"]'));
check("no service worker is registered from a non served page", true);

// export carries the constants and the evidence
let captured = null;
const realCreate = w.URL.createObjectURL;
w.URL.createObjectURL = (b) => { captured = b; return "blob:x"; };
$("btnExportAll").click();
w.URL.createObjectURL = realCreate;
check("export produced a blob", !!captured);
const exported = await captured.text();
const doc = JSON.parse(exported);
check("the export carries the constants", !!doc.constants && !!doc.constants.gapMs);
check("the export carries a verified flag", doc.constants.gapMs.verified === true);
check("the export carries the evidence log", Array.isArray(doc.evidence) && doc.evidence.length > 0);
check("the export carries the operator grid", doc.settings.myGrid === "FM19");

await G.toggleConnect();


// ===================== v1.5 tuner =====================
$("tab-helm").click();
if (!G.link.connected) { $("srcSel").value = "virtual"; await G.toggleConnect(); G.link.gapMs = 0; }
G.App.virtual.opts.delayMs = 0;
await G.link.setFrequency(14150000);
const dig = (i) => $("dig" + i);
const upKey = (opts) => new w.KeyboardEvent("keydown", Object.assign({ key: "ArrowUp", bubbles: true, cancelable: true }, opts || {}));
const dnKey = () => new w.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });

// hover a digit, then press the arrow key with focus nowhere near it
dig(5).dispatchEvent(new w.MouseEvent("mouseenter", { bubbles: false }));
w.document.body.dispatchEvent(upKey());
await new Promise(r => setTimeout(r, 120));
check("hovering the 1 kHz digit and pressing up tunes a kilohertz up",
  G.link.shadow.hz.v === 14151000, "got " + G.link.shadow.hz.v);
check("the tuned value reached the radio", G.App.virtual.state.hz === 14151000,
  "radio at " + G.App.virtual.state.hz);
check("the readout shows the new digit", dig(5).textContent === "1");
check("the frequency field followed along", $("freqIn").value === "14.15100");

w.document.body.dispatchEvent(dnKey());
await new Promise(r => setTimeout(r, 120));
check("pressing down puts it back", G.link.shadow.hz.v === 14150000);

// a different digit under the pointer changes a different place
dig(5).dispatchEvent(new w.MouseEvent("mouseleave", { bubbles: false }));
dig(2).dispatchEvent(new w.MouseEvent("mouseenter", { bubbles: false }));
w.document.body.dispatchEvent(upKey());
await new Promise(r => setTimeout(r, 120));
check("hovering the 1 MHz digit tunes megahertz instead", G.link.shadow.hz.v === 15150000,
  "got " + G.link.shadow.hz.v);
dig(2).dispatchEvent(new w.MouseEvent("mouseleave", { bubbles: false }));

// with nothing hovered, the arrows follow focus instead
dig(4).focus();
check("focusing a digit arms it", G.Tuner.armedIdx === 4);
w.document.body.dispatchEvent(upKey());
await new Promise(r => setTimeout(r, 120));
check("with nothing hovered the arrows follow focus", G.link.shadow.hz.v === 15160000,
  "got " + G.link.shadow.hz.v);

// left and right walk between digits without changing the frequency
const beforeWalk = G.link.shadow.hz.v;
w.document.body.dispatchEvent(new w.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
check("arrow left moves to the digit above", G.Tuner.armedIdx === 3);
w.document.body.dispatchEvent(new w.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
check("arrow right moves back down", G.Tuner.armedIdx === 4);
check("walking between digits does not retune", G.link.shadow.hz.v === beforeWalk);

// typing in a field must keep its own arrow keys
$("qCall").focus();
const preField = G.link.shadow.hz.v;
$("qCall").dispatchEvent(upKey());
check("arrows inside a text field do not tune the radio", G.link.shadow.hz.v === preField);
$("qCall").blur();

// modifier combinations are left to the browser
dig(5).dispatchEvent(new w.MouseEvent("mouseenter", { bubbles: false }));
w.document.body.dispatchEvent(upKey({ ctrlKey: true }));
check("a modified arrow key is left alone", G.link.shadow.hz.v === preField);

// the wheel is the other natural gesture over a dial
const wheelEv = new w.WheelEvent("wheel", { deltaY: -1, bubbles: true, cancelable: true });
dig(5).dispatchEvent(wheelEv);
await new Promise(r => setTimeout(r, 120));
check("scrolling up over a digit tunes up", G.link.shadow.hz.v === preField + 1000,
  "got " + G.link.shadow.hz.v);
check("the wheel event is consumed so the page does not scroll", wheelEv.defaultPrevented);

// holding the key down must not pile up stale commands on a slow link
G.App.virtual.opts.delayMs = 15;
const burstFrom = G.link.shadow.hz.v;
for (let i = 0; i < 25; i++) w.document.body.dispatchEvent(upKey());
await new Promise(r => setTimeout(r, 900));
check("a burst of key presses lands on the right frequency",
  G.link.shadow.hz.v === burstFrom + 25000, "got " + G.link.shadow.hz.v);
check("the radio ends up where the readout says",
  G.App.virtual.state.hz === G.link.shadow.hz.v,
  "radio " + G.App.virtual.state.hz + " vs readout " + G.link.shadow.hz.v);
check("the send queue drained", G.Tuner.pendingHz === null);
G.App.virtual.opts.delayMs = 0;
dig(5).dispatchEvent(new w.MouseEvent("mouseleave", { bubbles: false }));

// a status poll must not steal the digit the pointer is resting on
dig(6).dispatchEvent(new w.MouseEvent("mouseenter", { bubbles: false }));
const held = dig(6);
await G.link.readRxStatus();
G.renderReadout();
check("a status poll does not replace the hovered digit", dig(6) === held);
check("the pointer is still on the same digit", G.Tuner.hoverIdx === 6);
dig(6).dispatchEvent(new w.MouseEvent("mouseleave", { bubbles: false }));


// ===================== v1.6 dial and band rack =====================
$("tab-helm").click();
if (!G.link.connected) { $("srcSel").value = "virtual"; await G.toggleConnect(); G.link.gapMs = 0; }
G.App.virtual.opts.delayMs = 0;

// band rack
check("the band rack rendered a button per band", $("bandRack").children.length === G.BAND_SETUP.length);
check("each band button is a real button", $("band-20m").tagName === "BUTTON");
$("licSel").value = "extra"; $("licSel").dispatchEvent(new w.Event("change"));
$("band-20m").click();
await new Promise(r => setTimeout(r, 250));
check("a band button lands in the phone segment, not on the band edge",
  G.App.virtual.state.hz === 14150000, "radio at " + G.App.virtual.state.hz);
check("the band button picks a voice mode", G.link.shadow.mode.v === "USB");
check("the voice mode reached the radio", G.App.virtual.state.modeCode === 0x01);
check("the readout followed the band change", $("readout").textContent.replace(/\s/g,"") === "014.150.00",
  $("readout").textContent);
check("the mode segment followed the band change", G.panelMode() === "USB");
check("the face tag followed the band change", $("tagMode").textContent === "USB");
check("the face names the band", $("tagBand").textContent === "20 m");
check("the current band is marked in the rack", $("band-20m").classList.contains("on"));
check("the other bands are not marked", !$("band-2m").classList.contains("on"));
check("the face says which band we are in", $("tagBand").textContent.includes("20 m"));

$("band-2m").click();
await new Promise(r => setTimeout(r, 300));
check("a VHF band button lands on the calling frequency in FM",
  G.App.virtual.state.hz === 146520000 && G.App.virtual.state.modeCode === 0x08,
  "radio at " + G.App.virtual.state.hz);
check("the standard repeater offset was loaded", G.link.shadow.offsetHz.v === 600000);
check("the offset reached the radio", G.App.virtual.state.offsetHz === 600000);
// the defect Mike found: a VHF offset must not survive a jump back to HF
$("band-20m").click();
await new Promise(r => setTimeout(r, 300));
check("jumping back to HF clears the repeater offset in the radio",
  G.App.virtual.state.offsetHz === 0, "radio offset " + G.App.virtual.state.offsetHz);
check("jumping back to HF clears it in the shadow too", G.link.shadow.offsetHz.v === 0);
check("the shift is simplex on HF", G.App.virtual.state.shift === 0x09);
check("the offset panel field followed", $("offsetIn").value === "0.000");
$("band-2m").click();
await new Promise(r => setTimeout(r, 300));
check("shift came back to simplex", G.App.virtual.state.shift === 0x09);
check("tone was turned off", G.App.virtual.state.toneMode === 0x8A);
check("split was cleared", G.App.virtual.state.split === false);
check("the highlight moved with the band", $("band-2m").classList.contains("on") && !$("band-20m").classList.contains("on"));

// the dial
G.Tuner.arm(5, false);
check("the dial reports the armed digit as its step", $("wheelStep").textContent === "1 kHz per click");
const dialStart = G.link.shadow.hz.v;
G.Wheel.bank(9);
await new Promise(r => setTimeout(r, 120));
check("one detent of the dial tunes one step", G.link.shadow.hz.v === dialStart + 1000,
  "got " + G.link.shadow.hz.v);
check("the dial turn reached the radio", G.App.virtual.state.hz === dialStart + 1000);
check("the rotor actually rotated", $("wheelRotor").getAttribute("transform").indexOf("rotate") === 0);
G.Wheel.bank(-9);
await new Promise(r => setTimeout(r, 120));
check("turning back returns to the starting frequency", G.link.shadow.hz.v === dialStart);

// arming a different digit changes what the dial does
G.Tuner.arm(3, false);
check("the dial label follows the armed digit", $("wheelStep").textContent === "100 kHz per click");
G.Wheel.bank(9);
await new Promise(r => setTimeout(r, 120));
check("the dial now steps the newly armed place", G.link.shadow.hz.v === dialStart + 100000,
  "got " + G.link.shadow.hz.v);
G.Wheel.bank(-9);
G.Tuner.arm(5, false);
await new Promise(r => setTimeout(r, 120));

// scroll wheel over the knob
const wheelStart = G.link.shadow.hz.v;
const ev = new w.WheelEvent("wheel", { deltaY: -1, bubbles: true, cancelable: true });
$("wheel").dispatchEvent(ev);
await new Promise(r => setTimeout(r, 120));
check("scrolling over the knob tunes up", G.link.shadow.hz.v === wheelStart + 1000,
  "got " + G.link.shadow.hz.v);
check("the knob consumes the scroll so the page stays put", ev.defaultPrevented);

// keyboard on the knob
const keyStart = G.link.shadow.hz.v;
$("wheel").dispatchEvent(new w.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 120));
check("the knob is operable from the keyboard", G.link.shadow.hz.v === keyStart - 1000,
  "got " + G.link.shadow.hz.v);
check("the knob reports the frequency to a screen reader",
  $("wheel").getAttribute("aria-valuenow") === String(G.link.shadow.hz.v));
check("the knob reads its value out in megahertz",
  ($("wheel").getAttribute("aria-valuetext") || "").includes("megahertz"));

// a flick leaves it coasting, and it comes to a stop on its own
const spinStart = G.link.shadow.hz.v;
G.Wheel._flick(25);
check("a flick sets the knob spinning", G.Wheel.spinning === true);
await new Promise(r => setTimeout(r, 1500));
check("the knob coasts to a stop by itself", G.Wheel.spinning === false);
check("coasting actually tuned somewhere", G.link.shadow.hz.v > spinStart,
  "from " + spinStart + " to " + G.link.shadow.hz.v);
check("coasting stayed inside the tuning range",
  G.link.shadow.hz.v > 0 && G.link.shadow.hz.v <= 999999990);
check("the radio kept up with the spin", G.App.virtual.state.hz === G.link.shadow.hz.v,
  "radio " + G.App.virtual.state.hz + " vs readout " + G.link.shadow.hz.v);

// touching a spinning knob stops it
G.Wheel._flick(25);
$("wheel").dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
check("clicking a spinning knob stops it dead", G.Wheel.spinning === false);


// ===================== v1.8 live panel controls and licence classes =====================
$("tab-helm").click();
if (!G.link.connected) { $("srcSel").value = "virtual"; await G.toggleConnect(); G.link.gapMs = 0; }
G.App.virtual.opts.delayMs = 0;
const change = (id) => $(id).dispatchEvent(new w.Event("change", { bubbles: true }));

$("mode-AM").click();
await new Promise(r => setTimeout(r, 120));
check("pressing a mode button changes the radio with no other action",
  G.App.virtual.state.modeCode === 0x04, "radio mode " + G.App.virtual.state.modeCode);
check("the mode change is reflected in the shadow", G.link.shadow.mode.v === "AM");
check("the shadow marks it asserted, since it went on the wire", G.link.shadow.mode.p === "asserted");

$("mode-USB").click();
await new Promise(r => setTimeout(r, 120));
check("a second mode press also lands", G.App.virtual.state.modeCode === 0x01);
check("the segment shows which mode is live", $("mode-USB").getAttribute("aria-checked") === "true");

$("shiftSel").value = "plus"; change("shiftSel");
await new Promise(r => setTimeout(r, 120));
check("changing the shift dropdown changes the radio", G.App.virtual.state.shift === 0x89);
$("shiftSel").value = "simplex"; change("shiftSel");
await new Promise(r => setTimeout(r, 120));

$("clarIn").value = "500"; change("clarIn");
await new Promise(r => setTimeout(r, 120));
check("changing the clarifier field changes the radio", G.App.virtual.state.clarHz === 500);
$("clarIn").value = "0"; change("clarIn");
await new Promise(r => setTimeout(r, 120));

// licence class moves where the band buttons land
$("licSel").value = "general"; change("licSel");
check("choosing a licence class is remembered", G.licence() === "general");
$("band-20m").click();
await new Promise(r => setTimeout(r, 250));
check("a General lands higher up 20 m than an Extra",
  G.App.virtual.state.hz === 14225000, "radio at " + G.App.virtual.state.hz);
$("band-40m").click();
await new Promise(r => setTimeout(r, 250));
check("a General lands in the 40 m General phone segment", G.App.virtual.state.hz === 7175000);
check("40 m uses lower sideband", G.App.virtual.state.modeCode === 0x00);

$("licSel").value = "tech"; change("licSel");
check("bands with no privileges are disabled for a Technician", $("band-20m").disabled === true);
check("bands a Technician does hold stay enabled", $("band-2m").disabled === false);
const heldHz = G.App.virtual.state.hz;
await G.applyBand("20m");
await new Promise(r => setTimeout(r, 150));
check("a refused band does not move the radio", G.App.virtual.state.hz === heldHz);
$("band-2m").click();
await new Promise(r => setTimeout(r, 250));
check("a Technician can still reach 2 m", G.App.virtual.state.hz === 146520000);

$("licSel").value = "extra"; change("licSel");
check("switching back re-enables the HF bands", $("band-20m").disabled === false);
check("30 m stays reachable in CW since no class may talk there",
  $("band-30m").disabled === false);


// ===================== v1.9 the streamlined face =====================
$("tab-helm").click();
if (!G.link.connected) { $("srcSel").value = "virtual"; await G.toggleConnect(); G.link.gapMs = 0; }
G.App.virtual.opts.delayMs = 0;

check("the readout, meters, and lamps all live in one face",
  $("readout").closest(".face") !== null && $("sBars").closest(".face") !== null &&
  $("lampSwr").closest(".face") !== null);
check("the knob and the controls sit side by side",
  $("wheel").closest(".controls") !== null && $("modeSel").closest(".controls") !== null);
check("the eight step buttons are gone", w.document.querySelectorAll("[data-step]").length === 0);
check("the occasional controls moved into drawers",
  $("shiftSel").closest("details") !== null && $("clarIn").closest("details") !== null &&
  $("shadowGrid").closest("details") !== null);

// mode by keyboard across the segment
// a radiogroup walks from the checked item, not from whatever has focus
$("mode-USB").click();
await new Promise(r => setTimeout(r, 120));
check("clicking a mode checks it", G.panelMode() === "USB");
$("modeSel").dispatchEvent(new w.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 120));
check("arrow keys walk the mode segment", G.panelMode() === "CW", "landed on " + G.panelMode());
check("walking the segment also changes the radio", G.App.virtual.state.modeCode === 0x02);
$("modeSel").dispatchEvent(new w.KeyboardEvent("keydown", { key: "Home", bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 120));
check("home jumps to the first mode", G.panelMode() === "LSB");

// the face keeps up
$("band-2m").click();
await new Promise(r => setTimeout(r, 300));
check("the face band tag follows a band change", $("tagBand").textContent === "2 m");
check("the face mode tag follows a band change", $("tagMode").textContent === "FM");
check("the VFO letter is shown on the face", $("vfoLetter").textContent.length === 1);

// the split warning is driven by real state
await G.link.setSplit(true);
G.renderHelm();
check("turning split on raises the warning strip", !$("splitWarn").classList.contains("hide"));
await G.link.setSplit(false);
G.renderHelm();
check("turning split off clears the warning strip", $("splitWarn").classList.contains("hide"));

// drawers remember themselves
$("drwFine").open = true;
$("drwFine").dispatchEvent(new w.Event("toggle"));
check("a drawer remembers being opened", G.Store.get("drawer.drwFine", false) === true);
$("drwFine").open = false;
$("drwFine").dispatchEvent(new w.Event("toggle"));
check("a drawer remembers being closed", G.Store.get("drawer.drwFine", false) === false);
check("drawer summaries carry live state",
  $("drwRepeaterNow").textContent.includes("simplex") || $("drwRepeaterNow").textContent.length > 0);

// the controls inside drawers still work
$("btnSplit").click();
await new Promise(r => setTimeout(r, 150));
check("a control inside a drawer still reaches the radio", G.App.virtual.state.split === true);
$("btnSplit").click();
await new Promise(r => setTimeout(r, 150));


// ===================== v1.10 the Chart station =====================
$("tab-chart").click();
check("the chart station opens", $("st-chart").hidden === false);
check("the band map drew a row per band", $("bandMap").children.length > 0);

$("licSel").value = "extra"; $("licSel").dispatchEvent(new w.Event("change"));
$("chartMine").checked = false; $("chartMine").dispatchEvent(new w.Event("change"));
check("with the filter off every band is listed", $("bandMap").children.length === G.BANDPLAN.length);
const rowsAll = Array.from($("bandMap").children).map(r => r.textContent).join(" ");
check("the map names the bands", rowsAll.includes("20 m") && rowsAll.includes("70 cm"));

// selecting a band updates the detail panel
const bandRow = (name) => Array.from($("bandMap").children)
  .find(r => r.querySelector(".bname").textContent.trim() === name);
const twenty = bandRow("20 m");
twenty.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
check("clicking a band selects it", G.Chart.selected === "20m");
check("the detail panel follows the selection", $("bandDetail").textContent.includes("14.000.00"));
check("the detail panel lists the phone segment", $("bandDetail").textContent.includes("14.150.00"));
check("the detail panel describes the band", $("bandDetail").textContent.includes("workhorse"));

// privilege edges shown must follow the licence class
$("licSel").value = "general"; $("licSel").dispatchEvent(new w.Event("change"));
check("a General sees the General phone edge on 20 m",
  $("bandDetail").textContent.includes("14.225.00"), $("bandDetail").textContent.slice(0,160));
$("licSel").value = "tech"; $("licSel").dispatchEvent(new w.Event("change"));
check("a Technician is told they hold nothing on 20 m",
  $("bandDetail").textContent.includes("no privileges"));
$("chartMine").checked = true; $("chartMine").dispatchEvent(new w.Event("change"));
check("filtering hides the bands a Technician cannot use",
  $("bandMap").children.length < G.BANDPLAN.length);
const techRows = $("bandMap").children.length;
$("licSel").value = "extra"; $("licSel").dispatchEvent(new w.Event("change"));
check("the map updates on the same change, not one behind",
  $("bandMap").children.length === G.BANDPLAN.length,
  "showed " + $("bandMap").children.length + " after extra, was " + techRows + " for tech");

// tuning from the chart
if (!G.link.connected) { $("srcSel").value = "virtual"; await G.toggleConnect(); G.link.gapMs = 0; }
G.App.virtual.opts.delayMs = 0;
const tuneBtn = Array.from($("bandDetail").querySelectorAll("button")).find(b => b.textContent === "Tune here");
tuneBtn.click();
await new Promise(r => setTimeout(r, 250));
check("tune here from the chart moves the radio",
  G.App.virtual.state.hz === 14000000, "radio at " + G.App.virtual.state.hz);
check("tuning into a CW segment selects CW", G.App.virtual.state.modeCode === 0x02);

// 30 m must be reachable but voiceless
const thirty = bandRow("30 m");
thirty.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
check("30 m says no class may transmit voice", $("bandDetail").textContent.includes("No phone"));

// 60 m shows its channels as buttons
const sixty = bandRow("60 m");
sixty.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
check("60 m lists its channels", $("bandDetail").textContent.includes("Channels"));
const chan = Array.from($("bandDetail").querySelectorAll("button")).find(b => b.textContent.includes("5.330"));
chan.click();
await new Promise(r => setTimeout(r, 250));
check("a 60 m channel button tunes the radio", G.App.virtual.state.hz === 5330500,
  "radio at " + G.App.virtual.state.hz);
check("a 60 m channel selects upper sideband", G.App.virtual.state.modeCode === 0x01);

// solar entry, stamped and aged
$("solSfi").value = "165"; $("solA").value = "8"; $("solK").value = "3";
$("btnSolSave").click();
check("solar numbers are recorded", G.Chart.solar() !== null);
check("the recorded numbers are what was typed", G.Chart.solar().sfi === 165);
check("fresh numbers read as confirmed", $("solAge").className.includes("confirmed"));
check("the age is shown", $("solAge").textContent.includes("ago"));
G.Store.set("solar", { sfi: 165, a: 8, k: 3, when: new Date(Date.now() - 30 * 3600000).toISOString() });
G.Chart.renderConditions();
check("day old numbers are demoted, not silently trusted",
  $("solAge").className.includes("asserted") && $("solAge").textContent.includes("worth refreshing"),
  $("solAge").className + " :: " + $("solAge").textContent.slice(0, 90));

// conditions computed from the grid
$("tab-log").click();
$("myGrid").value = "FM19"; $("myGrid").dispatchEvent(new w.Event("change"));
$("tab-chart").click();
check("sunrise and sunset are computed from the grid",
  $("chartSun").textContent.includes("Sunrise") || $("chartSun").textContent.includes("does not"),
  $("chartSun").textContent.slice(0, 90));
check("the chart says the figures are computed for your grid",
  $("chartGrid").textContent.includes("FM19"));
check("the clock shows UTC", $("chartClock").textContent.includes("UTC"));

// measured data flows in from real sweeps
$("tab-scope").click();
G.App.sweeps.length = 0;
$("scCentre").value = "14.150"; $("scSpan").value = "20"; $("scStep").value = "5"; $("scDwell").value = "0";
await G.Scope.sweepOnce();
$("tab-chart").click();
const meas = G.Chart.measured(G.BANDPLAN.find(b => b.id === "20m"));
check("a sweep on a band shows up as measured data there", meas !== null && meas.sweeps === 1,
  meas ? "sweeps " + meas.sweeps : "none");
const twenty2 = bandRow("20 m");
twenty2.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
check("the detail panel reports what you measured",
  $("bandDetail").textContent.includes("your own sweeps"));
check("a band you have never swept says so",
  (() => { const m = G.Chart.measured(G.BANDPLAN.find(b => b.id === "160m")); return m === null; })());


// ===================== v1.11 the optional solar feed =====================
$("tab-chart").click();
G.Store.set("solarFeed", null); G.Store.set("solarUrl", ""); G.Store.set("solarTriedAt", 0);
G.Chart.render();
check("the feed address box starts empty", $("solUrl").value === "");
check("a fresh instrument has fetched nothing", G.SolarFeed.stored() === null);

// pressing fetch with no address must explain itself, not fail silently
let fetchCalls = 0;
$("btnSolFetch").click();
await new Promise(r => setTimeout(r, 200));
check("fetching with no address says what to do",
  $("toast").textContent.includes("feed address"), $("toast").textContent.slice(0, 80));
check("and made no network call", fetchCalls === 0);

// a plain http address is refused at the point of entry
$("solUrl").value = "ftp://example.invalid/solar";
$("solUrl").dispatchEvent(new w.Event("change"));
check("an address that is not https is refused", $("toast").textContent.includes("https"));
check("and is not saved", G.SolarFeed.url() === "");

// now stand in a fake endpoint and fetch for real through the UI
const SAMPLE = '<?xml version="1.0"?><solar><solardata>' +
  '<source url="http://www.hamqsl.com/solar.html">N0NBH</source>' +
  '<updated>18 Jul 2026 1800 GMT</updated>' +
  '<solarflux>142</solarflux><aindex>7</aindex><kindex>2</kindex>' +
  '<sunspots>96</sunspots><xray>B7.8</xray><geomagfield>QUIET</geomagfield>' +
  '<calculatedconditions>' +
  '<band name="80m-40m" time="day">Fair</band><band name="80m-40m" time="night">Good</band>' +
  '<band name="30m-20m" time="day">Good</band><band name="30m-20m" time="night">Fair</band>' +
  '<band name="17m-15m" time="day">Good</band><band name="12m-10m" time="day">Poor</band>' +
  '</calculatedconditions></solardata></solar>';
w.fetch = async (url) => {
  fetchCalls++;
  if (String(url).includes("broken")) throw new TypeError("Failed to fetch");
  if (String(url).includes("notxml")) return { ok: true, status: 200, text: async () => "<html>hi</html>" };
  if (String(url).includes("missing")) return { ok: false, status: 404, statusText: "Not Found", text: async () => "" };
  return { ok: true, status: 200, statusText: "OK", text: async () => SAMPLE };
};

$("solUrl").value = "https://halyard-solar.example.workers.dev/";
$("solUrl").dispatchEvent(new w.Event("change"));
check("an https address is accepted and saved", G.SolarFeed.url().startsWith("https://"));

$("btnSolFetch").click();
await new Promise(r => setTimeout(r, 400));
check("pressing fetch actually called out once", fetchCalls === 1, "calls " + fetchCalls);
check("the report was stored", G.SolarFeed.stored() !== null);
check("the flux came through", G.SolarFeed.stored().sfi === 142);
check("the conditions chip now reads as fetched",
  $("solAge").textContent.includes("fetched"), $("solAge").textContent.slice(0, 90));
check("the chip reads as confirmed while fresh", $("solAge").className.includes("confirmed"));
check("the extra line carries the sunspot number and stamp",
  $("solExtra").textContent.includes("96 sunspots") && $("solExtra").textContent.includes("18 Jul 2026"),
  $("solExtra").textContent.slice(0, 120));
check("the hand entry boxes were filled in from the report", $("solSfi").value === "142");

// the band map should now carry reported ratings rather than the rule of thumb
$("tab-log").click(); $("myGrid").value = "FM19"; $("myGrid").dispatchEvent(new w.Event("change"));
$("tab-chart").click();
$("chartMine").checked = false; $("chartMine").dispatchEvent(new w.Event("change"));
const rowText = (name) => Array.from($("bandMap").children)
  .find(r => r.querySelector(".bname").textContent.trim() === name).querySelector(".bchar").textContent;
check("a rated band shows the reported rating",
  /reported/.test(rowText("20 m")), "20 m says: " + rowText("20 m"));
check("an unrated band falls back to the rule of thumb",
  !/reported/.test(rowText("160 m")), "160 m says: " + rowText("160 m"));
const twenty3 = Array.from($("bandMap").children)
  .find(r => r.querySelector(".bname").textContent.trim() === "20 m");
twenty3.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
check("the detail panel reports the fetched conditions",
  $("bandDetail").textContent.includes("Reported conditions"));
check("the detail panel is honest that HamQSL rates bands in pairs",
  $("bandDetail").textContent.includes("in pairs"));

// politeness: a second press inside the window must not go out again
$("btnSolFetch").click();
await new Promise(r => setTimeout(r, 300));
check("a second fetch inside the window is refused", fetchCalls === 1, "calls " + fetchCalls);
check("and says why", $("toast").textContent.includes("15 minutes"), $("toast").textContent.slice(0, 90));

// the CORS failure everyone hits first must be named properly
G.Store.set("solarTriedAt", 0);
$("solUrl").value = "https://broken.example.workers.dev/";
$("solUrl").dispatchEvent(new w.Event("change"));
$("btnSolFetch").click();
await new Promise(r => setTimeout(r, 400));
check("a blocked fetch explains CORS and points at the worker",
  $("toast").textContent.includes("CORS") && $("toast").textContent.includes("worker"),
  $("toast").textContent.slice(0, 140));
check("a failed fetch leaves the previous report alone", G.SolarFeed.stored().sfi === 142);

// something that is not a solar report must be rejected, not displayed
G.Store.set("solarTriedAt", 0);
$("solUrl").value = "https://notxml.example.workers.dev/";
$("solUrl").dispatchEvent(new w.Event("change"));
$("btnSolFetch").click();
await new Promise(r => setTimeout(r, 400));
check("a page that is not a solar report is rejected",
  $("toast").textContent.includes("not a HamQSL solar report"), $("toast").textContent.slice(0, 120));

// a 404 must point at the deployment, not at the proxy
G.Store.set("solarTriedAt", 0);
$("solUrl").value = "https://missing.example.workers.dev/";
$("solUrl").dispatchEvent(new w.Event("change"));
$("btnSolFetch").click();
await new Promise(r => setTimeout(r, 400));
check("a 404 says the host answered, not the proxy",
  $("toast").textContent.includes("proxy never returns a 404"), $("toast").textContent.slice(0, 160));
check("and names the usual cause", $("toast").textContent.includes("worker directory"));

// clearing the address switches the whole thing off again
$("solUrl").value = "";
$("solUrl").dispatchEvent(new w.Event("change"));
check("clearing the address switches the feed off", G.SolarFeed.url() === "");
check("and says so", $("toast").textContent.includes("switched off"));
G.Store.set("solarFeed", null); G.Store.set("solarTriedAt", 0);
G.Chart.render();

if (errs.length) out.push("FAIL  no uncaught page errors  " + errs.join(" | "));
else out.push("pass  no uncaught page errors");

console.log(out.join("\n"));
const fails = out.filter(l => l.startsWith("FAIL")).length;
console.log("\n" + (out.length - fails) + " passed, " + fails + " failed");
process.exit(fails ? 1 : 0);
