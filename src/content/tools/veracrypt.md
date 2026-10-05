---
name: VeraCrypt
description: 跨平台开源磁盘加密工具，可隐藏加密卷存在本身。
type: 加密工具
url: https://www.veracrypt.fr/
recommended: true
tags:
  - 加密
  - 文件
  - 磁盘
draft: false
---

## 简介

VeraCrypt 是 TrueCrypt 的衍生开源磁盘加密工具。可在硬盘上创建加密容器，或将整个分区加密。

## 为什么推荐

- **强加密**：AES-256、Twofish、Serpent 等算法可选
- **隐藏卷**：可创建"加密卷中的加密卷"，否认外层加密卷存在
- **跨平台**：Windows、macOS、Linux
- **开源**：可被独立审计

## 使用场景

- 在硬盘加密存放敏感文档（如稿件、笔记）
- 在 U 盘中创建加密卷，跨设备使用
- 隐藏卷用于应对胁迫情况

## 使用建议

- 加密卷密码必须足够复杂（建议 20 字以上随机字符 + 密码管理器）
- 备份加密卷的关键文件（如 header 备份）
- 不要在云盘同步加密卷（容易损坏）
- 忘记密码=数据永久丢失，没有找回机制

## 下载

前往 [veracrypt.fr](https://www.veracrypt.fr/) 下载。
