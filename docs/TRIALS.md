# The bench validation session

Halyard ships knowing the FT-897D protocol the way books describe it. The books
disagree with each other. This session replaces nine assumptions with nine
measurements taken from your radio, and takes about twenty minutes.

Do it once. The results are stored, dated, and carried in your exports.

## Before you start

Have ready:

- The radio, powered, with the CAT cable connected and menu 019 matching the
  rate selected in Halyard.
- A dummy load or a matched antenna. One trial keys the transmitter.
- A frequency you are licensed to transmit on.
- A steady carrier you can rely on: a beacon, or a repeater you can hold open.
- A repeater you can hear that uses a tone you know, for the tone trial.

Connect first. Trials need a radio.

## The trials

**Signal present polarity.** Reads the receive status byte with the squelch
closed, then with it open, and works out which way bit 7 actually runs.

**Discriminator centred polarity.** The same two-sample method on bit 5, with no
signal and then with a signal exactly on frequency.

**Tone match polarity.** The same on bit 6, with the decoder armed and quiet,
then with a correctly toned signal present. This is the one that needs the band
to be alive. If nothing is on the air, skip it and come back.

**PTT polarity.** Reads the transmit status byte while receiving, keys the radio
for about a second, reads again, and drops back. It will ask you to confirm the
radio is safe to key first. It also warns you if the power meter reads zero
while keyed, which usually means the PO bar cannot be trusted.

**Split polarity.** Turns split off, reads, turns it on, reads, and restores
whatever it found.

**Minimum inter block gap.** Sends bursts of alternating frequency commands at
shrinking gaps, reading back after each burst to see whether anything was lost.
The smallest gap that survives four clean bursts is adopted, with fifty percent
margin. If nothing up to 120 ms is reliable, the problem is the cable, the rate,
or menu 019, and the trial says so.

**Retune settle time.** Jumps off a steady carrier and back five times, polling
the S-meter until the reading stops moving. The median becomes the floor for
bandscope dwell. Sweeping faster than this measures nothing.

**Reply latency.** Times twenty frequency reads. The median sizes the command
timeout, so a slow cable stops looking like a broken radio.

**Clarifier encoding.** Sends an offset intended to read plus 1.23 kHz and asks
you what the radio's clarifier display actually shows. This is the only trial
whose answer comes from your eyes rather than from the wire, because the radio
will not report its clarifier.

## Reading the results

Each trial writes to the Constants panel with a date and a one line note about
the evidence behind it. **Verified** means measured here. **Assumed** means still
just documentation.

A trial can report *inconclusive*. That happens when the bit did not move
between the two samples, which usually means one of the two conditions was not
really set up. It is not a failure, and it never guesses.

Trials that abandon partway change nothing.

## Afterwards

Save the report. It records every constant, whether it is verified, when, and
the evidence line behind it, followed by the full measurement log.

Attach that file to any bug report about protocol behaviour. It is usually the
whole answer.

Overriding a constant by hand on the Bench station is allowed and drops it back
to *assumed*, because a value you typed is not a measurement.
