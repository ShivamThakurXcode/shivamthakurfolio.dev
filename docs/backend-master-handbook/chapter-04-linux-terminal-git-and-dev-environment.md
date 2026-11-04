# The Backend Master Handbook

### From Absolute Beginner to Production-Grade Engineer

---

# Chapter 4: Linux, the Terminal, Git & Your Dev Environment

---

## 4.0 Why This Chapter Matters

You can write perfect code and still be stuck if you can't:

- Log into a remote machine and find out why your app is down.
- Read a 2 GB log file without opening it in an editor.
- Find which process is hogging port 3000.
- Keep a secret out of your repository.
- Undo a Git mistake without panicking.

Almost every production server on Earth runs **Linux**. When you deploy ShopLine in Chapter 32, you won't get a pretty desktop; you'll get a **blinking cursor**. This chapter makes that cursor friendly.

We cover two toolkits that every backend engineer uses daily:

1. **The Linux terminal**: navigating, searching, permissions, processes, environment variables, SSH, services.
2. **Git**: the time machine and collaboration tool for your code.

Plus a clean, repeatable **dev environment** for Node.js projects.

### 💡 Did You Know?

Linux was started in 1991 by 21-year-old Linus Torvalds as a hobby ("just a hobby, won't be big and professional"). Today it runs the vast majority of web servers, all of the top supercomputers, every Android phone, and the cloud itself. Git was *also* created by Linus Torvalds, in 2005, in about two weeks, because the Linux kernel team needed a better version-control tool.

---

## 4.1 Setting Up: Terminals on Every Operating System

| Your computer | What to use |
|---|---|
| **Linux** | Built-in terminal. You're home. |
| **macOS** | Terminal or iTerm2. macOS is Unix-based, so nearly everything here works as-is. |
| **Windows** | Install **WSL2** (Windows Subsystem for Linux) and use Ubuntu inside it. |

**Windows setup (recommended path):** open PowerShell **as Administrator** and run:

```powershell
wsl --install
```

Restart, create a Linux username and password, and you have a real Ubuntu terminal. Keep your projects *inside* the Linux filesystem (e.g., `~/projects`) for speed, and use VS Code's **WSL extension** (`code .` from the Linux terminal) to edit them.

> Everything in this chapter assumes a Bash-like shell. PowerShell and `cmd.exe` have different syntax; if you're on Windows, use WSL for the Linux sections (Git Bash also works for the basics).

### What's a shell, a terminal, a console?

- **Terminal:** the window you type into.
- **Shell:** the program inside it that interprets your commands (`bash`, `zsh`, `fish`).
- **Command:** a program (or built-in) that the shell runs.

