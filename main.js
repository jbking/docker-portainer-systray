const { app, BrowserWindow, Menu, Tray, shell, MessageChannelMain, nativeImage } = require('electron');
const { exec } = require('child_process');

let icon = null;
let tray = null;

let rendererPort = null;

let lastState = null;

const checkState = () => {
  exec('docker ps --format "{{.ID}} {{.Names}}"', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }

    // when same state from last command
    if (stdout === lastState) {
      return;
    }
    lastState = stdout;

    let isPortainerActive = false;
    containers = [];
    console.log(`stdout: >${stdout}<`);
    for (let l of stdout.trim().split('\n')) {
      if (l.trim().length == 0) {
        continue;
      }
      const a = l.split(' ');
      if (a[1].indexOf("portainer") >= 0) {
        isPortainerActive = true;
        continue;
      }
      containers.push({ id: a[0], label: a[1] });
    }

    console.log('isPortainerActive', isPortainerActive);
    console.log('containers', containers);
  
    menuItems = [];
    if (isPortainerActive) {
      menuItems.push(
        { label: 'Open Portainer', click: () => shell.openExternal("http://localhost:9000/#!/1/docker/containers") },
        { type: 'separator' },
        { label: `Containers (${containers.length})`, submenu: containers.map((c) => ({
          label: c.label,
          click: () => shell.openExternal("http://localhost:9000/#!/1/docker/containers/" + c.id) })) },
      )
    } else {
      menuItems.push(
        { label: 'Portainer is not running' },
        { type: 'separator' },
        { label: `Containers (${containers.length})`, submenu: containers.map((c) => ({ label: c.label })) },
      )
    }
    menuItems.push(
      { type: 'separator' },
      { label: 'Exit', role: 'quit' },
    );

    console.log('menuItems', menuItems);
    tray.setContextMenu(Menu.buildFromTemplate(menuItems));
    // console.log('items', items);
    rendererPort.postMessage({ icon: icon.toPNG(), count: containers.length })
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
