# Halyard solar proxy

Halyard's Chart station can display a HamQSL solar report. It cannot fetch one
directly, and neither can any other browser page, because HamQSL sends no
`Access-Control-Allow-Origin` header. The browser blocks the read before your
code ever sees the response. Opening Halyard from disk makes it worse, because a
`file://` page has the origin `null`, which no server allows by name.

This worker sits in front of the report and adds the missing header.

## Deploy

```
cd worker
npx wrangler deploy
```

Wrangler prints a URL. Use the one it prints, not one you expect: the hostname
comes from `name` in `wrangler.toml`, so renaming the worker renames the URL.
Paste it into the **Solar feed address** box on Halyard's Chart station and
press **Fetch now**.

Check it from a terminal before pasting it in, which separates a deployment
problem from a Halyard problem:

```
curl -i https://<your-worker>.workers.dev/
```

You want `200`, a `content-type` of `application/xml`, an
`access-control-allow-origin: *` header, and a body starting with `<solar>`.

**A 404 is not this worker.** There is no code path here that returns one. A 404
at a `workers.dev` hostname means Cloudflare has nothing deployed at that name:
usually the `name` in `wrangler.toml` does not match the hostname you are
trying, or the deploy did not publish to the workers.dev subdomain. Check with:

```
npx wrangler deployments list
```

## What it does

Fetches `https://www.hamqsl.com/solarxml.php`, checks that the body actually
looks like a solar report rather than an error page or a captive portal, and
returns it with `access-control-allow-origin: *` and a fifteen minute edge
cache. Nothing is stored, nothing is logged, and there are no secrets.

## Being a good neighbour

The report is published as a courtesy by N0NBH. The numbers change slowly, so
there is no reason to poll hard. The edge cache here holds each copy for fifteen
minutes, and Halyard itself refuses to fetch more often than that regardless of
how many times you press the button. Please leave both alone.

## If you would rather not run this

Do not set a feed address. The Chart station works without it: sunrise, sunset,
grey line, the band map, and whatever your own sweeps measured all come from
your machine. You can also type the three indices in by hand, and they are
stamped with the time so you can see when they went stale.

GPL-3.0.