The prompt looks like `user@server:~/projects$`. The `$` means "ready for a command" (a `#` means you're the all-powerful root user, so be careful).

---

## 4.2 The Linux Filesystem: One Tree

Unlike Windows (C:, D:), Linux has **one tree** starting at `/` (root). Everything is a file or a folder in that tree.

```
/
├── home/         ← users' personal folders  (/home/asha  =  ~)
├── etc/          ← system configuration files (text!)
├── var/
│   └── log/      ← log files live here
├── usr/          ← installed programs and libraries
├── bin/ sbin/    ← essential commands
├── tmp/          ← temporary files (cleared on reboot)
├── opt/          ← optional third-party software
├── dev/          ← devices appear as files
├── proc/         ← live view into the kernel/processes
└── root/         ← the root user's home
```

Two special shortcuts: `~` = your home folder, `.` = current folder, `..` = parent folder.

### 🧠 Memory Trick

**"etc = configuration, var/log = logs, home = you, tmp = trash."** If you can place a file's purpose, you can find it on any server.

---

## 4.3 Navigating and Managing Files

```bash
pwd                       # print working directory: where am I?
ls                        # list files
ls -la                    # long format, include hidden files (names starting with .)
cd /var/log               # change directory (absolute path)
cd ..                     # up one level
cd ~                      # home          (or just:  cd)
cd -                      # back to the previous directory

mkdir projects            # create folder
mkdir -p a/b/c            # create nested folders in one go
touch notes.txt           # create an empty file (or update its timestamp)
cp notes.txt backup.txt   # copy
cp -r src src_backup      # copy folders recursively
mv backup.txt old.txt     # move OR rename
rm old.txt                # delete a file (NO recycle bin!)
rm -r folder              # delete a folder and everything inside
```

### ⚠ Common Mistake: `rm -rf` is permanent

There's no undo and no recycle bin. `rm -rf /` (or `rm -rf ~`, or a variable that turned out empty: `rm -rf "$DIR/"`) has ended careers. Before running a destructive command: **`ls` the target first**, use absolute or clearly-checked paths, and on servers prefer moving to a trash folder over deleting.

### Viewing files

```bash
cat file.txt              # print the whole file
less file.txt             # scroll through (q to quit, / to search, G = end)
head -n 20 file.txt       # first 20 lines
tail -n 50 file.txt       # last 50 lines
tail -f app.log           # FOLLOW the file live as it grows. Your #1 debugging tool
wc -l file.txt            # count lines
```

### Editing files in the terminal

You'll eventually SSH into a server with no VS Code. Learn the bare minimum of **`nano`** (easy: `nano file`, Ctrl+O save, Ctrl+X exit) and be able to *survive* in **`vim`**: press `i` to type, `Esc` then `:wq` to save and quit, `:q!` to quit without saving.

---

## 4.4 Searching: `grep`, `find` and Friends

**`grep`** searches *inside* files:

```bash
grep "ERROR" app.log                  # lines containing ERROR
grep -i "error" app.log               # case-insensitive
grep -n "timeout" app.log             # show line numbers
grep -r "TODO" src/                   # search a whole folder recursively
grep -v "healthcheck" app.log         # invert: lines NOT containing it
grep -c "500" access.log              # just count matches
grep -E "5[0-9]{2}" access.log        # extended regex: any 5xx
grep -B2 -A5 "Exception" app.log      # show 2 lines Before and 5 After each match
```

**`find`** searches for files by name, type, size, age:

```bash
find . -name "*.js"                   # all JS files below here
find . -name "node_modules" -prune -o -name "*.js" -print   # skip node_modules
find /var/log -type f -size +100M     # files over 100 MB
find . -mtime -1                      # modified in the last day
```

**Disk usage** (a full disk is a classic outage cause):

```bash
df -h                    # free space per disk
du -sh *                 # size of each item in this folder
du -h --max-depth=1 /var | sort -h    # which /var folder is hogging space?
```

---

## 4.5 Pipes and Redirection: The Superpower

The Unix philosophy: **small tools that do one thing, chained together.**

- `|` (pipe) sends one command's output into another's input.
- `>` writes output to a file (overwrites). `>>` appends.
- `2>` redirects errors (stderr). `2>&1` merges errors into normal output.

```bash
ls | wc -l                                     # how many files here?
cat access.log | grep " 500 " | wc -l          # how many 500 errors?
ps aux | grep node                             # is node running?
echo "hello" > out.txt                         # write
echo "again" >> out.txt                        # append
node server.js > server.log 2>&1               # all output to a file
node broken.js 2> errors.txt                   # only errors to a file
command > /dev/null 2>&1                       # throw everything away
```

### A real analysis, step by step

Imagine `access.log` lines look like: `203.0.113.5 GET /products 200 12ms`. Find the top 5 IPs hitting you:

```bash
cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -5
```

Output:

```
  8421 203.0.113.5
  1203 198.51.100.7
   977 192.0.2.44
    ...
```

Reading it left to right: *extract the first column → sort so duplicates are adjacent → count duplicates → sort by count descending → keep the top five.* Five tiny tools, one answer. This pattern is how engineers triage incidents.

### Handy text tools

```bash
sort | uniq -c           # count occurrences
cut -d',' -f2 data.csv   # pick the 2nd comma-separated column
awk '{print $1, $4}' f   # print columns 1 and 4 of each line
sed 's/old/new/g' f      # find-and-replace in a stream
jq '.items[].name'       # query JSON (install jq; invaluable with APIs)
xargs                    # turn lines into arguments:  find . -name "*.tmp" | xargs rm
```

### 🚀 Pro Tip

`curl -s https://api.example.com/users | jq '.[] | {id, name}'` fetches an API and prints only the fields you care about. `jq` is to JSON what `grep` is to text.

---

## 4.6 Permissions and Users

Every file has an **owner**, a **group**, and three sets of permissions: for the *owner*, the *group*, and *everyone else*.

```bash
ls -l
-rwxr-xr--  1 asha  devs  2048 Nov  3 10:00 deploy.sh
 │└┬┘└┬┘└┬┘
 │ │  │  └─ others:  r--  (read only)
 │ │  └──── group:   r-x  (read + execute)
 │ └─────── owner:   rwx  (read + write + execute)
 └───────── type: - file, d directory, l symlink
```

Permissions as numbers: **r = 4, w = 2, x = 1**. Add them per group:

| Mode | Meaning | Typical use |
|---|---|---|
| `755` | owner rwx, others r-x | Scripts, programs, public folders |
| `644` | owner rw-, others r-- | Normal files |
| `600` | owner rw- only | **Private keys, secrets** |
| `700` | owner rwx only | Private folders (e.g., `~/.ssh`) |

```bash
chmod 600 id_ed25519       # set exact permissions
chmod +x deploy.sh         # make executable
chown asha:devs file       # change owner and group (needs sudo)
sudo command               # run one command as root (administrator)
```

### Principle of Least Privilege

Run your app as a **normal, restricted user**, never as root. If someone exploits a bug in your app, they get only that user's power. We'll enforce this again in Docker (Chapter 31). SSH will *refuse* to use a private key that other users can read (`chmod 600` fixes the "UNPROTECTED PRIVATE KEY FILE" error).

### ⚠ Common Mistake: `chmod 777`

When something gives "Permission denied," beginners reach for `chmod -R 777`, making everything writable by everybody. This hides the real problem (wrong owner or group) and creates a security hole. Fix **ownership**, not by opening the doors to everyone.

---

## 4.7 Processes and Signals

A **process** is a running program. Every process has a **PID** (process ID).

```bash
ps aux                        # list all processes
ps aux | grep node            # just node processes
top        # or: htop         # live view: CPU, memory, per process (q to quit)
free -h                       # memory usage
uptime                        # load averages
lsof -i :3000                 # who is using port 3000?   (macOS/Linux)
ss -tlnp                      # listening TCP ports + owning processes (Linux)
```

### Stopping processes: signals

You don't "close" a process; you send it a **signal**.

| Signal | Number | Meaning | Can the program handle it? |
|---|---|---|---|
| `SIGINT` | 2 | "Interrupt": what Ctrl+C sends | Yes |
| `SIGTERM` | 15 | "Please shut down gracefully": the default `kill` | **Yes** |
| `SIGKILL` | 9 | "Die now," no cleanup | **No**, the kernel enforces it |
| `SIGHUP` | 1 | Terminal closed / reload config | Yes |

```bash
kill 12345         # sends SIGTERM to PID 12345 (polite)
kill -9 12345      # SIGKILL (last resort: no cleanup, may corrupt data)
pkill -f server.js # kill by command-line match
```

**Golden rule: try `SIGTERM` first; use `SIGKILL` only if it ignores you.** A program given `SIGTERM` can finish in-flight requests, close DB connections and flush logs. `SIGKILL` can't. This matters because **Docker, Kubernetes, PM2 and systemd all stop your app with SIGTERM** (then SIGKILL after a timeout). Your Node app must handle it; we'll write that in Chapters 5 and 26:

```javascript
// shutdown-demo.js
const http = require('node:http');

const server = http.createServer((req, res) => res.end('ok\n')).listen(3000);

function shutdown(signal) {
  console.log(`${signal} received: closing server...`);
  server.close(() => {            // stop accepting new connections; finish current ones
    console.log('Closed cleanly');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();   // safety net
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

Run it, press Ctrl+C, and you'll see `SIGINT received: closing server...` / `Closed cleanly`.

### Background jobs and keeping things running

```bash
node server.js &          # run in background (dies when you log out!)
jobs                      # list background jobs
fg                        # bring one back to foreground
nohup node server.js &    # keep running after logout (crude)
```

For real deployments you'll use a **process manager** instead (§4.11), not `nohup`.

---

## 4.8 Environment Variables and Configuration

An **environment variable** is a named value attached to a process, a standard way to pass configuration (ports, database URLs, API keys) *without hard-coding them*.

```bash
export PORT=8080            # set for this shell and its children
echo $PORT                  # read
env                         # list all
PORT=4000 node server.js    # set for one command only
```

In Node:

```javascript
const port = Number(process.env.PORT) || 3000;
const dbUrl = process.env.DATABASE_URL;           // undefined if not set
if (!dbUrl) throw new Error('DATABASE_URL is required');   // fail fast!
```

### Why environment variables?

The **Twelve-Factor App** rule: *config that varies between environments (dev, staging, production) goes in the environment, not in code.* The same code artifact runs everywhere; only config changes. It also keeps **secrets out of Git**.

### `.env` files

Typing 15 variables each time is silly, so we keep them in a `.env` file:

```
# .env  (NEVER commit this file)
PORT=3000
DATABASE_URL=postgres://shop:secret@localhost:5432/shopline
JWT_SECRET=change-me
```

Modern Node (v20.6+) loads it natively, no package needed:

```bash
node --env-file=.env server.js
```

(Older projects use the `dotenv` package: `require('dotenv').config()`.)

Then commit a **`.env.example`** with fake values so teammates know what's required:

```
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/dbname
JWT_SECRET=replace-me
```

### Validate config at startup

```javascript
// config.js
const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);               // crash at boot, NOT at 3 a.m. on first use
}
module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  isProd: process.env.NODE_ENV === 'production',
};
```

**Fail fast:** a misconfigured app should refuse to start, loudly, rather than limp along and fail on the first real user.

### ⚠ Common Mistake: Committing secrets

Once a secret is in Git history, **it is compromised forever**, even if you delete it in the next commit (bots scan GitHub within *seconds* for AWS keys and DB passwords). If it happens: **rotate the secret immediately** (generate a new one, revoke the old), then clean the history. Prevention: `.gitignore` for `.env`, and secret scanners (e.g., `gitleaks`) in CI. Chapter 23 covers real secret management.

### `PATH`

`PATH` is the list of folders the shell searches for commands. `which node` shows which `node` would run. If a freshly installed tool is "command not found," it's usually not in `PATH`.

### 🧠 Memory Trick

**Config → environment. Secrets → environment/secret manager. Code → Git.** Never swap them.

---

## 4.9 Package Managers and Node Tooling

### System packages

```bash
sudo apt update                 # Debian/Ubuntu: refresh package lists
sudo apt install -y curl git jq # install
sudo apt upgrade                # upgrade installed packages
```

(`brew` on macOS, `dnf`/`yum` on Fedora/RHEL, `apk` on Alpine, popular in Docker.)

### Managing Node versions: use `nvm` (or `fnm`, `volta`)

Different projects need different Node versions. Don't install a single global Node; use a version manager:

```bash
nvm install --lts          # install the latest Long-Term-Support Node
nvm use --lts
nvm ls                     # list installed
echo "22" > .nvmrc         # pin the project's Node major version
nvm use                    # reads .nvmrc
```

**Use LTS (even-numbered, long-term-support) releases in production.** They get security fixes for years; odd-numbered "Current" releases are short-lived.

### npm essentials

```bash
npm init -y                      # create package.json
npm install express              # add a dependency (saved in package.json)
npm install -D vitest            # add a dev-only dependency
npm ci                           # clean install EXACTLY from package-lock.json (use in CI/Docker)
npm run dev                      # run a script defined in package.json
npm outdated                     # what has newer versions?
npm audit                        # known vulnerabilities in dependencies
npx some-tool                    # run a package binary without installing globally
```

A starter `package.json`:

```json
{
  "name": "shopline-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch --env-file=.env src/server.js",
    "test": "node --test"
  }
}
```

### Semantic Versioning

Versions are `MAJOR.MINOR.PATCH` (e.g., `4.18.2`):
- **PATCH:** bug fixes, safe.
- **MINOR:** new backwards-compatible features.
- **MAJOR:** breaking changes.

In `package.json`, `^4.18.2` means "any 4.x.x ≥ 4.18.2"; `~4.18.2` means "any 4.18.x"; no prefix means exact.

### The lockfile is not optional

`package-lock.json` records the *exact* version of every dependency (including transitive ones). **Commit it**, and use `npm ci` in CI/production so everyone gets identical code. Without it, "works on my machine" becomes "works on the day I installed."

### Supply-chain caution

Every package you install is code you're running with your server's privileges. Prefer well-maintained packages, check download counts and maintainers, keep the dependency tree small, run `npm audit`, and never `npm install` a package because a chatbot or blog suggested a name you haven't verified (attackers register look-alike names; this is called **typosquatting**). More in Chapter 23.

---

## 4.10 SSH: Safely Controlling Remote Machines

**SSH (Secure Shell)** gives you an encrypted terminal on a remote machine (port 22). It's how you will administer servers.

### Key-based login (do this instead of passwords)

```bash
ssh-keygen -t ed25519 -C "asha@laptop"      # creates ~/.ssh/id_ed25519 (PRIVATE) and .pub (PUBLIC)
```

- **Private key** (`id_ed25519`): never share, never commit, `chmod 600`.
- **Public key** (`id_ed25519.pub`): safe to share; place it on servers (and GitHub) in `~/.ssh/authorized_keys`.

```bash
ssh-copy-id asha@203.0.113.10        # install your public key on the server
ssh asha@203.0.113.10                # log in, no password
ssh -p 2222 asha@host                # custom port
scp app.tar.gz asha@host:/tmp/       # copy a file to the server
scp asha@host:/var/log/app.log .     # copy one back
rsync -avz ./dist/ asha@host:/srv/app/   # efficient folder sync (only changes)
```

### `~/.ssh/config`: stop typing long commands

```
Host shopline-prod
    HostName 203.0.113.10
    User deploy
    IdentityFile ~/.ssh/id_ed25519
