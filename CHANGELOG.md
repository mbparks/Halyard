# Changelog

All notable changes to Halyard (FI-119).

## 1.12.0

Making a wrong assumption in the solar parser look like a wrong assumption.

- The band group labels HamQSL uses are the part of the parser most likely to be
  wrong, because they were written from knowledge of the schema rather than from
  the live document. If they do not match, the flux and indices still arrive
  while every band on the map goes unrated, which reads exactly like poor
  propagation. That is the worst kind of bug: silent, and wearing a plausible
  disguise.
- Group lookup is now tolerant of case and spacing, so `80M-40M` and
  `30m - 20m` match.
- Anything still unrecognised is carried out of the parser rather than dropped.
  The Chart station reports how many bands it rated, and raises a warning strip
  naming the exact group labels it did not understand. If none matched at all it
  says so outright.
- Eleven new assertions cover tolerant matching, unrecognised groups, a report
  where nothing matches, and the honesty of the rated count that drives the
  warning.

## 1.11.2

- **The solar proxy is named `halyard-solar` again, and the optional Pages
  config in the repository root keeps `halyard`.** Briefly they shared a name,
  which meant a deploy from either directory could overwrite the other at the
  same hostname. A CI check now fails the build if the two ever match again.
- Both `wrangler.toml` files open with a comment saying which is which and how
  to deploy each. Two files with the same name doing different jobs is a trap,
  and the fix is to label them, not to expect people to remember.
- The worker README explains how to spot and undo an accidental deploy of the
  repository root, which publishes the whole repository as static assets and
  answers `/` with an empty 404.
- The 404 message in the Chart station now names that specific mistake rather
  than pointing vaguely at `wrangler.toml`.

## 1.11.1

- The worker now deploys as `halyard` rather than `halyard-solar`, and sets
  `workers_dev = true` explicitly. A deploy can otherwise succeed while nothing
  answers at the hostname.
- A 404 from the solar feed now says that nothing is deployed at that address
  and points at the `name` in `wrangler.toml`, instead of repeating the status
  code. The proxy has no code path that returns a 404, so a 404 always comes
  from the host and never from the proxy, and the message says which.
- The worker README explains how to verify a deployment with `curl` before
  pasting the address into Halyard, which separates a deployment problem from a
  Halyard problem.

## 1.11.0

The Chart station can now fetch a HamQSL solar report, on your terms.

- **No address is compiled in.** A fresh copy of Halyard makes no network
  requests whatsoever, and the CI check asserting there are no external
  references in the file still passes unchanged, with no exceptions carved into
  it. The feed exists only once you paste an address into the Chart station, and
  nothing else in the instrument depends on it working.
- **A Cloudflare Worker is included, in `worker/`.** HamQSL sends no
  `Access-Control-Allow-Origin` header, so a browser refuses to read it, and a
  page opened from disk has the origin `null`, which no server allows by name.
  The worker fetches the report server side and re-serves it with the header set
  and a fifteen minute edge cache. Deploy with `npx wrangler deploy`.
- Fetched flux, A and K indices, sunspot number, X-ray class, geomagnetic field,
  and the report's own timestamp appear in the conditions header, marked as
  fetched rather than entered. The fresher of the fetched and hand entered
  numbers is used, and the header says which one it took.
- Band rows carry the reported rating for the current day or night phase where
  the feed gives one, coloured, and fall back to the rule of thumb where it does
  not. HamQSL rates bands in pairs, so where two groups overlap on one band the
  worse rating is kept, and the detail panel says plainly that it is a pair
  rating.
- Everything off the wire is parsed with `DOMParser`, kept as inert text, length
  capped, and numerically clamped. A response that is not a solar report is
  rejected rather than displayed.
- The failure everyone hits first is named properly: a blocked cross origin
  request says so and points at the worker, instead of reporting a bare network
  error.
- Halyard will not fetch more than once every fifteen minutes, the button
  included. A failed attempt does not start that clock, so a wrong address can
  be corrected and retried at once.

## 1.10.0

A new station: Chart.

- **Band map.** Every band the FT-897D covers, drawn to scale and split into its
  segments. The parts your licence class may use are solid, CW and data in
  green, phone in amber; the parts it may not are hatched. A red line shows
  where the radio currently is. Click a band for exact edges, permitted modes,
  power limits where they differ, and a button to tune straight there.
- 60 m lists its five channels as buttons, and is labelled as channelised rather
  than drawn as if it were continuous.
