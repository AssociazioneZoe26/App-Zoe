import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ContactForm } from "../components/ContactForm";
import { ContactsSection } from "../components/ContactsSection";
import { Layout } from "../components/Layout";
import { NewsletterSignup } from "../components/NewsletterSignup";

export function ContactsPage() {
  const location = useLocation();

  useEffect(() => {
    document.title = "Contatti · Zoe";
  }, []);

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <Layout variant="site">
      <article className="site-page contacts-page">
        <header
          className="site-hero is-pos-top"
          style={{ backgroundImage: "url(/site/chi-siamo.jpg)" }}
        >
          <div className="site-hero-shade">
            <p className="eyebrow eyebrow-red">Contatti</p>
            <h1>Parla con Zoe.</h1>
            <p className="lede">
              Siamo a Li Punti, Sassari. Passa in sede, chiamaci o scrivi: Team Zoe ti risponde.
            </p>
          </div>
        </header>

        <div className="site-body">
          <ContactsSection photo="/site/home-hero.jpg" />

          <figure className="contacts-map">
            <iframe
              title="Mappa della sede Zoe, Via Li Punti 12 Sassari"
              src="https://maps.google.com/maps?q=Via%20Li%20Punti%2012%2C%20Sassari&z=16&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <figcaption>Via Li Punti 12, strada interna davanti alle Poste.</figcaption>
          </figure>

          <section className="contact-write" id="scrivi">
            <p className="eyebrow eyebrow-red">Scrivici</p>
            <h2>Hai qualche domanda o segnalazione da fare?</h2>
            <p className="lede">Compila il form: ti rispondiamo in associazione.</p>
            <ContactForm />
          </section>
          <NewsletterSignup />
        </div>
      </article>
    </Layout>
  );
}
