/**
 * Grants or revokes the authority to run the platform.
 *
 *   npm run platform:grant  -- zeshan@arbitratorandlaw.com
 *   npm run platform:revoke -- somebody@example.com
 *   npm run platform:grant  -- --list
 *
 * Deliberately only from a terminal. This is the power to suspend other
 * advocates' practices, so it is not something a screen can hand out —
 * granting it requires access to the server, not merely an office session
 * somebody left signed in.
 *
 * It is a property of a person, not of a chamber: making a colleague
 * Principal of the platform's own chamber must not quietly give them this.
 */
import { prisma } from "../src/lib/prisma.js";

async function list(): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { platformAdmin: true },
    select: { email: true, fullName: true, firm: { select: { name: true } } },
    orderBy: { id: "asc" },
  });

  if (admins.length === 0) {
    console.log("\n  Nobody runs the platform yet.\n");
    return;
  }

  console.log(`\n  ${admins.length} platform admin(s):`);
  for (const a of admins) {
    console.log(`    ${a.email}  —  ${a.fullName} (${a.firm.name})`);
  }
  console.log();
}

async function main(): Promise<void> {
  const revoking = process.argv.includes("--revoke");
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const email = args[0]?.trim().toLowerCase();

  if (process.argv.includes("--list") || !email) {
    await list();
    if (!email) {
      console.log("  Usage: npm run platform:grant -- <email>");
      console.log("         npm run platform:revoke -- <email>\n");
    }
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, platformAdmin: true, firm: { select: { name: true } } },
  });
  if (!user) throw new Error(`No account signs in with "${email}".`);

  if (user.platformAdmin === !revoking) {
    console.log(
      `\n  ${user.fullName} already ${revoking ? "does not run" : "runs"} the platform.\n`
    );
    return;
  }

  // Refuse to leave the platform with nobody able to run it.
  if (revoking) {
    const others = await prisma.user.count({
      where: { platformAdmin: true, id: { not: user.id } },
    });
    if (others === 0) {
      throw new Error(
        "That is the only platform admin. Grant it to somebody else first, " +
          "or the console becomes unreachable."
      );
    }
  }

  await prisma.user.update({ where: { id: user.id }, data: { platformAdmin: !revoking } });

  console.log(
    `\n  ${revoking ? "Revoked from" : "Granted to"} ${user.fullName} <${email}>` +
      ` of ${user.firm.name}.`
  );
  console.log(
    revoking
      ? "  They keep their own chamber exactly as it was.\n"
      : "  They can now see every chamber's size and suspend one. They still\n" +
          "  cannot read inside anybody else's chamber.\n"
  );

  await list();
}

main()
  .catch((err) => {
    console.error(`\n  ${err instanceof Error ? err.message : err}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
