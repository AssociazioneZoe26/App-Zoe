import { useEffect } from "react";
import { Layout } from "./Layout";
import type { SitePage } from "../content/pages";

export function ContentPage({ page }: { page: SitePage }) {
  useEffect(() => {
    document.title = page.documentTitle;
  }, [page.documentTitle]);

  return (
    <Layout variant="site">
      <article className="site-page">
        <header
          className="site-hero"
          style={{ backgroundImage: `url(${page.heroImage})` }}
        >
          <div className="site-hero-shade">
            <p className="eyebrow eyebrow-red">{page.title}</p>
            <h1>{page.heroTitle}</h1>
            <p className="lede">{page.heroText}</p>
          </div>
        </header>

        {page.sections.map((section, index) => (
          <section
            key={`${page.slug}-section-${index}`}
            className={
              section.image
                ? index % 2 === 1
                  ? "site-block site-block-media is-flip"
                  : "site-block site-block-media"
                : "site-block"
            }
          >
            {section.image ? (
              <div className="site-block-art">
                <img src={section.image} alt={section.imageAlt || ""} />
              </div>
            ) : null}
            <div className="site-block-copy">
              {section.title ? <h2>{section.title}</h2> : null}
              <p className="lede">{section.body}</p>
            </div>
          </section>
        ))}

        {page.videos.length > 0 ? (
          <section className="site-videos">
            <p className="eyebrow eyebrow-red">Video</p>
            <h2>Guarda le attività.</h2>
            <ul className="site-video-grid">
              {page.videos.map((video) => (
                <li key={video.src}>
                  <p className="card-kicker">{video.title}</p>
                  <video controls preload="metadata" poster={video.poster}>
                    <source src={video.src} />
                  </video>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </Layout>
  );
}
