import { useMemo } from "react";
import { isSmartphone, preferredMobileStore } from "../lib/device";

/** Placeholder finché Zoe non pubblica sugli store. */
const PLAY_STORE_URL = "#google-play";
const APP_STORE_URL = "#app-store";

type Props = {
  /** Se true, su smartphone mostra solo lo store del sistema. */
  preferOsStore?: boolean;
};

export function StoreDownloadButtons({ preferOsStore = false }: Props) {
  const smartphone = useMemo(() => isSmartphone(), []);
  const preferred = useMemo(() => preferredMobileStore(), []);

  const showPlay = !preferOsStore || !smartphone || preferred === "android" || preferred === null;
  const showApple = !preferOsStore || !smartphone || preferred === "ios" || preferred === null;

  return (
    <section className="store-download" aria-label="Scarica l’app Zoe">
      {!smartphone ? (
        <p className="store-download-note">
          Apri questa pagina dal tuo smartphone per scaricare l’app. Da computer o
          tablet puoi comunque usare Zoe Academy dal browser.
        </p>
      ) : (
        <p className="store-download-note store-download-note-ok">
          Scegli lo store del tuo telefono. I link si attiveranno quando l’app sarà
          online su Google Play e App Store.
        </p>
      )}

      <div className="store-download-actions">
        {showPlay ? (
          <a
            className="store-btn store-btn-play"
            href={smartphone ? PLAY_STORE_URL : undefined}
            aria-disabled={!smartphone}
            tabIndex={smartphone ? 0 : -1}
            onClick={(event) => {
              if (!smartphone || PLAY_STORE_URL.startsWith("#")) {
                event.preventDefault();
              }
            }}
          >
            <GooglePlayIcon />
            <span>
              <small>Disponibile su</small>
              <strong>Google Play</strong>
            </span>
          </a>
        ) : null}

        {showApple ? (
          <a
            className="store-btn store-btn-apple"
            href={smartphone ? APP_STORE_URL : undefined}
            aria-disabled={!smartphone}
            tabIndex={smartphone ? 0 : -1}
            onClick={(event) => {
              if (!smartphone || APP_STORE_URL.startsWith("#")) {
                event.preventDefault();
              }
            }}
          >
            <AppleIcon />
            <span>
              <small>Scarica su</small>
              <strong>App Store</strong>
            </span>
          </a>
        ) : null}
      </div>
    </section>
  );
}

function GooglePlayIcon() {
  return (
    <svg className="store-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.6 2.2c-.4.2-.6.6-.6 1.1v17.4c0 .5.2.9.6 1.1l9.7-9.8L3.6 2.2zm11.3 6.3 2.3-1.3-2.9-1.7-2.2 2.2 2.8.8zm3.4-.2-3.1 1.8 3.1 1.8 1.5-.9c.7-.4.7-1.4 0-1.8l-1.5-.9zM12.4 12.9l2.3 2.3 2.9-1.7-2.3-1.4-2.9.8zm-1.8 1.8-2.2 2.2 2.9 1.7 2.3-1.3-3-.2z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="store-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.3 1 8.4.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7s1.6.7 2.7.7c1.1 0 1.9-1 2.6-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.8-2.2-3.5zM14.4 6.5c.6-.7 1-1.7.9-2.7-0.9.1-1.9.6-2.5 1.3-.6.6-1.1 1.6-.9 2.5 1 .1 1.9-.4 2.5-1.1z"
      />
    </svg>
  );
}
