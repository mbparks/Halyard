# Halyard

**Field Instrument FI-119. A control head for the Yaesu FT-897D.**

One HTML file. Double-click it. No server, no build step, no install, no
account, no network. Everything you enter stays in your browser.

Halyard speaks the FT-897D's five byte CAT protocol over Web Serial, gives you
the radio's front panel in a browser window, builds a bandscope by sweeping the
S-meter, keeps a channel locker and a contact log, and includes a virtual
FT-897D so all of it can be exercised with no cable attached.

Version 1.12.0. GPL-3.0.

---

## Run it

Download `halyard.html` and open it. That is the whole procedure.

To talk to a real radio you also need:

- A CAT interface on the FT-897D's eight pin mini-DIN CAT jack. The Yaesu CT-62
  is the usual one. The radio's CAT port is RS-232 level, not TTL and not USB,
  so a bare USB-to-TTL adapter will not do.
- A browser with Web Serial. Chrome or Edge on desktop. Firefox and Safari do
  not implement it.
- Menu 019 (CAT RATE) on the radio set to match the rate you pick in Halyard.
  4800 is the factory default.

With no cable and no Web Serial, pick **Virtual FT-897D** as the source. Every
station works against it.

---

## The stations

**Helm.** Frequency readout, step buttons, mode, repeater shift and offset,
CTCSS and DCS, clarifier, split, dial lock, and transmit. Hold the space bar to
key the radio. S and PO meters poll continuously.

The readout is the dial. Point at any digit and use the up and down arrow keys,
or the scroll wheel, to tune that place; page up and page down move ten at a
time; stepping past nine carries into the digit above, the way turning a real
dial does. It works from the keyboard alone as well: tab into the readout, use
left and right to pick a digit and up and down to tune it. Holding a key down
never floods the link, because only the latest value is sent.

Alongside the readout is a knob. Drag it round and it turns, with detents you
can feel in the digits; flick it and it coasts to a stop the way a weighted VFO
does; click it while it is spinning and it stops dead. It steps whichever digit
you have armed, and says so underneath, so arming the 10 kHz digit turns it into
a bandcruising knob and arming the last digit turns it into a fine tune. The
scroll wheel and the arrow keys work on it too.

Under that is the band rack: one button per band an FT-897D covers. Each one
sends the radio to the bottom edge of that band with the mode that lives there,
simplex shift, the band's standard repeater offset preloaded, tone off,
clarifier zeroed, and split off. The button for the band you are currently in
stays lit.

Repeater shift and offset are always written on a band change, never carried
over. A band with no repeater plan gets them cleared to simplex and zero,
because CAT cannot read either one back, so anything left loaded from a previous
band would sit in the radio displacing the transmit frequency with nothing on
screen able to reveal it.

**Bandscope.** Retunes the receiver step by step and reads the S-meter at every
stop, drawing a staircase trace over a waterfall of previous sweeps. Band
presets, peak hold, averaging, a marker pair with a delta readout, and bulk
harvesting of peaks into the locker.

**Chart.** A band map showing every band the FT-897D covers, split into its
segments, with the parts your licence class may use drawn solid and the parts it
may not drawn hatched. Click a band for exact edges, what modes are permitted,
any power limits, and a button to tune straight there. Above it sits everything
that can honestly be said about conditions with no network: what your own sweeps
measured, sunrise and sunset computed from your grid square, and solar numbers
you typed in yourself, which visibly go stale. It can also pull a HamQSL solar
report, if you give it an address to pull from; see the limitations below.

**Locker.** A channel bank with CSV import and export, and one-click recall to
the current VFO.

**Log.** Contacts stamped with the radio's live frequency and mode. Band and
duplicate awareness while you type, great circle distance and bearing from your
grid square, ADIF import and export, CSV export.

**Trials.** Nine measurement procedures that replace Halyard's assumptions about
this radio with evidence from your radio. See `docs/TRIALS.md`.

**Bench.** The virtual radio and its fault injection, manual status byte
polarity overrides, the self test, the raw traffic log, and export and import of
everything.

