import type { TabActivity, SmartSession, SmartSessionTab } from '../types';

const TOPIC_KEYWORDS: Record<string, string[]> = {
  'documentation': ['docs', 'documentation', 'api', 'reference', 'guide', 'manual'],
  'tutorial': ['tutorial', 'learn', 'course', 'lesson', 'how-to', 'getting-started'],
  'development': ['github', 'gitlab', 'bitbucket', 'code', 'repository', 'pull-request', 'issue'],
  'shopping': ['cart', 'checkout', 'buy', 'shop', 'store', 'product', 'amazon', 'ebay'],
  'social': ['twitter', 'facebook', 'linkedin', 'reddit', 'instagram', 'tiktok'],
  'video': ['youtube', 'vimeo', 'netflix', 'twitch', 'video', 'watch'],
  'news': ['news', 'article', 'blog', 'post', 'medium'],
  'email': ['mail', 'inbox', 'gmail', 'outlook'],
  'design': ['figma', 'sketch', 'design', 'canva', 'adobe'],
  'productivity': ['notion', 'trello', 'asana', 'jira', 'slack', 'calendar'],
};

const TIME_OF_DAY_NAMES: Record<string, string> = {
  'morning': 'Morning',
  'afternoon': 'Afternoon',
  'evening': 'Evening',
  'night': 'Night',
};

function getTimeOfDay(timestamp: number): string {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export function extractTopicsFromTab(tab: TabActivity): string[] {
  const topics: Set<string> = new Set();
  const searchText = `${tab.url} ${tab.title}`.toLowerCase();

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      topics.add(topic);
    }
  }

  return Array.from(topics);
}

export function extractTopicsFromTabs(tabs: TabActivity[]): string[] {
  const topicCounts = new Map<string, number>();

  for (const tab of tabs) {
    const tabTopics = extractTopicsFromTab(tab);
    for (const topic of tabTopics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
  }

  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
}

export function getDominantDomain(tabs: TabActivity[]): string | null {
  const domainCounts = new Map<string, number>();

  for (const tab of tabs) {
    const domain = extractDomain(tab.url);
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
  }

  let maxDomain: string | null = null;
  let maxCount = 0;

  for (const [domain, count] of domainCounts) {
    if (count > maxCount && count >= 2) {
      maxCount = count;
      maxDomain = domain;
    }
  }

  return maxDomain;
}

export function generateSessionName(tabs: SmartSessionTab[], startTime: number): string {
  const timeOfDay = TIME_OF_DAY_NAMES[getTimeOfDay(startTime)];
  const topics = extractTopicsFromTabs(tabs as unknown as TabActivity[]);

  if (topics.length > 0) {
    const topicName = topics[0].charAt(0).toUpperCase() + topics[0].slice(1);
    return `${timeOfDay} ${topicName}`;
  }

  const dominantDomain = getDominantDomain(tabs as unknown as TabActivity[]);
  if (dominantDomain) {
    const domainName = dominantDomain.split('.')[0];
    return `${timeOfDay} ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}`;
  }

  return `${timeOfDay} Session`;
}

const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

export function detectSmartSessions(tabs: TabActivity[]): SmartSession[] {
  if (tabs.length === 0) return [];

  const sortedTabs = [...tabs].sort((a, b) => a.last_active_at - b.last_active_at);
  const sessions: SmartSession[] = [];
  let currentSessionTabs: SmartSessionTab[] = [];
  let sessionStartTime = sortedTabs[0].last_active_at;

  for (let i = 0; i < sortedTabs.length; i++) {
    const tab = sortedTabs[i];
    const prevTab = i > 0 ? sortedTabs[i - 1] : null;

    if (prevTab && tab.last_active_at - prevTab.last_active_at > SESSION_GAP_MS) {
      // Gap detected, finalize current session
      if (currentSessionTabs.length >= 2) {
        const session = createSession(currentSessionTabs, sessionStartTime, prevTab.last_active_at);
        sessions.push(session);
      }
      currentSessionTabs = [];
      sessionStartTime = tab.last_active_at;
    }

    currentSessionTabs.push({
      chrome_tab_id: tab.chrome_tab_id,
      url: tab.url,
      title: tab.title,
      favicon_url: tab.favicon_url,
      first_seen_at: tab.last_active_at - tab.total_active_time_ms,
      last_active_at: tab.last_active_at,
    });
  }

  // Finalize last session
  if (currentSessionTabs.length >= 2) {
    const lastTab = sortedTabs[sortedTabs.length - 1];
    const session = createSession(currentSessionTabs, sessionStartTime, lastTab.last_active_at);
    sessions.push(session);
  }

  return sessions.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
}

function createSession(tabs: SmartSessionTab[], startTime: number, endTime: number): SmartSession {
  const topics = extractTopicsFromTabs(tabs as unknown as TabActivity[]);
  const dominantDomain = getDominantDomain(tabs as unknown as TabActivity[]);

  return {
    id: `session-${startTime}`,
    name: generateSessionName(tabs, startTime),
    tabs,
    start_time: new Date(startTime).toISOString(),
    end_time: new Date(endTime).toISOString(),
    auto_generated: true,
    topic_tags: topics,
    dominant_domain: dominantDomain,
  };
}
