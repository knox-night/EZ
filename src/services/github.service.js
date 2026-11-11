const crypto = require('crypto');

const apiBase = 'https://api.github.com';
const apiVersion = '2022-11-28';
const appConfigured = () => Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_SLUG && process.env.GITHUB_PRIVATE_KEY);

function appJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iat: now - 30, exp: now + 8 * 60, iss: process.env.GITHUB_APP_ID })).toString('base64url');
  const input = `${header}.${payload}`;
  const key = process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(input), key).toString('base64url');
  return `${input}.${signature}`;
}

async function request(url, token, method = 'GET') {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': apiVersion,
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || 'GitHub could not complete that request.');
    error.status = response.status;
    throw error;
  }
  return body;
}

async function installationToken(installationId) {
  const jwt = appJwt();
  const token = await request(`${apiBase}/app/installations/${installationId}/access_tokens`, jwt, 'POST');
  return token.token;
}

async function installationRepos(installationId) {
  const token = await installationToken(installationId);
  const data = await request(`${apiBase}/installation/repositories?per_page=100`, token);
  return (data.repositories || []).map(repo => ({
    id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    description: repo.description || '',
    private: Boolean(repo.private),
    language: repo.language || '',
    html_url: repo.html_url
  }));
}

async function contents(token, fullName, filePath) {
  try {
    const file = await request(`${apiBase}/repos/${fullName}/contents/${filePath}`, token);
    if (file.encoding !== 'base64' || typeof file.content !== 'string') return '';
    return Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
  } catch (error) {
    if (error.status === 404) return '';
    throw error;
  }
}

async function readme(token, fullName) {
  try {
    const file = await request(`${apiBase}/repos/${fullName}/readme`, token);
    return file.encoding === 'base64' && file.content
      ? Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8')
      : '';
  } catch (error) {
    if (error.status === 404) return '';
    throw error;
  }
}

function shortReadme(markdown) {
  return markdown
    .replace(/^\s*#.*(?:\r?\n)+/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

async function repositoryDraft(installationId, repoId) {
  const token = await installationToken(installationId);
  const repo = await request(`${apiBase}/repositories/${Number(repoId)}`, token);
  const [readme, languages] = await Promise.all([
    readme(token, repo.full_name),
    request(`${apiBase}/repos/${repo.full_name}/languages`, token)
  ]);
  const stack = Object.keys(languages).sort((a, b) => languages[b] - languages[a]).slice(0, 5);
  if (!stack.length && repo.language) stack.push(repo.language);
  const summary = repo.description || shortReadme(readme);
  return {
    repo_id: repo.id,
    full_name: repo.full_name,
    name: repo.name,
    description: summary,
    industry: 'Software / SaaS',
    employee_count: 1,
    tools: stack.map(name => ({ name, category: 'Development' })),
    workflows: []
  };
}

module.exports = { appConfigured, installationRepos, repositoryDraft };
