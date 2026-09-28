# Deploying to arbitratorandlaw.com

What to run, in what order, and how to get back if it goes wrong.

Rehearsed on 28 September 2026 against a database built from this
repository's own migration history and filled with records, so that what is
written below is what actually happened rather than what ought to happen.

---

## What this deployment changes

Four migrations your server has not seen:

    20260927203000_office_diary_parity
    20260927210000_grant_diary_caps
    20260927220000_library_folders
    20260928090000_fee_reminders

They took **1.1 seconds** in the rehearsal. They are additive: every column
they add to a table you already have is nullable or has a default, so no
existing row can be left invalid. Nothing is dropped that holds data.

One of them changes something you should know about before you run it:
`grant_diary_caps` gives the **editor** and **associate** roles the
`tasks.view` and `tasks.edit` capabilities, so that people who already work
on your cases can use the diary. In the rehearsal a chamber with 3
capability rows came out with 7. If you do not want your associates writing
in the diary, take it away afterwards in Roles & Access.

New endpoints come with them. All were called against the migrated database
and answered:

    GET  /api/office/dashboard          200
    GET  /api/office/tasks              200
    POST /api/office/tasks              201
    GET  /api/office/library-folders/:kind   200
    POST /api/office/library-folders/:kind   201
    POST /api/office/statements/:scope/:id   200
    POST /api/office/fee-reminders           201
    GET  /api/office/fee-reminders/:clientId 200
    GET  /privacy                        200   (the Play Store listing needs this)

The statement link was opened and refused correctly six ways: the wrong
case, the wrong scope, no token, a sign-in token used as a statement grant,
and the grant used as a sign-in — 403, 403, 403, 403, 401.

---

## Before you start

Have ready:

- Your cPanel Terminal, in the repository folder.
- `backend/.env` already filled in for production. **Do not send it to
  anyone, and do not put it in the repository.** It holds the database
  password.
- `BACKUP_DIR` and `UPLOAD_DIR` in that file set to absolute paths
  **outside** the repository folder. The deploy script refuses to run
  otherwise, and it is right to: a deployment replaces the repository
  folder, and would take your backups and your clients' documents with it.

Pick a quiet hour. The API is down between the restart and the moment it
comes back — seconds, but a hearing is not the time to find out.

---

## The deployment

    cd ~/path/to/zeeshan_law_website
    git pull origin main
    ./scripts/deploy.sh

`scripts/deploy.sh` does the whole thing in order, and **backs the database
up first, before it changes anything**. It stops at the first failure
rather than carrying on. It will not start or restart anything — that is
the panel's job, and a script that fights the panel leaves two copies of
your server running.

When it finishes it prints what to restart. In cPanel that is:

- **Setup Node.js App** → your API application → **Restart**
- and the same for the website application.

---

## Check it worked

    curl -s https://api.arbitratorandlaw.com/api/health

Expect: `{"status":"ok","database":"connected"}`

Then, in a browser:

    https://api.arbitratorandlaw.com/privacy

Expect the privacy notice. **The Play Console checks this page**, so it
must be publicly reachable before you submit anything.

Then open the app and look at four things:

1. **Your day** — the four counts, and the period buttons.
2. **Overdue** — tap the count; the diary should open.
3. A **case file** — the case number, sections, FIR, stage, order sheet.
4. **Account → Your library** — the shelves.

If the diary is empty that is correct: it is a new table, and there is
nothing in it yet.

---

## If it goes wrong

The backup taken at the start of the run is in your `BACKUP_DIR`, named by
the date. To put the database back:

    gunzip -c "$BACKUP_DIR/<the file>.sql.gz" | psql "<your DATABASE_URL>"

The dump is written with `--clean --if-exists`, so it restores over the
existing database without being dropped first.

To put the code back, find the commit you were on before the pull:

    git reflog                 # the line above the pull
    git checkout <that commit>
    npm ci && npm run build:backend && npm run build:frontend

then restart both applications in cPanel.

Restore the database **and** the code, not one of them. A new database
under old code, or the reverse, is worse than either.

---

## The Play Store reviewer's account

Google will not review an app it cannot sign in to. Make the account on the
server, after this deployment:

    cd backend
    npm run staff:issue -- "Play Reviewer" associate reviewer@arbitratorandlaw.com

It prints a generated password once. Put that in the Play Console's **App
access** section and nowhere else — not in this repository, not in a
message to me, not in a photograph.

Give it the **associate** role, not admin: a reviewer needs to see that the
app works, not to be able to change your records.

Better still, make it in a chamber holding only invented matters, so that a
stranger at Google never opens a real client's file. If you would rather do
that, say so and I will set the second chamber up.