```

Now just: `ssh shopline-prod`.

### SSH tunnels (secure access to private databases)

A production database should *not* be open to the internet. Instead, tunnel through a server you can reach:

```bash
ssh -L 5433:db.internal:5432 shopline-prod
# now connect your DB tool to localhost:5433 → travels securely to db.internal:5432
```

### Server hardening basics (first 10 minutes of any new server)

1. Create a non-root user; disable root login.
2. Use SSH keys; set `PasswordAuthentication no` in `/etc/ssh/sshd_config`.
3. Enable a firewall: allow only 22 (or a custom SSH port), 80, 443. (`ufw allow 22,80,443/tcp && ufw enable`)
4. Enable automatic security updates; install `fail2ban` to block brute-force bots.

### 🎯 Interview Pattern

"How would you secure a fresh Linux server?" The checklist above (non-root user, keys only, firewall, updates, least privilege, minimal open ports) is the expected answer.

---

## 4.11 Running Your App as a Service

`node server.js` in an SSH session dies when you disconnect or the app crashes. Servers need a **supervisor** that starts the app at boot, restarts it on failure, and captures its logs.

### systemd (the standard on modern Linux)

Create `/etc/systemd/system/shopline.service`:

```ini
[Unit]
Description=ShopLine API
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/srv/shopline
EnvironmentFile=/srv/shopline/.env
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=3
# Hardening: run with fewer powers
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload              # re-read unit files
sudo systemctl enable --now shopline      # start now AND at every boot
sudo systemctl status shopline            # is it running? last log lines
sudo systemctl restart shopline
journalctl -u shopline -f                 # follow the service's logs (like tail -f)
journalctl -u shopline --since "1 hour ago" -p err    # only errors in the last hour
```

systemd sends `SIGTERM` on `stop`/`restart`, which is why the shutdown handler in §4.7 matters.

### Other supervisors you'll meet

| Tool | Where |
|---|---|
| **PM2** | Node-specific process manager with clustering and log management |
| **Docker restart policies** (`--restart unless-stopped`) | Containers (Chapter 31) |
| **Kubernetes** | Orchestrates containers at scale (Chapter 32) |
| **Managed platforms** (Railway, Render, Fly.io, Vercel) | They supervise for you |

### Scheduled jobs: cron

```bash
crontab -e
# ┌ minute ┌ hour ┌ day-of-month ┌ month ┌ day-of-week
  0 2 * * *   /srv/shopline/scripts/backup.sh >> /var/log/backup.log 2>&1   # 02:00 daily
  */5 * * * * curl -fsS https://shopline.com/health > /dev/null              # every 5 min
