# Four PR comparison diagrams (2026-10-13)

These 2400×1350 images are **generated conceptual before/after diagrams**, optimized to WebP for GitHub. They are *not* screenshots of a native Hugo page, new browser-test results, or proof of a released fix. Existing PR descriptions separately link real archived native baseline/candidate screenshots.

| PR | Diagram | Notes |
| --- | --- | --- |
| [#1](https://github.com/hugegraph/oink/pull/1) | [Markmap](pr1-markmap.webp) | Theme text token applies to the SVG on screen; print unaffected. |
| [#2](https://github.com/hugegraph/oink/pull/2) | [Fixed right rail](pr2-footer-toc.webp) | Shared footer offset; no-left-sidebar case included. |
| [#3](https://github.com/hugegraph/oink/pull/3) | [FileTree](pr3-filetree.webp) | Wrap comments, maintain minimum row height. |
| [#4](https://github.com/hugegraph/oink/pull/4) | [Tables](pr4-tables.webp) | Ordinary auto-width versus *explicit* technical-wide mode. Downstream HugeGraph PD content still needs `.td-table--wide` adoption before claiming that case fixed. |

All four graphics are illustrative; preserve exact empirical claims with linked source measurements and test logs, not graphic elements.
