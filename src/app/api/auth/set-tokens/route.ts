import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { accessToken, refreshToken, expiresIn } = await req.json();
  const c = await cookies();

  c.set("access_token", accessToken, {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: expiresIn,
  });

  c.set("refresh_token", refreshToken, {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ ok: true });
}
