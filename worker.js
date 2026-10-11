import { normalizeAdsbLolPointResponse } from "./src/data/adsbLolFallback.js";

  export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Satellite data
    if (url.pathname.startsWith("/api/celestrak/")) {
      const group = url.pathname.split("/").pop();

      if (!/^[a-z0-9-]+$/i.test(group)) {
        return new Response("Invalid satellite group", {
          status: 400
        });
      }

      const upstream = new URL(
        "https://celestrak.org/NORAD/elements/gp.php"
      );
      upstream.searchParams.set("GROUP", group);
      upstream.searchParams.set("FORMAT", "tle");

      try {
        const response = await fetch(upstream);
        return new Response(response.body, {
          status: response.status,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600"
          }
        });
      } catch {
        return new Response("Satellite data unavailable", {
          status: 502
        });
      }
    }

   // Live flight data
    
    // Temporary PlaneTrack connection test
    if (url.pathname === "/api/planetrack-test") {
      if (!env.PLANETRACK_API_KEY) {
        return Response.json({ ok: false, error: "API key secret is missing" }, { status: 500 });
      }

      try {
        const response = await fetch(
          "https://planetrack.ai/v1/live?window_secs=60&limit=100",
          {
            headers: {
              "X-API-Key": env.PLANETRACK_API_KEY,
              "Accept": "application/json"
            },
            signal: AbortSignal.timeout(10000)
          }
        );

        const payload = await response.json().catch(() => ({}));

        return Response.json({
          ok: response.ok,
          status: response.status,
          count: Array.isArray(payload.aircraft) ? payload.aircraft.length : null,
          error: response.ok ? null : (payload.error || payload.message || "Provider request failed")
        });
      } catch (error) {
        return Response.json({
          ok: false,
          error: error?.name || "Request failed"
        }, { status: 502 });
      }
    }

    // Live flight data — regular flights only
    
    if (url.pathname === "/api/flights") {
      const lat = Number(url.searchParams.get("lat"));
      const lon = Number(url.searchParams.get("lon"));

      if (
        !Number.isFinite(lat) || !Number.isFinite(lon) ||
        lat < -90 || lat > 90 || lon < -180 || lon > 180
      ) {
        return Response.json(
          { error: "A valid map latitude and longitude are required" },
          { status: 400 }
        );
      }

      if (!env.PLANETRACK_API_KEY) {
        return Response.json(
          { error: "PlaneTrack API key is not configured" },
          { status: 500 }
        );
      }

      try {
        const response = await fetch(
          "https://planetrack.ai/v1/live?window_secs=60&limit=100",
          {
            headers: {
              "X-API-Key": env.PLANETRACK_API_KEY,
              "Accept": "application/json"
            },
            signal: AbortSignal.timeout(10000)
          }
        );

        if (!response.ok) {
          return Response.json(
            {
              error: "PlaneTrack flight data unavailable",
              providerStatus: response.status
            },
            { status: 502 }
          );
        }

        const payload = await response.json();
        const aircraft = Array.isArray(payload.aircraft)
          ? payload.aircraft
          : [];

        const now = Math.floor(Date.now() / 1000);

        const states = aircraft
          .filter(a =>
            Number.isFinite(Number(a.lat)) &&
            Number.isFinite(Number(a.lon)) &&
            Number(a.lat) >= -90 && Number(a.lat) <= 90 &&
            Number(a.lon) >= -180 && Number(a.lon) <= 180
          )
          .map(a => {
            const seen = a.last_seen
              ? Math.floor(new Date(a.last_seen).getTime() / 1000)
              : now;

            return [
              a.icao24 || "",
              a.callsign || "",
              "",
              seen,
              seen,
              Number(a.lon),
              Number(a.lat),
              Number.isFinite(Number(a.altitude))
                ? Number(a.altitude) * 0.3048
                : null,
              false,
              Number.isFinite(Number(a.velocity))
                ? Number(a.velocity) * 0.514444
                : null,
              Number.isFinite(Number(a.heading))
                ? Number(a.heading)
                : null,
              null,
              null,
              null,
              null,
              false,
              0
            ];
          });

        return Response.json(
          { time: now, states },
          {
            headers: {
              "Cache-Control": "public, max-age=10",
              "X-Flight-Source": "PlaneTrack"
            }
          }
        );
      } catch (error) {
        return Response.json(
          {
            error: "Live flight data temporarily unavailable",
            providerError: error?.name || "Fetch failed"
          },
          { status: 502 }
        );
      }
    }

    // Military flight data
    if (url.pathname === "/api/military") {
      try {
        const response = await fetch(
          "https://api.adsb.lol/v2/mil",
          {
            headers: {
              "Accept": "application/json",
              "User-Agent": "GodsEyeView/1.0 (flight data viewer)"
            },
            signal: AbortSignal.timeout(8000)
          }
        );

        return new Response(response.body, {
          status: response.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=12"
          }
        });
      } catch {
        return Response.json(
          { error: "Military flight data temporarily unavailable" },
          { status: 502 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
