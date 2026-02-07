/**
 * 在浏览器控制台运行此脚本，用于检查剧照区域的 DOM 和样式
 * 使用方式：先打开编辑电影对话框，再在控制台执行：
 * copy(`
 *  (function() {
 *    const wrap = document.querySelector('.edit-movie-screenshots');
 *    if (!wrap) return '错误: 未找到 .edit-movie-screenshots';
 *    const list = wrap.querySelector('.el-upload-list--picture-card');
 *    const items = wrap.querySelectorAll('.el-upload-list__item');
 *    const trigger = wrap.querySelector('.el-upload--picture-card');
 *    const listStyles = list ? getComputedStyle(list) : null;
 *    return JSON.stringify({
 *      wrapFound: !!wrap,
 *      listFound: !!list,
 *      itemsCount: items.length,
 *      triggerFound: !!trigger,
 *      listDisplay: listStyles?.display,
 *      listFlexWrap: listStyles?.flexWrap,
 *      listGap: listStyles?.gap
 *    }, null, 2);
 *  })();
 * `);
 */

// 可直接在控制台执行的检查函数
export function checkScreenshotStyles() {
  const wrap = document.querySelector('.edit-movie-screenshots')
  if (!wrap) {
    console.error('❌ 未找到 .edit-movie-screenshots，请确认编辑对话框已打开')
    return null
  }
  console.log('✅ 找到 .edit-movie-screenshots')
  const list = wrap.querySelector('.el-upload-list--picture-card')
  const items = wrap.querySelectorAll('.el-upload-list__item')
  const trigger = wrap.querySelector('.el-upload--picture-card')
  const item = items[0]
  const listStyles = list ? getComputedStyle(list) : null
  const itemStyles = item ? getComputedStyle(item) : null
  const result = {
    wrap: { found: true, tagName: wrap.tagName, className: wrap.className },
    list: {
      found: !!list,
      display: listStyles?.display,
      flexWrap: listStyles?.flexWrap,
      gap: listStyles?.gap,
      width: listStyles?.width
    },
    itemsCount: items.length,
    triggerFound: !!trigger,
    firstItem: itemStyles
      ? {
          width: itemStyles.width,
          height: itemStyles.height,
          margin: itemStyles.margin
        }
      : null
  }
  console.table(result)
  return result
}
