'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DocumentTabs from '@/components/documents/DocumentTabs';
import CodeMirrorEditor from '@/components/editor/CodeMirrorEditor';
import MarkdownPreview from '@/components/preview/MarkdownPreview';
import StatusBar from '@/components/editor/StatusBar';
import useDocuments from '@/hooks/useDocuments';

export default function DashboardContent() {
  // Text state with a default that will be replaced once documents load
  const [markdownText, setMarkdownText] = useState('# Loading...');
  const [editStatus, setEditStatus] = useState('saved'); // 'editing' or 'saved'
  const [activeView, setActiveView] = useState('editor'); // 'editor' or 'preview' for mobile view switching
  const [isMobile, setIsMobile] = useState(false);
  const [notification, setNotification] = useState(null);

  // Add state to track if editor is ready to accept input
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Add state for preview visibility
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  // Get theme for CodeMirror styling
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Refs for scroll sync
  const previewRef = useRef(null);
  const editorViewRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const debounceTextChangeRef = useRef(null);
  const textUpdateInProgressRef = useRef(false);

  // Scroll sync state
  const [isEditorScrolling, setIsEditorScrolling] = useState(false);
  const [isPreviewScrolling, setIsPreviewScrolling] = useState(false);

  // Documents management - use our updated hook
  const {
    documents,
    activeDocumentId,
    documentTabs,
    createNewDocument,
    handleDocumentChange,
    deleteDocument,
    closeDocumentTab,
    startEditingTitle,
    saveEditedTitle,
    editingTitleId,
    editingTitleValue,
    setEditingTitleValue,
    titleInputRef,
    handleTitleKeyDown,
    saveDocumentToLocalStorage,
    saveNewDocumentVersion,
    getVersions,
    restoreVersion
  } = useDocuments(markdownText, setMarkdownText);

  // Function to toggle preview visibility
  const togglePreview = useCallback(() => {
    setIsPreviewVisible(prev => !prev);
    // Optionally save preference to localStorage
    localStorage.setItem('previewVisible', (!isPreviewVisible).toString());
  }, [isPreviewVisible]);

  // Load preview visibility preference on init
  useEffect(() => {
    const savedPreference = localStorage.getItem('previewVisible');
    if (savedPreference !== null) {
      setIsPreviewVisible(savedPreference === 'true');
    }
  }, []);

  // Toggle between editor and preview on mobile
  const toggleView = () => {
    setActiveView(activeView === 'editor' ? 'preview' : 'editor');
  };

  // Calculate the container height to account for the mobile toolbar
  const getContentHeight = () => {
    if (isMobile) {
      // Subtract additional space for the bottom toolbar (56px height + 16px margin)
      return 'h-[calc(100%-60px-20px)]';
    }
    return 'h-[calc(100%-120px)]';
  };

  // Calculate editor width based on preview visibility
  const getEditorWidth = () => {
    if (isMobile) return 'w-full'; // On mobile, always full width
    return isPreviewVisible ? 'w-1/2' : 'w-full'; // On desktop, conditional width
  };


  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);

      // On mobile, default to editor view when switching from desktop to mobile
      if (isMobileView && !isMobile) {
        setActiveView('editor');
      }
    };

    // Initial check
    checkMobile();

    // Add listener for window resize
    window.addEventListener('resize', checkMobile);

    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);

  // Expose versioning functions to DashboardLayout
  useEffect(() => {
    if (activeDocumentId && getVersions && restoreVersion) {
      window.dispatchEvent(new CustomEvent('version-functions-ready', {
        detail: {
          getVersions,
          restoreVersion
        }
      }));
    }
  }, [documents, activeDocumentId, getVersions, restoreVersion]);

  // Listen for save document version events (from save button click)
  useEffect(() => {
    const handleSaveVersion = () => {
      if (saveDocumentToLocalStorage && saveNewDocumentVersion) {
        // First ensure the latest content is saved
        saveDocumentToLocalStorage(markdownText);

        // Then create a new version
        saveNewDocumentVersion();
      }
    };

    // Listen for notification events
    const handleNotification = (event) => {
      setNotification(event.detail.message);

      // Clear the notification after a few seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    };

    window.addEventListener('save-document-version', handleSaveVersion);
    window.addEventListener('show-notification', handleNotification);

    return () => {
      window.removeEventListener('save-document-version', handleSaveVersion);
      window.removeEventListener('show-notification', handleNotification);
    };
  }, [markdownText, saveDocumentToLocalStorage, saveNewDocumentVersion]);

  // Handle editor scroll events - memoized with useCallback
  const handleEditorScroll = useCallback((percentage) => {
    if (!previewRef.current || isPreviewScrolling) return;

    // Set flag to prevent recursive scroll events
    setIsEditorScrolling(true);

    // Apply scroll to preview
    const previewElement = previewRef.current;
    const previewScrollHeight = previewElement.scrollHeight - previewElement.clientHeight;
    previewElement.scrollTop = previewScrollHeight * percentage;

    // Reset the flag after a short delay
    setTimeout(() => {
      setIsEditorScrolling(false);
    }, 20);
  }, [isPreviewScrolling]);

  // Handle preview scroll events - memoized with useCallback
  const handlePreviewScroll = useCallback(() => {
    if (!previewRef.current || isEditorScrolling) return;

    // Set flag to prevent recursive scroll events
    setIsPreviewScrolling(true);

    // Calculate scroll percentage
    const { scrollTop, scrollHeight, clientHeight } = previewRef.current;
    const percentage = scrollTop / (scrollHeight - clientHeight || 1);

    // Apply scroll to editor using CodeMirror's scrollToPercentage method
    if (editorViewRef.current && typeof editorViewRef.current.scrollToPercentage === 'function') {
      editorViewRef.current.scrollToPercentage(percentage);
    }

    // Reset the flag after a short delay
    setTimeout(() => {
      setIsPreviewScrolling(false);
    }, 20);
  }, [isEditorScrolling]);

  // Track if user is actively typing
  const isTypingRef = useRef(false);
  const lastTextUpdateRef = useRef(Date.now());

  // Handle text changes from the editor - optimized for text entry
  const handleTextChange = useCallback((newText) => {
    if (newText !== markdownText) {
      // 1. Immediately update the state for UI sync
      setMarkdownText(newText);

      // 2. Set editing status
      setEditStatus('editing');

      // 3. Save to localStorage IMMEDIATELY on each keystroke
      saveDocumentToLocalStorage(newText);

      // 4. Handle mobile view updates if needed
      if (isMobile && activeView === 'editor') {
        setTimeout(() => {
          if (activeView === 'editor') {
            setActiveView('preview');
          }
        }, 800);
      }

      // 5. Set a timeout to update the saved status, but don't delay the actual saving
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        setEditStatus('saved');
      }, 500);
    }
  }, [markdownText, isMobile, activeView, saveDocumentToLocalStorage]);

  // Get cursor position information for status bar
  const getLineAndColumn = useCallback(() => {
    // If no editor view is available, return defaults
    if (!editorViewRef.current) return { line: 1, column: 1 };

    try {
      const state = editorViewRef.current.state;
      const pos = state.selection.main.head;
      const line = state.doc.lineAt(pos);

      return {
        line: line.number,
        column: pos - line.from + 1
      };
    } catch (error) {
      console.error('Error getting cursor position:', error);
      return { line: 1, column: 1 };
    }
  }, []);

  // Mark editor as ready
  const handleEditorReady = useCallback(() => {
    setIsEditorReady(true);
  }, []);

  // Listen for sidebar document change events
  useEffect(() => {
    const handleSidebarDocumentChange = (event) => {
      const { documentId } = event.detail;
      if (documentId && documentId !== activeDocumentId) {
        handleDocumentChange(documentId);
      }
    };

    window.addEventListener('sidebar-document-changed', handleSidebarDocumentChange);
    return () => {
      window.removeEventListener('sidebar-document-changed', handleSidebarDocumentChange);
    };
  }, [activeDocumentId, handleDocumentChange]);

  // Listen for file title change events
  useEffect(() => {
    const handleFileTitleChanged = (event) => {
      const { documentId, title } = event.detail;

      // Check if this is the active document using activeDocumentId
      if (documentId && documentId === activeDocumentId) {
        // We can't set document title directly here since it's in the parent component
        // Instead, dispatch an event for DashboardLayout to handle
        window.dispatchEvent(new CustomEvent('update-document-title', {
          detail: { documentId, title }
        }));
      }
    };

    window.addEventListener('file-title-changed', handleFileTitleChanged);

    return () => {
      window.removeEventListener('file-title-changed', handleFileTitleChanged);
    };
  }, [activeDocumentId]);

  // Clean up timeouts on unmount  
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (debounceTextChangeRef.current) {
        clearTimeout(debounceTextChangeRef.current);
      }
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex flex-col bg-neutral-100 dark:bg-neutral-900 h-full">
          {/* Document tabs */}
          <div className="w-full hidden md:flex">
            <DocumentTabs
              documents={documents}
              documentTabs={documentTabs}
              activeDocumentId={activeDocumentId}
              handleDocumentChange={handleDocumentChange}
              closeDocumentTab={closeDocumentTab}
              createNewDocument={createNewDocument}
              editingTitleId={editingTitleId}
              editingTitleValue={editingTitleValue}
              setEditingTitleValue={setEditingTitleValue}
              startEditingTitle={startEditingTitle}
              saveEditedTitle={saveEditedTitle}
              titleInputRef={titleInputRef}
              handleTitleKeyDown={handleTitleKeyDown}
            />
          </div>

          {/* Main content area - responsive layout with improved mobile view */}
          <div className={`flex md:flex-row flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${getContentHeight()} md:h-[calc(100%-135px)]`}>
            {/* CodeMirror Editor - conditional display based on active view */}
            <div
              className={`${activeView === 'editor' || !isMobile ? 'flex' : 'hidden'} 
                ${getEditorWidth()} h-full relative overflow-hidden`}
            >
              <CodeMirrorEditor
                markdownText={markdownText}
                onTextChange={handleTextChange}
                onScroll={handleEditorScroll}
                saveDocumentToLocalStorage={saveDocumentToLocalStorage}
                setEditStatus={setEditStatus}
                isDarkMode={isDarkMode}
                editorViewRef={editorViewRef}
                isMobile={isMobile}
                isPreviewVisible={isPreviewVisible}
                togglePreview={togglePreview}
                onEditorReady={handleEditorReady}
              />
            </div>

            {/* Preview Pane - conditional display based on active view */}
            {(isPreviewVisible || (isMobile && activeView === 'preview')) && (
              <div
                className={`${activeView === 'preview' || !isMobile ? 'flex' : 'hidden'} 
                  w-full md:w-1/2 h-full relative overflow-hidden`}
              >
                <MarkdownPreview
                  markdownText={markdownText}
                  previewRef={previewRef}
                  handlePreviewScroll={handlePreviewScroll}
                  isMobile={isMobile}
                />
              </div>
            )}
          </div>

          {/* Bottom Status Bar */}
          <StatusBar
            markdownText={markdownText}
            editStatus={editStatus}
            getLineAndColumn={getLineAndColumn}
          />

          {/* Mobile Floating Action Button to toggle between editor/preview */}
          {isMobile && (
            <button
              onClick={toggleView}
              className="md:hidden fixed bottom-[16vh] right-6 z-30 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 text-white p-3 rounded-md"
              aria-label={`Switch to ${activeView === 'editor' ? 'preview' : 'editor'}`}
            >
              {activeView === 'editor' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#606060">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#606060">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-4 right-4 bg-green-100 dark:bg-neutral-900 text-green-800 dark:text-green-600 px-8 py-4 rounded shadow-md z-50 transition-opacity duration-300 border border-neutral-800">
          {notification}
        </div>
      )}
    </DashboardLayout>
  );
}