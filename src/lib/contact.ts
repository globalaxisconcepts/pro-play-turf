/**
 * Where to reach us. Its own module so the compliance gate can use it without
 * importing `lib/legal`, which imports the gate back for the terms version.
 */
export const CONTACT = {
  support: "support@proplayturf.com",
  privacy: "privacy@proplayturf.com",
  legal: "legal@proplayturf.com",
} as const;
