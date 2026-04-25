import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { ReplitConnectors } from "@replit/connectors-sdk";

const OWNER = "sribintangDev";
const REPO = "igcse-add-maths-crash";
const BRANCH = "main";
const MAX_BLOB_BYTES = 900_000;

const GIT_ROOT = execSync("git rev-parse --show-toplevel", {
  encoding: "utf8",
}).trim();
process.chdir(GIT_ROOT);
const STATE_FILE = join(GIT_ROOT, ".git/github-sync-sha");

const connectors = new ReplitConnectors();

interface GitTreeEntry {
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
  message: string;
}

interface GithubTreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
}

interface GithubTree {
  sha: string;
  tree: GithubTreeEntry[];
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
  const response = await connectors.proxy("github", path, {
    method: options.method ?? "GET",
    body: options.body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${options.method ?? "GET"} ${path} => ${response.status}: ${text.substring(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

function git(cmd: string): string {
  return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
}

function getLocalTree(): Map<string, GitTreeEntry> {
  const output = git("ls-tree -r HEAD --long");
  const map = new Map<string, GitTreeEntry>();
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

async function getRemoteTree(treeSha: string): Promise<Map<string, GithubTreeEntry>> {
  const data = await githubApi<GithubTree>(
    `/repos/${OWNER}/${REPO}/git/trees/${treeSha}?recursive=1`
  );
  const map = new Map<string, GithubTreeEntry>();
  for (const entry of data.tree) {
    if (entry.type === "blob") {
      map.set(entry.path, entry);
    }
  }
  return map;
}

async function uploadBlob(filePath: string, sizeBytes: number): Promise<string | null> {
  if (sizeBytes > MAX_BLOB_BYTES) {
    console.log(`  Skipping large file (${Math.round(sizeBytes / 1024)}KB): ${filePath}`);
    return null;
  }
  let content: string;
  try {
    content = execSync(`git show "HEAD:${filePath}"`, {
      encoding: "base64",
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch {
    console.log(`  Could not read: ${filePath}`);
    return null;
  }
  try {
    const blob = await githubApi<GithubBlob>(
      `/repos/${OWNER}/${REPO}/git/blobs`,
      { method: "POST", body: { content, encoding: "base64" } }
    );
    return blob.sha;
  } catch (err) {
    console.log(`  Failed to upload blob for ${filePath}: ${(err as Error).message.substring(0, 100)}`);
    return null;
  }
}

async function run(): Promise<void> {
  const localHead = git("rev-parse HEAD");
  console.log(`Local HEAD: ${localHead}`);

  const lastPushed = existsSync(STATE_FILE)
    ? readFileSync(STATE_FILE, "utf8").trim()
    : "";

  if (lastPushed === localHead) {
    console.log("Already synced. Nothing to push.");
    return;
  }

  const commitMessage = git(`log -1 --format=%s ${localHead}`) || "Sync from Replit";
  const authorName = git(`log -1 --format=%an ${localHead}`) || "Replit Sync";
  const authorEmail = git(`log -1 --format=%ae ${localHead}`) || "sync@replit.com";

  console.log(`Syncing: "${commitMessage}"`);

  const localTree = getLocalTree();
  console.log(`Local tree: ${localTree.size} files`);

  let remoteHeadSha: string | null = null;
  let remoteTreeSha: string | null = null;
  let remoteTree = new Map<string, GithubTreeEntry>();

  try {
    const ref = await githubApi<GithubRef>(
      `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`
    );
    remoteHeadSha = ref.object.sha;
    const remoteCommit = await githubApi<GithubCommit>(
      `/repos/${OWNER}/${REPO}/git/commits/${remoteHeadSha}`
    );
    remoteTreeSha = remoteCommit.tree.sha;
    remoteTree = await getRemoteTree(remoteTreeSha);
    console.log(`Remote tree: ${remoteTree.size} files`);
  } catch {
    console.log("No remote branch yet — full initial push");
  }

  const treeEntries: GithubTreeEntry[] = [];
  let uploaded = 0;
  let reused = 0;
  let skipped = 0;

  for (const [path, local] of localTree) {
    if (local.type !== "blob") continue;
    const remote = remoteTree.get(path);
    if (remote && remote.sha === local.sha) {
      treeEntries.push({
        path,
        mode: local.mode,
        type: "blob",
        sha: remote.sha,
      });
      reused++;
    } else {
      const newSha = await uploadBlob(path, local.size ?? 0);
      if (newSha) {
        treeEntries.push({ path, mode: local.mode, type: "blob", sha: newSha });
        uploaded++;
      } else {
        if (remote) {
          treeEntries.push({ path, mode: local.mode, type: "blob", sha: remote.sha });
        }
        skipped++;
      }
    }
  }

  console.log(`Blobs — uploaded: ${uploaded}, reused: ${reused}, skipped: ${skipped}`);

  if (uploaded === 0 && remoteHeadSha) {
    console.log("No new blobs to push. Saving state.");
    writeFileSync(STATE_FILE, localHead);
    return;
  }

  console.log("Creating tree...");
  const treeBody: { tree: GithubTreeEntry[]; base_tree?: string } = {
    tree: treeEntries,
  };

  const newTree = await githubApi<GithubTree>(
    `/repos/${OWNER}/${REPO}/git/trees`,
    { method: "POST", body: treeBody }
  );

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
    await githubApi(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
      method: "PATCH",
      body: { sha: newCommit.sha, force: true },
    });
  } else {
    await githubApi(`/repos/${OWNER}/${REPO}/git/refs`, {
      method: "POST",
      body: { ref: `refs/heads/${BRANCH}`, sha: newCommit.sha },
    });
  }

  writeFileSync(STATE_FILE, localHead);
  console.log(`✓ Synced → https://github.com/${OWNER}/${REPO}/tree/${BRANCH}`);
}

run().catch((err) => {
  console.error("GitHub sync failed:", err.message);
  process.exit(1);
});
