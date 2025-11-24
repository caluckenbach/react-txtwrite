interface CursorData {
  documentId: string;
  position: number;
  timestamp: number;
  [key: string]: unknown;
}

interface ScrollData {
  documentId: string;
  scrollPercentage: number;
  timestamp: number;
}

const CURSOR_STORAGE_KEY = "lastCursorPosition";
const SCROLL_STORAGE_KEY = "lastScrollPosition";

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Error parsing persisted editor state:", error);
    return null;
  }
};

export const saveCursorPosition = (
  documentId: string,
  position: number,
  additionalData: Record<string, unknown> = {},
): void => {
  if (!documentId || position === undefined) return;

  try {
    const data: CursorData = {
      documentId,
      position,
      timestamp: Date.now(),
      ...additionalData,
    };

    localStorage.setItem(CURSOR_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving cursor position:", error);
  }
};

export const getCursorPosition = (
  documentId?: string | null,
): CursorData | null => {
  try {
    const savedPositionData = safeParse<CursorData>(
      localStorage.getItem(CURSOR_STORAGE_KEY),
    );

    if (!savedPositionData) return null;
    if (documentId && savedPositionData.documentId !== documentId) return null;

    return savedPositionData;
  } catch (error) {
    console.error("Error retrieving cursor position:", error);
    return null;
  }
};

export const clearCursorPosition = (): void => {
  try {
    localStorage.removeItem(CURSOR_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing cursor position:", error);
  }
};

export const saveScrollPosition = (
  documentId: string,
  scrollPercentage: number,
): void => {
  if (!documentId || scrollPercentage === undefined) return;

  try {
    const data: ScrollData = {
      documentId,
      scrollPercentage,
      timestamp: Date.now(),
    };

    localStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving scroll position:", error);
  }
};

export const getScrollPosition = (
  documentId?: string | null,
): ScrollData | null => {
  try {
    const savedPositionData = safeParse<ScrollData>(
      localStorage.getItem(SCROLL_STORAGE_KEY),
    );

    if (!savedPositionData) return null;
    if (documentId && savedPositionData.documentId !== documentId) return null;

    return savedPositionData;
  } catch (error) {
    console.error("Error retrieving scroll position:", error);
    return null;
  }
};

export const saveEditorState = (
  documentId: string,
  cursorPosition: number,
  scrollPercentage?: number,
): void => {
  if (!documentId) return;

  try {
    saveCursorPosition(documentId, cursorPosition);

    if (scrollPercentage !== undefined) {
      saveScrollPosition(documentId, scrollPercentage);
    }
  } catch (error) {
    console.error("Error saving editor state:", error);
  }
};
