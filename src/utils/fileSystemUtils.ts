import type {
  DocumentRecord,
  FileSystemFile,
  FileSystemFolder,
  FileSystemItem,
  FileSystemMapEntry,
} from "../types/documents.ts";

export const FILE_SYSTEM_KEY = "txtwFileSystem";

export const generateUniqueId = (type: "file" | "folder"): string => {
  return type === "folder"
    ? `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    : crypto.randomUUID();
};

const parseFileSystem = (
  value: string | null,
): FileSystemItem[] => {
  if (!value) return [];
  try {
    return JSON.parse(value) as FileSystemItem[];
  } catch (error) {
    console.error("Error parsing file system from localStorage:", error);
    return [];
  }
};

export const loadFileSystem = (): FileSystemItem[] => {
  const savedFileSystem = localStorage.getItem(FILE_SYSTEM_KEY);
  return parseFileSystem(savedFileSystem);
};

export const saveFileSystem = (fileSystem: FileSystemItem[]): void => {
  try {
    localStorage.setItem(FILE_SYSTEM_KEY, JSON.stringify(fileSystem));
  } catch (error) {
    console.error("Error saving file system:", error);
  }
};

export const initializeFileSystem = (): FileSystemItem[] => {
  const initialFileSystem: FileSystemFolder[] = [
    {
      id: "folder-root",
      name: "My Documents",
      type: "folder",
      children: [],
    },
  ];

  saveFileSystem(initialFileSystem);
  return initialFileSystem;
};

export const generateFileMap = (
  fileSystem: FileSystemItem[],
): Record<string, FileSystemMapEntry> => {
  const map: Record<string, FileSystemMapEntry> = {};

  const addToMap = (
    items: FileSystemItem[],
    parentId: string | null,
  ) => {
    items.forEach((item) => {
      if (item.type === "folder") {
        const folderEntry: FileSystemMapEntry = {
          ...item,
          parentId,
        };
        map[item.id] = folderEntry;
        if (item.children?.length) {
          addToMap(item.children, item.id);
        }
      } else {
        map[item.id] = { ...item, parentId };
      }
    });
  };

  addToMap(fileSystem, null);
  return map;
};

export const findItemById = (
  fileSystem: FileSystemItem[],
  itemId: string,
): FileSystemMapEntry | null => {
  const map = generateFileMap(fileSystem);
  return map[itemId] ?? null;
};

export const addItemToFolder = (
  fileSystem: FileSystemItem[],
  parentId: string | null,
  newItem: FileSystemItem,
): FileSystemItem[] => {
  if (!parentId) {
    return [...fileSystem, newItem];
  }

  return fileSystem.map((item) => {
    if (item.id === parentId && item.type === "folder") {
      return {
        ...item,
        children: [...(item.children ?? []), newItem],
      };
    }

    if (item.type === "folder" && item.children) {
      return {
        ...item,
        children: addItemToFolder(item.children, parentId, newItem),
      };
    }

    return item;
  });
};

export const removeItemFromFileSystem = (
  fileSystem: FileSystemItem[],
  itemId: string,
): FileSystemItem[] => {
  const rootFiltered = fileSystem.filter((item) => item.id !== itemId);
  if (rootFiltered.length < fileSystem.length) {
    return rootFiltered;
  }

  return fileSystem.map((item) => {
    if (item.type === "folder" && item.children) {
      const filteredChildren = item.children.filter((child) =>
        child.id !== itemId
      );

      if (filteredChildren.length < item.children.length) {
        return { ...item, children: filteredChildren };
      }

      return {
        ...item,
        children: removeItemFromFileSystem(item.children, itemId),
      };
    }
    return item;
  });
};

export const updateItemInFileSystem = (
  fileSystem: FileSystemItem[],
  itemId: string,
  updateFn: (item: FileSystemItem) => FileSystemItem,
): FileSystemItem[] => {
  return fileSystem.map((item) => {
    if (item.id === itemId) {
      return updateFn(item);
    }

    if (item.type === "folder" && item.children) {
      return {
        ...item,
        children: updateItemInFileSystem(item.children, itemId, updateFn),
      };
    }

    return item;
  });
};

export const moveItemInFileSystem = (
  fileSystem: FileSystemItem[],
  itemId: string,
  targetId: string | null,
  asChild = false,
): FileSystemItem[] => {
  const fileMap = generateFileMap(fileSystem);
  const itemToMoveEntry = fileMap[itemId];
  if (!itemToMoveEntry) return fileSystem;

  const stripParentMetadata = (
    entry: FileSystemMapEntry,
  ): FileSystemItem => {
    const { parentId: _parentId, ...rest } = entry;
    return rest as FileSystemItem;
  };

  const itemToMove = stripParentMetadata(itemToMoveEntry);

  let updatedFileSystem = removeItemFromFileSystem(fileSystem, itemId);

  if (!targetId) {
    return [...updatedFileSystem, itemToMove];
  }

  const targetItem = fileMap[targetId];
  if (!targetItem) return updatedFileSystem;

  if (
    asChild &&
    targetItem.type === "folder"
  ) {
    return updateItemInFileSystem(
      updatedFileSystem,
      targetId,
      (folder) => ({
        ...folder,
        children: [
          ...((folder as FileSystemFolder).children ?? []),
          itemToMove,
        ],
      }),
    );
  }

  const targetParentId = targetItem.parentId;
  if (targetParentId) {
    return updateItemInFileSystem(
      updatedFileSystem,
      targetParentId,
      (parent) => {
        if (parent.type !== "folder" || !parent.children) {
          return parent;
        }
        const newChildren = [...parent.children];
        const targetIndex = newChildren.findIndex((child) =>
          child.id === targetId
        );
        if (targetIndex === -1) return parent;

        newChildren.splice(targetIndex + 1, 0, itemToMove);

        return {
          ...parent,
          children: newChildren,
        };
      },
    );
  }

  const targetIndex = updatedFileSystem.findIndex((item) =>
    item.id === targetId
  );
  if (targetIndex === -1) {
    return updatedFileSystem;
  }

  updatedFileSystem.splice(targetIndex + 1, 0, itemToMove);
  return updatedFileSystem;
};

export const getPathToItem = (
  fileMap: Record<string, FileSystemMapEntry>,
  itemId: string,
): string[] => {
  const path: string[] = [];
  let currentId: string | null = itemId;

  while (typeof currentId === "string") {
    const item: FileSystemMapEntry | undefined = fileMap[currentId];
    if (!item?.parentId) break;
    path.unshift(item.parentId);
    currentId = item.parentId;
  }

  return path;
};

const createDocumentRecord = (
  id: string,
  title: string,
  parentId: string | null,
): DocumentRecord => {
  const now = new Date().toISOString();
  return {
    id,
    user_id: "current-user",
    uuid: crypto.randomUUID(),
    title,
    content: `# ${title}\n\nStart typing here...`,
    version: 1,
    is_published: false,
    created_at: now,
    updated_at: now,
    last_synced_at: now,
    metadata: {},
    folder_id: parentId ?? "root",
  };
};

