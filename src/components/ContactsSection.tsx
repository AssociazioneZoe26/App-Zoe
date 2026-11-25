import { generalWhatsapp } from "../data";

export function ContactsSection({ photo }: { photo?: string }) {
  return (
    <section className={photo ? "contact contact-with-photo" : "contact"} id="contatti">
      {photo ? (
        <figure className="contact-photo">
          <img src={photo} alt="Laboratori e attività in sede Zoe a Li Punti, Sassari" />
        </figure>
      ) : null}
      <div className="contact-copy">
        <p className="eyebrow eyebrow-red">Dove siamo</p>
        <h2>Li Punti, a due passi dalle Poste.</h2>
        <p className="lede">
          Via Li Punti 12, Sassari. Strada interna, davanti alle Poste Italiane.
          Per orari e posti liberi scrivi o chiama: l’iscrizione si fa in
          associazione.
        </p>
        <div className="contacts-cta" aria-label="Contatta Zoe">
          <a className="contacts-cta-btn contacts-cta-whatsapp" href={generalWhatsapp}>
            WhatsApp
          </a>
          <a className="contacts-cta-btn contacts-cta-call" href="tel:+393473814081">
            Chiama
          </a>
          <a className="contacts-cta-btn contacts-cta-mail" href="mailto:info@associazionezoe.org">
            Scrivi
          </a>
        </div>
      </div>
    </section>
  );
}
