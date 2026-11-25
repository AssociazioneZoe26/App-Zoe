export type CourseLesson = {
  title: string;
  url: string;
};

export const MAX_COURSE_LESSONS = 10;
export const DEFAULT_PREVIEW_SECONDS = 15;

export function normalizeLessons(lessons: CourseLesson[] | undefined): CourseLesson[] {
  if (!Array.isArray(lessons)) return [];
  return lessons
    .map((lesson) => ({
      title: (lesson.title || "").trim(),
      url: (lesson.url || "").trim(),
    }))
    .filter((lesson) => lesson.url)
    .slice(0, MAX_COURSE_LESSONS)
    .map((lesson, index) => ({
      title: lesson.title || `Lezione ${index + 1}`,
      url: lesson.url,
    }));
}

export function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] || null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2] || null;
      }
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

export function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|m4v)(\?|#|$)/i.test(url) || url.startsWith("/") || url.startsWith("blob:");
}

export function youtubeEmbedUrl(url: string, options?: { endSeconds?: number }) {
  const id = youtubeVideoId(url);
  if (!id) return null;
  const params = new URLSearchParams({ rel: "0" });
  if (options?.endSeconds && options.endSeconds > 0) {
    params.set("start", "0");
    params.set("end", String(Math.floor(options.endSeconds)));
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