---

## Confirmed, asserted, assumed

Halyard is careful about the difference between what it knows and what it hopes.

**Confirmed** (solid green) means the radio reported this value. Only frequency,
mode, and the bits inside the two status bytes can ever be confirmed, because
those are the only things the FT-897D will tell you.

**Asserted** (dashed amber) means Halyard put this value on the wire and the
radio never acknowledged it. Tone, shift, clarifier, VFO, and dial lock are
always asserted at best. There is no read command for any of them.

**Staged** (dotted grey) means Halyard has not sent this to anything yet. That
is what every field reads before a radio is connected, and what tuning or
choosing a band with no link produces. Halyard will not claim to have sent
something it did not send.

**Verified** and **assumed**, on the Trials station, apply to the protocol
constants themselves rather than to the radio's current settings. A verified
constant was measured from your radio on a date that is recorded. An assumed one
came out of published documentation, which for this radio contradicts itself.

---

## Known limitations

- **The trials have not been run against a physical FT-897D.** Every constant in
  a fresh copy of Halyard reads *assumed*. The virtual radio is a model of the
  documented protocol, which means it can only confirm that Halyard matches the
  documentation, not that the documentation matches your radio. Running the
  trials is the first thing you should do.
- **Status byte bit polarities are contested.** Published descriptions disagree
  about which way round the squelch, tone match, discriminator, PTT, and split
  bits read. Halyard ships with one reading, exposes all five as manual
  overrides on the Bench, and can settle each one by measurement on the Trials
  station.
- **The clarifier offset encoding is the weakest command in the set.** Its trial
  depends on you reading the radio's own clarifier display, so it is only as
  good as that reading. If the trial reports no response, do not trust the
  clarifier controls on this radio.
- **The tone match trial needs a real toned signal on the air.** It cannot be
  completed on a dead band, and it will report inconclusive rather than guess.
- **The bandscope takes the receiver away from you.** It works by retuning, one
  stop at a time, so you cannot listen while it sweeps. Its vertical resolution
  is the 16 steps the S-meter reports and nothing finer. Peak hold and averaging
  make the trace steadier, not more precise. Open the squelch first or every
  stop reads zero.
- **The locker cannot write to the radio's memories.** The FT-897D CAT set has
  no memory read or write command at all, so the locker lives in your browser
  and recall means pushing settings to the current VFO. No version of Halyard
  will change this, because no software can.
- **Distances are great circle between Maidenhead squares.** They are accurate
  to roughly the size of the square, not to the metre.
- **The solar feed is off until you switch it on, and no address is compiled
  in.** A fresh copy of Halyard makes no network requests at all, which is what
  keeps the run from disk rule true, and the CI check asserting there are no
  external references in the file passes unchanged. Paste an address into the
  Chart station and it will fetch a HamQSL solar report from there. Leave it
  blank and everything else still works.
- **HamQSL cannot be read directly by any browser.** It sends no
  `Access-Control-Allow-Origin` header, and a page opened from disk has the
  origin `null`, which no server allows by name. The small Cloudflare Worker in
  `worker/` re-serves the report with the header set and a fifteen minute edge
  cache. Halyard will not fetch more than once every fifteen minutes no matter
  how often you press the button.
- **The band group names in the parser are an assumption.** HamQSL labels its
  ratings by band pair, and Halyard maps those labels onto the bands on its map.
  If those labels ever change, or were never quite what Halyard expects, the
  indices will still be right while no band gets a rating. Rather than let that
  look like poor propagation, the Chart station says how many bands it rated and
  names any group label it did not recognise. If you see that warning, send the
  labels it lists and the map can be corrected.
- **A fetched report is still not a forecast.** HamQSL rates bands in pairs, so
  one rating covers more than one band on the map, and where two groups disagree
  Halyard keeps the worse of the two. Unrated bands fall back to a rule of thumb
  about when they tend to work, which is not a prediction either.
