# Development log / 开发记录

## 2026-11-03

- Added Ramp mode with positioned stops, preview, interpolation, reverse and even spacing; regression tests pass. Actual host UI still needs user verification. / 增加 Ramp 色标位置、预览、插值、反转和均匀分布；回归测试通过，真实宿主界面仍待用户验证。

- Implemented editable vector rings, original-source preservation and saved settings. / 实现矢量描边环、原始来源保留与参数保存。
- Fixed panel initialization scope and timing. / 修正面板初始化作用域与加载时序。
- Preserved Apply errors, added font-loading timeout and generation progress. / 保留 Apply 错误，增加字体超时及生成进度。
- Added a 2–12 color palette, alternating and multi-stop layer interpolation, with legacy two-color migration. / 增加 2–12 色列表、循环与多色层间插值，兼容旧两色参数。
- Backed up the current deployed source to a private repository. / 将当前部署源码备份至私有仓库。
- Known issue: glyph-overlap seams still need investigation. / 待办：继续排查字形重叠接缝。
