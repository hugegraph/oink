---
title: 表格布局策略
type: docs
---

## 普通正文

| 负责人 | 项目 | 状态 | 时间 | 说明 |
| --- | --- | --- | --- | --- |
| Alice 负责规划与协调 | 东京版本 | 等待评审 | 最终评审通过后 | 关于当前交付状态的简短说明。 |
| Bob 负责设计与交付 | 大阪补丁 | 等待测试 | 下次发布之前 | 关于后续步骤的简短说明。 |
{#ordinary-prose-table}

## 显式技术宽表

| 变量 | 必填 | 默认值 | 对应配置项 | 描述 |
| --- | --- | --- | --- | --- |
| `HG_PD_GRPC_HOST` | 是 | 无 | `grpc.host` | 对外宣告的 gRPC 主机名或 IP 地址；容器网络内部应使用容器主机名。 |
| `HG_PD_INITIAL_STORE_COUNT` | 否 | `1` | `pd.initial-store-count` | 集群可用时所需的最少存储节点数量。 |
| `HG_PD_ACTUATOR_EXPOSURE` | 否 | `health,metrics,prometheus` | `management.endpoints.web.exposure.include` | 对外开放的监控端点白名单，不允许使用通配符。 |
{#wide-technical-table .td-table--wide}

## 短普通表格

| 城市 | 端口 | 用途 |
| --- | --- | --- |
| 东京 | 8080 | 图接口 |
| 大阪 | 8686 | 元数据 |
{#short-ordinary-table}

## 显式宽度与已有修饰符

| 组件 | 读取 | 写入 |
| --- | --- | --- |
| 长组件标识符 | 是 | 否 |
{#wide-matrix-table .matrix .full-width .td-table--wide caption="已有修饰符保持独立"}
