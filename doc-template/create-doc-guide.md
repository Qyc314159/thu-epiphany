# 飞书文档创建指南

## 步骤

### 1. 创建文档
1. 打开飞书 → 新建文档
2. 将 `TEMPLATE.md` 的内容复制粘贴进去
3. 修改标题「[你的学习圈名称]」为你的实际名称

### 2. 获取 doc_token
从文档 URL 中提取：
```
https://xxx.feishu.cn/docx/ABC123def  →  token = ABC123def
```

### 3. 添加 Bot 为协作者
1. 点击文档右上角「分享」
2. 添加你的飞书机器人 APP 为协作者（编辑权限）
3. 这样 Bot 才能读写文档

### 4. 查找 H2 区块 ID
启动服务器后访问：
```
GET http://localhost:18999/api/scan-blocks
```
这会列出文档中所有 H2 区块及其 block_id。记录下「💡 灵感池」区块的 ID，填入服务器配置。
