import connectDB from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { GithubCommit } from "@/lib/db/models/GithubCommit";
import { Companion } from "@/lib/db/models/Companion";
import { XpSnapshot } from "@/lib/db/models/XpSnapshot";
import { Guild } from "@/lib/db/models/Guild";
import { decryptToken, levelFromXP } from "@/lib/utils";
import { checkAndAwardAchievement } from "@/lib/achievements/checker";
import { emitToUser } from "@/lib/socket/server";

interface GitHubCommitData {
  sha: string;
  commit: { message: string };
}

interface GitHubEvent {
  type: string;
  created_at: string;
  payload?: {
    before?: string;
    head?: string;
    commits?: Array<{ sha: string; message?: string }>;
  };
  repo?: { name: string };
}

async function fetchGitHub(path: string, token: string) {
  return fetch(`https://api.github.com/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
}

async function getPushedCommits(event: GitHubEvent, token: string) {
  const { before, head, commits } = event.payload ?? {};
  if (commits?.length) return commits;
  const repo = event.repo?.name.split("/").map(encodeURIComponent).join("/");
  if (!repo || !head || !/^[a-f\d]{40}$/i.test(head) || /^0+$/.test(head)) return [];

  if (!before || /^0+$/.test(before)) {
    const response = await fetchGitHub(`repos/${repo}/commits/${head}`, token);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`GitHub commit lookup failed (${response.status})`);
    const data: GitHubCommitData = await response.json();
    return [{ sha: data.sha, message: data.commit.message }];
  }

  if (!/^[a-f\d]{40}$/i.test(before) || before === head) return [];
  const result: GitHubCommitData[] = [];
  for (let page = 1; ; page++) {
    const response = await fetchGitHub(
      `repos/${repo}/compare/${before}...${head}?per_page=100&page=${page}`,
      token,
    );
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`GitHub commit comparison failed (${response.status})`);
    const { commits }: { commits: GitHubCommitData[] } = await response.json();
    result.push(...commits);
    if (commits.length < 100 || !response.headers.get("link")?.includes('rel="next"')) break;
  }
  return result.map(({ sha, commit }) => ({ sha, message: commit.message }));
}

export async function runGithubSync(
  userId: string
): Promise<{ newCommits: number; xpGained: number }> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user || !user.githubAccessToken) return { newCommits: 0, xpGained: 0 };

  let accessToken: string;
  try {
    accessToken = decryptToken(user.githubAccessToken);
  } catch {
    throw new Error("GitHub credentials need to be refreshed");
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const eventsRes = await fetchGitHub(`users/${encodeURIComponent(user.username)}/events?per_page=100`, accessToken);
  if (!eventsRes.ok) throw new Error(`GitHub events lookup failed (${eventsRes.status})`);
  const events: GitHubEvent[] = await eventsRes.json();

  const pushEvents = events.filter(
    (e) => e.type === "PushEvent" && new Date(e.created_at) > since
  );

  let newCommits = 0;
  let xpGained = 0;

  const pushes = [];
  for (const event of pushEvents) {
    pushes.push({ repo: event.repo?.name || "unknown", commits: await getPushedCommits(event, accessToken) });
  }
  for (const { repo, commits } of pushes) {
    for (const commit of commits) {
      const messageLength = commit.message?.length || 0;
      const commitXp = Math.floor(10 + Math.min(messageLength / 10, 10));
      const now = new Date();
      const result = await GithubCommit.updateOne(
        { sha: commit.sha },
        {
          $setOnInsert: {
            userId: user._id,
            message: commit.message?.slice(0, 200) || "",
            repo,
            xpAwarded: commitXp,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true, timestamps: false },
      );
      if (result.upsertedCount) {
        xpGained += commitXp;
        newCommits++;
      }
    }
  }

  if (xpGained > 0) {
    user.xp += xpGained;
    user.level = levelFromXP(user.xp);
    user.codingSessions += 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.lastActiveDate) {
      const lastActive = new Date(user.lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor(
        (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        user.streak += 1;
      } else if (daysDiff > 1) {
        user.streak = 1;
      }
    } else {
      user.streak = 1;
    }

    user.lastActiveDate = new Date();
    await user.save();

    if (user.activeCompanionId) {
      const companion = await Companion.findById(user.activeCompanionId);
      if (companion) {
        companion.xp += Math.floor(xpGained * 0.5);
        companion.level = Math.min(50, levelFromXP(companion.xp));
        companion.lastInteraction = new Date();

        if (companion.level >= 30 && companion.evolutionStage < 3) {
          companion.evolutionStage = 3;
        } else if (companion.level >= 10 && companion.evolutionStage < 2) {
          companion.evolutionStage = 2;
        }

        await companion.save();
      }
    }

    if (user.guildId) {
      await Guild.updateOne({ _id: user.guildId }, { $inc: { weeklyXp: xpGained } });
    }

    // Bug 5 fix: dedup XpSnapshot per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const companion = user.activeCompanionId
      ? await Companion.findById(user.activeCompanionId)
      : null;
    const existingSnapshot = await XpSnapshot.findOne({
      userId: user._id,
      date: { $gte: todayStart },
    });
    if (!existingSnapshot && companion) {
      await XpSnapshot.create({
        userId: user._id,
        companionId: companion._id,
        userXp: user.xp,
        companionXp: companion?.xp ?? 0,
        companionLevel: companion?.level ?? 1,
        date: new Date(),
      });
    } else if (existingSnapshot && companion) {
      await XpSnapshot.updateOne(
        { _id: existingSnapshot._id },
        {
          userXp: user.xp,
          companionXp: companion?.xp ?? 0,
          companionLevel: companion?.level ?? 1,
        }
      );
    }

    if (user.streak === 7)
      await checkAndAwardAchievement({
        key: "streak_7",
        userId: user._id.toString(),
      });
    if (user.streak === 30)
      await checkAndAwardAchievement({
        key: "streak_30",
        userId: user._id.toString(),
      });
    if (user.level >= 10)
      await checkAndAwardAchievement({
        key: "level_10",
        userId: user._id.toString(),
      });
    if (user.level >= 50)
      await checkAndAwardAchievement({
        key: "level_50",
        userId: user._id.toString(),
      });

    emitToUser(user._id.toString(), "xp_gained", {
      amount: xpGained,
      source: "GitHub Sync",
      total: user.xp,
      level: user.level,
    });
  }

  return { newCommits, xpGained };
}