```

Be careful: cron runs with a *minimal environment* (a tiny `PATH`), so use absolute paths and redirect output to a log. A cron job that silently fails for six months is a classic horror story. (Chapter 28 covers robust job scheduling.)

---

## 4.12 A Tiny Bit of Shell Scripting

Automate anything you do twice.

```bash
#!/usr/bin/env bash
# deploy.sh: pull, install, restart
set -euo pipefail         # stop on error, undefined variable, or failed pipe

APP_DIR="/srv/shopline"
cd "$APP_DIR"

echo "→ Pulling latest code..."
git pull --ff-only

echo "→ Installing dependencies..."
npm ci --omit=dev

echo "→ Restarting service..."
sudo systemctl restart shopline

echo "→ Health check..."
sleep 2
curl -fsS http://localhost:3000/health && echo " ✓ healthy" || { echo "✗ unhealthy"; exit 1; }
```

```bash
chmod +x deploy.sh
./deploy.sh
```

- `set -euo pipefail` is a must-have first line: without it a script happily continues after a failure.
- Always **quote variables** (`"$APP_DIR"`) so spaces don't break them.
- Exit codes: `0` = success, anything else = failure. `&&` runs the next command only if the previous succeeded; `||` only if it failed. CI systems judge your scripts by their exit code.

---

## 4.13 Git: The Time Machine

### 4.13.1 The mental model

Git is a **database of snapshots**. Each snapshot is a **commit**: a complete picture of your project at a moment, with a message, an author, and a pointer to its parent commit(s). Together, commits form a chain (really a graph, a DAG; see Chapter 11 of the DSA book).

Your files live in three areas:

```
 WORKING DIRECTORY ──git add──▶ STAGING AREA ──git commit──▶ REPOSITORY (history)
 (files you edit)               (what's queued                (permanent snapshots)
                                 for the next commit)
        ◀──────────────── git restore / git switch ───────────────┘
