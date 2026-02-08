# worker service (placeholder)

## 定位

异步任务与后台作业：队列消费、转码、定时任务、批处理。

## 未来责任边界（占位）

- 队列任务消费与重试
- 定时任务（Cron）
- 与 media/ai-coach 等服务协作处理长耗时任务

## 接口/依赖（占位）

- 依赖：Redis（队列）、MinIO（文件）
- 对外：内部消费（无对外 API）
