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
  phone: text(40),
  email: Joi.string().trim().lowercase().email({ tlds: false }).allow("").max(160).default(""),
  address: text(400),
  notes: text(4000),
});
export type ClientInput = {
  name: string;
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
  title: Joi.string().trim().min(3).max(300).required(),
  court: text(200),
  caseType: text(120),
  status: Joi.string().trim().max(40).default("Active"),
  nextHearing: Joi.date().iso().allow(null, "").default(null),
  /** Internal. Never leaves the chamber. */
  notes: text(8000),
});
export type CaseInput = {
  clientId: number;
  title: string;
  court: string;
  caseType: string;
  status: string;
  nextHearing: Date | null;
  notes: string;
};

/** Editing leaves out clientId: a case does not move between clients. */
export const caseEditSchema = caseSchema.fork(["clientId"], (s) => s.forbidden());

export const hearingSchema = Joi.object({
  hearingDate: Joi.date().iso().required(),
  purpose: text(300),
  /** Also moves the case's "next hearing" if this date is later than today. */
  setAsNext: Joi.boolean().default(true),
});
export type HearingInput = { hearingDate: Date; purpose: string; setAsNext: boolean };

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
