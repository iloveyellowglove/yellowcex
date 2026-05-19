export type DocumentType = 'passport' | 'drivers_license' | 'national_id';
export type KycDocumentStatus = 'pending' | 'approved' | 'rejected';

export interface KycDocument {
  id: string;
  user_id: string;
  document_type: DocumentType;
  image_url: string;
  status: KycDocumentStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_notes: string | null;
}

export interface KycSubmission {
  document_type: DocumentType;
  image_file: File;
}
