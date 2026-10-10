
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
    if (url.pathname === "/api/flights") {
      try {
        const response = await fetch(
          "https://opensky-network.org/api/states/all?extended=1",
          {
            headers: { "Accept": "application/json" },
            signal: AbortSignal.timeout(20000)
          }
        );

        return new Response(response.body, {
          status: response.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=15"
          }
        });
      } catch {
        return Response.json(
          { error: "Live flight data temporarily unavailable" },
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
