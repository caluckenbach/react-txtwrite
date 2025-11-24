export interface DocumentMetadata {
  [key: string]: unknown;
}

export interface DocumentRecord {
  id: string;
  user_id: string;
  uuid: string;
  title: string;
  content: string;
  version: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
  metadata: DocumentMetadata;
  folder_id: string;
}

export interface DocumentTab {
  id: string;
  title: string;
}

export interface DocumentVersion {
  id: string;
  version: number;
  title: string;
  content: string;
  timestamp: string;
}

export interface RestoredDocumentPayload {
  title: string;
  content: string;
  version: number;
  restored_from: string;
  restored_at: string;
}

export interface SelectionState {
  start: number;
  end: number;
  active: boolean;
  text: string;
}

export interface CursorPosition {
  line: number;
  column: number;
  charIndex: number;
}

export interface FileSystemFolder {
  id: string;
  name: string;
  type: "folder";
  children: FileSystemItem[];
}

export interface FileSystemFile {
  id: string;
  name: string;
  type: "markdown" | "file";
  documentRef?: string;
}

export type FileSystemItem = FileSystemFolder | FileSystemFile;

export type FileSystemMapEntry =
  | (FileSystemFolder & { parentId: string | null })
  | (FileSystemFile & { parentId: string | null });
