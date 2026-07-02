import withAuth from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/((?!login(?:/|$)|signup(?:/|$)|invite(?:/|$)|api/auth(?:/|$)|api/seed(?:/|$)|api/signup(?:/|$)|api/invites/token(?:/|$)|api/webhooks(?:/|$)|api/health(?:/|$)|_next/static(?:/|$)|_next/image(?:/|$)|favicon\\.ico$).*)",
  ],
};
