import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { ReplitConnectors } from "@replit/connectors-sdk";

const OWNER = "sribintangDev";
const REPO = "igcse-add-maths-crash";
const MAX_BLOB_BYTES = 900_000;

const GIT_ROOT = execSync("git rev-parse --show-toplevel", {
  encoding: "utf8",
}).trim();
process.chdir(GIT_ROOT);
const STATE_FILE = join(GIT_ROOT, ".git/github-sync-sha");

const connectors = new ReplitConnectors();

interface LocalEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size: number;
}

interface RemoteEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
}

interface GithubRef {
  object: { sha: string };
}

interface GithubCommit {
  tree: { sha: string };
}

interface GithubTree {
  sha: string;
  tree: RemoteEntry[];
}

interface GithubBlob {
  sha: string;
}

interface GithubNewCommit {
  sha: string;
}

async function githubApi<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const method = options.method ?? "GET";
  const response = await connectors.proxy("github", path, {
    method,
    body: options.body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `GitHub API ${method} ${path} => ${response.status}: ${text.substring(0, 300)}`
    );
  }
  return response.json() as Promise<T>;
}

function git(cmd: string): string {
  return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
}

function getLocalTree(): Map<string, LocalEntry> {
  const output = git("ls-tree -r HEAD --long");
  const map = new Map<string, LocalEntry>();
  for (const line of output.split("\n").filter(Boolean)) {
    const [meta, path] = line.split("\t");
    const parts = meta.trim().split(/\s+/);
    const [mode, type, sha, sizeStr] = parts;
    map.set(path, {
      path,
      mode,
      type,
      sha,
      size: sizeStr === "-" ? 0 : parseInt(sizeStr, 10),
    });
  }
  return map;
}

async function getRemoteTree(
  treeSha: string
): Promise<Map<string, RemoteEntry>> {
  const data = await githubApi<GithubTree>(
    `/repos/${OWNER}/${REPO}/git/trees/${treeSha}?recursive=1`
  );
  const map = new Map<string, RemoteEntry>();
  for (const entry of data.tree) {
    if (entry.type === "blob") {
      map.set(entry.path, entry);
    }
  }
  return map;
}

async function uploadBlob(filePath: string, sizeBytes: number): Promise<string> {
  if (sizeBytes > MAX_BLOB_BYTES) {
    throw new Error(
      `File too large to sync (${Math.round(sizeBytes / 1024)}KB > ${Math.round(MAX_BLOB_BYTES / 1024)}KB limit): ${filePath}`
    );
  }
  const content = execSync(`git show "HEAD:${filePath}"`, {
    encoding: "base64",
    maxBuffer: 50 * 1024 * 1024,
  });
  const blob = await githubApi<GithubBlob>(
    `/repos/${OWNER}/${REPO}/git/blobs`,
    { method: "POST", body: { content, encoding: "base64" } }
  );
  return blob.sha;
}

