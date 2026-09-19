const { spawn } = require("child_process");

const children = [];

function start(command, args) {
  const child = spawn(command, args, {
    shell: true,
    stdio: "inherit",
    windowsHide: false,
  });

  children.push(child);
  return child;
}

function killAll() {
  console.log("\n[Launcher] 正在关闭所有子进程...");

  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill();
      } catch {}
    }
  }
}

process.on("SIGINT", () => {
  killAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  killAll();
  process.exit(0);
});

process.on("exit", killAll);

start("npm", ["run", "dev"]);
