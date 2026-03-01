// demonhacks/lib/api/reddit.ts

export interface RedditEvent {
  id: string;
  title: string;
  description: string;
  url: string;
  score: number;
  source: 'reddit';
}

export async function fetchChicagoHappenings(): Promise<RedditEvent[]> {
  try {
    // Hackathon trick: Append .json to a Reddit search to bypass API key requirements
    const query = encodeURIComponent('flair:"Event" OR popup OR "this weekend"');
    const url = `https://www.reddit.com/r/chicago/search.json?q=${query}&restrict_sr=on&sort=new&t=week`;

    const response = await fetch(url);
    const json = await response.json();

    // Map the messy Reddit format into a clean array
    const posts = json.data.children.map((child: any) => ({
      id: child.data.id,
      title: child.data.title,
      description: child.data.selftext || '', // The actual body of the post
      url: `https://reddit.com${child.data.permalink}`,
      score: child.data.score,
      source: 'reddit'
    }));

    // Filter out sticky posts or low-engagement spam
    return posts.filter((post: RedditEvent) => post.score > 5);

  } catch (error) {
    console.error("Error fetching Reddit events:", error);
    return [];
  }
}