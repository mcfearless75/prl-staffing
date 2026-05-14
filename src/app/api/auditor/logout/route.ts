export async function POST() {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Expire the httpOnly cookie immediately
      "Set-Cookie": "auditor_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure",
    },
  });
}
