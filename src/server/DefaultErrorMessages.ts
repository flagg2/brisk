import { DefaultMessage } from "./Brisk";

export type ErrorMessages<Message> = {
   unauthorized: Message;
   forbidden: Message;
   notFound: Message;
   methodNotAllowed: Message;
   conflict: Message;
   internalServerError: Message;
   notImplemented: Message;
   tooManyRequests: Message;
};

export const defaultErrorMessages: ErrorMessages<DefaultMessage> = {
   unauthorized: {
      sk: "K tomuto obsahu majú prístup iba prihlasení použivatelia s dostatočnými právami.",
      en: "Only logged in users with sufficient permissions can access this content.",
   },
   forbidden: {
      sk: "K tomuto obsahu nemáte dostatočné práva.",
      en: "You do not have sufficient permissions to access this content.",
   },
   notFound: { sk: "Požadovaný obsah nebol nájdený.", en: "The requested content was not found." },
   methodNotAllowed: { sk: "Táto HTTP metóda nie je povolená.", en: "This HTTP method is not allowed." },
   conflict: {
      sk: "Požadovaná operácia je v konflikte s existujúcim stavom.",
      en: "The requested operation is in conflict with the existing state.",
   },
   internalServerError: { sk: "Nastala neočakávaná chyba.", en: "An unexpected error has occurred." },
   notImplemented: { sk: "Táto funkcionalita nie je implementovaná.", en: "This feature is not implemented." },
   tooManyRequests: {
      sk: "Príliš veľa požiadaviek. Prosím, skúste to znova neskôr.",
      en: "Too many requests. Please try again later.",
   },
};