```

The **staging area** lets you craft a commit from only some of your changes, so each commit tells one clean story.

### Real-Life Analogy: Video Game Save Points

A commit is a save point. You can rewind to any, branch off to try something risky ("what if I fight the boss differently?"), and merge the good timeline back.

### 4.13.2 First-time setup

```bash
git config --global user.name "Asha Rao"
git config --global user.email "asha@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase false      # or true, pick a team policy
```

### 4.13.3 The daily loop

```bash
git init                         # start a repo in this folder
git status                       # what changed? (run this constantly)
git add src/server.js            # stage one file
git add -p                       # stage piece by piece, reviewing each chunk
git commit -m "feat: add products endpoint"
git log --oneline --graph --decorate -10     # compact history
git diff                         # unstaged changes
git diff --staged                # staged changes (what the next commit will contain)
```

### 4.13.4 Writing good commits

A commit should be **one logical change**, with a message that says what and why.

Use **Conventional Commits** (a widespread convention):

```
feat: add cursor pagination to /products
fix: prevent double charge on payment retry
docs: explain env variables in README
refactor: extract order validation
test: cover out-of-stock case
chore: bump express to 4.19.2
```

Message body (optional) explains *why*, not *what*. The diff already shows what.

### 4.13.5 Branching

A **branch** is just a movable label pointing to a commit. Branches are cheap, so use them for everything.

```bash
git branch                       # list branches
git switch -c feature/cart       # create AND switch to a new branch
git switch main                  # go back
git branch -d feature/cart       # delete a merged branch
```

```
            feature/cart
             ┌──C──D
 main: A──B──┘
             └──E──F           (main moved on while you worked)
```

### 4.13.6 Merging and rebasing

Two ways to combine work:

**Merge** creates a *merge commit* that joins both histories. History shows what truly happened.

```
 A──B──E──F──────M      main  (M = merge commit)
      \         /
       C──D────┘        feature
```

**Rebase** replays your commits on top of the latest main, as if you'd started from there. History is a clean straight line.

```
 A──B──E──F──C'──D'     (C' and D' are NEW commits copying C and D)
```

```bash
git merge feature/cart                 # while on main
git rebase main                        # while on feature: replay on top of main
```

**Golden rule of rebase: never rebase commits that others have already pulled** (public history). Rewriting shared history causes pain for everyone. Rebase your own local/feature branch freely; merge shared branches.

### 4.13.7 Merge conflicts: not scary

If two branches changed the same lines, Git can't decide, so it marks the file:

```
<<<<<<< HEAD
const TAX_RATE = 0.18;
=======
const TAX_RATE = 0.20;
>>>>>>> feature/new-tax
```

Fix it: open the file, decide what the final code should be, **delete the markers (`<<<<<<<`, `=======`, `>>>>>>>`)**, then:

```bash
git add src/tax.js
git commit            # (or: git rebase --continue)
git merge --abort     # panic button: undo the merge attempt
```

Conflicts are a communication signal: two people edited the same thing. Small, frequent merges mean small, easy conflicts.

### 4.13.8 Remotes: GitHub, GitLab, Bitbucket

```bash
git clone git@github.com:acme/shopline.git     # copy a remote repo
git remote -v                                  # list remotes (usually "origin")
git push -u origin feature/cart                # publish a branch (-u remembers it)
git fetch                                      # download remote changes, don't merge
git pull                                       # fetch + merge (or rebase)
```

### 4.13.9 The pull request workflow

How most teams ship code:

```
 1. git switch -c feature/order-emails            (branch from fresh main)
 2. code, test, commit in small steps
 3. git push -u origin feature/order-emails
 4. open a Pull Request (PR) on GitHub
 5. automated checks run (tests, lint) , teammates review
 6. address comments, push more commits
 7. merge into main (squash / merge / rebase per team policy)
 8. delete the branch; deploy
