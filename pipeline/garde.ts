// Never a full collection from the owner's PC (brief B.10, CLAUDE.md): outside GitHub Actions, 200 names at most.
export const LIMITE_HORS_ACTIONS = 200;

export function verifierLimite(nombre: number, env: Readonly<Record<string, string | undefined>> = process.env): void {
  if (nombre > LIMITE_HORS_ACTIONS && env.GITHUB_ACTIONS !== "true") {
    throw new Error(
      `${nombre} noms : hors de GitHub Actions, un essai porte sur ${LIMITE_HORS_ACTIONS} noms au plus (--limite ${LIMITE_HORS_ACTIONS}).`,
    );
  }
}
