export interface Snippet {
  id: string;
  name: string;
  content: string;
  folder: string;
  description?: string;
  tags?: string[];
  updatedAt: number;
}

export const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 'snip-git-status',
    name: 'Git Status (Short)',
    content: 'git status -s',
    folder: 'Git',
    description: 'Show working tree status in short format',
    tags: ['git', 'vcs'],
    updatedAt: Date.now(),
  },
  {
    id: 'snip-git-commit',
    name: 'Git Commit',
    content: 'git commit -m "{{message}}"',
    folder: 'Git',
    description: 'Commit staged changes with message',
    tags: ['git', 'commit'],
    updatedAt: Date.now(),
  },
  {
    id: 'snip-git-pull',
    name: 'Git Pull Branch',
    content: 'git pull origin {{branch}}',
    folder: 'Git',
    description: 'Pull remote changes for specified branch',
    tags: ['git', 'pull'],
    updatedAt: Date.now(),
  },
  {
    id: 'snip-docker-ps',
    name: 'Docker Active Containers',
    content: 'docker ps --format "table {{.ID}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}"',
    folder: 'Docker',
    description: 'List active Docker containers in table format',
    tags: ['docker', 'containers'],
    updatedAt: Date.now(),
  },
  {
    id: 'snip-port-kill',
    name: 'Find Process on Port',
    content: 'netstat -ano | findstr :{{port}}',
    folder: 'System',
    description: 'Find Windows process listening on port',
    tags: ['network', 'port'],
    updatedAt: Date.now(),
  },
  {
    id: 'snip-npm-install',
    name: 'NPM Clean Install',
    content: 'npm ci',
    folder: 'Node',
    description: 'Install dependencies cleanly from package-lock.json',
    tags: ['node', 'npm'],
    updatedAt: Date.now(),
  },
];
