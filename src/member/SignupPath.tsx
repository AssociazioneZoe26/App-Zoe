type SignupPathProps = {
  emailDone?: boolean;
  approved?: boolean;
};

export function SignupPath({ emailDone = false, approved = false }: SignupPathProps) {
  return (
    <ol className="signup-path" aria-label="Percorso di iscrizione">
      <li className={emailDone ? "is-done" : "is-current"}>
        <strong>1. Account</strong>
        <span>Compili i dati e confermi l’email.</span>
      </li>
      <li className={approved ? "is-done" : emailDone ? "is-current" : ""}>
        <strong>2. Approvazione</strong>
        <span>Team Zoe valuta la richiesta e attiva l’area soci.</span>
      </li>
      <li>
        <strong>3. Tessera</strong>
        <span>Il numero tessera lo assegna Team Zoe dopo, in associazione.</span>
      </li>
    </ol>
  );
}
