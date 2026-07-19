# The FT-897D CAT protocol, as Halyard implements it

Every command is exactly five bytes: four parameter bytes followed by an opcode.

    P1 P2 P3 P4 OPCODE

Serial line settings: 8 data bits, **2 stop bits**, no parity, no flow control.
The two stop bits are not optional and are a common cause of a link that almost
works. Rate is set by menu 019 on the radio; 4800 is the factory default.

The port is RS-232 level on an eight pin mini-DIN. A CT-62 or equivalent
converter is required.

## Commands that return nothing

| Opcode | Command | Parameters |
| --- | --- | --- |
| `0x00` | Dial lock on | none |
| `0x80` | Dial lock off | none |
| `0x01` | Set frequency | P1 to P4, 8 BCD digits, units of 10 Hz |
| `0x07` | Set mode | P1 = mode code |
| `0x02` | Split on | none |
| `0x82` | Split off | none |
| `0x08` | PTT on | none |
| `0x88` | PTT off | none |
| `0x81` | Toggle VFO A and B | none |
| `0x05` | Clarifier on | none |
| `0x85` | Clarifier off | none |
| `0xF5` | Clarifier offset | P1 = `0x00` plus or `0xFF` minus, P3 P4 BCD |
| `0x09` | Repeater shift | P1 = `0x09` simplex, `0x49` minus, `0x89` plus |
| `0xF9` | Repeater offset | P1 to P4, 8 BCD digits, units of 10 Hz |
| `0x0A` | Tone mode | P1 = `0x8A` off, `0x4A` CTCSS, `0x2A` DCS, `0x0A` encode and decode |
| `0x0B` | CTCSS tone | P1 P2 transmit tone, P3 P4 receive tone, BCD, tenths of a hertz |
| `0x0C` | DCS code | P1 P2 transmit code, P3 P4 receive code, BCD |
| `0x0F` | Power on | none |
| `0x8F` | Power off | none |

Mode codes: `0x00` LSB, `0x01` USB, `0x02` CW, `0x03` CW reverse, `0x04` AM,
`0x06` wide FM, `0x08` FM, `0x0A` digital, `0x0C` packet.

## Commands that return something

There are three. This is the entire read capability of the radio.

### `0x03` read frequency and mode, returns 5 bytes

Four BCD bytes of frequency in units of 10 Hz, then one mode byte using the
codes above.

### `0xE7` read receive status, returns 1 byte

| Bits | Meaning |
| --- | --- |
| 7 | squelch, documented as set when squelched |
| 6 | tone or code match, documented as set when unmatched |
| 5 | discriminator, documented as set when off centre |
| 4 | unused |
| 3 to 0 | S-meter, 0 to 15 |

### `0xF7` read transmit status, returns 1 byte

| Bits | Meaning |
| --- | --- |
| 7 | PTT, documented as clear while transmitting |
| 6 | high SWR, set when high |
| 5 | split, documented as clear when split is on |
| 4 | unused |
| 3 to 0 | power output, 0 to 15 |

**The word "documented" in those two tables is doing a lot of work.** Published
sources disagree about the sense of every one of those flag bits. Halyard treats
each as a variable rather than a constant. See `TRIALS.md`.

## What cannot be read

There is no command to read tone mode, tone frequency, DCS code, repeater shift,
repeater offset, clarifier state, clarifier offset, which VFO is selected, dial
lock, or any memory channel. There is **no memory read or write command of any
kind.**

This is why Halyard keeps a shadow model and marks those fields *asserted*, and
why the Locker is a browser side channel bank rather than a memory programmer.

## Pacing

The radio drops command blocks sent back to back. Halyard serialises every
exchange through a queue and waits a gap between blocks. The shipped default is
40 ms. The **gap trial** measures the real figure for your radio and cable.

## S-meter scale

Raw 0 to 15. Halyard labels 0 through 9 as S0 to S9, and 10 through 15 as S9+10
through S9+60 in decibels. This mapping is a convention, not a calibration. The
radio does not report decibels and its S-meter is not calibrated.

## Frequency resolution

Commands carry frequency in units of 10 Hz across 8 BCD digits, so the range is
0 to 999.999.99 MHz and the resolution is 10 Hz. Halyard rounds to 10 Hz before
encoding and rejects anything outside the range rather than sending a malformed
block.
