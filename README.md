# Multiple strokes

Editable layered vector outlines for Figma. / Figma 多重可编辑矢量描边插件。

## Features / 功能

- Text and closed filled vector inputs. / 支持文字和闭合填充矢量。
- 1–12 stroke layers; adjustable weight, gap, offset and joins. / 1–12 层，支持粗细、间距、偏移和转角。
- 2–12 colors. Single uses Color 1; Alternating cycles through the palette; Gradient interpolates colors across layers. Each layer remains a solid fill. / 2–12 色；单色、循环交替或层间颜色过渡，每层仍为纯色。
- Original source retained; generated results can be selected and updated. / 保留原始来源，可选中插件结果更新参数。
- English property panel with progress and persistent errors. / 全英文面板，显示进度并保留错误提示。

## Source and deployment / 源码与部署

- Plugin ID: `0c754988-b770-4362-a647-fb6200b9b94d`
- Figma source version: `54ef2f3817c2709f8845dcaf56696a447078f5dc`
- Snapshot date: 2026-11-03
- `code.ts`: Figma sandbox geometry and settings.
- `ui.html`: PropsKit controls and iframe communication.
- `manifest.json`: authoritative Figma-hosted manifest.
- `test-panel.cjs`: local simulated UI/sandbox regression checks.

This is a backup of the Figma-hosted plugin. PropsKit is supplied by Figma's isTool host. This repository is not a standalone desktop-plugin installer. Updating this repository does not publish a Community release.

这是 Figma 托管插件的源码备份。PropsKit 由 Figma 的 isTool 环境提供，不是独立桌面插件安装包。推送 GitHub 不会自动发布 Community 更新。

To update: modify source, test it, deploy the authored files to the existing Figma plugin, verify it in Figma, then explicitly publish Community changes.

更新流程：修改源码、测试、部署到同一个 Figma 插件、在 Figma 验证，再单独发布 Community 更新。

## Validation / 验证

Run with Node.js 24:

```sh
node test-panel.cjs
node test-ramp.cjs
```

These tests simulate message handling and palette calculations. They do not replace visual or geometry verification in the real Figma runtime.

测试模拟消息通信与颜色计算，不能替代 Figma 中的真实几何及视觉验证。

## Data handling / 数据处理

The authored code has no external network requests, custom backend, analytics or embedded credentials. It reads the selected layers, generates vector nodes and stores small settings on its own result nodes using plugin data. Figma provides the runtime and font loading.

插件代码不包含外部网络请求、自建后端、分析上报或凭据。它读取选中图层、创建矢量节点，并通过 plugin data 在自身结果节点上保存少量参数；运行环境与字体加载由 Figma 提供。

## Known limitation / 已知限制

Ramp mode supports 2–12 colors with individual 0–100% positions, a color-band preview, Linear/Smooth/Constant interpolation, Reverse ramp and Even spacing. The band maps from the innermost to the outermost stroke; each ring remains a solid vector fill. Stops outside the sampled range hold their nearest endpoint color. Coincident positions form a hard transition, with the later listed color winning at the exact position. One stroke samples 0%.

Ramp 模式支持 2–12 个色标，各自设置 0–100% 位置，带色带预览、线性/平滑/阶梯插值、反转和均匀分布。色带从内到外映射描边，每层仍为纯色矢量；色标范围外保持端点颜色，重合色标在该位置采用列表中靠后的颜色，单层描边采样 0%。

Overlapping glyph contours may reveal internal seams in some inputs. The reported overlap-normalization issue has not yet been fixed or validated.

某些输入的字形重叠轮廓可能露出内部接缝；此问题尚未完成修复与验证。
