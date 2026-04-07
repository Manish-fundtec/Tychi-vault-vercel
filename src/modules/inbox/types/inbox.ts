export type InboxSource = "IBKR" | "DBS" | "Manual";
export type InboxChannel = "EMAIL" | "CRON" | "UPLOAD" | "API";
export type InboxStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED" | "PENDING_CONFIRMATION";

export interface InboxFile {
  id: string;
  fileName: string;
  /** From inbox_raw_files.file_type (XML, CSV, PDF, …) */
  fileType?: string;
  source: InboxSource | string;
  channel: InboxChannel | string;
  uploadedAt: string;
  status: InboxStatus;
  recordCount: number;
  /** Full s3:// URI when API provides it */
  s3Uri?: string | null;
  /** vault_accounts.email_inbox_address when account_id is set */
  inboxEmail?: string | null;
}