export default {
async fetch(request, env) {
const url = new URL(request.url);

if (url.pathname.startsWith("/api/celestrak/")) {
  const group = url.pathname.split("/").pop();
  if (!/^[a-z0-9-]+$/i.test(group)) {
    return new Response("Invalid satellite group", { status: 400 });
  }
  const upstream = new URL(
    "https://celestrak.org/NORAD/elements/gp.php"
  );
  upstream.searchParams.set("GROUP", group);
  upstream.searchParams.set("FORMAT", "tle");
  try {
    const response = await fetch(upstream, {
      headers: {
        "User-Agent": "GodsEyeView/1.0"
      }
    });
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
return env.ASSETS.fetch(request);

}
};
