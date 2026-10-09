export async function openExporter(): Promise<void> {
  let width=1040,height=760,title='多子板一键导出';
  try{const viewport=eda.sys_Window.getViewportSize();width=Math.min(1240,Math.max(320,viewport.width-48));height=Math.min(920,Math.max(300,viewport.height-72));}catch{}
  try{title=eda.sys_I18n.text('多子板一键导出');}catch{}
  await eda.sys_IFrame.openIFrame('/iframe/index.html',width,height,'batch-export',{title,maximizeButton:true,minimizeButton:true,grayscaleMask:false});
}