async function run(): Promise<void> {
  const localHead = git("rev-parse HEAD");
  const branch = git("rev-parse --abbrev-ref HEAD");
  console.log(`Local HEAD: ${localHead} (branch: ${branch})`);

  const lastPushed = existsSync(STATE_FILE)
    ? readFileSync(STATE_FILE, "utf8").trim()
    : "";

  if (lastPushed === localHead) {
    console.log("Already synced. Nothing to push.");
    return;
  }

  const commitMessage =
    git(`log -1 --format=%s ${localHead}`) || "Sync from Replit";
  const authorName =
    git(`log -1 --format=%an ${localHead}`) || "Replit Sync";
  const authorEmail =
    git(`log -1 --format=%ae ${localHead}`) || "sync@replit.com";

  console.log(`Syncing: "${commitMessage}" → ${OWNER}/${REPO}:${branch}`);

  const localTree = getLocalTree();
  console.log(`Local tree: ${localTree.size} files`);

  let remoteHeadSha: string | null = null;
  let remoteTreeSha: string | null = null;
  let remoteTree = new Map<string, RemoteEntry>();

  try {
    const ref = await githubApi<GithubRef>(
      `/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`
    );
    remoteHeadSha = ref.object.sha;
    const remoteCommit = await githubApi<GithubCommit>(
      `/repos/${OWNER}/${REPO}/git/commits/${remoteHeadSha}`
    );
    remoteTreeSha = remoteCommit.tree.sha;
    remoteTree = await getRemoteTree(remoteTreeSha);
    console.log(`Remote tree: ${remoteTree.size} files`);
  } catch (err) {
    if ((err as Error).message.includes("404")) {
      console.log(`Branch '${branch}' not on GitHub yet — initial push`);
    } else {
      throw err;
    }
  }

  const treeEntries: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
  }> = [];

  let uploaded = 0;
  let reused = 0;
  let errors = 0;
  const failedFiles: string[] = [];

  for (const [path, local] of localTree) {
    if (local.type !== "blob") continue;

    const remote = remoteTree.get(path);
    if (remote && remote.sha === local.sha) {
      treeEntries.push({ path, mode: local.mode, type: "blob", sha: remote.sha });
      reused++;
    } else {
      try {
        const newSha = await uploadBlob(path, local.size ?? 0);
        treeEntries.push({ path, mode: local.mode, type: "blob", sha: newSha });
        uploaded++;
      } catch (err) {
        console.error(`  ERROR: ${(err as Error).message}`);
        failedFiles.push(path);
        errors++;
        if (remote) {
          console.log(`    → Keeping stale version on GitHub (content differs)`);
          treeEntries.push({ path, mode: local.mode, type: "blob", sha: remote.sha });
        }
      }
    }
  }

  const deletedFiles = [...remoteTree.keys()].filter(
    (p) => !localTree.has(p)
  );

  console.log(
    `Blobs — uploaded: ${uploaded}, reused: ${reused}, errors: ${errors}`
  );
  if (deletedFiles.length > 0) {
    console.log(`Deleted files: ${deletedFiles.length}`);
  }

  console.log("Creating tree...");
  const newTree = await githubApi<GithubTree>(
    `/repos/${OWNER}/${REPO}/git/trees`,
    { method: "POST", body: { tree: treeEntries } }
  );

  if (newTree.sha === remoteTreeSha) {
    console.log("Tree unchanged on GitHub — nothing new to commit.");
    if (errors === 0) {
      writeFileSync(STATE_FILE, localHead);
    }
    return;
  }

  console.log(`Tree: ${newTree.sha}. Creating commit...`);
  const commitBody: {
    message: string;
    tree: string;
    author: { name: string; email: string };
    parents: string[];
  } = {
    message: commitMessage,
    tree: newTree.sha,
    author: { name: authorName, email: authorEmail },
    parents: remoteHeadSha ? [remoteHeadSha] : [],
  };

  const newCommit = await githubApi<GithubNewCommit>(
    `/repos/${OWNER}/${REPO}/git/commits`,
    { method: "POST", body: commitBody }
  );

  console.log(`Commit: ${newCommit.sha}. Updating branch ref...`);

  if (remoteHeadSha) {
    await githubApi(`/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: { sha: newCommit.sha, force: true },
    });
  } else {
    await githubApi(`/repos/${OWNER}/${REPO}/git/refs`, {
      method: "POST",
      body: { ref: `refs/heads/${branch}`, sha: newCommit.sha },
    });
  }

  if (errors === 0) {
    writeFileSync(STATE_FILE, localHead);
    console.log(
      `✓ Synced → https://github.com/${OWNER}/${REPO}/tree/${branch}`
    );
  } else {
    console.error(
      `⚠ Partial sync — ${errors} file(s) could not be uploaded and may be stale on GitHub:`
    );
    for (const f of failedFiles) {
      console.error(`  - ${f}`);
    }
    console.error("State NOT saved — sync will be retried on next commit.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("GitHub sync failed:", err.message);
  process.exit(1);
});
