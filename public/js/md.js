// Minimal Markdown renderer for the dev documentation pages.
//
// Supports the subset those documents actually use: headings, tables,
// bullet/numbered lists, fenced and inline code, bold/italic, links,
// horizontal rules and paragraphs. Deliberately small — no external
// dependency for four internal docs.

function mdEscape(text) {
  return String(text).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Inline formatting, applied after escaping.
function mdInline(text) {
  return mdEscape(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function mdTableRow(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

function renderMarkdown(src) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (/^```/.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(`<pre><code>${mdEscape(body.join("\n"))}</code></pre>`);
      continue;
    }

    // heading
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${mdInline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // table: header row, separator row, then body rows
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const head = mdTableRow(line);
      i += 2;
      const body = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) body.push(mdTableRow(lines[i++]));
      out.push(
        `<div class="table-wrap"><table>
          <thead><tr>${head.map((h) => `<th>${mdInline(h)}</th>`).join("")}</tr></thead>
          <tbody>${body
            .map((r) => `<tr>${r.map((c) => `<td>${mdInline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody>
        </table></div>`
      );
      continue;
    }

    // lists (bullet or numbered), including simple nesting by indent
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        let text = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
        i++;
        // continuation lines belonging to the same bullet
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
          text += " " + lines[i].trim();
          i++;
        }
        items.push(`<li>${mdInline(text)}</li>`);
      }
      out.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }

    // blank
    if (!line.trim()) {
      i++;
      continue;
    }

    // paragraph
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|```|\s*\||\s*([-*]|\d+\.)\s)/.test(lines[i]) &&
      !/^(-{3,}|\*{3,})\s*$/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    if (para.length) out.push(`<p>${mdInline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}
