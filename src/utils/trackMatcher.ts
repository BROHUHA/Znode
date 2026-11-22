/**
 * Znode Music Web - TrackMatcher Engine
 * Faithful TypeScript port of YZ Music's TrackMatcher.kt
 *
 * Prevents the wrong recording from playing under the right title:
 * - Separates title into core identity, version markers (remix, acoustic, live), and context packaging.
 * - Enforces strict version agreement in both directions.
 * - Enforces duration tolerance (+-8 seconds) and primary artist credit agreement.
 */

export interface TargetTrack {
  title: string;
  artist: string;
  durationSec?: number | null;
}

export interface CandidateTrack {
  id?: string;
  title: string;
  artist: string;
  durationSec?: number | null;
  streamUrl?: string | null;
  bitrate?: number;
}

export interface TitleParts {
  words: string[];
  core: string;
  versions: Set<string>;
  context: Set<string>;
}

// Words indicating a distinct performance or take — must match in BOTH directions
const VERSION_WORDS = new Set([
  'remix',
  'mix',
  'live',
  'acoustic',
  'instrumental',
  'unplugged',
  'orchestral',
  'reverb',
  'slowed',
  'sped',
  'speed',
  'nightcore',
  'lofi',
  'lo-fi',
  'cover',
  'karaoke',
  'reprise',
  'extended',
  'demo',
  'clean',
  'explicit',
  'edit',
  'session',
]);

// Packaging phrases that describe the regular release (not a separate take)
const NEUTRAL_SEGMENTS = new Set([
  'albumversion',
  'radioedit',
  'originalmix',
  'original',
  'audiotrack',
  'officialaudio',
  'officialvideo',
  'officialmusicvideo',
  'lyricvideo',
  'lyrics',
  'visualizer',
  'fullsong',
  'fulllaudio',
  '4k',
  'hd',
  'mv',
]);

// Trailing packaging words on raw uploads (e.g., "Song Full Video", "Song Audio")
const TRAILING_NOISE = new Set([
  'song',
  'video',
  'audio',
  'music',
  'track',
  'lyrics',
  'lyric',
  'visualizer',
  'hd',
  '4k',
  'mv',
  'official',
]);

const JOINING_WORDS = new Set(['and', 'with', 'feat', 'ft', 'the', 'a', 'an', 'of', 'in', 'on', 'from']);

const BRACKETED_REGEX = /[\(\[](.*?)[\)\]]/g;
const DASH_REGEX = /\s+[-–—|•]\s+/g;
const ARTIST_SPLIT = /[,&•/|]|(\s+feat\.?\s+)|\s+ft\.?\s+/i;

