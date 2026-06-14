'use client';

import { useState } from 'react';

const HELP_SECTIONS = [
  {
    title: '基础绘图',
    items: ['画一个红色的圆', '画个蓝色矩形', '在左上角画绿三角', '画一条直线', '写你好']
  },
  {
    title: '样式与位置',
    items: ['画一个大的红圆', '在右下角画小的', '画个0.5透明方块', '在中间画黄三角']
  },
  {
    title: '编辑操作',
    items: ['选中那个圆', '改成蓝色', '放大一点', '向右移动', '删除']
  },
  {
    title: '全局操作',
    items: ['撤销', '重做', '清空画布', '导出图片']
  },
  {
    title: '复杂场景',
    items: ['画房子', '画笑脸', '画田园风光', '画雪人', '画彩虹', '画圣诞树', '画太极图']
  },
  {
    title: '作品管理',
    items: ['保存为我的第一幅画', '保存作品', '打开我的作品', '打开第一幅', '删除这个作品']
  }
];

export default function HelpOverlay() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-10 right-4 z-50 w-8 h-8 rounded-full bg-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-300 flex items-center justify-center"
        title="指令帮助"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/30 flex items-start justify-center pt-12">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">语音指令速查</h2>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
            </div>
            {HELP_SECTIONS.map((s) => (
              <div key={s.title} className="mb-4">
                <h3 className="text-sm font-medium text-neutral-500 mb-1">{s.title}</h3>
                <div className="flex flex-wrap gap-1">
                  {s.items.map((item) => (
                    <span key={item} className="text-xs bg-neutral-100 text-neutral-700 px-2 py-1 rounded">
                      &ldquo;{item}&rdquo;
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
