/* global jQuery, wp, SetFieldProperty */

(function () {
  'use strict';

  const EDITOR_ID = 'gfte_field_rich_content';
  const HIDDEN_ORIGINAL_CLASS = 'gfte-hidden-original-content-setting';

  let originalHideObserver = null;
  let originalContentListenerBound = false;

  function switchMode(mode) {
    if (window.wp && wp.editor && typeof wp.editor.switchMode === 'function') {
      wp.editor.switchMode(EDITOR_ID, mode);
      return;
    }

    if (window.switchEditors && typeof window.switchEditors.go === 'function') {
      window.switchEditors.go(EDITOR_ID, mode);
    }
  }

  function bindTabSwitching() {
    // In the Gravity Forms form editor, the editor UI is injected dynamically.
    // Bind a capture-phase handler so other scripts can't accidentally swallow the click.
    document.addEventListener(
      'click',
      function (e) {
        const target = e.target;
        if (!(target instanceof Element)) {
          return;
        }

        const wrapSelector = `#wp-${EDITOR_ID}-wrap`;
        if (!target.closest(wrapSelector)) {
          return;
        }

        const switcher = target.closest('.switch-tmce, .switch-html');
        if (!switcher) {
          return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();

        const mode = switcher.classList.contains('switch-tmce') ? 'tmce' : 'html';
        switchMode(mode);
      },
      true
    );
  }

  function getEditorTextarea() {
    return document.getElementById(EDITOR_ID);
  }

  function setFieldContent(html) {
    // Keep the original GF textarea in sync so any GF behaviors that still write
    // to it (merge tags, merge-tag-support, etc) operate on the same source.
    const original = document.getElementById('field_content');
    if (original && original.value !== html) {
      original.value = html;
    }

    if (typeof SetFieldProperty === 'function') {
      SetFieldProperty('content', html);
    }
  }

  function syncFromOriginalContentTextarea() {
    const original = getOriginalContentTextarea();
    if (!original) {
      return;
    }

    const html = original.value;

    const editorTextarea = getEditorTextarea();
    if (editorTextarea && editorTextarea.value !== html) {
      editorTextarea.value = html;
    }

    // Update TinyMCE if it's active.
    if (window.tinymce && typeof window.tinymce.get === 'function') {
      const tiny = window.tinymce.get(EDITOR_ID);
      if (tiny && typeof tiny.setContent === 'function') {
        try {
          tiny.setContent(html);
        } catch (e) {
          // ignore
        }
      }
    }

    setFieldContent(html);
  }

  function removeEditor() {
    if (window.wp && wp.editor && typeof wp.editor.remove === 'function') {
      try {
        wp.editor.remove(EDITOR_ID);
      } catch (e) {
        // ignore
      }
    }
  }

  function getActiveSettingsRoot() {
    const richSetting = document.querySelector('.gfte-rich-content-setting');
    if (richSetting) {
      const root = richSetting.closest('#field_settings, #gform_field_settings, .gform-field-settings, .widget-content');
      if (root) {
        return root;
      }
    }

    return (
      document.getElementById('field_settings') ||
      document.getElementById('gform_field_settings') ||
      document.querySelector('.gform-field-settings') ||
      document
    );
  }

  function restoreOriginalContentSetting() {
    const fieldSettings = getActiveSettingsRoot();
    const rows = Array.from(fieldSettings.querySelectorAll(`.${HIDDEN_ORIGINAL_CLASS}`));
    for (const row of rows) {
      if (!(row instanceof Element)) {
        continue;
      }

      const previousDisplay = row.getAttribute('data-gfte-prev-display');
      if (previousDisplay === null) {
        row.style.removeProperty('display');
      } else {
        row.style.setProperty('display', previousDisplay);
        row.removeAttribute('data-gfte-prev-display');
      }

      row.classList.remove(HIDDEN_ORIGINAL_CLASS);
    }
  }

  function insertAtCursor(text) {
    // Insert into TinyMCE if active.
    if (window.tinymce && typeof window.tinymce.get === 'function') {
      const tiny = window.tinymce.get(EDITOR_ID);
      if (tiny && !tiny.hidden) {
        tiny.insertContent(text);
        setFieldContent(tiny.getContent());
        return;
      }
    }

    // Otherwise insert into the plain textarea (Text mode).
    const textarea = getEditorTextarea();
    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    setFieldContent(textarea.value);
  }

  function getMergeTagItems() {
    // Common GF merge tags. In a real scenario these could be fetched dynamically.
    return [
      { text: 'User IP Address', value: '{ip}' },
      { text: 'Date (mm/dd/yyyy)', value: '{date_mdy}' },
      { text: 'Date (dd/mm/yyyy)', value: '{date_dmy}' },
      { text: 'Embed Post/Page Id', value: '{embed_post:ID}' },
      { text: 'Embed Post/Page Title', value: '{embed_post:post_title}' },
      { text: 'Embed URL', value: '{embed_url}' },
      { text: 'HTTP User Agent', value: '{user_agent}' },
      { text: 'HTTP Referer URL', value: '{referer}' },
      { text: 'User Display Name', value: '{user:display_name}' },
      { text: 'User Email', value: '{user:user_email}' },
      { text: 'User Login', value: '{user:user_login}' },
    ];
  }

  function registerMergeTagButton(editor) {
    const items = getMergeTagItems();

    // TinyMCE 4.x API (used by WordPress)
    editor.addButton('gabormergetags', {
      text: '{..}',
      tooltip: 'Insert Merge Tag',
      type: 'menubutton',
      menu: items.map(function (item) {
        return {
          text: item.text,
          onclick: function () {
            editor.insertContent(item.value);
            setFieldContent(editor.getContent());
          },
        };
      }),
    });
  }

  function initEditor(initialHtml) {
    if (!window.wp || !wp.editor || typeof wp.editor.initialize !== 'function') {
      return;
    }

    const textarea = getEditorTextarea();
    if (!textarea) {
      return;
    }

    textarea.value = initialHtml || '';

    wp.editor.initialize(EDITOR_ID, {
      tinymce: {
        wpautop: false,
        toolbar1: 'bold,italic,bullist,numlist,link,gabormergetags',
        setup: function (editor) {
          registerMergeTagButton(editor);

          const sync = function () {
            setFieldContent(editor.getContent());
          };

          editor.on('Paste Change input Undo Redo', sync);
        },
      },
      quicktags: true,
    });

    bindTabSwitching();

    // Sync when using "Text" mode (quicktags).
    textarea.addEventListener('input', function () {
      setFieldContent(textarea.value);
    });
  }

  function getOriginalContentTextarea() {
    const el = document.getElementById('field_content');
    if (el && el instanceof HTMLTextAreaElement) {
      return el;
    }

    return null;
  }

  function hideOriginalContentSetting() {
    const original = getOriginalContentTextarea();
    if (!original) {
      return;
    }

    const row = original.closest('.field_setting');
    if (row && !row.classList.contains('gfte-rich-content-setting')) {
      if (!row.classList.contains(HIDDEN_ORIGINAL_CLASS)) {
        row.classList.add(HIDDEN_ORIGINAL_CLASS);
      }
      return;
    }

    // Fallback: at least hide the textarea itself.
    original.style.setProperty('display', 'none', 'important');
  }

  function stopObservingOriginalContentSetting() {
    if (!originalHideObserver) {
      return;
    }

    try {
      originalHideObserver.disconnect();
    } catch (e) {
      // ignore
    }

    originalHideObserver = null;
  }

  function startObservingOriginalContentSetting() {
    stopObservingOriginalContentSetting();

    const original = getOriginalContentTextarea();
    const row = original ? original.closest('.field_setting') : null;
    if (!(row instanceof Element) || typeof MutationObserver === 'undefined') {
      return;
    }

    originalHideObserver = new MutationObserver(function () {
      hideOriginalContentSetting();
    });

    // Watch for other scripts toggling inline styles/classes on the row.
    originalHideObserver.observe(row, { attributes: true, attributeFilter: ['class'] });
  }

  function bindOriginalContentSync() {
    if (originalContentListenerBound) {
      return;
    }

    const original = getOriginalContentTextarea();
    if (!original) {
      return;
    }

    original.addEventListener('input', syncFromOriginalContentTextarea);
    original.addEventListener('change', syncFromOriginalContentTextarea);
    originalContentListenerBound = true;
  }

  function bindOnLoadFieldSettings() {
    if (!window.jQuery) {
      return;
    }

    jQuery(document).on('gform_load_field_settings gform_post_load_field_settings', function (event, field) {
      removeEditor();

      // Restore in case we previously hid it for an HTML field.
      stopObservingOriginalContentSetting();
      restoreOriginalContentSetting();

      // Only mount for HTML fields.
      if (!field || field.type !== 'html') {
        return;
      }

      // Make sure merge tags inserted into the original textarea are reflected in the editor.
      bindOriginalContentSync();

      hideOriginalContentSetting();
      startObservingOriginalContentSetting();

      initEditor(field.content || '');
    });
  }

  // Ensure tabs work even if the editor initializes later.
  bindTabSwitching();
  bindOnLoadFieldSettings();
})();
