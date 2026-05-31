export type TextAlignment = 'left' | 'center' | 'right';
export type FontSize = 'normal' | 'large' | 'xlarge';

export interface EscPosDocument {
  content: string;
  append: (command: string) => EscPosDocument;
  text: (str: string, opts?: { align?: TextAlignment; bold?: boolean; size?: FontSize }) => EscPosDocument;
  line: (str?: string, opts?: { align?: TextAlignment; bold?: boolean; size?: FontSize }) => EscPosDocument;
  divider: (char?: string) => EscPosDocument;
  cut: () => EscPosDocument;
  openDrawer: () => EscPosDocument;
  build: () => string;
}

export function createEscPosDocument(): EscPosDocument {
  let content = '';
  const esc = '\x1B';
  const gs = '\x1D';

  const init = `${esc}@`;
  content += init;

  const setAlign = (align: TextAlignment): string => {
    const codes = { left: '\x00', center: '\x01', right: '\x02' };
    return `${esc}a${codes[align]}`;
  };

  return {
    content,
    append(command: string) {
      content += command;
      return this;
    },
    text(str, opts = {}) {
      const { align = 'left', bold = false, size = 'normal' } = opts;
      content += setAlign(align);
      if (bold) content += `${esc}E\x01`;
      if (size === 'large') content += `${esc}!\x10`;
      else if (size === 'xlarge') content += `${esc}!\x18`;
      content += str;
      if (bold) content += `${esc}E\x00`;
      if (size !== 'normal') content += `${esc}!\x00`;
      content += setAlign('left');
      return this;
    },
    line(str = '', opts = {}) {
      return this.text(str + '\n', opts);
    },
    divider(char = '-') {
      content += char.repeat(42) + '\n';
      return this;
    },
    cut() {
      content += `${gs}V\x42\x00`;
      return this;
    },
    openDrawer() {
      content += `${esc}p\x00\x19\xFA`;
      return this;
    },
    build() {
      return content;
    },
  };
}
