import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { ROOT_ROLE } from "../lib/capabilities.js";
import { freeSlug, freeUsername } from "../lib/chamber.js";
import { seedChamberRoles } from "../lib/default-roles.js";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "../lib/jwt.js";
import { hashPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { countAction, secondsUntilAllowed } from "../lib/rate-limit.js";
import { forFirm } from "../lib/tenant.js";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import { signupSchema, type SignupInput } from "../validation/auth.schema.js";

/**
 * An advocate registering their own chamber.
 *
 * This is the one place on the platform where a stranger creates an
 * account, and it is deliberate: the product is that any advocate can
 * download the app and start keeping their diary the same afternoon.
 *
 * It is *not* a way into anybody else's chamber. What it creates is a new,
 * empty one — its own roles, its own capabilities, its own Principal — and
 * the wall described in lib/tenant.ts applies to it from its first query.
 * Staff and clients inside a chamber are still issued, never self-
 * registered: an advocate adds their colleagues, and sends their clients a
 * link. Only the advocate signs themselves up.
 *
 * Every chamber starts unverified. That restricts nothing about its own
 * private work — gating that on a manual check would mean nobody could
 * start on the day they joined — but it is what the platform admin acts on,
 * and what anything published in a chamber's name will later depend on.
 */
export const signupRouter = Router();

/**
 * The door, when the platform is not taking new chambers.
 *
 * On the router rather than on the one handler below, so a second way in
 * added later cannot be left unguarded by forgetting it here.
 *
 * 403 and not 404: the route exists and the refusal is a decision, which
 * is worth saying plainly to an advocate who may well be welcome later.
 */
signupRouter.use((_req, _res, next) => {
  if (!env.publicSignup) {
    next(
      new ApiError(
        403,
        "This platform is not taking new chambers at the moment. Please write to us if you would like one."
      )
    );
    return;
  }
  next();
});

/**
 * New chambers from one address before a cool-off.
 *
 * Deliberately loose. Mobile carriers here put very large numbers of people
 * behind one address, and a courts building shares one too — so a tight
 * limit would turn away real advocates far more often than it would stop
 * anybody. What actually answers a flood of invented chambers is that every
 * one of them starts unverified and the platform admin can suspend it; this
 * is only a brake on the trivial script.
 */
const SIGNUP_MAX = 10;
const SIGNUP_COOLOFF_MINUTES = 6 * 60;

signupRouter.post(
  "/",
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as SignupInput;
    const ip = req.ip ?? "unknown";

    const wait = await secondsUntilAllowed("signup", ip, ip);
    if (wait > 0) {
      throw new ApiError(
        429,
        "Several chambers have already been registered from here. Please try tomorrow, or write to us."
      );
    }

    // Unscoped: an address is unique across the platform, and this is how
    // we find out it already is. The message says only that the address is
    // in use, never which chamber holds it.
    const taken = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (taken) {
      throw new ApiError(
        400,
        "An account already signs in with that address. Sign in instead, or use another address."
      );
    }

    await countAction("signup", ip, ip, SIGNUP_MAX, SIGNUP_COOLOFF_MINUTES);

    // The whole chamber, or none of it. A firm created without its roles
    // would leave its Principal unable to add anybody — and the Principal
    // holds every capability regardless, so they would not notice until
    // they tried.
    const { firm, user } = await prisma.$transaction(async (tx) => {
      const createdFirm = await tx.firm.create({
        data: {
          slug: await freeSlug(input.chamberName),
          name: input.chamberName,
          enrolmentNo: input.enrolmentNo,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          firmId: createdFirm.id,
          email: input.email,
          username: await freeUsername(createdFirm.id, input.fullName),
          fullName: input.fullName,
          passwordHash: await hashPassword(input.password),
          role: ROOT_ROLE,
          // They chose this password themselves, so there is nothing to
          // make them change.
          mustChangePassword: false,
        },
      });

      return { firm: createdFirm, user: createdUser };
    });

    // Outside the transaction: the chamber exists and is usable without its
    // default roles, and the Principal can create them from Roles & Access.
    // Failing the whole registration over them would be the worse outcome.
    try {
      await seedChamberRoles(forFirm(firm.id), firm.id);
    } catch (err) {
      console.error(`Signup: could not seed roles for firm ${firm.id}`, err);
    }

    const token = signSession({
      kind: "staff",
      sub: user.id,
      username: user.username,
      role: user.role,
      firm: firm.id,
    });

    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    res.status(201).json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: false,
      emailIsPlaceholder: false,
      // The Principal holds everything, which the client reads as null.
      capabilities: null,
      // Registering a chamber never makes anybody a platform admin.
      platformAdmin: false,
      token,
      chamber: {
        slug: firm.slug,
        name: firm.name,
        verified: firm.verified,
        /** The link this advocate gives their clients. */
        clientLoginPath: `/client/login/${firm.slug}`,
      },
    });
  })
);
