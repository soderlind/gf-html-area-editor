/* global jQuery, wp, SetFieldProperty */

(function () {
  'use strict';

  const EDITOR_ID = 'gfte_field_rich_content';
  const HIDDEN_ORIGINAL_CLASS = 'gfte-hidden-original-content-setting';

  let originalHideObserver = null;
  let originalContentListenerBound = false;
  let editorInitialized = false;
  let previewUpdatePending = false;
  let previewUpdateTimer = null;

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

  /**
   * Update the HTML field preview in the form editor.
   *
   * @param {object} field - The Gravity Forms field object.
   */
  function updateFieldPreview(field) {
    if (!field || !field.id) {
      return;
    }

    const fieldContainer = document.getElementById('field_' + field.id);
    if (!fieldContainer) {
      return;
    }

    // Check if we already have our preview container.
    let previewContainer = fieldContainer.querySelector('.gfte-html-preview');
    
    if (!previewContainer) {
      // GF 2.5+ HTML field structure: find the element that displays the placeholder text.
      // Try the standard GF selectors first.
      let gfPreview = fieldContainer.querySelector('.gfield_html_formatted');
      
      if (!gfPreview) {
        gfPreview = fieldContainer.querySelector('.gfield_html');
      }

      if (!gfPreview) {
        // Look for the element containing the GF placeholder text.
        const walker = document.createTreeWalker(
          fieldContainer,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent && node.textContent.includes('HTML content is not displayed')) {
            gfPreview = node.parentElement;
            break;
          }
        }
      }

      if (gfPreview) {
        // Replace GF's preview with our container.
        previewContainer = document.createElement('div');
        previewContainer.className = 'gfte-html-preview';
        gfPreview.parentNode.replaceChild(previewContainer, gfPreview);
      } else {
        // Create our own preview container inside the field.
        previewContainer = document.createElement('div');
        previewContainer.className = 'gfte-html-preview';
        // Insert after the admin icons/toolbar.
        const adminIcons = fieldContainer.querySelector('.gfield_admin_icons');
        if (adminIcons) {
          adminIcons.parentNode.insertBefore(previewContainer, adminIcons.nextSibling);
        } else {
          fieldContainer.appendChild(previewContainer);
        }
      }
    }

    if (!previewContainer) {
      return;
    }

    const content = field.content || '';

    // Render the HTML content in the preview.
    if (content) {
      previewContainer.innerHTML = content;
    } else {
      const noContentText = (window.gfteStrings && window.gfteStrings.noContent) || (window.gf_vars && window.gf_vars.noContent) || 'No content';
      previewContainer.innerHTML = '<em class="gfte-empty-preview">' + noContentText + '</em>';
    }
  }

  /**
   * Refresh the field preview when content changes.
   * Debounced to prevent excessive updates.
   */
  function refreshCurrentFieldPreview() {
    if (previewUpdatePending) {
      return;
    }
    
    previewUpdatePending = true;
    
    // Clear any existing timer.
    if (previewUpdateTimer) {
      clearTimeout(previewUpdateTimer);
    }
    
    previewUpdateTimer = setTimeout(function() {
      previewUpdatePending = false;
      previewUpdateTimer = null;
      
      if (typeof window.GetSelectedField !== 'function') {
        return;
      }

      const field = window.GetSelectedField();
      if (field && field.type === 'html') {
        updateFieldPreview(field);
        
        // Also try calling GF's native field update if available.
        if (typeof window.UpdateFieldPreview === 'function') {
          try {
            window.UpdateFieldPreview('content');
          } catch (e) {
            // Ignore.
          }
        }
      }
    }, 100);
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

    // Update the field preview in the form editor.
    refreshCurrentFieldPreview();
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
    editorInitialized = false;
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

  /**
   * Get merge tag items from Gravity Forms.
   * Uses GF's built-in merge tag system for translations and form-specific tags.
   *
   * @returns {Array} Array of menu items with text and value properties.
   */
  function getMergeTagItems() {
    const items = [];

    // Try to get merge tags from Gravity Forms.
    // GF stores them in gf_vars.mergeTags as grouped objects.
    if (window.gf_vars && window.gf_vars.mergeTags) {
      const mergeTags = window.gf_vars.mergeTags;

      // mergeTags is an object with groups like 'default', 'user', 'post', etc.
      for (const groupKey in mergeTags) {
        if (!Object.prototype.hasOwnProperty.call(mergeTags, groupKey)) {
          continue;
        }

        const group = mergeTags[groupKey];

        // Each group has a 'tags' array with { tag, label } objects.
        if (group && Array.isArray(group.tags)) {
          for (let i = 0; i < group.tags.length; i++) {
            const tag = group.tags[i];
            if (tag && tag.tag && tag.label) {
              items.push({
                text: tag.label,
                value: tag.tag,
              });
            }
          }
        }
      }
    }

    // Also try to get form field merge tags if form is available.
    if (window.form && Array.isArray(window.form.fields)) {
      for (let i = 0; i < window.form.fields.length; i++) {
        const field = window.form.fields[i];
        if (field && field.id && field.label) {
          items.push({
            text: field.label,
            value: '{' + field.label + ':' + field.id + '}',
          });
        }
      }
    }

    // Fallback to basic merge tags if GF data isn't available.
    if (items.length === 0) {
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

    return items;
  }

  function registerMergeTagButton(editor) {
    const items = getMergeTagItems();

    // Get tooltip text from GF translations or fallback.
    const tooltipText = (window.gf_vars && window.gf_vars.insertMergeTag) ||
                        (window.gfteStrings && window.gfteStrings.insertMergeTag) ||
                        'Insert Merge Tag';

    // TinyMCE 4.x API (used by WordPress)
    editor.addButton('gabormergetags', {
      text: '{..}',
      tooltip: tooltipText,
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

    // Prevent double initialization.
    if (editorInitialized) {
      removeEditor();
    }

    textarea.value = initialHtml || '';

    wp.editor.initialize(EDITOR_ID, {
      tinymce: {
        wpautop: false,
        toolbar1:
          'formatselect,bold,italic,bullist,numlist,link,wp_add_media,gabormergetags',
        block_formats: 'P=p;H2=h2;H3=h3;H4=h4;H5=h5;H6=h6',
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

    editorInitialized = true;

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

    // Use namespaced events to prevent duplicate bindings.
    jQuery(document).off('gform_load_field_settings.gfte gform_post_load_field_settings.gfte');
    jQuery(document).on('gform_load_field_settings.gfte gform_post_load_field_settings.gfte', function (event, field) {
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
      
      // Update the field preview after a short delay to ensure GF has finished rendering.
      setTimeout(function() {
        updateFieldPreview(field);
      }, 150);
    });
  }

  /**
   * Hook into Gravity Forms' field rendering to show HTML preview.
   */
  function bindFieldPreview() {
    if (!window.jQuery) {
      return;
    }

    // Use namespaced events to prevent duplicate bindings.
    jQuery(document).off('gform_field_added.gfte gform_field_updated.gfte');
    jQuery(document).on('gform_field_added.gfte gform_field_updated.gfte', function (event, form, field) {
      if (field && field.type === 'html') {
        setTimeout(function() {
          updateFieldPreview(field);
        }, 150);
      }
    });

    // Override GetFieldContent for HTML fields to show rendered preview.
    // Only override once.
    if (typeof window.GetFieldContent === 'function' && !window.GetFieldContent._gfteOverridden) {
      const originalGetFieldContent = window.GetFieldContent;

      window.GetFieldContent = function (field) {
        if (field && field.type === 'html') {
          // Return the content directly - our updateFieldPreview will handle formatting.
          const content = field.content || '';
          if (content) {
            return '<div class="gfte-html-preview">' + content + '</div>';
          }
          const noContentText = (window.gfteStrings && window.gfteStrings.noContent) || (window.gf_vars && window.gf_vars.noContent) || 'No content';
          return '<div class="gfte-html-preview"><em class="gfte-empty-preview">' + noContentText + '</em></div>';
        }
        return originalGetFieldContent.apply(this, arguments);
      };
      
      window.GetFieldContent._gfteOverridden = true;
    }
  }

  /**
   * Update all HTML field previews on the form.
   */
  function updateAllHtmlFieldPreviews() {
    // Check if the form object is available.
    if (typeof window.form === 'undefined' || !window.form || !window.form.fields) {
      return;
    }

    const fields = window.form.fields;
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (field && field.type === 'html') {
        updateFieldPreview(field);
      }
    }
  }

  /**
   * Initialize previews when the form editor loads.
   */
  let formLoadInitialized = false;
  
  function initOnFormLoad() {
    if (!window.jQuery || formLoadInitialized) {
      return;
    }
    
    formLoadInitialized = true;

    // Update all HTML field previews when the form editor is ready.
    jQuery(document).off('gform_form_editor_ready.gfte');
    jQuery(document).on('gform_form_editor_ready.gfte', function () {
      setTimeout(updateAllHtmlFieldPreviews, 300);
    });

    // Fallback: also try on document ready in case the event already fired.
    jQuery(function () {
      // Check if form is already loaded.
      if (typeof window.form !== 'undefined' && window.form && window.form.fields) {
        setTimeout(updateAllHtmlFieldPreviews, 500);
      }
    });

    // Also update when form is loaded/refreshed.
    jQuery(document).off('gform_load_form_settings.gfte');
    jQuery(document).on('gform_load_form_settings.gfte', function () {
      setTimeout(updateAllHtmlFieldPreviews, 300);
    });
  }

  // Initialize once - bind tab switching first as it uses capture phase.
  bindTabSwitching();
  bindOnLoadFieldSettings();
  bindFieldPreview();
  initOnFormLoad();
})();
