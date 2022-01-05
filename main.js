const { app, Menu, Tray, shell } = require('electron');
const { exec } = require('child_process');

let tray = null;
let items = null;

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
    items.push({ type: 'separator' });
    items.push({ label: 'Exit', role: 'quit' });
    tray.setContextMenu(Menu.buildFromTemplate(items));
    // console.log('items', items);
  });
}

app.whenReady().then(() => {
  const iconPath = __dirname + '/share/icon/docker.png';
  tray = new Tray(iconPath);
  tray.setTitle(app.name);

  checkState();
  setInterval(checkState, 5000);
});