- 30 m is marked plainly as CW and data only for every licence class.
- **Conditions, honestly sourced.** Halyard runs from disk with no network, so
  it cannot fetch a solar report. Instead it shows three things and labels each:
  what your own bandscope sweeps measured on that band, sunrise and sunset
  computed from your grid square and the clock, and solar indices you enter
  yourself. Entered numbers are stamped with the time and demoted on screen once
  they are more than twelve hours old.
- Sunrise, sunset, and grey line are worked out locally, including the polar
  cases where the sun does not rise or set at all.
- The measured noise floor from your sweeps is drawn across each band's bar.
- **Fixed: two change handlers on the licence selector** had an ordering
  dependency between them, so the band map rendered one change behind the
  selector. Merged into one handler.

## 1.9.0

The Helm rebuilt as one instrument face.

- Readout, VFO, mode, band, S meter, power meter, and the status lamps now sit
  together in a single face at the top, so everything you glance at is in one
  glance rather than three panels apart.
- The eight frequency step buttons are gone. The tunable digits and the knob
  replaced them two releases ago and they were only taking up room.
- Mode is a segmented control instead of a dropdown: one press instead of two,
  and the current mode is visible without opening anything. Proper radiogroup
  semantics, arrow keys walk the group, home and end jump to the ends.
- Repeater and tone, clarifier and split and lock, and the shadow state have
  moved into drawers. Each drawer summarises its own contents on the closed
  header, so shift, tone, and how many fields are confirmed are readable without
  opening anything. Drawers remember whether you left them open.
- The repeater drawer opens itself the first time FM is selected, since that is
  the only time any of it applies.
- Transmit is now a large key of its own rather than one button among six.
- A warning strip appears on the face whenever split is on, because the radio is
  then transmitting on a VFO whose frequency CAT cannot report.
- The S meter has a scale under it.
- Three paragraphs of explanatory body text were removed. That material lives in
  the About panel and in the drawers it applies to.

## 1.8.0

Two fixes from the bench, both mine.

- **Fixed: the panel controls did nothing.** Mode, shift, offset, tone mode,
  tone, DCS code, and clarifier had no change handlers at all. They were only
  read when Send to radio was pressed, so changing a dropdown appeared to do
  nothing to the radio. Every one of them now acts the moment it changes. Send
  to radio remains, as a way to resend the whole panel after a dropped command.
- **Changed: no band defaults to CW any more.** Band buttons now land at the
  bottom of the phone segment in the voice mode used there, rather than at the
  bottom of the band, which is CW and data only and no place for a voice mode.
  Lower sideband below 10 MHz, upper above, FM on 2 m and 70 cm landing on the
  national simplex calling frequencies.
- Phone segment edges depend on licence class, so there is now a licence class
  selector beside the rack. Bands where the selected class holds no phone
  privileges are greyed out and refuse to send.
- 30 m keeps CW, because no licence class may transmit voice there. Its button
  says so.
- 60 m stays upper sideband despite sitting below 10 MHz, because it is
  channelised and regulated that way.
- CTCSS tones and DCS codes are validated against the radio's own tables before
  encoding, so a bad value raises an error instead of quietly becoming DCS 000.

## 1.7.0

Two correctness fixes, both reported from the bench.

- **Fixed: a repeater offset loaded on a VHF or UHF band survived a jump to
  HF.** The offset was only written when a band declared one, so choosing 2 m
  and then 20 m left 600 kHz sitting in the radio on 20 m. CAT has no command to
  read the offset back, so nothing on screen could reveal it. Repeater shift and
  offset are now always written on a band change, cleared to simplex and zero on
  any band with no repeater plan.
- **Fixed: the shadow model inherited the previous band's offset** and displayed
  it as asserted, so Halyard claimed to have sent a value it had never sent.
- Added a third provenance mark. Staged, shown as a dotted grey chip, means
  Halyard has not put this value on the wire at all. Every field now starts
  staged rather than asserted, and tuning or choosing a band with no radio
  connected stages rather than asserts.
- Choosing a band with no radio connected now fills in the panel controls and
  leaves the shadow model untouched, instead of writing a fiction into it.
- Band buttons say in their tooltip whether they will load a repeater shift or
  clear one.

## 1.6.0

A knob, and a band rack.

