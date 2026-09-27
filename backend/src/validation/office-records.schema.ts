import Joi from "joi";

/** Trimmed, optional, and never null — the columns all default to "". */
const text = (max: number) => Joi.string().trim().allow("").max(max).default("");

export const clientListSchema = Joi.object({
  q: Joi.string().trim().allow("").max(200).default(""),
  limit: Joi.number().integer().min(1).max(200).default(100),
  offset: Joi.number().integer().min(0).default(0),
});
export type ClientListQuery = { q: string; limit: number; offset: number };

export const clientSchema = Joi.object({
  name: Joi.string().trim().min(2).max(160).required(),
  /// How a person is named on the file and at the bar.
  fatherName: text(160),
  /**
   * The national identity number, kept exactly as written.
   *
   * Deliberately not validated against the 13-digit form. A chamber records
   * what the card in front of it says, and an old card, a smudged
   * photocopy and a number given over the telephone all have to go in. A
   * field that refuses the number an advocate is holding is a field that
   * gets left empty, and then the client cannot be found at all.
   */
  cnic: text(32),
  phone: text(40),
  email: Joi.string().trim().lowercase().email({ tlds: false }).allow("").max(160).default(""),
  address: text(400),
  notes: text(4000),
});
export type ClientInput = {
  name: string;
  fatherName: string;
  cnic: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

/** Switching a client's portal on or off, and whether to issue a new password. */
export const portalAccessSchema = Joi.object({
  enabled: Joi.boolean().required(),
  showFees: Joi.boolean().default(false),
  /** Issues a fresh password, shown once. Implied when switching on for the first time. */
  resetPassword: Joi.boolean().default(false),
});
export type PortalAccessInput = { enabled: boolean; showFees: boolean; resetPassword: boolean };

export const caseSchema = Joi.object({
  clientId: Joi.number().integer().min(1).required(),
  /** Written as the parties — "X vs Y" — which is how it is called in court. */
  title: Joi.string().trim().min(3).max(300).required(),
  /** The number the court knows it by. Free text: every forum numbers differently. */
  caseNo: text(96),
  court: text(200),
  caseType: text(120),
  /** The provisions the matter turns on. */
  sections: text(300),
  /** For a criminal matter: the FIR number, the police station, the date. */
  firDetails: text(300),
  /** Petitioner, respondent, complainant, accused — the word changes with the forum. */
  ourSide: text(96),
  opposingParty: text(300),
  judge: text(200),
  /**
   * Where the matter has reached. Kept apart from status on purpose: a case
   * may be Active and at evidence, or Active and reserved, and collapsing
   * the two loses the answer to "where has it got to".
   */
  stage: text(96),
  status: Joi.string().trim().max(40).default("Active"),
  filedOn: Joi.date().iso().allow(null, "").default(null),
  nextHearing: Joi.date().iso().allow(null, "").default(null),
  /** Who in the chamber is carrying it. */
  assignedTo: text(120),
  /** Internal. Never leaves the chamber. */
  notes: text(8000),
});
export type CaseInput = {
  clientId: number;
  title: string;
  caseNo: string;
  court: string;
  caseType: string;
  sections: string;
  firDetails: string;
  ourSide: string;
  opposingParty: string;
  judge: string;
  stage: string;
  status: string;
  filedOn: Date | null;
  nextHearing: Date | null;
  assignedTo: string;
  notes: string;
};

/** Editing leaves out clientId: a case does not move between clients. */
export const caseEditSchema = caseSchema.fork(["clientId"], (s) => s.forbidden());

export const hearingSchema = Joi.object({
  hearingDate: Joi.date().iso().required(),
  purpose: text(300),
  /** The chamber's own note of what happened. Internal. */
  outcome: text(4000),
  /** What the court wrote, copied from the order sheet. Internal. */
  orderSheet: text(8000),
  /** Who appeared. Often not the advocate whose file it is. */
  attendedBy: text(120),
  /**
   * The date given from the bench.
   *
   * Supplying it moves the case's next hearing, which is what lets a
   * hearing be entered once — on the way out of court — and leave the cause
   * list correct. `setAsNext` remains for the older behaviour of using the
   * hearing's own date when no next date is given.
   */
  nextDate: Joi.date().iso().allow(null, "").default(null),
  setAsNext: Joi.boolean().default(true),
});
export type HearingInput = {
  hearingDate: Date;
  purpose: string;
  outcome: string;
  orderSheet: string;
  attendedBy: string;
  nextDate: Date | null;
  setAsNext: boolean;
};

export const feeSchema = Joi.object({
  kind: Joi.string().valid("agreed", "received").required(),
  amount: Joi.number().min(0).max(999_999_999).required(),
  entryDate: Joi.date().iso().default(() => new Date()),
  note: text(300),
});
export type FeeInput = { kind: string; amount: number; entryDate: Date; note: string };

export const documentMetaSchema = Joi.object({
  title: Joi.string().trim().min(1).max(300).required(),
  /** Private unless this is deliberately set. */
  clientVisible: Joi.boolean().default(false),
});

export const documentShareSchema = Joi.object({
  clientVisible: Joi.boolean().required(),
});

export const enquiryListSchema = Joi.object({
  unreadOnly: Joi.boolean().default(false),
  limit: Joi.number().integer().min(1).max(200).default(100),
});
export type EnquiryListQuery = { unreadOnly: boolean; limit: number };

export const enquiryReadSchema = Joi.object({ read: Joi.boolean().required() });
