import { Command, Editor, Plugin } from "obsidian";
import SettingsTab from './src/SettingsTab';

export interface WrapperTag {
    id?: string; // 20220904: compatible with older version, mark as optional
    name: string;
    startTag: string;
    endTag: string;
}

interface WrapperTagSettings {
    wrapperTags: WrapperTag[];
}

const DEFAULT_SETTINGS: WrapperTagSettings = {
    wrapperTags: [
        {
            id: 'underline',
            name: 'Underline',
            startTag: '<u>',
            endTag: '</u>'
        },
        {
            id: 'bold',
            name: 'Bold',
            startTag: '<b>',
            endTag: '</b>'
        },
        {
            id: 'italic',
            name: 'Italic',
            startTag: '<i>',
            endTag: '</i>'
        },
    ]
}

export default class WrapWithShortcut extends Plugin {
    settings: WrapperTagSettings;

    async onload() {
        await this.loadSettings();
        if (this.settings.wrapperTags.length > 0 && !this.settings.wrapperTags[0].id) {
            await this.applyWrapperTagID();
        }

        this.settings.wrapperTags.forEach((wrapperTag, index) => {
            const command: Command = {
                id: `wrap-with-shortcut-${wrapperTag.id}`,
                name: `Toggle ${wrapperTag.name}`,
                editorCallback: (editor: Editor) => this.wrapSelectedTextIn(editor, wrapperTag.startTag, wrapperTag.endTag),
            };
            this.addCommand(command);
        });

        this.addSettingTab(new SettingsTab(this));

        this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, view) => {
            const submenu = menu.addItem((item) => {
                item
                    .setTitle('Select wrapper')
                    .setIcon('scissors');
            });

            submenu.dom.addEventListener('mouseenter', () => {
                const subMenuEl = document.createElement('div');
                subMenuEl.className = 'menu';
                subMenuEl.style.position = 'absolute';
                subMenuEl.style.left = `${submenu.dom.getBoundingClientRect().right}px`;
                subMenuEl.style.top = `${submenu.dom.getBoundingClientRect().top}px`;

                this.settings.wrapperTags.forEach(wrapperTag => {
                    const subItemEl = document.createElement('div');
                    subItemEl.className = 'menu-item';
                    subItemEl.innerText = `Wrap with ${wrapperTag.name}`;
                    subItemEl.addEventListener('click', () => this.wrapSelectedTextIn(editor, wrapperTag.startTag, wrapperTag.endTag));
                    subMenuEl.appendChild(subItemEl);
                });

                document.body.appendChild(subMenuEl);

                submenu.dom.addEventListener('mouseleave', () => {
                    subMenuEl.remove();
                }, { once: true });

                subMenuEl.addEventListener('mouseleave', () => {
                    subMenuEl.remove();
                });
            });
        }));
    }

    wrapSelectedTextIn(editor: Editor, startTag = '<u>', endTag = '</u>'): void {
        if (startTag === '' && endTag === '') {
            return;
        }

        const selectedText = editor.getSelection();

        function toPos(editor: Editor, pos: number) {
            return editor.offsetToPos(pos);
        }

        function getRange(editor: Editor, from: number, to: number): string {
            try {
                return editor.getRange(toPos(editor, from), toPos(editor, to));
            } catch (_) {
                return '';
            }
        }

        const fos = editor.posToOffset(editor.getCursor("from")); // from offset
        const tos = editor.posToOffset(editor.getCursor("to")); // to offset
        const len = selectedText.length;

        const beforeText = getRange(editor, fos - startTag.length, fos);
        const afterText = getRange(editor, tos, tos + endTag.length);

        if (beforeText === startTag && afterText === endTag) {
            editor.replaceRange(selectedText, toPos(editor, fos - startTag.length), toPos(editor, tos + endTag.length));
        } else {
            editor.replaceSelection(`${startTag}${selectedText}${endTag}`);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async applyWrapperTagID() {
        this.settings.wrapperTags = this.settings.wrapperTags.map((tag, index) => ({
            ...tag,
            id: tag.id || `${index}`,
        }));
        await this.saveSettings();
    }
}