```

A good PR is **small** (under ~400 changed lines), has a clear description (what, why, how to test), and passes CI. Large PRs get rubber-stamped, not reviewed.

### 4.13.10 `.gitignore`

Tell Git what never to track:

```
node_modules/
.env
.env.*
!.env.example
dist/
coverage/
*.log
.DS_Store
```

Dependencies (`node_modules`) are rebuilt from `package-lock.json`, so don't commit them. Note that `.gitignore` only affects *untracked* files: if you already committed `.env`, you must `git rm --cached .env` and rotate the secrets.

### 4.13.11 Undoing things (the "oh no" cheat sheet)

| Situation | Command |
|---|---|
| Discard unstaged changes in a file | `git restore file.js` |
| Unstage a file (keep the edits) | `git restore --staged file.js` |
| Fix the last commit message / add a forgotten file (not yet pushed) | `git commit --amend` |
| Undo a commit but keep the changes | `git reset --soft HEAD~1` |
| Undo a commit and throw the changes away | `git reset --hard HEAD~1` ⚠ destructive |
| Undo a *pushed* commit safely | `git revert <hash>` (creates an inverse commit) |
| Save work-in-progress temporarily | `git stash` / `git stash pop` |
| "I lost a commit!" | `git reflog` shows every place HEAD has been; recover with `git switch -c rescue <hash>` |

**`git reflog` is your safety net.** Git rarely truly deletes anything for at least ~30 days. Before panicking, check the reflog.

### 4.13.12 Handy extras

```bash
git blame file.js              # who last changed each line (and the commit)
git log -S"calculateTax"       # find commits that added/removed that string
git bisect start               # binary-search history to find which commit broke things
git cherry-pick <hash>         # copy one commit onto the current branch
git tag v1.2.0                 # label a release point
```

`git bisect` is binary search (Chapter 16 of the DSA book!) applied to your commit history. With 1,000 commits it finds the culprit in about 10 steps.

### 🎯 Interview Pattern

"Merge vs rebase?" "How do you undo a pushed commit?" "What's in the staging area and why?" "How do you resolve a conflict?" These are standard. Bonus points for: **`revert` for shared history, `reset` for local; never force-push shared branches (use `--force-with-lease` if you must).**

### ⚠ Common Mistake: Force-pushing to a shared branch

`git push --force` overwrites the remote's history with yours, deleting teammates' commits. If you really must (e.g., after rebasing your *own* feature branch), use `git push --force-with-lease`, which refuses if someone else pushed in the meantime. Protect `main` on GitHub so nobody can push directly or force-push.

---

## 4.14 Project Structure and Code Quality Tooling

A tidy folder structure (we'll refine it in Chapter 11):

```
shopline-api/
├── src/
│   ├── server.js          ← starts the HTTP server
│   ├── app.js             ← builds the app (separate for testing)
│   ├── config.js          ← reads & validates env
│   ├── routes/
│   ├── services/
│   └── db/
├── test/
├── .env.example
├── .gitignore
├── .editorconfig
├── .nvmrc
├── package.json
├── package-lock.json
└── README.md              ← how to install, configure, run, test
```

Tools that make a team consistent:

- **ESLint:** catches likely bugs (unused variables, unreachable code).
- **Prettier:** formats code automatically so nobody debates style.
- **EditorConfig:** consistent indentation and line endings across editors.
- **Husky + lint-staged:** run lint/format on staged files before each commit.
- **CI:** repeat all checks on every push (Chapter 32).

```bash
npm install -D eslint prettier
npx eslint .
npx prettier --write .
```

### A README that respects the next developer

Include: what it is, prerequisites (Node version), setup steps (`npm ci`, copy `.env.example`), how to run, how to test, how to deploy, and where things live. **If a new teammate can't get the project running in 15 minutes from the README, the README is the bug.**

---

## 4.15 Edge Cases and Gotchas Checklist

- [ ] `EADDRINUSE` → find the owner: `lsof -i :3000` (macOS/Linux) / `ss -tlnp | grep 3000` / PowerShell: `Get-NetTCPConnection -LocalPort 3000`.
- [ ] "command not found" → not installed, or not in `PATH`.
- [ ] "Permission denied" → wrong owner/mode; check `ls -l`; don't `chmod 777`.
- [ ] Disk full (`ENOSPC`) → `df -h`, then `du`; logs are the usual culprit. Rotate logs.
- [ ] Windows line endings (CRLF) break shell scripts (`bad interpreter`) → use LF (`.gitattributes`: `* text=auto eol=lf` for scripts).
- [ ] Case sensitivity: Linux treats `App.js` and `app.js` as different files. A project that works on Windows/macOS can fail on Linux in deploy.
- [ ] Cron job can't find `node` → minimal `PATH`; use absolute paths.
- [ ] `node_modules` committed → remove it from Git, add to `.gitignore`.
- [ ] Secrets committed → rotate first, clean later.
- [ ] Different Node versions across machines → `.nvmrc` + `engines` in `package.json`.
- [ ] `npm install` in CI drifts versions → use `npm ci`.
- [ ] Unquoted variables in scripts break on spaces → always `"$VAR"`.
- [ ] Merged without pulling first → `git pull --rebase` or fetch before push.
- [ ] Process ignores `SIGTERM` → it gets `SIGKILL`ed after the timeout; add a signal handler.

---

## 4.16 Chapter Summary

- Production runs on **Linux**; learn the terminal, and on Windows use **WSL2**.
- The filesystem is one tree rooted at `/`; know `etc`, `var/log`, `home`, `tmp`.
- Core commands: `ls cd cp mv rm`, `cat less head tail -f`, `grep find`, plus **pipes** to compose them.
- Permissions are owner/group/others with `rwx` = `421`; keep keys at `600`, run apps as non-root.
- Processes are controlled with **signals**: `SIGTERM` (graceful) before `SIGKILL`; apps must handle `SIGTERM`.
- **Environment variables** carry config and secrets; validate at startup; never commit `.env`.
- Use `nvm` for Node versions, commit the lockfile, use `npm ci` in CI.
- **SSH** with keys, tunnels for private services, hardened servers; **systemd** supervises long-running apps; **cron** schedules jobs.
- **Git**: commits are snapshots; branch freely; merge shared history, rebase only your own; use PRs; `reflog` rescues you.

---

## 4.17 Revision Notes

- `tail -f`, `grep`, `|`, `>`, `>>`, `2>&1` are your daily bread.
- `chmod`: r=4 w=2 x=1; `600` keys, `644` files, `755` scripts/dirs.
- `kill` = SIGTERM (15); `kill -9` = SIGKILL (can't be caught).
- `process.env.X`; `node --env-file=.env`; `.env.example` committed, `.env` ignored.
- `npm ci` (CI/prod) vs `npm install` (dev). Lockfile committed.
- `systemctl enable --now`, `journalctl -u name -f`.
- Git areas: working dir → staging → repo. `status`, `add`, `commit`, `switch -c`, `merge`, `rebase`, `push`, `reflog`.
- Undo: `restore` (files), `reset` (local commits), `revert` (shared commits).

---

## 4.18 Mind Map (ASCII)

```
                        LINUX + GIT + DEV ENV (Ch. 4)
                                    │
     ┌───────────┬──────────┬───────┼────────┬───────────┬───────────┐
  FILESYSTEM   TEXT/PIPES  PERMS  PROCESSES  CONFIG      REMOTE     GIT
     │            │          │        │         │           │         │
  / tree      grep find    rwx=421  ps top    env vars     SSH keys  commit =
  etc var     less tail-f  chmod    kill      .env         scp rsync snapshot
  home tmp    | > >> 2>&1  sudo     signals   dotenv       tunnels   branch
  df du       jq awk sed   least    SIGTERM   fail fast    systemd   merge/rebase
                           priv     systemd   nvm, npm ci  cron      PR workflow
                                    cron      lockfile               reflog
```

---

## 4.19 Cheat Sheet

```
NAVIGATE   pwd ls -la cd ~ cd - mkdir -p cp -r mv rm -r (careful!)
READ       cat less head -n tail -n tail -f wc -l
SEARCH     grep -rni "text" dir/     find . -name "*.js"     df -h  du -sh *
PIPE       a | b    > overwrite    >> append    2>&1 merge errors   > /dev/null
PERMS      chmod 600 key | chmod +x script | chown user:group file | sudo cmd
PROCESS    ps aux | grep x | top | kill PID (TERM) | kill -9 PID | lsof -i :PORT
ENV        export A=1 | process.env.A | node --env-file=.env app.js
NODE       nvm install --lts | npm ci | npm run dev | npm audit
SSH        ssh-keygen -t ed25519 | ssh user@host | scp f host:/p | ssh -L l:host:r jump
SERVICE    systemctl enable --now x | status x | journalctl -u x -f
GIT        status add commit | switch -c | merge | rebase | push -u origin b
           restore | reset --soft HEAD~1 | revert H | stash | reflog | bisect | blame