export const createDocumentFile = (
  parentId: string | null = null,
  fileName = "New File",
): { fileObj: FileSystemFile; document: DocumentRecord } => {
  const id = generateUniqueId("file");
  const normalizedFileName = fileName.endsWith(".md")
    ? fileName
    : `${fileName}.md`;
  const baseName = normalizedFileName.slice(0, -3);

  const fileObj: FileSystemFile = {
    id,
    name: normalizedFileName,
    type: "markdown",
    documentRef: id,
  };

  const document = createDocumentRecord(id, baseName, parentId);

  const docsString = localStorage.getItem("documents");
  const docs = docsString ? JSON.parse(docsString) as DocumentRecord[] : [];
  docs.push(document);
  localStorage.setItem("documents", JSON.stringify(docs));

  let fileSystem = loadFileSystem();
  fileSystem = addItemToFolder(fileSystem, parentId, fileObj);
  saveFileSystem(fileSystem);

  return { fileObj, document };
};

export const createFolder = (
  parentId: string | null = null,
  folderName = "New Folder",
): FileSystemFolder => {
  const folder: FileSystemFolder = {
    id: generateUniqueId("folder"),
    name: folderName,
    type: "folder",
    children: [],
  };

  let fileSystem = loadFileSystem();
  fileSystem = addItemToFolder(fileSystem, parentId, folder);
  saveFileSystem(fileSystem);

  return folder;
};

export const syncDocumentsWithFileSystem = (
  documents: DocumentRecord[],
): FileSystemItem[] => {
  if (!documents.length) return loadFileSystem();

  let fileSystem = loadFileSystem();
  if (fileSystem.length === 0) {
    fileSystem = initializeFileSystem();
  }

  const fileMap = generateFileMap(fileSystem);
  const fileIds = new Set(
    Object.keys(fileMap).filter((id) => fileMap[id].type !== "folder"),
  );

  const missingDocs = documents.filter((doc) => !fileIds.has(doc.id));
  let updatedFileSystem = [...fileSystem];

  missingDocs.forEach((doc) => {
    const fileObj: FileSystemFile = {
      id: doc.id,
      name: `${doc.title}.md`,
      type: "markdown",
      documentRef: doc.id,
    };

    if (doc.folder_id && doc.folder_id !== "root" && fileMap[doc.folder_id]) {
      updatedFileSystem = addItemToFolder(
        updatedFileSystem,
        doc.folder_id,
        fileObj,
      );
    } else {
      updatedFileSystem.push(fileObj);
    }
  });

  if (missingDocs.length > 0) {
    saveFileSystem(updatedFileSystem);
  }

  return updatedFileSystem;
};

export const updateFileSystemForDocument = (
  fileSystem: FileSystemItem[],
  document: DocumentRecord,
): FileSystemItem[] => {
  const fileMap = generateFileMap(fileSystem);
  const existingFile = Object.values(fileMap).find(
    (item) => item.type !== "folder" && item.documentRef === document.id,
  );

  if (!existingFile) {
    const newFile: FileSystemFile = {
      id: document.id,
      name: `${document.title}.md`,
      type: "markdown",
      documentRef: document.id,
    };

    return addItemToFolder(
      fileSystem,
      document.folder_id === "root" ? null : document.folder_id,
      newFile,
    );
  }

  return updateItemInFileSystem(fileSystem, existingFile.id, (item) => ({
    ...item,
    name: `${document.title}.md`,
  }));
};
