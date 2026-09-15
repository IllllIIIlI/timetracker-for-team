import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../lib/prisma";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("Google account has no email"));
        }

        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          update: {
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          },
          create: {
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          },
        });

        // Turn any pending invites addressed to this email into real memberships.
        const invites = await prisma.projectInvite.findMany({ where: { email } });
        if (invites.length > 0) {
          await prisma.$transaction([
            ...invites.map((invite) =>
              prisma.projectMember.upsert({
                where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
                update: {},
                create: { projectId: invite.projectId, userId: user.id, role: "MEMBER" },
              })
            ),
            prisma.projectInvite.deleteMany({ where: { email } }),
          ]);
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export default passport;
