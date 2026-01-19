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
    gformSettingsHandler = undefined;

    // Minimal jQuery mock for gform_load_field_settings bindings.
    window.jQuery = (arg) => {
      if (arg !== document) {
        return { on: () => {} };
      }

      return {
        on: (events, cb) => {
          // The plugin registers one handler for both events.
          if (typeof events === 'string' && events.includes('gform_load_field_settings')) {
            gformSettingsHandler = cb;
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
});
