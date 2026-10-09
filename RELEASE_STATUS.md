# v1.2.1 审核修复与重新提交记录

v1.2.0 于 2026-10-09 被退回，原因：README 缺少功能演示图或功能演示 GIF。

2026-10-10 已补充两张实际界面的公开示例截图、操作说明及图片打包检查，并上传 `build/dist/lceda-batch-export_v1.2.1.eext` 更新原扩展。市场管理页显示 **v1.2.1 / 审核中**，更新时间 **2026-10-10 01:52:31**。尚未审核通过或公开上架。

上传文件 SHA-256：`fc115f21262417ad4f18fc5d1575d592fc67d79a8a4ebd0693d21af6315cd95a`。

- 构建、发布检查、TypeScript 检查及 17 项自动化测试通过。
- README 两张 JPEG 演示图包含在安装包中，打包内容与源码图片一致。
- GitHub Contents API 已确认公开仓库中两张图片存在；本机直接请求 raw.githubusercontent.com 未及时返回，未确认该域名在本机网络的可达性。
- 演示图片使用公开示例数据，不含真实工程；本次修复未变更生产导出逻辑。
- 市场重新提交截图保存在本地 `build/market-review-1.2.1.png`。

GitHub 版本发布：https://github.com/tangyiyong/LCEDA-batch-export-plugins/releases/tag/v1.2.1

管理地址：https://jlc-ext.com/portal/tangyiyong

---

# v1.2.0 发布与验收记录

2026-10-09，使用 tangyiyong 账号将 `build/dist/lceda-batch-export_v1.2.0.eext` 上传至嘉立创 EDA 扩展广场。

平台反馈：**审核中**，版本 **v1.2.0**；页面显示更新时间 **2026-10-09 10:28:27**，上架按钮不可用。尚未公开上架；后续审核由平台完成。

管理地址：https://jlc-ext.com/portal/tangyiyong

上传文件 SHA-256：`1a46b268e3addda04ed82949eee36d059c11ce44c5de6258ff94f244b9d21be6`。

验收：

- TypeScript 严格类型检查通过，17 项自动化测试通过。
- 六种语言各 181 条消息，包含选项、错误及目录预览；占位符覆盖检查通过。
- macOS 嘉立创 EDA 专业版 4.1.60 成功更新安装。实际切换六种语言；最终包英文转简体中文时，LED 单板选择、Gerber 整数位数 5、工程名称、BOM 模板、成功计数与目录授权保持。验收后已载入原默认配置，界面恢复简体中文。
- 最终包真实导出 LED 的 BOM、网表，成功 2 / 失败 0；BOM 7113 字节，网表 27171 字节。BOM 为有效 XLSX；目录按钮打开内置查看器，实际显示元件数据与网表内容。
- 宽窗口视觉检查通过；响应式规则包含 1100、760、420 px 宽度及 600 px 高度断点。自动化工具缩放窗口时返回 noWindowsAvailable，未完成最终包窄窗口实机验收。
- Windows 盘符、UNC 路径、Unicode 和保留文件名测试通过；没有 Windows 客户端实机验收记录。
- 市场安装包不包含工程、生产输出、测试目录和开发依赖。具体包清单与哈希见 build/release-check.json。

生产文件仅保存在本地 validation-output/v1.2.0；未随扩展上传。
