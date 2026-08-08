/** No such Pass. */
export class CardNotFoundError extends Error {
  constructor(instanceId: string) {
    super(`Pass ${instanceId} not found.`);
    this.name = "CardNotFoundError";
  }
}

/** The Pass belongs to someone else. */
export class CardNotOwnedError extends Error {
  constructor(instanceId: string) {
    super(`You don't own Pass ${instanceId}.`);
    this.name = "CardNotOwnedError";
  }
}

/** Only an OWNED Pass can be burned — not one already burned or listed. */
export class CardNotSurrenderableError extends Error {
  constructor(instanceId: string) {
    super(`Pass ${instanceId} can't be surrendered in its current state.`);
    this.name = "CardNotSurrenderableError";
  }
}

/** Minting would exceed the card type's supply cap. */
export class SupplyExhaustedError extends Error {
  constructor(tier: string) {
    super(`No ${tier} Passes remain to mint.`);
    this.name = "SupplyExhaustedError";
  }
}

/** The tier has no Pass design, so nothing can be minted for it. */
export class NoCardTypeError extends Error {
  constructor(tier: string) {
    super(`No Pass type defined for tier ${tier}.`);
    this.name = "NoCardTypeError";
  }
}

/** The listing is gone — sold, cancelled, or never active. */
export class ListingNotAvailableError extends Error {
  constructor(listingId: string) {
    super(`Listing ${listingId} is no longer available.`);
    this.name = "ListingNotAvailableError";
  }
}

/** You can't buy your own Pass. */
export class SelfPurchaseError extends Error {
  constructor() {
    super("You can't buy your own Pass.");
    this.name = "SelfPurchaseError";
  }
}
