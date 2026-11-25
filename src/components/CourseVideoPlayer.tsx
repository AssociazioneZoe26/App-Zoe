import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PREVIEW_SECONDS,
  isDirectVideoUrl,
  youtubeEmbedUrl,
} from "../lib/courseVideo";

type Props = {
  url: string;
  title?: string;
  /** Se impostato, limita la riproduzione ai primi N secondi (anteprima). */
  previewSeconds?: number;
  className?: string;
};

export function CourseVideoPlayer({
  url,
  title = "Video corso",
  previewSeconds,
  className = "course-video",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [endedPreview, setEndedPreview] = useState(false);
  const limit =
    typeof previewSeconds === "number" && previewSeconds > 0
      ? previewSeconds
      : undefined;

  useEffect(() => {
    setEndedPreview(false);
  }, [url, limit]);

  const yt = youtubeEmbedUrl(url, limit ? { endSeconds: limit } : undefined);

  if (yt) {
    return (
      <div className={className}>
        <div className="course-video-frame">
          <iframe
            src={yt}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {limit ? (
          <p className="fine course-video-hint">
            Anteprima · primi {limit} secondi
          </p>
        ) : null}
      </div>
    );
  }

  if (!isDirectVideoUrl(url) && !url.startsWith("http")) {
    return (
      <div className={className}>
        <p className="lede">URL video non valido.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <video
        ref={videoRef}
        controls={!limit || !endedPreview}
        playsInline
        preload="metadata"
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (!el || !limit) return;
          if (el.currentTime >= limit) {
            el.pause();
            el.currentTime = limit;
            setEndedPreview(true);
          }
        }}
        onSeeked={() => {
          const el = videoRef.current;
          if (!el || !limit) return;
          if (el.currentTime > limit) {
            el.currentTime = limit;
            el.pause();
            setEndedPreview(true);
          }
        }}
      >
        <source src={url} />
      </video>
      {limit ? (
        <p className="fine course-video-hint">
          {endedPreview
            ? `Anteprima terminata (${limit}s). Acquista per il corso completo.`
            : `Anteprima · primi ${limit || DEFAULT_PREVIEW_SECONDS} secondi`}
        </p>
      ) : null}
    </div>
  );
}
