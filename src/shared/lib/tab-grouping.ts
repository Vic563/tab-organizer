import type { TabActivity, TabGroup } from '../types';

const DOMAIN_COLORS: Record<string, string> = {
  'github.com': '#24292e',
  'stackoverflow.com': '#f48024',
  'google.com': '#4285f4',
  'youtube.com': '#ff0000',
  'twitter.com': '#1da1f2',
  'x.com': '#000000',
  'linkedin.com': '#0077b5',
  'reddit.com': '#ff4500',
  'notion.so': '#000000',
  'figma.com': '#f24e1e',
  'slack.com': '#4a154b',
  'discord.com': '#5865f2',
  'docs.google.com': '#4285f4',
  'drive.google.com': '#1a73e8',
  'mail.google.com': '#ea4335',
  'amazon.com': '#ff9900',
  'netflix.com': '#e50914',
  'spotify.com': '#1db954',
};

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
];

function getDomainColor(domain: string): string {
  if (DOMAIN_COLORS[domain]) {
    return DOMAIN_COLORS[domain];
  }
  const hash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DEFAULT_COLORS[hash % DEFAULT_COLORS.length];
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function getDomainDisplayName(domain: string): string {
  const nameMap: Record<string, string> = {
    'github.com': 'GitHub',
    'stackoverflow.com': 'Stack Overflow',
    'google.com': 'Google',
    'youtube.com': 'YouTube',
    'twitter.com': 'Twitter',
    'x.com': 'X',
    'linkedin.com': 'LinkedIn',
    'reddit.com': 'Reddit',
    'notion.so': 'Notion',
    'figma.com': 'Figma',
    'slack.com': 'Slack',
    'discord.com': 'Discord',
    'docs.google.com': 'Google Docs',
    'drive.google.com': 'Google Drive',
    'mail.google.com': 'Gmail',
  };
  return nameMap[domain] || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
}

export function detectTabGroups(tabs: TabActivity[], minGroupSize = 2): TabGroup[] {
  const domainMap = new Map<string, TabActivity[]>();

  for (const tab of tabs) {
    const domain = extractDomain(tab.url);
    if (!domainMap.has(domain)) {
      domainMap.set(domain, []);
    }
    domainMap.get(domain)!.push(tab);
  }

  const groups: TabGroup[] = [];

  for (const [domain, domainTabs] of domainMap) {
    if (domainTabs.length >= minGroupSize) {
      groups.push({
        id: `group-${domain}`,
        name: getDomainDisplayName(domain),
        domain,
        tabs: domainTabs.sort((a, b) => b.last_active_at - a.last_active_at),
        tab_count: domainTabs.length,
        color: getDomainColor(domain),
      });
    }
  }

  return groups.sort((a, b) => b.tab_count - a.tab_count);
}

export function detectProjectGroups(tabs: TabActivity[]): TabGroup[] {
  const projectMap = new Map<string, TabActivity[]>();

  for (const tab of tabs) {
    try {
      const url = new URL(tab.url);
      if (url.hostname === 'github.com') {
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          const projectKey = `github:${pathParts[0]}/${pathParts[1]}`;
          if (!projectMap.has(projectKey)) {
            projectMap.set(projectKey, []);
          }
          projectMap.get(projectKey)!.push(tab);
        }
      }
    } catch {
      // Skip invalid URLs
    }
  }

  const groups: TabGroup[] = [];

  for (const [projectKey, projectTabs] of projectMap) {
    if (projectTabs.length >= 2) {
      const projectName = projectKey.replace('github:', '');
      groups.push({
        id: `project-${projectKey}`,
        name: projectName,
        domain: 'github.com',
        tabs: projectTabs.sort((a, b) => b.last_active_at - a.last_active_at),
        tab_count: projectTabs.length,
        color: DOMAIN_COLORS['github.com'],
      });
    }
  }

  return groups.sort((a, b) => b.tab_count - a.tab_count);
}

export function getAllSmartGroups(tabs: TabActivity[]): TabGroup[] {
  const domainGroups = detectTabGroups(tabs, 2);
  const projectGroups = detectProjectGroups(tabs);

  // Merge, preferring project groups over domain groups
  const projectDomains = new Set(projectGroups.map(g => g.domain));
  const filteredDomainGroups = domainGroups.filter(g => !projectDomains.has(g.domain) || g.domain !== 'github.com');

  return [...projectGroups, ...filteredDomainGroups].sort((a, b) => b.tab_count - a.tab_count);
}
