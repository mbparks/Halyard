# Halyard test harnesses

Halyard's real test suite lives inside `halyard.html` and runs from the Bench
station with the **Run self test** button. That is the browser runnable harness,
and it is the one that matters, because it runs in the same environment the
instrument actually ships into.

These two files run that same suite headlessly so continuous integration can
gate a release.

    npm install
    npm test

`selftest.mjs` loads the app under jsdom and calls the in-app suite. 390
assertions.

`integration.mjs` drives the real user interface: connecting to the virtual
radio, applying the panel, reading back and watching provenance flip from
asserted to confirmed, stepping, keying, running a full sweep and confirming it
finds a planted signal and restores the original frequency, placing markers,
harvesting peaks, running trials end to end and abandoning one partway,
importing and re-importing ADIF, tuning individual digits by pointer, focus, and
scroll wheel, turning and flicking the dial, choosing bands, and checking what
the export actually contains. 265 checks.

## Why the stubs

jsdom has no canvas backend, no `URL.createObjectURL`, and no `showModal`, so
both harnesses stub them. The stubs are deliberately dumb: they record nothing
and assert nothing, so a test can never pass because of a stub. Anything that
genuinely needs a browser, chiefly Web Serial and the wake lock, is not covered
here and has to be exercised by hand.

## What these cannot tell you

Neither harness has ever spoken to a Yaesu. They test that Halyard matches the
documented protocol, not that the documented protocol matches your radio. That
is what the Trials station is for. See `../docs/TRIALS.md`.
