import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  // remove cookies
  cookieStore.set("access_token", "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
  });

  cookieStore.set("refresh_token", "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
  });

  cookieStore.set("email", "", {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
  });

  return Response.json({ message: "Logged out" }, { status: 200 });
}
