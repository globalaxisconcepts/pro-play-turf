import { isSafeHttpUrl } from "@/lib/urls";
import { ProofUploadUnavailableError } from "./errors";

export interface ProofUpload {
  matchId: string;
  userId: string;
  filename: string;
  contentType: string;
  data: ArrayBuffer;
}

/**
 * Where match evidence lives. Screenshot upload needs object storage (Vercel
 * Blob / S3 / R2); until one is provisioned the app runs on stream and VOD
 * links, which need no storage at all.
 *
 * Same boundary discipline as PaymentProvider: nothing outside this module may
 * import a concrete storage SDK, so turning uploads on is a one-line swap in
 * services.ts with no other code change.
 */
export interface ProofStorage {
  readonly capabilities: { uploads: boolean };
  put(input: ProofUpload): Promise<{ url: string }>;
}

/** The default: link-only proof. Fails loudly rather than pretending to store. */
export class UnavailableProofStorage implements ProofStorage {
  readonly capabilities = { uploads: false };

  async put(): Promise<{ url: string }> {
    throw new ProofUploadUnavailableError();
  }
}

/**
 * Only http(s) links are acceptable evidence. Blocks `javascript:` and `data:`
 * URLs, which would otherwise be rendered as clickable proof links. Shares one
 * implementation with the render-time check so the two can't drift apart.
 */
export const isSafeProofUrl = isSafeHttpUrl;
