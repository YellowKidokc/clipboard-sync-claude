module.exports = {
  apps: [
    {
      name: "clipsync",
      script: "src/index.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      cwd: "C:\\Users\\lowes\\projects\\clipboard-sync-claude\\server",
      env: {
        NODE_ENV: "production",
        PORT: "5000",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
