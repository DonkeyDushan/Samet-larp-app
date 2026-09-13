/** Login and identity (§3.1). */
export const access = Object.freeze({
  title: 'Přihlášení',
  intro: 'Jedno sdílené heslo pro všechny orgy. Jméno se zapisuje ke každé změně do auditu.',
  passwordLabel: 'Heslo',
  authorHint: 'Volný text, bez ověřování. Zůstane uložené v tomhle prohlížeči.',
  submit: 'Vstoupit',
  submitting: 'Ověřuji…',

  identityTitle: 'Kdo jsi?',
  identityIntro: 'Jméno se připojí ke každé další změně v auditu. Starší záznamy zůstávají pod původním jménem.',
  changeIdentity: (author: string) => `Změnit jméno (${author})`,
  saveIdentity: 'Uložit jméno',
  logOut: 'Odhlásit',
})
