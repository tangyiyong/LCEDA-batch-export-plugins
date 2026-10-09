# 多子板一键导出 · 嘉立创 EDA 专业版扩展

源码仓库：[tangyiyong/LCEDA-batch-export-plugins](https://github.com/tangyiyong/LCEDA-batch-export-plugins)。许可证：Apache-2.0；版权 © 2026 @tangyiyong。

首次获取源码：

```sh
git clone https://github.com/tangyiyong/LCEDA-batch-export-plugins.git
cd LCEDA-batch-export-plugins
npm ci
npm run typecheck
npm test
npm run build
```

编译产物位于 `build/dist/`。生产验证文件、开发依赖和生成文件不提交到 Git。市场发布操作见 [PUBLISHING.md](PUBLISHING.md)。

选中当前工程中的多块 PCB 子板，按所选类型批量导出生产和测试资料。

## 功能演示

以下截图来自扩展实际界面，使用 MAIN、LED、SENSOR、POWER 示例子板，不包含真实工程数据；用于展示操作与配置，不代表实际生产文件导出结果。

### 1. 选择子板和导出内容

勾选需要导出的子板及文件类型，选择保存根目录后点击“一键导出”。文件按类型保存到 `gerber/`、`bom/`、`dxf/`、`netlist/` 等子目录。导出完成后可点击“打开导出目录”检查文件。

![功能演示：选择子板、文件类型与保存目录](https://raw.githubusercontent.com/tangyiyong/LCEDA-batch-export-plugins/main/images/demo/overview.jpg)

### 2. 配置导出参数与保存配置

点击文件类型右侧的“配置”展开参数。下图展示 Gerber 的单位、精度、钻孔和图层等选项。使用“保存为默认值”保存常用选择；“导出配置”和“导入配置”用于交换完整 JSON 配置。

![功能演示：展开 Gerber 导出参数](https://raw.githubusercontent.com/tangyiyong/LCEDA-batch-export-plugins/main/images/demo/export-options.jpg)

演示图片也包含在扩展安装包的 `images/demo/` 中。源码维护者可在 `npm run build` 后运行 `npm run demo`，再用本地静态服务器打开 `build/demo/` 重新截取界面；演示环境不提供生产导出或文件读写接口。

## 安装与使用

1. 在桌面版嘉立创 EDA 专业版（最低 4.1.54）打开工程，并激活该工程的原理图或 PCB 标签页。
2. 通过 **高级 → 扩展管理器 → 导入**，选择 `build/dist/lceda-batch-export_v1.2.1.eext`。
3. 在扩展管理器的 **已安装 → 配置** 页找到“多子板一键导出”，启用扩展和顶部菜单显示。若客户端使用传统文件接口，再开启 **外部交互权限**。当前 V4.1.60 已用系统目录授权方式验证，选择根目录时授权写入即可。
4. 点击新增的 **批量导出 → 多子板一键导出…** 菜单。
5. 勾选子板，勾选文件类型，展开“配置”调整选项。
6. 选择导出根目录，点击 **一键导出**。导出期间请勿切换工程或 PCB 标签页。

子板列表默认全选；支持全选、全不选和搜索。切换工程后点击“刷新”重新读取。未关联板子但属于工程的独立 PCB 也列出。

## 导出内容

名称和排列顺序与 V4.1.60 的 PCB 导出菜单一致（省略菜单快捷键和末尾省略号）。下单入口属于业务操作，不作为文件导出项。

| 名称 | 子目录 | 配置 / 支持方式 |
|---|---|---|
| PCB制板文件(Gerber) | gerber | 原 Gerber 全部选项 |
| 坐标文件(CPL) | pickplace | XLSX/CSV、mm/mil |
| 物料清单(BOM) | bom | 模板、格式、过滤、统计、属性列、排序分组 |
| ODB++ | odb | 单位、钻孔、钻孔表、飞针文件、图层、对象 |
| IPC-D-356A | ipc356 | 官方文件接口 |
| 飞针测试文件 | flyingprobe | 独立飞针文件，保留官方压缩包 |
| 3D文件 | model3d | STEP/OBJ、元素、装配/零件方式、自动生成模型 |
| 3D外壳文件 | shell3d | STL/STEP/OBJ |
| DXF | dxf | 图层、镜像、对象 |
| PDF | pdf | 输出方式、内容、水印、图页；4.1.60 使用编辑器已有设置，4.1.68+ 才支持这些参数 |
| PNG | — | 官方没有 PCB PNG 批量文件 API；展开后可打开官方窗口逐板导出 |
| 交互式BOM | ibom | HTML |
| 测试点报告 | testpoint | XLSX/CSV |
| PCB 信息 | pcbinfo | 官方文本报告 |
| 网表文件 | netlist | JLCEDA/EasyEDA/Protel2/PADS/Allegro/DISA/DSNET |
| 自动布线(DSN) | dsn | DSN |
| Altium Designer | altium | 从官方工程转换包提取所选板的 .PcbDoc |
| PADS | pads | 从官方工程转换包提取所选板的 .asc |
| T/DISA 4001 | — | 官方没有此设计格式的批量文件 API；展开后可打开官方窗口逐板导出 |

17 类提供批量接口，PNG 与 T/DISA 4001 显示为禁用的批量复选框和可用的官方窗口按钮。使用窗口按钮时仅选择一块子板；不能把它们误记为批量成功。旧版默认值与 JSON 配置自动补齐新增类型的默认参数，原勾选项保持兼容。

每个目录内保存所有选中板的相应文件，如 `bom/MAIN.xlsx`、`bom/MIC.xlsx`。扩展为官方接口没有附加后缀的文件补齐 ZIP、DXF、XLSX/CSV 后缀；网表保留官方格式的后缀。Gerber 保留官方 ZIP 文件。已有同名文件会自动加 `_2`、`_3` 等序号，不覆盖。子板名称中的非法文件名字符会转成下划线，同名板会加序号。

初始勾选 Gerber、BOM、DXF、网表。Gerber 默认 mm、4:5，启用钻孔、钻孔表和飞针测试文件；图层和对象留空时交由官方接口决定。DXF 初始只导出板框层（11），需要丝印、机械等层时在选项中添加。

## 查看导出目录

导出完成后点击 **打开导出目录**，直接列出该次导出目录的文件。支持查看 ZIP 条目及文本、BOM/XLSX 首表、CSV/网表/报告、PNG/PDF 和交互式 BOM。文本预览限制为前 300 KB，XLSX 预览最多 501 行；STEP 等二进制或 CAD 格式仍使用对应软件检查。

目录查看器内的 **在访达/资源管理器打开…** 使用客户端本地打开目录入口。系统目录授权不暴露绝对路径，因此首次需在系统选择框中选择同一导出目录，再由客户端打开。该入口属于客户端非公开协议；如果版本不兼容，目录查看器仍可查看文件。传统绝对路径模式可直接打开系统目录。

## 默认值与配置文件

- **保存为默认值**：将当前勾选文件类型和全部导出选项保存到 EDA 的本扩展用户配置，下次打开自动载入。
- **载入默认值**：恢复上次保存的默认值；首次使用恢复初始配置。
- **导出配置**：保存可分享、可版本管理的 JSON 文件。
- **导入配置**：校验 JSON 结构、版本、类型和参数后载入；不会自动覆盖默认值，需要再点击“保存为默认值”。

`examples/production-config.json` 是完整配置示例。配置只包含文件类型及导出参数，不绑定子板 UUID 或本机目录，因此可用于另一工程。系统目录授权仅在当前扩展窗口有效，每次打开重新选择根目录；传统文件接口模式会单独记住路径。子板每次从当前工程读取。

常规参数使用下拉框、数字和复选框；复杂的图层、BOM 列和过滤规则使用 JSON 输入。留空表示不向 API 传递该可选参数；填写 `[]` 表示明确传入空数组，两者含义不同。BOM 模板名称必须存在于目标 EDA 客户端，扩展不会自动打包模板。

图层 JSON 的 Gerber 字段是 `isMirror`，DXF 字段是 `mirror`：

```json
[{"layerId":11,"mirror":false},{"layerId":14,"mirror":false}]
```

常用图层：1 顶铜、2 底铜、3/4 丝印、5/6 阻焊、7/8 锡膏、9/10 装配、11 板框、14 机械、15 起内层、56 钻孔。自定义 Gerber 图层时应明确包含生产所需层；默认留空更适合不同层数的多板工程。

## 进度、取消与失败

逐板打开并激活 PCB，确认当前文档与工程 UUID，再调用生产资料 API。生成完成后再次检查文档，发生切换则拒绝保存该文件。扩展不调用图元编辑、保存设计、关闭标签页或重新铺铜接口，导出的是当前编辑器中的设计状态。官方导出接口仍可能触发客户端内部处理或将 PCB 标记为有变更。完成后尝试恢复原标签页。

单项失败会记录原因并继续后续项。**停止后续任务** 会等待正在执行的 EDA 导出调用返回，保留已经保存的文件，并将未执行项标记为跳过。EDA 导出接口不提供中途取消。**重试失败项** 仅重新执行上次报告里的失败项，使用上次报告中的选项及窗口当前根目录。

根目录保存 `export-report_时间.json`，记录配置、板 UUID、类型、成功/失败/跳过、文件路径、文件大小和错误。系统目录授权模式下，报告只记录目录名和相对路径，不伪造本机绝对路径。如果报告写入失败，可点击“下载导出报告”。生产接口处于官方 BETA 状态，某些格式、选项或运行时间可能因客户端版本和板复杂度而不同。

## 开发

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Node.js 22.18+（测试使用原生 TypeScript 类型擦除）；开发期间使用 Node.js 26.9。扩展执行文件使用 esbuild 编译为浏览器 IIFE，UI 脚本内嵌到 HTML，安装包包含清单、入口、界面、图标、六语言资源、使用说明、更新日志和许可证。

- `src/config.ts`：配置模型、参数定义和校验、文件名与路径处理。
- `src/exporter.ts`：官方接口适配、顺序调度、文件保存及报告。
- `src/ui.ts` / `src/ui.html` / `src/ui.css`：响应式多语言交互界面。
- `src/directory.ts` / `src/file-dialog.ts`：目录授权、配置和报告文件对话框。
- `src/directory-view.ts`：导出目录及文件内容查看器。
- `scripts/build.mjs`：编译及 `.eext` 打包。
- `tests/*.test.ts`：导出行为与目录授权适配器测试。

扩展不依赖外部服务，目录查看的系统入口仅调用客户端本地 app:// 协议，数据通过 EDA 官方接口生成，再通过系统目录授权或 EDA 本地文件接口写入用户选定的本地目录。外部交互权限是 EDA 提供的宽范围权限，扩展自身未调用本地文件删除接口。

## 官方接口参考

- [官方扩展 SDK](https://github.com/easyeda/pro-api-sdk)
- [PCB 生产资料 API](https://prodocs.lceda.cn/cn/api/reference/pro-api.pcb_manufacturedata.html)
- [本地文件系统 API](https://prodocs.lceda.cn/cn/api/reference/pro-api.sys_filesystem.html)
- [子板管理 API](https://prodocs.lceda.cn/cn/api/reference/pro-api.dmt_board.html)

本项目采用 Apache-2.0 许可证。版权 © 2026 @tangyiyong。许可证见 `LICENSE`；自绘图标版权归 @tangyiyong；第三方组件许可见 `THIRD_PARTY_NOTICES.md`。

Altium Designer / PADS 的转换接口返回整个工程；扩展每次批量任务只转换一次，并仅提取所选 PCB，避免带出未选板。无法唯一匹配时报告失败。ODB++ 按实际 GZIP 格式保存为 `.tgz`。


## 语言与布局

支持简体中文、繁体中文、英文、法文、日文、韩文。首次打开跟随 EDA 显示语言；右上角可随时切换并自动保存。切换保留子板选择、导出类型、已编辑选项和展开状态。导出中禁用语言切换，确保同一报告语言一致。工程名、板名、用户配置名、API 枚举及 JSON 数据保持原值，只有显示标签被翻译。

界面按扩展窗口的可用宽度重新排版：宽窗口以双列显示文件类型，常规窗口保留左侧板列表，窄窗口改为单列。窗口初始大小根据 EDA 视口限制，支持缩放与最大化；短屏幕减少头部和日志高度。文本可以换行，包含键盘焦点提示及减少动态效果适配。

## macOS / Windows

同一 `.eext` 安装包用于两种桌面平台，无需分开编译。运行时不依赖 Node、Python、终端、AppleScript 或 PowerShell。文件操作使用标准目录授权及 EDA API；本地目录打开使用 EDA 客户端协议。支持 Windows 盘符和 UNC 路径、macOS 绝对路径、Unicode 文件名，自动清理跨平台禁用字符和 Windows 保留文件名。

macOS 4.1.60 已有真实工程导出验证。Windows 路径处理及目录适配器通过自动测试，但此版本尚未完成 Windows 客户端实机验收；系统文件管理器入口属于非公开客户端协议，若不可用，可直接在扩展查看文件，或手动在资源管理器打开保存目录。推荐近期桌面客户端，过长的 Windows 路径可改用较短根目录。

## English quick start

Install the `.eext` file from **Advanced → Extension Manager → Import** in EasyEDA Pro. Open **Batch Export**, select boards and formats, choose an output folder, then export. Choose English or another language from the header selector. Use **Save as default** or JSON profiles to reuse options. The extension supports 17 automatic formats; PCB PNG and T/DISA 4001 open official per-board dialogs. Folder preview and Finder / File Explorer access are available after exporting.