RULES      never commit secrets | never rebase shared | SIGTERM before SIGKILL | no chmod 777
```

---

## 4.20 Key Takeaways

1. The terminal is a composition tool: small commands + pipes solve big problems fast.
2. Least privilege everywhere: non-root users, `600` keys, closed ports.
3. Treat configuration as environment, secrets as radioactive, and fail fast on bad config.
4. Make your app a good Unix citizen: honor `SIGTERM`, log to stdout/stderr, exit with correct codes.
5. Git is safe if you commit often and know `reflog`; the dangerous commands are the ones that rewrite shared history.
6. A reproducible environment (`.nvmrc`, lockfile, `.env.example`, README) is a feature of your project.

---

## 4.21 20 Multiple Choice Questions

**Q1.** Which command shows your current directory?
A) `ls`  B) `pwd`  C) `cd`  D) `where`

**Q2.** What does `tail -f app.log` do?
A) Deletes the log  B) Shows the last lines and keeps following new ones  C) Counts lines  D) Compresses the file

**Q3.** What does `2>&1` do?
A) Sends errors to the same place as normal output  B) Doubles the output  C) Runs the command twice  D) Hides output

**Q4.** What permission mode is appropriate for a private SSH key?
A) 777  B) 644  C) 600  D) 755

**Q5.** In numeric permissions, `r w x` correspond to:
A) 1 2 4  B) 4 2 1  C) 2 4 1  D) 1 1 1

**Q6.** What's the default signal sent by `kill PID`?
A) SIGKILL  B) SIGTERM  C) SIGINT  D) SIGHUP

**Q7.** Which signal can't be caught or ignored by the process?
A) SIGTERM  B) SIGINT  C) SIGKILL  D) SIGHUP

**Q8.** Why should a Node app handle `SIGTERM`?
A) To crash faster  B) To finish in-flight requests and close connections before exiting  C) To ignore shutdown  D) To change ports

**Q9.** Where should secrets like database passwords live?
A) Hard-coded in source  B) In committed JSON config  C) In environment variables or a secrets manager, never in Git  D) In the README

**Q10.** What's the difference between `npm install` and `npm ci`?
A) None  B) `ci` installs exactly what the lockfile says and fails on mismatch  C) `ci` ignores the lockfile  D) `ci` installs globally

**Q11.** In `^4.18.2`, which version is NOT allowed?
A) 4.18.9  B) 4.20.0  C) 5.0.0  D) 4.19.1

**Q12.** What's the purpose of `~/.ssh/authorized_keys` on a server?
A) Store your private key  B) List public keys allowed to log in  C) Store passwords  D) Log failed logins

**Q13.** Why run your app as a non-root user?
A) Faster startup  B) Limits damage if the app is compromised  C) Required by Node  D) Saves memory

**Q14.** What does the staging area do in Git?
A) Backs up to the cloud  B) Holds changes selected for the next commit  C) Stores deleted files  D) Runs tests

**Q15.** You committed a bad change and *pushed* it to a shared `main`. Safest way to undo?
A) `git reset --hard` and force-push  B) `git revert <hash>`  C) Delete the repo  D) `git stash`

**Q16.** What's the golden rule about rebase?
A) Always rebase main  B) Never rebase commits others already pulled  C) Never merge  D) Rebase only on Fridays

**Q17.** Which command can recover a commit you "lost" after a bad reset?
A) `git log`  B) `git reflog`  C) `git fsck --delete`  D) `git clean`

**Q18.** You accidentally committed `.env` with real secrets. First action?
A) Delete the file in a new commit  B) Rotate (replace) the exposed secrets  C) Rename the file  D) Make the repo private

**Q19.** Which tool binary-searches commit history to find the commit that introduced a bug?
A) `git blame`  B) `git bisect`  C) `git grep`  D) `git tag`

**Q20.** A cron job works in your shell but fails from cron. Likely cause?
A) Cron is broken  B) Cron has a minimal environment/`PATH`  C) Cron needs HTTPS  D) The file is too long

### Answer Key

| Q | A | Why |
|---|---|---|
| 1 | B | `pwd` = print working directory. |
| 2 | B | `-f` follows appended lines. |
| 3 | A | stderr (2) redirected to stdout (1). |
| 4 | C | SSH rejects keys readable by others. |
| 5 | B | r=4, w=2, x=1. |
| 6 | B | SIGTERM (15), a polite request. |
| 7 | C | SIGKILL is enforced by the kernel. |
| 8 | B | Graceful shutdown; orchestrators send SIGTERM first. |
| 9 | C | Config in env; never in Git. |
| 10 | B | Reproducible installs from the lockfile. |
| 11 | C | `^` allows minor/patch, not a new major. |
| 12 | B | Public keys allowed to authenticate. |
| 13 | B | Least privilege. |
| 14 | B | It's the draft of the next commit. |
| 15 | B | `revert` adds an inverse commit without rewriting history. |
| 16 | B | Rewriting shared history breaks others. |
| 17 | B | The reflog records where HEAD has been. |
| 18 | B | It's compromised; rotate first. |
| 19 | B | Bisect = binary search over commits. |
| 20 | B | Cron's `PATH`/env differ; use absolute paths. |

---

## 4.22 20 Hands-on Exercises

**Easy**

1. Install WSL2/Ubuntu (Windows) or open your terminal. Create `~/projects/lab`, `cd` into it, and create five files with `touch`.
2. Use `ls -la` and identify a hidden file and its permissions.
3. Create a file with 100 lines (`seq 1 100 > numbers.txt`). Print lines 90–100 with `tail`, the first 5 with `head`, and the count with `wc -l`.
4. Use `grep` to find every line containing "7" in `numbers.txt`; count them with `-c`.
5. Set a file to `600`, then `755`, and read the `ls -l` output each time.
6. Set an environment variable, print it, start a child shell (`bash`) and print it again; then do the same without `export`. Explain the difference.
7. Run `git init`, make three commits, and view them with `git log --oneline`.

**Medium**

8. Generate a fake access log (20 lines of `IP METHOD PATH STATUS`) and compute the top IPs and count of 5xx responses using only pipes.
9. Start your Chapter 3 server, find its PID with `ps`/`lsof`, and stop it with `kill` (not `-9`). Confirm your shutdown handler ran.
10. Add the `shutdown-demo.js` handler to a server and prove with `kill -TERM` that in-flight requests (use a 5-second delayed route) complete before exit.
11. Write `config.js` that validates required env vars and exits with a clear error message when missing; test with and without `.env`.
12. Make a `.gitignore`, accidentally commit `.env`, then remove it from tracking correctly (`git rm --cached`) and list the steps you'd take to rotate its secrets.
13. Create a branch, make conflicting edits to the same line on both `main` and the branch, and resolve the merge conflict by hand.
14. Use `git stash` mid-change to switch branches and come back; then use `git reflog` to recover a commit you intentionally reset away.

**Hard**

15. Write `deploy.sh` (as in §4.12) for a local folder; add a health-check retry loop (3 tries, 2 seconds apart) and a non-zero exit on failure.
16. Create a systemd unit (on WSL2 with systemd enabled, or a VM) for your server; kill the process manually and verify it restarts; read its logs with `journalctl`.
17. Generate an SSH key pair, set strict permissions, and (using a VM or cloud free tier) log in with the key only after disabling password auth.
18. Set up an SSH tunnel to reach a service bound only to `localhost` on a remote machine; explain what traffic the network sees.
19. Use `git bisect` on a repo where you plant a bug in commit 12 of 30; find it using a test script with `git bisect run`.
20. Configure ESLint, Prettier and a pre-commit hook (Husky + lint-staged) so a commit with a lint error is rejected; show it failing and then passing.

---

## 4.23 5 Interview Questions

**1. A production server's disk is 100% full and the app is failing. How do you investigate and fix it?**
*Model answer:* `df -h` to confirm which filesystem, `du -h --max-depth=1` repeatedly to drill down, usually `/var/log`, temp files or Docker layers. Check for large/rotating logs (`find -size +100M`), deleted-but-open files (`lsof | grep deleted`). Free space safely (truncate or compress logs, prune unused images), restart the affected service, and then fix root cause: log rotation, retention limits, monitoring/alerting on disk usage.

**2. How do you gracefully stop a Node.js service, and why does it matter?**
*Model answer:* Handle `SIGTERM`/`SIGINT`: stop accepting new connections (`server.close`), let in-flight requests finish, close DB/queue connections, flush logs, then exit with 0, with a timeout fallback. Orchestrators (systemd, Docker, Kubernetes) send `SIGTERM` and `SIGKILL` after a grace period; skipping this causes dropped requests and potentially corrupted work during deploys.

**3. Explain `git merge` vs `git rebase`. When would you use each?**
*Model answer:* Merge joins histories with a merge commit and preserves true history; safe for shared branches. Rebase replays commits on a new base for linear history; good for cleaning up my own unpublished feature branch before a PR. Never rebase shared/pushed history.

**4. How do you keep secrets out of a codebase and what do you do if one leaks?**
*Model answer:* Config via environment variables or a secrets manager; `.env` git-ignored; `.env.example` committed; secret-scanning in pre-commit/CI. If leaked: assume compromise, rotate/revoke immediately, check access logs for abuse, then remove from history (`git filter-repo`) and force everyone to re-clone.

**5. What do the permissions `-rwxr-x---` mean and how would you set them?**
*Model answer:* Regular file; owner can read/write/execute, group can read/execute, others have no access. `chmod 750 file` (or `chmod u=rwx,g=rx,o= file`).

---

## 4.24 3 Real Projects

**Project 1: Log Analyzer Script (beginner, ~2 hours).**
Given a generated access log (write a Node script that creates 100,000 realistic lines), produce a report using shell pipelines: requests per status class, top 10 IPs, top 10 paths, slowest requests, requests per minute. Then re-implement the same report in Node using streams and compare the results and the speed.

**Project 2: One-Command Server Bootstrap (intermediate, ~4 hours).**
A `setup.sh` that, on a fresh Ubuntu VM, creates a deploy user, installs Node via nvm, clones a repo, installs dependencies, writes a systemd unit, configures a firewall (22/80/443), and starts the service, **idempotently** (safe to run twice). Verify on a throwaway VM.

**Project 3: Git Workflow Simulator (intermediate, ~3 hours).**
Create a practice repo with a script that scripts the story of a feature: branch, commits, a conflicting change on main, a merge conflict to resolve, a rebase, a revert, a bisect hunt. Document each step and the commands you used. Use it to onboard future teammates.

---

## 4.25 Further Reading

- *The Linux Command Line* by William Shotts (free online): the best beginner-to-confident book.
- *Pro Git* by Scott Chacon & Ben Straub (free at git-scm.com/book): chapters 1–3 and 7.
- *The Twelve-Factor App*: sections on Config, Processes and Logs (12factor.net).
- `man` pages: `man grep`, `man chmod`. Also `tldr` (community-simplified examples).
- "Oh Shit, Git!?!" (ohshitgit.com): a friendly recovery guide.
- Node docs: *Environment variables* and `--env-file`.

---

### Up next → Chapter 5: Node.js Internals

You can now operate a machine and manage code. Next we open the hood of the runtime itself: the event loop, libuv, the thread pool, streams, buffers, worker threads and clusters, and the reason Node can serve thousands of connections from a single thread.
