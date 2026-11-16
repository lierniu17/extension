# 单个 WXT 工程，core / llms / page-controller 放在 src 子目录

上游把这三个包拆成 pnpm workspace 并分别发布，但 Pagenter 已经与上游分叉（见 ADR-0001），不会再发布或复用这些包。决定：还原成一个 WXT 工程，三者放在 `src/core`、`src/llms`、`src/page-controller`，位于 `chrome/pagenter/`。多包结构只会增加构建与版本维护成本，没有对应收益。若将来要把某个包独立复用，再拆。
