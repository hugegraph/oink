---
title: 文件树注释
type: docs
---

```filetree {title="存储目录注释"}
rocksdb-data/
  data/
    m/    # 元数据存储：属性键、顶点标签、边标签、索引标签和计数器
    g/    # 图数据存储：顶点、边、索引表，以及 OLAP 分析任务使用的数据表
    s/    # 系统存储：任务、服务器信息，以及包括驱动版本在内的后端元数据
  wal/
    m/
    g/
    s/
```

```filetree {title="无空格注释"}
storage/
  id.txt    # abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789
```
