export interface PullRequestResult {
  url: string | null;
  detail: string;
}

export async function openFixPullRequest(source: string): Promise<PullRequestResult> {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository || !repository.includes("/")) {
    return {
      url: null,
      detail: "Set GITHUB_TOKEN and GITHUB_REPOSITORY (owner/name) to open the pull request.",
    };
  }

  const [owner, repo] = repository.split("/");
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "payment-fix",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const api = `https://api.github.com/repos/${owner}/${repo}`;

  const repoResponse = await fetch(api, { headers });
  if (!repoResponse.ok) {
    return { url: null, detail: `GitHub could not open ${repository}.` };
  }
  const repoBody = (await repoResponse.json()) as { default_branch: string };
  const base = repoBody.default_branch;

  const refResponse = await fetch(`${api}/git/ref/heads/${base}`, { headers });
  if (!refResponse.ok) {
    return { url: null, detail: `GitHub could not read the ${base} branch.` };
  }
  const refBody = (await refResponse.json()) as { object: { sha: string } };
  const branch = "fix/wrong-student";

  const createRef = await fetch(`${api}/git/refs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: refBody.object.sha }),
  });
  if (!createRef.ok && createRef.status !== 422) {
    return { url: null, detail: "GitHub could not create the fix branch." };
  }

  const existing = await fetch(`${api}/contents/site/course.mjs?ref=${branch}`, { headers });
  const sha = existing.ok ? ((await existing.json()) as { sha: string }).sha : undefined;
  const update = await fetch(`${api}/contents/site/course.mjs`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Apply Maya's payment to Maya's roster row",
      content: Buffer.from(source).toString("base64"),
      branch,
      sha,
    }),
  });
  if (!update.ok) {
    return { url: null, detail: "GitHub could not save the fixed file." };
  }

  const pull = await fetch(`${api}/pulls`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Apply Maya's payment to Maya, not the other student",
      head: branch,
      base,
      body: "Maya paid the fee, but the roster wrote that payment onto Ava and left Maya unpaid. The sandbox test failed, the agent matched the checkout email to Maya's row, and the test passed.",
    }),
  });
  const pullBody = (await pull.json()) as { html_url?: string; message?: string };
  if (!pull.ok || !pullBody.html_url) {
    return { url: null, detail: pullBody.message ?? "GitHub could not open the pull request." };
  }
  return { url: pullBody.html_url, detail: pullBody.html_url };
}
