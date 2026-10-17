---
title: File tree comments
type: docs
---

```filetree {title="Storage directory comments"}
rocksdb-data/
  data/
    m/    # schema store: property keys, vertex/edge/index labels, counters
    g/    # graph store: vertices, edges, index tables, olap tables
    s/    # system store: tasks, server info, backend meta (driver version)
  wal/
    m/
    g/
    s/
```

```filetree {title="Unbroken comment"}
storage/
  id.txt    # abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789
```
