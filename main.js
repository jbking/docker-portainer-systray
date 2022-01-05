const { app, BrowserWindow, Menu, Tray, shell, MessageChannelMain, nativeImage } = require('electron');
const { exec } = require('child_process');

let icon = null;
let tray = null;
let items = null;

let rendererPort = null;

const checkState = () => {
  exec('docker ps --format "{{.ID}} {{.Names}}"', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    items = [];
    for (let l of stdout.trim().split('\n')) {
      const a = l.split(' ');
      items.push({ label: a[1], click: () => shell.openExternal("http://localhost:9000/#!/1/docker/containers/" + a[0]) });
    }
    menuItems = [...items]
    menuItems.push({ type: 'separator' });
    menuItems.push({ label: 'Exit', role: 'quit' });
    tray.setContextMenu(Menu.buildFromTemplate(menuItems));
    // console.log('items', items);
    rendererPort.postMessage({ icon: icon.toPNG(), count: items.length })
  });
}

app.whenReady().then(async () => {
  icon = nativeImage.createFromPath(__dirname + '/share/icon/docker.png');

  const renderer = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: `${__dirname}/preload.js`,
    }
  });
  await renderer.loadFile('renderer.html')
  renderer.openDevTools()

  const { port1, port2 } = new MessageChannelMain()
  renderer.webContents.postMessage('new-client', null, [port1])
  rendererPort = port2

  rendererPort.on('message', (event) => {
    const icon1 = nativeImage.createFromBuffer(event.data.icon)
    tray.setImage(icon1)
  })
  rendererPort.start()

  tray = new Tray(icon);

  checkState();
  setInterval(checkState, 3000);
});
