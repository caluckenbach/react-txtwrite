import type { DocumentRecord, FileSystemItem } from "../types/documents.ts";

export const EVENT_TYPES = {
  DOCUMENT_CREATED: "document-created",
  DOCUMENT_DELETED: "document-deleted",
  DOCUMENT_TITLE_CHANGED: "document-title-changed",
  DOCUMENT_CONTENT_CHANGED: "document-content-changed",
  DOCUMENT_SWITCHED: "document-switched",
  FILE_SYSTEM_UPDATED: "file-system-updated",
  DOCUMENTS_UPDATED: "documents-updated",
} as const;

type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
type EventDetail = Record<string, unknown>;

const DOCUMENTS_KEY = "documents";
const LAST_ACTIVE_KEY = "lastActiveDocument";
const FILE_SYSTEM_KEY = "txtwFileSystem";

const parseDocuments = (): DocumentRecord[] => {
  const docsString = localStorage.getItem(DOCUMENTS_KEY);
  if (!docsString) return [];
  try {
    return JSON.parse(docsString) as DocumentRecord[];
  } catch (error) {
    console.error("Error parsing documents from localStorage:", error);
    return [];
  }
};

const writeDocuments = (documents: DocumentRecord[]): void => {
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
};

export const createEvent = <T extends EventDetail>(
  eventType: EventType | string,
  detail: T,
): CustomEvent<T> => {
  return new CustomEvent<T>(eventType, { detail });
};

export const dispatchDocumentEvent = <T extends EventDetail>(
  eventType: EventType | string,
  detail = {} as T,
): void => {
  globalThis.dispatchEvent(createEvent(eventType, detail));
};

export const synchronizeDocumentTitle = (
  documentId: string,
  title: string,
): void => {
  if (!documentId || !title) return;

  try {
    const docs = parseDocuments();
    if (docs.length) {
      const updatedDocs = docs.map((doc) =>
        doc.id === documentId
          ? {
            ...doc,
            title,
            updated_at: new Date().toISOString(),
          }
          : doc
      );
      writeDocuments(updatedDocs);
    }

    const fileSystemString = localStorage.getItem(FILE_SYSTEM_KEY);
    if (fileSystemString) {
      const fileSystem = JSON.parse(fileSystemString) as FileSystemItem[];

      const updateFileName = (items: FileSystemItem[]): FileSystemItem[] => {
        return items.map((item) => {
          if (item.type !== "folder" && "documentRef" in item) {
            const fileName = title.endsWith(".md") ? title : `${title}.md`;
            if (item.documentRef === documentId) {
              return { ...item, name: fileName };
            }
          }

          if (item.type === "folder") {
            return {
              ...item,
              children: updateFileName(item.children),
            };
          }

          return item;
        });
      };

      const updatedFileSystem = updateFileName(fileSystem);
      localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(updatedFileSystem));
    }

    dispatchDocumentEvent(EVENT_TYPES.DOCUMENT_TITLE_CHANGED, {
      documentId,
      title,
    });
    dispatchDocumentEvent(EVENT_TYPES.FILE_SYSTEM_UPDATED);
  } catch (error) {
    console.error("Error synchronizing document title:", error);
  }
};

export const handleDocumentDeletion = (documentId: string): void => {
  if (!documentId) return;

  try {
    const docs = parseDocuments();
    if (docs.length) {
      const updatedDocs = docs.filter((doc) => doc.id !== documentId);
      writeDocuments(updatedDocs);
    }

    dispatchDocumentEvent(EVENT_TYPES.DOCUMENT_DELETED, { documentId });
    dispatchDocumentEvent(EVENT_TYPES.DOCUMENTS_UPDATED);
  } catch (error) {
    console.error("Error handling document deletion:", error);
  }
};

export const getActiveDocument = (): DocumentRecord | null => {
  try {
    const activeDocumentId = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!activeDocumentId) return null;

    const docs = parseDocuments();
    return docs.find((doc) => doc.id === activeDocumentId) ?? null;
  } catch (error) {
    console.error("Error getting active document:", error);
    return null;
  }
};

export const switchToDocument = (documentId: string): void => {
  if (!documentId) return;

  localStorage.setItem(LAST_ACTIVE_KEY, documentId);
  dispatchDocumentEvent(EVENT_TYPES.DOCUMENT_SWITCHED, { documentId });
};

export const getDocumentById = (
  documentId: string,
): DocumentRecord | null => {
  if (!documentId) return null;

  try {
    const docs = parseDocuments();
    return docs.find((doc) => doc.id === documentId) ?? null;
  } catch (error) {
    console.error("Error getting document by ID:", error);
    return null;
  }
};
