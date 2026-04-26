import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { ReplitConnectors } from "@replit/connectors-sdk";

const OWNER = "sribintangDev";
const REPO = "igcse-add-maths-crash";
const MAX_LOOKBACK = 50;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

const GIT_ROOT = execSync("git rev-parse --show-toplevel", {
  encoding: "utf8",
}).trim();
process.chdir(GIT_ROOT);

const STATE_FILE = join(GIT_ROOT, ".git/github-sync-sha");

const connectors = new ReplitConnectors();

interface LocalCommit {
  sha: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  message: string;
}

interface RemoteEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
}

interface GithubRef { object: { sha: string } }
interface GithubCommit { tree: { sha: string } }
interface GithubTree { sha: string; tree: RemoteEntry[] }
interface GithubBlob { sha: string }
interface GithubNewCommit { sha: string }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function githubApi<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
  attempt = 1
): Promise<T> {
  const method = options.method ?? "GET";
  const response = await connectors.proxy("github", path, { method, body: options.body });
  if (!response.ok) {
    const text = await response.text();
    const isRetryable = response.status === 502 || response.status === 503 || response.status === 429;
    if (isRetryable && attempt < RETRY_ATTEMPTS) {
      console.log(`  Retrying (attempt ${attempt + 1}/${RETRY_ATTEMPTS}) after ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
      return githubApi<T>(path, options, attempt + 1);
    }
    throw new Error(
      `GitHub API ${method} ${path} => ${response.status}: ${text.substring(0, 300)}`
    );
  }
  return response.json() as Promise<T>;
}

function git(cmd: string): string {
  return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
}

async function githubHasCommit(sha: string): Promise<boolean> {
  try {
    await githubApi<GithubCommit>(`/repos/${OWNER}/${REPO}/git/commits/${sha}`);
    return true;
  } catch {
    return false;
  }
}

function getLocalHistory(limit?: number): LocalCommit[] {
  const limitFlag = limit ? `-n ${limit}` : "";
  const raw = git(`log --reverse ${limitFlag} --format=%H%x00%an%x00%ae%x00%aI%x00%s`);
  if (!raw.trim()) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, authorName, authorEmail, authorDate, ...msgParts] = line.split("\x00");
      return { sha, authorName, authorEmail, authorDate, message: msgParts.join("\x00") };
    });
}

function getCommitsSince(baseSha: string): LocalCommit[] {
  const raw = git(
    `log --reverse --format=%H%x00%an%x00%ae%x00%aI%x00%s ${baseSha}..HEAD`
  );
  if (!raw.trim()) return [];
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, authorName, authorEmail, authorDate, ...msgParts] = line.split("\x00");
      return { sha, authorName, authorEmail, authorDate, message: msgParts.join("\x00") };
    });
}

function getCommitTree(commitSha: string): Array<RemoteEntry & { size: number }> {
  const output = git(`ls-tree -r --long ${commitSha}`);
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [meta, path] = line.split("\t");
      const parts = meta.trim().split(/\s+/);
      const [mode, type, sha, sizeStr] = parts;
      return {
        path,
        mode,
        type,
        sha,
        size: sizeStr === "-" ? 0 : parseInt(sizeStr, 10),
      };
    })
    .filter((e) => e.type === "blob");
}

async function getRemoteBlobs(treeSha: string): Promise<Set<string>> {
  const data = await githubApi<GithubTree>(
    `/repos/${OWNER}/${REPO}/git/trees/${treeSha}?recursive=1`
  );
  const blobs = new Set<string>();
  for (const entry of data.tree) {
    if (entry.type === "blob") blobs.add(entry.sha);
  }
  return blobs;
}

async function uploadBlob(filePath: string, commitSha: string): Promise<string> {
  const content = execSync(`git show "${commitSha}:${filePath}"`, {
    encoding: "base64",
    maxBuffer: 200 * 1024 * 1024,
  });
  const blob = await githubApi<GithubBlob>(
    `/repos/${OWNER}/${REPO}/git/blobs`,
    { method: "POST", body: { content, encoding: "base64" } }
  );
  return blob.sha;
}

async function createGithubCommit(
  localCommit: LocalCommit,
  remoteParentSha: string | null,
  knownBlobs: Set<string>
): Promise<string> {
  const files = getCommitTree(localCommit.sha);
  const treeEntries: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  let uploaded = 0;
  let reused = 0;

  for (const file of files) {
    if (knownBlobs.has(file.sha)) {
      treeEntries.push({ path: file.path, mode: file.mode, type: "blob", sha: file.sha });
      reused++;
    } else {
      process.stdout.write(`      upload ${file.path} (${Math.round(file.size / 1024)}KB)... `);
      const newSha = await uploadBlob(file.path, localCommit.sha);
      process.stdout.write(`done\n`);
      knownBlobs.add(newSha);
      treeEntries.push({ path: file.path, mode: file.mode, type: "blob", sha: newSha });
      uploaded++;
    }
  }

  process.stdout.write(`    blobs: +${uploaded} ↺${reused}  `);

  const newTree = await githubApi<GithubTree>(
    `/repos/${OWNER}/${REPO}/git/trees`,
    { method: "POST", body: { tree: treeEntries } }
  );

  const newCommit = await githubApi<GithubNewCommit>(
    `/repos/${OWNER}/${REPO}/git/commits`,
    {
      method: "POST",
      body: {
        message: localCommit.message,
        tree: newTree.sha,
        author: {
          name: localCommit.authorName,
          email: localCommit.authorEmail,
          date: localCommit.authorDate,
        },
        parents: remoteParentSha ? [remoteParentSha] : [],
      },
    }
  );

  process.stdout.write(`→ ${newCommit.sha.substring(0, 7)}\n`);
  return newCommit.sha;
}

async function run(): Promise<void> {
  const localHead = git("rev-parse HEAD");
  const branch = git("rev-parse --abbrev-ref HEAD");
  console.log(`Local HEAD: ${localHead.substring(0, 8)} (branch: ${branch})`);

  // Fast path: state file matches local HEAD
  const stateLocalSha = existsSync(STATE_FILE)
    ? readFileSync(STATE_FILE, "utf8").trim()
    : "";
  if (stateLocalSha === localHead) {
    console.log("Already synced. Nothing to push.");
    return;
  }

  // Fast path: local HEAD already exists on GitHub (e.g. from real git push)
  if (await githubHasCommit(localHead)) {
    console.log("Local HEAD exists on GitHub (real git push detected).");
    // Ensure branch ref points to it
    try {
      const ref = await githubApi<GithubRef>(
        `/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`
      );
      if (ref.object.sha !== localHead) {
        console.log("Updating branch ref to match local HEAD...");
        await githubApi(`/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`, {
          method: "PATCH",
          body: { sha: localHead, force: false },
        });
      }
    } catch {
      // Branch may not exist yet
      await githubApi(`/repos/${OWNER}/${REPO}/git/refs`, {
        method: "POST",
        body: { ref: `refs/heads/${branch}`, sha: localHead },
      });
    }
    writeFileSync(STATE_FILE, localHead);
    console.log(`✓ Synced (via real git push) → https://github.com/${OWNER}/${REPO}/tree/${branch}`);
    return;
  }

  // Get remote state
  let remoteHeadSha: string | null = null;
  let remoteTreeSha: string | null = null;
  const knownBlobs = new Set<string>();

  try {
    const ref = await githubApi<GithubRef>(
      `/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`
    );
    remoteHeadSha = ref.object.sha;
    const remoteCommit = await githubApi<GithubCommit>(
      `/repos/${OWNER}/${REPO}/git/commits/${remoteHeadSha}`
    );
    remoteTreeSha = remoteCommit.tree.sha;
    const blobs = await getRemoteBlobs(remoteTreeSha);
    for (const sha of blobs) knownBlobs.add(sha);
    console.log(`Remote HEAD: ${remoteHeadSha.substring(0, 8)}, ${knownBlobs.size} known blobs`);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("404")) {
      console.log(`Branch '${branch}' not on GitHub yet — initial push`);
    } else {
      throw err;
    }
  }

  // Determine base: use state file or walk backwards to find a commit GitHub has
  let baseSha: string | null = null;
  let newCommits: LocalCommit[];

  if (stateLocalSha) {
    baseSha = stateLocalSha;
    console.log(`Base from state file: ${baseSha.substring(0, 8)}`);
    newCommits = getCommitsSince(baseSha);
  } else {
    // No state file: walk recent local history to find a commit GitHub already has
    console.log(`No state file — scanning for fork point (up to ${MAX_LOOKBACK} commits)...`);
    const history = getLocalHistory(MAX_LOOKBACK + 1);
    let forkIdx = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (await githubHasCommit(history[i].sha)) {
        forkIdx = i;
        break;
      }
    }

    if (forkIdx === -1) {
      console.log("No common history found — pushing entire history");
      newCommits = getLocalHistory();
    } else {
      baseSha = history[forkIdx].sha;
      console.log(`Fork point: ${baseSha.substring(0, 8)} (${history[forkIdx].message.substring(0, 40)})`);
      newCommits = history.slice(forkIdx + 1);
    }
  }

  if (newCommits.length === 0) {
    console.log("No new commits to push. Saving state.");
    writeFileSync(STATE_FILE, localHead);
    return;
  }

  console.log(`Pushing ${newCommits.length} commit(s):`);
  let currentGithubSha = remoteHeadSha;

  for (let i = 0; i < newCommits.length; i++) {
    const commit = newCommits[i];
    const label = `[${i + 1}/${newCommits.length}]`;
    console.log(`  ${label} ${commit.sha.substring(0, 8)} — ${commit.message.substring(0, 55)}`);
    currentGithubSha = await createGithubCommit(commit, currentGithubSha, knownBlobs);
  }

  if (!currentGithubSha) {
    throw new Error("No commits were created");
  }

  console.log(`Updating branch ref → ${currentGithubSha.substring(0, 8)}`);
  if (remoteHeadSha) {
    await githubApi(`/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: { sha: currentGithubSha, force: false },
    });
  } else {
    await githubApi(`/repos/${OWNER}/${REPO}/git/refs`, {
      method: "POST",
      body: { ref: `refs/heads/${branch}`, sha: currentGithubSha },
    });
  }

  writeFileSync(STATE_FILE, localHead);
  console.log(
    `✓ Synced ${newCommits.length} commit(s) → https://github.com/${OWNER}/${REPO}/tree/${branch}`
  );
}

run().catch((err) => {
  console.error("GitHub sync failed:", err.message);
  process.exit(1);
});