- **Conditions otherwise come from your own machine.** Your bandscope sweeps
  supply the measured noise floor, sunrise and sunset are arithmetic from your
  grid square and the clock, and hand entered indices are stamped with the time
  you typed them.
- **The band map is a reference, not an authority.** It is United States Part 97
  allocations as of this release, simplified. 60 m is drawn as a range but is
  really five discrete channels. Check the current FCC rules before transmitting
  anywhere near an edge.
- **The band rack uses United States phone segment edges, by licence class.**
  Set your class next to the rack. The edges are the FCC allocations, not the
  narrower voluntary band plans, and Halyard has no way to know what your own
  licence actually grants. Bands where your class holds no phone privileges are
  greyed out. Check your privileges before transmitting; this is a convenience,
  not an authority.
- **30 m has no voice mode and never will.** It is CW and data only for every
  licence class, so its button goes to the band in CW. That is regulation, not a
  default anyone can change.
- **The band rack uses United States band edges.** The bottom edge of most
  bands is the same worldwide, but 60 m is channelised differently by country
  and the 70 cm allocation varies. Check your own licence before transmitting on
  a band edge. Halyard will also happily send a frequency your particular
  FT-897D does not cover, in which case the radio simply ignores it and the read
  back will disagree with the readout.
- **Duplicate detection uses call, band, and ADIF mode.** It treats LSB and USB
  as one mode, which is what awards do, and which is not what you may want.
- **Installing and offline caching only apply when Halyard is served over http
  or https.** From disk it is already fully offline and needs neither. A service
  worker cannot be registered from a `file://` page.
- **Web Serial is Chromium only.** There is no path around this that does not
  involve a server, and Halyard does not have one.
- **Data lives in this browser profile.** Clearing site data clears your locker
  and your log. Export regularly. The Bench station exports everything, and the
  log exports ADIF.

---

## Testing

Halyard carries its own test suite. Open the Bench station and press **Run self
test**: 349 assertions covering BCD encoding, every command encoder, the status
byte decoders and their inversions, schema validation of imported data, ADIF in
and out, CSV round trips, the virtual radio's protocol behaviour, fault
injection, link queue ordering, provenance tracking, the constants layer, band
and grid maths, duplicate detection, the tuner's carry and clamp behaviour, the
dial's detent arithmetic, and the band rack's defaults.

The same suite runs headlessly:

```
cd tests
npm install
npm test
```

`tests/selftest.mjs` runs the in-app suite under jsdom. `tests/integration.mjs`
drives the real UI, 243 further checks covering connection, panel apply,
read-back, sweeps, markers, harvesting, trials, ADIF round trips, export
contents, digit tuning by pointer and by keyboard, dial turns and flicks, band
selection, and clean disconnect. Both must pass before a release.

---

## Repository layout

```
halyard.html                 the instrument, and the only file you need
releases/                    each release kept as its own file
docs/PROTOCOL.md             the FT-897D CAT command set as Halyard implements it
docs/TRIALS.md               how to run the bench validation session
worker/                      optional Cloudflare Worker that re-serves the
                             HamQSL solar report with CORS headers
tests/                       headless harnesses for CI
LICENSE                      GPL-3.0
CHANGELOG.md
wrangler.toml                optional, for Cloudflare Pages
```

---

## Assets

Declared asset budget: zero external files, zero vendored libraries, zero
network requests.

Everything is drawn from CSS and canvas primitives inside `halyard.html`. The
app icon is generated at runtime from canvas paths, original work for Halyard,
GPL-3.0 with the rest of it. No fonts are shipped; the type stack falls back
through system faces. No images, no sounds, no CDN.

---

## Licence

GPL-3.0. The full text is in `LICENSE`.

Halyard is not affiliated with, endorsed by, or supported by Yaesu. FT-897D is
Yaesu's trademark. The protocol details here come from published documentation
and from measurement, not from anything proprietary.

## Feedback

Open an issue. If it is a protocol problem, turn on debug logging on the Bench
station, reproduce it, then export the traffic log and the validation report and
attach both. Those two files usually contain the whole answer.