/**
 * Calculates Levenshtein edit distance similarity between two normalized strings (0.0 to 1.0)
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = dp[m][n];
  const maxLen = Math.max(m, n);
  return maxLen === 0 ? 1.0 : 1.0 - distance / maxLen;
}

export class TrackMatcher {
  /**
   * Decomposes a title into:
   * - core: Alphanumeric title identity words
   * - versions: Take modifiers (remix, live, acoustic, etc.)
   * - context: Stripped packaging (movie name, official video, etc.)
   */
  public static parseTitle(raw: string, artist: string = ''): TitleParts {
    const versions = new Set<string>();
    const context = new Set<string>();

    let text = (raw || '').toLowerCase().replace(/&/g, ' and ');

    // 1. Process bracketed segments: (From "Movie"), [Official Audio], (Live at Wembley)
    let bracketMatch: RegExpExecArray | null;
    const bracketRegex = new RegExp(BRACKETED_REGEX);
    while ((bracketMatch = bracketRegex.exec(text)) !== null) {
      this.classify(bracketMatch[1], versions, context);
    }
    text = text.replace(BRACKETED_REGEX, ' ');

    // Clean unclosed opening brackets
    const openIdx = text.search(/[\(\[]/);
    if (openIdx >= 0) {
      this.classify(text.slice(openIdx), versions, context);
      text = text.slice(0, openIdx);
    }

    // 2. Dash- and pipe-separated segments: "Song - Artist", "Song | Official Video"
    const dashParts = text.split(DASH_REGEX);
    if (dashParts.length > 1) {
      const head = dashParts[0].trim();
      const tail = dashParts.slice(1).join(' ').trim();

      if (this.isArtistName(head, artist)) {
        this.classify(head, versions, context);
        text = tail;
      } else {
        this.classify(tail, versions, context);
        text = head;
      }
    }

    // 3. Strip featuring markers
    text = text.replace(/\s*(feat\.?|ft\.?|with)\s+.*$/i, ' ');

    // 4. Tokenize core title words
    let words = text
      .split(/[^a-z0-9]+/i)
      .map((w) => w.replace(/[^a-z0-9]/g, '').trim())
      .filter((w) => w.length > 0 && !JOINING_WORDS.has(w));

    // Strip trailing upload noise like "Song Full Video" -> "Song"
    while (words.length > 1 && TRAILING_NOISE.has(words[words.length - 1])) {
      words.pop();
    }

    return {
      words,
      core: words.join(''),
      versions,
      context,
    };
  }

  private static classify(segment: string, versions: Set<string>, context: Set<string>) {
    const cleanSegment = (segment || '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const tokens = cleanSegment.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return;

    const joined = tokens.join('');
    if (NEUTRAL_SEGMENTS.has(joined)) return;

    let hasVersion = false;
    for (const token of tokens) {
      if (VERSION_WORDS.has(token)) {
        versions.add(token);
        hasVersion = true;
      }
    }

    if (!hasVersion) {
      context.add(cleanSegment);
    }
  }

  private static isArtistName(segment: string, artist: string): boolean {
    if (!segment || !artist) return false;
    const cleanSeg = segment.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanArt = artist.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanSeg.length > 2 && (cleanArt.includes(cleanSeg) || cleanSeg.includes(cleanArt));
  }

  public static primaryArtist(artist: string): string {
    if (!artist) return '';
    return artist
      .toLowerCase()
      .split(ARTIST_SPLIT)[0]
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Scores whether candidate is genuinely target.
   * Returns a score (higher is better) or null if candidate fails verification.
   */
  public static score(candidate: CandidateTrack, target: TargetTrack): number | null {
    const wanted = this.parseTitle(target.title, target.artist);
    const got = this.parseTitle(candidate.title, candidate.artist);

    if (!wanted.core || !got.core) return null;

    // 1. Core Title Equality or High Similarity Check
    if (wanted.core !== got.core) {
      const sim = stringSimilarity(wanted.core, got.core);
      // If words are completely different, reject immediately (stops random Hindi songs!)
      if (sim < 0.82) {
        return null;
      }
    }

    // 2. Strict Version Symmetry Guard:
    // If target is album original, candidate MUST NOT be remix, acoustic, or live.
    // If target is live or remix, candidate MUST match that exact version.
    if (wanted.versions.size !== got.versions.size) {
      return null;
    }
    for (const v of wanted.versions) {
      if (!got.versions.has(v)) return null;
    }

    // 3. Duration Verification Guard:
    // When duration is known on both sides, candidate must be within +-8 seconds.
    if (
      typeof target.durationSec === 'number' &&
      target.durationSec > 0 &&
      typeof candidate.durationSec === 'number' &&
      candidate.durationSec > 0
    ) {
      const diff = Math.abs(target.durationSec - candidate.durationSec);
      if (diff > 8) {
        return null; // Different song cut or extended version -> reject!
      }
    }

    // 4. Primary Artist Credit Verification:
    const wantedArtist = this.primaryArtist(target.artist);
    const gotArtist = this.primaryArtist(candidate.artist);

    let artistMatch = false;
    if (wantedArtist && gotArtist) {
      if (
        wantedArtist === gotArtist ||
        wantedArtist.includes(gotArtist) ||
        gotArtist.includes(wantedArtist) ||
        stringSimilarity(wantedArtist, gotArtist) >= 0.75
      ) {
        artistMatch = true;
      }
    } else {
      // If artist wasn't provided on one side, accept if duration is tightly matched
      artistMatch = true;
    }

    // If artists disagree, only allow match if duration is within +-2 seconds (e.g. film composer vs singer)
    if (!artistMatch) {
      if (
        typeof target.durationSec === 'number' &&
        typeof candidate.durationSec === 'number' &&
        Math.abs(target.durationSec - candidate.durationSec) <= 2
      ) {
        artistMatch = true;
      } else {
        return null; // Mismatched artist and non-identical duration -> reject!
      }
    }

    // Compute composite confidence score (higher is more confident)
    let score = 100;
    if (wanted.core === got.core) score += 20;
    if (wantedArtist === gotArtist) score += 15;
    if (
      typeof target.durationSec === 'number' &&
      typeof candidate.durationSec === 'number'
    ) {
      score += Math.max(0, 10 - Math.abs(target.durationSec - candidate.durationSec));
    }

    return score;
  }

  /**
   * Filters and ranks candidates, returning only the single best genuine match.
   */
  public static best(candidates: CandidateTrack[], target: TargetTrack): CandidateTrack | null {
    if (!candidates || candidates.length === 0) return null;

    let bestCandidate: CandidateTrack | null = null;
    let highestScore = -1;

    for (const candidate of candidates) {
      const s = this.score(candidate, target);
      if (s !== null && s > highestScore) {
        highestScore = s;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }
}

/**
 * Parses duration strings like "3:45", "04:12", "1:15:20", or numeric seconds into integer seconds.
 */
export function parseDurationSec(duration?: string | number | null): number | null {
  if (duration === null || duration === undefined) return null;
  if (typeof duration === 'number') return isNaN(duration) ? null : Math.round(duration);
  const str = String(duration).trim();
  if (!str) return null;
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  const parts = str.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

