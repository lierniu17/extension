# Pagenter 逆向还原

把已打包的 Chrome 扩展 Pagenter 还原成可构建、可长期维护的源码工程。

## Language

**Pagenter**:
基于 alibaba/page-agent 二次开发的 AI 浏览器自动化扩展，用自然语言控制网页。
_Avoid_: page-agent 扩展、Pagent

**产物 (Bundle)**:
目录 `chrome/pagenter-ext-1.8.0-chrome` 下已构建、未压缩的扩展文件，是还原工作的唯一事实来源。逆向完成后已从工作区删除，留在 git 历史里。
_Avoid_: 成品、dist、原包

**还原源码 (Restored Source)**:
从产物还原出来的可构建工程，放在 `chrome/pagenter/`。
_Avoid_: 重写版、新版

**上游 (Upstream)**:
alibaba/page-agent 官方仓库。
_Avoid_: 官方版、原版

**基线 (Baseline)**:
Pagenter 分叉出来的那个上游版本，即 v1.7.1。Pagenter 自己的 1.8.0 是独立编号，与上游 v1.8.0 无关。
_Avoid_: 底座、父版本

**还原等价 (Restoration Parity)**:
新构建产物与原产物经格式化后逐函数比较，只剩 import 写法和顺序的差异。
_Avoid_: 功能一致、差不多

## Pagenter 自有功能

**Sniff**:
后台记录网页网络请求，脱敏后推断接口的 JSON Schema，并整理成项目与 API 的功能。
_Avoid_: 抓包、爬接口

**TipScript**:
由 Script 模式保存下来、可按网址匹配并自动执行的页面脚本。
_Avoid_: 脚本片段、宏

**Script 模式**:
让 agent 以编写并修补页面脚本的方式完成任务，而不是逐步操作页面。
_Avoid_: 代码模式

**页面桥 (Page Bridge)**:
注入到网页主世界的 `window.__pagenter`，让页面脚本能调用模型和按会话隔离的存储。
_Avoid_: 注入接口

**Hub**:
让外部程序通过 WebSocket 驱动扩展的页面。
_Avoid_: 网关

**元素拾取器 (Picker)**:
在页面上点选元素并生成 CSS 选择器和 XPath 的内容脚本。
_Avoid_: 选择器工具

**Hint**:
页面可交互元素上的字母标记，agent 用它而不是数字序号来指代元素。
_Avoid_: 序号、index