- A tuning dial on the Helm. Drag it to turn it, flick it and it coasts to a
  stop under friction, click it while it is spinning and it stops dead. The
  scroll wheel and the arrow keys drive it as well, and it is a spinbutton that
  reports the frequency to a screen reader.
- The dial steps whichever readout digit is armed, and labels its own step size,
  so the same knob is a bandcruiser or a fine tune depending on the digit.
- Detents are absolute positions on the shaft rather than a running total of
  leftover rotation, so turning back by the same amount lands exactly where you
  started.
- Band rack: one button for each of the thirteen bands an FT-897D covers. Each
  sends the radio to the bottom edge of the band with the mode that lives there,
  simplex shift, the band's standard repeater offset preloaded, tone off,
  clarifier zeroed, and split off. The current band stays lit.
- Band buttons work with no radio attached, setting the panel up so a band can
  be chosen before the cable is.
- Helm rendering is now coalesced to one update a frame, so a spinning dial no
  longer rebuilds the shadow grid dozens of times a second.
- Object URL handling for every export is guarded, so a browser that refuses one
  reports it rather than throwing.

## 1.5.0

The readout became the dial.

- Every digit in the frequency readout is now its own control. Point at one and
  use the up and down arrow keys, or the scroll wheel, to tune that place. Page
  up and page down move ten at a time.
- Stepping past nine carries into the place above, and stepping below zero
  borrows from it, the way a real dial behaves. Tuning is clamped at zero and at
  the ceiling the BCD encoding allows, rather than wrapping around.
- Fully operable from the keyboard alone. The readout is a single tab stop; left
  and right pick a digit, up and down tune it, home and end jump to the ends.
  Each digit is a spinbutton that reports its value and its place.
- Holding a key down no longer piles up stale commands on a slow link. The
  display updates immediately and only the latest value is transmitted.
- The readout now updates in place instead of being rebuilt, so a status poll
  can no longer take away the digit the pointer or the keyboard is holding.
- Leading zeros are dimmed rather than dropped, so the digits keep fixed
  positions and a hover target never moves under the pointer.

## 1.4.0

Field use.

- Installable to a home screen when served over http or https, with the icon
  generated from canvas paths inside the file.
- Service worker cache stamped with the release version, older caches purged on
  activate, and an in-app prompt when a newer release is waiting.
- Screen wake lock held through a long sweep.
- One hand Helm layout under 560 px, with a full width transmit key.
- The PWA layer is additive only. From disk Halyard is already offline and
  registers nothing.

## 1.3.0

The log grows up.

- ADIF import, using a length prefixed parser so field values containing angle
  brackets are read correctly.
- Band column, derived from frequency, and a band field in ADIF export.
- Duplicate detection by callsign, band, and ADIF mode, shown as you type rather
  than after you commit.
- Operator grid square setting, with great circle distance and bearing to each
  contact.
- Contact counts now report unique callsigns and bands worked.

## 1.2.0

The bandscope earns its place.

- Ten band presets covering the segments worth staring at.
- Peak hold and averaging across the kept sweeps.
- A marker pair, placed by clicking the trace, with a delta readout.
- Harvest peaks, adding everything above S4 to the locker in bulk and skipping
  what is already there.
- Sweep dwell is floored by the measured settle time when one has been verified,
  and the estimate line says when it has been raised.

## 1.1.0

Trials.

- New Trials station with nine measurement procedures covering the five status
  byte polarities, minimum inter block gap, retune settle time, reply latency,
  and clarifier encoding.
- Constants layer. Every protocol constant is now either verified against this
  radio, with a date and the evidence, or openly marked assumed.
- Verified constants feed the status byte decoders, the link pacing, the command
  timeout, and the bandscope dwell floor.
- Validation report export.
- Manual polarity overrides on the Bench now write through the constants layer
  and drop the constant back to assumed.
- Constants and evidence travel in the instrument export.

## 1.0.0

First release.

- Helm, Bandscope, Locker, Log, and Bench stations.
- Full five byte CAT command set over Web Serial, with a paced and retried
  command queue.
- Shadow model with per field confirmed and asserted provenance.
- Bandscope built from swept S-meter reads, with a waterfall.
- Channel locker with CSV, contact log with ADIF.
- Virtual FT-897D with fault injection, so none of it needed a cable.
- Three themes, self test button, debug logging toggle, export and import.

### A note on release artifacts

Versions 1.1.0 through 1.4.0 were developed in a single pass, so `releases/`
holds only the 1.4.0 artifact. From here each release is saved as its own file.
