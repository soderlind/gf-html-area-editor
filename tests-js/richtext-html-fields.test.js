import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function loadScriptIntoWindow(scriptRelativePath) {
  const filePath = path.resolve(process.cwd(), scriptRelativePath);
  const code = fs.readFileSync(filePath, 'utf8');

  // Execute the IIFE in the jsdom global scope.
  // eslint-disable-next-line no-new-func
  const fn = new Function(code);
  fn();
}

describe('GFTE rich text HTML fields', () => {
  let gformSettingsHandler;
  let gformFieldAddedHandler;
  let gformFormEditorReadyHandler;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="wp-gfte_field_rich_content-wrap">
        <div class="wp-editor-tabs">
          <button type="button" class="switch-tmce">Visual</button>
          <button type="button" class="switch-html">Text</button>
        </div>
      </div>
    `;

    delete window.switchEditors;
    delete window.form;
    delete window.GetSelectedField;
    delete window.GetFieldContent;
    delete window.SetFieldProperty;
    gformSettingsHandler = undefined;
    gformFieldAddedHandler = undefined;
    gformFormEditorReadyHandler = undefined;

    // Minimal jQuery mock for gform_load_field_settings bindings.
    window.jQuery = (arg) => {
      if (typeof arg === 'function') {
        // Document ready callback - execute immediately.
        arg();
        return;
      }
      
      if (arg !== document) {
        return { on: () => {}, off: () => {} };
      }

      return {
        off: () => ({ on: (events, cb) => {
          // Handle namespaced events.
          if (typeof events === 'string') {
            if (events.includes('gform_load_field_settings')) {
              gformSettingsHandler = cb;
            }
            if (events.includes('gform_field_added')) {
              gformFieldAddedHandler = cb;
            }
            if (events.includes('gform_form_editor_ready')) {
              gformFormEditorReadyHandler = cb;
            }
          }
        }}),
        on: (events, cb) => {
          // Handle namespaced events.
          if (typeof events === 'string') {
            if (events.includes('gform_load_field_settings')) {
              gformSettingsHandler = cb;
            }
            if (events.includes('gform_field_added')) {
              gformFieldAddedHandler = cb;
            }
            if (events.includes('gform_form_editor_ready')) {
              gformFormEditorReadyHandler = cb;
            }
          }
        },
      };
    };

    window.wp = {
      editor: {
        switchMode: vi.fn(),
        initialize: vi.fn(),
        remove: vi.fn(),
      },
    };
  });

  it('clicking Text tab switches to html mode via wp.editor.switchMode', () => {
    loadScriptIntoWindow('assets/admin/richtext-html-fields.js');

    const textTab = document.querySelector('#wp-gfte_field_rich_content-wrap .switch-html');
    expect(textTab).toBeTruthy();

    textTab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(window.wp.editor.switchMode).toHaveBeenCalledWith('gfte_field_rich_content', 'html');
  });

  it('falls back to switchEditors.go when wp.editor.switchMode is unavailable', () => {
    window.wp = { editor: {} };
    window.switchEditors = { go: vi.fn() };

    loadScriptIntoWindow('assets/admin/richtext-html-fields.js');

    const visualTab = document.querySelector('#wp-gfte_field_rich_content-wrap .switch-tmce');
    expect(visualTab).toBeTruthy();

    visualTab.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(window.switchEditors.go).toHaveBeenCalledWith('gfte_field_rich_content', 'tmce');
  });

  it('hides the original #field_content row for HTML fields and restores it for non-HTML fields', () => {
    document.body.innerHTML = `
      <div id="field_settings">
        <ul>
          <li class="gfte-rich-content-setting field_setting">
            <label class="section_label">
              <span class="gfte-merge-tags-slot"></span>
            </label>
          </li>
          <li class="content_setting field_setting">
            <label for="field_content">Content</label>
            <textarea id="field_content"></textarea>
            <span class="all-merge-tags">
              <button class="gform-dropdown__control" type="button">MT</button>
            </span>
          </li>
        </ul>
        <div id="wp-gfte_field_rich_content-wrap">
          <div class="wp-editor-tools" id="wp-gfte_field_rich_content-editor-tools"></div>
        </div>
        <textarea id="gfte_field_rich_content"></textarea>
      </div>
    `;

    loadScriptIntoWindow('assets/admin/richtext-html-fields.js');
    expect(typeof gformSettingsHandler).toBe('function');

    const row = document.querySelector('#field_settings .content_setting.field_setting');
    expect(row).toBeTruthy();

    // Simulate selecting an HTML field.
    gformSettingsHandler({}, { type: 'html', content: '<p>Hi</p>' });
    expect(row.classList.contains('gfte-hidden-original-content-setting')).toBe(true);

    // Simulate selecting a non-HTML field.
    gformSettingsHandler({}, { type: 'text' });
    expect(row.classList.contains('gfte-hidden-original-content-setting')).toBe(false);
  });

  it('updates HTML field preview when field is loaded', () => {
    document.body.innerHTML = `
      <div id="field_settings">
        <ul>
          <li class="gfte-rich-content-setting field_setting">
            <label class="section_label"></label>
          </li>
          <li class="content_setting field_setting">
            <textarea id="field_content"></textarea>
          </li>
        </ul>
        <textarea id="gfte_field_rich_content"></textarea>
      </div>
      <div id="field_5" class="gfield gfield--type-html">
        <div class="gfield_admin_icons"></div>
        <div class="gfield_html">HTML content is not displayed in the form admin.</div>
      </div>
    `;

    loadScriptIntoWindow('assets/admin/richtext-html-fields.js');

    // Simulate selecting an HTML field with content.
    gformSettingsHandler({}, { id: 5, type: 'html', content: '<p>Test content</p>' });

    // Use setTimeout to allow the async preview update.
    return new Promise((resolve) => {
      setTimeout(() => {
        const previewContainer = document.querySelector('#field_5 .gfield_html');
        expect(previewContainer.innerHTML).toContain('Test content');
        resolve();
      }, 200);
    });
  });

  it('updates all HTML field previews on form load', () => {
    document.body.innerHTML = `
      <div id="field_1" class="gfield gfield--type-html">
        <div class="gfield_html">HTML content is not displayed in the form admin.</div>
      </div>
      <div id="field_2" class="gfield gfield--type-html">
        <div class="gfield_html">HTML content is not displayed in the form admin.</div>
      </div>
    `;

    // Set up form object with HTML fields.
    window.form = {
      fields: [
        { id: 1, type: 'html', content: '<p>Field 1</p>' },
        { id: 2, type: 'html', content: '<p>Field 2</p>' },
      ],
    };

    loadScriptIntoWindow('assets/admin/richtext-html-fields.js');

    // The script should trigger updateAllHtmlFieldPreviews on document ready.
    return new Promise((resolve) => {
      setTimeout(() => {
        const preview1 = document.querySelector('#field_1 .gfield_html');
        const preview2 = document.querySelector('#field_2 .gfield_html');
        expect(preview1.innerHTML).toContain('Field 1');
        expect(preview2.innerHTML).toContain('Field 2');
        resolve();
      }, 600);
    });
  });

  it('overrides GetFieldContent for HTML fields', () => {
    window.GetFieldContent = vi.fn((field) => `Original: ${field.type}`);

    loadScriptIntoWindow('assets/admin/richtext-html-fields.js');

    const htmlField = { type: 'html', content: '<p>Hello</p>' };
    const textField = { type: 'text' };

    const htmlResult = window.GetFieldContent(htmlField);
    const textResult = window.GetFieldContent(textField);

    expect(htmlResult).toContain('gfte-html-preview');
    expect(htmlResult).toContain('<p>Hello</p>');
    expect(textResult).toBe('Original: text');
  });
});
